const NodeCache = require('node-cache');

// Create cache instance with default TTL of 1 hour (3600 seconds)
const cache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 600, // Check for expired keys every 10 minutes
  useClones: true, // Return clones of cached values to prevent mutations
  maxKeys: 1000 // Maximum number of keys to store
});

// Cache key prefixes for different data types
const CACHE_KEYS = {
  SYSTEM_SETTINGS: 'cache:system_settings',
  ACADEMIC_YEAR: 'cache:academic_year',
  REGISTRATION_STATUS: 'cache:registration_status',
  USER_BY_ID: 'cache:user:',
  USER_BY_EMAIL: 'cache:user:email:',
  PROJECT_DOMAINS: 'cache:project_domains',
  VENUES: 'cache:venues',
  PENDING_STUDENTS: 'cache:pending_students:',
  USERS_BY_ROLE: 'cache:users:role:',
  USERS_BY_DEPT: 'cache:users:dept:'
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined
 */
const getCache = (key) => {
  const value = cache.get(key);
  if (value !== undefined) {
    console.log(`[Cache HIT] ${key}`);
  } else {
    console.log(`[Cache MISS] ${key}`);
  }
  return value;
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {boolean} Success status
 */
const setCache = (key, value, ttl = null) => {
  let success;
  if (ttl) {
    success = cache.set(key, value, ttl);
  } else {
    success = cache.set(key, value);
  }
  
  if (success) {
    console.log(`[Cache SET] ${key}${ttl ? ` (TTL: ${ttl}s)` : ''}`);
  } else {
    console.error(`[Cache ERROR] Failed to set ${key}`);
  }
  
  return success;
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {number} Number of keys deleted
 */
const delCache = (key) => {
  const count = cache.del(key);
  if (count > 0) {
    console.log(`[Cache DEL] ${key}`);
  }
  return count;
};

/**
 * Clear all cache or cache with specific prefix
 * @param {string} prefix - Optional prefix to filter keys (e.g., 'cache:user:')
 * @returns {number} Number of keys deleted
 */
const clearCache = (prefix = null) => {
  if (prefix) {
    // Get all keys and filter by prefix
    const allKeys = cache.keys();
    const keysToDelete = allKeys.filter(key => key.startsWith(prefix));
    const count = cache.del(keysToDelete);
    console.log(`[Cache CLEAR] Cleared ${count} keys with prefix: ${prefix}`);
    return count;
  } else {
    // Clear all cache
    const count = cache.flushAll();
    console.log(`[Cache CLEAR] Cleared all cache (${count} keys)`);
    return count;
  }
};

/**
 * Get cache statistics
 * @returns {Object} Cache statistics
 */
const getStats = () => {
  const stats = cache.getStats();
  return {
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    hitRate: stats.keys > 0 ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) : 0,
    size: stats.vsize // Memory size in bytes
  };
};

/**
 * Check if caching is enabled (from environment or settings)
 * @returns {boolean}
 */
const isCacheEnabled = () => {
  // Check environment variable first
  const envEnabled = process.env.CACHE_ENABLED;
  if (envEnabled !== undefined) {
    return envEnabled === 'true' || envEnabled === '1';
  }
  // Default to enabled
  return true;
};

/**
 * Get default cache duration from environment
 * @returns {number} Default TTL in seconds
 */
const getDefaultTTL = () => {
  const envTTL = process.env.CACHE_TTL;
  if (envTTL) {
    const ttl = parseInt(envTTL, 10);
    if (!isNaN(ttl) && ttl > 0) {
      return ttl;
    }
  }
  return 3600; // Default 1 hour
};

module.exports = {
  cache,
  getCache,
  setCache,
  delCache,
  clearCache,
  getStats,
  isCacheEnabled,
  getDefaultTTL,
  CACHE_KEYS
};
