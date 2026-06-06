/**
 * GET /api/jira/sprints/:projectKey
 * Get active sprints for a project
 *
 * Query Parameters:
 * - projectKey: Project key (required, can be in URL path or query)
 * - state: Sprint state filter (default: 'active')
 * - maxResults: Max sprints to return (default 50)
 *
 * Response:
 * {
 *   success: true,
 *   sprints: [{id, name, state, ...}],
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
    const {
      projectKey,
      state = 'active',
      maxResults = 50,
      skipCache = 'false'
    } = req.query;

    if (!projectKey) {
      return res.status(400).json({
        error: 'projectKey is required',
        success: false
      });
    }

    // Create cache key
    const cacheKey = `jira:sprints:${projectKey}:${state}`;

    // Check cache first
    if (skipCache !== 'true') {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          sprints: cached.value,
          cached: true,
          cacheAge: cached.age,
          ttl: cached.ttl
        });
      }
    }

    // Fetch from Jira
    console.log('[API] Fetching sprints for project:', projectKey);
    const sprints = await jira.getSprints(projectKey);

    // Filter by state if needed
    let filtered = sprints;
    if (state && state !== 'all') {
      filtered = sprints.filter(s => s.state === state);
    }

    // Limit results
    filtered = filtered.slice(0, parseInt(maxResults));

    // Cache the result
    cache.set(cacheKey, filtered);

    res.status(200).json({
      success: true,
      sprints: filtered,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching sprints:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
