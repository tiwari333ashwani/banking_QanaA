"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function TopNav() {
  const pathname = usePathname();
  const [scanning, setScanning] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleScanInputs = async () => {
    try {
      setScanning(true);
      setStatusMessage("Scanning local_storage/inputs/ for new PDFs...");
      const res = await fetch("/api/parser/scan", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(
          `Scan completed! Newly processed: ${data.newlyProcessedCount}, Total: ${data.totalPdfsFound}`
        );
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setStatusMessage(`Scan failed: ${data.error}`);
      }
    } catch {
      setStatusMessage("Network error triggering scanner.");
    } finally {
      setScanning(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleSendWeeklyReport = async () => {
    try {
      setDispatching(true);
      setStatusMessage("Compiling and dispatching weekly report via Gmail API...");
      const res = await fetch("/api/reports/dispatch-gmail", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setStatusMessage(
          `Report dispatched successfully (${data.result.mode}) to ${data.result.recipient}!`
        );
      } else {
        setStatusMessage(`Dispatch failed: ${data.error}`);
      }
    } catch {
      setStatusMessage("Network error triggering report dispatch.");
    } finally {
      setDispatching(false);
      setTimeout(() => setStatusMessage(null), 4500);
    }
  };

  return (
    <header style={{
      backgroundColor: "rgba(17, 24, 39, 0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-subtle)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "800",
            fontSize: "18px",
            color: "#ffffff",
            boxShadow: "0 2px 10px rgba(2, 132, 199, 0.4)"
          }}>
            Q
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: "700", fontSize: "16px", color: "var(--text-primary)" }}>
                Daily Q&A Banking
              </span>
              <span className="badge badge-blue">SBI PO Simulator</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Stateless • Zero-Cache • Drive-Ready Local Storage
            </div>
          </div>
        </div>

        {/* 3 Main Workflows Tabs */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--bg-primary)",
          padding: "4px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)"
        }}>
          <Link
            href="/"
            style={{
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "var(--radius-md)",
              color: pathname === "/" ? "#ffffff" : "var(--text-secondary)",
              backgroundColor: pathname === "/" ? "var(--bg-surface)" : "transparent",
              transition: "all 0.2s ease"
            }}
          >
            Tab 1: Dashboard
          </Link>
          <Link
            href="/quiz"
            style={{
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "var(--radius-md)",
              color: pathname === "/quiz" ? "#ffffff" : "var(--text-secondary)",
              backgroundColor: pathname === "/quiz" ? "var(--bg-surface)" : "transparent",
              transition: "all 0.2s ease"
            }}
          >
            Tab 2: Timed Quiz
          </Link>
          <Link
            href="/revision"
            style={{
              padding: "7px 16px",
              fontSize: "13px",
              fontWeight: "600",
              borderRadius: "var(--radius-md)",
              color: pathname === "/revision" ? "#ffffff" : "var(--text-secondary)",
              backgroundColor: pathname === "/revision" ? "var(--bg-surface)" : "transparent",
              transition: "all 0.2s ease"
            }}
          >
            Tab 3: Revision
          </Link>
        </nav>

        {/* Utility Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={handleScanInputs}
            disabled={scanning}
            className="btn btn-secondary btn-sm"
            title="Scan local_storage/inputs/ for newly dropped PDFs"
          >
            {scanning ? "Scanning..." : "📁 Scan Inputs"}
          </button>
          <button
            onClick={handleSendWeeklyReport}
            disabled={dispatching}
            className="btn btn-primary btn-sm"
            title="Generate and dispatch weekly summary report"
          >
            {dispatching ? "Sending..." : "✉️ Send Report"}
          </button>
        </div>
      </div>

      {/* Floating Status Notification */}
      {statusMessage && (
        <div style={{
          backgroundColor: "#0284c7",
          color: "#ffffff",
          textAlign: "center",
          padding: "6px 16px",
          fontSize: "12px",
          fontWeight: "600",
          letterSpacing: "0.02em",
          animation: "fadeIn 0.2s ease"
        }}>
          {statusMessage}
        </div>
      )}
    </header>
  );
}
