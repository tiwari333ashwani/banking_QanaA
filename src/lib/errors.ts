/**
 * Universal Enterprise Error Standard
 * Every significant operation identifies:
 * Operation, Component, File, Root cause, Recovery/action, and Execution status.
 */

export type ExecutionStatus = "FAILED" | "RETRYING" | "DEGRADED" | "RESOLVED";

export interface AppErrorPayload {
  operation: string;
  component: string;
  file: string;
  rootCause: string;
  recoveryAction: string;
  executionStatus: ExecutionStatus;
  timestamp: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly operation: string;
  public readonly component: string;
  public readonly file: string;
  public readonly rootCause: string;
  public readonly recoveryAction: string;
  public readonly executionStatus: ExecutionStatus;
  public readonly timestamp: string;
  public readonly details?: Record<string, unknown>;

  constructor(payload: AppErrorPayload) {
    super(`[${payload.component}::${payload.operation}] ${payload.rootCause}`);
    this.name = "AppError";
    this.operation = payload.operation;
    this.component = payload.component;
    this.file = payload.file;
    this.rootCause = payload.rootCause;
    this.recoveryAction = payload.recoveryAction;
    this.executionStatus = payload.executionStatus;
    this.timestamp = payload.timestamp || new Date().toISOString();
    this.details = payload.details;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): AppErrorPayload {
    return {
      operation: this.operation,
      component: this.component,
      file: this.file,
      rootCause: this.rootCause,
      recoveryAction: this.recoveryAction,
      executionStatus: this.executionStatus,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

export class StorageError extends AppError {
  constructor(payload: Omit<AppErrorPayload, "component">) {
    super({ ...payload, component: "StorageProvider" });
    this.name = "StorageError";
  }
}

export class ParserError extends AppError {
  constructor(payload: Omit<AppErrorPayload, "component">) {
    super({ ...payload, component: "PDFParserService" });
    this.name = "ParserError";
  }
}

export class ExamEngineError extends AppError {
  constructor(payload: Omit<AppErrorPayload, "component">) {
    super({ ...payload, component: "ExamEngineService" });
    this.name = "ExamEngineError";
  }
}

export class EmailDispatchError extends AppError {
  constructor(payload: Omit<AppErrorPayload, "component">) {
    super({ ...payload, component: "GmailEmailAdapter" });
    this.name = "EmailDispatchError";
  }
}
