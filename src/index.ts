import * as core from '@actions/core';
import * as github from '@actions/github';
import * as glob from '@actions/glob';

// Configuration interface
interface Config {
    apiKey: string;
    excludePatterns: string[];
    strictness: string;
    maxFileSize: number;
}

const SUPPORTED_EXTENSIONS = [
    '.js', '.ts', '.jsx', '.tsx',
    '.py',
    '.java', '.cpp', '.c', '.h', '.cs',
    '.go', '.rs', '.php', '.rb', '.swift', '.kt',
    '.html', '.css', '.scss',
    '.sql', '.sh', '.yaml', '.yml', '.json', '.xml'
];

async function run(): Promise<void> {
    try {
        core.info('=== Starting AI Code Review (TypeScript Action) ===');

        // 1. Parse Inputs
        const apiKey = core.getInput('GROQ_API_KEY', { required: true });
        const excludePatterns = (core.getInput('exclude_files') || '')
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        const strictness = core.getInput('strictness') || 'medium';
        const maxFileSize = parseInt(core.getInput('max_file_size') || '6000');

        const config: Config = { apiKey, excludePatterns, strictness, maxFileSize };

        const context = github.context;

        // Ensure we are in a PR
        if (!context.payload.pull_request) {
            core.setFailed('❌ This action only supports pull_request events.');
            return;
        }

        const prNumber = context.payload.pull_request.number;
        const owner = context.repo.owner;
        const repo = context.repo.repo;

        core.info(`PR #${prNumber} in ${owner}/${repo}`);
        core.info(`Config: Strictness=${strictness}, MaxFileSize=${maxFileSize}`);

        // Get GitHub Token (passed as input from workflow)
        const githubToken = core.getInput('github_token', { required: true });

        const octokit = github.getOctokit(githubToken);

        // Post initial status
        await octokit.rest.issues.createComment({
            owner, repo, issue_number: prNumber,
            body: `## 🤖 AI Code Review\n\n🔎 Analyzing changes... \n*Config: Strictness=${strictness}*`
        });

        // 2. Fetch Changed Files
        // Pagination might be needed for huge PRs, but for now fetch 100 max
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner, repo, pull_number: prNumber, per_page: 100
        });

        core.info(`Found ${files.length} changed files.`);

        // 3. Filter Files
        let filesToReview: any[] = [];
        let skippedFiles: string[] = [];

        const globber = await glob.create(config.excludePatterns.join('\n'));
        // Globber matches absolute paths, but we have relative paths.
        // We can use minimatch against the filenames manually or use the globber on the workspace.
        // Since we don't necessarily have the files checked out (we might, but `listFiles` gives us the list),
        // let's do a simpler check or rely on `minimatch` library if we installed it.
        // We installed `minimatch`!
        const { minimatch } = require('minimatch');

        for (const file of files) {
            const filename = file.filename;

            // Check Extension
            const isSupported = SUPPORTED_EXTENSIONS.some(ext => filename.endsWith(ext));
            if (!isSupported) continue;

            // Check Excludes
            const isExcluded = config.excludePatterns.some(pattern => minimatch(filename, pattern));
            if (isExcluded) continue;

            // Check Status (ignore deleted)
            if (file.status === 'removed') continue;

            // Check Size
            if (file.patch && file.patch.length > config.maxFileSize) {
                skippedFiles.push(`${filename} (Too large: ${file.patch.length} chars)`);
                continue;
            }

            filesToReview.push(file);
        }

        core.info(`Files to review: ${filesToReview.length}`);

        if (filesToReview.length === 0) {
            let msg = '✅ No reviewable code changes found.';
            if (skippedFiles.length > 0) msg += `\n(Skipped ${skippedFiles.length} large files)`;
            await octokit.rest.issues.createComment({
                owner, repo, issue_number: prNumber,
                body: `## 🤖 AI Code Review\n\n${msg}`
            });
            return;
        }

        // 4. Construct Prompt
        let diffContext = '';
        for (const file of filesToReview) {
            diffContext += `\n### File: ${file.filename}\n\`\`\`diff\n${file.patch}\n\`\`\`\n`;
        }

        const systemPrompt = `
    You are an expert Senior Staff Engineer doing a code review.
    Strictness Level: ${strictness.toUpperCase()}

    INSTRUCTIONS:
    1. Analyze the code for Bugs, Security Vulnerabilities, and Clean Code violations.
    2. context is limited, so only comment on what you see in the diff.
    3. IGNORE minor style/whitespace issues unless strictness is HIGH.
    4. FORMAT YOUR RESPONSE using the structure below.

    STRUCTURE:
    ## 🔎 Review Summary
    [1-2 sentences overall thought]

    ## 🔴 Critical Issues (Bugs/Security)
    - [File.py]: Description of bug...

    ## ⚠️ Improvements (Refactoring/Perf)
    - [File.js]: Suggestion...

    ## ℹ️ Nitpicks (Docs/Style)
    - [File]: Description...

    CODE DIFF:
    ${diffContext}
    `;

        // 5. Call Groq API (Llama 3.3 70B)
        core.info('Calling Groq API (Llama 3.3 70B)...');
        const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are an expert Senior Staff Engineer doing a code review.' },
                    { role: 'user', content: systemPrompt }
                ],
                temperature: 0.3
            })
        });

        const data: any = await response.json();

        if (data.error) {
            throw new Error(`Groq API Error: ${data.error.message}`);
        }

        const review = data.choices?.[0]?.message?.content || "❌ No review generated.";

        // 6. Post Review
        let footer = '';
        if (skippedFiles.length > 0) {
            footer = `\n\n---\n*⚠️ Skipped files (too large):* \n${skippedFiles.map((f: string) => `- ${f}`).join('\n')}`;
        }

        await octokit.rest.issues.createComment({
            owner, repo, issue_number: prNumber,
            body: review + footer
        });

        core.info('Review posted successfully!');

    } catch (error: any) {
        core.setFailed(`Action failed: ${error.message}`);
    }
}

run();
