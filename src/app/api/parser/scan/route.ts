import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { PDFParserService } from "@/core/services/pdf-parser.service";
import { LocalStorageAdapter } from "@/adapters/storage/local-storage.adapter";
import { sanitizeSlug } from "@/lib/utils";

export async function POST() {
  try {
    const inputsDir = path.resolve(process.cwd(), "./local_storage/inputs");
    await fs.mkdir(inputsDir, { recursive: true });

    const files = await fs.readdir(inputsDir);
    const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

    const storage = new LocalStorageAdapter("./local_storage");
    const parser = new PDFParserService();

    const existingPapers = await storage.listPapers();
    const existingIds = new Set(existingPapers.map((p) => p.id));

    const newlyProcessed = [];
    const skippedAlreadyProcessed = [];

    for (const pdfFile of pdfFiles) {
      const slugId = sanitizeSlug(pdfFile.replace(/\.pdf$/i, ""));
      if (existingIds.has(slugId)) {
        skippedAlreadyProcessed.push(pdfFile);
        continue;
      }

      const fullPath = path.join(inputsDir, pdfFile);
      const parseResult = await parser.parsePdfFile(fullPath);
      await storage.saveExtractedPaper(parseResult.paperSummary, parseResult.questions);
      newlyProcessed.push({
        fileName: pdfFile,
        paperId: parseResult.paperSummary.id,
        questionsCount: parseResult.questions.length,
      });
    }

    return NextResponse.json({
      success: true,
      totalPdfsFound: pdfFiles.length,
      newlyProcessedCount: newlyProcessed.length,
      newlyProcessed,
      skippedAlreadyProcessed,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to scan and parse inputs" },
      { status: 500 }
    );
  }
}
