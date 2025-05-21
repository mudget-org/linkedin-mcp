// services/scheduler.ts - Service for handling scheduled post publishing
import { getLogger, setup, formatters, ConsoleHandler } from "@log";
import { LinkedInAPI } from "./linkedin_api.ts";
import { SimpleLogger } from "../utils/logger.ts";

// Configure logging
setup({
  handlers: {
    console: new ConsoleHandler("DEBUG", {
      // Write to stderr instead of stdout
      formatter: formatters.jsonFormatter,
      // Disable colors to prevent formatting issues
      useColors: false,
    }),
  },
  loggers: {
    default: {
      level: "INFO",
      handlers: ["console"],
    },
  },
});


// Get logger
const logger = SimpleLogger;

export class SchedulerService {
  private linkedInApi: LinkedInAPI;
  private intervalId?: number;
  private isRunning = false;
  private checkInterval: number;

  constructor(linkedInApi: LinkedInAPI, checkIntervalMs = 60000) {
    this.linkedInApi = linkedInApi;
    this.checkInterval = checkIntervalMs;
    logger.info(`Scheduler service initialized with check interval of ${checkIntervalMs}ms`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn("Scheduler is already running");
      return;
    }

    logger.info("Starting scheduler service");
    
    // Set up the interval to check for due posts
    this.intervalId = setInterval(async () => {
      await this.processDuePosts();
    }, this.checkInterval);
    
    this.isRunning = true;
    
    // Process any due posts immediately upon starting
    setTimeout(async () => {
      await this.processDuePosts();
    }, 1000);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning || this.intervalId === undefined) {
      logger.warn("Scheduler is not running");
      return;
    }

    logger.info("Stopping scheduler service");
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = undefined;
  }

  /**
   * Process due posts
   */
  private async processDuePosts(): Promise<void> {
    try {
      logger.info("Checking for due posts");
      const publishedCount = await this.linkedInApi.processDueScheduledPosts();
      logger.info(`Published ${publishedCount} due posts`);
    } catch (error: any) {
      logger.error(`Error processing due posts: ${error.message}`);
    }
  }

  /**
   * Manual trigger for processing due posts
   */
  async manuallyProcessDuePosts(): Promise<number> {
    try {
      logger.info("Manually processing due posts");
      return await this.linkedInApi.processDueScheduledPosts();
    } catch (error: any) {
      logger.error(`Error manually processing due posts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the status of the scheduler
   */
  getStatus(): { running: boolean; checkIntervalMs: number } {
    return {
      running: this.isRunning,
      checkIntervalMs: this.checkInterval,
    };
  }
}
