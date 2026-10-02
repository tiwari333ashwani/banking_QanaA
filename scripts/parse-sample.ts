import path from "path";
import { PDFParserService } from "../src/core/services/pdf-parser.service";
import { LocalStorageAdapter } from "../src/adapters/storage/local-storage.adapter";

async function main() {
  console.log("=== INITIATING SAMPLE BANKING PDF EXTRACTION ===");
  const inputPdfPath = path.resolve("./local_storage/inputs/May-Banking-News-Notes.pdf");
  console.log("Reading from:", inputPdfPath);

  const parser = new PDFParserService();
  const storage = new LocalStorageAdapter("./local_storage");

  const result = await parser.parsePdfFile(inputPdfPath);
  console.log("\n[EXTRACTION SUCCESSFUL]");
  console.log("Paper ID:", result.paperSummary.id);
  console.log("Paper Title:", result.paperSummary.title);
  console.log("Total Questions Extracted:", result.questions.length);
  console.log("Sections:", result.paperSummary.sections.join(", "));
  console.log("Time Limit:", result.paperSummary.timeLimitMinutes, "minutes");

  console.log("\nSaving to local_storage/processed/...");
  await storage.saveExtractedPaper(result.paperSummary, result.questions);
  console.log("SUCCESS! Saved metadata.json and questions.json to local_storage/processed/" + result.paperSummary.id);

  console.log("\nVerifying Storage Read:");
  const verified = await storage.getPaperById(result.paperSummary.id);
  console.log("Verified Paper Title:", verified?.title);
  console.log("Verified Questions Count:", verified?.questions.length);
  console.log("Sample Question 1:", verified?.questions[0].questionText);
  console.log("Sample Question 1 Correct Answer:", verified?.questions[0].correctAnswer);
  console.log("Sample Question 1 Options:", verified?.questions[0].options.map(o => `${o.key}: ${o.text}`).join(" | "));
}

main().catch(err => {
  console.error("FATAL ERROR in sample parsing:", err);
  process.exit(1);
});
