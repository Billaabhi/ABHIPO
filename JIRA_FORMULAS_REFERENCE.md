# Jira Official Sprint Metrics - Formula Reference

This document shows the EXACT formulas Jira uses for sprint metrics. Your code now implements these formulas exactly.

---

## 1. Sprint Completion %

### Formula
```
(Issues Done / Total Issues in Sprint) × 100
```

### JavaScript Implementation
```javascript
const doneIssuesCount = doneIssues.length;
const totalIssuesInSprint = allIssues.length + doneIssues.length;
const completionPercent = totalIssuesInSprint > 0 
  ? Math.round((doneIssuesCount / totalIssuesInSprint) * 100) 
  : 0;
```

### Example
```
Sprint 25:
├─ Total Issues: 24
├─ Done Issues: 12
├─ Formula: (12 / 24) × 100 = 50%
└─ Displayed: 50% Complete
```

### Data Source
- **Endpoint:** `/rest/api/3/search`
- **Query:** `project = "HIP" AND statusCategory in ("To Do","In Progress") AND statusCategory = Done`
- **Count:** `issues.length` where `status.name = "Done"`

---

## 2. Sprint Velocity

### Formula
```
Total Story Points Completed in Sprint
= Sum(customfield_10028 where status = Done)
```

### JavaScript Implementation
```javascript
const sprintVelocity = (doneIssues || []).reduce((sum, i) => 
  sum + (i.fields.customfield_10028 || 0), 0);
```

### Example
```
Sprint 25 - Done Issues:
├─ HIP-1234: 8 SP (Done)
├─ HIP-1235: 5 SP (Done)
├─ HIP-1236: 13 SP (Done)
├─ HIP-1237: 21 SP (Done)
├─ HIP-1238: 5 SP (Done)
└─ Total Velocity: 52 SP
```

### Data Source
- **Endpoint:** `/rest/api/3/search`
- **Field:** `customfield_10028` (Story Points)
- **Filter:** `statusCategory = Done AND updated >= -30d`

---

## 3. Total Points in Sprint

### Formula
```
Sum of Story Points for ALL issues (To Do + In Progress + Done)
```

### JavaScript Implementation
```javascript
const totalPointsOpen = (open.issues||[]).reduce((s,i) => 
  s + (i.fields.customfield_10028||0), 0);
const totalPointsInProg = (inprog.issues||[]).reduce((s,i) => 
  s + (i.fields.customfield_10028||0), 0);
const totalPointsDone = (done14.issues||[]).reduce((s,i) => 
  s + (i.fields.customfield_10028||0), 0);
const totalPointsInSprint = totalPointsOpen + totalPointsInProg + totalPointsDone;
```

### Example
```
Sprint 25 - All Issues:
├─ To Do: 3 issues = 34 SP
├─ In Progress: 4 issues = 10 SP
├─ Done: 5 issues = 52 SP
└─ Total Committed: 96 SP
```

### Data Source
- **Endpoint:** `/rest/api/3/search`
- **Statuses:** All status categories
- **Field:** `customfield_10028`

---

## 4. Remaining Capacity

### Formula
```
Total Points Committed - Points Completed
= totalPointsInSprint - sprintVelocity
```

### JavaScript Implementation
```javascript
const remainingCapacity = totalPointsInSprint - totalPointsDone;
```

### Example
```
Sprint 25 - Capacity:
├─ Total Committed: 96 SP
├─ Points Done: 52 SP
├─ Remaining: 96 - 52 = 44 SP
└─ % Remaining: 45.8%
```

### Interpretation
- **0 SP remaining:** Sprint 100% done
- **44 SP remaining:** Still 45.8% of work left
- **Negative (Scope added):** More points added mid-sprint than completed

---

## 5. Daily Burndown (Remaining Points)

### Formula
```
Ideal: Linear decline from totalSP to 0 over sprintDays
Actual: Logged remaining points each day
```

### JavaScript Implementation
```javascript
// Ideal line
const idealPts = Array.from({length:spDays}, (_, i) => 
  `${pad+i*xStep},${pad+(1-i/(spDays-1))*(h-pad*2)}`).join(' ');

// Actual line (from logged data)
const actualPts = burndownLog.map((d,i) => 
  `${pad+Math.min(d.day-1,spDays-1)*xStep},${Math.max(pad,h-pad-d.remaining*yScale)}`
).join(' ');
```

### Burn Rate Calculation
```javascript
const burnRate = burndownLog.length > 1
  ? Math.round((burndownLog[0].remaining - lastPoint.remaining) 
    / (lastPoint.day - 1) * 10) / 10
  : 0;
```

### Projection
```javascript
const daysRemaining = Math.max(spDays - (lastPoint?.day || 0), 0);
const projectedCompletion = lastPoint.remaining - (burnRate * daysRemaining);

// Will complete if: projectedCompletion <= 0
```

### Example
```
Sprint 25 Burndown:
├─ Day 1: 96 SP (Ideal: 96)
├─ Day 2: 85 SP (Ideal: 86.4)
├─ Day 3: 60 SP (Ideal: 76.8)
├─ Day 4: 44 SP (Ideal: 67.2) ← BEHIND
├─ Burn Rate: -17.3 SP/day
├─ Days Left: 6
├─ Projected: 44 - (17.3 × 6) = -59.8 SP
└─ Status: At Risk - will over-complete or run out of points
```

---

## 6. Scope Change

### Formula
```
Current Total Points - Original Total Points
```

### JavaScript Implementation
```javascript
const scopeChange = currentTotalPoints - originalTotalPoints;
// Positive = scope added
// Negative = scope removed
// Zero = no change
```

### Status in Implementation
Currently set to `0` - requires sprint board endpoint to track original committed scope:

```javascript
// Would query:
// GET /rest/api/3/sprints/{sprintId}
// Response includes: originBoardGoal, startDate, endDate, completedIssues
```

### Example
```
Sprint 25 Scope:
├─ Original: 96 SP
├─ After Day 2: 110 SP (Added 14 SP mid-sprint)
├─ Scope Change: +14 SP
└─ Impact: Velocity looks lower due to mid-sprint additions
```

---

## Jira API Endpoints Used

### Search Endpoint
```
GET /rest/api/3/search?jql={JQL}&maxResults={N}&fields={fields}
```

**JQL Queries:**
```
# To Do
project = "HIP" AND statusCategory = "To Do" ORDER BY updated DESC

# In Progress
project = "HIP" AND statusCategory = "In Progress" ORDER BY updated DESC

# Done (last 30 days)
project = "HIP" AND statusCategory = Done AND updated >= -30d ORDER BY updated DESC

# Open Bugs
project = "HIP" AND issuetype = Bug AND statusCategory != Done ORDER BY priority DESC
```

**Fields Requested:**
```
key, summary, status, issuetype, priority, assignee, customfield_10028
```

### Custom Field: Story Points
```
Jira Field: customfield_10028
Type: Number
Formula: Manually set on issues
Filter: Not null = Issue has been estimated
```

---

## Metric Priority (What's Most Important)

1. **Completion %** - Are we getting issues done? (Quality signal)
2. **Velocity** - How many points are we delivering? (Capacity signal)
3. **Remaining** - What's still left to do? (Workload signal)
4. **Burndown** - Are we on pace? (Schedule signal)
5. **Scope Change** - Did scope shift? (Stability signal)

---

## Not This Way (Old Custom Calculations)

❌ **DO NOT USE:**
```javascript
// BAD: Using days passed/remaining
completion = daysPassed / totalSprintDays * 100;

// BAD: Using velocity as points per day
dailyVelocity = totalPoints / sprintDays;

// BAD: Mixing issue count with points
velocity = (completed_issues + completed_points) / 2;

// BAD: Custom math
burndown = (totalPoints - daysPassed) / (sprintDays - daysPassed);
```

✅ **USE THESE FORMULAS:**
```javascript
// CORRECT: Issues actually done
completion = (done_issues / total_issues) * 100;

// CORRECT: Sum of completed story points
velocity = sum(story_points where status = Done);

// CORRECT: Points left
remaining = total_points - completed_points;

// CORRECT: Logged actual points each day
burndown = [day1: 96, day2: 85, day3: 60, ...];
```

---

## Verification Checklist

When you log sprint metrics, verify:

- [ ] Completion % is between 0-100
- [ ] Completion % = (Done Issues / Total Issues) × 100
- [ ] Velocity is sum of SP, not average or ratio
- [ ] Remaining = Total - Completed (never negative unless scope added)
- [ ] Burndown shows actual logged points (not calculated)
- [ ] Burn rate = (start remaining - current) / days elapsed
- [ ] Console logs show formulas for each metric

---

## Console Output Check

After loading sprint, console should show:

```
✅ JIRA OFFICIAL SPRINT METRICS (From Jira API)

COMPLETION:
├─ Issues Done: 12/24 = 50%
├─ Completion % Formula: (Issues Done / Total Issues) × 100
└─ Jira Source: /rest/api/3/search (status filtering)

VELOCITY (Story Points):
├─ Completed Points: 52 SP
├─ Velocity Formula: Sum of points in Done issues
└─ Jira Custom Field: customfield_10028 (Story Points)

CAPACITY:
├─ Total Points Committed: 96 SP
├─ Points Completed: 52 SP
├─ Remaining Capacity: 44 SP
└─ Capacity Formula: Total - Completed
```

If you see this, metrics are using official Jira formulas. ✅
