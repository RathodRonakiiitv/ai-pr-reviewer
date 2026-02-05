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
        const apiKey = core.getInput('GEMINI_API_KEY', { required: true });
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

        // Initialize Octokit
        const token = process.env.GITHUB_TOKEN || ''; // Usually provided automatically by actions runner if set
        // Note: In action.yml we didn't strictly request GITHUB_TOKEN, but typical workflows provide it.
        // However, for this action we need it to post comments. 
        // Best practice: Input 'github_token' or use process.env['GITHUB_TOKEN'] if passed.
        // For now, let's assume the user passes it or we use a default client if executing in a workflow that has permissions.
        // But `actions/github`'s getOctokit requires a token.
        // Let's actually assume we just need to use the token from the env if available, or ask user to pass it.
        // Use a standard approach: verify if GITHUB_TOKEN is available in env or input.
        // Actually, `github.getOctokit(token)` is standard. Let's add GITHUB_TOKEN to action.yml inputs or just assume it's in env.
        // Better: Allow input, fallback to env.

        // FIX: To keep it authentication-simple for the user, we often rely on the workflow providing `GITHUB_TOKEN`.
        // But since we are inside a custom action, we can access the token if we add it to inputs or rely on `github.token` context availability?
        // Actually, `core.getInput('github_token')` is best practice.
        // Let's rely on standard `process.env.GITHUB_TOKEN` which is usually present if `env: GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` is set in step.
        // Or we will update action.yml to accept it.
        // For now, let's try to get it from env.

        const githubToken = process.env.GITHUB_TOKEN || core.getInput('github_token');
        if (!githubToken) {
            core.setFailed('❌ GITHUB_TOKEN not found. Make sure to pass it in env or inputs.');
            return;
        }

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

        // 5. Call Gemini API
        core.info('Calling Gemini API...');
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: { temperature: 0.3 }
            })
        });

        const data: any = await response.json();

        if (data.error) {
            throw new Error(`Gemini API Error: ${data.error.message}`);
        }

        const review = data.candidates?.[0]?.content?.parts?.[0]?.text || "❌ No review generated.";

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
