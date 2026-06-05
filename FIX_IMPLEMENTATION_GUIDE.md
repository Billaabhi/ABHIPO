# 🔧 DASHBOARD AUDIT - IMPLEMENTATION GUIDE

This guide tells you EXACTLY where to find code and HOW to fix it.

---

## ISSUE #1: Hardcoded POD List

### Location
**File:** `index.html`  
**Lines:** 30318, 30550

### Current Code (WRONG)
```javascript
var projects = podKey ? [podKey] : ['HIP', 'ADE', 'AGDF', 'AGEA'];
```

### Problem
Only 4 PODs. You have ~20. 16 PODs are invisible.

### Step-by-Step Fix

#### Step 1: Create function to fetch all PODs
Add this function somewhere before `fetchLiveSprintData`:

```javascript
async function fetchAllPODsFromJira() {
  try {
    var res = await jiraFetch('/rest/api/3/projects?expand=lead&maxResults=100');
    if (!res.ok) {
      console.error('Could not fetch projects from Jira');
      return [];
    }
    
    var pods = res.values.map(p => ({
      key: p.key,
      name: p.name,
      category: p.category || 'Other'
    }));
    
    console.log('✅ Discovered ' + pods.length + ' PODs from Jira:', 
                pods.map(p => p.key).join(', '));
    
    // Cache the result
    localStorage.setItem('discoveredPODs', JSON.stringify(pods));
    return pods;
  } catch (e) {
    console.error('Error fetching PODs:', e);
    return [];
  }
}
```

#### Step 2: Use dynamic list instead of hardcoded
Find this line (around 30550):
```javascript
var projects = podKey ? [podKey] : ['HIP', 'ADE', 'AGDF', 'AGEA'];
```

Replace with:
```javascript
var allPODs = await fetchAllPODsFromJira();
var projects = podKey ? [podKey] : allPODs.map(p => p.key);

if (projects.length === 0) {
  console.warn('⚠️  No PODs found. Check Jira connection.');
  projects = ['HIP', 'ADE', 'AGDF', 'AGEA']; // Fallback to hardcoded only if fetch fails
}
```

#### Step 3: Update POD dropdown to show all PODs
Find the HTML select element with ID `podSelect` and add this code:

```javascript
async function updatePODDropdown() {
  var pods = await fetchAllPODsFromJira();
  var dropdown = document.getElementById('podSelect');
  
  if (!dropdown) return;
  
  // Keep "All PODs" option
  dropdown.innerHTML = '<option value="">🌍 All PODs</option>';
  
  // Add each POD
  pods.forEach(pod => {
    var option = document.createElement('option');
    option.value = pod.key;
    option.textContent = '📦 ' + pod.key + ' (' + pod.name + ')';
    dropdown.appendChild(option);
  });
}

// Call when page loads
document.addEventListener('DOMContentLoaded', updatePODDropdown);
```

### Verification
1. Open browser console (F12)
2. You should see: `✅ Discovered 20 PODs from Jira: HIP, ADE, AGDF, ...`
3. Open POD dropdown
4. Should show all ~20 PODs (not just 4)

---

## ISSUE #2: Hardcoded Sprint Days

### Location
**File:** `index.html`  
**Lines:** 30343-30353 (sprint name extraction)  
**Lines:** 30433-30434 (hardcoded days)

### Current Code (WRONG)
```javascript
var sprintName = 'Current Sprint';
var sprintDates = '';
for (var i = 0; i < issues.length; i++) {
  if (issues[i].fields.sprint) {
    sprintName = issues[i].fields.sprint.name;
    // ... extract dates
    break;
  }
}
// ...
var daysPassed = 3; // HARDCODED!
var daysRemaining = 7; // HARDCODED!
```

### Problem
- Sprint name from FIRST issue found (unreliable)
- Days never change during sprint
- Days always 3+7 (never real values)

### Step-by-Step Fix

#### Step 1: Create function to query sprint explicitly
Add this function:

```javascript
async function getActiveSprint(boardId) {
  try {
    var res = await jiraFetch('/rest/api/3/boards/' + boardId + '/sprints?state=ACTIVE');
    if (!res.ok || res.values.length === 0) {
      console.warn('No active sprint found for board ' + boardId);
      return null;
    }
    
    var sprint = res.values[0]; // First ACTIVE sprint
    console.log('✅ Found active sprint:', sprint.name);
    return sprint;
  } catch (e) {
    console.error('Error fetching active sprint:', e);
    return null;
  }
}

function calculateSprintProgress(sprint) {
  var now = new Date();
  var startDate = new Date(sprint.startDate);
  var endDate = new Date(sprint.endDate);
  
  var daysPassed = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));
  var daysRemaining = Math.floor((endDate - now) / (1000 * 60 * 60 * 24));
  var totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  // Clamp to reasonable values
  daysPassed = Math.max(0, Math.min(daysPassed, totalDays));
  daysRemaining = Math.max(0, Math.min(daysRemaining, totalDays));
  
  return {
    daysPassed: daysPassed,
    daysRemaining: daysRemaining,
    totalDays: totalDays,
    percentComplete: (daysPassed / totalDays) * 100
  };
}
```

#### Step 2: Get board ID for each POD
Add this function:

```javascript
async function getBoardIdForPOD(podKey) {
  try {
    var res = await jiraFetch('/rest/api/3/boards?projectKey=' + podKey);
    if (!res.ok || res.values.length === 0) {
      console.warn('No boards found for project ' + podKey);
      return null;
    }
    return res.values[0].id;
  } catch (e) {
    console.error('Error getting board ID:', e);
    return null;
  }
}
```

#### Step 3: Replace hardcoded sprint extraction
Find and replace this section (around lines 30343-30434):

**BEFORE:**
```javascript
var sprintName = 'Current Sprint';
var sprintDates = '';
for (var i = 0; i < issues.length; i++) {
  if (issues[i].fields.sprint) {
    sprintName = issues[i].fields.sprint.name;
    if (issues[i].fields.sprint.startDate) {
      sprintDates = issues[i].fields.sprint.startDate.split('T')[0];
    }
    break;
  }
}
// ...
var daysPassed = 3; // HARDCODED - WRONG
var daysRemaining = 7; // HARDCODED - WRONG
```

**AFTER:**
```javascript
var boardId = await getBoardIdForPOD(projects[0]);
var activeSprint = await getActiveSprint(boardId);

var sprintName = activeSprint ? activeSprint.name : 'Current Sprint';
var sprintDates = {
  startDate: activeSprint ? activeSprint.startDate : null,
  endDate: activeSprint ? activeSprint.endDate : null
};

var sprintProgress = activeSprint ? calculateSprintProgress(activeSprint) : {
  daysPassed: 0,
  daysRemaining: 10,
  totalDays: 10,
  percentComplete: 0
};

var daysPassed = sprintProgress.daysPassed; // REAL VALUE
var daysRemaining = sprintProgress.daysRemaining; // REAL VALUE
```

### Verification
1. Load dashboard
2. Check browser console
3. You should see: `✅ Found active sprint: Sprint 25`
4. Watch progress in console:
   - `daysPassed: 3`
   - `daysRemaining: 7`
5. Refresh next day
   - `daysPassed` should be `4`
   - `daysRemaining` should be `6`

---

## ISSUE #3: Wrong Velocity Definition

### Location
**File:** `index.html`  
**Line:** 30432

### Current Code (WRONG)
```javascript
var velocity = Math.round((summary.donePoints / (summary.totalPoints || 1)) * 100);
// This calculates completion %, not velocity!
```

### Problem
- Velocity = points/day (a RATE, changes daily)
- Completion % = done/total (a PERCENTAGE, makes sense)
- You're mixing them up

### Step-by-Step Fix

#### Step 1: Create proper velocity functions
Add these functions:

```javascript
function calculateCurrentVelocity(donePoints, daysPassed) {
  // Velocity = points completed per day
  if (daysPassed === 0) return 0;
  return donePoints / daysPassed;
}

async function getHistoricalVelocity(podKey, lastNSprints = 3) {
  try {
    // Query completed sprints
    var jql = 'project = "' + podKey + '" AND resolution = Done ' +
              'AND updatedDate >= -' + (lastNSprints * 15) + 'd ' +
              'ORDER BY updated DESC';
    
    var res = await jiraFetch('/search?jql=' + encodeURIComponent(jql) + 
                             '&fields=customfield_10028,resolutiondate&maxResults=100');
    
    if (!res.ok || res.issues.length === 0) {
      console.warn('Could not find completed issues for historical velocity');
      return null;
    }
    
    // Group by sprint, sum points
    var sprintPoints = {};
    res.issues.forEach(issue => {
      var sprintId = issue.fields.sprint ? issue.fields.sprint.id : 'none';
      if (!sprintPoints[sprintId]) sprintPoints[sprintId] = 0;
      sprintPoints[sprintId] += issue.fields.customfield_10028 || 0;
    });
    
    var velocities = Object.values(sprintPoints);
    var avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    
    console.log('📊 Historical velocity (last ' + lastNSprints + ' sprints): ' + 
                Math.round(avgVelocity) + ' points/sprint');
    
    return {
      velocities: velocities,
      average: avgVelocity,
      max: Math.max(...velocities),
      min: Math.min(...velocities)
    };
  } catch (e) {
    console.error('Error getting historical velocity:', e);
    return null;
  }
}

function forecastSprintCompletion(currentVelocity, pointsRemaining, daysRemaining, 
                                 historicalVelocity) {
  // Use historical average if current sprint is early
  var projectedVelocity = currentVelocity > 0 ? currentVelocity : 
                          (historicalVelocity?.average || 10);
  
  var projectedPoints = projectedVelocity * daysRemaining;
  var totalProjected = currentVelocity * (Math.floor(daysRemaining + daysPassed)) || 
                       historicalVelocity.average * 10; // Assuming 10-day sprint
  
  return {
    projectedDailyRate: Math.round(projectedVelocity * 10) / 10,
    pointsCanCompleteRemaining: Math.round(projectedPoints),
    totalProjected: Math.round(totalProjected),
    willComplete: pointsRemaining <= projectedPoints
  };
}
```

#### Step 2: Replace hardcoded velocity calculation
Find this line (around 30432):
```javascript
var velocity = Math.round((summary.donePoints / (summary.totalPoints || 1)) * 100);
```

Replace with:
```javascript
// Calculate REAL velocity (points/day, not completion %)
var currentVelocity = calculateCurrentVelocity(summary.donePoints, daysPassed);
var historicalVelocity = await getHistoricalVelocity(projects[0], 3);
var forecast = forecastSprintCompletion(currentVelocity, 
                                        summary.totalPoints - summary.donePoints,
                                        daysRemaining,
                                        historicalVelocity);

console.log('📈 Current Velocity: ' + Math.round(currentVelocity * 10) / 10 + ' points/day');
console.log('📊 Historical Velocity: ' + Math.round(historicalVelocity?.average || 0) + ' points/sprint');
console.log('🎯 Forecast: ' + forecast.pointsCanCompleteRemaining + ' points by sprint end');

// Store for display
var insights = [];
if (forecast.willComplete) {
  insights.push({
    type: 'positive',
    emoji: '✅',
    title: 'ON TRACK',
    message: 'At current velocity (' + Math.round(currentVelocity * 10) / 10 + 
             ' pts/day), will complete ' + forecast.pointsCanCompleteRemaining + ' points.',
    action: 'Maintain current pace.'
  });
} else {
  insights.push({
    type: 'warning',
    emoji: '⚠️',
    title: 'BEHIND FORECAST',
    message: 'Need ' + Math.round((summary.totalPoints - summary.donePoints) / daysRemaining) + 
             ' pts/day. Current: ' + Math.round(currentVelocity * 10) / 10 + ' pts/day.',
    action: 'Increase pace or reduce scope.'
  });
}
```

### Verification
1. Check console output
2. Should see:
   - `📈 Current Velocity: 8.5 points/day`
   - `📊 Historical Velocity: 10 points/sprint`
   - `🎯 Forecast: 42 points by sprint end`
3. Velocity should change daily (not static)
4. Forecast should use historical average if early in sprint

---

## ISSUE #4: No Active Sprint Filtering

### Location
**File:** `index.html`  
**Lines:** 30324, 30557

### Current Code (WRONG)
```javascript
var sprintIssuesJql = 'sprint in openSprints() AND project IN (' + projectsJql + ')';
```

### Problem
`openSprints()` includes future sprints (not started yet). Mixes current + future work.

### Fix
Replace `openSprints()` with explicit active sprint:

**Option A (Simple, Fast):**
```javascript
var sprintIssuesJql = 'sprint = currentSprint() AND project IN (' + projectsJql + ')';
```

**Option B (More Explicit, Better Control):**
```javascript
// Get board and active sprint first
var boardId = await getBoardIdForPOD(projects[0]);
var activeSprint = await getActiveSprint(boardId);

if (activeSprint) {
  var sprintIssuesJql = 'sprint = ' + activeSprint.id + ' AND project IN (' + projectsJql + ')';
} else {
  // Fallback to issues updated in current sprint window
  var sprintIssuesJql = 'project IN (' + projectsJql + ') AND updated >= -10d ORDER BY updated DESC';
}
```

### Verification
1. Console should show: `✅ Only fetching ACTIVE sprint (not future sprints)`
2. Dashboard metrics should only include current sprint
3. Future planning items should NOT appear

---

## ISSUE #5: Arbitrary Overload Threshold

### Location
**File:** `index.html`  
**Lines:** 30485-30501

### Current Code (WRONG)
```javascript
if (assignee.points > 15) { // Why 15? Arbitrary!
  overloaded.push(name + ' (' + assignee.points + 'pts)');
}
```

### Step-by-Step Fix

#### Step 1: Create team capacity model
Add this function:

```javascript
function getTeamCapacity(sprintLengthDays = 10, teamSize = 1) {
  // Base capacity: 10 points per engineer per 2-week sprint
  var basePerEngineer = 10;
  
  // Adjust for sprint length
  var adjustedCapacity = (basePerEngineer / 10) * sprintLengthDays;
  
  // This is per engineer
  return adjustedCapacity;
}

function getEngineerCapacity(engineer, sprint) {
  if (!engineer || !sprint) return 0;
  
  // Base capacity for sprint length
  var capacity = getTeamCapacity(sprint.totalDays);
  
  // Adjust for engineer level if available
  if (engineer.level) {
    var levelMultiplier = {'Senior': 1.2, 'Mid': 1.0, 'Junior': 0.8};
    capacity = capacity * (levelMultiplier[engineer.level] || 1.0);
  }
  
  // Adjust for vacation if available
  if (engineer.vacationDays) {
    var workDays = sprint.totalDays - engineer.vacationDays;
    capacity = (capacity / sprint.totalDays) * Math.max(0, workDays);
  }
  
  return capacity;
}

function getEngineerUtilization(engineer, assignedPoints, sprintData) {
  var capacity = getEngineerCapacity(engineer, sprintData);
  var utilization = assignedPoints / capacity;
  
  return {
    name: engineer.name,
    assignedPoints: assignedPoints,
    capacity: Math.round(capacity * 10) / 10,
    utilization: Math.round(utilization * 100),
    status: utilization > 1.1 ? 'OVERLOADED' : 
            utilization > 1.0 ? 'AT_CAPACITY' :
            'OK',
    icon: utilization > 1.1 ? '🔴' : 
          utilization > 1.0 ? '⚠️' : '✅'
  };
}
```

#### Step 2: Replace hardcoded threshold check
Find this section (around 30485-30501):

**BEFORE:**
```javascript
var overloaded = [];
Object.keys(summary.assignees).forEach(function(name) {
  var assignee = summary.assignees[name];
  if (assignee.points > 15) { // ARBITRARY 15!
    overloaded.push(name + ' (' + assignee.points + 'pts)');
  }
});
```

**AFTER:**
```javascript
var overloaded = [];
var teamCapacityInfo = [];

Object.keys(summary.assignees).forEach(function(name) {
  var assignee = summary.assignees[name];
  var engineer = {name: name, level: 'Mid'}; // Get from Jira if available
  
  var utilization = getEngineerUtilization(engineer, assignee.points, 
                                          {totalDays: daysPassed + daysRemaining});
  teamCapacityInfo.push(utilization);
  
  // Flag if overloaded (>110% capacity)
  if (utilization.utilization > 110) {
    overloaded.push(name + ' (' + assignee.points + 'pts vs ' + 
                    utilization.capacity + ' capacity: ' + 
                    utilization.utilization + '%)');
  }
});

// Log capacity info
console.log('👥 Team Capacity:');
teamCapacityInfo.forEach(info => {
  console.log(info.icon + ' ' + info.name + ': ' + info.assignedPoints + 'pts / ' + 
              info.capacity + ' capacity (' + info.utilization + '%)');
});
```

### Verification
1. Console should show team capacity breakdown:
   ```
   👥 Team Capacity:
   ✅ Ahmed: 8pts / 10 capacity (80%)
   ⚠️ Fatima: 12pts / 10 capacity (120%)
   🔴 Khalid: 14pts / 10 capacity (140%)
   ```

2. Different thresholds per person (not everyone at 15)
3. Capacity adjusts for sprint length

---

## QUICK REFERENCE: Code Locations

| Issue | File | Lines | Function |
|-------|------|-------|----------|
| Hardcoded PODs | index.html | 30550 | `fetchLiveSprintData()` |
| Hardcoded days | index.html | 30343-30434 | `fetchLiveSprintData()`, `generateInsights()` |
| Wrong velocity | index.html | 30432 | `generateInsights()` |
| No sprint filter | index.html | 30324, 30557 | `fetchLiveSprintData()` |
| Arbitrary threshold | index.html | 30485-30501 | `generateInsights()` |

---

## TESTING YOUR FIXES

### Test 1: POD List
```javascript
// In browser console (F12):
var pods = await fetchAllPODsFromJira();
console.log(pods.length + ' PODs found'); // Should be ~20, not 4
```

### Test 2: Sprint Days
```javascript
// Check that days increase daily
var sprint = await getActiveSprint(boardId);
var progress = calculateSprintProgress(sprint);
console.log('Days passed: ' + progress.daysPassed); // Should increase each day
```

### Test 3: Velocity
```javascript
// Should show different values
var velocity = calculateCurrentVelocity(50, 3); // 50 points / 3 days = 16.67
console.log(velocity); // Should be ~16.67, not completion %
```

### Test 4: Team Capacity
```javascript
// Should show different capacities per engineer
var util = getEngineerUtilization(
  {name: 'Ahmed', level: 'Mid'},
  8,
  {totalDays: 10}
);
console.log(util); // {capacity: 10, utilization: 80}
```

---

## COMMON ERRORS & SOLUTIONS

| Error | Solution |
|-------|----------|
| `Cannot read properties of undefined (reading 'values')` | Check Jira API response. Validate Jira is connected. |
| `Discovered 0 PODs from Jira` | Check Jira projects exist. Verify proxy URL configured. |
| `No active sprint found` | Check board exists. Verify sprint is marked ACTIVE in Jira. |
| `Velocity is NaN` | Check daysPassed > 0. If sprint just started, velocity will be undefined. |
| `Utilization shows 0%` | Check engineer is assigned in Jira. Check assignee name matches. |

---

## DEPLOYMENT CHECKLIST

Before deploying fixes:

- [ ] Test each function individually (console)
- [ ] Test full dashboard load
- [ ] Verify console shows correct values
- [ ] Check dashboard displays correct data
- [ ] Compare with Jira data (manual spot check)
- [ ] Ask team to spot-check their POD
- [ ] Monitor for 1 day before promoting to all users

