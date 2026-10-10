# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.4] - 2026-10-10

### Changed & Documentation
- **Comprehensive Documentation Overhaul:**
  - Standardized all internal file references and documentation links to relative paths, eliminating machine-specific paths across `README.md`, `docs/SCHEDULING.md`, and `docs/DEVELOPMENT.md`.
  - Added multi-laptop developer onboarding and migration guide to `docs/DEVELOPMENT.md`, covering Python venv reconstitution and PowerShell execution policy workarounds.
  - Updated `docs/GMAIL_SETUP.md` with dual-method email setup: Method 1 (Direct Gmail SMTP with Google App Password) and Method 2 (Google Cloud OAuth2 Gmail API v3).
  - Synchronized `docs/API_CONTRACTS.md` to document all active server routes, including `GET /api/health` and `GET /api/revisions`.
  - Updated `docs/ARCHITECTURE.md` to Version 2.3.4, incorporating `NodemailerSmtp` into the hexagonal adapter model.
- **Storage Reset Standard:**
  - Standardized the clean slate data reset procedure for clearing historical attempts, revision sessions, and logs while preserving `.gitkeep` placeholders.

## [2.3.3] - 2026-10-10

### Added
- **Automated Sunday 8:00 AM Weekly Report Scheduler & Windows Startup Integration:**
  - Standalone NodeJS dispatcher `scripts/send-weekly-report.js` with dual-mode execution (online API call or autonomous offline SMTP dispatch from `local_storage`).
  - Windows Task Scheduler registration scripts (`scripts/schedule-sunday-8am.bat` and `scripts/schedule-sunday-8am.ps1`) targeting every Sunday at 08:00 AM (`0 8 * * 0`).
  - Windows Startup helper and installer (`scripts/copy-to-startup.bat` and `scripts/copy-to-startup.ps1`) that places a background launcher into `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` (`shell:startup`) for boot-time registration verification and catch-up.
  - Comprehensive documentation in `docs/SCHEDULING.md`.

## [2.3.2] - 2026-10-10

### Added
- **Direct Gmail SMTP App Password Email Delivery:**
  - Integrated `nodemailer` SMTP client connecting directly to `smtp.gmail.com:587` using Google App Password.
  - Enabled multi-recipient comma-separated distribution list (`addytiwari3@gmail.com`, `tiwariashwani5534@gmail.com`).
  - Added multi-part HTML report delivery with plain-text fallback, automated message suppression headers, and verified live inbox dispatch.

## [2.3.1] - 2026-10-08

### Fixed
- **Quiz Option Selection Persistence & Result Review Fix:**
  - Resolved issue where selected options were recorded as skipped/unselected upon examination submission.
  - Added synchronized React refs (`responsesRef`, `statusesRef`, `timeSpentSecondsRef`) in `QuizRunner` to prevent stale closure bugs during countdown timer auto-submission and state transitions.
  - Synchronized immediate `ANSWERED` palette status upon option selection, keeping the TCS iON question palette and confirmation modal in lockstep with the user's responses.
  - Implemented type-agnostic question number matching (`String` and `Number`) in both `QuizService` and the client review view to prevent dropped responses caused by type mismatches in serialized JSON payloads.
  - Enhanced the post-exam detailed solution review screen with an explicit, high-contrast **Your Selection** vs **Correct Key** status banner on every question card, alongside dedicated badges (`[Your Pick]` and `[Key]`).
  - Added submit confirmation prompt on the final question when clicking `Save & Next >>`.

## [2.3.0] - 2026-10-02

### Changed & Fixed
- **UI Dropdown Overlap Fix:** Redesigned Revision Tab Step 2 container from cramped 3-column auto-fit into structured top/bottom flex sections; styled all `<select>` inputs with `.form-select` custom SVG chevron, dark backdrop, and proper right-padding, completely eliminating overlapping between buttons and dropdowns.
- **Hierarchical File Naming Convention:**
  - Standardized weekly PDF filenames into `[Topic]_[Month][Year]_Week[X].pdf` format.
  - Renamed sample PDF to `banking_may2026_week1.pdf` and updated parser metadata extraction to assign automated badges (`📁 banking_may2026_week1`, `📅 May 2026 • Week 1`).
  - Migrated existing attempts and question sets to the hierarchical directory `local_storage/processed/banking_may2026_week1/` and `local_storage/attempts/timed_quiz/banking_may2026_week1/`.
- **Attempt Tracking & Progression Layer:**
  - Added hierarchical jump selector dropdown at top of Tab 1 Dashboard.
  - Added dedicated Performance & Attempt Progression Tracking Layer inside each paper accordion displaying latest attempt, improvement trend vs Attempt #1 (`▲ +X.XX` / `▼`), best net score, and total finished attempts.
  - Added `🔄 Reattempt Test` action buttons in the accordion header and attempt table, allowing immediate re-testing with automatic sequential recording of Attempt #N+1.

## [2.2.0] - 2026-10-02

### Added
- Local-first Hexagonal Architecture with `local_storage/` Single Source of Truth mapping 1-to-1 to Google Drive.
- Dual-mode banking PDF parser supporting both full mock exam papers and banking current affairs study notes.
- Authentic SBI PO examination simulation engine (+1.00 gross mark, -0.25 negative penalty, 5 options A-E).
- Interactive 3-Tab UI architecture:
  - Tab 1: Dashboard with Sub-Tab A (Timed Quiz metrics & accordion attempt history) and Sub-Tab B (Revision session analytics).
  - Tab 2: Timed Quiz module with real-time countdown, TCS iON question palette, and evaluation.
  - Tab 3: Custom Revision module with multi-select PDF checklist, "Select All", and question shuffler.
- Official Google Gmail API v3 client with local mock HTML email fallback.
- Ingested sample `May Banking_News_handwritten_Notes.pdf` into `local_storage/inputs/`.
- Enterprise `AppError` framework and structured JSONL logging.
