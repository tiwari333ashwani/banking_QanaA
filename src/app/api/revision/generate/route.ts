import { NextResponse } from "next/server";
import { RevisionService, GenerateRevisionInput } from "@/core/services/revision.service";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";
import { LocalLoggerAdapter } from "@/adapters/logger/local-logger.adapter";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRevisionInput;

    if (!body.selectedPaperIds || body.selectedPaperIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Please select at least one paper for revision." },
        { status: 400 }
      );
    }

    const storage = new LocalStorageAdapter("./local_storage");
    const logger = new LocalLoggerAdapter("./local_storage");
    const revisionService = new RevisionService(storage, logger);

    const generatedSet = await revisionService.generateRevisionSet(body);

    return NextResponse.json({
      success: true,
      data: generatedSet,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to generate revision set" },
      { status: 500 }
    );
  }
}
