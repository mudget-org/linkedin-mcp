# LinkedIn MCP Server with 3-Legged OAuth

This MCP server allows Claude Desktop to create and publish LinkedIn posts on your behalf using 3-legged OAuth authentication. This means the server will authenticate as you rather than using a system account.

## Features

- Authenticate with LinkedIn using 3-legged OAuth
- Create and publish LinkedIn posts immediately
- Test LinkedIn API connection
- Check authentication status
- Simulation mode for testing without LinkedIn API access
- Schedule LinkedIn posts for future publication
- View pending scheduled posts
- Delete scheduled posts
- Control the scheduler service

## Prerequisites

- [Deno](https://deno.com/) 1.34.0 or higher
- MongoDB (local installation or using Docker)
- LinkedIn API credentials (Client ID, Client Secret, and User ID)
- Claude Desktop

## LinkedIn App Setup

Before you can use this server, you need to create a LinkedIn application:

1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
2. Click "Create App"
3. Fill in the required information:
   - App name: "Claude LinkedIn Integration" (or your preferred name)
   - LinkedIn Page: Your LinkedIn page or your personal profile
   - App Logo: Upload an image
4. Under "Products", select "Sign In with LinkedIn" and "Share on LinkedIn API"
5. Under "Auth" section:
   - Add the redirect URL: `http://localhost:8000/oauth/callback`
   - (Use the port you specified in the OAUTH_PORT environment variable)
6. Note your Client ID and Client Secret

## Installation

1. Clone this repository and set up your environment:

```bash
git clone https://github.com/yourusername/linkedin-mcp-server.git
cd linkedin-mcp-server
cp .env.example .env
```

2. Edit the `.env` file with your LinkedIn API credentials:

```
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_USER_ID=your_user_id
MONGODB_URI=mongodb://admin:password@localhost:27017/linkedin?authSource=admin
OAUTH_PORT=8000
USE_SIMULATION=false
DEBUG=false
```

## Running the Server

To run the server with OAuth support:

```bash
deno run --allow-net --allow-env --allow-read --allow-write main.ts
```

This will:
1. Start the MCP server for Claude Desktop
2. Start a web server on the port specified in `OAUTH_PORT` (default: 8000)
3. Log instructions for authorizing with LinkedIn

## Running MongoDB with Docker

The easiest way to run the database is with Docker Compose:

```bash
docker-compose up -d
```

## Authentication Process

When you first start the server, you'll need to authenticate with LinkedIn:

1. Visit `http://localhost:8000/oauth/authorize` in your web browser
2. Log in to LinkedIn if necessary
3. Authorize the application to access your LinkedIn account
4. You'll be redirected back to the local server, which will complete the authentication process

After successful authentication, the server will save the access token to a file so you don't need to re-authenticate each time you start the server.

## Claude Desktop Configuration

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
         "command": "/path/to/deno",
         "args": ["run", "--allow-env", "--allow-net", "--allow-read", "--allow-write", "/path/to/linkedin-mcp-server/main_oauth.ts"],
         "env": {
           "LINKEDIN_CLIENT_ID": "your_client_id_here",
           "LINKEDIN_CLIENT_SECRET": "your_client_secret_here",
           "LINKEDIN_USER_ID": "your_user_id",
           "MONGODB_URI": "mongodb://admin:password@localhost:27017/linkedin?authSource=admin",
           "NO_COLOR": "1",
           "DENO_NO_COLOR": "1",
           "OAUTH_PORT": "8000"
         }
       }
     }
   }
   ```

   Replace `/path/to/deno` with the absolute path to your Deno executable and `/path/to/linkedin-mcp-server/main.ts` with the absolute path to the `main.ts` file.

3. Save the file and restart Claude Desktop.

## Using the Tools in Claude

Once configured, Claude will have access to the following tools:

### 1. Get Authentication Status

Use this tool to check if you're authenticated with LinkedIn:

```
get-auth-status
```

If you're not authenticated, Claude will provide a link to authenticate.

### 2. Test LinkedIn Connection

Use this tool to test the LinkedIn API connection:

```
test-linkedin-connection
```

This will verify that the authentication is working and that the server can connect to the LinkedIn API.

### 3. Post to LinkedIn

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

- "Share this article on LinkedIn with my thoughts."
- "Create a LinkedIn post announcing our quarterly results."
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


## Troubleshooting

### Authentication Issues

If you encounter authentication issues:

1. Check if the OAuth server is running:
   - Visit `http://localhost:8000/oauth/status` to see the current authentication status
   - If the server isn't running, make sure the OAUTH_PORT is not being used by another application

2. Re-authenticate:
   - Visit `http://localhost:8000/oauth/authorize` to start a new authentication flow
   - Check for any error messages in the browser or server logs

3. Token issues:
   - If you're getting token expired errors, delete the `token_storage.json` file and re-authenticate
   - Make sure your LinkedIn app has the necessary permissions (r_liteprofile, r_emailaddress, w_member_social)

### LinkedIn API Issues

Common LinkedIn API errors:

1. **403 Forbidden**: Your application may not have been approved for the Share API. LinkedIn requires app review for production use of the Share API. For development, you can use the app while in "Development" mode, but only authorized users (developers added to the app) can use it.

2. **401 Unauthorized**: The access token may be invalid or expired. Re-authenticate using the `/oauth/authorize` endpoint.

3. **400 Bad Request**: Check for formatting issues in your post content. LinkedIn has specific requirements for post content.

### Simulation Mode

If you're having trouble with the LinkedIn API or just want to test the MCP server, you can enable simulation mode by setting `USE_SIMULATION=true` in your `.env` file. This will simulate successful responses from the LinkedIn API without actually posting to LinkedIn.

## Security Considerations

- The access token is stored in a file called `token_storage.json`. Keep this file secure as it grants access to post on your LinkedIn account.
- The OAuth server only binds to localhost, so it's not accessible from outside your machine.
- Review all posts before Claude submits them to ensure they meet your standards.

## Development

To modify or extend this server:

1. The server is built using Deno, which is a secure JavaScript/TypeScript runtime.
2. Files are organized as follows:
   - `main_oauth.ts`: Main MCP server with OAuth support
   - `oauth_server.ts`: Web server for LinkedIn OAuth flow
   - `linkedin_api_oauth.ts`: LinkedIn API client with 3-legged OAuth support
   - `simple-logger.ts`: Simple logging utility

To add new features:
1. Modify the appropriate files
2. Update the MCP server tools in `main_oauth.ts`
3. Test with Claude Desktop

## License

MIT
