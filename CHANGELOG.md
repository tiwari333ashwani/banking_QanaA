# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
