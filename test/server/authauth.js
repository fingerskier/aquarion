export default async function AuthAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization
  
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic')
    return res.status(401).json({ error: 'Authentication required' })
  }
  
  // Check if it's Basic auth
  if (!authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Basic authentication required' })
  }
  
  try {
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