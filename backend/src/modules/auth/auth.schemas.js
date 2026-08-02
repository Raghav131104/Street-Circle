const { z } = require("zod");

const username = z.string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(40, "Username must be at most 40 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username may contain only letters, numbers, or underscores");
const password = z.string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password must be at most 128 characters");

const registerSchema = z.object({
  username,
  email: z.string().trim().email("Enter a valid email address").max(254, "Email must be at most 254 characters"),
  password,
  displayName: z.string().trim().min(1).max(80).optional(),
}).strict();

const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
}).strict();

module.exports = { loginSchema, registerSchema };
