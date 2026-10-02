import { NextResponse } from "next/server";
import { RevisionService } from "@/core/services/revision.service";
import { RevisionSession } from "@/core/entities/attempt.entity";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";
import { LocalLoggerAdapter } from "@/adapters/logger/local-logger.adapter";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RevisionSession;

    if (!body.sessionId || !body.totalQuestions) {
      return NextResponse.json(
        { success: false, error: "Invalid revision session payload." },
        { status: 400 }
      );
    }

    const storage = new LocalStorageAdapter("./local_storage");
    const logger = new LocalLoggerAdapter("./local_storage");
    const revisionService = new RevisionService(storage, logger);

    await revisionService.recordSession(body);

    return NextResponse.json({
      success: true,
      sessionId: body.sessionId,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to record revision session" },
      { status: 500 }
    );
  }
}
