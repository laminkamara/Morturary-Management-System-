import Joi from 'joi';

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

// Common validation schemas
export const schemas = {
  // User schemas
  createUser: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'staff', 'pathologist').required(),
    phone: Joi.string().optional()
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('admin', 'staff', 'pathologist').optional(),
    phone: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').optional()
  }),

  // Body schemas
  createBody: Joi.object({
    fullName: Joi.string().min(2).max(255).required(),
    age: Joi.number().integer().min(0).max(150).required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    dateOfDeath: Joi.date().iso().required(),
    intakeTime: Joi.date().iso().required(),
    storageId: Joi.string().required(),
    nextOfKinName: Joi.string().min(2).max(255).required(),
    nextOfKinRelationship: Joi.string().min(2).max(100).required(),
    nextOfKinPhone: Joi.string().required(),
    nextOfKinAddress: Joi.string().min(5).required(),
    notes: Joi.string().optional()
  }),

  // Task schemas
  createTask: Joi.object({
    title: Joi.string().min(2).max(255).required(),
    description: Joi.string().optional(),
    type: Joi.string().valid('embalming', 'burial', 'viewing', 'transport', 'maintenance').required(),
    assignedTo: Joi.string().required(),
    dueDate: Joi.date().iso().required(),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    bodyId: Joi.string().optional()
  }),

  // Autopsy schemas
  createAutopsy: Joi.object({
    bodyId: Joi.string().required(),
    pathologistId: Joi.string().required(),
    scheduledDate: Joi.date().iso().required(),
    notes: Joi.string().optional()
  }),

  updateAutopsy: Joi.object({
    status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
    causeOfDeath: Joi.string().optional(),
    notes: Joi.string().optional()
  }),

  // Release schemas
  createRelease: Joi.object({
    bodyId: Joi.string().required(),
    receiverName: Joi.string().min(2).max(255).required(),
    receiverId: Joi.string().required(),
    relationship: Joi.string().min(2).max(100).required(),
    notes: Joi.string().optional()
  }),

  // Login schema
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  })
};