# LinkedIn MCP Server for Claude Desktop

This MCP server allows Claude Desktop to create and schedule LinkedIn posts on your behalf. The server is built using Deno and implements the Model Context Protocol (MCP).

## Features

- Create and publish LinkedIn posts immediately
- Schedule LinkedIn posts for future publication
- View pending scheduled posts

## Prerequisites

- [Deno](https://deno.com/) 1.34.0 or higher
- LinkedIn API credentials (API Key and User ID)
- Claude Desktop

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/linkedin-mcp-server.git
   cd linkedin-mcp-server
   ```

2. Set up environment variables for your LinkedIn API credentials:

   **macOS/Linux:**
   ```bash
   export LINKEDIN_API_KEY="your-api-key-here"
   export LINKEDIN_USER_ID="your-user-id-here"
   ```

   **Windows:**
   ```cmd
   set LINKEDIN_API_KEY=your-api-key-here
   set LINKEDIN_USER_ID=your-user-id-here
   ```

## Usage with Claude Desktop

1. Configure Claude Desktop to use this MCP server by editing the configuration file:

   **macOS:**
   ```
   ~/Library/Application Support/Claude/claude_desktop_config.json
   ```

   **Windows:**
   ```
   %APPDATA%\Claude\claude_desktop_config.json
   ```

2. Add the following configuration to the file:

   ```json
   {
     "mcpServers": {
       "linkedin": {
         "command": "deno",
         "args": ["run", "--allow-env", "--allow-net", "/path/to/linkedin-mcp-server/main.ts"],
         "env": {
           "LINKEDIN_API_KEY": "your-api-key-here",
           "LINKEDIN_USER_ID": "your-user-id-here"
         }
       }
     }
   }
   ```

   Replace `/path/to/linkedin-mcp-server/main.ts` with the absolute path to the `main.ts` file, and fill in your actual LinkedIn API credentials.

3. Save the file and restart Claude Desktop.

## Using the Tools in Claude

Once configured, Claude will have access to the following tools:

1. **post-to-linkedin**: Create and publish a post to LinkedIn immediately
   - Parameters:
     - `content.text`: The text content of the post
     - `content.imageUrl` (optional): URL to an image to include with the post

2. **schedule-linkedin-post**: Schedule a post for future publication
   - Parameters:
     - `content.text`: The text content of the post
     - `content.imageUrl` (optional): URL to an image to include with the post
     - `schedule.scheduledTime`: ISO 8601 timestamp for when to post (e.g., "2023-12-15T14:30:00Z")

3. **get-scheduled-posts**: List all pending scheduled posts

Example prompts for Claude:

- "Post a quick update about our new product launch to LinkedIn."
- "Schedule a LinkedIn post for next Monday at 9 AM about our quarterly results."
- "Show me the list of LinkedIn posts I have scheduled."

## LinkedIn API Integration

This server currently includes mock implementations of the LinkedIn API calls. To integrate with the actual LinkedIn API:

1. Apply for API access on the [LinkedIn Developer Portal](https://developer.linkedin.com/)
2. Replace the mock `postToLinkedIn` function in `main.ts` with actual API calls using the LinkedIn API SDK
3. Implement proper error handling and rate limiting

## Security Considerations

- Store your LinkedIn API credentials securely
- Review all posts before Claude submits them
- Be cautious about granting access to post to your LinkedIn account

## License

MIT
