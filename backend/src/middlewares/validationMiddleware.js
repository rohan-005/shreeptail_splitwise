export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      res.status(400);
      return next(new Error(errorMessage));
    }
    next();
  };
};
