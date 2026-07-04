/**
 * asyncHandler — Wraps an async route handler in a try/catch.
 * Eliminates the need for try/catch boilerplate in every route.
 * Any thrown error is forwarded to Express's global error handler.
 *
 * @param {Function} fn - Async route handler
 * @returns {Function} Wrapped handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Global Error Handler Middleware
 *
 * Must be the last middleware registered in Express.
 * Catches all errors passed via next(error) from any route or middleware.
 * Returns a clean JSON error response — never crashes the process.
 *
 * @param {Error} err
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Log the full error server-side for diagnostics
  console.error(`❌ [Error Handler] ${req.method} ${req.path} —`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred. Please try again later.'
      : err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      detail: err.detail || undefined,
    }),
  });
};
