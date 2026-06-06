# ABHIPO Dashboard - Testing Guide
## Test Each Fix One by One

**Setup:**
1. Open browser and go to: `http://localhost:8000`
2. Press `F12` to open Developer Tools
3. Go to **Console** tab to see logs
4. Have **Application** tab open for localStorage inspection

---

## ✅ TEST #1: Dynamic POD Discovery

**What This Fixes:**
- Before: Only 4 PODs visible (HIP, ADE, AGDF, AGEA)
- After: All ~20 PODs should be visible

**How to Test:**

### Step 1: Check Console Logs
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Refresh the page (Ctrl+R)
4. Look for this message:
```
✅ Discovered 15 PODs from Jira: ["HIP", "ADE", "AGDF", "AGEA", ...]
```

**Expected:** You should see MORE than just 4 PODs listed (ideally 15-20)

---

### Step 2: Check POD Dropdown (if available)
1. Navigate to POD Dashboard tab
2. Look for POD dropdown selector
3. Click the dropdown
4. Count how many PODs are listed

**Expected:** 15+ PODs (not just 4)

---

### Step 3: Check Code (Fallback)
If no Jira connection, it falls back to 4 PODs. To verify fix was applied:
1. Press `F12` → **Sources** tab
2. Press `Ctrl+F` to search
3. Search for: `allProjects`
4. Should find this code:
```javascript
const allProjects = await jiraFetch('/projects?maxResults=100');
projects = allProjects.values.map(p => p.key);
```

**Expected:** ✅ Code is there (fix applied)

---

## ✅ TEST #2: Correct Velocity Formula

**What This Fixes:**
- Before: Velocity shown as completion % (e.g., "50%")
- After: Velocity shown as points/day (e.g., "12.5 pts/day")

**How to Test:**

### Step 1: Check POD Dashboard Metrics
1. Go to POD Dashboard tab
2. Look for "Velocity" or "Burn Rate" metric
3. Check the VALUE displayed

**Expected:** Should show format like:
- ✅ "12.5 pts/day" (CORRECT - fix applied)
- ❌ "50%" (WRONG - fix not applied)

---

### Step 2: Check Console Logs
1. Open DevTools Console
2. Look for this log message:
```
✅ Velocity calculated: 34 points / 5 days = 6.8 pts/day
```

**Expected:** See velocity calculation with "pts/day" (not %)

---

### Step 3: Check Code (Fallback)
1. Press `F12` → **Sources**
2. Search for: `var velocity = Math.round`
3. Should find this code:
```javascript
var velocity = Math.round((s.completedPoints / daysPassed) * 10) / 10;  // Points/day
```

**Expected:** ✅ Calculation uses division by daysPassed (fix applied)

---

## ✅ TEST #3: Sprint State Filtering

**What This Fixes:**
- Before: Mixing current sprint + future sprints not started
- After: Only current/active sprint included

**How to Test:**

### Step 1: Check Console Logs
1. Open DevTools Console
2. Look for this message:
```
✅ currentSprint() returned N issues
```
OR if no active sprint:
```
⚠️ currentSprint() returned no results, falling back to openSprints()
```

**Expected:** Should attempt currentSprint() first (shows fix was applied)

---

### Step 2: Check Sprint Metrics
1. Go to POD Dashboard
2. Look at issues listed
3. Verify they're from CURRENT sprint only

**How to verify:** Compare with Jira directly:
- Open Jira board
- Note active sprint name
- Compare with dashboard

**Expected:** Metrics match current sprint (not future)

---

### Step 3: Check Code (Fallback)
1. Press `F12` → **Sources**
2. Search for: `currentSprint()`
3. Should find:
```javascript
var sprintIssuesJql = 'sprint in (currentSprint()) AND project IN (' + projectsJql + ')';
```

**Expected:** ✅ Uses currentSprint() (fix applied)

---

## ✅ TEST #4: Capacity-Aware Overload Detection

**What This Fixes:**
- Before: Same 15-point threshold for all engineers
- After: Threshold based on sprint length + ceremonies

**How to Test:**

### Step 1: Check Overload Warnings
1. Go to POD Dashboard
2. Look for team members listed
3. Find anyone marked as "overloaded"
4. Check the capacity calculation shown

**Expected Format:**
- ✅ "John overloaded: 18 pts assigned (capacity: 12.5, utilization: 144%)" (CORRECT)
- ❌ "John overloaded: 18 pts > 15 pts" (WRONG)

---

### Step 2: Check Console Logs
1. Open DevTools Console
2. Look for messages like:
```
⚠️ John overloaded: 18 pts assigned (capacity: 12.5, utilization: 144%)
```

**Expected:** See capacity calculation (not arbitrary "15")

---

### Step 3: Verify Capacity Calculation
1. Check Product Context settings:
   - Sprint days
   - Ceremony hours
2. Verify capacity formula used

**Expected Formula:**
```
baseCapacity = (10 / 10) * sprintLengthDays
workCapacity = baseCapacity * (1 - ceremonyPercentage)
overloadThreshold = workCapacity * 1.1  // 110%
```

---

### Step 4: Check Code (Fallback)
1. Press `F12` → **Sources**
2. Search for: `sprintLengthDays`
3. Should find calculation (not hardcoded)

**Expected:** ✅ Calculates based on context (fix applied)

---

## ✅ TEST #5: Real Sprint Days Calculation

**What This Fixes:**
- Before: Always shows "3 days passed, 7 remaining"
- After: Real calculation changes daily

**How to Test:**

### Step 1: Check Sprint Progress
1. Go to POD Dashboard
2. Look at "Days Passed" and "Days Remaining"
3. Note the values
4. Wait 24 hours (or check tomorrow)
5. Verify "Days Passed" increased by 1

**Expected:** Days should change daily (not stuck at 3+7)

---

### Step 2: Check Console Logs
1. Open DevTools Console
2. Look for:
```
Sprint Found: Sprint 45
Dates: 2026-06-02T09:00:00.000Z to 2026-06-16T17:00:00.000Z
```

**Expected:** Real dates from Jira (not hardcoded)

---

### Step 3: Manual Calculation
1. Get start date and end date from logs
2. Calculate: (now - startDate) / 86400000 = days passed
3. Calculate: (endDate - now) / 86400000 = days remaining
4. Compare with what dashboard shows

**Expected:** Match (or very close, within 1 day)

---

## ✅ TEST #6: Decision Log Impact Tracking

**What This Fixes:**
- Before: Decisions recorded but no impact tracking
- After: Decisions linked to backlog items and business impact

**How to Test:**

### Step 1: Add a Decision with Impact
1. Go to **Decision Log** tab
2. Click **+ Add Decision**
3. Fill in:
   - Title: "Use Jira API v3 for sprint metrics"
   - What: "Switched from manual entry to automated Jira sync"
   - Why: "Real-time metrics, no manual errors"
   - **Business Impact:** "15% faster sprint reporting, eliminates data entry errors"
   - **Affected Items:** "HIP-123, HIP-456"
4. Click **Save Decision**

**Expected:** Toast shows: "✅ Decision logged (links to 2 items)"

---

### Step 2: View Decision Display
1. Look at the newly added decision card
2. Should show:
   - ✅ Title and description
   - ✅ "🔗 Affects: HIP-123 HIP-456" (as colored tags)
   - ✅ "💼 Impact: 15% faster sprint reporting..." (in section)

**Expected:** All three sections visible

---

### Step 3: Check localStorage
1. Press `F12` → **Application**
2. Go to **Local Storage**
3. Find: `prodmind_decisions`
4. Look at the decision you just created
5. Verify it contains:
   ```json
   {
     "businessImpact": "15% faster...",
     "affectedItems": ["HIP-123", "HIP-456"]
   }
   ```

**Expected:** ✅ New fields present in saved data

---

## ✅ TEST #7: Jira Auto-Sync

**What This Fixes:**
- Before: Had to manually refresh Jira data
- After: Auto-syncs every 15 minutes

**How to Test:**

### Step 1: Check Initialization
1. Open DevTools Console
2. Refresh page
3. Look for:
```
[JIRA-SYNC] Auto-sync initialized (15-min intervals)
```

**Expected:** ✅ Message appears

---

### Step 2: Check First Sync
1. Look in console for:
```
[JIRA-SYNC] Initial sync for POD: HIP
✅ Jira sync complete - 34 issues fetched
```

**Expected:** ✅ Initial sync happens on load

---

### Step 3: Manual Trigger (can't wait 15 min)
1. Check if there's a manual sync button
2. Or edit code to reduce interval to 30 seconds for testing
3. Watch console for auto-sync logs

**Expected:** Logs appear every X seconds

---

### Step 4: Check Last Sync Time
1. Press `F12` → **Application** → **Local Storage**
2. Look for key: `jira_last_sync`
3. Value should be current time
4. Wait a bit, refresh page
5. Time should be updated

**Expected:** ✅ Timestamp updates with each sync

---

## 📋 SUMMARY TEST CHECKLIST

```
CRITICAL FIXES (Jira-dependent):
☐ Fix #1: POD Discovery (see 15+ PODs, not just 4)
☐ Fix #2: Velocity (shows pts/day, not %)
☐ Fix #3: Sprint Filtering (currentSprint used)
☐ Fix #4: Overload Detection (capacity-aware, not 15)
☐ Fix #5: Sprint Days (real calculation, changes daily)

FEATURE ENHANCEMENTS (localStorage-dependent):
☐ Fix #6: Decision Impact (shows affected items + impact)
☐ Fix #7: Jira Auto-Sync (auto-refreshes every 15 min)
```

---

## 🔴 ISSUES TO WATCH FOR

### If Jira API Connection Fails
**You'll see:**
```
⚠️ Could not fetch PODs from Jira, using fallback
```

**Cause:** API key not set or Jira API unreachable

**Solution:** 
1. Go to **Settings**
2. Add your Jira Cloud API token
3. Save
4. Refresh page

---

### If localStorage Not Working
**You'll see:** Data doesn't persist after refresh

**Cause:** Browser privacy settings, incognito mode, or storage disabled

**Solution:**
1. Use normal (not incognito) browser window
2. Check if private browsing is enabled
3. Check if site has storage permission

---

### If Auto-Sync Not Starting
**You'll see:** No "[JIRA-SYNC]" messages in console

**Cause:** API key not configured

**Solution:**
1. Set API key first
2. Refresh page
3. Check console for sync messages

---

## 🎯 PASS CRITERIA

**All fixes pass if:**
1. ✅ POD Discovery: 15+ PODs visible
2. ✅ Velocity: Shows "X.X pts/day" format
3. ✅ Sprint Filtering: Only current sprint issues
4. ✅ Overload Detection: Capacity-aware thresholds
5. ✅ Sprint Days: Change daily, match Jira
6. ✅ Decision Impact: Shows affected items + impact
7. ✅ Auto-Sync: "JIRA-SYNC" messages in console

**If any fail:** Check console logs (F12) for error messages

---

## 📞 TROUBLESHOOTING

**Console Shows Errors?**
1. Check the exact error message
2. Look for API errors (401, 403, 404)
3. Check if Jira API key is valid
4. Check if URL is correct (localhost:8000)

**Data Not Showing?**
1. Hard refresh: Ctrl+Shift+R
2. Clear cache: DevTools → Application → Clear All
3. Check localStorage isn't disabled
4. Check browser console for errors

**Metrics Look Wrong?**
1. Compare with Jira directly
2. Check console for calculation logs
3. Verify API data is being fetched
4. Check if fallback values are being used

---

## 📝 NEXT STEPS AFTER TESTING

1. **Document Results** - Note which tests pass/fail
2. **Report Issues** - If any fix fails, note the error
3. **Verify Jira Connection** - Test with valid API key
4. **Test Feature Linking** - Verify decision → backlog item links work
5. **Check Auto-Sync** - Wait 15 minutes or manually trigger

**Ready to test?** Follow tests 1-7 in order and report results!
