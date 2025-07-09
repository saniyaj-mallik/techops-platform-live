# CORS Security Configuration

This document explains how to configure Cross-Origin Resource Sharing (CORS) for the TechOps Platform.

## Overview

The platform uses centralized CORS middleware (`middleware.js`) that applies security headers to all API endpoints automatically. This eliminates the need to add CORS headers to each individual API route.

## Configuration Files

### `lib/cors-config.js`
Contains all CORS settings and security policies.

### `middleware.js`
Applies CORS headers to all `/api/*` routes automatically.

## Environment Configurations

### Development (Default)
```javascript
export const ALLOWED_ORIGINS = '*'; // Allow all origins
```
- **Use case**: Local development and testing
- **Security**: Low (allows any domain)
- **Convenience**: High (no configuration needed)

### Production (Recommended)
```javascript
export const ALLOWED_ORIGINS = [
  'https://client1.com',
  'https://client2.com',
  'https://wordpress-site.com'
];
```
- **Use case**: Live production environment
- **Security**: High (only specified domains)
- **Maintenance**: Requires adding each WordPress site domain

### Dynamic Validation (Advanced)
```javascript
export const ALLOWED_ORIGINS = (origin) => {
  // Allow all subdomains of trusted domains
  const trustedDomains = ['mycompany.com', 'client-domain.com'];
  return trustedDomains.some(domain => origin?.endsWith(domain));
};
```
- **Use case**: Multiple subdomains or dynamic environments
- **Security**: Medium-High (pattern-based validation)
- **Flexibility**: High (automatic subdomain support)

## Security Best Practices

### 1. Production Deployment
When deploying to production, update `lib/cors-config.js`:

```javascript
export const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production' 
  ? [
      'https://client1.com',
      'https://client2.com',
      // Add all WordPress sites that need access
    ]
  : '*';
```

### 2. Environment Variables (Recommended)
For even better security, use environment variables:

```javascript
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : '*';
```

Then set in your deployment:
```bash
ALLOWED_ORIGINS=https://site1.com,https://site2.com,https://site3.com
```

### 3. Custom Headers for Authentication
The configuration includes custom headers for future authentication:

```javascript
export const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-Site-ID',      // For site identification
  'X-API-Key'       // For API authentication
];
```

## Adding New WordPress Sites

### Method 1: Update Configuration File
1. Edit `lib/cors-config.js`
2. Add the new domain to `ALLOWED_ORIGINS` array
3. Redeploy the platform

### Method 2: Environment Variables
1. Update your `ALLOWED_ORIGINS` environment variable
2. Restart the application

### Method 3: Dynamic Validation
Use pattern-based validation for automatic subdomain support:

```javascript
export const ALLOWED_ORIGINS = (origin) => {
  // Allow any subdomain of your main domain
  return origin?.endsWith('.yourcompany.com') || 
         origin === 'https://yourcompany.com';
};
```

## Testing CORS Configuration

### 1. Browser Console Test
```javascript
fetch('https://your-platform.com/api/test/results')
  .then(response => response.json())
  .then(data => console.log('CORS working:', data))
  .catch(error => console.error('CORS blocked:', error));
```

### 2. WordPress Plugin Test
Use the built-in "Test Connection" button in the plugin configuration.

### 3. Command Line Test
```bash
curl -H "Origin: https://your-wordpress-site.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-platform.com/api/test/results
```

## Troubleshooting

### CORS Error: "Access-Control-Allow-Origin"
- **Cause**: Origin not in allowed list
- **Solution**: Add the domain to `ALLOWED_ORIGINS`

### CORS Error: "Access-Control-Allow-Methods"
- **Cause**: HTTP method not allowed
- **Solution**: Add method to `ALLOWED_METHODS`

### CORS Error: "Access-Control-Allow-Headers"
- **Cause**: Custom header not allowed
- **Solution**: Add header to `ALLOWED_HEADERS`

## Security Notes

1. **Never use `'*'` in production** - Always specify exact domains
2. **Use HTTPS only** - Don't allow HTTP origins in production
3. **Monitor CORS errors** - Log blocked requests for security analysis
4. **Regular audits** - Review and update allowed origins periodically
5. **Authentication** - Consider implementing API keys for additional security

## Future Enhancements

- Rate limiting per origin
- IP-based restrictions
- JWT token validation
- Audit logging for CORS requests 