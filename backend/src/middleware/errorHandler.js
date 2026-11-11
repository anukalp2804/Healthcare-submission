
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
  });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 500
      ? err.statusCode
      : 500;

  if (statusCode >= 500) {
    console.error("Internal server error:", {
  name: err.name,
  message: err.message,
  path: req.originalUrl,
  method: req.method,
});
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "Internal server error"
        : err.message,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
