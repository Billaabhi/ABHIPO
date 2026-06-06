/**
 * POST /api/jira/webhook
 * Receives webhook events from Jira when issues/sprints are updated
 * Invalidates cache and triggers frontend updates
 *
 * Request Body (from Jira):
 * {
 *   webhookEvent: "jira:issue_updated" | "jira:issue_created" | etc,
 *   issue: { key, summary, ... },
 *   sprint: { id, name, ... },
 *   ...
 * }
 */

import Cache from '../cache.js';

// Initialize cache instance
const cache = new Cache(15 * 60);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      success: false
    });
  }

  try {
    const event = req.body;

    // Log webhook event
    console.log('[Webhook] Received event:', {
      event: event.webhookEvent,
      issue: event.issue?.key,
      sprint: event.sprint?.name
    });

    // Invalidate relevant caches based on event type
    if (event.issue?.key) {
      // Invalidate issue-specific cache
      cache.invalidate(`jira:issue:${event.issue.key}`);
      console.log(`[Webhook] Invalidated cache for issue: ${event.issue.key}`);
    }

    if (event.sprint?.id) {
      // Invalidate sprint-specific cache
      cache.invalidate(`jira:sprint:${event.sprint.id}`);
      console.log(`[Webhook] Invalidated cache for sprint: ${event.sprint.id}`);
    }

    // Always invalidate projects cache (could have changed)
    if (event.webhookEvent?.includes('project') || event.webhookEvent?.includes('sprint')) {
      cache.invalidate('jira:projects');
      console.log('[Webhook] Invalidated projects cache');
    }

    // Could broadcast to WebSocket clients here for real-time updates
    // For now, cache invalidation is enough (frontend will poll for fresh data)

    // Send acknowledgment to Jira
    res.status(200).json({
      success: true,
      received: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Webhook] Error processing event:', error.message);

    // Return 200 anyway so Jira doesn't retry (we logged the error)
    res.status(200).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
