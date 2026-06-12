import Joi from 'joi';

// Helper for MongoDB ObjectId validation
const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Invalid ID format',
  'string.length': 'ID must be 24 characters long',
});

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least 2 characters',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'string.empty': 'Password is required',
  }),
  avatarUrl: Joi.string().uri().allow('').optional(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
});

export const createGroupSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'Group name cannot be empty',
  }),
  category: Joi.string().valid('home', 'trip', 'couple', 'other').default('other'),
});

export const addMemberSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email is required',
  }),
});

export const createExpenseSchema = Joi.object({
  description: Joi.string().min(1).max(200).required().messages({
    'string.empty': 'Description is required',
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Amount must be greater than zero',
    'any.required': 'Amount is required',
  }),
  paidBy: objectId.required().messages({
    'any.required': 'Payer ID is required',
  }),
  splitType: Joi.string().valid('equal', 'unequal', 'percentage', 'shares').required().messages({
    'any.required': 'Split type is required',
  }),
  groupId: objectId.required().messages({
    'any.required': 'Group ID is required',
  }),
  splits: Joi.array()
    .items(
      Joi.object({
        user: objectId.required().messages({
          'any.required': 'Split user ID is required',
        }),
        // value can represent: amount (unequal), percent (percentage), shares (shares), or unused for equal
        value: Joi.number().min(0).optional(),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one split participant is required',
      'any.required': 'Splits array is required',
    }),
});

export const createSettlementSchema = Joi.object({
  toUser: objectId.required().messages({
    'any.required': 'Recipient User ID is required',
  }),
  groupId: objectId.required().messages({
    'any.required': 'Group ID is required',
  }),
  amount: Joi.number().positive().required().messages({
    'number.positive': 'Settlement amount must be greater than zero',
    'any.required': 'Settlement amount is required',
  }),
});

export const createCommentSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required().messages({
    'string.empty': 'Message cannot be empty',
  }),
});
