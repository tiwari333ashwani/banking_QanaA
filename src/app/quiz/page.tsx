"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PaperSummary, PaperDetail } from "@/core/entities/paper.entity";
import { OptionKey } from "@/core/entities/question.entity";
import { TimedQuizAttempt } from "@/core/entities/attempt.entity";
import { formatDuration } from "@/lib/utils";

type QuestionStatus = "NOT_VISITED" | "NOT_ANSWERED" | "ANSWERED" | "MARKED_FOR_REVIEW" | "ANSWERED_AND_REVIEW";

function QuizRunner() {
  const searchParams = useSearchParams();
  const initialPaperId = searchParams.get("paperId");

  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [selectedPaperId, setSelectedPaperId] = useState<string>(initialPaperId || "");
  const [paperDetail, setPaperDetail] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Exam state
  const [examActive, setExamActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);

  // User responses: questionNumber -> selectedOption (supports string or number keys)
  const [responses, setResponses] = useState<Record<string | number, OptionKey | null>>({});
  // Question statuses: questionNumber -> QuestionStatus
  const [statuses, setStatuses] = useState<Record<string | number, QuestionStatus>>({});

  // Submission & Scorecard
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [evaluatedAttempt, setEvaluatedAttempt] = useState<TimedQuizAttempt | null>(null);
  const [solutionFilter, setSolutionFilter] = useState<"ALL" | "CORRECT" | "INCORRECT" | "UNATTEMPTED">("ALL");

  // Keep refs in sync to prevent stale closures during countdown auto-submission
  const responsesRef = useRef(responses);
  responsesRef.current = responses;
  const statusesRef = useRef(statuses);
  statusesRef.current = statuses;
  const timeSpentSecondsRef = useRef(timeSpentSeconds);
  timeSpentSecondsRef.current = timeSpentSeconds;
  const paperDetailRef = useRef(paperDetail);
  paperDetailRef.current = paperDetail;

  useEffect(() => {
    fetchPapersList();
  }, []);

  useEffect(() => {
    if (selectedPaperId) {
      loadPaper(selectedPaperId);
    }
  }, [selectedPaperId]);

  // Countdown Timer
  useEffect(() => {
    if (!examActive || evaluatedAttempt) return;

    const timer = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            handleSubmitExam();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examActive, evaluatedAttempt]);

  const fetchPapersList = async () => {
    try {
      const res = await fetch("/api/papers");
      const data = await res.json();
      if (data.success && data.papers.length > 0) {
        setPapers(data.papers);
        if (!selectedPaperId) {
          setSelectedPaperId(data.papers[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    }
  };

  const loadPaper = async (paperId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/papers/${paperId}`);
      const data = await res.json();
      if (data.success && data.paper) {
        setPaperDetail(data.paper);
      }
    } catch (err) {
      console.error("Failed to load paper details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    if (!paperDetail) return;
    const initialStatuses: Record<string | number, QuestionStatus> = {};
    paperDetail.questions.forEach((q, idx) => {
      initialStatuses[q.questionNumber] = idx === 0 ? "NOT_ANSWERED" : "NOT_VISITED";
    });
    setStatuses(initialStatuses);
    setResponses({});
    setCurrentQIndex(0);
    setSecondsRemaining((paperDetail.timeLimitMinutes || 15) * 60);
    setTimeSpentSeconds(0);
    setEvaluatedAttempt(null);
    setExamActive(true);
  };

  const currentQuestion = paperDetail?.questions[currentQIndex];

  const handleSelectOption = (optKey: OptionKey) => {
    if (!currentQuestion) return;
    const qNum = Number(currentQuestion.questionNumber);
    setResponses((prev) => ({ ...prev, [qNum]: optKey }));
    // Immediately mark status as ANSWERED so palette button and counts reflect choice instantly
    setStatuses((prev) => ({
      ...prev,
      [qNum]: prev[qNum] === "ANSWERED_AND_REVIEW" || prev[qNum] === "MARKED_FOR_REVIEW"
        ? "ANSWERED_AND_REVIEW"
        : "ANSWERED",
    }));
  };

  const handleClearResponse = () => {
    if (!currentQuestion) return;
    const qNum = Number(currentQuestion.questionNumber);
    setResponses((prev) => {
      const copy = { ...prev };
      delete copy[qNum];
      return copy;
    });
    setStatuses((prev) => ({ ...prev, [qNum]: "NOT_ANSWERED" }));
  };

  const handleSaveAndNext = () => {
    if (!currentQuestion || !paperDetail) return;
    const qNum = Number(currentQuestion.questionNumber);
    const hasSelection = Boolean(responses[qNum] || responses[Number(qNum)] || responses[String(qNum)]);

    setStatuses((prev) => ({
      ...prev,
      [qNum]: hasSelection
        ? (prev[qNum] === "ANSWERED_AND_REVIEW" || prev[qNum] === "MARKED_FOR_REVIEW" ? "ANSWERED_AND_REVIEW" : "ANSWERED")
        : "NOT_ANSWERED",
    }));

    if (currentQIndex < paperDetail.questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      const nextQNum = Number(paperDetail.questions[nextIdx].questionNumber);
      setCurrentQIndex(nextIdx);
      if (statuses[nextQNum] === "NOT_VISITED") {
        setStatuses((prev) => ({ ...prev, [nextQNum]: "NOT_ANSWERED" }));
      }
    } else {
      // On the final question, clicking Save & Next prompts submission summary
      setShowConfirmModal(true);
    }
  };

  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion || !paperDetail) return;
    const qNum = Number(currentQuestion.questionNumber);
    const hasSelection = Boolean(responses[qNum] || responses[Number(qNum)] || responses[String(qNum)]);

    setStatuses((prev) => ({
      ...prev,
      [qNum]: hasSelection ? "ANSWERED_AND_REVIEW" : "MARKED_FOR_REVIEW",
    }));

    if (currentQIndex < paperDetail.questions.length - 1) {
      const nextIdx = currentQIndex + 1;
      const nextQNum = Number(paperDetail.questions[nextIdx].questionNumber);
      setCurrentQIndex(nextIdx);
      if (statuses[nextQNum] === "NOT_VISITED") {
        setStatuses((prev) => ({ ...prev, [nextQNum]: "NOT_ANSWERED" }));
      }
    } else {
      setShowConfirmModal(true);
    }
  };

  const jumpToQuestion = (targetIdx: number) => {
    if (!paperDetail) return;
    const targetQNum = Number(paperDetail.questions[targetIdx].questionNumber);
    setCurrentQIndex(targetIdx);
    if (statuses[targetQNum] === "NOT_VISITED") {
      setStatuses((prev) => ({ ...prev, [targetQNum]: "NOT_ANSWERED" }));
    }
  };

  const handleSubmitExam = async () => {
    const paper = paperDetailRef.current || paperDetail;
    if (!paper) return;
    try {
      setSubmitting(true);
      setShowConfirmModal(false);

      const latestResponses = responsesRef.current;
      const latestStatuses = statusesRef.current;
      const timeSpent = timeSpentSecondsRef.current;

      const userResponses = paper.questions.map((q) => {
        const qNum = Number(q.questionNumber);
        const selected = latestResponses[qNum] ?? latestResponses[String(qNum)] ?? null;
        const st = latestStatuses[qNum] ?? latestStatuses[String(qNum)];
        let status: "ANSWERED" | "SKIPPED" | "MARKED_FOR_REVIEW" = "SKIPPED";
        if (selected) {
          status = st === "ANSWERED_AND_REVIEW" || st === "MARKED_FOR_REVIEW" ? "MARKED_FOR_REVIEW" : "ANSWERED";
        }
        return {
          questionNumber: qNum,
          selectedOption: selected,
          status,
        };
      });

      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId: paper.id,
          timeSpentSeconds: timeSpent,
          userResponses,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEvaluatedAttempt(data.attempt);
        setExamActive(false);
      } else {
        alert("Failed to evaluate exam: " + data.error);
      }
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Submission error. Check console logs.");
    } finally {
      setSubmitting(false);
    }
  };

  // Palette & confirmation counts computed accurately from live responses & statuses
  const answeredCount = paperDetail
    ? paperDetail.questions.filter((q) => {
        const qNum = Number(q.questionNumber);
        return Boolean(responses[qNum] || responses[String(qNum)]);
      }).length
    : 0;

  const markedReviewCount = Object.values(statuses).filter(
    (s) => s === "MARKED_FOR_REVIEW" || s === "ANSWERED_AND_REVIEW"
  ).length;

  const notAnsweredCount = paperDetail
    ? paperDetail.questions.filter((q) => {
        const qNum = Number(q.questionNumber);
        const st = statuses[qNum] || statuses[String(qNum)];
        const hasChoice = Boolean(responses[qNum] || responses[String(qNum)]);
        return !hasChoice && st === "NOT_ANSWERED";
      }).length
    : 0;

  const notVisitedCount = paperDetail
    ? paperDetail.questions.filter((q) => {
        const qNum = Number(q.questionNumber);
        const st = statuses[qNum] || statuses[String(qNum)];
        return !st || st === "NOT_VISITED";
      }).length
    : 0;

  return (
    <div className="container" style={{ maxWidth: "1360px" }}>
      {/* ------------------------------------------------------------- */}
      {/* SCREEN 1: PRE-EXAM PAPER SELECTOR & INSTRUCTIONS             */}
      {/* ------------------------------------------------------------- */}
      {!examActive && !evaluatedAttempt && (
        <div style={{ maxWidth: "800px", margin: "30px auto" }} className="animate-fade-in">
          <div className="panel-card" style={{ padding: "32px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <span className="badge badge-blue">SBI PO Simulator</span>
              <span className="badge badge-emerald">TCS iON Standard</span>
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>
              Timed Mock Examination Runner
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px" }}>
              Simulates authentic SBI PO examination conditions with section timers, 5-choice questions, and negative penalty deductions.
            </p>

            {/* Paper Dropdown */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "8px", color: "var(--text-secondary)" }}>
                Select Question Paper:
              </label>
              <select
                className="form-select"
                value={selectedPaperId}
                onChange={(e) => setSelectedPaperId(e.target.value)}
                style={{ fontSize: "14px", padding: "12px 38px 12px 16px" }}
              >
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.hierarchicalName || p.id}] {p.title} ({p.totalQuestions} Qs • {p.timeLimitMinutes} mins)
                  </option>
                ))}
              </select>
            </div>

            {/* Exam Metadata Summary */}
            {paperDetail && (
              <div style={{
                background: "rgba(2, 132, 199, 0.05)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                marginBottom: "28px"
              }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "12px", color: "#38bdf8" }}>
                  Examination Parameters:
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", fontSize: "13px" }}>
                  <div>Total Questions: <strong>{paperDetail.totalQuestions}</strong></div>
                  <div>Maximum Marks: <strong>{paperDetail.totalMarks}</strong></div>
                  <div>Allocated Time: <strong>{paperDetail.timeLimitMinutes} Minutes</strong></div>
                  <div>Marking: <strong style={{ color: "#34d399" }}>+1.00</strong> / <strong style={{ color: "#fb7185" }}>-0.25</strong></div>
                </div>

                <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border-subtle)", fontSize: "12px", color: "var(--text-muted)" }}>
                  Instructions: Each correct answer earns 1.00 mark. Each incorrect answer deducts 0.25 marks. Unanswered questions do not incur any penalty. Use the palette to flag questions for review.
                </div>
              </div>
            )}

            <button
              onClick={handleStartExam}
              disabled={loading || !paperDetail}
              className="btn btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: "16px" }}
            >
              {loading ? "Loading Paper Data..." : "🚀 Launch Timed Examination"}
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SCREEN 2: ACTIVE TCS iON TIMED EXAM INTERFACE                 */}
      {/* ------------------------------------------------------------- */}
      {examActive && paperDetail && currentQuestion && (
        <div className="animate-fade-in">
          {/* Top Exam Header Bar */}
          <div style={{
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 20px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px"
          }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>
                {paperDetail.category}
              </div>
              <h2 style={{ fontSize: "17px", fontWeight: "700" }}>{paperDetail.title}</h2>
            </div>

            {/* Countdown Timer Display */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: secondsRemaining < 300 ? "rgba(244, 63, 94, 0.15)" : "rgba(2, 132, 199, 0.15)",
              border: `1px solid ${secondsRemaining < 300 ? "rgba(244, 63, 94, 0.4)" : "rgba(56, 189, 248, 0.3)"}`,
              padding: "8px 18px",
              borderRadius: "var(--radius-md)"
            }}>
              <span style={{ fontSize: "18px" }}>⏳</span>
              <div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Time Remaining</div>
                <div style={{
                  fontSize: "20px",
                  fontWeight: "800",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: secondsRemaining < 300 ? "#fb7185" : "#38bdf8"
                }}>
                  {formatDuration(secondsRemaining)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="btn btn-success btn-sm"
              style={{ fontWeight: "700" }}
            >
              Submit Exam Now
            </button>
          </div>

          {/* Section Breadcrumbs */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <span className="badge badge-purple" style={{ padding: "6px 14px", fontSize: "12px" }}>
              Section: {currentQuestion.section}
            </span>
            <span className="badge badge-blue" style={{ padding: "6px 14px", fontSize: "12px" }}>
              Marks: +1.00 | Penalty: -0.25
            </span>
          </div>

          {/* Main 2-Column Split: Question Area (Left) & Question Palette (Right) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "18px" }}>
            {/* Left Question Pane */}
            <div className="panel-card" style={{ padding: "26px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {/* Question Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#38bdf8" }}>
                    Question {currentQuestion.questionNumber} of {paperDetail.questions.length}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Single Choice • 5 Options</span>
                </div>

                {/* Group Context (if applicable) */}
                {currentQuestion.groupContext && (
                  <div style={{
                    padding: "14px 18px",
                    backgroundColor: "rgba(139, 92, 246, 0.08)",
                    border: "1px solid rgba(139, 92, 246, 0.2)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "13px",
                    marginBottom: "18px",
                    color: "#e2e8f0"
                  }}>
                    <strong>Directions:</strong> {currentQuestion.groupContext}
                  </div>
                )}

                {/* Question Stem Text */}
                <div style={{
                  fontSize: "16px",
                  lineHeight: "1.6",
                  fontWeight: "500",
                  color: "var(--text-primary)",
                  marginBottom: "24px"
                }}>
                  {currentQuestion.questionText}
                </div>

                {/* 5 Radio Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "30px" }}>
                  {currentQuestion.options.map((opt) => {
                    const qNum = Number(currentQuestion.questionNumber);
                    const isSelected = (responses[qNum] ?? responses[String(qNum)]) === opt.key;
                    return (
                      <div
                        key={opt.key}
                        onClick={() => handleSelectOption(opt.key)}
                        style={{
                          padding: "14px 18px",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: isSelected ? "rgba(2, 132, 199, 0.15)" : "var(--bg-primary)",
                          border: `1.5px solid ${isSelected ? "#38bdf8" : "var(--border-subtle)"}`,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "14px",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 0 12px rgba(2, 132, 199, 0.2)" : "none"
                        }}
                      >
                        <div style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          border: `2px solid ${isSelected ? "#38bdf8" : "var(--border-active)"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "12px",
                          color: isSelected ? "#38bdf8" : "var(--text-muted)",
                          backgroundColor: isSelected ? "rgba(56, 189, 248, 0.1)" : "transparent"
                        }}>
                          {opt.key}
                        </div>
                        <div style={{ fontSize: "14px", color: isSelected ? "#ffffff" : "var(--text-primary)" }}>
                          {opt.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "18px",
                borderTop: "1px solid var(--border-subtle)",
                flexWrap: "wrap",
                gap: "10px"
              }}>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleMarkForReviewAndNext}
                    className="btn btn-secondary btn-sm"
                    style={{ borderColor: "#8b5cf6", color: "#c084fc" }}
                  >
                    🚩 Mark for Review & Next
                  </button>
                  <button
                    onClick={handleClearResponse}
                    className="btn btn-secondary btn-sm"
                  >
                    🧹 Clear Response
                  </button>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => currentQIndex > 0 && jumpToQuestion(currentQIndex - 1)}
                    disabled={currentQIndex === 0}
                    className="btn btn-secondary btn-sm"
                  >
                    &lt;&lt; Previous
                  </button>
                  <button
                    onClick={handleSaveAndNext}
                    className="btn btn-primary btn-sm"
                  >
                    💾 Save & Next &gt;&gt;
                  </button>
                </div>
              </div>
            </div>

            {/* Right Question Palette Pane (TCS iON Style) */}
            <div className="panel-card" style={{ padding: "20px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "14px", color: "var(--text-primary)" }}>
                Question Palette
              </h4>

              {/* Palette Legend */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                fontSize: "11px",
                paddingBottom: "16px",
                borderBottom: "1px solid var(--border-subtle)",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: "#10b981", display: "inline-block" }}></span>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: "#f43f5e", display: "inline-block" }}></span>
                  <span>Not Answered ({notAnsweredCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: "#8b5cf6", display: "inline-block" }}></span>
                  <span>Review ({markedReviewCount})</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "14px", height: "14px", borderRadius: "3px", backgroundColor: "#475569", display: "inline-block" }}></span>
                  <span>Not Visited ({notVisitedCount})</span>
                </div>
              </div>

              {/* Grid of Question Number Buttons */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "8px",
                maxHeight: "380px",
                overflowY: "auto",
                paddingRight: "4px",
                marginBottom: "20px"
              }}>
                {paperDetail.questions.map((q, idx) => {
                  const qNum = q.questionNumber;
                  const status = statuses[qNum] || "NOT_VISITED";
                  const isCurrent = idx === currentQIndex;

                  let bgColor = "#334155";
                  let textColor = "#94a3b8";

                  if (status === "ANSWERED") {
                    bgColor = "#059669";
                    textColor = "#ffffff";
                  } else if (status === "NOT_ANSWERED") {
                    bgColor = "#dc2626";
                    textColor = "#ffffff";
                  } else if (status === "MARKED_FOR_REVIEW") {
                    bgColor = "#7c3aed";
                    textColor = "#ffffff";
                  } else if (status === "ANSWERED_AND_REVIEW") {
                    bgColor = "#6d28d9";
                    textColor = "#34d399";
                  }

                  return (
                    <button
                      key={qNum}
                      onClick={() => jumpToQuestion(idx)}
                      style={{
                        padding: "8px 0",
                        fontSize: "12px",
                        fontWeight: "700",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: bgColor,
                        color: textColor,
                        border: isCurrent ? "2px solid #38bdf8" : "1px solid transparent",
                        boxShadow: isCurrent ? "0 0 8px #38bdf8" : "none",
                        transition: "all 0.1s ease"
                      }}
                    >
                      {qNum < 10 ? `0${qNum}` : qNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowConfirmModal(true)}
                className="btn btn-success"
                style={{ width: "100%", padding: "12px", fontSize: "14px" }}
              >
                Submit Exam
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SCREEN 3: SUBMIT CONFIRMATION MODAL                           */}
      {/* ------------------------------------------------------------- */}
      {showConfirmModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100
        }}>
          <div className="panel-card animate-fade-in" style={{ maxWidth: "480px", width: "90%", padding: "28px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "800", marginBottom: "12px" }}>
              Confirm Examination Submission
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Are you sure you want to finish the exam? Check your summary below:
            </p>

            <div style={{
              backgroundColor: "var(--bg-primary)",
              padding: "16px",
              borderRadius: "var(--radius-md)",
              marginBottom: "24px",
              fontSize: "13px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Answered:</span>
                <strong style={{ color: "#34d399" }}>{answeredCount}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Marked for Review:</span>
                <strong style={{ color: "#c084fc" }}>{markedReviewCount}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span>Unanswered / Skipped:</span>
                <strong style={{ color: "#fb7185" }}>{notAnsweredCount + notVisitedCount}</strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Resume Exam
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="btn btn-success btn-sm"
              >
                {submitting ? "Evaluating..." : "Yes, Submit Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SCREEN 4: DETAILED POST-EXAM SCORECARD & SOLUTION REVIEW      */}
      {/* ------------------------------------------------------------- */}
      {evaluatedAttempt && paperDetail && (
        <div className="animate-fade-in" style={{ maxWidth: "1000px", margin: "20px auto" }}>
          <div className="panel-card" style={{ padding: "32px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
              <div>
                <span className="badge badge-emerald">Exam Completed</span>
                <h1 style={{ fontSize: "24px", fontWeight: "800", marginTop: "6px" }}>
                  Scorecard: {evaluatedAttempt.paperTitle}
                </h1>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Attempt #{evaluatedAttempt.attemptNumber} • Duration: {formatDuration(evaluatedAttempt.timeSpentSeconds)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleStartExam}
                  className="btn btn-secondary btn-sm"
                >
                  🔄 Retake Exam
                </button>
                <Link href="/" className="btn btn-primary btn-sm">
                  📊 View in Dashboard
                </Link>
              </div>
            </div>

            {/* Scorecard KPI Grid */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-title">Gross Score</div>
                <div className="kpi-value" style={{ color: "#34d399" }}>
                  +{evaluatedAttempt.grossMarks.toFixed(2)}
                </div>
                <div className="kpi-subtitle">{evaluatedAttempt.correctCount} Correct (+1.00 each)</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title">Negative Penalty</div>
                <div className="kpi-value" style={{ color: "#fb7185" }}>
                  -{evaluatedAttempt.negativePenalty.toFixed(2)}
                </div>
                <div className="kpi-subtitle">{evaluatedAttempt.incorrectCount} Incorrect (-0.25 each)</div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title">FINAL NET SCORE</div>
                <div className="kpi-value" style={{ color: "#38bdf8", fontSize: "28px" }}>
                  {evaluatedAttempt.netScore.toFixed(2)} / {evaluatedAttempt.totalMarks}
                </div>
                <div className="kpi-subtitle">
                  {((evaluatedAttempt.netScore / evaluatedAttempt.totalMarks) * 100).toFixed(1)}% Marks Obtained
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-title">Accuracy Rate</div>
                <div className="kpi-value" style={{ color: "#c084fc" }}>
                  {evaluatedAttempt.accuracyPercentage}%
                </div>
                <div className="kpi-subtitle">Total Attempted: {evaluatedAttempt.attemptedCount}</div>
              </div>
            </div>
          </div>

          {/* Detailed Question Review Section */}
          <div className="panel-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <h3 style={{ fontSize: "17px", fontWeight: "700" }}>Detailed Question-by-Question Solutions</h3>
              
              {/* Filter Tabs */}
              <div style={{ display: "flex", gap: "6px" }}>
                {(["ALL", "CORRECT", "INCORRECT", "UNATTEMPTED"] as const).map((flt) => (
                  <button
                    key={flt}
                    onClick={() => setSolutionFilter(flt)}
                    className={`btn btn-sm ${solutionFilter === flt ? "btn-primary" : "btn-secondary"}`}
                  >
                    {flt}
                  </button>
                ))}
              </div>
            </div>

            {/* Questions List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {paperDetail.questions.map((q) => {
                const resp = evaluatedAttempt.responses.find(
                  (r) =>
                    Number(r.questionNumber) === Number(q.questionNumber) ||
                    String(r.questionNumber) === String(q.questionNumber)
                );
                const isCorrect = resp ? resp.isCorrect : false;
                const isSkipped = !resp || resp.selectedOption === null;
                const userPick = resp?.selectedOption ?? null;

                if (solutionFilter === "CORRECT" && !isCorrect) return null;
                if (solutionFilter === "INCORRECT" && (isCorrect || isSkipped)) return null;
                if (solutionFilter === "UNATTEMPTED" && !isSkipped) return null;

                const userPickOption = q.options.find((o) => o.key === userPick);
                const correctOption = q.options.find((o) => o.key === q.correctAnswer);

                return (
                  <div
                    key={q.id}
                    style={{
                      padding: "18px 20px",
                      borderRadius: "var(--radius-lg)",
                      backgroundColor: "var(--bg-primary)",
                      border: `1px solid ${isCorrect ? "rgba(16, 185, 129, 0.4)" : isSkipped ? "var(--border-subtle)" : "rgba(244, 63, 94, 0.4)"}`
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: "var(--text-primary)" }}>
                        Q.{q.questionNumber}) {q.questionText}
                      </span>
                      <span className={`badge ${isCorrect ? "badge-emerald" : isSkipped ? "badge-amber" : "badge-rose"}`}>
                        {isCorrect ? "+1.00 Correct" : isSkipped ? "0.00 Skipped" : "-0.25 Incorrect"}
                      </span>
                    </div>

                    {/* Explicit Selection & Answer Banner */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                      padding: "10px 14px",
                      backgroundColor: isCorrect
                        ? "rgba(16, 185, 129, 0.08)"
                        : isSkipped
                        ? "rgba(245, 158, 11, 0.08)"
                        : "rgba(244, 63, 94, 0.08)",
                      border: `1px solid ${
                        isCorrect
                          ? "rgba(16, 185, 129, 0.25)"
                          : isSkipped
                          ? "rgba(245, 158, 11, 0.25)"
                          : "rgba(244, 63, 94, 0.25)"
                      }`,
                      borderRadius: "var(--radius-sm)",
                      fontSize: "13px",
                      margin: "12px 0"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>
                          Your Selection:
                        </span>
                        {userPick ? (
                          <strong style={{ color: isCorrect ? "#34d399" : "#fb7185" }}>
                            Option ({userPick}) {userPickOption?.text ? `— ${userPickOption.text}` : ""}
                          </strong>
                        ) : (
                          <span style={{ color: "#fbbf24", fontWeight: "600" }}>
                            ⚠️ No Option Selected (Skipped / Unattempted)
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>
                          Correct Key:
                        </span>
                        <strong style={{ color: "#34d399" }}>
                          Option ({q.correctAnswer}) {correctOption?.text ? `— ${correctOption.text}` : ""}
                        </strong>
                      </div>
                    </div>

                    {/* Options Breakdown */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px", margin: "14px 0", fontSize: "13px" }}>
                      {q.options.map((opt) => {
                        const isUserPick = userPick === opt.key;
                        const isCorrectKey = q.correctAnswer === opt.key;
                        let border = "1px solid var(--border-subtle)";
                        let color = "var(--text-secondary)";
                        let bg = "transparent";
                        if (isCorrectKey) {
                          border = "1.5px solid #10b981";
                          color = "#34d399";
                          bg = "rgba(16, 185, 129, 0.05)";
                        } else if (isUserPick && !isCorrectKey) {
                          border = "1.5px solid #f43f5e";
                          color = "#fb7185";
                          bg = "rgba(244, 63, 94, 0.05)";
                        }
                        return (
                          <div
                            key={opt.key}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "var(--radius-sm)",
                              border,
                              color,
                              backgroundColor: bg,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px"
                            }}
                          >
                            <strong>({opt.key})</strong> {opt.text}
                            <div style={{ marginLeft: "auto", display: "flex", gap: "6px", alignItems: "center" }}>
                              {isUserPick && (
                                <span style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  backgroundColor: isCorrectKey ? "rgba(16, 185, 129, 0.25)" : "rgba(244, 63, 94, 0.25)",
                                  color: isCorrectKey ? "#34d399" : "#fb7185",
                                  border: `1px solid ${isCorrectKey ? "#10b981" : "#f43f5e"}`
                                }}>
                                  Your Pick
                                </span>
                              )}
                              {isCorrectKey && (
                                <span style={{
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  padding: "2px 6px",
                                  borderRadius: "3px",
                                  backgroundColor: "rgba(16, 185, 129, 0.25)",
                                  color: "#34d399",
                                  border: "1px solid #10b981"
                                }}>
                                  Key
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation Box */}
                    {q.explanation && (
                      <div style={{
                        marginTop: "12px",
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "rgba(2, 132, 199, 0.08)",
                        borderLeft: "3px solid #0284c7",
                        fontSize: "12px",
                        color: "#e2e8f0"
                      }}>
                        <strong>Explanation:</strong> {q.explanation}
                        {q.memoryTrick && (
                          <div style={{ marginTop: "4px", color: "#fbbf24" }}>
                            <strong>💡 Memory Trick:</strong> {q.memoryTrick}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "40px", textAlign: "center" }}>Loading Quiz Module...</div>}>
      <QuizRunner />
    </Suspense>
  );
}
