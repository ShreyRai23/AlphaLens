import jwt from 'jsonwebtoken';

/**
 * JWT Authentication Guard Middleware
 *
 * Validates the Bearer token from the Authorization header.
 * On success, attaches { userId, email, iat, exp } to req.user.
 * On failure, returns 401 with a clear error message.
 */
export const authGuard = (req, res, next) => {
  let token;

  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  // Fallback to query parameter (required for SSE EventSource)
  else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authorization token missing. Please include a Bearer token or ?token parameter.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    const message =
      error.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid token. Authorization denied.';

    return res.status(401).json({ success: false, error: message });
  }
};
