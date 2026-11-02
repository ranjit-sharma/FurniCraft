import { UnprocessableEntityError } from '../utils/errors.js';

export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      // Merge req.params and req[source] so path parameters (e.g. :attendanceId, :toolId) are automatically available
      const dataToValidate =
        source === 'body'
          ? { ...(req.params || {}), ...(req.body || {}) }
          : req[source];

      const parsed = schema.parse(dataToValidate);
      req[source] = parsed; // Use sanitized and parsed data
      next();
    } catch (error) {
      if (error.errors) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        const detailedMessage = formattedErrors
          .map((e) => (e.field ? `${e.field}: ${e.message}` : e.message))
          .join('; ');

        return next(
          new UnprocessableEntityError(
            `Validation failed (${detailedMessage})`,
            formattedErrors
          )
        );
      }
      next(error);
    }
  };
};
