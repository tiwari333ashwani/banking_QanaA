import { QuizService } from "../src/core/services/quiz.service";
import { LocalStorageAdapter } from "../src/adapters/storage/local-storage.adapter";
import { LocalLoggerAdapter } from "../src/adapters/logger/local-logger.adapter";

async function main() {
  console.log("=== SIMULATING SBI PO TIMED QUIZ ATTEMPT ===");
  const storage = new LocalStorageAdapter("./local_storage");
  const logger = new LocalLoggerAdapter("./local_storage");
  const quizService = new QuizService(storage, logger);

  // Simulate 19 question responses (15 correct, 3 wrong, 1 skipped)
  const attempt = await quizService.evaluateAndRecordAttempt({
    paperId: "may-banking-news-notes",
    timeSpentSeconds: 540, // 9 minutes
    userResponses: [
      { questionNumber: 1, selectedOption: "B", status: "ANSWERED" }, // Correct
      { questionNumber: 2, selectedOption: "C", status: "ANSWERED" }, // Correct
      { questionNumber: 3, selectedOption: "B", status: "ANSWERED" }, // Correct
      { questionNumber: 4, selectedOption: "D", status: "ANSWERED" }, // Correct
      { questionNumber: 5, selectedOption: "C", status: "ANSWERED" }, // Correct
      { questionNumber: 6, selectedOption: "B", status: "ANSWERED" }, // Correct
      { questionNumber: 7, selectedOption: "A", status: "ANSWERED" }, // Correct
      { questionNumber: 8, selectedOption: "D", status: "ANSWERED" }, // Correct
      { questionNumber: 9, selectedOption: "A", status: "ANSWERED" }, // Correct
      { questionNumber: 10, selectedOption: "C", status: "ANSWERED" }, // Correct
      { questionNumber: 11, selectedOption: "B", status: "ANSWERED" }, // Correct
      { questionNumber: 12, selectedOption: "E", status: "ANSWERED" }, // Correct
      { questionNumber: 13, selectedOption: "E", status: "ANSWERED" }, // Correct
      { questionNumber: 14, selectedOption: "C", status: "ANSWERED" }, // Correct
      { questionNumber: 15, selectedOption: "B", status: "ANSWERED" }, // Correct
      { questionNumber: 16, selectedOption: "A", status: "ANSWERED" }, // Wrong (Correct is D)
      { questionNumber: 17, selectedOption: "B", status: "ANSWERED" }, // Wrong (Correct is A)
      { questionNumber: 18, selectedOption: "C", status: "ANSWERED" }, // Wrong (Correct is B)
      { questionNumber: 19, selectedOption: null, status: "SKIPPED" },  // Skipped
    ],
  });

  console.log("\nAttempt Evaluated Successfully:");
  console.log("Attempt #:", attempt.attemptNumber);
  console.log("Attempted:", attempt.attemptedCount, "/ 19");
  console.log("Correct Count (+1.00 each):", attempt.correctCount);
  console.log("Gross Marks:", attempt.grossMarks.toFixed(2));
  console.log("Incorrect Count (-0.25 penalty each):", attempt.incorrectCount);
  console.log("Negative Penalty:", attempt.negativePenalty.toFixed(2));
  console.log("NET SCORE:", attempt.netScore.toFixed(2), "/", attempt.totalMarks);
  console.log("Accuracy Percentage:", attempt.accuracyPercentage + "%");
  console.log("Sectional Score:", JSON.stringify(attempt.sectionalScores, null, 2));

  // Now verify that listing papers includes this attempt data
  console.log("\nVerifying Dashboard Paper List Aggregation:");
  const papers = await storage.listPapers();
  const target = papers.find(p => p.id === "may-banking-news-notes");
  console.log("Aggregated Attempt Count:", target?.attemptCount);
  console.log("Aggregated Best Net Score:", target?.bestNetScore);
  console.log("Aggregated Average Net Score:", target?.averageNetScore);
  console.log("Aggregated Last Attempted At:", target?.lastAttemptedAt);
}

main().catch(err => {
  console.error("Error during quiz simulation:", err);
  process.exit(1);
});
