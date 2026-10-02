import { NextResponse } from "next/server";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ paperId: string }> }
) {
  try {
    const { paperId } = await params;
    const storage = new LocalStorageAdapter("./local_storage");
    const paper = await storage.getPaperById(paperId);

    if (!paper) {
      return NextResponse.json(
        { success: false, error: `Paper '${paperId}' not found.` },
        { status: 404 }
      );
    }

    const attempts = await storage.getPaperAttempts(paperId);

    return NextResponse.json({
      success: true,
      paper,
      attempts,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to get paper" },
      { status: 500 }
    );
  }
}
