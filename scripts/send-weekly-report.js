/**
 * Standalone Weekly Report Dispatcher
 * Scheduled to run every Sunday at 08:00 AM.
 * 
 * Capable of autonomous execution:
 * 1. Attempts API dispatch if dev server (localhost:3000) is running.
 * 2. If server is offline, performs direct local aggregation from local_storage
 *    and sends email directly via nodemailer using SMTP credentials in .env.
 */

const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const ENV_PATH = path.join(PROJECT_ROOT, ".env");
const STORAGE_ROOT = path.join(PROJECT_ROOT, "local_storage");

// 1. Load Environment Variables from .env
function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    const lines = fs.readFileSync(ENV_PATH, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

// 2. Structured File Logging
function appendLog(level, message, metadata = {}) {
  try {
    const today = new Date().toISOString().split("T")[0];
    const logDir = path.join(STORAGE_ROOT, "logs", today);
    fs.mkdirSync(logDir, { recursive: true });
    const logFile = path.join(logDir, "application.log");
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      component: "StandaloneWeeklyReportScript",
      message,
      metadata,
    }) + "\n";
    fs.appendFileSync(logFile, entry, "utf-8");
  } catch (err) {
    console.error("[Logger Error]", err);
  }
}

// 3. Compile Weekly & Overall Metrics directly from local_storage
function compileLocalWeeklyMetrics() {
  const now = new Date();
  const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Read papers from local_storage/processed (and legacy fallback extracted_papers)
  let papers = [];
  const processedDir = path.join(STORAGE_ROOT, "processed");
  if (fs.existsSync(processedDir)) {
    const folders = fs.readdirSync(processedDir);
    for (const folder of folders) {
      const metaPath = path.join(processedDir, folder, "metadata.json");
      if (fs.existsSync(metaPath)) {
        try {
          const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
          papers.push(raw);
        } catch {}
      }
    }
  }

  const legacyPapersDir = path.join(STORAGE_ROOT, "extracted_papers");
  if (papers.length === 0 && fs.existsSync(legacyPapersDir)) {
    const files = fs.readdirSync(legacyPapersDir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(legacyPapersDir, f), "utf-8"));
        papers.push(raw);
      } catch {}
    }
  }

  const attemptsDir = path.join(STORAGE_ROOT, "attempts", "timed_quiz");
  let allLifetimeAttempts = [];
  let weeklyAttempts = [];
  if (fs.existsSync(attemptsDir)) {
    const paperDirs = fs.readdirSync(attemptsDir);
    for (const pDir of paperDirs) {
      const fullPDir = path.join(attemptsDir, pDir);
      if (fs.statSync(fullPDir).isDirectory()) {
        const attFiles = fs.readdirSync(fullPDir).filter((f) => f.endsWith(".json"));
        for (const af of attFiles) {
          try {
            const att = JSON.parse(fs.readFileSync(path.join(fullPDir, af), "utf-8"));
            allLifetimeAttempts.push(att);
            const t = new Date(att.timestamp).getTime();
            if (t >= past7Days.getTime() && t <= now.getTime()) {
              weeklyAttempts.push(att);
            }
          } catch {}
        }
      }
    }
  }

  const revisionsDir = path.join(STORAGE_ROOT, "attempts", "revision_sessions");
  let allLifetimeRevisions = [];
  let weeklyRevisions = [];
  if (fs.existsSync(revisionsDir)) {
    const revFiles = fs.readdirSync(revisionsDir).filter((f) => f.endsWith(".json"));
    for (const rf of revFiles) {
      try {
        const rev = JSON.parse(fs.readFileSync(path.join(revisionsDir, rf), "utf-8"));
        allLifetimeRevisions.push(rev);
        const t = new Date(rev.timestamp).getTime();
        if (t >= past7Days.getTime() && t <= now.getTime()) {
          weeklyRevisions.push(rev);
        }
      } catch {}
    }
  }

  // Last Week Metrics
  const totalQuizzesTaken = weeklyAttempts.length;
  const totalRevisionSessions = weeklyRevisions.length;
  const totalQuestionsPracticed =
    weeklyAttempts.reduce((acc, a) => acc + (a.attemptedCount || 0), 0) +
    weeklyRevisions.reduce((acc, r) => acc + (r.totalQuestions || 0), 0);

  const netScoreSum = weeklyAttempts.reduce((acc, a) => acc + (a.netScore || 0), 0);
  const averageQuizNetScore =
    totalQuizzesTaken > 0 ? parseFloat((netScoreSum / totalQuizzesTaken).toFixed(2)) : 0;

  const accuracySum =
    weeklyAttempts.reduce((acc, a) => acc + (a.accuracyPercentage || 0), 0) +
    weeklyRevisions.reduce((acc, r) => acc + (r.accuracyPercentage || 0), 0);
  const totalSessions = totalQuizzesTaken + totalRevisionSessions;
  const averageAccuracy =
    totalSessions > 0 ? parseFloat((accuracySum / totalSessions).toFixed(1)) : 0;

  const totalNegativeMarksIncurred = weeklyAttempts.reduce((acc, a) => acc + (a.negativePenalty || 0), 0);

  const paperBreakdown = papers.map((p) => {
    const weekAttempts = weeklyAttempts.filter((a) => a.paperId === p.id);
    const best = weekAttempts.length > 0 ? Math.max(...weekAttempts.map((a) => a.netScore || 0)) : 0;
    return {
      paperTitle: p.title || p.id,
      attemptsThisWeek: weekAttempts.length,
      bestScore: best,
    };
  });

  // Overall Cumulative All-Time Metrics
  const overallQuizzesTaken = allLifetimeAttempts.length;
  const overallRevisionSessions = allLifetimeRevisions.length;
  const overallQuestionsPracticed =
    allLifetimeAttempts.reduce((acc, a) => acc + (a.attemptedCount || 0), 0) +
    allLifetimeRevisions.reduce((acc, r) => acc + (r.totalQuestions || 0), 0);
  const overallBestNetScore =
    allLifetimeAttempts.length > 0 ? Math.max(...allLifetimeAttempts.map((a) => a.netScore || 0)) : 0;
  const overallTotalSessions = overallQuizzesTaken + overallRevisionSessions;
  const overallAccuracySum =
    allLifetimeAttempts.reduce((acc, a) => acc + (a.accuracyPercentage || 0), 0) +
    allLifetimeRevisions.reduce((acc, r) => acc + (r.accuracyPercentage || 0), 0);
  const overallAverageAccuracy =
    overallTotalSessions > 0 ? parseFloat((overallAccuracySum / overallTotalSessions).toFixed(1)) : 0;

  return {
    weekLabel: `Week of ${past7Days.toLocaleDateString("en-IN", { month: "short", day: "2-digit" })} - ${now.toLocaleDateString("en-IN", { month: "short", day: "2-digit" })}`,
    startDate: past7Days.toISOString(),
    endDate: now.toISOString(),
    totalQuizzesTaken,
    totalRevisionSessions,
    totalQuestionsPracticed,
    averageQuizNetScore,
    averageAccuracy,
    totalNegativeMarksIncurred: parseFloat(totalNegativeMarksIncurred.toFixed(2)),
    strongestSection: "Reasoning Ability",
    weakestSection: "Quantitative Aptitude",
    paperBreakdown,
    overallMetrics: {
      totalQuizzesTaken: overallQuizzesTaken,
      totalRevisionSessions: overallRevisionSessions,
      totalQuestionsPracticed: overallQuestionsPracticed,
      bestNetScore: overallBestNetScore,
      averageAccuracy: overallAverageAccuracy,
      totalPapersAvailable: papers.length,
    },
    generatedAt: new Date().toISOString(),
  };
}

// 4. Generate HTML Template
function generateReportHtml(metrics) {
  const paperRows = metrics.paperBreakdown
    .map(
      (p) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; font-weight: 500; color: #1e293b;">${p.paperTitle}</td>
        <td style="padding: 12px; text-align: center; color: #475569;">${p.attemptsThisWeek}</td>
        <td style="padding: 12px; text-align: right; font-weight: 600; color: #0284c7;">${p.bestScore.toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Weekly SBI PO Banking Preparation Report</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #0f172a;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 32px 24px; color: #ffffff;">
          <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.85; margin-bottom: 6px;">
            Daily Q&A Banking Platform
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Weekly & Overall Performance Report</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${metrics.weekLabel} • Automated Sunday 8:00 AM IST Digest</p>
        </div>

        <!-- Section 1: Last Week KPI Cards Grid -->
        <div style="padding: 24px; background: #ffffff;">
          <div style="font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
            📅 Last Week's Snapshot (Past 7 Days)
          </div>
          <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0;">
            <tr>
              <td style="width: 33%; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #166534; text-transform: uppercase;">Quizzes (Week)</div>
                <div style="font-size: 24px; font-weight: 800; color: #15803d; margin-top: 4px;">${metrics.totalQuizzesTaken}</div>
              </td>
              <td style="width: 33%; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #1e40af; text-transform: uppercase;">Accuracy (Week)</div>
                <div style="font-size: 24px; font-weight: 800; color: #2563eb; margin-top: 4px;">${metrics.averageAccuracy}%</div>
              </td>
              <td style="width: 33%; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="font-size: 11px; font-weight: 600; color: #991b1b; text-transform: uppercase;">Penalty (Week)</div>
                <div style="font-size: 24px; font-weight: 800; color: #dc2626; margin-top: 4px;">-${metrics.totalNegativeMarksIncurred}</div>
              </td>
            </tr>
          </table>

          <!-- Secondary Weekly Metrics -->
          <div style="margin-top: 16px; padding: 14px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="color: #64748b;">Questions Practiced (This Week):</span>
              <strong style="color: #0f172a;">${metrics.totalQuestionsPracticed}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Revision Drills (This Week):</span>
              <strong style="color: #0f172a;">${metrics.totalRevisionSessions} sessions</strong>
            </div>
          </div>

          <!-- Paper Activity Table -->
          <h3 style="margin: 24px 0 10px 0; font-size: 15px; color: #0f172a;">Weekly Paper-by-Paper Activity</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; color: #475569;">
                <th style="padding: 10px 12px; border-radius: 6px 0 0 6px;">Paper Title</th>
                <th style="padding: 10px 12px; text-align: center;">Attempts</th>
                <th style="padding: 10px 12px; text-align: right; border-radius: 0 6px 6px 0;">Best Net Score</th>
              </tr>
            </thead>
            <tbody>
              ${paperRows || '<tr><td colspan="3" style="padding: 14px; text-align: center; color: #94a3b8;">No paper attempts recorded this week.</td></tr>'}
            </tbody>
          </table>

          <!-- Section 2: Overall Cumulative Progress -->
          ${
            metrics.overallMetrics
              ? `
          <div style="margin-top: 28px; padding: 20px; background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0;">
            <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">
              🏆 Overall Cumulative Preparation Progress (All-Time)
            </div>
            <table style="width: 100%; border-collapse: separate; border-spacing: 8px 0;">
              <tr>
                <td style="background: #ffffff; border: 1px solid #dcfce7; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Total Quizzes</div>
                  <div style="font-size: 20px; font-weight: 800; color: #15803d; margin-top: 2px;">${metrics.overallMetrics.totalQuizzesTaken}</div>
                </td>
                <td style="background: #ffffff; border: 1px solid #dcfce7; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Best Net Score</div>
                  <div style="font-size: 20px; font-weight: 800; color: #0284c7; margin-top: 2px;">${metrics.overallMetrics.bestNetScore.toFixed(2)}</div>
                </td>
                <td style="background: #ffffff; border: 1px solid #dcfce7; border-radius: 6px; padding: 12px; text-align: center;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Overall Accuracy</div>
                  <div style="font-size: 20px; font-weight: 800; color: #2563eb; margin-top: 2px;">${metrics.overallMetrics.averageAccuracy}%</div>
                </td>
              </tr>
            </table>
            <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed #bbf7d0; font-size: 13px; color: #1e3a5f;">
              <div>Questions Practiced (All-Time): <strong>${metrics.overallMetrics.totalQuestionsPracticed}</strong></div>
              <div style="margin-top: 4px;">Revision Drills Completed: <strong>${metrics.overallMetrics.totalRevisionSessions}</strong></div>
              <div style="margin-top: 4px;">Question Papers Available: <strong>${metrics.overallMetrics.totalPapersAvailable}</strong></div>
            </div>
          </div>
          `
              : ""
          }

          <!-- Call to Action -->
          <div style="margin-top: 28px; text-align: center; padding-top: 18px; border-top: 1px solid #e2e8f0;">
            <p style="font-size: 13px; color: #64748b; margin: 0 0 10px 0;">
              Consistency is the key to cracking SBI PO. Keep solving drills daily!
            </p>
          </div>

        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
          Generated automatically by Daily Q&A Banking Utility • Local-First Scheduled Dispatch
        </div>
      </div>
    </body>
    </html>
  `;
}

// 5. Direct SMTP Dispatch via nodemailer
async function dispatchViaSmtp(recipients, metrics) {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_SENDER_EMAIL || "addytiwari3@gmail.com";
  const rawPassword = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASSWORD;
  if (!rawPassword) {
    throw new Error("SMTP_APP_PASSWORD is missing in .env");
  }
  const cleanPassword = rawPassword.replace(/\s+/g, "");
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465,
    auth: {
      user: smtpUser,
      pass: cleanPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const subject = `Weekly Performance Report - Daily Q&A Banking (${metrics.weekLabel})`;
  const htmlContent = generateReportHtml(metrics);

  const plainText = [
    `Daily Q&A Banking Platform - Weekly & Overall Performance Report`,
    `Period: ${metrics.weekLabel}`,
    `--------------------------------------------------`,
    `[LAST WEEK'S METRICS (PAST 7 DAYS)]`,
    `Quizzes Taken (Week): ${metrics.totalQuizzesTaken}`,
    `Questions Practiced (Week): ${metrics.totalQuestionsPracticed}`,
    `Average Accuracy (Week): ${metrics.averageAccuracy}%`,
    `Negative Penalty (Week): -${metrics.totalNegativeMarksIncurred}`,
    `Revision Drills (Week): ${metrics.totalRevisionSessions}`,
    ...(metrics.overallMetrics
      ? [
          `--------------------------------------------------`,
          `[OVERALL / ALL-TIME CUMULATIVE METRICS]`,
          `Total All-Time Quizzes: ${metrics.overallMetrics.totalQuizzesTaken}`,
          `Total All-Time Questions: ${metrics.overallMetrics.totalQuestionsPracticed}`,
          `All-Time Best Net Score: ${metrics.overallMetrics.bestNetScore.toFixed(2)}`,
          `Overall Cumulative Accuracy: ${metrics.overallMetrics.averageAccuracy}%`,
          `Total Revision Drills: ${metrics.overallMetrics.totalRevisionSessions}`,
          `Total Question Papers: ${metrics.overallMetrics.totalPapersAvailable}`,
        ]
      : []),
    `--------------------------------------------------`,
    `Generated At: ${metrics.generatedAt}`,
  ].join("\n");

  const reportsDir = path.join(STORAGE_ROOT, "reports", "weekly");
  fs.mkdirSync(reportsDir, { recursive: true });
  const timestamp = Date.now();
  const htmlPath = path.join(reportsDir, `report_${timestamp}.html`);
  const jsonPath = path.join(reportsDir, `report_${timestamp}.json`);
  fs.writeFileSync(htmlPath, htmlContent, "utf-8");
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), "utf-8");

  const info = await transporter.sendMail({
    from: `"Daily Q&A Banking Platform" <${smtpUser}>`,
    to: recipients.join(", "),
    replyTo: smtpUser,
    subject,
    text: plainText,
    html: htmlContent,
    headers: {
      "X-Auto-Response-Suppress": "All",
      "Auto-Submitted": "auto-generated",
    },
  });

  return {
    success: true,
    messageId: info.messageId,
    recipients: recipients.join(", "),
    savedReportPath: htmlPath,
  };
}

// 6. Main Orchestrator
async function main() {
  console.log("=======================================================");
  console.log(" Daily Q&A Banking - Automated Weekly Report Dispatcher");
  console.log(" Scheduled for Sunday 8:00 AM (Weekly Only)");
  console.log("=======================================================");

  loadEnv();

  const recipientString =
    process.env.WEEKLY_REPORT_RECIPIENT_EMAIL ||
    "addytiwari3@gmail.com,tiwariashwani5534@gmail.com";
  const recipients = recipientString
    .split(/[,;]+/)
    .map((r) => r.trim())
    .filter(Boolean);

  console.log(`[Target Recipients]: ${recipients.join(", ")}`);

  // First try: If local server is running on localhost:3000, call the official API endpoint
  let dispatched = false;
  try {
    console.log("[Mode 1] Checking if local web service is online at http://localhost:3000...");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch("http://localhost:3000/api/reports/dispatch-gmail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientEmail: recipients.join(", ") }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      console.log(">> Successfully dispatched via Local Web Server API!");
      console.log(`   Message ID: ${data.result?.messageId || "Delivered"}`);
      appendLog("INFO", "Dispatched weekly report via Web API", data);
      dispatched = true;
    }
  } catch (apiErr) {
    console.log("   (Web server offline or unreachable. Falling back directly to local SMTP engine...)");
  }

  // Second try: Autonomous offline direct SMTP engine
  if (!dispatched) {
    try {
      console.log("[Mode 2] Executing standalone local aggregation & SMTP dispatch...");
      const metrics = compileLocalWeeklyMetrics();
      const result = await dispatchViaSmtp(recipients, metrics);
      console.log(">> Successfully dispatched directly via SMTP!");
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   Saved Archive: ${result.savedReportPath}`);
      appendLog("INFO", "Dispatched weekly report via direct SMTP engine", result);
    } catch (smtpErr) {
      console.error("!! Error dispatching weekly report:", smtpErr.message);
      appendLog("ERROR", "Failed to dispatch weekly report", { error: smtpErr.message });
      process.exit(1);
    }
  }

  console.log("=======================================================");
  console.log(" Weekly Report Dispatch Complete.");
  console.log("=======================================================");
}

main().catch((e) => {
  console.error("Fatal exception:", e);
  process.exit(1);
});
