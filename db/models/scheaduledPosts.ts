// db/models/scheduledPost.ts - Data model for scheduled LinkedIn posts
import { ObjectId } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import mongoClient from "../mongo.ts";
import { PostContent } from "../../linkedin_api.ts";

// Interface representing a scheduled post document in MongoDB
export interface ScheduledPostSchema {
  _id?: ObjectId;
  content: {
    text: string;
    imageUrl?: string;
  };
  scheduledTime: Date;
  status: "pending" | "published" | "failed";
  createdAt: Date;
  updatedAt: Date;
  error?: string;
  publishedAt?: Date;
  publishedPostId?: string;
}

// Class for managing scheduled posts in MongoDB
export class ScheduledPostModel {
  static collection = "scheduledPosts";

  /**
   * Create a new scheduled post
   */
  static async create(content: PostContent, scheduledTime: string): Promise<ScheduledPostSchema> {
    const db = await mongoClient.connect();
    const postsCollection = db.collection<ScheduledPostSchema>(this.collection);
    
    const scheduledPost: Omit<ScheduledPostSchema, "_id"> = {
      content,
      scheduledTime: new Date(scheduledTime),
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const id = await postsCollection.insertOne(scheduledPost);
    
    return {
      _id: id,
      ...scheduledPost,
    };
  }

  /**
   * Get all scheduled posts with optional filtering
   */
  static async getAll(filter: Partial<ScheduledPostSchema> = {}): Promise<ScheduledPostSchema[]> {
    const db = await mongoClient.connect();
    const postsCollection = db.collection<ScheduledPostSchema>(this.collection);
    
    return await postsCollection.find(filter).sort({ scheduledTime: 1 }).toArray();
  }

  /**
   * Get scheduled posts due for publishing
   */
  static async getDuePosts(): Promise<ScheduledPostSchema[]> {
    const db = await mongoClient.connect();
    const postsCollection = db.collection<ScheduledPostSchema>(this.collection);
    
    return await postsCollection.find({
      status: "pending",
      scheduledTime: { $lte: new Date() }
    }).toArray();
  }

  /**
   * Get a single scheduled post by ID
   */
  static async getById(id: string): Promise<ScheduledPostSchema | null> {
    const db = await mongoClient.connect();
    const postsCollection = db.collection<ScheduledPostSchema>(this.collection);
    
    return await postsCollection.findOne({ _id: new ObjectId(id) });
  }

  /**
   * Update a scheduled post
   */
  static async update(id: string, update: Partial<ScheduledPostSchema>): Promise<boolean> {
    const db = await mongoClient.connect();
    const postsCollection = db.collection<ScheduledPostSchema>(this.collection);
    
    const result = await postsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updatedAt: new Date() } }
    );
    
    return result.matchedCount > 0;
  }

  /**
   * Mark a post as published
   */
  static async markAsPublished(id: string, publishedPostId: string): Promise<boolean> {
    return await this.update(id, {
      status: "published",
      publishedAt: new Date(),
      publishedPostId
    });
  }

  /**
   * Mark a post as failed
   */
  static async markAsFailed(id: string, error: string): Promise<boolean> {
    return await this.update(id, {
      status: "failed",
      error
    });
  }

  /**
   * Delete a scheduled post
   */
  static async delete(id: string): Promise<boolean> {
    const db = await mongoClient.connect();
    const postsCollection = db.collection<ScheduledPostSchema>(this.collection);
    
    const result = await postsCollection.deleteOne({ _id: new ObjectId(id) });
    
    return result.deletedCount > 0;
  }
}
