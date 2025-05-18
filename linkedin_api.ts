// linkedin_api.ts - LinkedIn API Integration Module
import { z } from "npm:zod";

// Types for our LinkedIn API integration
export const PostContentSchema = z.object({
  text: z.string().min(1).max(3000).describe("The text content of the post"),
  imageUrl: z.string().url().optional().describe("Optional URL to an image to include with the post"),
});

export const ScheduleSchema = z.object({
  scheduledTime: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/).describe("ISO 8601 timestamp for when to post"),
});

export type PostContent = z.infer<typeof PostContentSchema>;
export type Schedule = z.infer<typeof ScheduleSchema>;

// Class for handling LinkedIn API integration
export class LinkedInAPI {
  private apiKey: string;
  private userId: string;
  private baseUrl = "https://api.linkedin.com/v2";

  constructor(apiKey: string, userId: string) {
    this.apiKey = apiKey;
    this.userId = userId;
  }

  /**
   * Create and publish a post to LinkedIn
   * @param content Post content with text and optional image URL
   * @returns Post ID and confirmation message
   */
  async createPost(content: PostContent): Promise<string> {
    console.error(`[DEBUG] Creating LinkedIn post for user: ${this.userId}`);
    
    try {
      const response = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify({
          author: `urn:li:person:${this.userId}`,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: {
                text: content.text
              },
              shareMediaCategory: content.imageUrl ? "IMAGE" : "NONE",
              media: content.imageUrl ? [{
                status: "READY",
                description: {
                  text: "Image"
                },
                media: content.imageUrl,
                title: {
                  text: "Image"
                }
              }] : undefined
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        })
      });
      
      const data = await response.json();
      return `Post published with ID: ${data.id}`;
      
    } catch (error: any) {
      console.error("[ERROR] LinkedIn API post creation error:", error);
      throw new Error(`LinkedIn API error: ${error.message}`);
    }
  }

  /**
   * Schedule a post for future publication
   * @param content Post content with text and optional image URL
   * @param schedule Schedule information with scheduledTime
   * @returns Schedule confirmation message
   */
  async schedulePost(content: PostContent, schedule: Schedule): Promise<string> {
    console.error(`[DEBUG] Scheduling LinkedIn post for user: ${this.userId} at ${schedule.scheduledTime}`);
    
    try {
      // In a real implementation, this would call the LinkedIn API
      // The LinkedIn API doesn't directly support scheduling, but you could implement it via:
      // 1. Storing the scheduled post in your database
      // 2. Using a cron job or serverless function to publish at the scheduled time
      
      // Mock response
      const scheduledDate = new Date(schedule.scheduledTime);
      
      return `Post scheduled for publication at ${scheduledDate.toLocaleString()}. Schedule ID: ${this.generateRandomId()}`;
    } catch (error: any) {
      console.error("[ERROR] LinkedIn API post scheduling error:", error);
      throw new Error(`LinkedIn scheduling error: ${error.message}`);
    }
  }

  /**
   * Get list of scheduled posts
   * @returns Array of scheduled posts
   */
  async getScheduledPosts(): Promise<string> {
    console.error(`[DEBUG] Fetching scheduled posts for user: ${this.userId}`);
    
    try {
      // In a real implementation, this would query your scheduling database
      // or LinkedIn's API if they add scheduling features
      
      // Mock response
      await this.simulateApiLatency();
      
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const nextMonday = new Date(now);
      nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()) % 7);
      nextMonday.setHours(14, 0, 0, 0);
      
      return [
        `1. "Product launch announcement" - Scheduled for ${tomorrow.toLocaleString()} (ID: ${this.generateRandomId()})`,
        `2. "Q3 Results" - Scheduled for ${nextMonday.toLocaleString()} (ID: ${this.generateRandomId()})`
      ].join("\n");
    } catch (error: any) {
      console.error("[ERROR] LinkedIn API scheduled posts retrieval error:", error);
      throw new Error(`LinkedIn API error: ${error.message}`);
    }
  }
  
  /**
   * Generate a random ID for mock responses
   * @returns Random ID string
   */
  private generateRandomId(): string {
    return `post_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  /**
   * Simulate API latency for more realistic mocking
   */
  private async simulateApiLatency(): Promise<void> {
    const delay = Math.floor(Math.random() * 500) + 500; // 500-1000ms delay
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}
