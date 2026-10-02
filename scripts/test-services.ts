import { RevisionService } from "../src/core/services/revision.service";
import { ReportingService } from "../src/core/services/reporting.service";
import { GmailApiEmailAdapter } from "../src/adapters/email/gmail.adapter";
import { LocalStorageAdapter } from "../src/adapters/storage/local-storage.adapter";
import { LocalLoggerAdapter } from "../src/adapters/logger/local-logger.adapter";

async function main() {
  console.log("=== TESTING REVISION SERVICE & REPORTING SERVICE ===");
  const storage = new LocalStorageAdapter("./local_storage");
  const logger = new LocalLoggerAdapter("./local_storage");
  const revisionService = new RevisionService(storage, logger);
  const emailAdapter = new GmailApiEmailAdapter("./local_storage");
  const reportingService = new ReportingService(storage, emailAdapter, logger);

  // 1. Generate a randomized revision set from our processed paper
  console.log("\n[1] Generating 10 Randomized Revision Questions:");
  const revisionSet = await revisionService.generateRevisionSet({
    selectedPaperIds: ["may-banking-news-notes"],
    questionCount: 10,
    mode: "PRACTICE",
  });
  console.log("Randomized Questions Returned:", revisionSet.questions.length);
  console.log("Question 1 Stem:", revisionSet.questions[0].questionText);
  console.log("Source Paper:", revisionSet.questions[0].sourcePaperTitle);

  // 2. Record a simulated revision session
  console.log("\n[2] Recording Revision Session:");
  await revisionService.recordSession({
    sessionId: `rev_${Date.now()}`,
    timestamp: new Date().toISOString(),
    selectedPaperIds: ["may-banking-news-notes"],
    selectedPaperTitles: [revisionSet.sourcePaperTitles[0]],
    totalQuestions: 10,
    correctAnswers: 9,
    incorrectAnswers: 1,
    skippedAnswers: 0,
    accuracyPercentage: 90.0,
    mode: "PRACTICE",
    timeSpentSeconds: 240,
  });
  console.log("Revision session recorded successfully!");

  // 3. Generate weekly report and dispatch (mock mode)
  console.log("\n[3] Generating and Dispatching Weekly Report (Local Mock Mode):");
  const reportResult = await reportingService.generateAndDispatchWeeklyReport("user@bankingqa.local");
  console.log("Report Result:", reportResult);
}

main().catch(err => {
  console.error("Test services error:", err);
  process.exit(1);
});
