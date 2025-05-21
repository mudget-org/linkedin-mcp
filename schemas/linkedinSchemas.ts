// schemas.ts
import { z } from "@zod";

// Input schema for the LinkedIn post tool
export const LinkedInPostRequestSchema = z.object({
  // The text content for the LinkedIn post
  content: z.string().min(1, "Content cannot be empty").max(3000, "Content too long"),
  
  // Optional ISO 8601 timestamp for scheduling the post
  schedule_time: z.string().datetime().optional(),
});

// Output schema for the LinkedIn post tool
export const LinkedInPostResponseSchema = z.object({
  // Whether the post was successfully created
  success: z.boolean(),
  
  // The ID of the created LinkedIn post if successful
  post_id: z.string().optional().nullable(),
  
  // A message describing the result of the operation
  message: z.string(),
});

// Export types inferred from the schemas
export type LinkedInPostRequest = z.infer<typeof LinkedInPostRequestSchema>;
export type LinkedInPostResponse = z.infer<typeof LinkedInPostResponseSchema>;
