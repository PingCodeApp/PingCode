const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for protected routes
 * Verifies the JWT token in the Authorization header
 */
const authMiddleware = (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Extract the token (remove 'Bearer ' prefix if it exists)
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Token is not valid' });
      }
      
      // Add the decoded user info to the request object
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = authMiddleware;