import { useEffect, useMemo, useState } from "react";
import type React from "react";

import {
  Activity,
  ArrowLeftRight,
  Cpu,
  Layers,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Zap,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { loadPagingEngine } from "./wasm/pagingEngineLoader";
import type {
  PagingEngine,
  WasmPageStep,
} from "./wasm/pagingEngine";

import "./App.css";

type Algorithm = "FIFO" | "LRU" | "OPT";

type Step = WasmPageStep;

type ComparisonResult = {
  algorithm: Algorithm;
  pageFaults: number;
  pageHits: number;
  faultRate: number;
};

const DEFAULT_INPUT =
  "7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2, 1, 2, 0, 1, 7, 0, 1";

const ALGORITHM_INDEX: Record<Algorithm, number> = {
  FIFO: 0,
  LRU: 1,
  OPT: 2,
};

function parsePages(input: string): number[] {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a page reference string.");
  }

  const tokens = trimmed.split(/[\s,]+/);

  if (tokens.some((token) => !/^\d+$/.test(token))) {
    throw new Error(
      "Enter non-negative page numbers separated by spaces or commas."
    );
  }

  const pages = tokens.map(Number);

  if (pages.some((page) => !Number.isSafeInteger(page) || page > 2147483647)) {
    throw new Error("Page numbers must be valid non-negative integers.");
  }

  if (pages.length > 500) {
    throw new Error("Enter no more than 500 page references.");
  }

  return pages;
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-detail">{detail}</div>
    </div>
  );
}

export default function App() {
  const [algorithm, setAlgorithm] = useState<Algorithm>("FIFO");
  const [frameCount, setFrameCount] = useState(3);
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [wasmEngine, setWasmEngine] = useState<PagingEngine | null>(null);
  const [wasmStatus, setWasmStatus] = useState("Loading C++ engine...");
  const [engineError, setEngineError] = useState("");
  const [inputError, setInputError] = useState("");

  // Load the WebAssembly module once.
  useEffect(() => {
    let cancelled = false;

    loadPagingEngine()
      .then((engine) => {
        if (cancelled) return;

        setWasmEngine(engine);
        setWasmStatus("C++ WebAssembly engine ready");
        setEngineError("");
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        const message =
          error instanceof Error ? error.message : String(error);

        setWasmStatus("C++ engine failed to load");
        setEngineError(message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Parse and validate the current reference string.
  const pages = useMemo(() => {
    try {
      return parsePages(input);
    } catch {
      return [];
    }
  }, [input]);

  const configurationValid =
    pages.length > 0 &&
    Number.isInteger(frameCount) &&
    frameCount >= 1 &&
    frameCount <= 20;

  // Run the selected algorithm through the real C++ engine.
  const steps = useMemo<Step[]>(() => {
    if (!wasmEngine || !configurationValid) {
      return [];
    }

    try {
      const result = wasmEngine.simulateForWeb(
        ALGORITHM_INDEX[algorithm],
        pages,
        frameCount
      );

      return result.steps;
    } catch (error) {
      console.error("C++ simulation failed:", error);
      return [];
    }
  }, [wasmEngine, configurationValid, pages, frameCount, algorithm]);

  // Run all three algorithms through the same C++ engine for comparison.
  const comparisonData = useMemo<ComparisonResult[]>(() => {
    if (!wasmEngine || !configurationValid) {
      return [];
    }

    try {
      return (["FIFO", "LRU", "OPT"] as Algorithm[]).map(
        (name) => {
          const result = wasmEngine.simulateForWeb(
            ALGORITHM_INDEX[name],
            pages,
            frameCount
          );

          return {
            algorithm: name,
            pageFaults: result.pageFaults,
            pageHits: result.pageHits,
            faultRate: result.faultRate,
          };
        }
      );
    } catch (error) {
      console.error("C++ comparison failed:", error);
      return [];
    }
  }, [wasmEngine, configurationValid, pages, frameCount]);

  const bestAlgorithm =
    comparisonData.length > 0
      ? comparisonData.reduce((best, result) =>
          result.pageFaults < best.pageFaults ? result : best
        )
      : null;

  const safeStep = Math.min(
    currentStep,
    Math.max(steps.length - 1, 0)
  );

  const activeStep = steps[safeStep];
  const visibleSteps = steps.slice(0, safeStep + 1);

  const totalHits = visibleSteps.filter((step) => step.hit).length;
  const totalFaults = visibleSteps.length - totalHits;

  const faultRate = visibleSteps.length
    ? (totalFaults / visibleSteps.length) * 100
    : 0;

  const finished =
    steps.length > 0 && safeStep === steps.length - 1;

  // Autoplay the page-reference timeline.
  useEffect(() => {
    if (!playing || steps.length === 0) return;

    if (safeStep >= steps.length - 1) {
      setPlaying(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCurrentStep((step) =>
        Math.min(step + 1, steps.length - 1)
      );
    }, 700);

    return () => window.clearTimeout(timer);
  }, [playing, safeStep, steps.length]);

  function updateInput(value: string) {
    setInput(value);
    setCurrentStep(0);
    setPlaying(false);
    setInputError("");
  }

  function updateFrames(value: number) {
    setFrameCount(value);
    setCurrentStep(0);
    setPlaying(false);
    setInputError("");
  }

  function updateAlgorithm(value: Algorithm) {
    setAlgorithm(value);
    setCurrentStep(0);
    setPlaying(false);
  }

  function runSimulation() {
    try {
      parsePages(input);

      if (!Number.isInteger(frameCount) || frameCount < 1 || frameCount > 20) {
        throw new Error("Choose between 1 and 20 memory frames.");
      }

      setCurrentStep(0);
      setPlaying(false);
      setInputError("");
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : "Invalid input."
      );
    }
  }

  function resetSimulation() {
    setCurrentStep(0);
    setPlaying(false);
    setInputError("");
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">
            <Cpu size={24} />
          </div>

          <div>
            <h1>MEMSIM</h1>
            <p>VIRTUAL MEMORY LAB</p>
          </div>
        </div>

        <div className="system-status">
          <span
            className="status-dot"
            style={{
              background: wasmEngine ? "#34d399" : "#fbbf24",
            }}
          />
          {wasmStatus}
        </div>
      </header>

      {engineError && (
        <div className="error-message">
          Could not load the WebAssembly engine: {engineError}
        </div>
      )}

      <section className="hero">
        <div>
          <div className="hero-eyebrow">
            <Activity size={15} />
            OPERATING SYSTEMS / MEMORY MANAGEMENT
          </div>

          <h2>
            Virtual Memory
            <br />
            <span>Visualizer</span>
          </h2>

          <p>
            Explore page replacement algorithms, inspect physical
            memory, and compare FIFO, LRU, and OPT using your C++
            simulation engine.
          </p>
        </div>

        <div className="hero-symbol">
          <div className="hero-ring ring-one" />
          <div className="hero-ring ring-two" />

          <div className="hero-core">
            <Layers size={42} />
          </div>
        </div>
      </section>

      <section className="control-panel">
        <div className="section-title">
          <div>
            <span className="section-eyebrow">CONFIGURATION</span>
            <h3>Simulation Controls</h3>
          </div>

          <button
            className="icon-button"
            onClick={resetSimulation}
            title="Reset simulation"
          >
            <RotateCcw size={17} />
          </button>
        </div>

        <div className="controls-grid">
          <label className="field">
            <span>Page reference string</span>

            <textarea
              value={input}
              onChange={(event) => updateInput(event.target.value)}
              rows={3}
              placeholder="Example: 7, 0, 1, 2, 0, 3"
            />

            <small>
              Separate page numbers with spaces or commas.
            </small>
          </label>

          <div className="field">
            <label htmlFor="frame-count">
              Physical memory frames
            </label>

            <div className="frame-count-control">
              <button
                type="button"
                onClick={() =>
                  updateFrames(Math.max(1, frameCount - 1))
                }
                disabled={frameCount <= 1}
                aria-label="Decrease frames"
              >
                −
              </button>

              <strong>{frameCount}</strong>

              <button
                type="button"
                onClick={() =>
                  updateFrames(Math.min(20, frameCount + 1))
                }
                disabled={frameCount >= 20}
                aria-label="Increase frames"
              >
                +
              </button>
            </div>

            <small>Choose between 1 and 20 frames.</small>
          </div>

          <div className="field algorithm-field">
            <span>Replacement algorithm</span>

            <div className="algorithm-options">
              {(["FIFO", "LRU", "OPT"] as Algorithm[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      algorithm === item
                        ? "algorithm-option active"
                        : "algorithm-option"
                    }
                    onClick={() => updateAlgorithm(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            <small>
              {algorithm === "FIFO" &&
                "Replaces the oldest page in memory."}
              {algorithm === "LRU" &&
                "Replaces the least recently used page."}
              {algorithm === "OPT" &&
                "Replaces the page used farthest in the future."}
            </small>
          </div>
        </div>

        {inputError && (
          <p className="error-message">{inputError}</p>
        )}

        <button
          className="run-button"
          onClick={runSimulation}
          disabled={!wasmEngine}
        >
          <Zap size={17} />
          Apply & Restart Simulation
        </button>
      </section>

      <section className="metrics-grid">
        <Metric
          icon={<ArrowLeftRight size={20} />}
          label="PAGE REQUESTS"
          value={pages.length}
          detail="Total references in input"
        />

        <Metric
          icon={<Layers size={20} />}
          label="PAGE FAULTS"
          value={totalFaults}
          detail={`${Math.max(0, steps.length - safeStep - 1)} requests remaining`}
        />

        <Metric
          icon={<Zap size={20} />}
          label="PAGE HITS"
          value={totalHits}
          detail="Pages found in memory"
        />

        <Metric
          icon={<Activity size={20} />}
          label="FAULT RATE"
          value={`${faultRate.toFixed(1)}%`}
          detail="Faults / processed requests"
        />
      </section>

      <section className="memory-panel">
        <div className="section-title">
          <div>
            <span className="section-eyebrow">
              LIVE MEMORY STATE
            </span>
            <h3>Physical Frames</h3>
          </div>

          <div className="step-counter">
            STEP <strong>{steps.length ? safeStep + 1 : 0}</strong> /{" "}
            {steps.length}
          </div>
        </div>

        <div className="memory-status">
          <div>
            <span className="status-label">CURRENT PAGE</span>
            <strong className="current-page">
              {activeStep ? activeStep.page : "—"}
            </strong>
          </div>

          <div>
            <span className="status-label">ACCESS RESULT</span>

            <span
              className={
                activeStep
                  ? activeStep.hit
                    ? "result-pill hit"
                    : "result-pill fault"
                  : "result-pill"
              }
            >
              {activeStep
                ? activeStep.hit
                  ? "PAGE HIT"
                  : "PAGE FAULT"
                : wasmEngine
                  ? "READY"
                  : "LOADING"}
            </span>
          </div>

          <div>
            <span className="status-label">REPLACED PAGE</span>
            <strong>{activeStep?.replaced ?? "—"}</strong>
          </div>
        </div>

        <div className="frames-grid">
          {Array.from({ length: frameCount }, (_, index) => {
            const page = activeStep?.frames[index] ?? null;

            return (
              <div
                className={`memory-frame ${
                  page !== null ? "occupied" : ""
                }`}
                key={index}
              >
                <div className="frame-top">
                  <span>
                    FRAME {String(index).padStart(2, "0")}
                  </span>
                  <span className="frame-led" />
                </div>

                <div className="frame-page">
                  {page ?? "EMPTY"}
                </div>

                <div className="frame-bottom">
                  {page !== null ? "RESIDENT PAGE" : "AVAILABLE"}
                </div>
              </div>
            );
          })}
        </div>

        <div className="playback-controls">
          <button
            className="icon-button"
            onClick={resetSimulation}
            title="Go to first step"
          >
            <SkipBack size={18} />
          </button>

          <button
            className="play-button"
            disabled={!wasmEngine || !steps.length}
            onClick={() => {
              if (finished) {
                setCurrentStep(0);
                setPlaying(true);
              } else {
                setPlaying((value) => !value);
              }
            }}
          >
            {playing ? <Pause size={17} /> : <Play size={17} />}
            {playing ? "Pause" : finished ? "Replay" : "Play"}
          </button>

          <button
            className="next-button"
            disabled={!steps.length || finished}
            onClick={() => {
              setPlaying(false);
              setCurrentStep((step) =>
                Math.min(step + 1, steps.length - 1)
              );
            }}
            title="Next step"
          >
            <SkipForward size={18} />
            Next
          </button>
        </div>

        <div className="timeline-section">
          <div className="timeline-heading">
            <span>REFERENCE TIMELINE</span>
            <span>
              {steps.length ? safeStep + 1 : 0} of {steps.length}
            </span>
          </div>

          <div className="timeline">
            {steps.map((step, index) => (
              <button
                key={`${index}-${step.page}`}
                className={[
                  "timeline-item",
                  step.hit ? "timeline-hit" : "timeline-fault",
                  index === safeStep ? "timeline-current" : "",
                  index <= safeStep ? "timeline-processed" : "",
                ].join(" ")}
                onClick={() => {
                  setPlaying(false);
                  setCurrentStep(index);
                }}
                title={`Page ${step.page}: ${
                  step.hit ? "Hit" : "Fault"
                }`}
              >
                <span>{step.page}</span>
                <small>{step.hit ? "H" : "F"}</small>
              </button>
            ))}
          </div>

          <div className="timeline-legend">
            <span>
              <i className="legend-hit" /> Hit
            </span>
            <span>
              <i className="legend-fault" /> Fault
            </span>
            <span>
              <i className="legend-current" /> Current step
            </span>
          </div>
        </div>
      </section>

      <section className="comparison-section">
        <div className="comparison-heading">
          <div>
            <span className="section-eyebrow">
              PERFORMANCE ANALYTICS
            </span>

            <h2>Algorithm Comparison</h2>

            <p className="comparison-description">
              All three algorithms use the same reference string and
              frame count. Results come from the C++ engine.
            </p>
          </div>

          {bestAlgorithm && (
            <div className="best-algorithm">
              <span>FEWEST PAGE FAULTS</span>
              <strong>{bestAlgorithm.algorithm}</strong>
              <small>{bestAlgorithm.pageFaults} faults</small>
            </div>
          )}
        </div>

        {comparisonData.length > 0 ? (
          <>
            <div className="comparison-grid">
              <div className="chart-card">
                <h3>Page Faults</h3>
                <p>Lower is better</p>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#34344b"
                    />
                    <XAxis
                      dataKey="algorithm"
                      stroke="#a5a5bb"
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#a5a5bb"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#171725",
                        border: "1px solid #393950",
                        borderRadius: 10,
                      }}
                    />
                    <Bar
                      dataKey="pageFaults"
                      name="Page Faults"
                      fill="#a78bfa"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <h3>Page Hits</h3>
                <p>Higher is better</p>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#34344b"
                    />
                    <XAxis
                      dataKey="algorithm"
                      stroke="#a5a5bb"
                    />
                    <YAxis
                      allowDecimals={false}
                      stroke="#a5a5bb"
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#171725",
                        border: "1px solid #393950",
                        borderRadius: 10,
                      }}
                    />
                    <Bar
                      dataKey="pageHits"
                      name="Page Hits"
                      fill="#34d399"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card fault-rate-card">
                <h3>Page Fault Rate</h3>
                <p>Lower is better</p>

                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#34344b"
                    />
                    <XAxis
                      dataKey="algorithm"
                      stroke="#a5a5bb"
                    />
                    <YAxis
                      domain={[0, 100]}
                      unit="%"
                      stroke="#a5a5bb"
                    />
                    <Tooltip
                      formatter={(value) =>
                        `${Number(value).toFixed(2)}%`
                      }
                      contentStyle={{
                        background: "#171725",
                        border: "1px solid #393950",
                        borderRadius: 10,
                      }}
                    />
                    <Bar
                      dataKey="faultRate"
                      name="Fault Rate"
                      fill="#fb923c"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="comparison-table-wrapper">
              <h3>Detailed Results</h3>

              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Algorithm</th>
                    <th>Page Faults</th>
                    <th>Page Hits</th>
                    <th>Fault Rate</th>
                  </tr>
                </thead>

                <tbody>
                  {comparisonData.map((result) => (
                    <tr key={result.algorithm}>
                      <td>
                        <strong>{result.algorithm}</strong>

                        {bestAlgorithm?.algorithm ===
                          result.algorithm && (
                          <span className="winner-tag"> BEST</span>
                        )}
                      </td>

                      <td>{result.pageFaults}</td>
                      <td>{result.pageHits}</td>
                      <td>{result.faultRate.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="comparison-empty">
            {wasmEngine
              ? "Enter a valid reference string and frame count."
              : "Waiting for the C++ WebAssembly engine to load..."}
          </p>
        )}
      </section>

      <footer className="dashboard-footer">
        <span>MEMSIM · VIRTUAL MEMORY LAB</span>
        <span>FIFO / LRU / OPT · C++ / WASM</span>
      </footer>
    </main>
  );
}