/**
 * CORS Configuration for TechOps Platform
 * 
 * This file centralizes CORS settings for easy management and security configuration.
 * You can modify these settings based on your security requirements.
 */

/**
 * Allowed origins for CORS requests
 * 
 * Options:
 * - '*' : Allow all origins (development/testing)
 * - Array of specific domains: ['https://site1.com', 'https://site2.com']
 * - Function: Dynamic origin validation
 */
export const ALLOWED_ORIGINS = '*'; // Allow all origins in both development and production

/**
 * Allowed HTTP methods for API requests
 */
export const ALLOWED_METHODS = [
  'GET',
  'POST', 
  'PUT',
  'DELETE',
  'OPTIONS'
];

/**
 * Allowed headers for API requests
 */
export const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Site-ID',           // Custom header for site identification
  'X-API-Key',           // Custom header for API authentication
  'Cache-Control',       // Allow cache control headers
  'Pragma'              // Allow pragma header for cache control
];

/**
 * CORS configuration object
 */
export const CORS_CONFIG = {
  origins: ALLOWED_ORIGINS,
  methods: ALLOWED_METHODS.join(', '),
  headers: ALLOWED_HEADERS.join(', '),
  maxAge: '86400', // Cache preflight for 24 hours
  credentials: true   // Enable credentials for authenticated requests
};

/**
 * Check if origin is allowed
 * 
 * @param {string} origin - The origin to check
 * @returns {boolean} - Whether the origin is allowed
 */
export function isOriginAllowed(origin) {
  // If no origin provided (e.g., same-origin requests), allow
  if (!origin) return true;
  
  if (ALLOWED_ORIGINS === '*') {
    return true;
  }
  
  if (Array.isArray(ALLOWED_ORIGINS)) {
    return ALLOWED_ORIGINS.includes(origin);
  }
  
  if (typeof ALLOWED_ORIGINS === 'function') {
    return ALLOWED_ORIGINS(origin);
  }
  
  return false;
}

/**
 * Get CORS headers for response
 * 
 * @param {string} origin - Request origin
 * @returns {Object} - Headers object
 */
export function getCorsHeaders(origin) {
  // For same-origin requests or when origin is allowed
  const allowedOrigin = isOriginAllowed(origin) ? origin : null;
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin || 'null',
    'Access-Control-Allow-Methods': CORS_CONFIG.methods,
    'Access-Control-Allow-Headers': CORS_CONFIG.headers,
    'Access-Control-Max-Age': CORS_CONFIG.maxAge,
    'Access-Control-Allow-Credentials': 'true',
    // Add Vary header to help with caching
    'Vary': 'Origin'
  };
} 