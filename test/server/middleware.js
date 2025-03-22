/**
 * Middleware function that handles HTTP Basic authentication.
 * 
 * @param {Object} req - Express request object containing headers
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|undefined} - Returns response object on auth failure or undefined on success
 */
export async function basicAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization
    
    if (!authHeader) {
      res.setHeader('WWW-Authenticate', 'Basic')
      return res.status(401).json({ error: 'Authentication required' })
    }
    
    // Check if it's Basic auth
    if (!authHeader.startsWith('Basic ')) {
      return res.status(401).json({ error: 'Basic authentication required' })
    }
    
    // Extract and decode credentials
    const base64Credentials = authHeader.split(' ')[1]
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8')
    const [username, password] = credentials.split(':')
    
    if (!username || !password) {
      return res.status(401).json({ error: 'Invalid credentials format' })
    }
    
    // TODO: Replace with actual credential validation
    if (username === 'username' && password === 'password') {
      // Add user info to request for downstream middleware/routes
      req.user = { username }
      next()
    } else {
      res.status(401).json({ error: 'Invalid credentials' })
    }
  } catch (error) {
    console.error('Auth error:', error)
    res.status(500).json({ error: 'Authentication failed' })
  }
}


/**
 * Middleware function that handles API key authentication via query parameter.
 * 
 * @param {Object} req - Express request object containing query parameters
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Object|undefined} - Returns response object on auth failure or undefined on success
 */
export async function apiKeyAuth(req, res, next) {
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
