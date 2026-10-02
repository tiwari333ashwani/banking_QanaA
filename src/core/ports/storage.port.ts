import { PaperSummary, PaperDetail } from "../entities/paper.entity";
import { ExtractedQuestion } from "../entities/question.entity";
import { TimedQuizAttempt, RevisionSession } from "../entities/attempt.entity";
import { WeeklyPerformanceMetrics } from "../entities/report.entity";

export interface IStorageProvider {
  /**
   * Lists all processed papers with aggregated statistics (attempts, average score)
   */
  listPapers(): Promise<PaperSummary[]>;

  /**
   * Retrieves full paper detail including all questions and attempt history
   */
  getPaperById(paperId: string): Promise<PaperDetail | null>;

  /**
   * Persists extracted questions for a paper
   */
  saveExtractedPaper(
    paperSummary: Omit<PaperSummary, "attemptCount" | "bestNetScore" | "averageNetScore" | "lastAttemptedAt">,
    questions: ExtractedQuestion[]
  ): Promise<void>;

  /**
   * Records a timed quiz attempt
   */
  saveTimedQuizAttempt(paperId: string, attempt: TimedQuizAttempt): Promise<void>;

  /**
   * Retrieves all historical attempts for a specific paper
   */
  getPaperAttempts(paperId: string): Promise<TimedQuizAttempt[]>;

  /**
   * Records a custom revision test session
   */
  saveRevisionSession(session: RevisionSession): Promise<void>;

  /**
   * Retrieves all historical revision test sessions
   */
  listRevisionSessions(): Promise<RevisionSession[]>;

  /**
   * Compiles weekly metrics across all quiz and revision sessions
   */
  compileWeeklyMetrics(startDate: Date, endDate: Date): Promise<WeeklyPerformanceMetrics>;
}
