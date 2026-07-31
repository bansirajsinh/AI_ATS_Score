const { z } = require('zod');

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const jobDescriptionSchema = z.object({
  rawText: z.string().min(10, 'Job description must be at least 10 characters'),
  sourceUrl: z.string().url().optional().or(z.literal('')),
});

const scoreRequestSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID'),
  jobId: z.string().uuid('Invalid job ID').optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * On failure, returns 400 with structured error details.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: errors,
        },
      });
    }
    req.validated = result.data;
    next();
  };
}

module.exports = {
  signupSchema,
  loginSchema,
  jobDescriptionSchema,
  scoreRequestSchema,
  paginationSchema,
  validate,
};