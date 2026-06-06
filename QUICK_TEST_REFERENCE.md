# Quick Testing Reference - One by One

## Setup (Do Once)
```
1. Open: http://localhost:8000
2. Press F12 (Developer Tools)
3. Click "Console" tab
4. Press Ctrl+Shift+R (hard refresh)
```

---

## TEST 1️⃣: POD Discovery (Dynamic)
**What:** Should discover ALL PODs from Jira (not hardcoded 4)

**Check Console For:**
```
✅ Discovered 15 PODs from Jira: ["HIP", "ADE", "AGDF", "AGEA", ...]
```

**Expected Result:**
- ✅ PASS: See message with 15+ PODs
- ❌ FAIL: See message with only 4 PODs
- ❌ FAIL: No message (error)

**Fallback Test:**
- Go to POD dropdown
- Count items listed
- Should be 15+, not 4

---

## TEST 2️⃣: Velocity Formula (Points/Day)
**What:** Velocity should show "X.X pts/day" not "X%"

**Check Console For:**
```
✅ Velocity calculated: 34 points / 5 days = 6.8 pts/day
```

**Expected Result:**
- ✅ PASS: See "pts/day" calculation
- ❌ FAIL: See percentage calculation
- ❌ FAIL: No message

**Visual Test:**
- Go to POD Dashboard
- Look at Velocity metric
- Should show "6.8 pts/day" format
- NOT "68%"

---

## TEST 3️⃣: Sprint Filtering (Current Only)
**What:** Should use currentSprint() not openSprints()

**Check Console For:**
```
✅ currentSprint() returned 34 issues
```
OR
```
⚠️ currentSprint() returned no results, falling back to openSprints()
```

**Expected Result:**
- ✅ PASS: See "currentSprint()" message
- ❌ FAIL: No sprint filter message
- ❌ FAIL: See error

**Manual Verify:**
- Count issues on dashboard
- Compare with Jira active sprint only
- Numbers should match

---

## TEST 4️⃣: Overload Detection (Capacity-Aware)
**What:** Should calculate capacity, not use hardcoded 15 pts

**Check Console For:**
```
⚠️ John overloaded: 18 pts assigned (capacity: 12.5, utilization: 144%)
```

**Expected Result:**
- ✅ PASS: See "capacity: X.X" calculation
- ❌ FAIL: See "15 pts" threshold
- ❌ FAIL: No overload messages

**Visual Test:**
- Look at team members listed
- Should show actual capacity (not 15)
- Should vary by person/sprint

---

## TEST 5️⃣: Sprint Days (Real Calculation)
**What:** Days should change daily, calculated from Jira

**Check Console For:**
```
Sprint Found: Sprint 45
Dates: 2026-06-02T09:00:00.000Z to 2026-06-16T17:00:00.000Z
Days Passed: 3
Days Remaining: 7
```

**Expected Result:**
- ✅ PASS: See real dates from Jira
- ✅ PASS: Dates match your Jira sprint
- ❌ FAIL: Hardcoded "3" and "7"
- ❌ FAIL: Wrong dates

**Long-term Test:**
- Note "Days Passed" today
- Check again tomorrow
- Should increase by 1

---

## TEST 6️⃣: Decision Impact (Tracking)
**What:** Should track affected items and business impact

**Steps:**
1. Go to **Decision Log** tab
2. Click **+ Add Decision**
3. Fill in:
   - Title: "Fix auth bug in HIP-123"
   - What: "Fixed JWT token expiration"
   - Why: "Users were logged out unexpectedly"
   - **Business Impact:** "Reduced support tickets by 15"
   - **Affected Items:** "HIP-123, HIP-456"
4. Click **Save**

**Expected Result:**
- ✅ PASS: Toast shows "(links to 2 items)"
- ✅ PASS: Card shows "🔗 Affects: HIP-123 HIP-456"
- ✅ PASS: Card shows "💼 Impact: Reduced support..."
- ❌ FAIL: No impact section shown
- ❌ FAIL: No affected items shown

**Storage Check:**
- Open DevTools → Application → Local Storage
- Find "prodmind_decisions"
- Click it
- Find your decision
- Should contain `businessImpact` and `affectedItems`

---

## TEST 7️⃣: Jira Auto-Sync (Every 15 min)
**What:** Should auto-sync Jira data every 15 minutes

**Check Console For:**
```
[JIRA-SYNC] Auto-sync initialized (15-min intervals)
✅ Jira sync complete - 34 issues fetched
```

**Expected Result:**
- ✅ PASS: See "Auto-sync initialized" message
- ✅ PASS: See "Jira sync complete" message
- ❌ FAIL: No [JIRA-SYNC] messages
- ❌ FAIL: "⚠️ Jira sync failed"

**Manual Trigger Test (can't wait 15 min):**
- Check if "Refresh" button exists
- Click it
- Should see sync messages in console

**Verify It Works:**
- Open Local Storage
- Find "jira_last_sync"
- Value should be recent timestamp
- Refresh page → timestamp updates

---

## 🎯 PASS/FAIL SUMMARY

Copy & Paste, Then Fill In Results:

```
CRITICAL FIXES:
☐ TEST 1 - POD Discovery:      PASS / FAIL / ERROR
☐ TEST 2 - Velocity Formula:   PASS / FAIL / ERROR
☐ TEST 3 - Sprint Filtering:   PASS / FAIL / ERROR
☐ TEST 4 - Overload Calc:      PASS / FAIL / ERROR
☐ TEST 5 - Sprint Days:        PASS / FAIL / ERROR

ENHANCEMENTS:
☐ TEST 6 - Decision Impact:    PASS / FAIL / ERROR
☐ TEST 7 - Jira Auto-Sync:     PASS / FAIL / ERROR

OVERALL: _____ / 7 PASSED
```

---

## ❌ IF TEST FAILS

**Check These Things:**

### API Key Not Set?
- Settings → Add Jira API Token
- Hard refresh page (Ctrl+Shift+R)
- Rerun test

### No Console Messages?
- Open Console (F12)
- Hard refresh (Ctrl+Shift+R)
- Look for error messages
- Check for orange warnings ⚠️

### Numbers Don't Match?
- Open Jira directly
- Compare metrics (story points, velocity, etc.)
- Check if hardcoded values are showing (sign fix didn't apply)

### Cache Issue?
- Hard refresh: Ctrl+Shift+R
- Or: DevTools → Application → Clear All
- Then refresh normally

---

## 📝 ERROR CODES

| Message | Meaning | Fix |
|---------|---------|-----|
| "401" | Jira API key invalid | Re-enter correct key |
| "403" | No permission | Check Jira user permissions |
| "404" | API endpoint wrong | Check Jira instance URL |
| "Timeout" | Jira slow/down | Wait & retry |
| "No results" | Empty sprint | Create test sprint in Jira |

---

## 🚀 ONCE ALL TESTS PASS

1. ✅ Document results
2. ✅ Take screenshots
3. ✅ Report any failures
4. ✅ Try with real Jira data
5. ✅ Test all 24 features if desired

---

**Ready to start testing?**

Run through TEST 1-7 in order and report:
- How many PASSED
- Which ones FAILED (if any)
- Error messages you see

Then I'll help diagnose any failures!
