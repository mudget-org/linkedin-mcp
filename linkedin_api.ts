// linkedin_api.ts - Enhanced LinkedIn API Integration with MongoDB
import { z } from "@zod";
import { getLogger } from "@log";
import { ScheduledPostModel } from "./db/models/scheduledPost.ts";
import { ScheduledPostSchema } from "./db/models/scheaduledPosts.ts";

// Get logger
const logger = getLogger();

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

// Class for handling LinkedIn API integration with simplified auth
export class LinkedInAPI {
  private clientId: string;
  private clientSecret: string;
  private userId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private baseUrl = "https://api.linkedin.com/v2";

  constructor(clientId: string, clientSecret: string, userId: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.userId = userId;
    logger.info(`LinkedIn API client initialized for user ID: ${userId}`);
  }

  /**
   * Get access token using client credentials flow
   * @returns Access token
   */
  private async getAccessToken(): Promise<string> {
    // If we have a valid token, return it
    if (this.accessToken && this.tokenExpiresAt > Date.now()) {
      return this.accessToken;
    }

    logger.info("Getting new LinkedIn access token");
    
    try {
      const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn token error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
      
      logger.info(`LinkedIn access token acquired, expires in ${data.expires_in} seconds`);
      
      return this.accessToken!;
    } catch (error: any) {
      logger.error(`Error getting LinkedIn access token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create and publish a post to LinkedIn
   * @param content Post content with text and optional image URL
   * @returns Post ID and confirmation message
   */
  async createPost(content: PostContent): Promise<string> {
    logger.info(`Creating LinkedIn post for user: ${this.userId}`);
    
    try {
      const accessToken = await this.getAccessToken();
      
      // Prepare post data
      const postData = {
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
      };

      // If there's an image, we need to handle it
      if (content.imageUrl) {
        // For simplicity in this example, we'll assume direct image URLs work
        // In a production environment, you would need to:
        // 1. Register the upload with LinkedIn
        // 2. Download the image
        // 3. Upload it to LinkedIn
        // 4. Use the returned asset in your post
        logger.info(`Post includes image URL: ${content.imageUrl}`);
      }

      // Create the post
      const postResponse = await fetch(`${this.baseUrl}/ugcPosts`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify(postData)
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.text();
        throw new Error(`Failed to create LinkedIn post: ${errorData}`);
      }
      
      const postResponseData = await postResponse.json();
      const postId = postResponseData.id;
      
      logger.info(`LinkedIn post created with ID: ${postId}`);
      return `Post published with ID: ${postId}`;
      
    } catch (error: any) {
      logger.error(`LinkedIn API post creation error: ${error.message}`);
      throw new Error(`LinkedIn API error: ${error.message}`);
    }
  }

  /**
   * Schedule a post for future publication
   * @param content Post content with text and optional image URL
   * @param schedule Schedule information with scheduledTime
   * @returns Schedule confirmation message with the scheduled post ID
   */
  async schedulePost(content: PostContent, schedule: Schedule): Promise<string> {
    logger.info(`Scheduling LinkedIn post for user: ${this.userId} at ${schedule.scheduledTime}`);
    
    try {
      // Store the scheduled post in MongoDB
      const scheduledPost = await ScheduledPostModel.create(content, schedule.scheduledTime);
      
      const scheduledDate = new Date(schedule.scheduledTime);
      const id = scheduledPost._id!.toString();
      
      logger.info(`Post scheduled successfully with ID: ${id}`);
      return `Post scheduled for publication at ${scheduledDate.toLocaleString()}. Schedule ID: ${id}`;
    } catch (error: any) {
      logger.error(`LinkedIn API post scheduling error: ${error.message}`);
      throw new Error(`LinkedIn scheduling error: ${error.message}`);
    }
  }

  /**
   * Get list of scheduled posts
   * @returns Formatted string with scheduled posts
   */
  async getScheduledPosts(): Promise<string> {
    logger.info(`Fetching scheduled posts for user: ${this.userId}`);
    
    try {
      // Get scheduled posts from MongoDB
      const scheduledPosts = await ScheduledPostModel.getAll();
      
      if (scheduledPosts.length === 0) {
        return "No scheduled posts found.";
      }
      
      // Format the posts for display
      const formattedPosts = scheduledPosts.map((post: ScheduledPostSchema, index: number) => {
        const status = post.status === "pending" 
          ? `Scheduled for ${post.scheduledTime.toLocaleString()}`
          : post.status === "published"
            ? `Published at ${post.publishedAt?.toLocaleString() || "unknown"}`
            : `Failed: ${post.error || "Unknown error"}`;
        
        return `${index + 1}. "${post.content.text.substring(0, 50)}${post.content.text.length > 50 ? '...' : ''}" - ${status} (ID: ${post._id})`;
      });
      
      return formattedPosts.join("\n");
    } catch (error: any) {
      logger.error(`LinkedIn API scheduled posts retrieval error: ${error.message}`);
      throw new Error(`LinkedIn API error: ${error.message}`);
    }
  }
  
  /**
   * Process scheduled posts that are due for publishing
   * @returns Number of posts processed
   */
  async processDueScheduledPosts(): Promise<number> {
    logger.info("Processing due scheduled posts");
    
    try {
      // Get posts that are due for publishing
      const duePosts = await ScheduledPostModel.getDuePosts();
      
      logger.info(`Found ${duePosts.length} posts due for publishing`);
      
      let publishedCount = 0;
      
      // Process each due post
      for (const post of duePosts) {
        try {
          logger.info(`Publishing scheduled post ${post._id}`);
          
          // Call the LinkedIn API to publish the post
          const result = await this.createPost(post.content);
          
          // Extract the post ID from the result
          const postIdMatch = result.match(/ID: (.+)/);
          const postId = postIdMatch ? postIdMatch[1] : "unknown";
          
          // Mark the post as published
          await ScheduledPostModel.markAsPublished(post._id!.toString(), postId);
          
          publishedCount++;
          logger.info(`Successfully published scheduled post ${post._id}`);
        } catch (error: any) {
          logger.error(`Error publishing scheduled post ${post._id}: ${error.message}`);
          
          // Mark the post as failed
          await ScheduledPostModel.markAsFailed(post._id!.toString(), error.message);
        }
      }
      
      return publishedCount;
    } catch (error: any) {
      logger.error(`Error processing due scheduled posts: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Delete a scheduled post by ID
   * @param id Post ID to delete
   * @returns Success message
   */
  async deleteScheduledPost(id: string): Promise<string> {
    logger.info(`Deleting scheduled post ${id}`);
    
    try {
      // Check if the post exists
      const post = await ScheduledPostModel.getById(id);
      
      if (!post) {
        throw new Error("Scheduled post not found");
      }
      
      // Check if the post is already published
      if (post.status === "published") {
        throw new Error("Cannot delete a post that has already been published");
      }
      
      // Delete the post
      const success = await ScheduledPostModel.delete(id);
      
      if (!success) {
        throw new Error("Failed to delete scheduled post");
      }
      
      logger.info(`Successfully deleted scheduled post ${id}`);
      return `Successfully deleted scheduled post with ID: ${id}`;
    } catch (error: any) {
      logger.error(`Error deleting scheduled post ${id}: ${error.message}`);
      throw error;
    }
  }
}
