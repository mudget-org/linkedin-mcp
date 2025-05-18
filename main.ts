// main.ts - Enhanced LinkedIn MCP Server for Claude Desktop
import { McpServer } from "npm:@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "npm:@modelcontextprotocol/sdk/server/stdio.js";
import { LinkedInAPI, PostContentSchema, ScheduleSchema } from "./linkedin_api.ts";

// Load environment variables
const LINKEDIN_API_KEY = Deno.env.get("LINKEDIN_API_KEY");
const LINKEDIN_USER_ID = Deno.env.get("LINKEDIN_USER_ID");

if (!LINKEDIN_API_KEY || !LINKEDIN_USER_ID) {
  console.error("Error: Required environment variables are missing.");
  console.error("Please set LINKEDIN_API_KEY and LINKEDIN_USER_ID environment variables.");
  Deno.exit(1);
}

// Create LinkedIn API client
const linkedinClient = new LinkedInAPI(LINKEDIN_API_KEY, LINKEDIN_USER_ID);

// Create server instance
const server = new McpServer({
  name: "linkedin-mcp-server",
  version: "1.0.0",
});

// Register tools

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
    } catch (error) {
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
  }
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
    } catch (error) {
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
  }
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
            text: `Pending scheduled posts:\n\n${scheduledPosts}`,
          },
        ],
      };
    } catch (error) {
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
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("LinkedIn MCP Server started and connected to transport");
}

main().catch((error) => {
  console.error("Error starting server:", error);
  Deno.exit(1);
});
