# 🔌 Step 4: SETUP JIRA WEBHOOKS (30 minutes)

## Overview

Webhooks enable **real-time cache invalidation**. When something changes in Jira, we immediately invalidate the cache so the dashboard always shows fresh data.

**Without webhooks:** Cache lasts 15 minutes  
**With webhooks:** Cache invalidated instantly + 15-min fallback

---

## Architecture

```
Jira Issue Updated
    ↓
Jira sends webhook POST to /api/jira/webhook
    ↓
Backend receives event
    ↓
Invalidate cache for that issue/project
    ↓
Frontend next API call gets fresh data
```

---

## Step 1: Get Your Webhook URL

The webhook endpoint is already deployed on Vercel:

```
https://abhipo.vercel.app/api/jira/webhook
```

**This URL is ready to receive Jira webhooks.**

---

## Step 2: Configure Webhook in Jira

### A. Login to Jira

1. Go to your Jira instance: `https://ebdae.atlassian.net`
2. Click **Settings** (⚙️ icon, bottom left)
3. Go to **System** → **Webhooks**

### B. Create New Webhook

1. Click **Create a webhook** button
2. Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `ABHIPO Dashboard Updates` |
| **URL** | `https://abhipo.vercel.app/api/jira/webhook` |
| **Status** | ✅ Enabled |
| **Events** | Select specific events (see below) |
| **Filter** | (leave empty for all projects) |

### C. Select Events

Check these events:

```
✅ issue created
✅ issue updated
✅ issue deleted

✅ sprint created
✅ sprint updated
✅ sprint deleted
✅ sprint started
✅ sprint closed

✅ project created
✅ project updated
✅ project deleted
```

*Optional: You can include more events, but these cover the main scenarios.*

### D. Click "Create"

Jira will immediately test the webhook by sending a test event.

---

## Step 3: Verify Webhook is Working

### Check Jira Webhook Status

1. Go back to **Settings** → **Webhooks**
2. Find **ABHIPO Dashboard Updates**
3. Click on it to see details
4. Scroll down to **Recent deliveries**
5. You should see successful (200) webhook calls

### Check Vercel Logs

1. Go to Vercel dashboard: https://vercel.com
2. Select project: `abhipo`
3. Go to **Deployments** → **Logs** (right side)
4. Look for webhook entries:

```
[Webhook] Received event: jira:issue_updated issue: HIP-123
[Webhook] Invalidated cache for issue: HIP-123
[Webhook] Invalidated projects cache
```

### Test Manually in Browser Console

```javascript
// Fetch projects (will be cached)
await fetch('/api/jira/projects').then(r => r.json()).then(d => console.log('Cached:', d.cached));

// Should return: { cached: true, ... }

// Update ANY Jira issue (in your browser's Jira tab)
// The webhook will fire and invalidate cache

// Fetch projects again (should be fresh)
await fetch('/api/jira/projects').then(r => r.json()).then(d => console.log('Cached:', d.cached));

// Should return: { cached: false, ... } (FRESH DATA!)
```

---

## Step 4: Test Real Scenario

### Test 1: Update an Issue

1. Go to any Jira issue (e.g., HIP-123)
2. Change the status (e.g., "To Do" → "In Progress")
3. Wait 2 seconds
4. Check Vercel logs:
   ```
   [Webhook] Received event: jira:issue_updated issue: HIP-123
   [Webhook] Invalidated cache for issue: HIP-123
   ```

### Test 2: Verify Fresh Data in Dashboard

1. Open ABHIPO dashboard in browser
2. Check console (F12):
   ```javascript
   // Check cache status
   await fetch('/api/jira/projects').then(r => r.json()).then(d => console.log(d));
   // Should show: cached: false (first call after webhook)
   ```

3. Make the same call again:
   ```javascript
   // Check cache status again (should be cached now)
   await fetch('/api/jira/projects').then(r => r.json()).then(d => console.log(d));
   // Should show: cached: true (2nd call within 15 min)
   ```

### Test 3: Check Cache Stats

In browser console:

```javascript
// View cache statistics
await fetch('/api/jira/cache-stats').then(r => r.json()).then(console.log);
```

Expected output:

```javascript
{
  success: true,
  cache: {
    keys: 5,           // Number of cached items
    items: [
      { key: "jira:projects", age: 2, remaining: 898, size: 4521 },
      { key: "jira:issue:HIP-123", age: 15, remaining: 885, size: 2341 },
      ...
    ],
    totalSize: 12345,  // Total bytes cached
    ttl: 900          // 15 minutes
  }
}
```

---

## Troubleshooting

### Webhook Not Firing

**Problem:** You update an issue but don't see webhook logs

**Solution:**
1. Check Jira webhook status: Settings → Webhooks → ABHIPO Dashboard Updates
2. Look at "Recent deliveries" - should show recent events
3. If empty, the webhook isn't firing:
   - Check "Events" are selected
   - Verify URL is correct: `https://abhipo.vercel.app/api/jira/webhook`
   - Try "Test" button to send test event

### 404 or 500 Errors on Webhook

**Problem:** Webhook logs show HTTP 404 or 500 errors

**Solution:**
1. Verify Vercel deployment is live:
   ```bash
   curl https://abhipo.vercel.app/api/jira/webhook
   # Should return 405 (method not allowed, which is correct for GET)
   ```

2. Check Vercel logs for errors:
   - Go to Vercel dashboard
   - Check "Deployments" → "Logs"
   - Look for error messages

3. Verify webhook URL is exactly:
   ```
   https://abhipo.vercel.app/api/jira/webhook
   ```

### Cache Not Invalidating

**Problem:** After webhook fires, cache is still being used

**Solution:**
1. Check webhook is calling the right URL
2. Verify event type matches what we're invalidating
3. Check that the issue key is in the webhook payload
4. Manually clear cache and test:
   ```javascript
   // In browser console, on any page where cache stats endpoint works
   await fetch('/api/jira/cache-stats').then(r => r.json()).then(d => {
     if (d.cache.keys > 0) {
       console.log('Cache has', d.cache.keys, 'items');
       // Webhook should have cleared these
     }
   });
   ```

---

## Advanced: Webhook Secret (Optional)

For production, you might want webhook verification. This is optional but recommended:

### In Jira:
1. Create a webhook secret (random string)
2. Store in Jira webhook config

### In Backend:
The webhook endpoint in `/api/jira/webhook.js` already has a placeholder for secret verification:

```javascript
// Future: Add HMAC verification
const secret = process.env.WEBHOOK_SECRET;
if (secret) {
  // Verify HMAC-SHA256 signature
}
```

This is **not required** for now since the endpoint only clears cache.

---

## Webhook Event Reference

### What We're Listening For

| Event | When | Action |
|-------|------|--------|
| `jira:issue_created` | New issue created | Invalidate projects cache |
| `jira:issue_updated` | Issue modified | Invalidate specific issue cache |
| `jira:issue_deleted` | Issue deleted | Invalidate projects cache |
| `jira:sprint_created` | Sprint created | Invalidate sprints cache |
| `jira:sprint_updated` | Sprint status changes | Invalidate sprints cache |
| `jira:sprint_started` | Sprint starts | Invalidate sprints + issues cache |
| `jira:sprint_closed` | Sprint ends | Invalidate sprints + issues cache |
| `jira:project_created` | Project created | Invalidate projects cache |
| `jira:project_updated` | Project modified | Invalidate projects cache |

### Webhook Payload Example

When you update issue HIP-123, Jira sends:

```json
{
  "webhookEvent": "jira:issue_updated",
  "issue": {
    "key": "HIP-123",
    "id": "10000",
    "fields": {
      "summary": "...",
      "status": { "name": "In Progress" },
      ...
    }
  },
  "timestamp": 1686571234567
}
```

Our backend receives this and:
1. Extracts `issue.key` (HIP-123)
2. Invalidates `jira:issue:HIP-123` cache
3. Invalidates `jira:projects` cache
4. Returns 200 OK

---

## Monitoring Webhooks

### In Production

Check Vercel logs daily to ensure webhooks are working:

```bash
# Show last 100 webhook events
vercel logs --limit 100 | grep Webhook
```

### Expected Pattern

```
✅ 10:05 [Webhook] Received event: jira:issue_updated issue: HIP-123
✅ 10:05 [Webhook] Invalidated cache for issue: HIP-123
✅ 10:05 [Webhook] Invalidated projects cache

✅ 10:15 [Webhook] Received event: jira:sprint_started sprint: Sprint 42
✅ 10:15 [Webhook] Invalidated sprints cache
```

### Red Flags

❌ No webhook logs for 30+ minutes  
❌ HTTP 404 or 500 errors  
❌ Same issue updated twice but only first invalidation shows  

---

## Performance Impact

### Before Webhooks (15-min cache TTL)
- First request: 400-800ms (fresh from Jira)
- Subsequent requests (0-15 min): <50ms (cached)
- After 15 min: 400-800ms again

### After Webhooks
- First request: 400-800ms
- Subsequent requests: <50ms (cached)
- **After issue update: 400-800ms (cache immediately invalidated)**
- Fallback: Still works if webhook fails (15-min cache)

**Benefit:** Users always see fresh data immediately after changes, but fallback to cache if needed

---

## FAQ

### Q: Do I need to restart anything after setting up webhooks?

**A:** No! The webhook endpoint is already deployed and listening. Just configure it in Jira.

### Q: What if Jira is down?

**A:** Webhooks won't fire. But the 15-minute cache will still serve data, so the dashboard continues working.

### Q: What if the webhook URL is unreachable?

**A:** Jira will retry 3-5 times over the next hour, then disable the webhook. You'd need to re-enable it in Jira settings.

### Q: Can I send test events?

**A:** Yes! In Jira, go to Settings → Webhooks → ABHIPO Dashboard Updates → Click it → Click "Send test request". You'll see it in Vercel logs immediately.

### Q: How many webhooks can I have?

**A:** Unlimited. You can have multiple instances pointing to different endpoints.

### Q: Do webhooks count against Jira API quota?

**A:** No! Webhooks are push events, not API calls. They don't use your Jira API quota.

---

## Checklist

```
☐ Webhook name: "ABHIPO Dashboard Updates"
☐ Webhook URL: https://abhipo.vercel.app/api/jira/webhook
☐ Status: Enabled
☐ Events selected:
  ☐ issue created/updated/deleted
  ☐ sprint created/updated/deleted/started/closed
  ☐ project created/updated/deleted
☐ Test webhook sent successfully
☐ Vercel logs show webhook events
☐ Cache invalidation working
☐ Dashboard shows fresh data after updates
```

---

## Summary

| Aspect | Status |
|--------|--------|
| **Endpoint** | ✅ Ready at `/api/jira/webhook` |
| **Cache invalidation** | ✅ Implemented |
| **Fallback** | ✅ 15-min cache if webhook fails |
| **Monitoring** | ✅ Vercel logs available |
| **Configuration** | 🔄 Manual (user does in Jira) |
| **Testing** | 🔄 Need to verify in Jira |

---

## Next Steps

After webhooks are working:

1. **Step 5:** End-to-end testing
   - Test all dashboard features
   - Verify real-time updates
   - Check error handling

2. **Step 6:** Cleanup & deployment
   - Remove old docs
   - Final verification
   - Deploy to production

---

## Commands Reference

### Test webhook URL

```bash
# This should return 405 (GET not allowed)
curl -X GET https://abhipo.vercel.app/api/jira/webhook

# This would be a valid webhook event (requires Jira to send)
curl -X POST https://abhipo.vercel.app/api/jira/webhook \
  -H "Content-Type: application/json" \
  -d '{"webhookEvent":"jira:issue_updated","issue":{"key":"HIP-123"}}'
```

### Check cache stats

```javascript
// In browser console
await fetch('/api/jira/cache-stats')
  .then(r => r.json())
  .then(d => console.table(d.cache.items));
```

### View Vercel logs

```bash
vercel logs --limit 50 | grep -i webhook
```

---

**Status:** Step 4 Ready for Configuration  
**Next:** Step 5 - Testing  
**Time Estimate:** 20 min configuration + 10 min testing  
