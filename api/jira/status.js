/**
 * GET /api/jira/status
 * Check Jira connection status and verify authentication
 *
 * Response:
 * {
 *   success: true,
 *   connected: boolean,
 *   user: string (display name),
 *   instance: string (Jira instance URL),
 *   timestamp: string (ISO 8601)
 * }
 */

import JiraClient from '../jira-client.js';

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
    // Try to get current user info (verifies authentication)
    const user = await jira.getCurrentUser();

    res.status(200).json({
      success: true,
      connected: true,
      user: user.displayName || user.name || 'Unknown User',
      instance: process.env.JIRA_INSTANCE,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Jira status check failed:', error.message);

    res.status(200).json({
      success: false,
      connected: false,
      error: error.message,
      instance: process.env.JIRA_INSTANCE,
      timestamp: new Date().toISOString()
    });
  }
}
