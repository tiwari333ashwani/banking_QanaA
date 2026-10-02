import { NextResponse } from "next/server";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";
import { env } from "@/lib/env";

export async function GET() {
  try {
    const storage = new LocalStorageAdapter("./local_storage");
    const papers = await storage.listPapers();

    return NextResponse.json({
      status: "HEALTHY",
      uptime: process.uptime(),
      storageProvider: env.STORAGE_PROVIDER,
      totalPapersIngested: papers.length,
      mockEmailEnabled: env.MOCK_EMAIL_DISPATCH,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "DEGRADED",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
