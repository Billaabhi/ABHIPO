// Jira API Proxy - Vercel Serverless Function
// This proxies requests to Jira Cloud REST API v3
// Usage: /api/jira?path=/rest/api/3/projects

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { path } = req.query;
    const jiraToken = req.headers['x-jira-token'] || process.env.JIRA_TOKEN;
    const jiraInstance = req.headers['x-jira-instance'] || process.env.JIRA_INSTANCE;

    if (!path) {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    if (!jiraToken || !jiraInstance) {
      return res.status(401).json({
        error: 'Missing Jira configuration',
        message: 'Set JIRA_TOKEN and JIRA_INSTANCE environment variables'
      });
    }

    // Build Jira URL
    const jiraUrl = `${jiraInstance}${path}`;

    console.log(`[JIRA-PROXY] Proxying: ${jiraUrl}`);

    // Make request to Jira with auth
    const jiraRes = await fetch(jiraUrl, {
      method: req.method || 'GET',
      headers: {
        'Authorization': `Bearer ${jiraToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
      timeout: 15000, // 15 second timeout
    });

    // Log response status
    console.log(`[JIRA-PROXY] Response: ${jiraRes.status}`);

    if (!jiraRes.ok) {
      const errorText = await jiraRes.text();
      return res.status(jiraRes.status).json({
        error: `Jira API error: ${jiraRes.status}`,
        message: errorText,
        jiraUrl: jiraUrl.split('?')[0], // Don't expose full URL with params
      });
    }

    const data = await jiraRes.json();

    // Add cache headers
    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
    res.status(200).json(data);
  } catch (error) {
    console.error('[JIRA-PROXY] Error:', error.message);
    res.status(500).json({
      error: 'Proxy error',
      message: error.message,
    });
  }
}
