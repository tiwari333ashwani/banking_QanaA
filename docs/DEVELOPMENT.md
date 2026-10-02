# Local Development & Operation Guide

**Project:** Daily Q&A Banking Utility Application  

---

## 1. Local Environment Setup

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default values in `.env` are configured for immediate offline local operation with `MOCK_EMAIL_DISPATCH=true`.

### Step 3: Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to interact with the platform.

---

## 2. Ingesting Weekly Question Papers & Hierarchical Naming Convention

To ensure seamless organization and automated parsing across weekly test materials, all uploaded PDF files must adhere to the standardized **Hierarchical Naming Standard**:

```
[Topic]_[Month][Year]_Week[X].pdf
```

### Examples:
- `banking_may2026_week1.pdf` -> Topic: **Banking**, Period: **May 2026 (Week 1)**
- `ga_june2026_week2.pdf` -> Topic: **GA (General Awareness)**, Period: **June 2026 (Week 2)**
- `prelims_april2026_week4.pdf` -> Topic: **Prelims Mock**, Period: **April 2026 (Week 4)**

### How the Pipeline Processes Weekly PDFs:
1. **Drop File:** Place your PDF file into `local_storage/inputs/` (e.g. `local_storage/inputs/banking_may2026_week1.pdf`).
2. **Scan Inputs:** Click **"Scan Inputs"** in the top navigation bar or trigger `POST /api/parser/ingest`.
3. **Automated Metadata Extraction:**
   - The parser inspects the hierarchical name, sets clean metadata badges (e.g., `📁 banking_may2026_week1`, `📅 May 2026 • Week 1`), and structures the output under `local_storage/processed/banking_may2026_week1/`.
4. **Platform Availability:**
   - **Tab 1: Dashboard:** Listed with hierarchical name, past attempt progression tracking, and quick reattempt launcher.
   - **Tab 2: Timed Exam:** Select from the styled hierarchical dropdown, with automatic tracking for Attempt #1, #2, #3, etc.
   - **Tab 3: Custom Revision:** Combine multiple weekly papers for randomized drills without any UI overlapping.

---

## 3. Testing Email Reports Locally

When `MOCK_EMAIL_DISPATCH=true` in `.env`:
- Triggering a report (via `POST /api/reports/dispatch-gmail`) writes the fully styled HTML email directly into `local_storage/reports/weekly/`.
- You can inspect the generated HTML in your browser to verify layouts without sending external network traffic.
