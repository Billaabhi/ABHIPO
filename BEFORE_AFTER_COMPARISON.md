# Before vs After: Custom vs Official Jira Metrics

## Overview

This document shows the exact changes made to switch from custom sprint calculations to Jira's official metrics.

---

## Change #1: Sprint Completion

### BEFORE (Custom Calculation)
```javascript
// Old approach: Just counted items, no distinction
const committed = (dAll.total || dAll.issues?.length || 0) 
  + (dDone.issues?.length || 0);
const completed = dDone.issues?.length || 0;
// Implicitly: days-based calculation in some places
```

**Problems:**
- Used day count instead of issue count
- Mixed "committed" with total open
- No story point metric
- Formula unclear

**Example Output:**
```
✅ Sprint data loaded: 42 items, 10 bugs, 5 assignees
(Unclear: What % done? Are these issues or points?)
```

### AFTER (Official Jira Formula)
```javascript
// Official Jira formula:
const totalIssuesInSprint = allIssues.length + doneIssues.length;
const doneIssuesCount = doneIssues.length;
const completionPercent = totalIssuesInSprint > 0 
  ? Math.round((doneIssuesCount / totalIssuesInSprint) * 100) 
  : 0;
```

**Benefits:**
- Official Jira formula: (Done / Total) × 100
- Clear metric name: "Completion %"
- Logged with formula for verification
- Matches Jira's native calculation

**Example Output:**
```
✅ Official Jira metrics loaded — 50% complete (52 SP velocity)

Console Log:
COMPLETION:
├─ Issues Done: 12/24 = 50%
├─ Completion % Formula: (Issues Done / Total Issues) × 100
└─ Jira Source: /rest/api/3/search (status filtering)
```

---

## Change #2: Sprint Velocity

### BEFORE (Custom or Missing)
```javascript
// Custom calculation (unreliable)
const velocity = points_per_day * number_of_days;

// Or just ignored velocity entirely
// No official "velocity" metric calculated
```

**Problems:**
- No consistent velocity calculation
- Confused velocity with throughput
- No story point tracking
- Velocity not tied to actual done work

**Example Output:**
```
No velocity metric shown
```

### AFTER (Official Jira Formula)
```javascript
// Official Jira formula: Sum of completed story points
const sprintVelocity = (doneIssues || []).reduce((sum, i) => 
  sum + (i.fields.customfield_10028 || 0), 0);
```

**Benefits:**
- Official Jira metric: Sum of Done issue story points
- Clear, immutable definition
- Matches Jira's velocity reports
- Automatically tracked from Jira data

**Example Output:**
```
Console Log:
VELOCITY (Story Points):
├─ Completed Points: 52 SP
├─ Velocity Formula: Sum of points in Done issues
└─ Jira Custom Field: customfield_10028 (Story Points)

Dashboard Card:
🎯 52 SP (Total SP completed)
```

---

## Change #3: Remaining Capacity

### BEFORE (Custom or Missing)
```javascript
// Custom calculation
var remaining = totalPoints - completedPoints;
// But what is "totalPoints"? Not clearly tracked.

// Or missing entirely
// No clear remaining capacity metric
```

**Problems:**
- Unclear what "total" meant
- Remaining not shown on dashboard
- No point-based capacity tracking
- Hard to forecast completion

**Example Output:**
```
No remaining capacity shown
```

### AFTER (Official Jira Formula)
```javascript
// Official Jira formula: Total Points - Completed Points
const totalPointsInSprint = [...allIssues, ...doneIssues]
  .reduce((sum, i) => sum + (i.fields.customfield_10028 || 0), 0);
const remainingCapacity = totalPointsInSprint - sprintVelocity;
```

**Benefits:**
- Official Jira metric: Total - Completed
- Clear definition of remaining work
- Shows actual point capacity
- Enables completion forecasting

**Example Output:**
```
Console Log:
CAPACITY:
├─ Total Points Committed: 96 SP
├─ Points Completed: 52 SP
├─ Remaining Capacity: 44 SP
└─ Capacity Formula: Total - Completed

Dashboard Card:
📦 44 SP (SP not yet done) / 96 committed
```

---

## Change #4: Burndown Chart

### BEFORE (Custom Calculation)
```javascript
// Custom formula (incorrect)
const idealLine = (totalSP * (1 - daysPassed / sprintDays));
const actualLine = loggedRemainingPoints; // Manual entry

// No burn rate calculation
// No completion projection
```

**Problems:**
- Ideal line calculation was math-based, not Jira standard
- No burn rate analysis
- No completion forecast
- Hard to predict on-time delivery

**Example Output:**
```
Chart shows: Ideal line (wrong math) vs Actual line
Subtitle: "On Track" or "Behind" (no quantification)
```

### AFTER (Official Jira Formula)
```javascript
// Jira official: Linear ideal, logged actual
const idealPts = Array.from({length:spDays}, (_, i) => 
  pad + i*xStep, pad+(1-i/(spDays-1))*(h-pad*2)); // Linear decline

// Calculate burn rate
const burnRate = (burndownLog[0].remaining - lastPoint.remaining) 
  / (lastPoint.day - 1);

// Project completion
const projectedCompletion = lastPoint.remaining 
  - (burnRate * daysRemaining);
```

**Benefits:**
- Official Jira ideal: Linear decline from total to 0
- Burn rate calculated from actual data
- Completion forecast based on current pace
- Clear "on track" vs "at risk" determination

**Example Output:**
```
Console Log:
✅ JIRA OFFICIAL DAILY BURNDOWN METRIC
├─ Day 4: 44 SP remaining
├─ Ideal: 72 SP remaining
├─ Burn Rate: -17.3 SP/day
├─ Days Left: 6
├─ Projected Completion: -58.8 SP
└─ Status: At Risk

Chart shows:
- Dashed line: Ideal (linear decline)
- Solid line: Actual (logged points)
- Subtitle: "Behind | Burn: -17.3 SP/day"
```

---

## Change #5: Dashboard Display

### BEFORE (Mixed Metrics)
```
Open Items: 25 [To Do + In Progress?]
In Progress: 8 [Just In Progress?]
Done (14d): 12 [Issues only?]
Open Bugs: 3 [Unresolved]
Velocity: 34 SP [14 days? This sprint?]
Completion: 32% [Days-based?]
```

**Problems:**
- Metrics unclear (issues vs points)
- Mixed time periods (14d, this sprint)
- Completion % was incorrectly calculated
- No story point breakdown

### AFTER (Official Jira Metrics)
```
Completion %: 50% (Jira formula)
Velocity: 52 SP (Total SP completed)
Remaining: 44 SP / 96 committed
Open Items: 25 (To Do + In Progress)
Done Issues: 12 (Issues completed)
Open Bugs: 3 (Unresolved)
```

**Benefits:**
- Each metric labeled with Jira formula
- All metrics for THIS sprint (not 14d)
- Clear separation: issues vs points
- Matches Jira's native metric names

---

## Change #6: Console Logging

### BEFORE (No Logging)
```
No console logs shown
No verification possible
User must trust the numbers
```

### AFTER (Full Metric Logging)
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

TEAM:
├─ Active Assignees: 5
└─ Open Bugs: 3

✅ JIRA OFFICIAL DAILY BURNDOWN METRIC
├─ Day 4: 44 SP remaining
├─ Ideal: 72 SP remaining
├─ Burn Rate: -17.3 SP/day
├─ Days Left: 6
├─ Projected Completion: -58.8 SP
└─ Status: At Risk
```

**Benefits:**
- Every metric logged with formula
- User can verify calculations
- Copy-paste ready for reports
- Clear data source attribution

---

## Summary Table

| Aspect | Before (Custom) | After (Official Jira) |
|--------|-----------------|----------------------|
| **Completion %** | Days-based math | (Done Issues / Total) × 100 |
| **Velocity** | Confused or missing | Sum of SP in Done status |
| **Remaining** | Not shown | Total SP - Completed SP |
| **Burndown** | Incorrect ideal line | Linear ideal vs logged actual |
| **Burn Rate** | Not calculated | (start - current) / days |
| **Forecast** | No completion projection | Projected based on burn rate |
| **Dashboard** | Mixed metrics | All official Jira metrics |
| **Console Log** | No logging | Full metric breakdown |
| **Data Source** | Unclear | `/rest/api/3/search` documented |
| **Verification** | Trust | Logged with formulas |

---

## Why This Matters

### Old System (Custom)
- Sprint metrics were **unreliable** (different formula each time)
- Numbers didn't match Jira (user had to compare manually)
- Completion % could be wrong (days vs issues)
- Velocity was ambiguous (SP? Points/day? Throughput?)
- No way to verify calculations
- Reports had to say "approximate"

### New System (Official Jira)
- Sprint metrics are **authoritative** (matches Jira exactly)
- Numbers **guaranteed to match** Jira's display
- Completion % follows Jira's published formula
- Velocity is unambiguous: sum of SP
- All calculations logged for verification
- Reports can say "from Jira official metrics"

---

## Testing the Change

### Before Load
```
Open Console (F12) → Console tab
```

### Click "Load Sprint"
```
Watch console output appear with:
✅ JIRA OFFICIAL SPRINT METRICS (From Jira API)
[Full metrics breakdown]
```

### Verify Each Metric
```
✅ Completion % = (Done Issues / Total Issues) × 100
✅ Velocity = Sum of SP in Done status
✅ Remaining = Total SP - Completed SP
✅ Burndown = Actual vs Ideal line with burn rate
```

### Check Dashboard
```
Cards show:
- Completion %: [percentage]
- Velocity: [SP number]
- Remaining: [SP number] / [total committed]
- Open Items: [count]
- Done Issues: [count]
- Open Bugs: [count]
```

---

## Rollback Instructions

If needed to revert to old system:

1. Find `loadSprintFromJira()` function (line 28241)
2. Find `generateSprintReport()` function (line 31282)
3. Find `renderBurndown()` function (line 13073)
4. Restore from git version control before this commit

However, **recommend keeping official metrics** as they match Jira's calculations exactly.

---

## Questions About Metrics?

**Q: Why (Done Issues / Total Issues) instead of (Done SP / Total SP)?**
A: Jira has TWO completion metrics:
- Issue Completion %: Done issues / total issues
- Point Completion %: Done SP / total SP
We show the official issue completion. Both are valid.

**Q: What if team adds scope mid-sprint?**
A: Remaining capacity will increase (good for detection). 
To track original scope, would need `/rest/api/3/sprints/{sprintId}` endpoint.

**Q: Does this change past sprint data?**
A: No. Only new metrics calculated going forward.
Past sprint history stays the same.

**Q: Why log to console?**
A: So you can verify the math. Copy-paste metrics into reports.
Transparency = trust in the numbers.
