/**
 * GET /api/jira/projects
 * Returns all Jira projects (PODs) with caching
 *
 * Response:
 * {
 *   success: true,
 *   projects: [{key, name, ...}],
 *   cached: boolean,
 *   cacheAge: number (seconds)
 * }
 */

import JiraClient from '../jira-client.js';
import Cache from '../cache.js';

// Initialize shared cache (reused across requests in same process)
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
    const skipCache = req.query.skipCache === 'true';
    const cacheKey = 'jira:projects';

    // Check cache first (unless explicitly skipped)
    if (!skipCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          projects: cached.value,
          cached: true,
          cacheAge: cached.age,
          ttl: cached.ttl
        });
      }
    }

    // Fetch from Jira
    console.log('[API] Fetching projects from Jira...');
    const projects = await jira.getProjects();

    // Cache the result
    cache.set(cacheKey, projects);

    // Return response
    res.status(200).json({
      success: true,
      projects,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching projects:', error.message);

    // Try to return cached data even on error
    const cached = cache.get('jira:projects');
    if (cached) {
      return res.status(200).json({
        success: false,
        error: error.message,
        projects: cached.value,
        cached: true,
        cacheAge: cached.age,
        warning: 'Using cached data due to API error'
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
