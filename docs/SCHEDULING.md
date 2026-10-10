# Automated Scheduling & Windows Startup Guide

## 1. Overview
The **Daily Q&A Banking Platform** provides automated dispatch of comprehensive two-tier performance reports (covering **Last Week's Metrics** and **Overall / All-Time Cumulative Progress**) exclusively to:
- `addytiwari3@gmail.com`
- `tiwariashwani5534@gmail.com`

**Schedule:** Every Sunday at 08:00 AM IST (`SUN 08:00`).  
**Cron Expression:** `0 8 * * 0`
**Content:** 
1. **Last Week's Progress Snapshot:** Quizzes taken in past 7 days, weekly accuracy, penalty marks, questions practiced, and paper-by-paper activity.
2. **Overall Cumulative Performance:** Total all-time quizzes taken, total questions practiced, all-time best net score, cumulative average accuracy, and total papers completed.


---

## 2. Windows Task Scheduler Setup

### Instant Registration
Run the included batch script or PowerShell script:
```powershell
# From project root:
powershell -ExecutionPolicy Bypass -File scripts\schedule-sunday-8am.ps1
```
Or double-click `scripts\schedule-sunday-8am.bat`.

### Command Details
The task can be registered dynamically via the included PowerShell script (which automatically resolves your current repository directory) or using `schtasks.exe`:
```powershell
# Recommended: Automatically detects your project path
powershell -ExecutionPolicy Bypass -File .\scripts\schedule-sunday-8am.ps1
```
Or directly via `schtasks`:
```cmd
schtasks /create /tn "DailyQandA_WeeklyReport_Sunday8AM" /tr "node \"%CD%\scripts\send-weekly-report.js\"" /sc WEEKLY /d SUN /st 08:00 /f
```

### Checking Task Status
To view current task status and next run time:
```cmd
schtasks /query /tn "DailyQandA_WeeklyReport_Sunday8AM" /fo LIST
```

### Removing the Task
```cmd
scripts\remove-schedule.bat
```

---

## 3. Windows Startup Functionality (`shell:startup`)

To ensure that the scheduler is verified and active whenever Windows starts up:

1. Run the copy script:
   ```cmd
   scripts\copy-to-startup.bat
   ```
   Or PowerShell:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\copy-to-startup.ps1
   ```
2. This places `DailyQandA_Startup_WeeklyScheduler.bat` into:
   `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup` (`shell:startup`).
3. Whenever you turn on your PC and log into Windows, this startup helper:
   - Verifies that `DailyQandA_WeeklyReport_Sunday8AM` is registered in Task Scheduler.
   - If the PC was powered off during Sunday 8:00 AM, it performs an automatic catch-up check to ensure your weekly report is never missed.

---

## 4. Manual Testing

You can trigger a live report dispatch at any time without waiting for Sunday:
```bash
node scripts/send-weekly-report.js
```
This script runs in two modes:
1. **Online Mode:** If the local web server (`npm run dev`) is running on port 3000, it calls `POST /api/reports/dispatch-gmail`.
2. **Autonomous Offline Mode:** If the server is closed, it parses local quiz attempts directly from `local_storage/`, builds the HTML report, and sends it directly via SMTP using Google App Passwords configured in `.env`.
