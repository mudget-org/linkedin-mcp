// db/mongo.ts - MongoDB client and connection management
import { MongoClient, Database } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { load } from "@env";
import { setup, getLogger } from "@log";

// Configure logging
setup({
  handlers: {
    console: new ConsoleHandler("DEBUG"),
  },
  loggers: {
    default: {
      level: "INFO",
      handlers: ["console"],
    },
  },
});

// Get logger
const logger = getLogger();

// Load environment variables
await load({ export: true });

const MONGODB_URI = Deno.env.get("MONGODB_URI");

if (!MONGODB_URI) {
  logger.error("MongoDB URI not found in environment variables");
  Deno.exit(1);
}

// MongoDB client
class MongoDBClient {
  #client: MongoClient;
  #db: Database | null = null;
  #connected: boolean = false;

  constructor(uri: string) {
    this.#client = new MongoClient();
    logger.info("MongoDB client initialized");
  }

  async connect(): Promise<Database> {
    if (this.#connected && this.#db) {
      return this.#db;
    }
    
    try {
      logger.info(`Connecting to MongoDB at ${MONGODB_URI}`);
      await this.#client.connect(MONGODB_URI);
      
      this.#db = this.#client.database("linkedin");
      this.#connected = true;
      
      logger.info("Successfully connected to MongoDB");
      return this.#db;
    } catch (error) {
      logger.error(`Failed to connect to MongoDB: ${error.message}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.#connected) {
      await this.#client.close();
      this.#connected = false;
      this.#db = null;
      logger.info("MongoDB connection closed");
    }
  }

  get database(): Database | null {
    return this.#db;
  }

  get isConnected(): boolean {
    return this.#connected;
  }
}

// Create a singleton instance
const mongoClient = new MongoDBClient(MONGODB_URI);

// Export the MongoDB client instance
export default mongoClient;

// Add a shutdown hook to close the MongoDB connection when the server exits
Deno.addSignalListener("SIGINT", async () => {
  logger.info("Received SIGINT, closing MongoDB connection...");
  await mongoClient.close();
  Deno.exit(0);
});

Deno.addSignalListener("SIGTERM", async () => {
  logger.info("Received SIGTERM, closing MongoDB connection...");
  await mongoClient.close();
  Deno.exit(0);
});

// Import missing types
import { ConsoleHandler } from "@log";
