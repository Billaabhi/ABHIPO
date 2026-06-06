/**
 * GET /api/jira/issue
 * Get a specific issue by key
 *
 * Query Parameters:
 * - key: Issue key (e.g., 'HIP-123') - REQUIRED
 * - fields: Comma-separated field names (optional)
 *
 * Response:
 * {
 *   success: true,
 *   issue: { key, summary, description, ... },
 *   cached: boolean,
 *   cacheAge: number
 * }
 */

import JiraClient from '../jira-client.js';
import Cache from '../cache.js';

const cache = new Cache(15 * 60); // 15 minute TTL
const jira = new JiraClient();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      success: false
    });
  }

  try {
    const { key, fields = '', skipCache = 'false' } = req.query;

    if (!key) {
      return res.status(400).json({
        error: 'Issue key is required (e.g., HIP-123)',
        success: false
      });
    }

    // Create cache key
    const cacheKey = `jira:issue:${key}`;

    // Check cache first
    if (skipCache !== 'true') {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          issue: cached.value,
          cached: true,
          cacheAge: cached.age,
          ttl: cached.ttl
        });
      }
    }

    // Parse fields parameter
    const fieldsList = fields
      ? fields.split(',').map(f => f.trim()).filter(Boolean)
      : [];

    // Fetch from Jira
    console.log('[API] Fetching issue:', key);
    const issue = await jira.getIssue(key, fieldsList.length ? fieldsList : null);

    // Cache the result
    cache.set(cacheKey, issue);

    res.status(200).json({
      success: true,
      issue,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching issue:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
