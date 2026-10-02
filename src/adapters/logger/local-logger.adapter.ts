import fs from "fs/promises";
import path from "path";
import { ILoggerProvider, StructuredLogEntry } from "@/core/ports/logger.port";

export class LocalLoggerAdapter implements ILoggerProvider {
  private logDirectory: string;

  constructor(baseStoragePath: string = "./local_storage") {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    this.logDirectory = path.resolve(process.cwd(), baseStoragePath, "logs", yearMonth);
  }

  private async writeLog(entry: StructuredLogEntry): Promise<void> {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
      const today = new Date().toISOString().split("T")[0];
      const logFile = path.join(this.logDirectory, `audit_${today}.log.jsonl`);

      const logLine = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString(),
      }) + "\n";

      await fs.appendFile(logFile, logLine, "utf-8");
    } catch (err) {
      // Fallback to console if file system write fails
      console.error("[LocalLoggerAdapter::writeLog] Failed to append log:", err);
    }
  }

  public async info(operation: string, component: string, message: string, details?: Record<string, unknown>): Promise<void> {
    await this.writeLog({ level: "INFO", operation, component, message, details });
  }

  public async warn(operation: string, component: string, message: string, details?: Record<string, unknown>): Promise<void> {
    await this.writeLog({ level: "WARN", operation, component, message, details });
  }

  public async error(operation: string, component: string, message: string, details?: Record<string, unknown>): Promise<void> {
    await this.writeLog({ level: "ERROR", operation, component, message, details });
  }
}
