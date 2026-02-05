# Setup Guide

Detailed instructions for setting up the AI PR Reviewer in your repository.

## Prerequisites

- A GitHub account
- A Google AI Studio account (free)

## Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the generated key

> ⚠️ **Important**: Keep your API key secure. Never commit it to your repository.

## Step 2: Add Secret to Repository

1. Go to your GitHub repository
2. Click **Settings** (gear icon)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in:
   - **Name**: `GEMINI_API_KEY`
   - **Secret**: *Paste your API key*
6. Click **Add secret**

## Step 3: Enable GitHub Actions

1. Go to the **Actions** tab in your repository
2. If prompted, click **"I understand my workflows, go ahead and enable them"**

## Step 4: Test the Reviewer

1. Create a new branch:
   ```bash
   git checkout -b test-review
   ```

2. Make changes to any `.py` file

3. Push and create a PR:
   ```bash
   git push origin test-review
   ```

4. Open a Pull Request on GitHub

5. Wait for the AI review comment to appear! 🎉

## Troubleshooting

### "API Error: Quota exceeded"
- Free tier has usage limits
- Wait a few seconds and try again
- Consider upgrading to a paid plan for heavy usage

### "GEMINI_API_KEY not found"
- Verify the secret name is exactly `GEMINI_API_KEY`
- Check that the secret is added to the correct repository

### Workflow not running
- Ensure GitHub Actions is enabled
- Check that the PR modifies `.py` files
- View the Actions tab for error logs

## API Rate Limits

| Tier | Requests/Minute | Tokens/Minute |
|------|-----------------|---------------|
| Free | 15 | 1,000,000 |
| Paid | 1000+ | Varies |

## Need Help?

Open an issue in this repository if you encounter any problems!
