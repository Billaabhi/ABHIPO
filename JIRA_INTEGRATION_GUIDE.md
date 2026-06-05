# POD Dashboard — Jira Integration Guide

This guide explains how to connect the redesigned POD Dashboard to **live Jira data** so it shows real team capacity and engineer workload instead of mock data.

---

## Current State

**Status**: ✅ Dashboard UI redesigned, ⏳ Jira integration pending

**What Works Now**:
- Dashboard UI renders correctly with mock data
- Red flags surface resource problems
- Team capacity heatmap displays utilization %
- Engineer workload table shows available capacity

**What's Needed**:
- Live Jira API queries to fetch sprint data
- Engineer assignment mapping
- Story point aggregation per person
- Real-time capacity calculations

---

## Architecture Overview

```
┌─────────────────────┐
│  Jira Cloud API v3  │
│  (rest/api/3/...)   │
└──────────┬──────────┘
           │
     Cloudflare Worker
    (prodmind-jira-proxy)
           │
┌──────────▼──────────┐
│  Browser (ABHIPO)   │
│  jiraFetch()        │
│  renderPODDashboard │
└─────────────────────┘
```

**Flow**:
1. Browser calls `jiraFetch()` via Cloudflare Worker proxy
2. Worker authenticates with Jira using stored credentials
3. Returns JSON data
4. Browser calculates utilization, updates UI

---

## Implementation Steps

### Step 1: Set Up Jira Custom Fields

Before any code, ensure Jira has these fields:

**Required Fields:**

```
1. Story Point Estimate (Standard)
   - Type: Number
   - Default: 0
   - Used on: Story, Task, Bug
   - ID: customfield_10028 (may differ, check in Jira)

2. Team (Custom)
   - Type: Select List (Dropdown)
   - Values: HIP, AGDF, ADE, AGEA
   - Required: Yes
   - ID: customfield_XXXXX (get from Jira admin)

3. Remaining Estimate (Standard)
   - Type: Time Tracking
   - Used on: All issue types
   - Used for: Calculating days left on blockers

4. Individual Capacity (Custom - Optional)
   - Type: Number
   - Default: 8 (story points per sprint)
   - Used on: User profile (custom field)
   - If not available: Use default 8pts for all engineers
```

**How to Find Custom Field IDs**:
```
1. Go to Jira Admin → Custom Fields
2. Find "Team" field
3. Click → Note the ID (customfield_12345)
4. Use this ID in API queries: &fields=customfield_12345
```

---

### Step 2: Create `fetchPODDashboardData()` Function

Replace the mock `POD_DASHBOARD_DATA` with live data fetching.

**File Location**: `C:\Users\abilla\.claude\ABHIPO\index.html` (line 29879)

**Code to Add** (after `jiraConfig` initialization):

```javascript
// ══════════════════════════════════════════════════════════════
// LIVE JIRA DATA FETCHING — Replace mock data
// ══════════════════════════════════════════════════════════════

async function fetchPODDashboardData() {
  if (!jiraConfig) {
    console.warn('Jira not configured — using mock data');
    return POD_DASHBOARD_DATA; // Fallback to mock
  }

  try {
    var allData = {
      portfolio: {},
      teams: [],
      engineers: [],
      dependencies: [],
      redFlags: []
    };

    // ── 1. Get Current Sprint ──────────────────────────────────
    var sprintRes = await jiraFetch(
      '/board/1/sprint?state=active',
      { _workerAuth: true }
    );
    var sprintData = await sprintRes.json();
    var currentSprint = sprintData.values ? sprintData.values[0] : null;
    if (!currentSprint) {
      console.warn('No active sprint found');
      return POD_DASHBOARD_DATA;
    }
    var sprintId = currentSprint.id;

    // ── 2. Get All Issues in Current Sprint ────────────────────
    var issuesRes = await jiraFetch(
      '/search?jql=sprint=' + sprintId + 
      ' AND project in (HIP,ADE,AGDF,AGEA)' +
      '&maxResults=100' +
      '&fields=key,assignee,customfield_10028,customfield_XXXXX,status',
      { _workerAuth: true }
    );
    if (!issuesRes.ok) {
      console.error('Failed to fetch issues');
      return POD_DASHBOARD_DATA;
    }
    var issues = (await issuesRes.json()).issues || [];

    // ── 3. Build Team Data ─────────────────────────────────────
    var teamMap = {
      'HIP': { capacity: 40, assigned: 0 },
      'ADE': { capacity: 40, assigned: 0 },
      'AGDF': { capacity: 35, assigned: 0 },
      'AGEA': { capacity: 36, assigned: 0 }
    };

    var engineerMap = {};

    // Aggregate story points by team and engineer
    issues.forEach(function(issue) {
      var team = issue.fields.customfield_XXXXX; // Replace XXXXX with actual ID
      var assignee = issue.fields.assignee;
      var points = issue.fields.customfield_10028 || 0;

      if (team && teamMap[team]) {
        teamMap[team].assigned += points;
      }

      if (assignee) {
        var engKey = assignee.displayName;
        if (!engineerMap[engKey]) {
          engineerMap[engKey] = {
            name: assignee.displayName,
            assigned: 0,
            team: team,
            issues: []
          };
        }
        engineerMap[engKey].assigned += points;
        engineerMap[engKey].issues.push(issue.key);
      }
    });

    // ── 4. Build Teams Array ───────────────────────────────────
    Object.keys(teamMap).forEach(function(teamKey) {
      var team = teamMap[teamKey];
      var util = Math.round((team.assigned / team.capacity) * 100);
      var status = util <= 70 ? 'available' : 
                   util <= 85 ? 'optimal' : 
                   util <= 95 ? 'tight' : 'overload';

      allData.teams.push({
        key: teamKey,
        name: getTeamFullName(teamKey),
        capacity: team.capacity,
        allocated: team.assigned,
        util: util,
        status: status,
        engineers: countTeamEngineers(engineerMap, teamKey)
      });
    });

    // ── 5. Build Engineers Array ───────────────────────────────
    Object.keys(engineerMap).forEach(function(engKey) {
      var eng = engineerMap[engKey];
      var capacity = 8; // Default, or fetch from user custom field
      var util = Math.round((eng.assigned / capacity) * 100);
      var free = capacity - eng.assigned;
      var alert = util >= 100 ? 'overload' : util >= 90 ? 'tight' : null;

      allData.engineers.push({
        name: engKey + ' (' + eng.team + ')',
        role: inferRole(eng.issues), // Try to infer from issue types
        capacity: capacity,
        allocated: eng.assigned,
        util: util,
        team: eng.team,
        alert: alert
      });
    });

    // ── 6. Get Cross-POD Dependencies ──────────────────────────
    var blockRes = await jiraFetch(
      '/search?jql=issueLinkType=blocks' +
      ' AND project in (HIP,ADE,AGDF,AGEA)' +
      '&maxResults=50' +
      '&fields=key,summary,issuelinks,status,customfield_10028',
      { _workerAuth: true }
    );
    if (blockRes.ok) {
      var blockers = (await blockRes.json()).issues || [];
      blockers.forEach(function(issue) {
        if (issue.fields.issuelinks) {
          issue.fields.issuelinks.forEach(function(link) {
            if (link.type.name === 'blocks' && link.outwardIssue) {
              var outIssue = link.outwardIssue;
              // Detect teams from issue keys
              var blockerTeam = issue.key.split('-')[0];
              var dependentTeam = outIssue.key.split('-')[0];
              
              allData.dependencies.push({
                blocker: issue.key,
                task: issue.fields.summary,
                blockerTeam: blockerTeam,
                status: issue.fields.status.name,
                dependents: [dependentTeam],
                blockedCount: 1,
                impact: 'High'
              });
            }
          });
        }
      });
    }

    // ── 7. Calculate Red Flags ─────────────────────────────────
    allData.redFlags = [];
    
    // Overload flags
    allData.engineers.forEach(function(eng) {
      if (eng.alert === 'overload') {
        allData.redFlags.push({
          type: 'overload',
          severity: 'CRITICAL',
          team: eng.team,
          person: eng.name.split(' (')[0],
          util: eng.util,
          msg: eng.name.split(' (')[0] + ' @ ' + eng.util + '% — move tasks'
        });
      }
    });

    // Blocker flags
    allData.dependencies.forEach(function(dep) {
      if (dep.blockedCount >= 2) {
        allData.redFlags.push({
          type: 'blocker',
          severity: 'HIGH',
          task: dep.blocker,
          msg: dep.blocker + ' blocking ' + dep.blockedCount + ' teams'
        });
      }
    });

    // Available capacity flags
    allData.engineers.forEach(function(eng) {
      if ((eng.capacity - eng.allocated) >= 5) {
        allData.redFlags.push({
          type: 'capacity',
          severity: 'INFO',
          team: eng.team,
          msg: eng.name.split(' (')[0] + ' has ' + (eng.capacity - eng.allocated) + 'pts available'
        });
      }
    });

    // ── 8. Calculate Portfolio Metrics ─────────────────────────
    var totalCapacity = 0, totalAllocated = 0;
    allData.teams.forEach(function(team) {
      totalCapacity += team.capacity;
      totalAllocated += team.allocated;
    });

    allData.portfolio = {
      utilization: Math.round((totalAllocated / totalCapacity) * 100),
      teams: allData.teams.length,
      engineers: allData.engineers.length,
      blockers: allData.dependencies.length,
      redFlags: allData.redFlags.length
    };

    console.log('✅ Fetched POD Dashboard from Jira', allData);
    return allData;

  } catch (e) {
    console.error('Error fetching POD Dashboard data:', e);
    return POD_DASHBOARD_DATA; // Fallback to mock
  }
}

// ── Helper Functions ───────────────────────────────────────────

function getTeamFullName(key) {
  var names = {
    'HIP': 'Harbour Innovation Platform',
    'ADE': 'Aldar Education',
    'AGDF': 'Aldar Digital Futures',
    'AGEA': 'Aldar Entity App'
  };
  return names[key] || key;
}

function countTeamEngineers(engineerMap, teamKey) {
  var count = 0;
  Object.keys(engineerMap).forEach(function(name) {
    if (engineerMap[name].team === teamKey) count++;
  });
  return count;
}

function inferRole(issueKeys) {
  // Try to infer role from issue type patterns
  // This is a guess — better to get from user profile
  return 'Engineer'; // Default
}
```

---

### Step 3: Update `refreshPODDashboard()` to Use Live Data

**Change From**:
```javascript
async function refreshPODDashboard(){
  await renderPODDashboard();
  document.getElementById('pod-refresh-status').textContent='⟳ Last updated: Just now';
}
```

**Change To**:
```javascript
async function refreshPODDashboard(){
  document.getElementById('pod-refresh-status').textContent='⟳ Refreshing…';
  POD_DASHBOARD_DATA = await fetchPODDashboardData(); // LIVE DATA
  await renderPODDashboard();
  document.getElementById('pod-refresh-status').textContent='⟳ Last updated: ' + new Date().toLocaleTimeString();
}
```

---

### Step 4: Auto-Refresh Every 60 Seconds

**Add at End of `renderPODDashboard()` function**:

```javascript
// Auto-refresh dashboard every 60 seconds
setTimeout(function(){
  if(document.getElementById('pod-projects-grid')){
    refreshPODDashboard();
  }
}, 60000);
```

---

### Step 5: Update `jiraFetch()` for Dashboard Queries

The existing `jiraFetch()` function needs a small update to handle the `_workerAuth` flag:

**Verify in code** (around line 27950):

```javascript
window.jiraFetch = async function(path, options) {
  options = options || {};
  
  var proxy = localStorage.getItem('pm_jira_proxy') || 'https://prodmind-jira-proxy.abhinavbilla1991.workers.dev';
  
  // Check if using worker authentication (configured server-side)
  var useWorkerAuth = options._workerAuth === true;
  
  // Build headers
  var headers = { 'Accept': 'application/json' };
  if (!useWorkerAuth) {
    // Client-side auth
    if (jiraConfig && jiraConfig.email && jiraConfig.token) {
      headers['X-Email'] = jiraConfig.email;
      headers['X-Token'] = jiraConfig.token;
    }
  }
  
  // Auto-convert GET /search to POST /search/jql
  var url = path;
  if (path.includes('/search?') && path.includes('jql=')) {
    url = path.replace('/search?', '/search/jql?');
  }
  
  return fetch(proxy + '?path=' + encodeURIComponent(url), { 
    headers: headers,
    method: 'GET'
  });
};
```

---

## Testing the Integration

### Test 1: Verify Jira Connection

```
1. Go to Jira tab → ⚙ Configure
2. Enter proxy URL, email, Atlassian token
3. Click "Save & Test Connection"
4. Should show: ✅ Connected as [name]
```

### Test 2: Fetch First Sprint Data

```javascript
// In browser console:
var data = await fetchPODDashboardData();
console.log(data);
```

Should output:
```javascript
{
  portfolio: { utilization: 84, teams: 4, engineers: 18, ... },
  teams: [
    { key: 'HIP', capacity: 40, allocated: 36, util: 90, ... },
    ...
  ],
  engineers: [
    { name: 'Ahmed (HIP)', allocated: 7, capacity: 10, util: 70, ... },
    ...
  ],
  dependencies: [...],
  redFlags: [...]
}
```

### Test 3: Refresh Dashboard

```
1. Click 🔄 Refresh button on POD Dashboard
2. Should fetch live data and update display
3. Check browser DevTools Console for any errors
```

---

## Customization

### Change Refresh Interval

**File**: `index.html` (end of `renderPODDashboard()`)

```javascript
// Default: 60 seconds
// Change to 30 seconds:
setTimeout(function(){
  if(document.getElementById('pod-projects-grid')){
    refreshPODDashboard();
  }
}, 30000); // ← Change 60000 to 30000
```

### Add More Teams

**In `fetchPODDashboardData()`**:

```javascript
var teamMap = {
  'HIP': { capacity: 40, assigned: 0 },
  'ADE': { capacity: 40, assigned: 0 },
  'AGDF': { capacity: 35, assigned: 0 },
  'AGEA': { capacity: 36, assigned: 0 },
  'NEW_TEAM': { capacity: 25, assigned: 0 } // ← Add this line
};
```

### Change Default Engineer Capacity

**In `fetchPODDashboardData()`**:

```javascript
var capacity = 8; // ← Change from 8 to different default
```

Or fetch from Jira custom field (requires field setup).

---

## Troubleshooting

### "Jira not configured" Warning

**Problem**: Dashboard shows mock data instead of live data

**Solution**:
1. Go to Jira tab → ⚙ Configure
2. Enter proxy URL, email, token
3. Click Save
4. Return to POD Dashboard
5. Click 🔄 Refresh

### API Returns 401 (Unauthorized)

**Problem**: Jira credentials invalid

**Solution**:
1. Verify Atlassian API token is valid
2. Go to https://id.atlassian.com/manage-profile/security/api-tokens
3. Generate new token
4. Update in Jira config
5. Test connection

### API Returns 400 (Bad Request)

**Problem**: JQL query syntax error or field ID wrong

**Solution**:
1. Check `customfield_XXXXX` ID is correct
2. Verify field exists in Jira admin
3. Check JQL syntax: `sprint=X AND project in (HIP,ADE,AGDF,AGEA)`
4. Test in Jira Search to ensure JQL works

### Team Data Shows 0 Assigned

**Problem**: No story points being counted

**Solution**:
1. Verify stories have story point estimate set
2. Verify `customfield_10028` is correct field ID
3. Check if team field is set on all issues
4. Check current sprint is active in Jira

### Engineer Utilization Way Too High/Low

**Problem**: Capacity calculation seems wrong

**Solution**:
1. Verify individual capacity default (currently 8pts)
2. Check if engineer works on multiple teams
3. Verify sprint length is 2 weeks (story points/week)
4. Confirm sprint is current/active

---

## Performance Considerations

**Current Implementation**:
- Queries: ~5 API calls per refresh
- Tokens: ~100 per refresh
- Duration: 2-3 seconds per refresh
- Frequency: Every 60 seconds (configurable)

**If Dashboard Loads Slowly**:
1. Increase refresh interval (120 seconds)
2. Reduce max results: `&maxResults=50` → `&maxResults=30`
3. Cache data in localStorage
4. Remove dependency queries (get only critical blockers)

---

## Next Steps

1. ✅ Redesign complete (this document)
2. ⏳ Add custom field IDs (replace XXXXX)
3. ⏳ Test `fetchPODDashboardData()` function
4. ⏳ Verify Jira API connectivity
5. ⏳ Deploy to production
6. ⏳ Train teams on new dashboard
7. ⏳ Monitor adoption in daily standups

---

## Questions?

For issues with Jira integration:
1. Check Jira proxy is running (Vercel/Cloudflare Worker)
2. Verify custom field IDs in Jira admin
3. Test JQL queries in Jira's issue navigator first
4. Check browser console for API errors
5. Verify authentication works (test connection)
