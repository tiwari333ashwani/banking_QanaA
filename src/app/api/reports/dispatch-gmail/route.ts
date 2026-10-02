import { NextResponse } from "next/server";
import { ReportingService } from "@/core/services/reporting.service";
import { GmailApiEmailAdapter } from "@/adapters/email/gmail.adapter";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";
import { LocalLoggerAdapter } from "@/adapters/logger/local-logger.adapter";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { recipientEmail?: string };
    const recipient = body.recipientEmail || env.WEEKLY_REPORT_RECIPIENT_EMAIL || "user@bankingqa.local";

    const storage = new LocalStorageAdapter("./local_storage");
    const emailAdapter = new GmailApiEmailAdapter("./local_storage");
    const logger = new LocalLoggerAdapter("./local_storage");

    const reportingService = new ReportingService(storage, emailAdapter, logger);
    const result = await reportingService.generateAndDispatchWeeklyReport(recipient);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to dispatch report" },
      { status: 500 }
    );
  }
}
