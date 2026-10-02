import { IStorageProvider } from "../ports/storage.port";
import { ILoggerProvider } from "../ports/logger.port";
import { TimedQuizAttempt, QuestionResponse, SectionalScore } from "../entities/attempt.entity";
import { OptionKey } from "../entities/question.entity";
import { ExamEngineError } from "@/lib/errors";

export interface SubmitQuizInput {
  paperId: string;
  timeSpentSeconds: number;
  userResponses: {
    questionNumber: number;
    selectedOption: OptionKey | null;
    status: "ANSWERED" | "SKIPPED" | "MARKED_FOR_REVIEW";
  }[];
}

export class QuizService {
  constructor(
    private storage: IStorageProvider,
    private logger: ILoggerProvider
  ) {}

  public async evaluateAndRecordAttempt(input: SubmitQuizInput): Promise<TimedQuizAttempt> {
    try {
      const paper = await this.storage.getPaperById(input.paperId);
      if (!paper) {
        throw new Error(`Paper with ID '${input.paperId}' not found in storage.`);
      }

      const existingAttempts = await this.storage.getPaperAttempts(input.paperId);
      const attemptNumber = existingAttempts.length + 1;

      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;

      const responses: QuestionResponse[] = [];
      const sectionalMap: Record<string, { total: number; attempted: number; correct: number; incorrect: number }> = {};

      for (const q of paper.questions) {
        const sec = q.section || "General";
        if (!sectionalMap[sec]) {
          sectionalMap[sec] = { total: 0, attempted: 0, correct: 0, incorrect: 0 };
        }
        sectionalMap[sec].total += 1;

        const userAns = input.userResponses.find((r) => r.questionNumber === q.questionNumber);
        const selected = userAns ? userAns.selectedOption : null;
        const status = userAns ? userAns.status : "SKIPPED";

        if (!selected) {
          unattemptedCount += 1;
          responses.push({
            questionNumber: q.questionNumber,
            selectedOption: null,
            correctOption: q.correctAnswer,
            isCorrect: false,
            marksAwarded: 0.0,
            status,
          });
        } else {
          sectionalMap[sec].attempted += 1;
          const isCorrect = selected === q.correctAnswer;
          if (isCorrect) {
            correctCount += 1;
            sectionalMap[sec].correct += 1;
            responses.push({
              questionNumber: q.questionNumber,
              selectedOption: selected,
              correctOption: q.correctAnswer,
              isCorrect: true,
              marksAwarded: 1.0,
              status,
            });
          } else {
            incorrectCount += 1;
            sectionalMap[sec].incorrect += 1;
            responses.push({
              questionNumber: q.questionNumber,
              selectedOption: selected,
              correctOption: q.correctAnswer,
              isCorrect: false,
              marksAwarded: -0.25,
              status,
            });
          }
        }
      }

      const grossMarks = correctCount * 1.0;
      const negativePenalty = parseFloat((incorrectCount * 0.25).toFixed(2));
      const netScore = parseFloat((grossMarks - negativePenalty).toFixed(2));
      const totalAttempted = correctCount + incorrectCount;
      const accuracyPercentage = totalAttempted > 0 ? parseFloat(((correctCount / totalAttempted) * 100).toFixed(1)) : 0;

      const sectionalScores: Record<string, SectionalScore> = {};
      for (const [secName, data] of Object.entries(sectionalMap)) {
        const gross = data.correct * 1.0;
        const penalty = parseFloat((data.incorrect * 0.25).toFixed(2));
        const net = parseFloat((gross - penalty).toFixed(2));
        const acc = data.attempted > 0 ? parseFloat(((data.correct / data.attempted) * 100).toFixed(1)) : 0;

        sectionalScores[secName] = {
          sectionName: secName,
          totalQuestions: data.total,
          attempted: data.attempted,
          correct: data.correct,
          incorrect: data.incorrect,
          grossMarks: gross,
          negativePenalty: penalty,
          netScore: net,
          accuracy: acc,
        };
      }

      const attemptRecord: TimedQuizAttempt = {
        attemptId: `att_${input.paperId}_${attemptNumber}_${Date.now()}`,
        paperId: input.paperId,
        paperTitle: paper.title,
        attemptNumber,
        timestamp: new Date().toISOString(),
        timeSpentSeconds: input.timeSpentSeconds,
        totalQuestions: paper.questions.length,
        attemptedCount: totalAttempted,
        correctCount,
        incorrectCount,
        unattemptedCount,
        grossMarks,
        negativePenalty,
        netScore,
        totalMarks: paper.totalMarks || paper.questions.length,
        accuracyPercentage,
        sectionalScores,
        responses,
      };

      await this.storage.saveTimedQuizAttempt(input.paperId, attemptRecord);
      await this.logger.info("EVALUATE_QUIZ_ATTEMPT", "QuizService", `Attempt #${attemptNumber} recorded for ${paper.title}`, {
        paperId: input.paperId,
        netScore,
        accuracy: accuracyPercentage,
      });

      return attemptRecord;
    } catch (err: unknown) {
      throw new ExamEngineError({
        operation: "EVALUATE_AND_RECORD_ATTEMPT",
        file: "src/core/services/quiz.service.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure paper exists and user response payload matches schema",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
