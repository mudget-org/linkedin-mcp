# LinkedIn Post Creator for Claude

A Model Context Protocol (MCP) tool that allows Claude to create and schedule LinkedIn posts on your behalf.

## Overview

This tool enables Claude to post content to LinkedIn directly through a simple API. It uses the Model Context Protocol (MCP) to integrate with Claude Desktop, allowing for a seamless experience when you want to draft and publish LinkedIn content with AI assistance.

Features:
- Create LinkedIn posts with custom content
- Schedule posts for future publication
- Secure handling of LinkedIn API credentials
- Debug mode for testing without posting to LinkedIn

## Installation

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (1.76.0 or newer)
- [Claude Desktop](https://claude.ai/desktop)
- [LinkedIn Developer Account](https://www.linkedin.com/developers/) with API access

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/linkedin-mcp-server.git
   cd linkedin-mcp-server
   ```

2. Create an `.env` file with your LinkedIn credentials:
   ```
   LINKEDIN_ACCESS_TOKEN=your_access_token_here
   LINKEDIN_PERSON_ID=your_linkedin_person_id
   SERVER_ADDRESS=0.0.0.0:3500
   LOG_LEVEL=info
   DEBUG_MODE=true  # Set to false in production
   ```

3. Build the project:
   ```bash
   cargo build --release
   ```

## Integrating with Claude Desktop

To use this tool with Claude Desktop, you need to create a wrapper script and update Claude's `mcpServers.json` file.

### Step 1: Create a Wrapper Script

Create a file named `run_linkedin_server.sh` (Linux/macOS) or `run_linkedin_server.bat` (Windows):

**For macOS/Linux:**
```bash
#!/bin/bash

# Set environment variables explicitly
export LINKEDIN_ACCESS_TOKEN="your_access_token_here"
export LINKEDIN_PERSON_ID="your_linkedin_person_id"
export SERVER_ADDRESS="0.0.0.0:3500"
export LOG_LEVEL="info"
export DEBUG_MODE="true"  # Set to false when ready for real posting

# Change to the directory containing your Rust project
cd /ABSOLUTE/PATH/TO/YOUR/linkedin-mcp-server

# Run the project
cargo run --release
```

Make it executable:
```bash
chmod +x run_linkedin_server.sh
```

**For Windows:**
```batch
@echo off
rem Set environment variables explicitly
set LINKEDIN_ACCESS_TOKEN=your_access_token_here
set LINKEDIN_PERSON_ID=your_linkedin_person_id
set SERVER_ADDRESS=0.0.0.0:3500
set LOG_LEVEL=info
set DEBUG_MODE=true

cd /d C:\ABSOLUTE\PATH\TO\YOUR\linkedin-mcp-server
cargo run --release
```

### Step 2: Configure Claude Desktop

1. Locate the `mcpServers.json` file:
   - On macOS: `~/Library/Application Support/Claude/mcpServers.json`
   - On Windows: `%APPDATA%\Claude\mcpServers.json`
   - On Linux: `~/.config/Claude/mcpServers.json`

2. Edit the file to add your LinkedIn tool:

```json
{
    "mcpServers": {
        "linkedin_post": {
            "command": "/ABSOLUTE/PATH/TO/YOUR/run_linkedin_server.sh",
            "args": []
        }
    }
}
```

If you already have other tools in this file, add your LinkedIn tool as an additional entry.

3. Restart Claude Desktop

## Using the Tool with Claude

Once configured, you can use the tool in conversations with Claude:

1. Start a new conversation in Claude Desktop
2. Ask Claude to help you create a LinkedIn post:
   ```
   Can you draft a LinkedIn post about our new product launch and post it for me?
   ```

3. Claude will draft the post and use the tool to publish it to LinkedIn
4. To schedule a post for the future, specify a time:
   ```
   Draft a LinkedIn post about our upcoming webinar and schedule it for next Monday at 9am.
   ```

## Example Prompts

- "Create a LinkedIn post announcing our new partnership with Acme Corp."
- "Draft a professional LinkedIn update about my recent promotion to Director of Marketing."
- "Help me write a LinkedIn post about our industry conference and schedule it for Tuesday next week."
- "Create a LinkedIn post sharing our quarterly results."

## Troubleshooting

### Tool Not Available in Claude

- Make sure your server is configured correctly in `mcpServers.json`
- Check that the paths in your wrapper script are correct
- Restart Claude Desktop
- Look for error messages in Claude's console

### Authentication Issues

- Verify your LinkedIn API credentials are correct
- Ensure your access token has the appropriate permissions
- Check that the environment variables are set correctly in your wrapper script

### Port Conflicts

If you see an error like "Address already in use":

1. Change the port in your wrapper script and server configuration
2. Ensure no other instance of the server is running
3. Check if another application is using the same port

## Development

### Debug Mode

Set `DEBUG_MODE=true` in your environment variables to prevent actual posts to LinkedIn during testing.

### Logging

Adjust the `LOG_LEVEL` environment variable to control logging verbosity:
- `trace`: Most detailed
- `debug`: Development information
- `info`: General information (default)
- `warn`: Warnings only
- `error`: Errors only

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Built with Rust and the RMCP framework
- Uses the LinkedIn API for post creation
- Integrates with Claude AI through the Model Context Protocol
