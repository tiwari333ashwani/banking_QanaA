"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PaperSummary } from "@/core/entities/paper.entity";
import { TimedQuizAttempt, RevisionSession } from "@/core/entities/attempt.entity";
import { formatTimestamp, formatDuration } from "@/lib/utils";

export default function DashboardPage() {
  const [activeSubTab, setActiveSubTab] = useState<"QUIZ" | "REVISION">("QUIZ");
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [revisions, setRevisions] = useState<RevisionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [selectedPaperDropdownId, setSelectedPaperDropdownId] = useState("");

  // Accordion state: map of paperId -> boolean (expanded)
  const [expandedPapers, setExpandedPapers] = useState<Record<string, boolean>>({});
  // Cached attempts map: paperId -> TimedQuizAttempt[]
  const [paperAttemptsMap, setPaperAttemptsMap] = useState<Record<string, TimedQuizAttempt[]>>({});
  const [loadingAttempts, setLoadingAttempts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [papersRes, revRes] = await Promise.all([
        fetch("/api/papers"),
        fetch("/api/revisions"),
      ]);

      const papersData = await papersRes.json();
      const revData = await revRes.json();

      if (papersData.success) {
        setPapers(papersData.papers);
        // By default, auto-expand the first paper if it has attempts
        if (papersData.papers.length > 0) {
          const firstId = papersData.papers[0].id;
          setSelectedPaperDropdownId(firstId);
          setExpandedPapers({ [firstId]: true });
          fetchPaperAttempts(firstId);
        }
      }
      if (revData.success) {
        setRevisions(revData.sessions);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaperAttempts = async (paperId: string) => {
    if (paperAttemptsMap[paperId]) return; // already loaded
    try {
      setLoadingAttempts((prev) => ({ ...prev, [paperId]: true }));
      const res = await fetch(`/api/papers/${paperId}`);
      const data = await res.json();
      if (data.success) {
        setPaperAttemptsMap((prev) => ({ ...prev, [paperId]: data.attempts || [] }));
      }
    } catch (err) {
      console.error(`Failed to fetch attempts for ${paperId}:`, err);
    } finally {
      setLoadingAttempts((prev) => ({ ...prev, [paperId]: false }));
    }
  };

  const toggleAccordion = (paperId: string) => {
    const nextState = !expandedPapers[paperId];
    setExpandedPapers((prev) => ({ ...prev, [paperId]: nextState }));
    if (nextState && !paperAttemptsMap[paperId]) {
      fetchPaperAttempts(paperId);
    }
  };

  // Sub-Tab A KPI Computations
  const totalPapersCount = papers.length;
  const totalQuizAttemptsCount = papers.reduce((acc, p) => acc + (p.attemptCount || 0), 0);
  const attemptedPapers = papers.filter((p) => (p.attemptCount || 0) > 0);
  const overallAvgScore =
    attemptedPapers.length > 0
      ? (
          attemptedPapers.reduce((acc, p) => acc + (p.averageNetScore || 0), 0) /
          attemptedPapers.length
        ).toFixed(1)
      : "0.0";

  // Sub-Tab B KPI Computations
  const totalRevisionsCount = revisions.length;
  const totalQuestionsRevised = revisions.reduce((acc, r) => acc + r.totalQuestions, 0);
  const avgRevisionAccuracy =
    totalRevisionsCount > 0
      ? (
          revisions.reduce((acc, r) => acc + r.accuracyPercentage, 0) / totalRevisionsCount
        ).toFixed(1)
      : "0.0";

  // Filtering Papers
  const filteredPapers = papers.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.hierarchicalName && p.hierarchicalName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory =
      selectedCategory === "ALL" ||
      p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--text-primary)" }}>
          Exam Preparation Dashboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
          Track past timed mock performance, sectional strengths, and randomized multi-paper revision sessions.
        </p>
      </div>

      {/* Sub-Tab Navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "28px",
        gap: "24px"
      }}>
        <button
          onClick={() => setActiveSubTab("QUIZ")}
          style={{
            padding: "12px 4px",
            fontSize: "15px",
            fontWeight: activeSubTab === "QUIZ" ? "700" : "500",
            color: activeSubTab === "QUIZ" ? "#38bdf8" : "var(--text-secondary)",
            borderBottom: activeSubTab === "QUIZ" ? "2px solid #38bdf8" : "2px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease"
          }}
        >
          <span>⏱️ Sub-Tab A: Timed Exam Dashboard</span>
          <span className="badge badge-blue">{totalQuizAttemptsCount} Attempts</span>
        </button>

        <button
          onClick={() => setActiveSubTab("REVISION")}
          style={{
            padding: "12px 4px",
            fontSize: "15px",
            fontWeight: activeSubTab === "REVISION" ? "700" : "500",
            color: activeSubTab === "REVISION" ? "#c084fc" : "var(--text-secondary)",
            borderBottom: activeSubTab === "REVISION" ? "2px solid #c084fc" : "2px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            transition: "all 0.2s ease"
          }}
        >
          <span>🔄 Sub-Tab B: Revision Test Dashboard</span>
          <span className="badge badge-purple">{totalRevisionsCount} Sessions</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB A: TIMED QUIZ METRICS & PAPER ACCORDIONS                          */}
      {/* ========================================================================= */}
      {activeSubTab === "QUIZ" && (
        <div className="animate-fade-in">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Papers Ingested</div>
              <div className="kpi-value">{totalPapersCount}</div>
              <div className="kpi-subtitle">From local_storage/inputs/</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Total Timed Attempts</div>
              <div className="kpi-value" style={{ color: "#38bdf8" }}>{totalQuizAttemptsCount}</div>
              <div className="kpi-subtitle">Completed under exam timer</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Average Net Score</div>
              <div className="kpi-value" style={{ color: "#34d399" }}>{overallAvgScore}</div>
              <div className="kpi-subtitle">Factor in -0.25 penalty</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Exam Marking Scheme</div>
              <div className="kpi-value" style={{ fontSize: "20px" }}>+1.00 / -0.25</div>
              <div className="kpi-subtitle">Authentic SBI PO standard</div>
            </div>
          </div>

          {/* Hierarchical Paper Selection Dropdown Bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "var(--bg-secondary)",
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            marginBottom: "20px",
            flexWrap: "wrap",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "13px", fontWeight: "700" }}>
              <span>📑 Select Question Paper:</span>
            </div>
            <div style={{ flex: "1 1 360px" }}>
              <select
                className="form-select"
                value={selectedPaperDropdownId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedPaperDropdownId(val);
                  if (val) {
                    setExpandedPapers((prev) => ({ ...prev, [val]: true }));
                    fetchPaperAttempts(val);
                  }
                }}
                style={{ width: "100%", fontSize: "13px", padding: "10px 38px 10px 14px" }}
              >
                <option value="">-- Choose a Question Paper from Library --</option>
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.hierarchicalName || p.id}] {p.title} — ({p.attemptCount || 0} attempts • Best: {p.bestNetScore !== undefined ? p.bestNetScore.toFixed(2) : "N/A"})
                  </option>
                ))}
              </select>
            </div>
            {selectedPaperDropdownId && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <Link
                  href={`/quiz?paperId=${selectedPaperDropdownId}`}
                  className="btn btn-primary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <span>🔄</span>
                  <span>Reattempt Test</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedPapers((prev) => ({ ...prev, [selectedPaperDropdownId]: true }));
                    fetchPaperAttempts(selectedPaperDropdownId);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  👁️ View Attempts
                </button>
              </div>
            )}
          </div>

          {/* Search & Category Filter Toolbar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 300px" }}>
              <input
                type="text"
                placeholder="🔍 Search by hierarchical name (e.g. banking_may2026_week1), title, month..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "480px",
                  padding: "9px 14px",
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "#ffffff",
                  fontSize: "13px"
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {["ALL", "BANKING", "PRELIMS", "SECTIONAL"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`btn btn-sm ${selectedCategory === cat ? "btn-primary" : "btn-secondary"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Accordion Master List */}
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              Loading papers and attempts from local storage...
            </div>
          ) : filteredPapers.length === 0 ? (
            <div style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--border-subtle)"
            }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>No Question Papers Found</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                Drop banking PDF files into <code>local_storage/inputs/</code> and click &quot;Scan Inputs&quot; in the header.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filteredPapers.map((paper) => {
                const isExpanded = Boolean(expandedPapers[paper.id]);
                const attempts = paperAttemptsMap[paper.id] || [];
                const isLoadingAttempts = Boolean(loadingAttempts[paper.id]);

                // Tracking Layer Summary Analytics
                const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
                const firstAttempt = attempts.length > 0 ? attempts[0] : null;
                const previousAttempt = attempts.length > 1 ? attempts[attempts.length - 2] : null;
                const scoreDiffLatestVsPrev = (latestAttempt && previousAttempt)
                  ? (latestAttempt.netScore - previousAttempt.netScore)
                  : 0;
                const overallDelta = (latestAttempt && firstAttempt && attempts.length > 1)
                  ? (latestAttempt.netScore - firstAttempt.netScore)
                  : 0;

                return (
                  <div
                    key={paper.id}
                    className="panel-card"
                    style={{
                      border: isExpanded ? "1px solid var(--accent-blue)" : "1px solid var(--border-subtle)",
                      transition: "border-color 0.2s ease"
                    }}
                  >
                    {/* Accordion Header (Click to toggle) */}
                    <div
                      onClick={() => toggleAccordion(paper.id)}
                      style={{
                        padding: "18px 22px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "16px",
                        backgroundColor: isExpanded ? "rgba(2, 132, 199, 0.04)" : "transparent",
                        userSelect: "none"
                      }}
                    >
                      {/* Left Title & Metadata */}
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", flex: "1 1 380px" }}>
                        <div style={{
                          fontSize: "18px",
                          marginTop: "2px",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          color: isExpanded ? "#38bdf8" : "var(--text-muted)"
                        }}>
                          ▶
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
                            <span
                              className="badge badge-purple"
                              style={{ fontFamily: "monospace", fontSize: "11px", fontWeight: "700" }}
                              title="Hierarchical Paper Identifier"
                            >
                              📁 {paper.hierarchicalName || paper.id}
                            </span>
                            {paper.periodLabel && (
                              <span className="badge badge-emerald" style={{ fontSize: "11px" }}>
                                📅 {paper.periodLabel}
                              </span>
                            )}
                            <span className="badge badge-blue">{paper.category}</span>
                          </div>
                          <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-primary)", marginBottom: "4px" }}>
                            {paper.title}
                          </h3>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            Questions: <strong>{paper.totalQuestions}</strong> • Max Marks: <strong>{paper.totalMarks}</strong> • Time: <strong>{paper.timeLimitMinutes} mins</strong> • Source: <code>{paper.sourceFileName}</code>
                          </div>
                        </div>
                      </div>

                      {/* Right Metrics & Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Best Net Score
                          </div>
                          <div style={{ fontSize: "17px", fontWeight: "800", color: "#34d399" }}>
                            {paper.bestNetScore !== undefined ? `${paper.bestNetScore.toFixed(2)}` : "—"}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                            Total Attempts
                          </div>
                          <div style={{ fontSize: "17px", fontWeight: "800", color: "#38bdf8" }}>
                            {paper.attemptCount || 0}
                          </div>
                        </div>

                        <Link
                          href={`/quiz?paperId=${paper.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="btn btn-primary btn-sm"
                          style={{ marginLeft: "6px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                        >
                          <span>🔄</span>
                          <span>{paper.attemptCount && paper.attemptCount > 0 ? "Reattempt Test" : "⚡ Take Exam"}</span>
                        </Link>
                      </div>
                    </div>

                    {/* Accordion Body: Attempt Tracking Layer & History */}
                    {isExpanded && (
                      <div style={{
                        borderTop: "1px solid var(--border-subtle)",
                        padding: "20px 22px",
                        backgroundColor: "rgba(11, 15, 25, 0.6)"
                      }}>
                        {/* Tracking Layer Header Bar */}
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "12px",
                          marginBottom: "16px"
                        }}>
                          <div>
                            <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#38bdf8", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>📈 Attempt Tracking & Performance Progression Layer</span>
                            </h4>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                              Monitored under authentic SBI PO marking engine (+1.00 / -0.25 penalty per question).
                            </p>
                          </div>

                          <Link
                            href={`/quiz?paperId=${paper.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                          >
                            <span>🔄</span>
                            <span>Launch Reattempt #{attempts.length + 1}</span>
                          </Link>
                        </div>

                        {/* Trajectory & Progression Overview Cards (if attempts exist) */}
                        {attempts.length > 0 && latestAttempt && (
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "12px",
                            marginBottom: "20px"
                          }}>
                            {/* Latest Attempt Card */}
                            <div style={{
                              padding: "14px",
                              backgroundColor: "var(--bg-secondary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-subtle)"
                            }}>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                Latest Attempt (#{latestAttempt.attemptNumber})
                              </div>
                              <div style={{ fontSize: "18px", fontWeight: "800", color: "#ffffff", marginTop: "4px" }}>
                                {latestAttempt.netScore.toFixed(2)} <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>/ {latestAttempt.totalMarks}</span>
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                                Accuracy: <strong>{latestAttempt.accuracyPercentage}%</strong>
                              </div>
                            </div>

                            {/* Performance Improvement Trend Card */}
                            <div style={{
                              padding: "14px",
                              backgroundColor: "var(--bg-secondary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-subtle)"
                            }}>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                Improvement Trend
                              </div>
                              {attempts.length > 1 ? (
                                <>
                                  <div style={{
                                    fontSize: "18px",
                                    fontWeight: "800",
                                    marginTop: "4px",
                                    color: overallDelta >= 0 ? "#34d399" : "#fb7185"
                                  }}>
                                    {overallDelta >= 0 ? `▲ +${overallDelta.toFixed(2)}` : `▼ ${overallDelta.toFixed(2)}`} Marks
                                  </div>
                                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                    {overallDelta >= 0 ? "Progressing higher than Attempt #1" : "Review weak areas & reattempt"}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: "15px", fontWeight: "700", color: "#38bdf8", marginTop: "4px" }}>
                                    Baseline Set
                                  </div>
                                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                    Take another attempt to chart trajectory
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Best Net Score Card */}
                            <div style={{
                              padding: "14px",
                              backgroundColor: "var(--bg-secondary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-subtle)"
                            }}>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                Highest Score Achieved
                              </div>
                              <div style={{ fontSize: "18px", fontWeight: "800", color: "#34d399", marginTop: "4px" }}>
                                {paper.bestNetScore !== undefined ? paper.bestNetScore.toFixed(2) : "—"}
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                Target Cutoff: ~{(paper.totalMarks * 0.65).toFixed(1)} marks
                              </div>
                            </div>

                            {/* Total Attempts Completed */}
                            <div style={{
                              padding: "14px",
                              backgroundColor: "var(--bg-secondary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--border-subtle)"
                            }}>
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                Sub-Dropdown History
                              </div>
                              <div style={{ fontSize: "18px", fontWeight: "800", color: "#c084fc", marginTop: "4px" }}>
                                {attempts.length} Finished Attempts
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                                Last active: {formatTimestamp(latestAttempt.timestamp)}
                              </div>
                            </div>
                          </div>
                        )}

                        {isLoadingAttempts ? (
                          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                            Loading attempt rows from local storage...
                          </div>
                        ) : attempts.length === 0 ? (
                          <div style={{
                            padding: "24px",
                            textAlign: "center",
                            backgroundColor: "var(--bg-secondary)",
                            borderRadius: "var(--radius-md)",
                            border: "1px dashed var(--border-subtle)",
                            fontSize: "13px",
                            color: "var(--text-muted)"
                          }}>
                            No timed attempts recorded yet for this paper. Click &quot;Take Exam&quot; to begin your first attempt!
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textAlign: "left" }}>
                                  <th style={{ padding: "10px 12px" }}>Attempt</th>
                                  <th style={{ padding: "10px 12px" }}>Date & Time</th>
                                  <th style={{ padding: "10px 12px" }}>Gross (+1.00)</th>
                                  <th style={{ padding: "10px 12px" }}>Negative (-0.25)</th>
                                  <th style={{ padding: "10px 12px" }}>Net Score</th>
                                  <th style={{ padding: "10px 12px" }}>Progression</th>
                                  <th style={{ padding: "10px 12px" }}>Accuracy</th>
                                  <th style={{ padding: "10px 12px" }}>Time Spent</th>
                                  <th style={{ padding: "10px 12px", textAlign: "right" }}>Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {attempts.map((att, idx) => {
                                  const prevAtt = idx > 0 ? attempts[idx - 1] : null;
                                  const delta = prevAtt ? att.netScore - prevAtt.netScore : null;

                                  return (
                                    <tr
                                      key={att.attemptId}
                                      style={{
                                        borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
                                        transition: "background-color 0.15s ease"
                                      }}
                                    >
                                      <td style={{ padding: "12px", fontWeight: "700", color: "#ffffff" }}>
                                        #{att.attemptNumber}
                                      </td>
                                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                                        {formatTimestamp(att.timestamp)}
                                      </td>
                                      <td style={{ padding: "12px", color: "#34d399", fontWeight: "600" }}>
                                        {att.correctCount} Qs (+{att.grossMarks.toFixed(2)})
                                      </td>
                                      <td style={{ padding: "12px", color: "#fb7185", fontWeight: "600" }}>
                                        {att.incorrectCount} Qs (-{att.negativePenalty.toFixed(2)})
                                      </td>
                                      <td style={{ padding: "12px" }}>
                                        <span style={{
                                          fontSize: "14px",
                                          fontWeight: "800",
                                          color: att.netScore >= (att.totalMarks * 0.7) ? "#34d399" : att.netScore >= (att.totalMarks * 0.5) ? "#fbbf24" : "#fb7185"
                                        }}>
                                          {att.netScore.toFixed(2)} / {att.totalMarks}
                                        </span>
                                      </td>
                                      <td style={{ padding: "12px" }}>
                                        {delta === null ? (
                                          <span className="badge badge-blue" style={{ fontSize: "11px" }}>Baseline</span>
                                        ) : delta > 0 ? (
                                          <span style={{ color: "#34d399", fontWeight: "700", fontSize: "12px" }}>
                                            ▲ +{delta.toFixed(2)}
                                          </span>
                                        ) : delta < 0 ? (
                                          <span style={{ color: "#fb7185", fontWeight: "700", fontSize: "12px" }}>
                                            ▼ {delta.toFixed(2)}
                                          </span>
                                        ) : (
                                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>= 0.00</span>
                                        )}
                                      </td>
                                      <td style={{ padding: "12px" }}>
                                        <span className="badge badge-purple">
                                          {att.accuracyPercentage}%
                                        </span>
                                      </td>
                                      <td style={{ padding: "12px", color: "var(--text-secondary)" }}>
                                        {formatDuration(att.timeSpentSeconds)}
                                      </td>
                                      <td style={{ padding: "12px", textAlign: "right" }}>
                                        <Link
                                          href={`/quiz?paperId=${paper.id}`}
                                          className="btn btn-secondary btn-sm"
                                          style={{ fontSize: "11px", padding: "5px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                                          title="Retake this mock exam"
                                        >
                                          <span>🔄</span>
                                          <span>Reattempt</span>
                                        </Link>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB B: REVISION TEST SESSIONS                                         */}
      {/* ========================================================================= */}
      {activeSubTab === "REVISION" && (
        <div className="animate-fade-in">
          {/* KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Revision Sessions</div>
              <div className="kpi-value" style={{ color: "#c084fc" }}>{totalRevisionsCount}</div>
              <div className="kpi-subtitle">Multi-paper practice drills</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Questions Practiced</div>
              <div className="kpi-value">{totalQuestionsRevised}</div>
              <div className="kpi-subtitle">Aggregated across all drills</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-title">Multi-Paper Accuracy</div>
              <div className="kpi-value" style={{ color: "#34d399" }}>{avgRevisionAccuracy}%</div>
              <div className="kpi-subtitle">Cumulative mastery rate</div>
            </div>
          </div>

          {/* Action Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px"
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Historical Revision Sessions</h3>
            <Link href="/revision" className="btn btn-primary btn-sm">
              🚀 Launch New Revision Drill
            </Link>
          </div>

          {/* Revisions Table */}
          {revisions.length === 0 ? (
            <div style={{
              padding: "48px 24px",
              textAlign: "center",
              backgroundColor: "var(--bg-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--border-subtle)"
            }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔄</div>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>No Revision Sessions Yet</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
                Navigate to <strong>Tab 3: Revision</strong> to select multiple papers and practice randomized questions!
              </p>
            </div>
          ) : (
            <div className="panel-card" style={{ padding: "6px" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textAlign: "left" }}>
                      <th style={{ padding: "14px 16px" }}>Session Date</th>
                      <th style={{ padding: "14px 16px" }}>Source Papers Included</th>
                      <th style={{ padding: "14px 16px" }}>Mode</th>
                      <th style={{ padding: "14px 16px" }}>Questions</th>
                      <th style={{ padding: "14px 16px" }}>Score</th>
                      <th style={{ padding: "14px 16px" }}>Accuracy</th>
                      <th style={{ padding: "14px 16px", textAlign: "right" }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revisions.map((rev) => (
                      <tr
                        key={rev.sessionId}
                        style={{ borderBottom: "1px solid rgba(51, 65, 85, 0.3)" }}
                      >
                        <td style={{ padding: "14px 16px", color: "var(--text-primary)", fontWeight: "600" }}>
                          {formatTimestamp(rev.timestamp)}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {rev.selectedPaperTitles.map((title, idx) => (
                              <span key={idx} className="badge badge-blue" style={{ fontSize: "10px" }}>
                                {title.length > 28 ? title.substring(0, 28) + "..." : title}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span className={`badge ${rev.mode === "PRACTICE" ? "badge-emerald" : "badge-amber"}`}>
                            {rev.mode}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {rev.totalQuestions} Qs
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: "700", color: "#34d399" }}>
                          {rev.correctAnswers} / {rev.totalQuestions}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span className="badge badge-purple">{rev.accuracyPercentage}%</span>
                        </td>
                        <td style={{ padding: "14px 16px", textAlign: "right", color: "var(--text-secondary)" }}>
                          {formatDuration(rev.timeSpentSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
