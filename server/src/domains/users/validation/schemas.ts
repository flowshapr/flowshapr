import { z } from 'zod';

export const updateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters long").trim().optional(),
    email: z.string().email("Please provide a valid email address").toLowerCase().trim().optional(),
    image: z.string().url("Please provide a valid image URL").optional().or(z.literal('')),
  }),
});

export const getUserProfileSchema = z.object({
  params: z.object({
    id: z.string().min(1, "User ID is required"),
  }),
});