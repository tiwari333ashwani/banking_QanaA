import { NextResponse } from "next/server";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";

export async function GET() {
  try {
    const storage = new LocalStorageAdapter("./local_storage");
    const papers = await storage.listPapers();
    return NextResponse.json({ success: true, papers });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to list papers" },
      { status: 500 }
    );
  }
}
