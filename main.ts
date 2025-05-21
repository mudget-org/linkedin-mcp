import { McpServer } from "@mcp/server/mcp.js";
import { StdioServerTransport } from "@mcp/server/stdio.js";
import { z } from "@zod";
import { load } from "@env";
import { getLogger, setup, formatters } from "@log";

import {
  LinkedInAPI,
  PostContentSchema,
  ScheduleSchema,
} from "./services/linkedin_api.ts";
import { SchedulerService } from "./services/scheduler.ts";
import mongoClient from "./db/mongo.ts";

// Configure logging
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

// Load environment variables
await load({ export: true });

// Required environment variables
const LINKEDIN_CLIENT_ID = Deno.env.get("LINKEDIN_CLIENT_ID");
const LINKEDIN_CLIENT_SECRET = Deno.env.get("LINKEDIN_CLIENT_SECRET");
const LINKEDIN_USER_ID = Deno.env.get("LINKEDIN_USER_ID");
const OAUTH_PORT = parseInt(Deno.env.get("OAUTH_PORT") || "8000");

if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET || !LINKEDIN_USER_ID) {
  logger.error("Error: Required LinkedIn credentials are missing.");
  logger.error(
    "Please set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_USER_ID environment variables.",
  );
  Deno.exit(1);
}

// Token storage
const tokenStorage = new MongoTokenStorage();

// Connect to MongoDB
try {
  await mongoClient.connect();
  logger.info("Successfully connected to MongoDB");
} catch (error: any) {
  logger.error(`Failed to connect to MongoDB: ${error.message}`);
  Deno.exit(1);
}

// Create LinkedIn API client with simplified auth
let linkedinClient: LinkedInAPI;
let schedulerService: SchedulerService;


// Create MCP server instance
const server = new McpServer({
  name: "linkedin-mcp-server",
  version: "1.0.0",
});

// Register tools
async function registerTools() {

server.tool(
    "get-auth-status",
    "Get the LinkedIn authentication status",
    {},
    async () => {
      try {
        const status = await linkedinClient.getAuthStatus();
        
        if (status.authenticated) {
          return {
            content: [
              {
                type: "text",
                text: `✅ LinkedIn API is authenticated.\n\nUser ID: ${status.userId}\nToken expires at: ${status.expiresAt}\n\nYou can use the 'post-to-linkedin' tool to create posts.`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ LinkedIn API is not authenticated.\n\nPlease visit http://localhost:${OAUTH_PORT}/oauth/authorize to authorize the application.`,
              },
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error getting authentication status: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool for testing LinkedIn API connection
  server.tool(
    "test-linkedin-connection",
    "Test the connection to the LinkedIn API",
    {},
    async () => {
      try {
        const result = await linkedinClient.testConnection();
        
        if (result.success) {
          return {
            content: [
              {
                type: "text",
                text: `✅ LinkedIn API connection successful.\n\n${result.message}\n\n${result.details && result.details.firstName ? `User: ${result.details.firstName} ${result.details.lastName} (${result.details.userId})` : ''}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `❌ LinkedIn API connection failed.\n\n${result.message}\n\n${result.details && result.details.authUrl ? `Please visit http://localhost:${OAUTH_PORT}${result.details.authUrl} to authorize the application.` : ''}`,
              },
            ],
          };
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `❌ Error testing LinkedIn API connection: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

// Tool for creating a LinkedIn post immediately
server.tool(
  "post-to-linkedin",
  "Create and publish a post to LinkedIn immediately",
  {
    content: PostContentSchema,
  },
  async ({ content }) => {
    try {
      const result = await linkedinClient.createPost(content);
      return {
        content: [
          {
            type: "text",
            text: `Successfully published LinkedIn post. ${result}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error posting to LinkedIn: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool for scheduling a LinkedIn post
server.tool(
  "schedule-linkedin-post",
  "Schedule a post to LinkedIn for future publication",
  {
    content: PostContentSchema,
    schedule: ScheduleSchema,
  },
  async ({ content, schedule }) => {
    try {
      const result = await linkedinClient.schedulePost(content, schedule);
      return {
        content: [
          {
            type: "text",
            text: `Successfully scheduled LinkedIn post. ${result}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error scheduling LinkedIn post: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool for getting pending scheduled posts
server.tool(
  "get-scheduled-posts",
  "Get a list of pending scheduled LinkedIn posts",
  {},
  async () => {
    try {
      const scheduledPosts = await linkedinClient.getScheduledPosts();
      return {
        content: [
          {
            type: "text",
            text: `Scheduled LinkedIn posts:\n\n${scheduledPosts}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching scheduled posts: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool for deleting a scheduled post
server.tool(
  "delete-scheduled-post",
  "Delete a scheduled LinkedIn post that hasn't been published yet",
  {
    postId: z.string().describe("The ID of the scheduled post to delete"),
  },
  async ({ postId }) => {
    try {
      const result = await linkedinClient.deleteScheduledPost(postId);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error deleting scheduled post: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// Tool for controlling the scheduler
server.tool(
  "control-scheduler",
  "Control the LinkedIn post scheduler service",
  {
    action: z.enum(["start", "stop", "status", "process"]).describe(
      "The action to perform on the scheduler",
    ),
  },
  async ({ action }) => {
    try {
      let result: string;

      switch (action) {
        case "start":
          schedulerService.start();
          result = "Scheduler service started successfully";
          break;
        case "stop":
          schedulerService.stop();
          result = "Scheduler service stopped successfully";
          break;
        case "status":
          const status = schedulerService.getStatus();
          result = `Scheduler service status: ${status.running ? "Running" : "Stopped"
            }\nCheck interval: ${status.checkIntervalMs}ms`;
          break;
        case "process":
          const publishedCount = await schedulerService
            .manuallyProcessDuePosts();
          result =
            `Manually processed scheduled posts. Published ${publishedCount} posts.`;
          break;
      }

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error controlling scheduler: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  },
)

}


// Start the server
async function main() {
  const portAvailable = await findAvailablePort(OAUTH_PORT);
  
  if (!portAvailable) {
    SimpleLogger.error(`Preferred port ${OAUTH_PORT} is in use.`);
    
      SimpleLogger.info(`Attempting to kill process on port ${OAUTH_PORT}...`);
      const killed = await killProcessOnPort(OAUTH_PORT);
      
      if (killed) {
        SimpleLogger.info(`Successfully killed process on port ${OAUTH_PORT}`);
        // Give the system a moment to release the port
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        SimpleLogger.error(`Failed to kill process on port ${OAUTH_PORT}`);
      }
  }
  // Start the OAuth server
  SimpleLogger.info(`Starting LinkedIn OAuth server on port ${OAUTH_PORT}...`);
  const oauthProvider = await startOAuthServer(
    LINKEDIN_CLIENT_ID!,
    LINKEDIN_CLIENT_SECRET!,
    LINKEDIN_USER_ID!,
    OAUTH_PORT,
    tokenStorage
  );


  
  // Create LinkedIn client
  linkedinClient = new LinkedInAPI(oauthProvider, LINKEDIN_USER_ID!);

    // Create scheduler service
  schedulerService = new SchedulerService(linkedinClient);

  
  // Register tools
  await registerTools();

  // Start the scheduler service
  schedulerService.start();


  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("LinkedIn MCP Server started and connected to transport");
}

main().catch((error) => {
  logger.error(`Error starting server: ${error.message}`);
  mongoClient.close().catch((err) => {
    logger.error(`Error closing MongoDB connection: ${err.message}`);
  });
  Deno.exit(1);
});

// Add shutdown handlers
for (const signal of ["SIGINT", "SIGTERM"]) {
  Deno.addSignalListener(signal as Deno.Signal, async () => {
    logger.info(`Received ${signal}, shutting down...`);

    // Stop the scheduler
    schedulerService.stop();

    // Close MongoDB connection
    await mongoClient.close();

    logger.info("Server shutdown complete");
    Deno.exit(0);
  });
}

// Import missing types
import { ConsoleHandler } from "@log";
import { SimpleLogger } from "./utils/logger.ts";
import { FileTokenStorage, startOAuthServer } from "./services/oauth.ts";
import { MongoTokenStorage } from "./db/models/tokenStorage.ts";
import { findAvailablePort, killProcessOnPort } from "./utils/port.ts";

