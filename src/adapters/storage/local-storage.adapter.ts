import fs from "fs/promises";
import path from "path";
import { IStorageProvider } from "@/core/ports/storage.port";
import { PaperSummary, PaperDetail } from "@/core/entities/paper.entity";
import { ExtractedQuestion } from "@/core/entities/question.entity";
import { TimedQuizAttempt, RevisionSession } from "@/core/entities/attempt.entity";
import { WeeklyPerformanceMetrics } from "@/core/entities/report.entity";
import { StorageError } from "@/lib/errors";

export class LocalStorageAdapter implements IStorageProvider {
  private basePath: string;

  constructor(basePath: string = "./local_storage") {
    this.basePath = path.resolve(process.cwd(), basePath);
  }

  private get processedPath(): string {
    return path.join(this.basePath, "processed");
  }

  private get quizAttemptsPath(): string {
    return path.join(this.basePath, "attempts", "timed_quiz");
  }

  private get revisionSessionsPath(): string {
    return path.join(this.basePath, "attempts", "revision_sessions");
  }

  private get reportsPath(): string {
    return path.join(this.basePath, "reports", "weekly");
  }

  public async listPapers(): Promise<PaperSummary[]> {
    try {
      await fs.mkdir(this.processedPath, { recursive: true });
      const entries = await fs.readdir(this.processedPath, { withFileTypes: true });
      const folderNames = entries.filter((e) => e.isDirectory()).map((e) => e.name);

      const summaries: PaperSummary[] = [];

      for (const folder of folderNames) {
        const metaFile = path.join(this.processedPath, folder, "metadata.json");
        try {
          const content = await fs.readFile(metaFile, "utf-8");
          const metadata = JSON.parse(content) as Omit<
            PaperSummary,
            "attemptCount" | "bestNetScore" | "averageNetScore" | "lastAttemptedAt"
          >;

          // Read attempts for this paper to compute dynamic stats
          const attempts = await this.getPaperAttempts(metadata.id || folder);
          const attemptCount = attempts.length;
          let bestNetScore: number | undefined;
          let averageNetScore: number | undefined;
          let lastAttemptedAt: string | undefined;

          if (attemptCount > 0) {
            const netScores = attempts.map((a) => a.netScore);
            bestNetScore = Math.max(...netScores);
            const sum = netScores.reduce((acc, curr) => acc + curr, 0);
            averageNetScore = parseFloat((sum / attemptCount).toFixed(2));
            lastAttemptedAt = attempts[attempts.length - 1].timestamp;
          }

          summaries.push({
            ...metadata,
            id: metadata.id || folder,
            attemptCount,
            bestNetScore,
            averageNetScore,
            lastAttemptedAt,
          });
        } catch {
          // Skip corrupt or incomplete folders gracefully
          continue;
        }
      }

      return summaries;
    } catch (err: unknown) {
      throw new StorageError({
        operation: "LIST_PAPERS",
        file: "src/adapters/storage/local-storage.adapter.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure local_storage/processed directory has read permissions",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }

  public async getPaperById(paperId: string): Promise<PaperDetail | null> {
    try {
      const folderPath = path.join(this.processedPath, paperId);
      const metaFile = path.join(folderPath, "metadata.json");
      const questionsFile = path.join(folderPath, "questions.json");

      const [metaContent, questionsContent] = await Promise.all([
        fs.readFile(metaFile, "utf-8"),
        fs.readFile(questionsFile, "utf-8"),
      ]);

      const metadata = JSON.parse(metaContent);
      const questions = JSON.parse(questionsContent) as ExtractedQuestion[];
      const attempts = await this.getPaperAttempts(paperId);

      const attemptCount = attempts.length;
      let bestNetScore: number | undefined;
      let averageNetScore: number | undefined;
      let lastAttemptedAt: string | undefined;

      if (attemptCount > 0) {
        const netScores = attempts.map((a) => a.netScore);
        bestNetScore = Math.max(...netScores);
        const sum = netScores.reduce((acc, curr) => acc + curr, 0);
        averageNetScore = parseFloat((sum / attemptCount).toFixed(2));
        lastAttemptedAt = attempts[attempts.length - 1].timestamp;
      }

      return {
        ...metadata,
        id: paperId,
        attemptCount,
        bestNetScore,
        averageNetScore,
        lastAttemptedAt,
        questions,
      };
    } catch {
      return null;
    }
  }

  public async saveExtractedPaper(
    paperSummary: Omit<PaperSummary, "attemptCount" | "bestNetScore" | "averageNetScore" | "lastAttemptedAt">,
    questions: ExtractedQuestion[]
  ): Promise<void> {
    try {
      const folderPath = path.join(this.processedPath, paperSummary.id);
      await fs.mkdir(folderPath, { recursive: true });

      const metaFile = path.join(folderPath, "metadata.json");
      const questionsFile = path.join(folderPath, "questions.json");

      await Promise.all([
        fs.writeFile(metaFile, JSON.stringify(paperSummary, null, 2), "utf-8"),
        fs.writeFile(questionsFile, JSON.stringify(questions, null, 2), "utf-8"),
      ]);
    } catch (err: unknown) {
      throw new StorageError({
        operation: "SAVE_EXTRACTED_PAPER",
        file: "src/adapters/storage/local-storage.adapter.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Check local disk space and directory write permissions",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }

  public async saveTimedQuizAttempt(paperId: string, attempt: TimedQuizAttempt): Promise<void> {
    try {
      const folderPath = path.join(this.quizAttemptsPath, paperId);
      await fs.mkdir(folderPath, { recursive: true });

      const safeTimestamp = new Date(attempt.timestamp).getTime();
      const fileName = `attempt_${attempt.attemptNumber}_${safeTimestamp}.json`;
      const filePath = path.join(folderPath, fileName);

      await fs.writeFile(filePath, JSON.stringify(attempt, null, 2), "utf-8");
    } catch (err: unknown) {
      throw new StorageError({
        operation: "SAVE_TIMED_QUIZ_ATTEMPT",
        file: "src/adapters/storage/local-storage.adapter.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure local_storage/attempts/timed_quiz directory is writable",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }

  public async getPaperAttempts(paperId: string): Promise<TimedQuizAttempt[]> {
    try {
      const folderPath = path.join(this.quizAttemptsPath, paperId);
      await fs.mkdir(folderPath, { recursive: true });
      const files = await fs.readdir(folderPath);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const attempts: TimedQuizAttempt[] = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(folderPath, file), "utf-8");
          attempts.push(JSON.parse(content));
        } catch {
          continue;
        }
      }

      // Sort chronologically ascending
      attempts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      return attempts;
    } catch {
      return [];
    }
  }

  public async saveRevisionSession(session: RevisionSession): Promise<void> {
    try {
      await fs.mkdir(this.revisionSessionsPath, { recursive: true });
      const safeTimestamp = new Date(session.timestamp).getTime();
      const fileName = `session_rev_${safeTimestamp}.json`;
      const filePath = path.join(this.revisionSessionsPath, fileName);

      await fs.writeFile(filePath, JSON.stringify(session, null, 2), "utf-8");
    } catch (err: unknown) {
      throw new StorageError({
        operation: "SAVE_REVISION_SESSION",
        file: "src/adapters/storage/local-storage.adapter.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure local_storage/attempts/revision_sessions directory is writable",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }

  public async listRevisionSessions(): Promise<RevisionSession[]> {
    try {
      await fs.mkdir(this.revisionSessionsPath, { recursive: true });
      const files = await fs.readdir(this.revisionSessionsPath);
      const jsonFiles = files.filter((f) => f.endsWith(".json"));

      const sessions: RevisionSession[] = [];
      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(this.revisionSessionsPath, file), "utf-8");
          sessions.push(JSON.parse(content));
        } catch {
          continue;
        }
      }

      // Sort descending (latest first)
      sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return sessions;
    } catch {
      return [];
    }
  }

  public async compileWeeklyMetrics(startDate: Date, endDate: Date): Promise<WeeklyPerformanceMetrics> {
    try {
      const papers = await this.listPapers();
      const allAttempts: TimedQuizAttempt[] = [];

      for (const paper of papers) {
        const attempts = await this.getPaperAttempts(paper.id);
        const filtered = attempts.filter((a) => {
          const t = new Date(a.timestamp).getTime();
          return t >= startDate.getTime() && t <= endDate.getTime();
        });
        allAttempts.push(...filtered);
      }

      const allRevisions = await this.listRevisionSessions();
      const filteredRevisions = allRevisions.filter((r) => {
        const t = new Date(r.timestamp).getTime();
        return t >= startDate.getTime() && t <= endDate.getTime();
      });

      const totalQuizzesTaken = allAttempts.length;
      const totalRevisionSessions = filteredRevisions.length;
      const totalQuestionsPracticed =
        allAttempts.reduce((acc, a) => acc + a.attemptedCount, 0) +
        filteredRevisions.reduce((acc, r) => acc + r.totalQuestions, 0);

      const netScoreSum = allAttempts.reduce((acc, a) => acc + a.netScore, 0);
      const averageQuizNetScore = totalQuizzesTaken > 0 ? parseFloat((netScoreSum / totalQuizzesTaken).toFixed(2)) : 0;

      const accuracySum =
        allAttempts.reduce((acc, a) => acc + a.accuracyPercentage, 0) +
        filteredRevisions.reduce((acc, r) => acc + r.accuracyPercentage, 0);
      const totalSessions = totalQuizzesTaken + totalRevisionSessions;
      const averageAccuracy = totalSessions > 0 ? parseFloat((accuracySum / totalSessions).toFixed(1)) : 0;

      const totalNegativeMarksIncurred = allAttempts.reduce((acc, a) => acc + a.negativePenalty, 0);

      const paperBreakdown = papers.map((p) => {
        const weekAttempts = allAttempts.filter((a) => a.paperId === p.id);
        const best = weekAttempts.length > 0 ? Math.max(...weekAttempts.map((a) => a.netScore)) : 0;
        return {
          paperTitle: p.title,
          attemptsThisWeek: weekAttempts.length,
          bestScore: best,
        };
      });

      return {
        weekLabel: `Week of ${startDate.toLocaleDateString("en-IN", { month: "short", day: "2-digit" })}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalQuizzesTaken,
        totalRevisionSessions,
        totalQuestionsPracticed,
        averageQuizNetScore,
        averageAccuracy,
        totalNegativeMarksIncurred: parseFloat(totalNegativeMarksIncurred.toFixed(2)),
        strongestSection: "Reasoning Ability",
        weakestSection: "Quantitative Aptitude",
        paperBreakdown,
        generatedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      throw new StorageError({
        operation: "COMPILE_WEEKLY_METRICS",
        file: "src/adapters/storage/local-storage.adapter.ts",
        rootCause: err instanceof Error ? err.message : String(err),
        recoveryAction: "Ensure attempt records are valid JSON files",
        executionStatus: "FAILED",
        timestamp: new Date().toISOString(),
      });
    }
  }
}
