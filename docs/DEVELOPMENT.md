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

## 2. Ingesting New Question Papers or Notes

1. Place your PDF file into `local_storage/inputs/` (e.g. `local_storage/inputs/My-Banking-Paper.pdf`).
2. Run the extraction pipeline or trigger it from the UI.
3. The extracted question set will appear in `local_storage/processed/My-Banking-Paper/questions.json`.
4. The paper is immediately ready for:
   - Timed examination in **Tab 2**.
   - Custom multi-select revision drills in **Tab 3**.
   - Tracking under **Tab 1: Dashboard**.

---

## 3. Testing Email Reports Locally

When `MOCK_EMAIL_DISPATCH=true` in `.env`:
- Triggering a report (via `POST /api/reports/dispatch-gmail`) writes the fully styled HTML email directly into `local_storage/reports/weekly/`.
- You can inspect the generated HTML in your browser to verify layouts without sending external network traffic.
