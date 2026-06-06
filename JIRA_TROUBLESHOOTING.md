# JIRA Intelligence Hub - Troubleshooting Guide
## Diagnosis & Fix for "Nothing Working"

**Status:** JIRA features not loading + Console errors + No data

---

## 🔴 STEP 1: Check Browser Console for Errors

### Do This:
1. Open browser: http://localhost:8000
2. Press **F12** (Developer Tools)
3. Click **Console** tab
4. Look for RED error messages
5. **Screenshot or copy the EXACT error message**

### Common Errors & What They Mean:

**Error: "401 Unauthorized"**
- Meaning: API key is wrong/expired
- Fix: Get new Jira API key

**Error: "403 Forbidden"**
- Meaning: API key valid but permissions missing
- Fix: Check Jira permissions

**Error: "404 Not Found"**
- Meaning: API endpoint is wrong
- Fix: Verify Jira instance URL

**Error: "apiKey is not defined"**
- Meaning: API key not stored in localStorage
- Fix: Set API key first

**Error: "Cannot read property 'values' of undefined"**
- Meaning: Jira API returned unexpected format
- Fix: Check Jira version compatibility

---

## 🟡 STEP 2: Verify API Key is Set

### Check if API Key Exists:
1. Press F12 → **Application** tab
2. Left side: **Local Storage**
3. Click on your domain (localhost:8000)
4. Look for key: **`pos_apiKey`**

### If NOT Found:
```
Your API key is NOT stored!
1. Go to Settings (gear icon)
2. Find "Jira API Key" field
3. Enter your key
4. Click Save
5. Reload page
```

### If FOUND:
```
Good! API key is stored.
But JIRA might not be responding.
```

---

## 🔧 STEP 3: Verify Jira Connection

### Test Jira Manually:

**Open new browser tab and try this:**

```
Replace YOUR_INSTANCE with your Jira instance (e.g., mycompany.atlassian.net)
Replace YOUR_TOKEN with your API token

Then visit this URL:
https://YOUR_INSTANCE/rest/api/3/projects
```

**What you should see:**
- ✅ JSON data with project list (if working)
- ❌ 401 error (if token wrong)
- ❌ 403 error (if no permissions)
- ❌ Connection refused (if instance URL wrong)

### If You Get an Error:
- **401:** Token is wrong - get new one
- **403:** Permissions missing - add to API token permissions
- **404:** Wrong URL - verify Jira instance URL

---

## 📝 STEP 4: Check Jira Instance URL

### Correct Jira API URL Format:
```
https://YOUR_COMPANY.atlassian.net
```

NOT:
```
https://jira.YOUR_COMPANY.com  (OLD format)
https://YOUR_COMPANY.jira.com  (WRONG)
```

### To Find Your URL:
1. Open Jira in browser
2. Look at address bar
3. Should be like: `https://mycompany.atlassian.net`
4. That's your instance

---

## 🔑 STEP 5: Create/Get a Valid API Token

### If You Don't Have an API Token:

**Go to:** https://id.atlassian.com/manage-profile/security/api-tokens

**Steps:**
1. Click **Create API Token**
2. Name it: "ABHIPO Dashboard"
3. Copy the token (you'll see it once)
4. SAVE IT SOMEWHERE SAFE

### Make Sure Your Token Has:
- ✅ Projects: Read
- ✅ Issues: Read
- ✅ Sprints: Read
- ✅ Boards: Read

---

## 🔐 STEP 6: Configure API Key in Dashboard

### Method 1: Via Settings Panel
1. Go to http://localhost:8000
2. Click **⚙️ Settings** (gear icon)
3. Find **"Jira API Key"** field
4. Paste your API token
5. Click **Save**
6. Hard refresh (Ctrl+Shift+R)

### Method 2: Via Console (if Settings not working)
1. Open DevTools (F12)
2. Go to **Console** tab
3. Paste this command:
```javascript
localStorage.setItem('pos_apiKey', 'YOUR_API_TOKEN_HERE');
```
4. Replace `YOUR_API_TOKEN_HERE` with your actual token
5. Press Enter
6. Refresh page (F5)

### Check If Saved:
1. F12 → Application → Local Storage
2. Find `pos_apiKey`
3. Value should be your token (first few chars visible)

---

## 📊 STEP 7: Test JIRA Connection

### After Setting API Key:

1. Hard refresh page (Ctrl+Shift+R)
2. Open DevTools Console (F12)
3. Look for messages:

**If Working - You'll See:**
```
✅ Discovered 15 PODs from Jira: ["HIP", "ADE", ...]
✅ Velocity calculated: 34 points / 5 days = 6.8 pts/day
✅ Jira sync complete - 34 issues fetched
```

**If NOT Working - You'll See:**
```
⚠️ Could not fetch PODs from Jira, using fallback
❌ API returned 401 Unauthorized
❌ TypeError: Cannot read property 'values'
```

---

## 🚨 COMMON FIXES

### Issue #1: "401 Unauthorized"
```
Problem: API token is wrong/expired
Solution:
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Delete old token
3. Create new one
4. Copy & paste into dashboard
5. Hard refresh
```

### Issue #2: "403 Forbidden"
```
Problem: Token doesn't have permission to access Jira
Solution:
1. Go to https://id.atlassian.com/manage/api-tokens
2. Click the token you created
3. Check "Permissions" section
4. Make sure Projects, Issues, Boards, Sprints are readable
5. Copy token again
6. Update in dashboard
```

### Issue #3: "Connection Refused"
```
Problem: Wrong Jira instance URL
Solution:
1. Verify your Jira instance: https://YOURCOMPANY.atlassian.net
2. Check Settings for correct URL
3. Or set it via console:
   localStorage.setItem('jiraInstance', 'https://yourcompany.atlassian.net');
```

### Issue #4: No Projects Showing
```
Problem: Not a Jira Cloud instance or wrong API
Solution:
1. Verify this is Jira CLOUD (atlassian.net)
2. Not Jira SERVER or DATA CENTER
3. Check Projects are created in Jira
4. Check user has access to projects
```

### Issue #5: Blank Dashboard
```
Problem: API key not set OR Jira not responding
Solution:
1. Check localStorage for pos_apiKey
2. If missing, set it again
3. Check console for errors
4. Check Jira status (https://status.atlassian.com)
5. Try manual API test (see Step 3 above)
```

---

## ✅ VERIFICATION CHECKLIST

```
BEFORE YOU START:
☐ You have Jira Cloud instance (atlassian.net)
☐ You have valid API token (not password!)
☐ Token has Projects/Issues/Boards/Sprints permissions
☐ You know your Jira instance URL

AFTER SETUP:
☐ API key saved in localStorage (check Application tab)
☐ No red errors in console
☐ See "✅ Discovered X PODs" message
☐ POD Dashboard shows data
☐ Decision Log saves data
```

---

## 🔍 DEBUG COMMANDS

**Run these in Console (F12 → Console):**

### Check if API key is set:
```javascript
console.log('API Key:', localStorage.getItem('pos_apiKey'));
```

### Test Jira connection manually:
```javascript
const token = localStorage.getItem('pos_apiKey');
fetch('https://YOUR_INSTANCE.atlassian.net/rest/api/3/projects', {
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err));
```

### Check what Jira data is cached:
```javascript
console.log('Cached data:', {
  backlogItems: backlogItems.length,
  kpiItems: kpiItems.length,
  roadmapItems: roadmapItems.length,
  decisionLog: decisionLog.length
});
```

---

## 📞 SUPPORT PATH

**If Still Not Working:**

1. ✅ Run all verification steps above
2. ✅ Copy the EXACT error message from console
3. ✅ Note your Jira instance URL
4. ✅ Verify API token is valid
5. ✅ Then report with:
   - Exact error message
   - Jira instance URL (without token)
   - What you tried to fix it

---

## 🎯 EXPECTED BEHAVIOR AFTER FIX

**When Working Correctly:**

### Console Shows:
```
✅ Discovered 15 PODs from Jira: ["HIP", "ADE", "AGDF", ...]
✅ Velocity calculated: 34 points / 5 days = 6.8 pts/day
[JIRA-SYNC] Auto-sync initialized (15-min intervals)
[JIRA-SYNC] Initial sync for POD: HIP
✅ Jira sync complete - 34 issues fetched
```

### Dashboard Shows:
- ✅ POD Dashboard with real data
- ✅ Sprint metrics from Jira
- ✅ Team assignments and capacity
- ✅ Burndown data

### Features Work:
- ✅ Decision Log accepts input
- ✅ Backlog saves items
- ✅ Roadmap displays items
- ✅ KPI metrics show data

---

## 🚀 NEXT STEPS

1. **Run Steps 1-7 above**
2. **Check console for "✅ Discovered PODs" message**
3. **If you see red errors, tell me the EXACT error**
4. **If working, proceed to test other features**

---

**Having trouble? Share:**
- The exact error from console (copy/paste)
- Your Jira instance URL (without token)
- Whether you can access Jira directly in browser

Then I can help diagnose further!
