// main.ts
import { MCPServer, ToolCallResult, ToolRegistry } from "@mcp";
import { load } from "@env";
import { LinkedInClient } from "./linkedinClient.ts";
import { LinkedInPostRequestSchema, LinkedInPostResponseSchema } from "./schemas.ts";
import * as log from "@log";

// Configure logging
await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG", {
      formatter: (record) => {
        const time = new Date().toISOString();
        return `${time} [${record.levelName}] ${record.msg}`;
      },
    }),
  },
  loggers: {
    default: {
      level: "DEBUG",
      handlers: ["console"],
    },
  },
});

const logger = log.getLogger();
logger.info("Starting LinkedIn MCP server...");

// Load environment variables
await load({ export: true });

// Validate required environment variables
const accessToken = Deno.env.get("LINKEDIN_ACCESS_TOKEN");
const personId = Deno.env.get("LINKEDIN_PERSON_ID");
const debugMode = Deno.env.get("DEBUG_MODE") === "true";

if (!accessToken || !personId) {
  logger.error("Missing required environment variables. Please set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_ID.");
  Deno.exit(1);
}

// Initialize LinkedIn Client
const linkedInClient = new LinkedInClient({
  accessToken,
  personId,
  debugMode,
});
logger.info("LinkedIn client initialized successfully");

// Create the tool registry
const toolRegistry = new ToolRegistry();

// Register the createPost tool
toolRegistry.registerTool({
  name: "create_post",
  description: "Create a LinkedIn post. Optionally schedule it for a future time.",
  inputSchema: LinkedInPostRequestSchema,
  handler: async (params): Promise<ToolCallResult> => {
    try {
      // Parse and validate input parameters
      const validatedParams = LinkedInPostRequestSchema.parse(params);
      logger.info(`Tool 'create_post' called with content: ${validatedParams.content}`);
      
      // Create LinkedIn post
      const postId = await linkedInClient.createPost(
        validatedParams.content, 
        validatedParams.schedule_time
      );
      
      // Create successful response
      const response = LinkedInPostResponseSchema.parse({
        success: true,
        post_id: postId,
        message: "Post created successfully"
      });
      
      return { result: response };
    } catch (error) {
      // Handle validation errors
      if (error.name === "ZodError") {
        logger.error(`Validation error: ${JSON.stringify(error.errors)}`);
        return {
          error: {
            code: "invalid_params",
            message: `Parameter validation failed: ${error.message}`
          }
        };
      }
      
      // Handle LinkedIn API errors
      logger.error(`Error creating LinkedIn post: ${error.message}`);
      return {
        error: {
          code: "tool_execution_error",
          message: `Failed to create post: ${error.message}`
        }
      };
    }
  }
});

// Create the MCP server
const server = new MCPServer({
  toolRegistry,
  instructions: "A server for creating LinkedIn posts",
  protocolVersion: "2024-11-05"
});

// Start the MCP server
try {
  // Use standard input/output for MCP communication
  await server.listen(Deno.stdin, Deno.stdout);
  logger.info("MCP server started and listening on stdin/stdout");
  
  // Handle graceful shutdown
  Deno.addSignalListener("SIGINT", () => {
    logger.info("Received termination signal, shutting down...");
    Deno.exit(0);
  });
} catch (error) {
  logger.error(`Error starting MCP server: ${error.message}`);
  Deno.exit(1);
}
