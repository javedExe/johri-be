import Joi from 'joi';

export const validate = schema => (req, res, next) => {
  // For multipart/form-data, req.body is used. For others, it's flexible.
  const source = Object.keys(req.body).length > 0 ? req.body : req.query;
  const { error } = schema.validate(source);
  return error
    ? res.status(400).json({ message: error.details[0].message })
    : next();
};

export const validateOptional = (schema, options = {}) => (req, res, next) => {
  const source = ['GET', 'DELETE'].includes(req.method) ? req.query : req.body;
  
  if (!source || Object.keys(source).length === 0) {
    return next();
  }
  
  return validate(schema, options)(req, res, next);
};

export const schemas = {
  // --- AUTH & USER SCHEMAS ---
  login: Joi.object({
    username: Joi.string().required().messages({
      'any.required': 'Username is required',
      'string.empty': 'Username cannot be empty'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
      'string.empty': 'Password cannot be empty'
    })
  }),
  
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters'
    }),
    role: Joi.string().valid('Owner', 'Jeweler').required().messages({
        'any.required': 'A user role is required.'
    }),
    email: Joi.string().email().optional(),
    phone_number: Joi.string().pattern(/^[0-9]{10,15}$/).optional().messages({
        'string.pattern.base': 'Please provide a valid phone number.'
    }),
  }).xor('email', 'phone_number').messages({
      'object.xor': 'Please provide either an email (for Super Admin) or a phone number (for Jeweler).'
  }),

  // --- OTP LOGIN SCHEMAS ---
  sendLoginOtp: Joi.object({
    phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required().messages({
      'string.pattern.base': 'Please Enter a Valid Mobile Number.',
      'any.required': 'Please Enter a Valid Mobile Number.'
    })
  }),

  verifyLoginOtp: Joi.object({
    phoneNumber: Joi.string().pattern(/^[0-9]{10,15}$/).required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'Please Enter a Valid OTP.'
    })
  }),

  // --- PASSWORD RESET SCHEMAS ---
  forgotPassword: Joi.object({
    identifier: Joi.string().required().messages({
      'any.required': 'Please enter your email or mobile number to reset your password.'
    })
  }),

  verifyOtp: Joi.object({
    identifier: Joi.string().required(),
    otp: Joi.string().length(6).pattern(/^\d+$/).required()
  }),

  resetPassword: Joi.object({
    identifier: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
    confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')),
    token: Joi.string().required()
  }),
  
  // --- NEW: PRODUCT MANAGEMENT SCHEMAS ---
  createProduct: Joi.object({
    name: Joi.string().trim().max(100).required().messages({
        'string.empty': 'Product name is required.',
        'string.max': 'Product name must not exceed 100 characters.'
    }),
    price: Joi.number().positive().required().messages({
        'any.required': 'Enter a valid product price.',
        'number.positive': 'Enter a valid product price.'
    }),
    description: Joi.string().trim().max(1000).allow('', null).optional().messages({
        'string.max': 'Description too long.'
    }),
    status: Joi.string().valid('In Stock', 'Out of Stock').required().messages({
        'any.required': 'Select product availability status.'
    })
    // Note: Image validation is handled by the 'multer' middleware, not Joi.
  }),

  updateProduct: Joi.object({
    name: Joi.string().trim().max(100).optional(),
    price: Joi.number().positive().optional(),
    description: Joi.string().trim().max(1000).allow('', null).optional(),
    status: Joi.string().valid('In Stock', 'Out of Stock').optional()
  }),

  // --- PACKAGE MANAGEMENT SCHEMAS ---
  createPackage: Joi.object({
    name: Joi.string().trim().min(3).max(100).required(),
    type: Joi.string().valid('Free', 'Paid').required(),
    price: Joi.number().when('type', {
      is: 'Paid',
      then: Joi.number().min(0).required().messages({ 'any.required': 'Price is required for Paid packages.' }),
      otherwise: Joi.number().valid(0).optional().messages({ 'any.only': 'Free packages cannot have a price.' })
    }),
    validityDays: Joi.number().integer().min(1).required(),
    features: Joi.array().items(Joi.string()).min(1).required()
  }),

  updatePackage: Joi.object({
    name: Joi.string().trim().min(3).max(100).optional(),
    price: Joi.number().min(0).optional(),
    validityDays: Joi.number().integer().min(1).optional(),
    features: Joi.array().items(Joi.string()).min(1).optional()
  }),

  updatePackageStatus: Joi.object({
    status: Joi.boolean().required()
  }),

  // --- OTHER ADMIN SCHEMAS ---
  createCategory: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).allow('', null).optional(),
    jewelry_types: Joi.array().items(Joi.number().integer().positive()).min(1).required()
  }),

  updateCategory: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().max(500).allow('', null).optional(),
    jewelry_types: Joi.array().items(Joi.number().integer().positive()).min(1).optional()
  })
};