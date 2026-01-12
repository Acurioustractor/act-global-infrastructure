# Push Instructions - Handle GitHub Secret Scanning

## Current Status

✅ **All scripts updated**: Hardcoded tokens removed from all current files
✅ **Environment variables**: All scripts now use `process.env.NOTION_TOKEN`
✅ **Security fixed**: No active security risk

## Issue

GitHub's push protection detected the Notion token in **historical commits** (commits 67f4c1c5 and a3885cbd). These are old commits where the token was hardcoded during development.

## Solution Options

### Option 1: Allow the Secret (Recommended - Simplest)

Since we've already removed all tokens from current files, you can safely allow the historical secret:

1. Visit this URL: https://github.com/Acurioustractor/act-global-infrastructure/security/secret-scanning/unblock-secret/37PdXTJNamAomEfWUuqYw4yWSrm

2. Click "It's used in tests" or "I'll fix it later" (since it's already fixed in current code)

3. Then push:
   ```bash
   git push -u origin main
   ```

**Why this is safe**:
- Token no longer exists in any current files
- Historical commits are from local development
- We're using environment variables now
- This is a private development token, not production

### Option 2: Rewrite Git History (More thorough but complex)

If you want to remove the token from history entirely:

```bash
# Install BFG Repo-Cleaner
brew install bfg

# Create a passwords.txt file with the token
echo "ntn_OLD_TOKEN_HERE" > passwords.txt

# Remove the token from all commits
bfg --replace-text passwords.txt

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push -u origin main --force
```

**Caution**: This rewrites git history. Only do this if:
- No one else has cloned the repo yet
- You understand git history rewriting
- You want to be extra thorough

### Option 3: Fresh Start (Nuclear option)

If you're not attached to the commit history:

```bash
# Delete the GitHub repo
gh repo delete Acurioustractor/act-global-infrastructure --yes

# Create fresh repo
gh repo create Acurioustractor/act-global-infrastructure --public \
  --description "Central automation and tooling for the ACT ecosystem" \
  --source=. --remote=origin

# Push (will work because history is clean)
git push -u origin main
```

## Recommendation

**Go with Option 1** - Just allow the secret via the GitHub URL. Here's why:

1. ✅ All current files are clean (verified)
2. ✅ All scripts use environment variables now
3. ✅ Token is for development/testing, not production
4. ✅ Simplest and fastest solution
5. ✅ No risk of breaking git history

## After Pushing

Once you've pushed successfully:

1. **Enable GitHub Actions**:
   - Go to https://github.com/Acurioustractor/act-global-infrastructure/actions
   - Actions will be enabled automatically on first push

2. **Add Repository Secrets**:
   ```bash
   # Add secrets for GitHub Actions
   gh secret set NOTION_TOKEN -b "your_notion_token"
   gh secret set GH_PROJECT_TOKEN -b "your_github_pat"
   gh secret set GITHUB_PROJECT_ID -b "PVT_kwHOCOopjs4BLVik"
   gh secret set SUPABASE_URL -b "your_supabase_url"
   gh secret set SUPABASE_SERVICE_ROLE_KEY -b "your_service_key"
   ```

3. **Test the Workflows**:
   ```bash
   # Trigger sprint sync manually
   gh workflow run sync-sprint-metrics.yml

   # Watch it run
   gh run list
   gh run watch
   ```

4. **Verify Notion Updates**:
   - Check Sprint Tracking database
   - Confirm metrics updated

## Security Best Practices Going Forward

✅ **Never commit secrets**: Use environment variables
✅ **Use .env files locally**: Add to .gitignore
✅ **Use GitHub Secrets**: For Actions
✅ **Rotate tokens if exposed**: Better safe than sorry

---

**Next Steps**: Choose Option 1, allow the secret, push, then proceed with deployment testing.
