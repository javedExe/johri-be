import Joi from 'joi';

export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

export default schema => (req, res, next) => {
  const { error } = schema.validate(req.body);
  return error
    ? res.status(400).json({ message: error.details[0].message })
    : next();
};
