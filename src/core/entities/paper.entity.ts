export type ExamCategory =
  | "SBI PO Prelims"
  | "SBI PO Mains"
  | "IBPS PO Prelims"
  | "IBPS Clerk"
  | "Banking & Current Affairs"
  | "Sectional Drill";

export interface PaperSummary {
  id: string;
  title: string;
  sourceFileName: string;
  category: ExamCategory;
  totalQuestions: number;
  totalMarks: number;
  timeLimitMinutes: number;
  extractedAt: string;
  attemptCount: number;
  bestNetScore?: number;
  averageNetScore?: number;
  lastAttemptedAt?: string;
  sections: string[];
  hierarchicalName?: string;
  periodLabel?: string;
}

export interface PaperDetail extends PaperSummary {
  questions: import("./question.entity").ExtractedQuestion[];
}
