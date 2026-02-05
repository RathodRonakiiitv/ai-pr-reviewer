# AI PR Reviewer 🤖

[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-2088FF?logo=github-actions&logoColor=white)](https://github.com/features/actions)
[![Gemini AI](https://img.shields.io/badge/Gemini%20AI-8E75B2?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An intelligent GitHub Action that automatically reviews Pull Requests using Google's Gemini AI. Get instant, AI-powered code review feedback on every PR.

![AI PR Reviewer Demo](https://via.placeholder.com/800x400?text=AI+PR+Review+Demo)

## ✨ Features

- 🔍 **Multi-Language Support** - Javascript, TypeScript, Python, Java, C++, Go, Rust, and more
- 🤖 **AI-Powered Analysis** - Uses Gemini 2.0 Flash for intelligent feedback
- 💬 **PR Comments** - Posts review directly as PR comments
- ⚡ **Fast & Efficient** - Reviews complete in seconds
- 🔒 **Secure** - API key stored as GitHub secret

## 🚀 Quick Start

### 1. Fork this repository

### 2. Add your Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/apikey) to get your API key
2. In your repository, go to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `GEMINI_API_KEY`
5. Value: *Your Gemini API key*

### 3. Create a Pull Request
Create a branch, make changes to any `.py` file, and open a PR. The AI reviewer will automatically post a review comment!

## 🔧 How It Works

```mermaid
graph LR
    A[PR Opened/Updated] --> B[GitHub Action Triggered]
    B --> C[Fetch Changed Files]
    C --> D[Filter Python Files]
    D --> E[Call Gemini AI]
    E --> F[Post Review Comment]
```

1. **Trigger**: Workflow runs on PR `opened`, `synchronize`, or `reopened` events
2. **Fetch**: Uses GitHub API to get the list of changed files
3. **Filter**: Identifies Python files (`.py`) for review
4. **Review**: Sends code diff to Gemini AI with a review prompt
5. **Comment**: Posts the AI review as a PR comment

## 📁 Project Structure

```
ai-pr-reviewer/
├── .github/
│   └── workflows/
│       └── pr-review.yml    # GitHub Actions workflow
├── examples/
│   ├── sample-pr.py         # Example code for testing
│   └── sample-functions.py  # More example code
├── README.md
├── SETUP.md                 # Detailed setup guide
└── LICENSE
```

## ⚙️ Configuration

You can customize the workflow via the `with` key or `inputs` if running manually:

| Input | Default | Description |
|-------|---------|-------------|
| `strictness` | `medium` | Review strictness: `low` (friendly), `medium` (standard), `high` (pedantic) |
| `exclude_files` | `**/*.lock, ...` | Comma-separated glob patterns to ignore (e.g. `**/migrations/**`) |
| `max_file_size` | `6000` | Max characters per file (prevents token overflow) |

Example usage in `.github/workflows/pr-review.yml`:
```yaml
- uses: actions/github-script@v7
  with:
    script: |
      // The script reads inputs from context.payload.inputs
      // You can hardcode values here if needed
```

## 🧠 Engineering Approach

This project goes beyond simple API calls by implementing robust engineering practices:

### 1. Smart Context Management
LLMs have token limits. Sending a 5000-line diff will crash the CI or hallucinate.
- **Filtering**: We intelligently skip lockfiles (`package-lock.json`), minified code (`.min.js`), and huge configuration files.
- **Chunking**: Large files are specifically identified and skipped with a clear message, ensuring the AI focuses on *reviewable* code.

### 2. Structured Intelligence
Instead of generic "looks good" feedback, the AI uses a strict System Prompt to classify findings:
- 🔴 **Critical Issues**: Bugs, race conditions, security holes.
- ⚠️ **Improvements**: Performance wins, refactoring opportunities.
- ℹ️ **Nitpicks**: Variable naming, documentation (only in `high` strictness).

### 3. Security First
- API keys are injected deeply via `process.env` and never exposed in logs.
- The workflow runs on standard GitHub runners with no external container dependencies.

## 🛠️ Tech Stack

- **GitHub Actions** - CI/CD logic
- **Google Gemini API** (2.0 Flash) - 1M token context window model
- **Node.js** - Scripting runtime
- **@actions/glob** - Efficient file matching

## 📝 Example Review Output

```markdown
## 🤖 AI Code Review

### Summary
This PR adds two new mathematical functions: `power` and `square_root`.

### Suggestions
1. Consider adding input validation for negative numbers in `square_root`
2. Add docstrings for better documentation
3. Consider edge case handling for `power(0, 0)`

### Overall
Good implementation with clean, readable code. Minor improvements suggested above.
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**Ronak Rathod**

---

⭐ Star this repo if you found it helpful!
