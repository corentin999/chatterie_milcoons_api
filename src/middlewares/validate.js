export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    // On lève une erreur qui sera interceptée par ton errorHandler global
    const err = new Error("Validation failed");
    err.statusCode = 400;
    err.details = result.error.format(); // infos précises
    return next(err);
  }
  req.body = result.data; // données "nettoyées"
  next();
};
