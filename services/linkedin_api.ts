// linkedin_api.ts - Enhanced LinkedIn API Integration with MongoDB
import { z } from "@zod";
import { getLogger, setup, formatters, ConsoleHandler } from "@log";
import { ScheduledPostModel, ScheduledPostSchema } from "../db/models/scheduledPosts.ts";
import { SimpleLogger } from "../utils/logger.ts";
import { LinkedInOAuthProvider } from "./oauth.ts";

setup({
  handlers: {
    console: new ConsoleHandler("DEBUG", {
      // Write to stderr instead of stdout
      formatter: formatters.jsonFormatter,
      // Disable colors to prevent formatting issues
      useColors: false,
    }),
  },
  loggers: {
    default: {
      level: "INFO",
      handlers: ["console"],
    },
  },
});


// Get logger
const logger = SimpleLogger;

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
  private oauthProvider: LinkedInOAuthProvider;
  private userId: string;
  private baseUrl = "https://api.linkedin.com/v2";

  constructor(oauthProvider: LinkedInOAuthProvider, userId: string) {
    this.userId = userId;
    this.oauthProvider = oauthProvider;
    logger.info(`LinkedIn API client initialized for user ID: ${userId}`);
  }

  /**
   * Create and publish a post to LinkedIn
   * @param content Post content with text and optional image URL
   * @returns Post ID and confirmation message
   */
  async createPost(content: PostContent): Promise<string> {
    logger.info(`Creating LinkedIn post for user: ${this.userId}`);

    const isAuthenticated = await this.oauthProvider.hasValidToken();
    if (!isAuthenticated) {
      throw new Error("Not authenticated with LinkedIn. Please authorize the application first.");
    }
    
    try {
      const accessToken = await this.oauthProvider.getAccessToken();
      
      // Prepare post data
      const postData = {
        author: `urn:li:company:${this.userId}`,
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

  /**
   * Test the LinkedIn API connection
   * @returns Connection status information
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    
    try {
      SimpleLogger.info("Testing LinkedIn API connection");
      
      // Check if we have valid authentication
      const isAuthenticated = await this.oauthProvider.hasValidToken();
      if (!isAuthenticated) {
        return {
          success: false,
          message: "Not authenticated with LinkedIn. Please authorize the application.",
          details: {
            authUrl: "/oauth/authorize"
          }
        };
      }
      
      // Try to get an access token
      const accessToken = await this.oauthProvider.getAccessToken();
      SimpleLogger.info("Successfully obtained access token");
      
      // Try to get user profile
      const profileResponse = await fetch(`${this.baseUrl}/me`, {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      
      if (!profileResponse.ok) {
        const errorText = await profileResponse.text();
        return {
          success: false,
          message: `Failed to retrieve profile: ${profileResponse.status} ${errorText}`,
          details: {
            status: profileResponse.status,
            response: errorText
          }
        };
      }
      
      const profile = await profileResponse.json();
      
      return {
        success: true,
        message: "Successfully connected to LinkedIn API",
        details: {
          userId: profile.id,
          firstName: profile.localizedFirstName,
          lastName: profile.localizedLastName
        }
      };
    } catch (error: any) {
      SimpleLogger.error(`LinkedIn API connection test failed: ${error.message}`);
      
      return {
        success: false,
        message: `Connection test failed: ${error.message}`
      };
    }
  }

  /**
   * Get the authorization status
   */
  async getAuthStatus(): Promise<{
    authenticated: boolean;
    userId?: string;
    expiresAt?: string;
    authUrl?: string;
  }> {
    const isAuthenticated = await this.oauthProvider.hasValidToken();
    
    if (isAuthenticated) {
      return {
        authenticated: true,
        userId: this.oauthProvider.tokenStorage.userId,
        expiresAt: new Date(this.oauthProvider.tokenStorage.expiresAt).toISOString()
      };
    } else {
      return {
        authenticated: false,
        authUrl: "/oauth/authorize"
      };
    }
  }
}
