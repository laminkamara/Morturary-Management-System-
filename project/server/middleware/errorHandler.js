export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // Database errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        error = {
          message: 'Resource already exists',
          status: 409
        };
        break;
      case '23503': // Foreign key violation
        error = {
          message: 'Referenced resource not found',
          status: 400
        };
        break;
      case '23502': // Not null violation
        error = {
          message: 'Required field missing',
          status: 400
        };
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      status: 401
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      message: err.details?.[0]?.message || 'Validation error',
      status: 400
    };
  }

  res.status(error.status).json({
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};