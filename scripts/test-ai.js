const fs = require('fs');
const https = require('https');
const path = require('path');

// 1. Get API Key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("❌ Error: GEMINI_API_KEY environment variable is not set.");
    console.error("Usage: set GEMINI_API_KEY=your_key && node scripts/test-ai.js");
    process.exit(1);
}

// 2. Read Sample File
const samplePath = path.join(__dirname, '../examples/sample-functions.py');
let sampleCode = '';
try {
    sampleCode = fs.readFileSync(samplePath, 'utf8');
} catch (e) {
    console.error(`❌ Error reading sample file: ${e.message}`);
    process.exit(1);
}

// 3. Construct Prompt (Same as action)
// Simulating a git diff (just sending the whole file as a diff for demo)
const diffContext = `
### File: examples/sample-functions.py
\`\`\`diff
${sampleCode}
\`\`\`
`;

const prompt = `
You are an expert Senior Staff Engineer doing a code review.
Strictness Level: MEDIUM

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

// 4. Call Gemini API
console.log("⏳ Connecting to Gemini API...");
console.log("   Model: gemini-2.0-flash");
console.log("   Analyzing: examples/sample-functions.py");

const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.error) {
                console.error(`\n❌ API Error: ${json.error.message}`);
            } else {
                const review = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (review) {
                    console.log("\n✅ AI Review Generated:\n");
                    console.log("---------------------------------------------------");
                    console.log(review);
                    console.log("---------------------------------------------------");
                } else {
                    console.error("\n❌ Error: No review content generated.");
                    console.log(JSON.stringify(json, null, 2));
                }
            }
        } catch (e) {
            console.error(`\n❌ Error parsing response: ${e.message}`);
        }
    });
});

req.on('error', (e) => {
    console.error(`\n❌ Request Error: ${e.message}`);
});

req.write(JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 }
}));
req.end();
