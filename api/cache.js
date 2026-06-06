/**
 * Simple in-memory cache with TTL (time-to-live)
 * Used by Jira API endpoints to cache responses and reduce API calls
 */

class Cache {
  constructor(ttl = 900) {
    this.store = {};
    this.ttl = ttl; // seconds
  }

  /**
   * Set a cache entry
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Optional override for TTL in seconds
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.ttl) * 1000;
    this.store[key] = {
      value,
      expiresAt,
      createdAt: Date.now()
    };
  }

  /**
   * Get a cache entry
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/missing
   */
  get(key) {
    const item = this.store[key];
    if (!item) return null;

    // Check if expired
    const now = Date.now();
    if (now > item.expiresAt) {
      delete this.store[key];
      return null;
    }

    // Calculate age in seconds
    const age = Math.round((now - item.createdAt) / 1000);
    return {
      value: item.value,
      age,
      ttl: this.ttl,
      expiresAt: item.expiresAt
    };
  }

  /**
   * Check if key exists in cache and is valid
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists and not expired
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Invalidate (remove) a cache entry
   * @param {string} key - Cache key
   */
  invalidate(key) {
    delete this.store[key];
  }

  /**
   * Clear all cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match
   */
  invalidatePattern(pattern) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    Object.keys(this.store).forEach(key => {
      if (regex.test(key)) {
        delete this.store[key];
      }
    });
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store = {};
  }

  /**
   * Get cache statistics
   * @returns {object} - Statistics about cache usage
   */
  status() {
    const keys = Object.keys(this.store);
    const now = Date.now();
    const items = keys.map(key => {
      const item = this.store[key];
      const age = Math.round((now - item.createdAt) / 1000);
      const remaining = Math.round((item.expiresAt - now) / 1000);
      return {
        key,
        age,
        remaining,
        size: JSON.stringify(item.value).length
      };
    });

    return {
      keys: keys.length,
      items,
      totalSize: items.reduce((sum, item) => sum + item.size, 0),
      ttl: this.ttl
    };
  }
}

module.exports = Cache;
