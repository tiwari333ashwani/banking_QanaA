import { OptionKey } from "./question.entity";

export interface QuestionResponse {
  questionNumber: number;
  selectedOption: OptionKey | null;
  correctOption: OptionKey;
  isCorrect: boolean;
  marksAwarded: number; // +1.00, -0.25, or 0.00
  timeSpentSeconds?: number;
  status: "ANSWERED" | "SKIPPED" | "MARKED_FOR_REVIEW";
}

export interface SectionalScore {
  sectionName: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  grossMarks: number;
  negativePenalty: number;
  netScore: number;
  accuracy: number;
}

export interface TimedQuizAttempt {
  attemptId: string;
  paperId: string;
  paperTitle: string;
  attemptNumber: number;
  timestamp: string;
  timeSpentSeconds: number;
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  grossMarks: number;       // correctCount * 1.00
  negativePenalty: number;  // incorrectCount * 0.25
  netScore: number;         // grossMarks - negativePenalty
  totalMarks: number;
  accuracyPercentage: number;
  sectionalScores: Record<string, SectionalScore>;
  responses: QuestionResponse[];
  remarks?: string;
}

export interface RevisionSession {
  sessionId: string;
  timestamp: string;
  selectedPaperIds: string[];
  selectedPaperTitles: string[];
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedAnswers: number;
  accuracyPercentage: number;
  mode: "PRACTICE" | "SPEED_DRILL";
  timeSpentSeconds: number;
}
