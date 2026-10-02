import { IStorageProvider } from "../ports/storage.port";
import { ILoggerProvider } from "../ports/logger.port";
import { ExtractedQuestion } from "../entities/question.entity";
import { RevisionSession } from "../entities/attempt.entity";
import { ExamEngineError } from "@/lib/errors";
import { shuffleArray } from "@/lib/utils";

export interface GenerateRevisionInput {
  selectedPaperIds: string[];
  questionCount: number;
  sectionFilter?: string;
  mode: "PRACTICE" | "SPEED_DRILL";
}

export interface GeneratedRevisionSet {
  questions: (ExtractedQuestion & { sourcePaperTitle: string })[];
  totalAvailableInPool: number;
  mode: "PRACTICE" | "SPEED_DRILL";
  sourcePaperTitles: string[];
}

export class RevisionService {
  constructor(
    private storage: IStorageProvider,
    private logger: ILoggerProvider
  ) {}

  public async generateRevisionSet(input: GenerateRevisionInput): Promise<GeneratedRevisionSet> {
    try {
      if (!input.selectedPaperIds || input.selectedPaperIds.length === 0) {
        throw new Error("At least one paper must be selected to generate a revision drill.");
      }

      const pooledQuestions: (ExtractedQuestion & { sourcePaperTitle: string })[] = [];
      const sourceTitles: string[] = [];

      for (const paperId of input.selectedPaperIds) {
        const paper = await this.storage.getPaperById(paperId);
        if (paper) {
          sourceTitles.push(paper.title);
          for (const q of paper.questions) {
            if (
              !input.sectionFilter ||
              input.sectionFilter === "ALL" ||
              q.section.toLowerCase().includes(input.sectionFilter.toLowerCase())
            ) {
              pooledQuestions.push({
                ...q,
                sourcePaperTitle: paper.title,
              });
            }
          }
        }
      }

      if (pooledQuestions.length === 0) {
        throw new Error("No questions found matching the selected papers and section filters.");
      }

      // Shuffle using Fisher-Yates
      const randomized = shuffleArray(pooledQuestions);
      const targetCount = Math.min(input.questionCount || 20, randomized.length);
      const selectedSlice = randomized.slice(0, targetCount);

      await this.logger.info("GENERATE_REVISION_SET", "RevisionService", `Generated ${selectedSlice.length} randomized revision questions`, {
        papersCount: input.selectedPaperIds.length,
        mode: input.mode,
      });

      return {
        questions: selectedSlice,
        totalAvailableInPool: pooledQuestions.length,
        mode: input.mode,
        sourcePaperTitles: sourceTitles,
      };
    } catch (err: unknown) {
      throw new ExamEngineError({
        operation: "GENERATE_REVISION_SET",
        file: "src/core/services/revision.service.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure selected papers are processed and contain questions",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }

  public async recordSession(session: RevisionSession): Promise<void> {
    try {
      await this.storage.saveRevisionSession(session);
      await this.logger.info("RECORD_REVISION_SESSION", "RevisionService", `Recorded revision session ${session.sessionId}`, {
        accuracy: session.accuracyPercentage,
        questions: session.totalQuestions,
      });
    } catch (err: unknown) {
      throw new ExamEngineError({
        operation: "RECORD_REVISION_SESSION",
        file: "src/core/services/revision.service.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure storage is available and session matches schema",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
