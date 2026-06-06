/**
 * GET /api/jira/issues
 * Search for issues using JQL query
 *
 * Query Parameters:
 * - jql: Jira Query Language string (required if not using projectKey + sprintId)
 * - projectKey: Project key (e.g., 'HIP')
 * - sprintId: Sprint ID (optional)
 * - maxResults: Max results to return (default 100)
 * - fields: Comma-separated field names (optional)
 *
 * Response:
 * {
 *   success: true,
 *   issues: [...],
 *   total: number,
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
      jql,
      projectKey,
      sprintId,
      maxResults = 100,
      fields = '',
      skipCache = 'false'
    } = req.query;

    // Build JQL if not provided
    let queryJql = jql;
    if (!queryJql && projectKey) {
      queryJql = `project = "${projectKey}"`;
      if (sprintId) {
        queryJql += ` AND sprint = ${sprintId}`;
      }
    }

    if (!queryJql) {
      return res.status(400).json({
        error: 'Must provide either jql or projectKey',
        success: false
      });
    }

    // Create cache key from query
    const cacheKey = `jira:issues:${Buffer.from(queryJql).toString('base64').substring(0, 50)}`;

    // Check cache first
    if (skipCache !== 'true') {
      const cached = cache.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          success: true,
          issues: cached.value.issues || [],
          total: cached.value.total || 0,
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
    console.log('[API] Fetching issues with JQL:', queryJql);
    const response = await jira.searchIssues(queryJql, parseInt(maxResults), fieldsList);

    // Cache the result
    cache.set(cacheKey, {
      issues: response.issues || [],
      total: response.total || 0
    });

    res.status(200).json({
      success: true,
      issues: response.issues || [],
      total: response.total || 0,
      cached: false,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching issues:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
