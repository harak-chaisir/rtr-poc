import { z } from "zod";

// Login form validation schema
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username is too long")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required")
    .max(200, "Password is too long"),
});

export type LoginFormData = z.infer<typeof loginSchema>;