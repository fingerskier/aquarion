/**
 * Middleware function that handles API key authentication via query parameter.
 * 
 * @param {Object} req - Express request object containing query parameters
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|undefined} - Returns response object on auth failure or undefined on success
 */
export default async function apiKeyAuth(req, res, next) {
  try {
    const {api_key} = req.query
    const origin = req.query.origin
    
    if (!api_key) {
      return res.status(401).json({ error: 'API key required' })
    }
    
    // TODO: Replace with actual API key validation
    if (api_key === global.keys[origin]) {
      // Add user info to request for downstream middleware/routes
      req.user = { api_key }
      console.log('apiKeyAuth success w/', origin, api_key)
      next()
    } else {
      res.status(401).json({ error: 'Invalid API key' })
    }
  } catch (error) {
    console.error('API key auth error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}