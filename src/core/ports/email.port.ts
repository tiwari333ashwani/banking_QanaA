import { WeeklyPerformanceMetrics } from "../entities/report.entity";

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  recipient: string;
  dispatchedAt: string;
  mode: "SMTP_GMAIL_DIRECT" | "GMAIL_API" | "LOCAL_MOCK";
  savedReportPath?: string;
}

export interface IEmailProvider {
  /**
   * Generates and dispatches the weekly performance email
   */
  sendWeeklyReport(
    recipientEmail: string,
    metrics: WeeklyPerformanceMetrics
  ): Promise<EmailDispatchResult>;
}
