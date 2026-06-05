# POD Dashboard — Resource Allocation Edition

## Overview

The redesigned POD Dashboard has been transformed from **project health metrics** (velocity, quality, delivery) to **resource allocation metrics** that help answer the real question: *"Where can we move work to rebalance teams?"*

## What Changed

### Before (Project Health Focus)
- ❌ Showed velocity trends, quality %, delivery %
- ❌ "Portfolio health is 87/100"
- ❌ Generic risk metrics (scope creep, slippage)
- ❌ Not actionable for resource decisions

### Now (Resource Allocation Focus)
- ✓ Shows team utilization % with capacity breakdown
- ✓ Lists individual engineer workload and available capacity
- ✓ Identifies who is overloaded vs who has spare capacity
- ✓ Shows cross-POD dependencies and blockers
- ✓ Red flag system alerts on resource problems (CRITICAL)

---

## Dashboard Sections

### 1. Portfolio Capacity (Executive Summary)

**Cards Shown:**
- **Portfolio Utilization**: 84% (balanced across all teams)
- **Available Capacity**: 23 story points can be reallocated
- **Overload Alerts**: 2 engineers at 100%, 2 at 90%+
- **Cross-POD Blockers**: 2 tasks blocking 5 teams

**Use Case**: PO opens dashboard at standup, sees "ADE has 8pts available, HIP needs 4pts moved out" → makes reallocation decision.

---

### 2. Team Capacity Heatmap

Shows each team's utilization with status:

```
HIP   [██████████░░] 90% — 36/40 pts — 4pts available — OPTIMAL
AGDF  [██████████░] 86% — 30/35 pts — 5pts available — OPTIMAL
ADE   [███████░░░░░] 70% — 28/40 pts — 12pts available — AVAILABLE
AGEA  [██████████░░░] 92% — 33/36 pts — 3pts available — TIGHT
```

**Utilization Status Colors:**
- 🟢 Green (<70%): Available for work
- 🟣 Purple (70-85%): Optimal range
- 🟡 Yellow (85-95%): Tight, monitor closely
- 🔴 Red (>95%): Overloaded, move tasks out

**Action**: Click a team card to view in Jira and make changes

---

### 3. Engineer Capacity Table

Shows per-person workload (sorted by available capacity):

```
Engineer              | Role       | Allocated | Capacity | Free | Status
──────────────────────────────────────────────────────────────────────────
Rashid (ADE)          | Lead       | 4 pts     | 10 pts   | 6pts | ✓✓ HIGH
Zahra (ADE)           | Backend    | 5 pts     | 10 pts   | 5pts | ✓✓ HIGH
Youssef (ADE)         | Backend    | 5 pts     | 10 pts   | 5pts | ✓✓ HIGH
Ahmed (HIP)           | QA         | 7 pts     | 10 pts   | 3pts | ✓ OK
Khalid (HIP)          | Frontend   | 9 pts     | 10 pts   | 1pt  | ⚠️ TIGHT
Fatima (HIP)          | Backend    | 10 pts    | 10 pts   | 0pts | 🔴 OVERLOAD
Tarek (AGEA)          | Backend    | 9 pts     | 9 pts    | 0pts | 🔴 CRITICAL
```

**Key Insights:**
- `✓✓ HIGH`: Can take 3+ more tasks
- `✓ OK`: Can take 1-2 more tasks
- `⚠️ TIGHT`: Nearly full, watch closely
- `🔴 OVERLOAD`: At 100%, move tasks out ASAP
- `🔴 CRITICAL`: Core systems at risk, needs immediate attention

**Use Case**: Manager sees "Fatima is overloaded, Rashid has 6pts free" → requests work move from HIP to ADE.

---

### 4. Red Flags — Capacity Issues

Critical alerts that need immediate action:

#### 🔴 CRITICAL: Engineer Overload
```
[CRITICAL] Fatima (HIP Backend) at 100% — move 1-2 tasks
[CRITICAL] Tarek (AGEA Payments) at 100% — critical path at risk
```
→ **Action**: Reassign 1-2 story points immediately

#### 🟡 HIGH: Cross-POD Blocker
```
[HIGH] AGDF-234 (Schema migration) blocking 3 teams (day 6/8)
```
→ **Action**: Expedite + add 1 engineer OR defer dependent work

#### ℹ️ INFO: Available Capacity
```
[INFO] ADE has 8pts available capacity — can take overflow from HIP
```
→ **Action**: Move work from HIP to ADE

---

## Data Model (Current Implementation)

### Teams Array
```javascript
{
  key: 'HIP',              // Jira project key
  name: 'Harbour Innovation Platform',
  capacity: 40,            // Total story points per sprint
  allocated: 36,           // Currently assigned
  util: 90,                // Calculated %
  status: 'optimal',       // optimal | available | tight | overload
  lead: 'Ahmed',           // Team lead name
  engineers: 5             // Team size
}
```

### Engineers Array
```javascript
{
  name: 'Fatima (HIP)',    // Display: Name (Team)
  role: 'Backend',
  capacity: 10,            // Story points per sprint capacity
  allocated: 10,           // Currently assigned
  util: 100,               // Calculated %
  team: 'HIP',             // Team key
  skills: ['Node','Kafka'],
  alert: 'overload'        // Optional: flag critical issues
}
```

### Dependencies Array
```javascript
{
  blocker: 'AGDF-234',     // Blocking task key
  task: 'Schema migration',
  blockerTeam: 'AGDF',
  blockerLead: 'Omar',
  status: 'In Progress',
  day: 6,                  // Current day
  total: 8,                // Total expected days
  dependents: ['HIP','ADE'], // Teams waiting
  blockedCount: 3,         // Number of blocked tasks
  impact: 'High'
}
```

### Red Flags Array
```javascript
{
  type: 'overload' | 'blocker' | 'capacity' | 'vacation',
  severity: 'CRITICAL' | 'HIGH' | 'INFO',
  team: 'HIP',             // Optional
  person: 'Fatima',        // Optional
  util: 100,               // Optional
  msg: 'Backend @ 100% — move 1-2 tasks'
}
```

---

## Connecting to Live Jira Data

### Required Jira Setup

Your Jira instance needs:

1. **Custom Fields:**
   ```
   - "Story Point Estimate" (standard, on all issues)
   - "Team" (select dropdown: HIP, ADE, AGDF, AGEA)
   - "Individual Capacity" (on user profile, default 8 pts/sprint)
   - "Remaining Estimate" (standard time tracking)
   ```

2. **Team Configuration** (per POD):
   - Define team members in Jira (assign to project/component)
   - Set individual capacity custom field
   - Map engineers to correct team

### API Queries Needed (for Jira integration)

```javascript
// Get current sprint issues
GET /rest/api/3/search?jql=
  sprint=CURRENT_SPRINT_ID 
  AND project in (HIP,ADE,AGDF,AGEA)
  &fields=assignee,customfield_story_points,status,team

// Calculate per-engineer workload
GET /rest/api/3/search?jql=
  assignee={engineerId}
  AND sprint=CURRENT_SPRINT_ID
  &fields=customfield_story_points,status

// Get blocking dependencies
GET /rest/api/3/search?jql=
  issueLinkType=blocks
  AND project IN (HIP,ADE,AGDF,AGEA)
  &fields=issuelinks,status,remainingEstimate

// Get team composition
GET /rest/api/3/projects/{projectKey}/components
```

### Integration Steps (for Developer)

**File to Edit**: `C:\Users\abilla\.claude\ABHIPO\index.html` (lines 29879+)

**Current Code Structure**:
```javascript
// 1. Pull data from Jira (replace mock data)
async function fetchPODDashboardData() {
  // Get all teams → iterate
  // Get all engineers in teams → calculate utilization
  // Get current sprint assignments → sum story points
  // Get blocking issues → identify cross-POD dependencies
  // Calculate red flags
  // Return consolidated data object
}

// 2. Refresh on interval
setInterval(async () => {
  POD_DASHBOARD_DATA = await fetchPODDashboardData();
  renderPODDashboard();
}, 60000); // Every 60 seconds
```

---

## Decision Workflow

### Morning Standup (10:00 AM)

1. **PO opens POD Dashboard**
   - Sees portfolio utilization: 84% (balanced)
   - Reads summary cards instantly

2. **Check Red Flags** (top to bottom)
   ```
   🔴 CRITICAL: Fatima @ 100% in HIP
   🟡 HIGH: AGDF schema blocking 3 teams (day 6/8)
   ℹ️ INFO: ADE has 8pts available
   ```

3. **Make Decision**
   - "Fatima is overloaded + schema is bottleneck"
   - "Let's move 2pts from HIP to ADE" + "Expedite schema"
   - "Need to check if Rashid (ADE) can help with schema"

4. **Take Action**
   - Click HIP team → go to Jira
   - Reassign 2pts of work to ADE
   - Click AGDF-234 → add Rashid (ADE) as helper
   - Dashboard auto-refreshes → shows new utilization

5. **Outcome**
   - HIP: 90% → 85%
   - ADE: 70% → 80%
   - AGDF: Schema still 6/8, but now has extra help
   - Next day: 1 more engineer free to help other teams

---

## What This Enables

### For POs
- ✓ Instantly see who has capacity vs who's overloaded
- ✓ Make reallocation decisions in real-time
- ✓ Prevent crisis-mode scrambling
- ✓ Identify bottleneck teams/engineers

### For Engineering Managers
- ✓ See if their team is overloaded
- ✓ Justify hiring ("we need 2 more QAs")
- ✓ Identify cross-team skills gaps
- ✓ Plan staffing rotations

### For Executives
- ✓ Portfolio-level capacity visibility
- ✓ Understand velocity headroom
- ✓ Plan feature roadmap around capacity
- ✓ Resource constraint risks flagged early

### For Ops/Planning
- ✓ Track actual vs planned utilization
- ✓ Identify if teams are sustainable
- ✓ Data for resource forecasting
- ✓ Alert when utilization drifts

---

## Next Steps

### Phase 1: Test with Mock Data ✅ DONE
- Dashboard rendering correctly
- UI shows capacity/workload clearly
- Red flags surface critical issues

### Phase 2: Connect to Jira (TODO)
- [ ] Query Jira API for current sprint data
- [ ] Calculate utilization from story points
- [ ] Map Jira projects to POD teams
- [ ] Auto-detect engineer assignments
- [ ] Refresh every 60 seconds

### Phase 3: Production Use (TODO)
- [ ] Train teams on dashboard
- [ ] Set up alerts/notifications
- [ ] Integrate into daily standup workflow
- [ ] Measure impact on reallocation decisions

---

## Technical Notes

- **Data Fresh**: Refreshes every 60 seconds (configurable)
- **Performance**: Pre-calculates utilization on load
- **Browser**: Uses localStorage for cache between refreshes
- **Proxy**: Uses Cloudflare Worker for Jira API calls (CORS)
- **Offline**: Currently uses mock data (no offline fallback yet)

---

## Troubleshooting

### Dashboard shows "No data"
→ Check Jira proxy URL is configured (Jira tab → ⚙ Configure)

### Engineer capacity numbers don't match Jira
→ Verify custom fields exist and are mapped correctly
→ Check team composition in Jira components

### Red flags always showing old data
→ Click 🔄 Refresh button to force reload
→ Check browser console for Jira API errors

### Teams showing as 0% utilization
→ Ensure current sprint exists in Jira
→ Verify story points are set on all issues
→ Check engineer assignments exist

---

## Questions?

This dashboard was designed for **resource allocation decisions**: moving work/people between teams based on capacity constraints.

If you need help:
1. Check Jira connectivity (Jira tab → ⚙ Configure)
2. Verify team structure in Jira matches POD_DASHBOARD_DATA
3. Review Jira custom fields are set up correctly
