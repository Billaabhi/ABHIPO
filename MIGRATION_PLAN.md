# 🚀 JIRA INTEGRATION MIGRATION PLAN
## Step-by-Step Implementation (4-5 hours)

**Goal:** Replace complex frontend Jira code with clean backend API  
**Deployment:** Vercel serverless + Polling + Webhooks  
**Cache TTL:** 15 minutes  
**Risk Level:** LOW (can rollback easily)

---

## 📋 STEP 1: REMOVE OLD JIRA CODE (30 minutes)

### Remove from index.html:

**Line ~28255-28291:** Delete JiraMonitor system
```javascript
❌ DELETE: JiraMonitor object (entire class)
❌ DELETE: setInterval for JiraMonitor.check()
❌ DELETE: setTimeout for initial check
```

**Line ~30388-30490:** Delete window.jiraFetch function
```javascript
❌ DELETE: window.jiraFetch = async function() { ... }
❌ LINES: 30388-30490 (complete function)
```

**Remove all Jira credential code:**
```javascript
❌ DELETE: jiraConfig variable initialization
❌ DELETE: jiraProxyUrl variable
❌ DELETE: localStorage access for pm_jira_config
❌ DELETE: localStorage access for pm_jira_proxy
```

**Remove Jira-related UI elements:**
```javascript
❌ DELETE: Jira connection status indicator HTML/CSS
❌ DELETE: Jira settings modal code
❌ DELETE: Jira credential input forms
```

### Files to Delete:
```
❌ /api/jira.js
❌ JIRA_INTEGRATION_STRATEGY.md
❌ JIRA_IMPROVEMENTS_COMPLETED.md
❌ VERIFY_IMPROVEMENTS.md
❌ JIRA_TROUBLESHOOTING.md
```

### Result:
- **400+ lines removed from index.html**
- **5 documentation files deleted**
- **Much cleaner codebase**

---

## 📝 STEP 2: CREATE BACKEND API (60 minutes)

### Create New Files:

**`/api/jira-client.js`** - Jira API wrapper
```javascript
class JiraClient {
  constructor() {
    this.instance = process.env.JIRA_INSTANCE;
    this.token = process.env.JIRA_TOKEN;
    this.baseUrl = `${this.instance}/rest/api/3`;
  }

  async request(method, path) {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      throw new Error(`Jira error: ${res.status}`);
    }

    return res.json();
  }

  async getProjects() {
    return this.request('GET', '/projects?maxResults=50');
  }

  async getSprints(projectKey) {
    const issues = await this.request('GET', 
      `/search?jql=project="${projectKey}" AND sprint in openSprints()&maxResults=50`
    );
    return issues;
  }

  async getIssues(projectKey, sprint) {
    return this.request('GET',
      `/search?jql=project="${projectKey}" AND sprint="${sprint}"&maxResults=100`
    );
  }
}

module.exports = JiraClient;
```

**`/api/cache.js`** - Simple cache with TTL
```javascript
class Cache {
  constructor(ttl = 900) { // 15 minutes default
    this.store = {};
    this.ttl = ttl;
  }

  set(key, value) {
    this.store[key] = {
      value,
      expiresAt: Date.now() + this.ttl * 1000,
      age: 0
    };
  }

  get(key) {
    const item = this.store[key];
    if (!item) return null;

    const now = Date.now();
    if (now > item.expiresAt) {
      delete this.store[key];
      return null;
    }

    item.age = Math.round((now - (item.expiresAt - this.ttl * 1000)) / 1000);
    return item;
  }

  invalidate(key) {
    delete this.store[key];
  }

  status() {
    return {
      keys: Object.keys(this.store).length,
      items: Object.entries(this.store).map(([key, item]) => ({
        key,
        age: item.age,
        ttl: this.ttl
      }))
    };
  }
}

module.exports = Cache;
```

**`/api/jira/projects.js`** - GET /api/jira/projects
```javascript
import JiraClient from '../jira-client';
import Cache from '../cache';

const jira = new JiraClient();
const cache = new Cache(900); // 15 min TTL

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache first
  const cached = cache.get('projects');
  if (cached) {
    return res.json({
      success: true,
      projects: cached.value.values,
      cached: true,
      cacheAge: cached.age
    });
  }

  try {
    const data = await jira.getProjects();
    cache.set('projects', data);

    res.json({
      success: true,
      projects: data.values,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

**`/api/jira/sprints.js`** - GET /api/jira/sprints/:key
```javascript
// Similar to projects.js, but for sprints
// Fetches active sprint for given project key
```

**`/api/jira/webhook.js`** - POST /api/jira/webhook
```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { webhookEvent, issue, sprint } = req.body;

  console.log(`[WEBHOOK] ${webhookEvent}:`, issue?.key || sprint?.name);

  // Invalidate relevant caches
  if (issue?.key) {
    cache.invalidate(`issue:${issue.key}`);
  }
  if (sprint?.id) {
    cache.invalidate(`sprint:${sprint.id}`);
  }

  // Could broadcast to WebSocket clients here
  // For now, just accept the webhook

  res.json({ received: true });
}
```

**`/api/jira/status.js`** - GET /api/jira/status
```javascript
export default async function handler(req, res) {
  try {
    const response = await fetch(`${process.env.JIRA_INSTANCE}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Bearer ${process.env.JIRA_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      return res.json({
        success: true,
        connected: true,
        user: user.displayName,
        instance: process.env.JIRA_INSTANCE
      });
    }

    res.json({
      success: false,
      connected: false,
      error: `HTTP ${response.status}`
    });
  } catch (error) {
    res.json({
      success: false,
      connected: false,
      error: error.message
    });
  }
}
```

**`.env.production`** - Environment variables
```
JIRA_INSTANCE=https://yourcompany.atlassian.net
JIRA_TOKEN=your_api_token_here
```

### Create Folder Structure:
```
/api/
├── jira-client.js
├── cache.js
├── jira/
│   ├── projects.js
│   ├── sprints.js
│   ├── issues.js
│   ├── webhook.js
│   └── status.js
└── [existing files]
```

---

## 🎯 STEP 3: UPDATE FRONTEND CODE (60 minutes)

### Replace jiraFetch with simple function:

**Old (400 lines):**
```javascript
window.jiraFetch = async function(path, opts) {
  // Retry logic
  // Caching
  // Error handling
  // 400+ lines total
}
```

**New (20 lines):**
```javascript
async function fetchJira(endpoint) {
  try {
    const res = await fetch(`/api/jira${endpoint}`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error('Jira fetch error:', error);
    throw error;
  }
}
```

### Add Jira initialization:

```javascript
// Initialize Jira connection on page load
async function initJira() {
  try {
    // Check status
    const status = await fetchJira('/status');
    if (status.connected) {
      console.log('✅ Jira connected:', status.user);
    } else {
      console.warn('⚠️ Jira not connected');
    }

    // Load projects
    const projectsRes = await fetchJira('/projects');
    const projects = projectsRes.projects;
    
    // Populate dropdown or display
    displayProjects(projects);

  } catch (error) {
    console.error('Jira init failed:', error.message);
    // Show offline message to user
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', initJira);
```

### Add polling for updates:

```javascript
// Poll for fresh data every 15 minutes
setInterval(async () => {
  try {
    const projectsRes = await fetchJira('/projects?skipCache=true');
    updateProjects(projectsRes.projects);
    console.log('✅ Projects refreshed from Jira');
  } catch (error) {
    console.warn('⚠️ Background sync failed:', error.message);
    // App continues with cached data
  }
}, 15 * 60 * 1000); // 15 minutes
```

### Remove all Jira config UI:

- Remove Jira settings modal
- Remove credential input fields
- Remove connection status indicator
- Remove all localStorage access

### Update existing features:

**POD Dashboard:**
```javascript
// OLD:
const data = await window.jiraFetch('/projects');

// NEW:
const data = await fetchJira('/projects');
```

**Repeat for all features that use Jira data**

---

## 🔌 STEP 4: SETUP JIRA WEBHOOKS (30 minutes)

### Configure Webhook in Jira:

1. Go to Jira Settings → Webhooks
2. Click "Create a webhook"
3. Enter details:
   ```
   Name: ABHIPO Dashboard Updates
   URL: https://abhipo.vercel.app/api/jira/webhook
   Events to trigger:
     ✅ issue updated
     ✅ sprint started
     ✅ sprint ended
   ```
4. Click Create

### Test Webhook:

1. Update any issue in Jira
2. Check Vercel logs for webhook event
3. Verify cache was invalidated
4. Verify frontend refreshed data

---

## ✅ STEP 5: TESTING (30 minutes)

### Test Each Endpoint:

```javascript
// Test in browser console:

// 1. Check Jira status
fetch('/api/jira/status').then(r => r.json()).then(console.log);

// Expected: { success: true, connected: true, user: "..." }

// 2. Get projects
fetch('/api/jira/projects').then(r => r.json()).then(console.log);

// Expected: { success: true, projects: [...], cached: false }

// 3. Get status again (should be cached)
fetch('/api/jira/projects').then(r => r.json()).then(d => console.log('Cached?', d.cached));

// Expected: { success: true, cached: true, cacheAge: 5 }
```

### Test Webhook:

1. Update Jira issue
2. Check Vercel logs - should show webhook received
3. Check if cache was invalidated
4. Verify fresh data loaded in dashboard

### Test Frontend Features:

```
☐ POD Dashboard loads
☐ Projects display correctly
☐ Sprints show data
☐ Issues list works
☐ Polling refreshes data (after 15 min or manual trigger)
☐ No errors in console
☐ Offline mode works (shows cached data)
```

---

## 🚀 STEP 6: CLEANUP & DEPLOYMENT (30 minutes)

### Delete Old Files:

```bash
# Remove old Jira code from index.html
# Delete /api/jira.js
# Delete old documentation:
❌ JIRA_INTEGRATION_STRATEGY.md
❌ JIRA_IMPROVEMENTS_COMPLETED.md
❌ VERIFY_IMPROVEMENTS.md
❌ JIRA_TROUBLESHOOTING.md
❌ NEW_JIRA_ARCHITECTURE.md (after implementation)
```

### Update Documentation:

Create new file: `JIRA_API_DOCS.md`
```markdown
# Jira API Endpoints

GET /api/jira/status
- Check Jira connection

GET /api/jira/projects
- Get all projects (cached 15 min)

POST /api/jira/webhook
- Receive Jira events

GET /api/jira/cache-stats
- View cache statistics
```

### Final Verification:

```bash
# Check git status
git status

# Show changes
git diff --stat

# Verify no secrets in code
grep -r "jira.*token\|jira.*password" index.html

# Build
npm run build

# Deploy
git add -A
git commit -m "Migrate Jira integration to clean backend API"
git push origin main
```

---

## 📊 BEFORE & AFTER

### Code Complexity

**Before:**
```
- 400+ lines of Jira code in frontend
- 5 different caching strategies
- Manual error recovery
- Complex monitoring system
- localStorage credential management
- Network retries in frontend
```

**After:**
```
- 20 lines of Jira code in frontend (simple fetch wrapper)
- Single backend cache
- Automatic error handling
- Simple polling + webhooks
- Credentials on backend only
- Automatic retries on backend
```

### User Experience

**Before:**
```
❌ Manual refresh needed
❌ Complex Jira setup
❌ Stale data issues
❌ Network errors crash features
```

**After:**
```
✅ Automatic polling refreshes
✅ Simple Jira setup (token only)
✅ Always fresh data
✅ Graceful offline mode
```

---

## ⏱️ TIMELINE

```
Step 1: Remove old code          30 min    1:00 PM
Step 2: Build backend API        60 min    2:00 PM
Step 3: Update frontend          60 min    3:00 PM
Step 4: Setup webhooks           30 min    3:30 PM
Step 5: Testing                  30 min    4:00 PM
Step 6: Cleanup & deploy         30 min    4:30 PM
                                 ──────
TOTAL:                          4.5 hours
```

---

## ✨ READY?

When you're ready to start, I'll:

1. **STEP 1:** Remove all old Jira code
2. **STEP 2:** Create new backend API
3. **STEP 3:** Update frontend to use new API
4. **STEP 4:** Setup webhooks for real-time updates
5. **STEP 5:** Test everything end-to-end
6. **STEP 6:** Clean up and deploy

**Ready to start the migration?** Just say "go" and I'll execute the plan! 🚀
