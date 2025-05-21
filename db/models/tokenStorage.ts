// db/mongo_token_storage.ts - MongoDB-based token storage
import { SimpleLogger } from "../../utils/logger.ts";
import { TokenStorage } from "../../services/oauth.ts";
import mongoClient from "../mongo.ts";

// Interface for token document in MongoDB
interface TokenDocument {
  _id?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// MongoDB implementation of token storage
export class MongoTokenStorage implements TokenStorage {
  accessToken: string = "";
  refreshToken: string = "";
  expiresAt: number = 0;
  userId: string = "";
  
  private collection: string = "tokens";
  private tokenId: string = "current"; // We'll use a fixed ID for simplicity
  
  
  /**
   * Save token data to MongoDB
   */
  async save(): Promise<void> {
    try {
      const db = await mongoClient.connect();
      const collection = db.collection<TokenDocument>(this.collection);

      
      const tokenData: TokenDocument = {
        _id: this.tokenId,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt,
        userId: this.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Use upsert to insert or update
      await collection.updateOne(
        { _id: this.tokenId },
        { $set: tokenData },
        { upsert: true }
      );
      
      SimpleLogger.info(`Token data saved to MongoDB with ID: ${this.tokenId}`);
    } catch (error: any) {
      SimpleLogger.error(`Error saving token data to MongoDB: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Load token data from MongoDB
   */
  async load(): Promise<boolean> {
    try {
      const db = await mongoClient.connect();
      const collection = db.collection<TokenDocument>(this.collection);
      
      const tokenData = await collection.findOne({ _id: this.tokenId });
      
      if (!tokenData) {
        SimpleLogger.info(`No token data found in MongoDB with ID: ${this.tokenId}`);
        return false;
      }
      
      this.accessToken = tokenData.accessToken;
      this.refreshToken = tokenData.refreshToken;
      this.expiresAt = tokenData.expiresAt;
      this.userId = tokenData.userId;
      
      SimpleLogger.info(`Token data loaded from MongoDB with ID: ${this.tokenId}`);
      return true;
    } catch (error: any) {

      SimpleLogger.error(`Error loading token data from MongoDB: ${error.message}`);
      return false;
    }
  }
  
}
