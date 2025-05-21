export class SimpleLogger {
  static info(message: string): void {
    console.error(`# [INFO] ${message}`);
  }

  static warn(message: string): void {
    console.error(`# [WARN] ${message}`);
  }

  static error(message: string): void {
    console.error(`# [ERROR] ${message}`);
  }

  static debug(message: string): void {
    console.error(`# [DEBUG] ${message}`);
  }
}
