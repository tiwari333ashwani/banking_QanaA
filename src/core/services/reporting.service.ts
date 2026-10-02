import { IStorageProvider } from "../ports/storage.port";
import { IEmailProvider, EmailDispatchResult } from "../ports/email.port";
import { ILoggerProvider } from "../ports/logger.port";
import { WeeklyPerformanceMetrics } from "../entities/report.entity";

export class ReportingService {
  constructor(
    private storage: IStorageProvider,
    private emailProvider: IEmailProvider,
    private logger: ILoggerProvider
  ) {}

  public async generateAndDispatchWeeklyReport(recipientEmail: string): Promise<EmailDispatchResult> {
    try {
      const now = new Date();
      const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const metrics = await this.storage.compileWeeklyMetrics(past7Days, now);
      const result = await this.emailProvider.sendWeeklyReport(recipientEmail, metrics);

      await this.logger.info("DISPATCH_WEEKLY_REPORT", "ReportingService", `Weekly report sent to ${recipientEmail}`, {
        mode: result.mode,
        success: result.success,
      });

      return result;
    } catch (err: unknown) {
      await this.logger.error("DISPATCH_WEEKLY_REPORT", "ReportingService", "Failed to dispatch weekly report", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  public static generateReportHtml(metrics: WeeklyPerformanceMetrics): string {
    const paperRows = metrics.paperBreakdown
      .map(
        (p) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px; font-weight: 500; color: #1e293b;">${p.paperTitle}</td>
          <td style="padding: 12px; text-align: center; color: #475569;">${p.attemptsThisWeek}</td>
          <td style="padding: 12px; text-align: right; font-weight: 600; color: #0284c7;">${p.bestScore.toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly SBI PO Banking Preparation Report</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
        <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 32px 24px; color: #ffffff;">
            <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.85; margin-bottom: 6px;">
              Daily Q&A Banking Platform
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Weekly Performance Summary</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${metrics.weekLabel} • Progress Snapshot</p>
          </div>

          <!-- KPI Cards Grid -->
          <div style="padding: 24px; background: #ffffff;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0;">
              <tr>
                <td style="width: 33%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase;">Quizzes Taken</div>
                  <div style="font-size: 24px; font-weight: 800; color: #15803d; margin-top: 4px;">${metrics.totalQuizzesTaken}</div>
                </td>
                <td style="width: 33%; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 11px; font-weight: 600; color: #1e40af; text-transform: uppercase;">Avg Accuracy</div>
                  <div style="font-size: 24px; font-weight: 800; color: #2563eb; margin-top: 4px;">${metrics.averageAccuracy}%</div>
                </td>
                <td style="width: 33%; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
                  <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Negative Penalty</div>
                  <div style="font-size: 24px; font-weight: 800; color: #dc2626; margin-top: 4px;">-${metrics.totalNegativeMarksIncurred}</div>
                </td>
              </tr>
            </table>

            <!-- Secondary Metrics -->
            <div style="margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Questions Practiced (Total):</span>
                <strong style="color: #0f172a;">${metrics.totalQuestionsPracticed}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="color: #64748b;">Random Revision Drills:</span>
                <strong style="color: #0f172a;">${metrics.totalRevisionSessions} sessions</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Strongest Section:</span>
                <strong style="color: #059669;">${metrics.strongestSection}</strong>
              </div>
            </div>

            <!-- Paper Activity Table -->
            <h3 style="margin: 28px 0 12px 0; font-size: 16px; color: #0f172a;">Paper-by-Paper Activity</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left; color: #475569;">
                  <th style="padding: 10px 12px; border-radius: 6px 0 0 6px;">Paper Title</th>
                  <th style="padding: 10px 12px; text-align: center;">Attempts</th>
                  <th style="padding: 10px 12px; text-align: right; border-radius: 0 6px 6px 0;">Best Net Score</th>
                </tr>
              </thead>
              <tbody>
                ${paperRows || '<tr><td colspan="3" style="padding: 16px; text-align: center; color: #94a3b8;">No paper attempts recorded this week.</td></tr>'}
              </tbody>
            </table>

            <!-- Call to Action -->
            <div style="margin-top: 32px; text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">
                Consistency is the key to cracking SBI PO. Jump back in for today's drill!
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            Generated automatically by Daily Q&A Banking Utility • Local-First Architecture
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
