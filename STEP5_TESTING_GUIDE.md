# ✅ Step 5: END-TO-END TESTING (30 minutes)

## Overview

This guide tests the entire migration - backend API, frontend integration, caching, and error handling.

**Time:** 30 minutes  
**Tools needed:** Browser, curl (optional), Jira account

---

## Test 1: Verify Backend API Endpoints (5 min)

### 1.1 Status Endpoint

Test that Jira connection works:

```bash
curl https://abhipo.vercel.app/api/jira/status
```

**Expected Response:**
```json
{
  "success": true,
  "connected": true,
  "user": "Your Name",
  "instance": "https://ebdae.atlassian.net",
  "timestamp": "2026-06-06T..."
}
```

**Issues:**
- If `connected: false` → Check JIRA_TOKEN environment variable
- If 500 error → Check Vercel logs for error details
- If 404 error → Deployment issue, try redeploying

### 1.2 Projects Endpoint

```bash
curl https://abhipo.vercel.app/api/jira/projects
```

**Expected Response:**
```json
{
  "success": true,
  "projects": [
    { "key": "HIP", "name": "Hip Project", ... },
    { "key": "ADE", "name": "Ade Project", ... },
    ...
  ],
  "cached": false,
  "timestamp": "2026-06-06T..."
}
```

**Check:**
- ✅ 5-10 projects listed
- ✅ Each has `key` and `name`
- ✅ `cached: false` (first request)

### 1.3 Issues Endpoint

```bash
curl "https://abhipo.vercel.app/api/jira/issues?jql=project%20%3D%20HIP&maxResults=5"
```

**Expected Response:**
```json
{
  "success": true,
  "issues": [
    {
      "key": "HIP-123",
      "fields": {
        "summary": "...",
        "status": { "name": "To Do" },
        ...
      }
    },
    ...
  ],
  "total": 47,
  "cached": false
}
```

**Check:**
- ✅ Issues listed for HIP project
- ✅ Each has `key` and `fields`
- ✅ `cached: false` (first request)

---

## Test 2: Verify Caching (3 min)

### 2.1 Test Cache Hit

Call the same endpoint again immediately:

```bash
# First call (should be fresh)
curl https://abhipo.vercel.app/api/jira/projects | grep cached

# Output: "cached":false

# Second call (should be cached)
curl https://abhipo.vercel.app/api/jira/projects | grep cached

# Output: "cached":true
```

### 2.2 Check Cache Stats

```bash
curl https://abhipo.vercel.app/api/jira/cache-stats
```

**Expected Response:**
```json
{
  "success": true,
  "cache": {
    "keys": 3,  // Number of cached items
    "items": [
      {
        "key": "jira:projects",
        "age": 2,
        "remaining": 898,  // Seconds until expiry
        "size": 4521
      },
      ...
    ],
    "totalSize": 12345,
    "ttl": 900  // 15 minutes in seconds
  }
}
```

**Check:**
- ✅ `keys > 0` (cache has items)
- ✅ `remaining` decreasing over time
- ✅ `totalSize` reasonable (< 1MB)

---

## Test 3: Browser Console Tests (5 min)

Open browser and go to: https://abhipo.vercel.app

### 3.1 Check Jira Connection

Open browser console (F12):

```javascript
// Check if Jira initialized
console.log('Jira initialized. Look above for "✅ Jira connected" message');

// Manually check connection
await fetch('/api/jira/status')
  .then(r => r.json())
  .then(d => console.log('Status:', d));
```

**Expected:**
```
✅ Jira connected as: [Your Name]
📍 Instance: https://ebdae.atlassian.net
```

### 3.2 Test Fetch Wrapper

```javascript
// Test fetchJira function exists
console.log(typeof fetchJira);  // Should print: "function"

// Test it works
const data = await fetchJira('/projects');
console.log('Projects:', data.projects.length, 'found');
```

### 3.3 Test Cache Working

```javascript
// First call (fresh)
const start1 = Date.now();
const data1 = await fetchJira('/projects');
const time1 = Date.now() - start1;
console.log('Fresh request:', time1, 'ms, cached:', data1.cached);

// Second call (should be cached, much faster)
const start2 = Date.now();
const data2 = await fetchJira('/projects');
const time2 = Date.now() - start2;
console.log('Cached request:', time2, 'ms, cached:', data2.cached);

// Verify time2 < time1
console.log('Cache speedup:', Math.round(time1/time2), 'x faster');
```

**Expected:**
- Fresh request: 400-800ms (slow, from Jira)
- Cached request: <50ms (fast, from cache)
- Speedup: 10-20x faster

---

## Test 4: Dashboard Features (10 min)

### 4.1 POD Dashboard

1. Click on **POD Dashboard** tab
2. Select a project from dropdown (e.g., "HIP")
3. Wait for data to load

**Verify:**
- ✅ Project data displays
- ✅ No error messages
- ✅ Metrics show reasonable numbers
- ✅ No "undefined" values

### 4.2 JIRA Intelligence Hub

1. Click on **JIRA Intelligence Hub** tab
2. Enter a JQL query in the search box:
   ```
   project = HIP AND status != Done
   ```
3. Press Enter or click search button

**Verify:**
- ✅ Results load within 2 seconds
- ✅ Issues list displays
- ✅ Each issue has key, type, status
- ✅ No errors in console

### 4.3 Issue Details

1. From the JIRA Intelligence Hub results, click any issue
2. Wait for issue detail modal to load

**Verify:**
- ✅ Issue key displays
- ✅ Summary, status, assignee show
- ✅ Description loads (if present)
- ✅ No "undefined" fields

---

## Test 5: Error Handling (5 min)

### 5.1 Simulate Jira Offline

In browser console:

```javascript
// Manually test what happens when API fails
try {
  const data = await fetchJira('/invalid-endpoint');
} catch (error) {
  console.log('Error caught:', error.message);
}
```

**Expected:**
- Error is caught and logged
- Error message is clear
- App doesn't crash

### 5.2 Check Fallback to Cache

1. In console, call an endpoint:
   ```javascript
   const data = await fetchJira('/projects');
   ```

2. Go offline (in DevTools: Network → Offline)

3. Call the same endpoint again:
   ```javascript
   const data = await fetchJira('/projects');
   ```

**Expected:**
- Request still succeeds (from cache)
- Shows cached data
- May show warning in logs

### 5.3 Error Messages

Try this in console:

```javascript
// Test error handling
try {
  // This should fail (wrong format)
  const data = await fetch('/api/jira/status?bad=params');
  const json = await data.json();
  console.log(json);
} catch (e) {
  console.log('Caught error:', e.message);
}
```

---

## Test 6: Response Format Verification (2 min)

Verify all API responses have the correct format:

```javascript
// Check /status response
const status = await fetchJira('/status');
console.assert(status.success !== undefined, 'Missing: success');
console.assert(status.connected !== undefined, 'Missing: connected');
console.assert(status.user !== undefined, 'Missing: user');

// Check /projects response
const projects = await fetchJira('/projects');
console.assert(projects.success !== undefined, 'Missing: success');
console.assert(Array.isArray(projects.projects), 'projects should be array');
console.assert(projects.cached !== undefined, 'Missing: cached');

// Check /issues response
const issues = await fetchJira('/issues?jql=project=HIP');
console.assert(issues.success !== undefined, 'Missing: success');
console.assert(Array.isArray(issues.issues), 'issues should be array');
console.assert(issues.total !== undefined, 'Missing: total');

console.log('✅ All response formats valid!');
```

**Expected:**
- All assertions pass
- Print "✅ All response formats valid!"

---

## Test 7: Performance Benchmarks (3 min)

### 7.1 Measure Response Times

```javascript
async function benchmark(endpoint, label) {
  const times = [];
  
  // Clear cache
  await fetch('/api/jira/projects?skipCache=true');
  
  // Warm up
  await fetch(endpoint);
  
  // 5 measurements
  for (let i = 0; i < 5; i++) {
    const start = Date.now();
    const res = await fetch(endpoint);
    const cached = (await res.json()).cached;
    const duration = Date.now() - start;
    times.push({ duration, cached });
    await new Promise(r => setTimeout(r, 100)); // 100ms between requests
  }
  
  const avg = times.reduce((a, b) => a + b.duration, 0) / times.length;
  console.log(`${label} - Avg: ${avg.toFixed(0)}ms, Cached: ${times.map(t => t.cached).join(', ')}`);
}

// Run benchmarks
await benchmark('/api/jira/projects', 'Projects');
await benchmark('/api/jira/status', 'Status');
```

**Expected Output:**
```
Projects - Avg: 520ms, Cached: false, true, true, true, true
Status - Avg: 480ms, Cached: false, true, true, true, true
```

**Interpretation:**
- First call: 400-800ms (fresh from Jira)
- Subsequent calls: <50ms (from cache)
- All after first are marked `cached: true`

---

## Test 8: Webhook Verification (3 min)

### 8.1 Verify Webhook Endpoint

```bash
# Test that webhook endpoint exists
curl -X POST https://abhipo.vercel.app/api/jira/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookEvent":"test","issue":{"key":"TEST-1"}}'
```

**Expected Response:**
```json
{
  "success": true,
  "received": true,
  "timestamp": "2026-06-06T..."
}
```

### 8.2 Check Vercel Logs

1. Go to Vercel Dashboard: https://vercel.com
2. Select project: `abhipo`
3. Click **Deployments** → **Logs**
4. Look for webhook entries

**Expected:**
```
[Webhook] Received event: test issue: TEST-1
[Webhook] Invalidated projects cache
```

---

## Test Checklist

Run through all these and check them off:

```
API Endpoints:
☐ /api/jira/status returns 200
☐ /api/jira/projects returns 200
☐ /api/jira/issues returns 200
☐ /api/jira/cache-stats returns 200

Caching:
☐ First call: cached: false
☐ Second call: cached: true
☐ Cached calls are 10-20x faster
☐ Cache has items in cache-stats

Frontend:
☐ Browser console shows "✅ Jira connected"
☐ fetchJira function exists and works
☐ POD Dashboard loads data
☐ JIRA Intelligence Hub search works
☐ Issue details modal works
☐ No errors in console

Error Handling:
☐ Invalid endpoints return errors
☐ Error messages are clear
☐ App doesn't crash on errors
☐ Fallback to cache works

Performance:
☐ Fresh requests: 400-800ms
☐ Cached requests: <50ms
☐ Cache hit rate: 80%+

Webhooks:
☐ Webhook URL is reachable
☐ Webhook endpoint returns 200
☐ Vercel logs show webhook events
```

---

## Troubleshooting Tests

### If Endpoints Return 404

**Problem:** API endpoints return "Not found"

**Diagnosis:**
1. Check deployment: `vercel status`
2. Check logs: `vercel logs --limit 50`
3. Verify URLs are correct:
   - `/api/jira/status` (not `/jira/status`)
   - `/api/jira/projects` (not `/jira/projects`)

**Solution:**
```bash
# Redeploy
git push origin main
# Wait 2-3 minutes for Vercel to deploy
```

### If Cache Isn't Working

**Problem:** `cached` always shows `false`

**Diagnosis:**
```javascript
// Check if cache is being populated
await fetch('/api/jira/cache-stats')
  .then(r => r.json())
  .then(d => console.log('Cache keys:', d.cache.keys));
```

**Solution:**
- Cache is per-deployment
- Each Vercel deployment has its own cache
- Wait 15 seconds between calls to see caching

### If Jira Connection Fails

**Problem:** Status endpoint returns `connected: false`

**Diagnosis:**
1. Check JIRA_TOKEN is set:
   ```bash
   # In Vercel dashboard
   Settings → Environment Variables → Look for JIRA_TOKEN
   ```

2. Check token is valid:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - If token is old (30+ days), regenerate it

3. Check JIRA_INSTANCE is correct:
   - Should be `https://ebdae.atlassian.net`
   - Not `https://ebdae.atlassian.net/` (no trailing slash)

**Solution:**
```bash
# Update environment variables in Vercel
vercel env pull  # Download current vars
# Edit .env.local
vercel env push  # Upload updated vars
# Redeploy: git push origin main
```

---

## Success Criteria

All of the following should be true:

- ✅ All API endpoints responding with correct data
- ✅ Caching working (cached: true/false status)
- ✅ Cache 10-20x faster than fresh requests
- ✅ Dashboard features all working
- ✅ No errors in browser console
- ✅ Error handling graceful (no crashes)
- ✅ Jira connection verified
- ✅ Webhook endpoint reachable

**If all pass:** Ready for Step 6 (Cleanup & Deploy)

---

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| **Status API** | ✅ | Should show Jira connected |
| **Projects API** | ✅ | Should list all PODs |
| **Issues API** | ✅ | Should search and list issues |
| **Caching** | ✅ | Should show cache hits after first call |
| **Frontend** | ✅ | All dashboard features working |
| **Performance** | ✅ | Cached requests <50ms |
| **Error Handling** | ✅ | Graceful fallback to cache |
| **Webhooks** | ✅ | Endpoint reachable, logs show events |

---

**Status:** Step 5 Ready for Testing  
**Next:** Step 6 - Cleanup & Deployment  
**Time Used:** 20-25 minutes (leave 5-10 min buffer)  
