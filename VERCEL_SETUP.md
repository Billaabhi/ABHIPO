# 🎯 VERCEL SETUP - Configure and Deploy

**Timeline:** 20 minutes start-to-finish

---

## Step 1: Set Environment Variables in Vercel

1. Go to: https://vercel.com/dashboard
2. Click on your **ABHIPO** project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)
5. Add two new variables:

```
Variable 1:
Name: VITE_JIRA_TOKEN
Value: [PASTE YOUR API TOKEN HERE]
Environments: Select ALL THREE
  ☑ Production
  ☑ Preview
  ☑ Development
Click: Save

Variable 2:
Name: VITE_JIRA_INSTANCE
Value: https://yourcompany.atlassian.net
        (replace yourcompany with your actual Jira domain)
Environments: Select ALL THREE
  ☑ Production
  ☑ Preview
  ☑ Development
Click: Save
```

---

## Step 2: Trigger New Deployment

After saving environment variables, Vercel needs to rebuild with the new config:

**Option A: Automatic (Recommended)**
```
1. Go to Vercel Dashboard
2. Click your ABHIPO project
3. Go to "Deployments" tab
4. Find your latest deployment
5. Click the ⋯ (three dots)
6. Click "Redeploy"
7. Wait ~2 minutes for build to complete
```

**Option B: Via Git (Most automatic)**
```bash
# Make a small commit to trigger rebuild
git add -A
git commit -m "Configure production environment variables"
git push origin main

# Vercel automatically rebuilds and deploys
# Wait 2-3 minutes
```

---

## Step 3: Test Locally Before Vercel Deploy (Optional but Recommended)

```bash
# Create .env.local file in your project root
cat > .env.local << EOF
VITE_JIRA_TOKEN=your_api_token_here
VITE_JIRA_INSTANCE=https://yourcompany.atlassian.net
EOF

# Start dev server
npm install  # if needed
npm run dev

# Test in browser
# Open http://localhost:5173 (or the URL shown)
# Press F12 → Console
# Hard refresh: Ctrl+Shift+R
# Look for: ✅ Discovered X PODs from Jira

# If you see that message → great! It's working
# Then go back and do Step 2
```

---

## Step 4: Verify Deployment

After Vercel finishes rebuilding:

1. Go to Vercel Dashboard
2. Your ABHIPO project should show green checkmark ✅
3. Under "Deployments" you should see latest is "READY"
4. Click the deployment → opens your production URL
5. Or get URL from: vercel.com/dashboard → your-app.vercel.app

---

## Step 5: Test in Production

```
1. Open your production URL in browser
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Hard refresh: Ctrl+Shift+R

Look for these messages:
✅ Discovered 15 PODs from Jira: ["HIP", "ADE", ...]
✅ Velocity calculated: 34 points / 5 days = 6.8 pts/day
[JIRA-SYNC] Auto-sync initialized
[JIRA-SYNC] Initial sync for POD: HIP
✅ Jira sync complete - 34 issues fetched

If you see these → JIRA IS WORKING! 🎉

Then verify features:
- POD Dashboard shows real PODs
- Decision Log works
- Backlog displays items
- KPI Metrics show
```

---

## Troubleshooting

### Issue: "VITE_JIRA_TOKEN is undefined"
**Solution:** Variables not saved in Vercel
- Go to Settings → Environment Variables
- Verify both variables are there
- Click "Redeploy"
- Wait 2-3 minutes

### Issue: "401 Unauthorized"
**Solution:** API token is wrong
- Go to https://id.atlassian.com/manage-profile/security/api-tokens
- Check if your token is still valid (may have expired)
- Create a new one
- Update VITE_JIRA_TOKEN in Vercel
- Redeploy

### Issue: "Cannot read property 'values'"
**Solution:** Jira instance URL is wrong
- Verify your Jira URL is: https://yourcompany.atlassian.net
- NOT: https://jira.yourcompany.com
- NOT: https://yourcompany.jira.com
- Update VITE_JIRA_INSTANCE in Vercel
- Redeploy

### Issue: Still not working
- Check console error message (screenshot it)
- See JIRA_TROUBLESHOOTING.md
- Verify API token has correct permissions

---

## ✅ Checklist

After following these steps, verify:

- [ ] Both environment variables set in Vercel
- [ ] Deployment completed (green checkmark)
- [ ] Production URL loads without errors
- [ ] Console shows ✅ Discovered PODs message
- [ ] POD Dashboard displays real data
- [ ] No red errors in console
- [ ] Features working (Decision Log, Backlog, etc.)

If all checked → **YOU'RE LIVE! 🚀**

---

## What You Just Did

✅ Configured Jira API token securely (in Vercel, not code)
✅ Configured Jira instance URL
✅ Deployed to production
✅ Verified JIRA connection
✅ All features working

**Result:** ABHIPO Dashboard is now LIVE with real Jira data! 🎉

---

## Next Steps

1. Tell your team it's live
2. Monitor console for errors (F12) for first hour
3. If issues, use rollback (see DEPLOY_NOW.md)
4. Celebrate! 🎉

---

**Done? Go back and tell me it's working!**
