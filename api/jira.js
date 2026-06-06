// api/jira.js - Production-Ready Jira API Proxy
// Features: Retry logic, caching, rate limiting, error handling

const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache TTL

// Rate limits per endpoint (requests per minute)
const RATE_LIMITS = {
  '/projects': 60,
  '/search': 40,
  '/issue': 60,
  '/myself': 60,
};

const DEFAULT_LIMIT = 30;

export default async function handler(req, res) {
  // ═════════════════════════════════════════════════════════════
  // 1. CORS Headers
  // ═════════════════════════════════════════════════════════════
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token,X-Requested-With,Accept,Accept-Version,Content-Length,Content-MD5,Content-Type,Date,X-Api-Version,X-Jira-Token,X-Jira-Instance');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const startTime = Date.now();
  let attempt = 0;

  try {
    // ═════════════════════════════════════════════════════════════
    // 2. VALIDATE Input
    // ═════════════════════════════════════════════════════════════
    const path = req.query.path;
    const skipCache = req.query.skipCache === 'true';

    if (!path) {
      return res.status(400).json({
        error: 'Missing path parameter',
        example: '/api/jira?path=/rest/api/3/projects'
      });
    }

    // Get credentials from headers (secure) or query (fallback)
    let token = req.headers['x-jira-token'] || req.query.token;
    let instance = req.headers['x-jira-instance'] || req.query.instance;

    if (!token || !instance) {
      return res.status(401).json({
        error: 'Missing Jira credentials',
        required: ['X-Jira-Token header', 'X-Jira-Instance header'],
        message: 'Send credentials in request headers for security'
      });
    }

    // ═════════════════════════════════════════════════════════════
    // 3. RATE LIMITING
    // ═════════════════════════════════════════════════════════════
    const endpoint = path.split('?')[0];
    const rateKey = `rate:${token}:${endpoint}`;
    const requestCount = (cache.get(rateKey) || 0) + 1;
    cache.set(rateKey, requestCount, 60); // 1 minute window

    const limit = RATE_LIMITS[endpoint] || DEFAULT_LIMIT;
    if (requestCount > limit) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        limit: limit,
        window: '1 minute',
        retryAfter: 60,
        message: `Max ${limit} requests/minute for ${endpoint}`
      });
    }

    // ═════════════════════════════════════════════════════════════
    // 4. CHECK CACHE (for GET requests)
    // ═════════════════════════════════════════════════════════════
    if (!skipCache && req.method === 'GET') {
      const cacheKey = `data:${token}:${path}`;
      const cached = cache.get(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', '300');
        return res.status(200).json(cached);
      }
    }

    // ═════════════════════════════════════════════════════════════
    // 5. BUILD Jira URL
    // ═════════════════════════════════════════════════════════════
    const jiraInstance = instance.startsWith('https://') ? instance : `https://${instance}`;
    const jiraUrl = `${jiraInstance}${path}`;

    console.log(`[JIRA-PROXY] ${req.method} ${endpoint} (${jiraInstance.split('//')[1]})`);

    // ═════════════════════════════════════════════════════════════
    // 6. RETRY LOGIC with Exponential Backoff
    // ═════════════════════════════════════════════════════════════
    let response;
    let lastError;
    const maxRetries = 3;

    for (attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetchWithTimeout(jiraUrl, {
          method: req.method || 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'ABHIPO-Proxy/1.0'
          },
          body: req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : undefined,
        }, 8000); // 8 second timeout

        // ═════════════════════════════════════════════════════════════
        // 7. SUCCESS - Cache and return
        // ═════════════════════════════════════════════════════════════
        if (response.ok) {
          const data = await response.json();

          // Cache successful GET responses
          if (req.method === 'GET') {
            const cacheKey = `data:${token}:${path}`;
            cache.set(cacheKey, data);
          }

          const duration = Date.now() - startTime;
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Attempt', attempt.toString());
          res.setHeader('X-Duration-Ms', duration.toString());
          res.setHeader('Cache-Control', 'public, max-age=300');

          console.log(`[JIRA-PROXY] ✅ ${response.status} (${duration}ms)`);
          return res.status(200).json({
            success: true,
            data: data,
            _meta: {
              cached: false,
              attempt: attempt,
              duration: duration
            }
          });
        }

        // ═════════════════════════════════════════════════════════════
        // 8. ERROR HANDLING
        // ═════════════════════════════════════════════════════════════
        lastError = {
          status: response.status,
          statusText: response.statusText,
          message: await response.text().catch(() => 'No details')
        };

        // Don't retry on 4xx errors (except 429 rate limit)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          console.log(`[JIRA-PROXY] ❌ ${response.status} - No retry for client error`);
          break;
        }

        // Retry on 5xx or 429
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[JIRA-PROXY] ⏳ Retry ${attempt}/${maxRetries} in ${waitTime}ms...`);
          await sleep(waitTime);
        }

      } catch (error) {
        lastError = {
          name: error.name,
          message: error.message
        };

        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt - 1) * 1000;
          console.log(`[JIRA-PROXY] ⚠️ Network error, retrying in ${waitTime}ms...`);
          await sleep(waitTime);
        }
      }
    }

    // ═════════════════════════════════════════════════════════════
    // 9. ALL RETRIES FAILED
    // ═════════════════════════════════════════════════════════════
    const duration = Date.now() - startTime;
    console.error(`[JIRA-PROXY] ❌ Failed after ${maxRetries} attempts:`, lastError);

    return res.status(lastError?.status || 502).json({
      success: false,
      error: 'Jira API error',
      details: lastError,
      attempts: maxRetries,
      duration: duration,
      suggestion: lastError?.status === 401
        ? 'Check your Jira token - it may be expired'
        : lastError?.status === 403
        ? 'Check your Jira token permissions'
        : 'Check your network connection and try again'
    });

  } catch (error) {
    console.error('[JIRA-PROXY-FATAL]', error);
    const duration = Date.now() - startTime;

    res.status(500).json({
      success: false,
      error: 'Proxy error',
      message: error.message,
      duration: duration
    });
  }
}

// ═════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════

function fetchWithTimeout(url, options, timeout) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
