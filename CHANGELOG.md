# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
