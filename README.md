# LinkedIn MCP Server for Claude Desktop

This MCP server allows Claude Desktop to create and schedule LinkedIn posts on your behalf. The server is built using Deno and implements the Model Context Protocol (MCP) with MongoDB for scheduled post storage.

## Features

- Create and publish LinkedIn posts immediately
- Schedule LinkedIn posts for future publication
- View pending scheduled posts
- Delete scheduled posts
- Control the scheduler service

## Prerequisites

- [Deno](https://deno.com/) 1.34.0 or higher
- MongoDB (local installation or using Docker)
- LinkedIn API credentials (Client ID, Client Secret, and User ID)
- Claude Desktop

## LinkedIn API Setup

To use this server, you'll need LinkedIn API credentials:

1. Create a LinkedIn Developer Application:
   - Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Click "Create App"
   - Fill in the required information about your app
   - Under "Products", request access to "Share on LinkedIn" and "Sign In with LinkedIn"
   - Once approved, note your Client ID and Client Secret

2. Get your LinkedIn User ID:
   - Your LinkedIn User ID is a numeric identifier
   - You can find it in your LinkedIn profile URL or by using the LinkedIn API
   - For example, if your profile URL is `https://www.linkedin.com/in/yourname/`, go to `https://www.linkedin.com/in/yourname/detail/contact-info/` and look for a section with your public profile URL that might show `https://www.linkedin.com/in/yourname-12345678`; the numeric part is your User ID

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/linkedin-mcp-server.git
   cd linkedin-mcp-server
   ```

2. Set up the `.env` file:
   ```
   cp .env.example .env
   ```

3. Edit the `.env` file with your LinkedIn API credentials and MongoDB connection details.

## Running with Docker

The easiest way to run the server is with Docker Compose:

```bash
docker-compose up
```

This will start both the MongoDB container and the LinkedIn MCP server.

## Running Manually

If you prefer to run the components separately:

1. Start MongoDB:
   ```bash
   # If using a local MongoDB installation
   mongod --auth

   # Or use Docker
   docker run -d -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password --name mongo mongo:latest
   ```

2. Run the server:
   ```bash
   deno task start
   ```
   
   Or run manually:
   ```bash
   deno run --allow-net --allow-env --allow-read --allow-write main.ts
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
         "args": ["run", "--allow-env", "--allow-net", "--allow-read", "--allow-write", "/path/to/linkedin-mcp-server/main.ts"],
         "env": {
           "LINKEDIN_CLIENT_ID": "your_client_id_here",
           "LINKEDIN_CLIENT_SECRET": "your_client_secret_here",
           "LINKEDIN_USER_ID": "your_linkedin_user_id",
           "MONGODB_URI": "mongodb://admin:password@localhost:27017/linkedin?authSource=admin"
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

4. **delete-scheduled-post**: Delete a scheduled post that hasn't been published yet
   - Parameters:
     - `postId`: The ID of the scheduled post to delete

5. **control-scheduler**: Control the LinkedIn post scheduler service
   - Parameters:
     - `action`: One of "start", "stop", "status", or "process"

Example prompts for Claude:

- "Post a quick update about our new product launch to LinkedIn."
- "Schedule a LinkedIn post for next Monday at 9 AM about our quarterly results."
- "Show me the list of LinkedIn posts I have scheduled."
- "Delete the scheduled LinkedIn post with ID XYZ."
- "Manually process any scheduled LinkedIn posts that are due now."

## Scheduler Service

The server includes a scheduler service that automatically checks for due posts at regular intervals (default is every minute). The scheduler starts automatically when the server starts.

You can control the scheduler using the `control-scheduler` tool:

- `start`: Start the scheduler if it's stopped
- `stop`: Stop the scheduler
- `status`: Get the current status of the scheduler
- `process`: Manually process due posts immediately

## Security Considerations

- Store your LinkedIn API credentials securely
- Review all posts before Claude submits them
- Be cautious about granting access to post to your LinkedIn account
- The Client Credentials flow used in this implementation grants access only to your own LinkedIn profile

## Troubleshooting

If you encounter any issues:

1. Check the server logs for error messages
2. Verify your LinkedIn API credentials are correct
3. Make sure your MongoDB connection is working
4. Confirm that your LinkedIn application has the necessary permissions

## License

MIT
