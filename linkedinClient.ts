// linkedinClient.ts
import * as log from "@log";

export interface LinkedInClientOptions {
  accessToken: string;
  personId: string;
  debugMode: boolean;
}

export class LinkedInClient {
  private accessToken: string;
  private personId: string;
  private debugMode: boolean;
  private logger = log.getLogger();

  constructor(options: LinkedInClientOptions) {
    this.accessToken = options.accessToken;
    this.personId = options.personId;
    this.debugMode = options.debugMode;
    
    if (!this.accessToken || !this.personId) {
      throw new Error("LinkedIn credentials not properly configured");
    }
    
    this.logger.info(`LinkedIn client initialized for person ID: ${this.personId}`);
    if (this.debugMode) {
      this.logger.info("LinkedIn client running in DEBUG mode - posts will be simulated");
    }
  }

  async createPost(content: string, scheduleTime?: Date): Promise<string> {
    this.logger.info("Creating LinkedIn post");
    if (scheduleTime) {
      this.logger.info(`Post scheduled for: ${scheduleTime.toISOString()}`);
    }
    this.logger.debug(`Post content: ${content}`);

    // In debug mode, don't actually post to LinkedIn
    if (this.debugMode) {
      this.logger.info("DEBUG MODE: Simulating successful LinkedIn post");
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 500));
      return "debug-post-12345";
    }

    try {
      const payload = {
        author: `urn:li:person:${this.personId}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: content
            },
            shareMediaCategory: "NONE"
          }
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
        ...(scheduleTime && { scheduledAt: scheduleTime.getTime() })
      };

      this.logger.debug(`Sending request to LinkedIn API: ${JSON.stringify(payload)}`);
      
      const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`LinkedIn API error (${response.status}): ${errorText}`);
        throw new Error(`${response.status}: ${errorText}`);
      }

      const data = await response.json();
      this.logger.info(`Successfully created LinkedIn post with ID: ${data.id}`);
      return data.id;
    } catch (error) {
      this.logger.error(`Error creating LinkedIn post: ${error.message}`);
      throw error;
    }
  }
}
