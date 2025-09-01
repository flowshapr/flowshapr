import { z } from 'zod';

// Base schemas for reuse
const emailSchema = z
  .string()
  .email("Please provide a valid email address")
  .min(1, "Email is required")
  .max(255, "Email must be less than 255 characters")
  .transform(email => email.toLowerCase().trim());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(128, "Password must be less than 128 characters");

const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters long")
  .max(100, "Name must be less than 100 characters")
  .transform(name => name.trim());

// Auth request schemas
export const signUpSchema = z.object({
  body: z.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
  }),
});

export const signInSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, "Password is required"),
  }),
});

// Type exports for TypeScript inference
export type SignUpRequest = z.infer<typeof signUpSchema>;
export type SignInRequest = z.infer<typeof signInSchema>;