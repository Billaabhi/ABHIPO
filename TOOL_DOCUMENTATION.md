# 🧠 ABHIPO (ProdMind) — AI Product Brain

**Version**: 2.0 Elite  
**Last Updated**: 2026-06-04  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Main Tabs](#main-tabs)
4. [Jira Intelligence Hub](#jira-intelligence-hub)
5. [AI Capabilities](#ai-capabilities)
6. [Data Management](#data-management)
7. [Security & Credentials](#security--credentials)
8. [Keyboard Shortcuts](#keyboard-shortcuts)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

ABHIPO (also called ProdMind) is an **AI-powered product management brain** — a single-page application that combines:

- **Live Jira Integration** with Cloudflare Worker proxy authentication
- **AI-Powered Analysis** using Claude AI for product insights
- **Multiple Specialized Brains** for different aspects of product management
- **Decision Logging** and strategic planning tools
- **Team Collaboration** features

### Key Philosophy

> Use LIVE data from Jira, never hallucinated data. Every feature respects real project state and prevents AI from generating fake issues.

---

## Core Features

### 1. **Dual Authentication System**

#### Client-Side Authentication (Legacy)
- Email + API Token stored in browser localStorage
- `pm_jira_config` key stores: `{ domain, email, token }`
- Direct calls to Jira Cloud REST API

#### Worker-Side Authentication (Current - Recommended)
- Cloudflare Worker proxy stores credentials as secrets
- Client only sends `?path=/rest/api/3/search` parameter
- Worker injects `JIRA_EMAIL` + `JIRA_TOKEN` from environment
- **Benefit**: No credentials ever exposed in browser
- **Setup**: Save Worker URL in Jira Hub Configure panel

### 2. **Smart Project Selection**

All features read from the Jira Hub project selector:
```javascript
var proj = document.getElementById('jira-hub-proj').value || 'HIP';
```

**Supported Projects**: 70+ Aldar projects including:
- **Harbour Platform**: HEA, HIP, HRB, HUP, LAC, LALI, LAP, LAV
- **GDF / Digital Futures**: AGAA, AGDF, AGH, AGHA, AGHP, etc.
- **Aldar Education**: ADB, ADE, ADP, AEA, AEB, AEC, etc.
- **Digital Products**: AGDA, ALDAR, ANM, BRP, CRL, DAM, etc.
- **Platform & Ops**: AGA, AGAS, AGE, AGEA, AGEUS, etc.
- **Other**: AAC, AAI, ADS, AH, AT, BOT, CHS, CIAM, etc.

### 3. **Real-Time Jira Data Fetching**

#### Deprecated → Modern API Migration
- **Old**: `GET /rest/api/3/search?jql=...` (HTTP 410)
- **New**: `POST /rest/api/3/search/jql` with JSON body
- **Auto-Conversion**: `jiraFetch()` automatically converts deprecated GET queries

#### Example JQL Queries
```javascript
// Active Sprint Items
project = "HIP" AND statusCategory = "In Progress" ORDER BY priority DESC

// Backlog (Ready for Development)
project = "HIP" AND statusCategory = "To Do" ORDER BY priority DESC

// Bugs
project = "HIP" AND issuetype = Bug AND statusCategory != Done

// High Priority
project = "HIP" AND priority in (Highest,High) AND statusCategory != Done

// Completed This Month
project = "HIP" AND statusCategory = Done AND updated >= -30d
```

### 4. **AI Hallucination Prevention**

**Guard Mechanism**: 
```javascript
if (!liveData) {
  if (inp) inp.value = '';
  return; // Stop if no real data
}
```

**Strict Instruction Prefix**:
```
IMPORTANT: Use ONLY the live Jira data appended below. 
Do NOT generate, invent, or assume any ticket details. 
Every issue key, status, assignee and summary must come 
from the data section marked === LIVE JIRA DATA ===.
```

---

## Main Tabs

### 🏠 **Home**
- Dashboard overview
- Quick stats and summaries
- Recent activity feed
- Navigation hub to other features

### 💬 **Chat (Brain Mode)**
- Free-form conversation with Claude AI
- Context-aware responses based on loaded data
- Can reference loaded Jira issues or templates
- **Modes**:
  - 💬 **General**: All-purpose assistant
  - 💻 **Code**: Senior engineer mode
  - ✍️ **Writing**: Expert writer mode
  - 📊 **Data**: Data analyst mode

**Quick Access**: Type `@` to load Jira context, `!` for templates

### 📋 **Backlog**
- Prioritize and manage product backlog
- RICE scoring for items
- Backlog refinement checklist
- Definition of Ready (DoR) validation

**Features**:
- Drag-to-reorder items
- Batch update priority
- Link to Jira issues
- AI refinement suggestions

### 🗺️ **Roadmap**
- Epic and initiative planning
- Quarter/milestone view
- Timeline visualization
- Stakeholder communication

**Integration**:
- Pulls Epics/Initiatives from Jira
- Groups by status
- Shows dependencies

### 📊 **Metrics**
- Real-time product health dashboard
- Velocity tracking
- Burndown charts
- Cycle time analysis
- Team capacity planning

**Live Calculations**:
- Sprint velocity (last 4 sprints)
- Bug rate (bugs/total issues)
- Throughput (completed/sprint)
- Lead time (To Do → Done)

### 📚 **Docs**
- Living product documentation
- Feature specs
- Design decisions
- Architecture notes
- Searchable knowledge base

**Markdown Support**: Full GitHub-flavored markdown

### 📝 **Templates**
- Pre-built prompts for common tasks
- Categorized by use case
- Copy and customize
- Share with team

**Categories**:
- Product Strategy
- User Research
- Feature Analysis
- Team Collaboration
- Release Management

### 🔌 **Prompts**
- Custom AI prompts library
- Save frequently used prompts
- Team prompt sharing
- Version control

### 🎯 **Commands**
- Quick action library
- Slash command reference
- Automation recipes
- Integration guides

### 🧠 **Decision Log**
- Record product decisions with rationale
- Track decisions by epic/initiative
- Archive and search
- Generate decision history report

**Fields**:
- Date
- Epic/Initiative
- Decision
- Rationale
- Stakeholders
- Status (Active/Archived)

### 👥 **Stakeholders**
- Manage stakeholder lists
- Communication matrix
- RACI definitions
- Engagement tracking

### 🏃 **Sprint Health**
- Real-time sprint status
- Team capacity vs. committed
- Velocity trend
- Risk assessment

**Metrics**:
- Burndown progress
- Story completion %
- Bug rate
- Days remaining
- Velocity confidence

### 📈 **Strategy**
- Long-term product vision
- OKR tracking
- Strategic bets
- Competitive analysis

### 🧪 **Experiments**
- A/B test registry
- Hypothesis tracking
- Results management
- Learning capture

### 👤 **Persona**
- User persona library
- Journey mapping
- Pain point analysis
- Behavior patterns

### 📅 **Week Planner**
- **NEW**: Works with Jira project selection
- Visual 5-day weekly breakdown
- Auto-distribute sprint items across week
- Color-coded by day
- AI refinement for weekly planning

**How It Works**:
1. Open Jira Intelligence Hub
2. Select a project (HIP, AGDF, etc.)
3. Click "My Week Plan" card
4. Automatically populates week-planner tab
5. Shows visual weekly distribution
6. Can refine with AI for detailed planning

### 🎲 **Monte Carlo**
- Delivery date forecasting
- Confidence intervals
- Risk analysis
- Historical velocity extrapolation

### 🔗 **Jira (Jira Intelligence Hub)**
- Central Jira integration hub
- Project selection
- Configuration management
- Quick action cards for common tasks

---

## Jira Intelligence Hub

### 🔑 Configuration

**Step 1: Setup Cloudflare Worker**
1. Deploy `prodmind-jira-proxy` to Cloudflare Worker
2. Set secrets: `JIRA_EMAIL` and `JIRA_TOKEN`
3. Get Worker URL: `https://prodmind-jira-proxy.abhinavbilla1991.workers.dev`

**Step 2: Configure in ABHIPO**
1. Open Jira tab → Click ⚙️ Configure
2. Paste Worker URL in "Cloudflare Worker URL" field
3. Click "Save & Test Connection"
4. Status badge turns green when connected

**Step 3: Select Project**
1. Choose project from dropdown (70+ options)
2. Selection persists in localStorage (`jd_proj`)

### 📊 Hub Action Cards

The Jira Hub provides quick-access cards organized in 5 categories:

#### 🏃 **Sprint & Delivery** (Green: #00C896)

| Card | Action | Uses |
|------|--------|------|
| **Sprint Health Score** | Analyzes sprint progress, velocity, bug rate, team capacity | Mid-sprint check-in |
| **Daily Standup** | Formats in-progress items for team sync | Daily team meetings |
| **Delivery Forecast** | Monte Carlo simulation of delivery date | Release planning |
| **My Week Plan** | *NEW* Visual 5-day breakdown of sprint items | Weekly prioritization |

#### 📋 **Backlog Management** (Purple: #6C47FF)

| Card | Action | Uses |
|------|--------|------|
| **RICE Score Backlog** | Rank items using Reach/Impact/Confidence/Effort | Prioritization |
| **Backlog Refinement** | Check Definition of Ready on all backlog items | Pre-sprint planning |
| **Build Roadmap** | Extract epics/initiatives into quarterly plan | Roadmap updates |
| **North Star + OKRs** | Derive OKRs from backlog themes | Strategic alignment |

#### 🐛 **Quality & Release** (Orange: #FF6B35)

| Card | Action | Uses |
|------|--------|------|
| **Bug Triage** | Severity, root cause analysis, fix priority | QA handoff |
| **Release Risk** | Go/No-Go assessment from live Jira state | Pre-release gate |
| **Release Notes Draft** | Auto-draft from completed items | Release documentation |
| **Product Health** | Throughput, bug rate, flow health metrics | Health monitoring |

#### 📄 **Ticket Analysis** (Blue: #0052CC)

Enter a ticket key (e.g., `HIP-2448`), then select action:

| Action | Output |
|--------|--------|
| **Write Full BRD** | 16-section Business Requirements Document |
| **Write AC** | Full Gherkin acceptance criteria |
| **Write Test Cases** | 10+ UAT test cases with edge cases |
| **DoR Check** | Is ticket sprint-ready? Gaps & recommendations |
| **PO Review** | Value assessment, missing pieces, suggestions |
| **Tech Review** | Complexity, risks, SP estimate validation |

#### 🤝 **Stakeholders & Reporting** (Pink: #E91E8C)

| Card | Action | Uses |
|------|--------|------|
| **Executive Update** | 1-pager for CDO/leadership | Executive updates |
| **MOM Action Items** | Action table from open high-priority items | Meeting outcomes |
| **Strategic Analysis** | Themes, product bets, OKR alignment | Board updates |
| **Decision Log** | Decisions from epics/initiatives | Decision history |

### 💻 API Integration

#### `jiraFetch(path, opts)`
Main function for all Jira API calls. Handles:
- Worker-side authentication bypass
- Automatic GET→POST conversion for deprecated endpoints
- Error handling with HTTP status codes
- Caching for GET requests

```javascript
// Fetch active items from HIP project
var res = await jiraFetch('/rest/api/3/search/jql', {
  method: 'POST',
  body: JSON.stringify({
    jql: 'project = "HIP" AND statusCategory = "In Progress"',
    maxResults: 40,
    fields: ['summary', 'status', 'issuetype', 'priority', 'assignee']
  })
});
var data = await res.json();
```

#### `jiraHubAction(action)`
Executes Hub card actions. Automatically:
1. Reads selected project from `jira-hub-proj`
2. Fetches live Jira data via POST /search/jql
3. Appends data to AI prompt
4. Switches to appropriate tab
5. Sends to AI for analysis

#### `updateJiraConnBadge(connected, name)`
Updates connection status badge with:
- Green dot (connected) or grey dot (disconnected)
- Connection status text with user/service name
- Smooth color transitions

---

## AI Capabilities

### 🧠 Brain System

Each brain is specialized for a specific role:

#### **PO Brain** 👔
- Product strategy
- Feature prioritization
- Release decisions
- Stakeholder management
- Market analysis

#### **BA Brain** 🔎
- Requirements analysis
- Acceptance criteria
- Use case mapping
- User journey design
- Data flows

#### **QA Brain** 🧪
- Test case generation
- Risk assessment
- Edge case identification
- Quality standards
- Release readiness

#### **CTO Brain** 🧑‍💻
- Technical complexity
- Architecture review
- Risk identification
- Sprint point estimation
- Feasibility assessment

### 📚 Prompt Templates

**Input Format**:
```
[BRACKET_TEXT] = Placeholder for your actual data
Provide clear, specific information for best results
```

**Example Workflow**:
1. Select template from Templates tab
2. Fill in bracketed placeholders
3. Click Use in Chat
4. AI generates response
5. Refine if needed

### 🔄 Context Loading

**@Jira Context** (type `@`)
- Load current issue into context
- Auto-populates issue details
- Available in chat and templates

**!Template** (type `!`)
- Browse and insert templates
- Customize before sending
- Save custom versions

### 🎯 Output Formats

- **Markdown**: Full styling support (headers, tables, lists)
- **Copy-friendly**: Single-click copy to clipboard
- **Export**: Save as .docx, .pdf, or markdown
- **Share**: Generate shareable links

---

## Data Management

### 💾 Local Storage

| Key | Contents | Scope |
|-----|----------|-------|
| `pm_jira_proxy` | Cloudflare Worker URL | Global |
| `pm_jira_config` | `{ domain, configured, name }` | Global |
| `jd_proj` | Selected project key (HIP, AGDF, etc.) | Global |
| `chat_history` | Conversation messages | Global |
| `pos_theme` | light/dark theme preference | Global |
| `prodmind_brd_v2` | BRD builder results (with timestamp) | Local |
| `week_planner_data` | Week plan history | Local |

### 🗑️ Data Cleanup

**Manual Cleanup** (Dev Console):
```javascript
// Clear Jira config
localStorage.removeItem('pm_jira_config');
localStorage.removeItem('pm_jira_proxy');

// Clear project selection
localStorage.removeItem('jd_proj');

// Clear all data
localStorage.clear();
```

**Automatic Clearing**: 
- Happens on logout (if implemented)
- Weekly auto-cleanup of old conversations (optional)

### 📥 Import/Export

**Export Formats**:
- Markdown files
- Word documents (.docx)
- PDF (with formatting)
- JSON (raw data)

**Import**:
- Paste text content
- Upload markdown files
- Sync from cloud (future)

---

## Security & Credentials

### 🔒 Credential Storage Strategy

#### ❌ DO NOT DO
```javascript
// ❌ NEVER hardcode credentials in client
const JIRA_EMAIL = "user@aldar.com";
const JIRA_TOKEN = "fake_token_abc123";

// ❌ NEVER store in localStorage unencrypted
localStorage.setItem('jira_token', token);
```

#### ✅ DO DO
```javascript
// ✅ Store only Worker URL in browser
localStorage.setItem('pm_jira_proxy', 'https://prodmind-jira-proxy.(...).workers.dev');

// ✅ Store worker-side auth flag
jiraConfig = { domain: 'ebdae.atlassian.net', configured: true };

// ✅ Worker stores actual credentials as secrets
JIRA_EMAIL = env.JIRA_EMAIL;  // "user@aldar.com"
JIRA_TOKEN = env.JIRA_TOKEN;  // "atl_***actual_token***"
```

### 🔐 Worker Authentication Flow

```
1. Browser sends:   POST ?path=/rest/api/3/search/jql
2. Worker receives: Path parameter only (no auth)
3. Worker adds:     Authorization: Basic {base64(JIRA_EMAIL:JIRA_TOKEN)}
4. Worker calls:    POST https://ebdae.atlassian.net/rest/api/3/search/jql
5. Browser gets:    Response (never sees credentials)
```

### 🛡️ CORS & Security

- Cloudflare Worker handles CORS (browser can't make direct Jira calls)
- No sensitive headers exposed
- Requests logged on worker side only
- SSL/TLS encryption for all traffic

### ⚠️ What NOT to Do

1. ❌ Don't paste API token in UI
2. ❌ Don't save credentials in browser code
3. ❌ Don't commit secrets to GitHub
4. ❌ Don't share Worker URLs publicly
5. ❌ Don't use expired tokens

---

## Keyboard Shortcuts

### Global Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Cycle through tabs |
| `Shift+Tab` | Cycle tabs (reverse) |
| `Ctrl+K` | Command palette (future) |
| `Ctrl+/` | Keyboard shortcuts menu |
| `Ctrl+L` | Clear chat |

### Chat

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line |
| `Ctrl+Up` | Previous message |
| `Ctrl+Down` | Next message |
| `@` | Load Jira context |
| `!` | Insert template |

### Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+E` | Export |
| `Ctrl+S` | Save (auto-saves) |

---

## Best Practices

### 1. **Always Use Live Data**

✅ **Good**:
```
"Based on the active sprint items from HIP project:
[LIVE DATA APPENDED HERE]
What should we prioritize this week?"
```

❌ **Bad**:
```
"What are the top issues in HIP project?"
// No live data — AI might hallucinate
```

### 2. **Project Selection First**

Every analysis should start with:
1. Open Jira Intelligence Hub
2. Select your project from dropdown
3. Then click any action card
4. Data fetches for THAT project only

### 3. **Use Appropriate Brains**

| Question | Brain | Why |
|----------|-------|-----|
| "Should we ship this?" | PO | Stakeholder perspective |
| "Are requirements clear?" | BA | Clarity & completeness |
| "Will testing work?" | QA | Edge cases & coverage |
| "Can we build it?" | CTO | Technical feasibility |

### 4. **Iterate with AI**

1. Get first response from AI
2. Read and identify gaps
3. Ask follow-up questions
4. Refine and iterate
5. Export final version

### 5. **Document Decisions**

Always log decisions in Decision Log:
- What was decided
- Why (rationale)
- Who decided
- When
- Status (active/archived)

### 6. **Weekly Rhythms**

**Monday**:
- Click "My Week Plan" → auto-populate week
- Review sprint items by day
- Share with team

**Wednesday**:
- Check "Sprint Health Score" mid-sprint
- Identify blockers from progress
- Adjust if needed

**Friday**:
- Run "Delivery Forecast"
- Update "Release Risk" assessment
- Plan next sprint

### 7. **Handle Large Projects**

For projects with 100+ issues:
- Use specific JQL (add filters)
- Fetch issues in batches
- Focus on highest priority items
- Don't load everything at once

---

## Troubleshooting

### ❌ "Jira proxy not set"

**Cause**: Worker URL not saved  
**Fix**:
1. Jira tab → ⚙️ Configure
2. Paste Worker URL
3. Click "Save & Test Connection"
4. Wait for green status

### ❌ "HTTP 401: Unauthorized"

**Cause**: Invalid Worker credentials  
**Fix**:
1. Check Worker has correct env vars:
   - `JIRA_EMAIL` = your Jira email
   - `JIRA_TOKEN` = valid API token
2. Regenerate API token in Jira Cloud
3. Update Worker secrets
4. Test connection again

### ❌ "HTTP 410: Gone"

**Cause**: Using deprecated `GET /search?jql=...`  
**Fix**: 
- Should auto-convert via `jiraFetch()`
- If not working: clear cache and retry
- Check `jiraFetch()` is being called (not direct fetch)

### ❌ "No issues found"

**Cause**: JQL query returned 0 results  
**Possible reasons**:
- Wrong project key
- No items match the filter (e.g., all Done)
- Items exist but don't match JQL

**Fix**:
- Try different project
- Use broader JQL (remove filters)
- Check items in Jira directly
- Verify project permissions

### ❌ "Badge shows 'Not connected' but config is saved"

**Cause**: Multiple page-jira divs (now fixed) or init timing  
**Fix**:
1. Refresh page
2. Configure again
3. Check browser console for errors
4. Clear localStorage and reconfigure

### ❌ "Week Plan tab is empty"

**Cause**: No sprint items or project not selected  
**Fix**:
1. Verify project selected in Jira Hub
2. Verify project has active sprint items
3. Click "My Week Plan" card again
4. Check console for errors

### ❌ "Chat not responding"

**Cause**: API key not set or network issue  
**Fix**:
1. Check Settings → API Key
2. Verify internet connection
3. Check if Claude API is accessible
4. Clear cache and retry

### ✅ All Working? Great!

**Verify**:
- [ ] Jira proxy configured (green badge)
- [ ] Project selected
- [ ] Can fetch issues (click any card)
- [ ] Chat responds
- [ ] Week planner populates

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ABHIPO (Browser)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Main UI Tabs (Home, Chat, Backlog, Roadmap, etc.)      │   │
│  │  - Navigation bar with 16+ tabs                          │   │
│  │  - Tab-specific content panels                           │   │
│  │  - localStorage for state persistence                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ▲                                        │
│                          │                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Jira Intelligence Hub                                   │   │
│  │  - Project selector (70+ Aldar projects)                 │   │
│  │  - 5 category cards with quick actions                   │   │
│  │  - Configuration panel                                   │   │
│  │  - Status badge (connected/disconnected)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │                                    │                  │
│           ▼                                    ▼                  │
│      jiraFetch()                          Cloud AI (Claude)       │
│      (API wrapper)                         (via API)              │
│           │                                    │                  │
└───────────┼────────────────────────────────────┼──────────────────┘
            │                                    │
            ▼                                    ▼
┌────────────────────────────┐    ┌─────────────────────────────┐
│  Cloudflare Worker Proxy   │    │  Claude AI API              │
│                            │    │                             │
│  - Stores JIRA_EMAIL       │    │  - Processes prompts        │
│  - Stores JIRA_TOKEN       │    │  - Generates responses      │
│  - Adds Auth header        │    │  - 4 specialized brains     │
│  - Handles CORS            │    │  - Uses live data only      │
│  URL: prodmind-jira-proxy  │    │                             │
│  (*.workers.dev)           │    └─────────────────────────────┘
│                            │
└────────────────────────────┘
            │
            ▼
┌────────────────────────────┐
│  Jira Cloud REST API       │
│                            │
│  - /rest/api/3/search/jql  │
│  - /rest/api/3/issue/{key} │
│  - /rest/api/3/myself      │
│  - Returns live data       │
│                            │
│  (ebdae.atlassian.net)     │
└────────────────────────────┘
```

---

## File Structure

```
ABHIPO/
├── index.html                    # Single-page application (30,000+ lines)
│   ├── HTML (layout)
│   ├── CSS (styling, themes)
│   ├── JavaScript (logic, API calls)
│   └── Components (tabs, cards, modals)
├── .claude/
│   └── launch.json              # Dev server config (npx serve)
└── TOOL_DOCUMENTATION.md        # This file
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 Elite | 2026-06-04 | **UI overhaul**: Elite styling, week-plan integration, improved cards, glassmorphic panels |
| 1.9 | 2026-06-03 | Fixed duplicate page-jira, removed dead code, improved connection badge |
| 1.8 | 2026-06-02 | POST /search/jql migration, worker-auth bypass, AI hallucination guard |
| 1.7 | 2026-06-01 | Jira Hub redesign, color-coded cards, 5 action categories |
| 1.0 | 2026-01-01 | Initial release |

---

## Support & Resources

### Documentation
- This file: TOOL_DOCUMENTATION.md
- In-app tooltips (hover over features)
- Keyboard shortcuts menu (Ctrl+/)

### Configuration Help
1. **Cloudflare Worker Setup**: Ask DevOps team
2. **Jira API Token**: Account Settings → Security → Create API Token
3. **Project Keys**: Ask Product Manager or check Jira project settings

### Common Questions

**Q: Which Jira projects can I use?**  
A: Any project you have access to. ABHIPO includes 70+ Aldar projects by default.

**Q: Can I add more projects?**  
A: Yes, edit the `<select id="jira-hub-proj">` HTML to add new options.

**Q: Does it work offline?**  
A: Partially. Chat and docs work offline, but Jira fetches require internet.

**Q: How often is data refreshed?**  
A: On-demand. Click a card to fetch fresh data. No automatic polling.

**Q: Is my data stored on servers?**  
A: No. Everything is in-browser except the Jira API calls through the worker proxy.

---

## License & Attribution

**Built by**: Billaabhi (Abhinav Reddy Billa)  
**For**: Aldar Engineering Team  
**Tech Stack**: HTML5, Vanilla JavaScript, Claude AI API  
**License**: Internal Use Only

---

**Last Updated**: 2026-06-04  
**Status**: ✅ Production Ready  
**Support**: Contact Abhinav Billa or Aldar Engineering team

