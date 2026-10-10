export interface OverallCumulativeMetrics {
  totalQuizzesTaken: number;
  totalRevisionSessions: number;
  totalQuestionsPracticed: number;
  bestNetScore: number;
  averageAccuracy: number;
  totalPapersAvailable: number;
}

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
  overallMetrics?: OverallCumulativeMetrics;
  generatedAt: string;
}

