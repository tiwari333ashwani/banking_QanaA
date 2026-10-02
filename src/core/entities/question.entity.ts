export type BankingSection =
  | "Banking & Financial Awareness"
  | "Quantitative Aptitude"
  | "Reasoning Ability"
  | "English Language"
  | "General Awareness";

export type OptionKey = "A" | "B" | "C" | "D" | "E";

export interface QuestionOption {
  key: OptionKey;
  text: string;
}

export interface ExtractedQuestion {
  id: string;
  questionNumber: number;
  questionText: string;
  section: BankingSection;
  groupContext?: string; // Comprehension / Data Interpretation / Puzzle table / context passage
  options: QuestionOption[];
  correctAnswer: OptionKey;
  explanation?: string;
  memoryTrick?: string;
  sourcePaperId: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}
