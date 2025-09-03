export default function errorHandler(err, _req, res, _next) {
  console.error(err);

  const status = err.statusCode || 500;
  const payload = {
    error: err.message || "Server error",
  };

  if (err.details) {
    payload.details = err.details; // Zod errors format
  }

  res.status(status).json(payload);
}
