# Local Development & Operation Guide

**Project:** Daily Q&A Banking Utility Application  

---

## 1. Local Environment Setup

### Prerequisites
- **Node.js:** `v18+` or `v24+ LTS`
- **Python:** `3.10+` or `3.13+`

### Step 1: Python Virtual Environment Setup
When setting up on a new machine (or after copying project files from another laptop), virtual environments cannot simply be copied due to hardcoded interpreter paths. Always reconstitute the virtual environment cleanly:

```powershell
# In project root:
python -m venv venv --clear
.\venv\Scripts\pip install -r requirements.txt
```

To activate the venv:
- **PowerShell:** `.\venv\Scripts\Activate.ps1`
- **Command Prompt:** `.\venv\Scripts\activate.bat`

> **Note on PowerShell Execution Policy:** If script execution is disabled by default on your Windows machine, either run:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> or run commands via `npm.cmd` and batch scripts directly.

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` if not already present:
```bash
cp .env.example .env
```

Key environment configurations in `.env`:
- **Local Storage:** `STORAGE_PROVIDER=local` and `LOCAL_STORAGE_PATH=./local_storage`
- **Email Delivery (Option A - Direct SMTP):**
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your_email@gmail.com
  SMTP_APP_PASSWORD=your_16_char_app_password
  GMAIL_SENDER_EMAIL=your_email@gmail.com
  WEEKLY_REPORT_RECIPIENT_EMAIL=recipient1@gmail.com,recipient2@gmail.com
  MOCK_EMAIL_DISPATCH=false
  ```
- **Email Delivery (Option B - Offline Mock):** Set `MOCK_EMAIL_DISPATCH=true` to save generated reports locally in `local_storage/reports/weekly/`.

### Step 4: Run the Development Server
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

### Processing Workflow:
1. **Drop File:** Place your PDF file into `local_storage/inputs/` (e.g. `local_storage/inputs/banking_may2026_week1.pdf`).
2. **Scan Inputs:** Click **"Scan Inputs"** in the top navigation bar or trigger `POST /api/parser/scan`.
3. **Automated Metadata Extraction:**
   - The parser inspects the hierarchical name, sets clean metadata badges (e.g., `📁 banking_may2026_week1`, `📅 May 2026 • Week 1`), and structures the output under `local_storage/processed/banking_may2026_week1/`.
4. **Platform Availability:**
   - **Tab 1: Dashboard:** Listed with hierarchical name, past attempt progression tracking, and quick reattempt launcher.
   - **Tab 2: Timed Exam:** Select from the hierarchical dropdown, with automatic tracking for Attempt #1, #2, #3, etc.
   - **Tab 3: Custom Revision:** Combine multiple weekly papers for randomized drills without any UI overlapping.

---

## 3. Starting Fresh & Data Reset

If you wish to clear all past exam attempts, revision sessions, and logs to start fresh with a clean slate:

```powershell
# Reset all user activity while preserving folder structures:
$directories = @(
    "local_storage\attempts\revision_sessions",
    "local_storage\attempts\timed_quiz",
    "local_storage\logs",
    "local_storage\reports\weekly"
)
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Get-ChildItem -Path $dir -Exclude ".gitkeep" | Remove-Item -Recurse -Force
    }
}
```

To also remove all ingested question papers and raw input PDFs for a complete total reset, add `"local_storage\inputs"` and `"local_storage\processed"` to the list. All `.gitkeep` files will be preserved.

---

## 4. Testing Email Reports Locally

- **Offline Mock Mode (`MOCK_EMAIL_DISPATCH=true`):** Triggering a report (via `POST /api/reports/dispatch-gmail` or `node scripts/send-weekly-report.js`) writes the fully styled HTML email directly into `local_storage/reports/weekly/`.
- **Live SMTP Mode (`MOCK_EMAIL_DISPATCH=false`):** Sends the report directly to the recipients specified in `WEEKLY_REPORT_RECIPIENT_EMAIL`.

