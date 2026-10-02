import fs from "fs/promises";
import path from "path";
import { google } from "googleapis";
import { IEmailProvider, EmailDispatchResult } from "@/core/ports/email.port";
import { WeeklyPerformanceMetrics } from "@/core/entities/report.entity";
import { ReportingService } from "@/core/services/reporting.service";
import { EmailDispatchError } from "@/lib/errors";
import { env } from "@/lib/env";

export class GmailApiEmailAdapter implements IEmailProvider {
  private baseStoragePath: string;

  constructor(baseStoragePath: string = "./local_storage") {
    this.baseStoragePath = path.resolve(process.cwd(), baseStoragePath);
  }

  public async sendWeeklyReport(
    recipientEmail: string,
    metrics: WeeklyPerformanceMetrics
  ): Promise<EmailDispatchResult> {
    const timestamp = Date.now();
    const reportsDir = path.join(this.baseStoragePath, "reports", "weekly");
    await fs.mkdir(reportsDir, { recursive: true });

    const htmlContent = ReportingService.generateReportHtml(metrics);
    const htmlReportPath = path.join(reportsDir, `report_${timestamp}.html`);
    const jsonReportPath = path.join(reportsDir, `report_${timestamp}.json`);

    // Always archive local copy to disk for stateless zero-DB tracking
    await Promise.all([
      fs.writeFile(htmlReportPath, htmlContent, "utf-8"),
      fs.writeFile(jsonReportPath, JSON.stringify(metrics, null, 2), "utf-8"),
    ]);

    // Check if live Gmail API dispatch is enabled
    const hasCredentials =
      Boolean(env.GMAIL_CLIENT_ID) &&
      Boolean(env.GMAIL_CLIENT_SECRET) &&
      Boolean(env.GMAIL_REFRESH_TOKEN);

    if (env.MOCK_EMAIL_DISPATCH || !hasCredentials) {
      // Local Mock Mode: successfully written to local disk
      return {
        success: true,
        recipient: recipientEmail,
        dispatchedAt: new Date().toISOString(),
        mode: "LOCAL_MOCK",
        savedReportPath: htmlReportPath,
      };
    }

    try {
      const oauth2Client = new google.auth.OAuth2(
        env.GMAIL_CLIENT_ID,
        env.GMAIL_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
      );

      oauth2Client.setCredentials({
        refresh_token: env.GMAIL_REFRESH_TOKEN,
      });

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });

      const subject = `Weekly Performance Report - Daily Q&A Banking (${metrics.weekLabel})`;
      const sender = env.GMAIL_SENDER_EMAIL || "me";

      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const messageParts = [
        `From: ${sender}`,
        `To: ${recipientEmail}`,
        `Content-Type: text/html; charset=utf-8`,
        `MIME-Version: 1.0`,
        `Subject: ${utf8Subject}`,
        "",
        htmlContent,
      ];
      const message = messageParts.join("\r\n");

      // The message needs to be base64url encoded
      const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedMessage,
        },
      });

      return {
        success: true,
        messageId: res.data.id || undefined,
        recipient: recipientEmail,
        dispatchedAt: new Date().toISOString(),
        mode: "GMAIL_API",
        savedReportPath: htmlReportPath,
      };
    } catch (err: unknown) {
      throw new EmailDispatchError({
        operation: "GMAIL_SEND_WEEKLY_REPORT",
        file: "src/adapters/email/gmail.adapter.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Verify Gmail OAuth2 Client ID, Secret, and Refresh Token in .env",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
        details: { recipientEmail },
      });
    }
  }
}
