/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FastForward,
  Layers,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Terminal,
  XCircle
} from 'lucide-react';
import { CFG, PDA, SimulationResult, SimulationStep, BatchTestItem } from '../types/grammar';
import { simulatePDA } from '../utils/simulator';
import { downloadFile, exportSimulationTraceText } from '../utils/export';

interface SimulatorSectionProps {
  pda: PDA | null;
  cfg: CFG | null;
  sampleAcceptedTests?: string[];
  sampleRejectedTests?: string[];
}

export const SimulatorSection: React.FC<SimulatorSectionProps> = ({
  pda,
  cfg,
  sampleAcceptedTests = [],
  sampleRejectedTests = [],
}) => {
  const [inputString, setInputString] = useState<string>('aabb');
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(800); // ms per step

  // Batch test suite
  const [batchItems, setBatchItems] = useState<BatchTestItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);

  // Initialize or update sample tests when grammar changes
  useEffect(() => {
    if (sampleAcceptedTests.length > 0) {
      setInputString(sampleAcceptedTests[1] ?? sampleAcceptedTests[0] ?? '');
      // Initialize batch suite
      const items: BatchTestItem[] = [
        ...sampleAcceptedTests.map((str, i) => ({
          id: `acc-${i}`,
          input: str,
          expectedResult: true,
        })),
        ...sampleRejectedTests.map((str, i) => ({
          id: `rej-${i}`,
          input: str,
          expectedResult: false,
        })),
      ];
      setBatchItems(items);
    }
  }, [sampleAcceptedTests, sampleRejectedTests]);

  // Run simulation whenever input changes or user triggers
  const runSimulation = (strToTest?: string) => {
    if (!pda || !cfg) return;
    const testVal = strToTest !== undefined ? strToTest : inputString;
    const res = simulatePDA(pda, cfg, testVal);
    setSimulationResult(res);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // Initial simulation run when PDA loads
  useEffect(() => {
    if (pda && cfg) {
      runSimulation();
    }
  }, [pda, cfg]);

  // Playback timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && simulationResult) {
      timer = setTimeout(() => {
        if (currentStepIndex < simulationResult.executionPath.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, simulationResult, playbackSpeed]);

  const handleStepForward = () => {
    if (!simulationResult) return;
    if (currentStepIndex < simulationResult.executionPath.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handleStepBackward = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleResetPlayback = () => {
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  const handleRunBatch = () => {
    if (!pda || !cfg || batchItems.length === 0) return;
    setIsBatchRunning(true);
    setTimeout(() => {
      const updated = batchItems.map(item => {
        const res = simulatePDA(pda, cfg, item.input);
        const actual = res.isAccepted;
        const status = item.expectedResult !== undefined
          ? (item.expectedResult === actual ? 'passed' : 'failed')
          : (actual ? 'passed' : 'failed');
        return {
          ...item,
          actualResult: actual,
          status: status as 'passed' | 'failed',
          stepsCount: res.executionPath.length - 1,
        };
      });
      setBatchItems(updated);
      setIsBatchRunning(false);
    }, 100);
  };

  const handleDownloadTrace = () => {
    if (!simulationResult) return;
    const trace = exportSimulationTraceText(simulationResult);
    downloadFile(`simulation_trace_${inputString || 'epsilon'}.txt`, trace, 'text/plain');
  };

  if (!pda || !cfg) return null;

  const currentStep: SimulationStep | undefined = simulationResult?.executionPath[currentStepIndex];

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <PlayCircle className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Interactive PDA String Simulator & Nondeterministic Trace Visualizer
            </h3>
            <p className="text-xs text-slate-500">
              Test any input string w ∈ Σ* with step-by-step stack visualization and derivation analysis
            </p>
          </div>
        </div>

        {simulationResult && (
          <button
            onClick={handleDownloadTrace}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download Trace</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Input Bar & Sample Test Chips */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputString}
                onChange={(e) => setInputString(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') runSimulation();
                }}
                placeholder="Enter input string to test (e.g. aabb, or leave empty for ε)..."
                className="w-full pl-3.5 pr-20 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400 pointer-events-none">
                {cfg.tokenizationMode === 'spaced' ? 'Spaced tokens' : 'Chars'}
              </span>
            </div>

            <button
              onClick={() => runSimulation()}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg transition shadow-xs flex items-center justify-center gap-2 shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Simulate</span>
            </button>
          </div>

          {/* Quick preset chips */}
          {(sampleAcceptedTests.length > 0 || sampleRejectedTests.length > 0) && (
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <span className="text-slate-500 font-medium">Quick Tests:</span>
              {sampleAcceptedTests.slice(0, 4).map((str, idx) => (
                <button
                  key={`acc-${idx}`}
                  onClick={() => {
                    setInputString(str);
                    runSimulation(str);
                  }}
                  className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono transition text-[11px] flex items-center gap-1"
                >
                  <span className="text-[10px] text-emerald-600 font-sans font-bold">✓</span>
                  <span>{str === '' ? 'ε (empty)' : str}</span>
                </button>
              ))}

              {sampleRejectedTests.slice(0, 3).map((str, idx) => (
                <button
                  key={`rej-${idx}`}
                  onClick={() => {
                    setInputString(str);
                    runSimulation(str);
                  }}
                  className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-mono transition text-[11px] flex items-center gap-1"
                >
                  <span className="text-[10px] text-rose-600 font-sans font-bold">✗</span>
                  <span>{str}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Verdict Banner */}
        {simulationResult && (
          <div
            className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              simulationResult.isAccepted
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {simulationResult.isAccepted ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="font-bold text-sm">
                  {simulationResult.isAccepted
                    ? 'STRING ACCEPTED BY EMPTY STACK'
                    : 'STRING REJECTED (Not in Language L(G))'}
                </div>
                <div className="text-xs opacity-90">{simulationResult.verdictMessage}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono font-medium self-end sm:self-auto shrink-0">
              <span className="bg-white/80 px-2.5 py-1 rounded border border-current">
                Explored: {simulationResult.totalStepsExplored} nodes
              </span>
              <span className="bg-white/80 px-2.5 py-1 rounded border border-current">
                Path: {simulationResult.executionPath.length - 1} steps
              </span>
            </div>
          </div>
        )}

        {/* Interactive Step-by-Step Player & Stack/Tape Visualizer */}
        {simulationResult && currentStep && (
          <div className="bg-slate-900 rounded-xl p-5 text-white space-y-5 border border-slate-800 shadow-md">
            {/* Player Controls Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetPlayback}
                  title="Jump to beginning"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleStepBackward}
                  disabled={currentStepIndex === 0}
                  title="Step Backward"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? 'Pause' : 'Auto Play'}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Auto Play</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleStepForward}
                  disabled={currentStepIndex === simulationResult.executionPath.length - 1}
                  title="Step Forward"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Speed Slider */}
                <div className="flex items-center gap-1.5 ml-2 text-xs text-slate-400">
                  <span className="text-[11px]">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="bg-slate-800 text-slate-200 text-xs rounded px-2 py-1 border border-slate-700"
                  >
                    <option value={1400}>0.5x Slow</option>
                    <option value={800}>1x Normal</option>
                    <option value={350}>2x Fast</option>
                  </select>
                </div>
              </div>

              {/* Step Counter Indicator */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  Configuration: <strong className="text-white font-mono">{currentStepIndex}</strong> of{' '}
                  <span className="font-mono">{simulationResult.executionPath.length - 1}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                    currentStep.status === 'accepted'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                      : currentStep.status === 'dead_end'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                  }`}
                >
                  {currentStep.status}
                </span>
              </div>
            </div>

            {/* Visualizer Grid: Input Tape (Left) & Physical Stack (Right) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Input Tape Box */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Input Tape & Read Head
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Remaining: {currentStep.remainingInput.length} symbols
                    </span>
                  </div>

                  {/* Tape Cells */}
                  <div className="py-3 overflow-x-auto">
                    {simulationResult.inputTokens.length === 0 ? (
                      <div className="text-center py-3 text-slate-400 font-mono text-xs">
                        &epsilon; (Empty string input)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        {simulationResult.inputTokens.map((tok, idx) => {
                          const consumedCount = simulationResult.inputTokens.length - currentStep.remainingInput.length;
                          const isConsumed = idx < consumedCount;
                          const isCurrentHead = idx === consumedCount;

                          return (
                            <div key={idx} className="flex flex-col items-center">
                              {/* Read head pointer */}
                              <div className="h-4 flex items-center justify-center">
                                {isCurrentHead && (
                                  <ArrowDown className="w-3.5 h-3.5 text-amber-400 animate-bounce" />
                                )}
                              </div>
                              {/* Cell */}
                              <div
                                className={`w-9 h-10 rounded border font-mono font-bold flex items-center justify-center text-sm shadow-xs ${
                                  isCurrentHead
                                    ? 'bg-amber-400/20 text-amber-300 border-amber-400 ring-2 ring-amber-400/40'
                                    : isConsumed
                                    ? 'bg-slate-900 text-slate-500 border-slate-800 opacity-60 line-through'
                                    : 'bg-slate-700 text-white border-slate-600'
                                }`}
                              >
                                {tok}
                              </div>
                              <span className="text-[10px] text-slate-500 mt-1 font-mono">{idx}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* State Badge */}
                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Current PDA State:</span>
                  <span className="px-2.5 py-0.5 rounded bg-indigo-900 text-indigo-200 font-mono font-bold border border-indigo-700">
                    q₀ (Strictly Single State)
                  </span>
                </div>
              </div>

              {/* Physical Vertical Stack Visualizer */}
              <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      Pushdown Stack Content (&Gamma;*)
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Depth: {currentStep.stack.length}
                    </span>
                  </div>

                  {/* Vertical Stack Tube */}
                  <div className="min-h-[140px] max-h-[180px] overflow-y-auto flex flex-col items-center justify-end p-2 bg-slate-900/90 rounded-lg border border-slate-700/60">
                    {currentStep.stack.length === 0 ? (
                      <div className="text-center py-4 text-emerald-400 font-mono text-xs flex flex-col items-center gap-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>[ EMPTY STACK ]</span>
                        <span className="text-[10px] text-slate-400 font-sans">
                          Acceptance condition met if input is consumed!
                        </span>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col items-center gap-1">
                        {currentStep.stack.map((sym, idx) => {
                          const isTop = idx === 0;
                          const isNonTerminal = cfg.nonTerminals.includes(sym);

                          return (
                            <div
                              key={idx}
                              className={`w-4/5 py-1 px-3 rounded flex items-center justify-between font-mono text-xs font-bold transition shadow-xs ${
                                isTop
                                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/80 scale-102'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{sym}</span>
                                <span className="text-[10px] font-sans font-normal opacity-75">
                                  {isNonTerminal ? '(Non-Terminal V)' : '(Terminal Σ)'}
                                </span>
                              </div>
                              {isTop && (
                                <span className="text-[10px] uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded font-sans">
                                  TOP OF STACK
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700/60 text-xs text-slate-400">
                  <span>Stack replacement replaces top symbol with order preserved (first symbol on top).</span>
                </div>
              </div>
            </div>

            {/* Current Action / Transition Description Box */}
            <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs space-y-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                Action Executed at this Step:
              </div>
              <p className="text-slate-200 text-xs sm:text-sm font-sans">
                {currentStep.actionDescription}
              </p>
              {currentStep.transitionApplied && (
                <div className="font-mono text-amber-300 font-bold bg-slate-900/80 px-2.5 py-1 rounded border border-slate-700/50 inline-block mt-1">
                  Transition: {currentStep.transitionApplied.formalNotation}
                </div>
              )}
            </div>

            {/* Leftmost Derivation Tracker */}
            {simulationResult.derivationSequence.length > 0 && (
              <div className="p-3.5 bg-slate-800/90 rounded-xl border border-slate-700 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    Isomorphic Leftmost Derivation (S ⇒* w):
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Sentential Form = (Consumed Terminals) + (Stack Symbols)
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-200 bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-nowrap">
                  {simulationResult.derivationSequence.map((form, idx) => (
                    <span key={idx} className="inline-flex items-center">
                      <span className={idx === simulationResult.derivationSequence.length - 1 ? 'text-emerald-400 font-bold' : ''}>
                        {form}
                      </span>
                      {idx < simulationResult.derivationSequence.length - 1 && (
                        <span className="text-slate-500 mx-2 font-sans font-bold">⇒ₗₘ</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Full Execution Step Table */}
        {simulationResult && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
              Complete Trace Table (Click row to inspect step)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-700 font-sans font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 w-12 text-center">Step</th>
                    <th className="py-2 px-3 w-20">State</th>
                    <th className="py-2 px-3 min-w-[120px]">Remaining Input</th>
                    <th className="py-2 px-3 min-w-[140px]">Stack (Top First)</th>
                    <th className="py-2 px-3 min-w-[180px]">Transition Rule</th>
                    <th className="py-2 px-3 font-sans min-w-[220px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {simulationResult.executionPath.map((step, idx) => {
                    const isSelected = idx === currentStepIndex;
                    return (
                      <tr
                        key={step.id}
                        onClick={() => {
                          setCurrentStepIndex(idx);
                          setIsPlaying(false);
                        }}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-950 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="py-1.5 px-3 text-center">{step.stepNumber}</td>
                        <td className="py-1.5 px-3 font-bold text-indigo-600">{step.state}</td>
                        <td className="py-1.5 px-3">
                          {step.remainingInput.length === 0 ? (
                            <span className="text-slate-400 italic">ε (empty)</span>
                          ) : (
                            step.remainingInput.join(' ')
                          )}
                        </td>
                        <td className="py-1.5 px-3">
                          {step.stack.length === 0 ? (
                            <span className="text-emerald-600 font-bold">ε (empty)</span>
                          ) : (
                            `[ ${step.stack.join(', ')} ]`
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-indigo-900">
                          {step.transitionApplied ? step.transitionApplied.formalNotation : 'Initial'}
                        </td>
                        <td className="py-1.5 px-3 font-sans text-xs text-slate-600 truncate max-w-xs">
                          {step.actionDescription}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Batch Test Suite Section */}
        {batchItems.length > 0 && (
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Grammar Language Verification (Batch Test Suite)
                </h4>
                <p className="text-xs text-slate-500">
                  Verify multiple test strings at once against the synthesized PDA
                </p>
              </div>

              <button
                onClick={handleRunBatch}
                disabled={isBatchRunning}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                {isBatchRunning ? 'Running Tests...' : 'Run All Batch Tests'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {batchItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    setInputString(item.input);
                    runSimulation(item.input);
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition hover:shadow-xs ${
                    item.status === 'passed'
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                      : item.status === 'failed'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-bold">
                      "{item.input === '' ? 'ε' : item.input}"
                    </span>
                    {item.status && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.status === 'passed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {item.status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Expected: {item.expectedResult ? 'Accept' : 'Reject'}</span>
                    {item.stepsCount !== undefined && <span>{item.stepsCount} steps</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
