# Daily Q&A Banking Utility Application

A bulletproof, stateless, zero-database utility platform engineered for high-yield **SBI PO & Banking Exam Preparation**. Built with a local-first hexagonal architecture, direct PDF Q&A extraction, authentic TCS iON / SBI PO exam simulation, and automated weekly progress reporting via the Gmail API.

---

## Key Capabilities

- **Zero-Database / Zero-Cache Storage:** Uses a structured, filesystem-based hierarchical data store under `local_storage/` that mirrors the exact layout of Google Drive for seamless future cloud migration without code refactoring.
- **Authentic SBI PO Exam Engine:**
  - 5-option question structure `(A, B, C, D, E)` with comprehension/puzzle set grouping.
  - Authentic marking scheme: `+1.00` for correct, `-0.25` negative penalty for incorrect.
  - TCS iON Question Palette with official color codes (Answered, Not Answered, Not Visited, Marked for Review).
- **Dual-Mode PDF Ingestion:**
  - **Mode 1:** Extracts pre-existing questions, options, and answer keys from mock exam PDFs.
  - **Mode 2:** Synthesizes structured 5-option multiple-choice questions from banking current affairs notes and study compendiums (e.g., May Banking News).
- **Three Core Operational Workflows:**
  - **Tab 1: Dashboard:** Dual sub-tabs (Sub-Tab A for Timed Quiz metrics & accordion attempt histories; Sub-Tab B for Revision session trends).
  - **Tab 2: Timed Quiz Simulator:** Timed examination runner with live countdown, question palette, and instantaneous evaluation.
  - **Tab 3: Custom Revision Module:** Multi-select question paper generator with "Select All" capability, section filters, and shuffled practice drills.
- **Automated Reporting:** Weekly performance summaries dispatched via the official Google Gmail API v3 (with an offline mock fallback).

---

## Directory Layout

```
dailyQandA_banking/
├── docs/                       # Architecture, development, and integration specs
├── local_storage/              # Single Source of Truth data store
│   ├── inputs/                 # Drop raw PDFs here
│   ├── processed/              # Auto-extracted structured Q&A JSON files
│   ├── attempts/
│   │   ├── timed_quiz/         # Tab 2 exam attempts with scorecards
│   │   └── revision_sessions/  # Tab 3 revision sessions
│   ├── reports/weekly/         # Generated HTML & JSON weekly reports
│   └── logs/                   # Machine-readable JSONL audit logs
├── src/                        # Next.js App Router, core domain, and adapters
├── .env.example                # Configuration template
├── package.json                # Project dependencies
└── README.md
```

---

## Quickstart

### Prerequisites
- Node.js `v18+` or `v24+ LTS`
- Python `3.10+` or `3.13+` (for high-throughput PDF tokenization and extraction)

### Installation & First Run
```bash
# 1. Initialize Python virtual environment
python -m venv venv
.\venv\Scripts\pip install -r requirements.txt

# 2. Install Node.js dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:3000` in your browser.

> **Tip for Windows PowerShell:** If running scripts is restricted, use `npm.cmd` or run `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

---

## Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Local Development & Operation Guide](docs/DEVELOPMENT.md)
- [Automated Scheduling & Windows Startup](docs/SCHEDULING.md)
- [Email Dispatch & Gmail Setup](docs/GMAIL_SETUP.md)
- [API Contracts & Schemas](docs/API_CONTRACTS.md)
- [Changelog](CHANGELOG.md)
