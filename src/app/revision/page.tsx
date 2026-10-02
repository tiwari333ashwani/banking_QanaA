"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PaperSummary } from "@/core/entities/paper.entity";
import { ExtractedQuestion, OptionKey } from "@/core/entities/question.entity";
import { formatDuration } from "@/lib/utils";

type RevisionQuestion = ExtractedQuestion & { sourcePaperTitle: string };

export default function RevisionPage() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [selectedPaperIds, setSelectedPaperIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [sectionFilter, setSectionFilter] = useState<string>("ALL");
  const [mode, setMode] = useState<"PRACTICE" | "SPEED_DRILL">("PRACTICE");

  // Runner state
  const [generating, setGenerating] = useState(false);
  const [revisionActive, setRevisionActive] = useState(false);
  const [questions, setQuestions] = useState<RevisionQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // User responses during session: questionIndex -> selectedOption
  const [userPicks, setUserPicks] = useState<Record<number, OptionKey>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  // Summary
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    fetchPapers();
  }, []);

  // Timer while session active
  useEffect(() => {
    if (!revisionActive || sessionCompleted) return;
    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [revisionActive, sessionCompleted]);

  const fetchPapers = async () => {
    try {
      const res = await fetch("/api/papers");
      const data = await res.json();
      if (data.success && data.papers.length > 0) {
        setPapers(data.papers);
        // By default, select all papers
        const allIds = data.papers.map((p: PaperSummary) => p.id);
        setSelectedPaperIds(allIds);
        setSelectAll(true);
      }
    } catch (err) {
      console.error("Failed to fetch papers:", err);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedPaperIds([]);
      setSelectAll(false);
    } else {
      setSelectedPaperIds(papers.map((p) => p.id));
      setSelectAll(true);
    }
  };

  const handleTogglePaper = (paperId: string) => {
    setSelectedPaperIds((prev) => {
      const exists = prev.includes(paperId);
      const updated = exists ? prev.filter((id) => id !== paperId) : [...prev, paperId];
      setSelectAll(updated.length === papers.length);
      return updated;
    });
  };

  const handleLaunchRevision = async () => {
    if (selectedPaperIds.length === 0) {
      alert("Please select at least one paper to generate revision questions.");
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch("/api/revision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedPaperIds,
          questionCount,
          sectionFilter: sectionFilter === "ALL" ? undefined : sectionFilter,
          mode,
        }),
      });

      const data = await res.json();
      if (data.success && data.data.questions.length > 0) {
        setQuestions(data.data.questions);
        setCurrentIndex(0);
        setUserPicks({});
        setRevealed({});
        setTimeSpent(0);
        setSessionCompleted(false);
        setRevisionActive(true);
      } else {
        alert("Could not generate revision questions: " + (data.error || "No questions found."));
      }
    } catch (err) {
      console.error("Revision generation failed:", err);
      alert("Error generating revision drill.");
    } finally {
      setGenerating(false);
    }
  };

  const currentQ = questions[currentIndex];

  const handleAnswerPick = (optKey: OptionKey) => {
    if (revealed[currentIndex] && mode === "PRACTICE") return; // already locked
    setUserPicks((prev) => ({ ...prev, [currentIndex]: optKey }));
    if (mode === "PRACTICE") {
      setRevealed((prev) => ({ ...prev, [currentIndex]: true }));
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleCompleteSession();
    }
  };

  const handleCompleteSession = async () => {
    setSessionCompleted(true);
    setRevisionActive(false);

    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;

    questions.forEach((q, idx) => {
      const pick = userPicks[idx];
      if (!pick) {
        skippedCount++;
      } else if (pick === q.correctAnswer) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const accuracy =
      correctCount + incorrectCount > 0
        ? parseFloat(((correctCount / (correctCount + incorrectCount)) * 100).toFixed(1))
        : 0;

    const sourceTitles = Array.from(new Set(questions.map((q) => q.sourcePaperTitle)));

    try {
      await fetch("/api/revision/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: `rev_sess_${Date.now()}`,
          timestamp: new Date().toISOString(),
          selectedPaperIds,
          selectedPaperTitles: sourceTitles,
          totalQuestions: questions.length,
          correctAnswers: correctCount,
          incorrectAnswers: incorrectCount,
          skippedAnswers: skippedCount,
          accuracyPercentage: accuracy,
          mode,
          timeSpentSeconds: timeSpent,
        }),
      });
    } catch (err) {
      console.error("Failed to record revision session:", err);
    }
  };

  // Compute live score stats
  let totalCorrect = 0;
  let totalIncorrect = 0;
  questions.forEach((q, idx) => {
    const pick = userPicks[idx];
    if (pick === q.correctAnswer) totalCorrect++;
    else if (pick) totalIncorrect++;
  });

  return (
    <div className="container" style={{ maxWidth: "1000px" }}>
      {/* ----------------------------------------------------------------- */}
      {/* STEP 1: CONFIGURATION & MULTI-SELECT PICKER                       */}
      {/* ----------------------------------------------------------------- */}
      {!revisionActive && !sessionCompleted && (
        <div className="animate-fade-in">
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span className="badge badge-purple">Tab 3: Custom Revision</span>
              <span className="badge badge-blue">Multi-Select & Randomized Pool</span>
            </div>
            <h1 style={{ fontSize: "26px", fontWeight: "800" }}>Custom Revision Test Generator</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "4px" }}>
              Select multiple question papers or click &quot;Select All&quot; to compile a cross-paper revision drill with randomized questions.
            </p>
          </div>

          {/* Paper Selection Checklist Panel */}
          <div className="panel-card" style={{ padding: "24px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Step 1: Choose Source Question Papers</h3>
              
              <button
                onClick={handleToggleSelectAll}
                className="btn btn-secondary btn-sm"
                style={{ fontWeight: "700", borderColor: "#8b5cf6", color: "#c084fc" }}
              >
                {selectAll ? "Unselect All" : "✔ Select All Available Papers"}
              </button>
            </div>

            {papers.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>
                No processed papers available yet. Drop PDFs in <code>local_storage/inputs/</code> and click &quot;Scan Inputs&quot;.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {papers.map((paper) => {
                  const isChecked = selectedPaperIds.includes(paper.id);
                  return (
                    <div
                      key={paper.id}
                      onClick={() => handleTogglePaper(paper.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        backgroundColor: isChecked ? "rgba(139, 92, 246, 0.1)" : "var(--bg-primary)",
                        border: `1px solid ${isChecked ? "#8b5cf6" : "var(--border-subtle)"}`,
                        borderRadius: "var(--radius-md)",
                        cursor: "pointer",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#8b5cf6" }}
                        />
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: "700", fontSize: "14px", color: isChecked ? "#ffffff" : "var(--text-primary)" }}>
                              {paper.title}
                            </span>
                            <span className="badge badge-purple" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px" }}>
                              {paper.hierarchicalName || paper.id}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                            {paper.category} • {paper.totalQuestions} Questions Available • {paper.periodLabel || "Weekly Series"}
                          </div>
                        </div>
                      </div>

                      <span className="badge badge-purple">{paper.totalQuestions} Qs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Drill Configuration Settings */}
          <div className="panel-card" style={{ padding: "26px", marginBottom: "28px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "20px" }}>
              Step 2: Configure Revision Parameters
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {/* Row 1: Question Count Slider & Section Filter */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                {/* Question Count */}
                <div style={{
                  padding: "18px 20px",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
                      Question Pool Size:
                    </label>
                    <span className="badge badge-purple" style={{ fontSize: "13px", padding: "4px 12px" }}>
                      {questionCount} Questions
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                    style={{ width: "100%", accentColor: "#8b5cf6", cursor: "pointer", height: "6px" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                    <span>Quick: 5 Qs</span>
                    <span>Standard: 25 Qs</span>
                    <span>Full Drill: 50 Qs</span>
                  </div>
                </div>

                {/* Section Filter with Styled Dropdown */}
                <div style={{
                  padding: "18px 20px",
                  backgroundColor: "var(--bg-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-lg)"
                }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "10px" }}>
                    Section / Topic Focus:
                  </label>
                  <select
                    className="form-select"
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                  >
                    <option value="ALL">All Sections (Entire Pooled Bank)</option>
                    <option value="Banking">Banking & Financial Awareness</option>
                    <option value="Quantitative">Quantitative Aptitude Drill</option>
                    <option value="Reasoning">Reasoning Ability Drill</option>
                    <option value="English">English Language Drill</option>
                  </select>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px" }}>
                    Filters questions across all currently selected weekly papers.
                  </div>
                </div>
              </div>

              {/* Row 2: Mode Selector */}
              <div style={{
                padding: "18px 20px",
                backgroundColor: "var(--bg-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)"
              }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "12px" }}>
                  Select Practice Mode:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                  <div
                    onClick={() => setMode("PRACTICE")}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: mode === "PRACTICE" ? "rgba(2, 132, 199, 0.15)" : "var(--bg-secondary)",
                      border: `1.5px solid ${mode === "PRACTICE" ? "#38bdf8" : "var(--border-subtle)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ fontWeight: "700", fontSize: "14px", color: mode === "PRACTICE" ? "#38bdf8" : "var(--text-primary)" }}>
                      💡 Practice Mode (Instant Explanations)
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      Reveals the correct answer, detailed solution, and memory trick right after clicking.
                    </div>
                  </div>

                  <div
                    onClick={() => setMode("SPEED_DRILL")}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: mode === "SPEED_DRILL" ? "rgba(245, 158, 11, 0.15)" : "var(--bg-secondary)",
                      border: `1.5px solid ${mode === "SPEED_DRILL" ? "#f59e0b" : "var(--border-subtle)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ fontWeight: "700", fontSize: "14px", color: mode === "SPEED_DRILL" ? "#fbbf24" : "var(--text-primary)" }}>
                      ⚡ Exam Speed Drill (Timed Simulation)
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                      No instant spoilers. Answer continuously and view your accuracy summary at the end.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={handleLaunchRevision}
            disabled={generating || selectedPaperIds.length === 0}
            className="btn btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: "16px", background: "linear-gradient(135deg, #7c3aed 0%, #0284c7 100%)" }}
          >
            {generating ? "Pooling & Randomizing..." : `🚀 Launch Revision Drill (${questionCount} Questions)`}
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 2: ACTIVE REVISION RUNNER INTERFACE                          */}
      {/* ----------------------------------------------------------------- */}
      {revisionActive && currentQ && (
        <div className="animate-fade-in" style={{ maxWidth: "860px", margin: "20px auto" }}>
          {/* Header bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            backgroundColor: "var(--bg-secondary)",
            padding: "14px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)"
          }}>
            <div>
              <span className="badge badge-purple" style={{ marginBottom: "4px" }}>
                {mode === "PRACTICE" ? "Practice Mode" : "Speed Drill"}
              </span>
              <div style={{ fontSize: "14px", fontWeight: "700" }}>
                Question {currentIndex + 1} of {questions.length}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Score: <strong style={{ color: "#34d399" }}>{totalCorrect}</strong> / {currentIndex + (userPicks[currentIndex] ? 1 : 0)}
              </div>
              <div style={{ fontSize: "13px", fontFamily: "'JetBrains Mono', monospace", color: "#38bdf8" }}>
                ⏱️ {formatDuration(timeSpent)}
              </div>
              <button
                onClick={handleCompleteSession}
                className="btn btn-secondary btn-sm"
              >
                End Session
              </button>
            </div>
          </div>

          {/* Question Card */}
          <div className="panel-card" style={{ padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span className="badge badge-blue">
                Source: {currentQ.sourcePaperTitle}
              </span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Section: {currentQ.section}
              </span>
            </div>

            {/* Question Stem */}
            <div style={{ fontSize: "17px", lineHeight: "1.6", fontWeight: "600", marginBottom: "24px" }}>
              {currentQ.questionText}
            </div>

            {/* 5 Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
              {currentQ.options.map((opt) => {
                const isSelected = userPicks[currentIndex] === opt.key;
                const isRevealed = revealed[currentIndex];
                const isCorrect = currentQ.correctAnswer === opt.key;

                let border = "1px solid var(--border-subtle)";
                let bg = "var(--bg-primary)";
                let textColor = "var(--text-primary)";

                if (isRevealed && mode === "PRACTICE") {
                  if (isCorrect) {
                    border = "1.5px solid #10b981";
                    bg = "rgba(16, 185, 129, 0.15)";
                    textColor = "#34d399";
                  } else if (isSelected && !isCorrect) {
                    border = "1.5px solid #f43f5e";
                    bg = "rgba(244, 63, 94, 0.15)";
                    textColor = "#fb7185";
                  }
                } else if (isSelected) {
                  border = "1.5px solid #38bdf8";
                  bg = "rgba(2, 132, 199, 0.15)";
                }

                return (
                  <div
                    key={opt.key}
                    onClick={() => handleAnswerPick(opt.key)}
                    style={{
                      padding: "14px 18px",
                      borderRadius: "var(--radius-md)",
                      border,
                      backgroundColor: bg,
                      cursor: isRevealed && mode === "PRACTICE" ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: "1.5px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "700",
                      fontSize: "12px",
                      color: isSelected ? "#38bdf8" : "var(--text-muted)"
                    }}>
                      {opt.key}
                    </div>
                    <div style={{ fontSize: "14px", color: textColor }}>
                      {opt.text}
                    </div>
                    {isRevealed && isCorrect && (
                      <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: "700", color: "#34d399" }}>
                        ✔ Correct Key
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Instant Explanation (Practice Mode) */}
            {revealed[currentIndex] && mode === "PRACTICE" && (
              <div style={{
                padding: "16px 20px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(2, 132, 199, 0.08)",
                borderLeft: "4px solid #0284c7",
                marginBottom: "24px",
                fontSize: "13px",
                lineHeight: "1.5"
              }}>
                <div style={{ fontWeight: "700", color: "#38bdf8", marginBottom: "4px" }}>
                  Solution & Explanation:
                </div>
                <div>{currentQ.explanation}</div>
                {currentQ.memoryTrick && (
                  <div style={{ marginTop: "6px", color: "#fbbf24" }}>
                    <strong>💡 Mnemonic Trick:</strong> {currentQ.memoryTrick}
                  </div>
                )}
              </div>
            )}

            {/* Next / Finish Button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleNextQuestion}
                disabled={!userPicks[currentIndex]}
                className="btn btn-primary"
                style={{ padding: "10px 24px" }}
              >
                {currentIndex < questions.length - 1 ? "Next Question >>" : "Complete Revision Drill"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* STEP 3: SESSION COMPLETED SUMMARY CARD                            */}
      {/* ----------------------------------------------------------------- */}
      {sessionCompleted && (
        <div className="panel-card animate-fade-in" style={{ maxWidth: "600px", margin: "40px auto", padding: "36px", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
          <span className="badge badge-emerald" style={{ marginBottom: "12px" }}>Session Completed</span>
          <h2 style={{ fontSize: "24px", fontWeight: "800", marginBottom: "8px" }}>
            Revision Drill Finished!
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "28px" }}>
            Attempt logged to <code>local_storage/attempts/revision_sessions/</code> and reflected in Dashboard Sub-Tab B.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            backgroundColor: "var(--bg-primary)",
            padding: "20px",
            borderRadius: "var(--radius-lg)",
            marginBottom: "30px"
          }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Questions</div>
              <div style={{ fontSize: "22px", fontWeight: "800", marginTop: "4px" }}>{questions.length}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Correct</div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#34d399", marginTop: "4px" }}>{totalCorrect}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase" }}>Accuracy</div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#38bdf8", marginTop: "4px" }}>
                {questions.length > 0 ? ((totalCorrect / questions.length) * 100).toFixed(1) : 0}%
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
            <button
              onClick={() => {
                setSessionCompleted(false);
                setRevisionActive(false);
              }}
              className="btn btn-secondary"
            >
              🔄 Start New Revision
            </button>
            <Link href="/" className="btn btn-primary">
              📊 Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
