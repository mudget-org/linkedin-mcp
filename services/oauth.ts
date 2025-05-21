// oauth_server.ts - Web server for OAuth authorization
import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { SimpleLogger } from "../utils/logger.ts";

// Storage for tokens
export interface TokenStorage {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  save(): Promise<void>;
  load(): Promise<boolean>;
}

// File-based token storage
export class FileTokenStorage implements TokenStorage {
  accessToken: string = "";
  refreshToken: string = "";
  expiresAt: number = 0;
  userId: string = "";
  private filePath: string;

  constructor(filePath: string = "./token_storage.json") {
    this.filePath = filePath;
  }

  async save(): Promise<void> {
    const data = {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
      userId: this.userId
    };

    await Deno.writeTextFile(this.filePath, JSON.stringify(data, null, 2));
    SimpleLogger.info(`Token data saved to ${this.filePath}`);
  }

  async load(): Promise<boolean> {
    try {
      const text = await Deno.readTextFile(this.filePath);
      const data = JSON.parse(text);

      this.accessToken = data.accessToken || "";
      this.refreshToken = data.refreshToken || "";
      this.expiresAt = data.expiresAt || 0;
      this.userId = data.userId || "";

      SimpleLogger.info(`Token data loaded from ${this.filePath}`);
      return true;
    } catch (error: any) {
      SimpleLogger.info(`No token data found or error loading: ${error.message}`);
      return false;
    }
  }
}

// LinkedIn OAuth provider
export class LinkedInOAuthProvider {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  public tokenStorage: TokenStorage;
  private authUrl = "https://www.linkedin.com/oauth/v2/authorization";
  private tokenUrl = "https://www.linkedin.com/oauth/v2/accessToken";
  private scope = "w_member_social";

  constructor(clientId: string, clientSecret: string, userId: string, redirectUri: string, tokenStorage:
    TokenStorage) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.tokenStorage = tokenStorage;
    this.tokenStorage.userId = userId;
  }

  /**
  * Get the authorization URL for the user to visit
  */
  getAuthorizationUrl(): string {
    const state = crypto.randomUUID();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: this.scope
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  /**
  * Exchange the authorization code for an access token
  */
  async exchangeCodeForToken(code: string): Promise<void> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret
    });

    const response = await fetch(this.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to exchange code for token: ${response.status} ${text}`);
    }

    const data = await response.json();

    this.tokenStorage.accessToken = data.access_token;
    this.tokenStorage.refreshToken = data.refresh_token || "";
    this.tokenStorage.expiresAt = Date.now() + (data.expires_in * 1000);

    // Save the token data
    await this.tokenStorage.save();
  }

  /**
  * Refresh the access token
  */
  async refreshToken(): Promise<boolean> {
    if (!this.tokenStorage.refreshToken) {
      return false;
    }

    try {
      const params = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokenStorage.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret
      });

      const response = await fetch(this.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.status}`);
      }

      const data = await response.json();

      this.tokenStorage.accessToken = data.access_token;
      if (data.refresh_token) {
        this.tokenStorage.refreshToken = data.refresh_token;
      }
      this.tokenStorage.expiresAt = Date.now() + (data.expires_in * 1000);

      await this.tokenStorage.save();
      return true;
    } catch (error: any) {
      SimpleLogger.error(`Error refreshing token: ${error.message}`);
      return false;
    }
  }

  /**
  * Get a valid access token
  */
  async getAccessToken(): Promise<string> {
    // If token is expired or about to expire, refresh it
    if (this.tokenStorage.expiresAt < Date.now() + 5 * 60 * 1000) {
      const refreshed = await this.refreshToken();
      if (!refreshed) { throw new Error("Failed to refresh token and current token is expired"); }
    } return this.tokenStorage.accessToken;
  } /** * Check if we have a valid token */ 
  async hasValidToken():
    Promise<boolean> {
    if (!this.tokenStorage.accessToken) {
      return false;
    }

    if (this.tokenStorage.expiresAt < Date.now()) { // Try to refresh the token return await
      this.refreshToken();
    } return true;
  }
} /** * Create and start the OAuth server */ 
export async function startOAuthServer(clientId: string, clientSecret: string, userId: string, port: number = 8000, tokenStorage:
  TokenStorage = new FileTokenStorage()): Promise<LinkedInOAuthProvider> {
  const app = new Application();
  const router = new Router();

  // Create the redirect URI based on the port
  const redirectUri = `http://localhost:${port}/oauth/callback`;

  // Create the OAuth provider
  const oauthProvider = new LinkedInOAuthProvider(
    clientId,
    clientSecret,
    userId,
    redirectUri,
    tokenStorage
  );

  // Load any existing token data
  await tokenStorage.load();

  // Routes
  router.get("/oauth/authorize", (ctx: any) => {
    const authUrl = oauthProvider.getAuthorizationUrl();
    ctx.response.redirect(authUrl);
  });

  router.get("/oauth/callback", async (ctx: any) => {
    const code = ctx.request.url.searchParams.get("code");
    const error = ctx.request.url.searchParams.get("error");

    if (error) {
      SimpleLogger.error(`OAuth error: ${error}`);
      ctx.response.status = 400;
      ctx.response.body = `
                  <html>

                  <head>
                    <title>LinkedIn OAuth Error</title>
                  </head>

                  <body>
                    <h1>OAuth Error</h1>
                    <p>Error: ${error}</p>
                    <p><a href="/oauth/authorize">Try Again</a></p>
                  </body>

                  </html>
                  `;
      return;
    }

    if (!code) {
      ctx.response.status = 400;
      ctx.response.body = "Missing authorization code";
      return;
    }

    try {
      await oauthProvider.exchangeCodeForToken(code);

      ctx.response.body = `
                  <html>

                  <head>
                    <title>LinkedIn OAuth Success</title>
                  </head>

                  <body>
                    <h1>Authorization Successful</h1>
                    <p>You have successfully authorized the LinkedIn MCP server to post on your behalf.</p>
                    <p>You can now close this window and return to the application.</p>
                    <script>
                      // Close window after 5 seconds
                      setTimeout(() => {
                        window.close();
                      }, 5000);
                    </script>
                  </body>

                  </html>
                  `;
    } catch (error: any) {
      SimpleLogger.error(`Error exchanging code for token: ${error.message}`);
      ctx.response.status = 500;
      ctx.response.body = `
                  <html>

                  <head>
                    <title>LinkedIn OAuth Error</title>
                  </head>

                  <body>
                    <h1>OAuth Error</h1>
                    <p>Error: ${error.message}</p>
                    <p><a href="/oauth/authorize">Try Again</a></p>
                  </body>

                  </html>
                  `;
    }
  });

  router.get("/oauth/status", async (ctx: any) => {
    const hasToken = await oauthProvider.hasValidToken();

    ctx.response.type = "application/json";
    ctx.response.body = {
      authenticated: hasToken,
      userId: tokenStorage.userId,
      expiresAt: hasToken ? new Date(tokenStorage.expiresAt).toISOString() : null
    };
  });

  // Add the router middleware
  app.use(router.routes());
  app.use(router.allowedMethods());

  // Start the server
  app.listen({ port });

  SimpleLogger.info(`OAuth server started at http://localhost:${port}`);
  SimpleLogger.info(`Authorization URL: http://localhost:${port}/oauth/authorize`);

  return oauthProvider;
}
