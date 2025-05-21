// utils/port_helper.ts - Utility to find an available port
import { SimpleLogger } from "./logger.ts";

/**
 * Check if a port is available
 * @param port Port number to check
 * @returns Promise resolving to true if the port is available, false otherwise
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  try {
    // Try to create a TCP server on the port
    const listener = Deno.listen({ port });
    
    // If successful, the port is available, so close the listener
    listener.close();
    return true;
  } catch (error) {
    // If an error occurs, the port is in use
    if (error instanceof Deno.errors.AddrInUse) {
      return false;
    }
    
    // For other errors, we'll assume the port is not available
    SimpleLogger.error(`Error checking port ${port}: ${error.message}`);
    return false;
  }
}

/**
 * Find an available port, starting from the provided port
 * @param startPort Port to start checking from
 * @param endPort Maximum port to check (optional, defaults to startPort + 100)
 * @returns Promise resolving to an available port, or null if none found
 */
export async function findAvailablePort(startPort: number, endPort: number = startPort + 100): Promise<number | null> {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  
  // No available port found in the range
  return null;
}

/**
 * Find and kill any process using a specific port (macOS/Linux only)
 * @param port Port number to check
 * @returns Promise resolving to true if successful, false otherwise
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    if (Deno.build.os === "windows") {
      // Windows command
      const process = Deno.run({
        cmd: ["powershell", "-Command", `Stop-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess -Force`],
        stdout: "piped",
        stderr: "piped"
      });
      
      const status = await process.status();
      process.close();
      
      return status.success;
    } else {
      // macOS/Linux command
      const process = Deno.run({
        cmd: ["sh", "-c", `lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`],
        stdout: "piped",
        stderr: "piped"
      });
      
      const status = await process.status();
      process.close();
      
      return status.success;
    }
  } catch (error) {
    SimpleLogger.error(`Error killing process on port ${port}: ${error.message}`);
    return false;
  }
}
