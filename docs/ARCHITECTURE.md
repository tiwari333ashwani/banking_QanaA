# System Architecture & Technical Specifications

**Project:** Daily Q&A Banking Utility Application  
**Version:** 2.3.4  
**Pattern:** Hexagonal / Ports-and-Adapters Architecture  
**State Strategy:** Stateless / Zero-Database / Zero-Cache (Filesystem SSOT mapping 1-to-1 to Google Drive)

---

## 1. Architectural Philosophy

The application is structured to ensure that business logic and UI components remain completely independent of external cloud infrastructure or proprietary databases.

```
+------------------------------------------------------------------------+
|                               UI LAYER                                 |
|   Tab 1: Dashboard (Sub-Tabs A & B) | Tab 2: Quiz | Tab 3: Revision   |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|                              CORE LAYER                                |
|   Entities: Paper, Question, Attempt, RevisionSession, Report          |
|   Services: PDFParserService, QuizService, RevisionService, ReportSvc  |
+------------------------------------------------------------------------+
                                    |
                                    v
+------------------------------------------------------------------------+
|                              PORTS LAYER                               |
|   IStorageProvider       |      IEmailProvider     |   ILoggerProvider |
+------------------------------------------------------------------------+
           |                                |                   |
           v                                v                   v
+-----------------------+     +-------------------+    +-----------------+
|   STORAGE ADAPTERS    |     |  EMAIL ADAPTERS   |    | LOGGER ADAPTERS |
| LocalStorageAdapter   |     | NodemailerSmtp    |    | FileLogger      |
| (Active Local SSOT)   |     | GmailApiAdapter   |    | (JSONL format)  |
| GoogleDriveAdapter    |     | MockEmailAdapter  |    +-----------------+
| (Future Cloud Target) |     +-------------------+
+-----------------------+
```

---

## 2. Ports & Adapters (Hexagonal Model)

### `IStorageProvider`
Defines contracts for interacting with persisted papers, extracted Q&A sets, and historical attempt records:
- `listPapers(): Promise<PaperSummary[]>`
- `getPaperById(paperId: string): Promise<PaperDetail>`
- `saveExtractedQuestions(paperId: string, questions: ExtractedQuestion[]): Promise<void>`
- `recordQuizAttempt(paperId: string, attempt: TimedQuizAttempt): Promise<void>`
- `recordRevisionSession(session: RevisionSession): Promise<void>`
- `getWeeklyMetrics(since: Date): Promise<WeeklyMetricsSummary>`

### `IEmailProvider`
Defines report dispatch contracts:
- `sendWeeklyReport(payload: WeeklyReportPayload): Promise<EmailDispatchResult>`

### `ILoggerProvider`
Defines structured audit logging:
- `log(entry: StructuredLogEntry): Promise<void>`

---

## 3. Storage Hierarchy Mapping (Local <-> Google Drive)

Every directory path in `local_storage/` corresponds directly to a Google Drive folder:

| Local Directory | Google Drive Folder | Content |
|---|---|---|
| `local_storage/inputs/` | `dailyQandA_banking/inputs/` | Raw uploaded PDF documents |
| `local_storage/processed/[id]/` | `dailyQandA_banking/processed/[id]/` | Normalized Q&A JSON files |
| `local_storage/attempts/timed_quiz/` | `dailyQandA_banking/attempts/timed_quiz/` | Tab 2 attempt JSONs with SBI PO scores |
| `local_storage/attempts/revision_sessions/` | `dailyQandA_banking/attempts/revision_sessions/` | Tab 3 multi-paper revision sessions |
| `local_storage/reports/weekly/` | `dailyQandA_banking/reports/weekly/` | Generated weekly HTML & JSON summaries |
| `local_storage/logs/` | `dailyQandA_banking/logs/` | Append-only `.log.jsonl` audit records |

---

## 4. Enterprise Error Handling Standard

All operations implement structured error tracking conforming to the standard `AppError` contract:

```typescript
export interface AppErrorPayload {
  operation: string;         // e.g. "PARSE_BANKING_PDF"
  component: string;         // e.g. "PDFParserService"
  file: string;              // e.g. "src/core/services/pdf-parser.service.ts"
  rootCause: string;         // Underlying error message and trace
  recoveryAction: string;    // Recommended mitigation or retry steps
  executionStatus: "FAILED" | "RETRYING" | "DEGRADED";
  timestamp: string;         // ISO 8601 string
}
```
