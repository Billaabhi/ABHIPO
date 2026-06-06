/**
 * Jira Cloud REST API v3 Client
 * Handles all communication with Jira API
 * Uses Bearer token authentication (recommended for Cloud)
 */

class JiraClient {
  constructor(instance = null, token = null) {
    this.instance = instance || process.env.JIRA_INSTANCE;
    this.token = token || process.env.JIRA_TOKEN;
    this.baseUrl = this.instance ? `${this.instance}/rest/api/3` : null;

    if (!this.instance || !this.token) {
      console.warn('[JiraClient] Missing JIRA_INSTANCE or JIRA_TOKEN in environment');
    }
  }

  /**
   * Make a request to Jira API
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - API path (e.g., '/projects', '/search')
   * @param {object} body - Optional request body
   * @returns {Promise<object>} - Parsed JSON response
   */
  async request(method, path, body = null) {
    if (!this.baseUrl || !this.token) {
      throw new Error('Jira client not configured. Set JIRA_INSTANCE and JIRA_TOKEN.');
    }

    const url = `${this.baseUrl}${path}`;
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (body && method.toUpperCase() !== 'GET') {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMsg = errorData.message || errorData.errorMessages?.[0] || errorMsg;
        } catch (e) {
          // If response is not JSON, just use error text
          errorMsg = errorText || errorMsg;
        }
        throw new Error(errorMsg);
      }

      const text = await response.text();
      if (!text) return null;

      return JSON.parse(text);
    } catch (error) {
      console.error(`[JiraClient] Request failed: ${method} ${path}`, error.message);
      throw error;
    }
  }

  /**
   * Get all projects
   * @returns {Promise<object>} - List of projects with metadata
   */
  async getProjects() {
    const response = await this.request('GET', '/projects?expand=lead&maxResults=100');
    return response.values || [];
  }

  /**
   * Get a specific project
   * @param {string} projectKey - Project key (e.g., 'HIP')
   * @returns {Promise<object>} - Project details
   */
  async getProject(projectKey) {
    return this.request('GET', `/projects/${projectKey}?expand=lead`);
  }

  /**
   * Get active sprints for a project
   * @param {string} projectKey - Project key
   * @returns {Promise<Array>} - List of active sprints
   */
  async getSprints(projectKey) {
    try {
      // Get all boards for the project
      const boardsResponse = await this.request('GET', `/board?projectKey=${projectKey}&maxResults=50`);
      const boards = boardsResponse.values || [];

      // Get sprints for each board
      const allSprints = [];
      for (const board of boards) {
        try {
          const sprintsResponse = await this.request('GET', `/board/${board.id}/sprint?state=active,future&maxResults=50`);
          allSprints.push(...(sprintsResponse.values || []));
        } catch (error) {
          console.warn(`[JiraClient] Failed to get sprints for board ${board.id}:`, error.message);
        }
      }

      // Return only active sprints
      return allSprints.filter(sprint => sprint.state === 'active');
    } catch (error) {
      console.warn(`[JiraClient] Failed to get sprints for project ${projectKey}:`, error.message);
      return [];
    }
  }

  /**
   * Search for issues using JQL
   * @param {string} jql - Jira Query Language string
   * @param {number} maxResults - Maximum results to return
   * @returns {Promise<object>} - Search results with issues
   */
  async searchIssues(jql, maxResults = 50, fields = null) {
    const fieldsParam = fields ? `&fields=${fields.join(',')}` : '';
    const path = `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}${fieldsParam}`;
    return this.request('GET', path);
  }

  /**
   * Get an issue by key
   * @param {string} issueKey - Issue key (e.g., 'HIP-123')
   * @param {Array<string>} fields - Optional list of fields to return
   * @returns {Promise<object>} - Issue details
   */
  async getIssue(issueKey, fields = null) {
    const fieldsParam = fields ? `?fields=${fields.join(',')}` : '';
    return this.request('GET', `/issue/${issueKey}${fieldsParam}`);
  }

  /**
   * Get current user info (to verify authentication)
   * @returns {Promise<object>} - Current user details
   */
  async getCurrentUser() {
    return this.request('GET', '/myself');
  }

  /**
   * Get issues in a sprint
   * @param {string} sprintId - Sprint ID
   * @param {number} maxResults - Maximum results
   * @returns {Promise<Array>} - Issues in the sprint
   */
  async getSprintIssues(sprintId, maxResults = 100) {
    try {
      const response = await this.request(
        'GET',
        `/search?jql=sprint=${sprintId}&expand=changelog&maxResults=${maxResults}`
      );
      return response.issues || [];
    } catch (error) {
      console.warn(`[JiraClient] Failed to get sprint issues for sprint ${sprintId}:`, error.message);
      return [];
    }
  }
}

module.exports = JiraClient;
