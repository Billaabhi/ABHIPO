/**
 * GET /api/jira/cache-stats
 * Returns cache statistics (debugging endpoint)
 *
 * Response:
 * {
 *   success: true,
 *   cache: {
 *     keys: number,
 *     items: [{key, age, remaining, size}, ...],
 *     totalSize: number (bytes),
 *     ttl: number (seconds)
 *   }
 * }
 */

import Cache from '../cache.js';

// Initialize cache instance
const cache = new Cache(15 * 60);

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      success: false
    });
  }

  try {
    const stats = cache.status();

    res.status(200).json({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error getting cache stats:', error.message);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
