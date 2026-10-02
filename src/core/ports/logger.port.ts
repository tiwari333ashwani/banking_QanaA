export interface StructuredLogEntry {
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  operation: string;
  component: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface ILoggerProvider {
  info(operation: string, component: string, message: string, details?: Record<string, unknown>): Promise<void>;
  warn(operation: string, component: string, message: string, details?: Record<string, unknown>): Promise<void>;
  error(operation: string, component: string, message: string, details?: Record<string, unknown>): Promise<void>;
}
