export interface WeeklyPerformanceMetrics {
  weekLabel: string;
  startDate: string;
  endDate: string;
  totalQuizzesTaken: number;
  totalRevisionSessions: number;
  totalQuestionsPracticed: number;
  averageQuizNetScore: number;
  averageAccuracy: number;
  totalNegativeMarksIncurred: number;
  strongestSection: string;
  weakestSection: string;
  paperBreakdown: {
    paperTitle: string;
    attemptsThisWeek: number;
    bestScore: number;
  }[];
  generatedAt: string;
}
