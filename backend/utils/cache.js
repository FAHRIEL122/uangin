/**
 * Simple In-Memory Cache
 * For production, use Redis or similar
 */

class SimpleCache {
  constructor() {
    this.store = new Map();
  }

  // Get value from cache
  get(key) {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  // Set value in cache
  set(key, value, ttlMinutes = 5) {
    const expiry = Date.now() + (ttlMinutes * 60 * 1000);
    this.store.set(key, { value, expiry });
  }

  // Delete key from cache
  delete(key) {
    this.store.delete(key);
  }

  // Clear all cache
  clear() {
    this.store.clear();
  }

  // Get cache size
  size() {
    return this.store.size;
  }
}

// Create singleton cache instance
const cache = new SimpleCache();

// Cache keys
const CACHE_KEYS = {
  userCategories: (userId) => `categories:${userId}`,
  monthlyTransactions: (userId, month, year) => `transactions:${userId}:${month}:${year}`,
  monthlySummary: (userId, month, year) => `summary:${userId}:${month}:${year}`,
  userBudgets: (userId, month, year) => `budgets:${userId}:${month}:${year}`,
  userProfile: (userId) => `user:${userId}`
};

// Cache TTL (in minutes)
const CACHE_TTL = {
  categories: 60,       // 1 hour
  transactions: 5,      // 5 minutes
  summary: 5,           // 5 minutes
  budgets: 10,          // 10 minutes
  profile: 30           // 30 minutes
};

// Helper functions
function getCachedData(key) {
  return cache.get(key);
}

function setCachedData(key, value, ttlMinutes = 5) {
  cache.set(key, value, ttlMinutes);
}

function invalidateUserCache(userId) {
  // Invalidate all caches for a user
  const keysToDelete = [];
  for (const key of cache.store.keys()) {
    if (key.includes(`:${userId}`)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
}

function invalidateCategoryCache(userId) {
  cache.delete(CACHE_KEYS.userCategories(userId));
}

function invalidateTransactionCache(userId, month, year) {
  cache.delete(CACHE_KEYS.monthlyTransactions(userId, month, year));
  cache.delete(CACHE_KEYS.monthlySummary(userId, month, year));
}

module.exports = {
  cache,
  CACHE_KEYS,
  CACHE_TTL,
  getCachedData,
  setCachedData,
  invalidateUserCache,
  invalidateCategoryCache,
  invalidateTransactionCache
};
