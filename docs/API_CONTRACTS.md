# API Contracts & Data Schemas

---

## 1. Domain Entities

### `ExtractedQuestion`
```typescript
export interface ExtractedQuestion {
  id: string;               // e.g. "q_001"
  questionNumber: number;   // 1, 2, 3...
  questionText: string;     // The question stem/prompt
  section: string;          // "Banking Awareness" | "Quantitative Aptitude" | "Reasoning" | "English"
  groupContext?: string;    // Context passage, table, or puzzle statement shared by questions
  options: {
    key: "A" | "B" | "C" | "D" | "E";
    text: string;
  }[];
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation?: string;
  sourcePaperId: string;
}
```

### `TimedQuizAttempt`
```typescript
export interface TimedQuizAttempt {
  attemptId: string;
  paperId: string;
  attemptNumber: number;
  timestamp: string;
  timeSpentSeconds: number;
  grossCorrect: number;
  grossIncorrect: number;
  unattempted: number;
  negativePenalty: number;  // (grossIncorrect * 0.25)
  netScore: number;         // (grossCorrect * 1.0) - negativePenalty
  totalMarks: number;
  accuracyPercentage: number;
  sectionalScores: Record<string, {
    correct: number;
    incorrect: number;
    net: number;
  }>;
  responses: Record<number, "A" | "B" | "C" | "D" | "E" | null>;
}
```

### `RevisionSession`
```typescript
export interface RevisionSession {
  sessionId: string;
  timestamp: string;
  selectedPaperIds: string[];
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyPercentage: number;
  mode: "PRACTICE" | "SPEED_DRILL";
}
```

---

## 2. Server API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/papers` | Returns list of all processed papers with summary metrics |
| `GET` | `/api/papers/[paperId]` | Returns individual paper questions and attempt history |
| `POST` | `/api/parser/scan` | Scans `local_storage/inputs/` and processes newly added PDFs |
| `POST` | `/api/quiz/submit` | Evaluates submitted quiz answers, records score, updates storage |
| `POST` | `/api/revision/generate` | Pools and randomizes questions from multi-selected PDFs |
| `POST` | `/api/revision/submit` | Records completed revision drill session |
| `POST` | `/api/reports/dispatch-gmail` | Generates weekly report and dispatches via Gmail API (or mock) |
