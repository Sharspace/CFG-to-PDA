/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Terminal
} from 'lucide-react';
import { CFG, PDA, PDATransition } from '../types/grammar';

interface HowConversionWorksSectionProps {
  cfg: CFG | null;
  pda: PDA | null;
  currentStep: number;
  onStepChange: (step: number) => void;
}

export const HowConversionWorksSection: React.FC<HowConversionWorksSectionProps> = ({
  cfg,
  pda,
  currentStep,
  onStepChange,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeed, setPlaySpeed] = useState<number>(1800); // ms per step

  const totalSteps = pda ? pda.transitions.length : 0;

  // Auto-play timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && totalSteps > 0) {
      timer = setTimeout(() => {
        if (currentStep < totalSteps) {
          onStepChange(currentStep + 1);
        } else {
          setIsPlaying(false);
        }
      }, playSpeed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, totalSteps, playSpeed, onStepChange]);

  if (!cfg || !pda || totalSteps === 0) return null;

  // 1-indexed transition
  const activeTransition: PDATransition = pda.transitions[currentStep - 1] || pda.transitions[0];
  const isExpansion = activeTransition.type === 'expansion';

  const handlePrev = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      onStepChange(currentStep + 1);
    }
  };

  const handleReset = () => {
    onStepChange(1);
    setIsPlaying(false);
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Section Header */}
      <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight text-white uppercase">
              HOW THE CONVERSION WORKS
            </h2>
            <p className="text-xs text-slate-400">
              Live step-by-step production rule to PDA transition mapping
            </p>
          </div>
        </div>

        {/* Playback & Step Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Step Indicator */}
          <span className="text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200">
            Conversion Step: <strong className="text-amber-400">{currentStep}</strong> / {totalSteps}
          </span>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={handlePrev}
              disabled={currentStep <= 1}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
              title="Previous Conversion Step"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 transition"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Conversion</span>
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentStep >= totalSteps}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
              title="Next Conversion Step"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="Restart from Step 1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Playback speed */}
          <select
            value={playSpeed}
            onChange={(e) => setPlaySpeed(Number(e.target.value))}
            className="bg-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1.5 border border-slate-700 font-mono"
            title="Animation speed"
          >
            <option value={2400}>Slow (2.4s)</option>
            <option value={1600}>Normal (1.6s)</option>
            <option value={900}>Fast (0.9s)</option>
          </select>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5 bg-slate-50/40">
        {/* Side-by-Side Interactive Mapping Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* LEFT SIDE: Original CFG Production */}
          <div className="md:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                <span>CFG Source Component</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                {isExpansion ? `Production #${activeTransition.ruleOrigin?.ruleNumber}` : `Terminal Symbol`}
              </span>
            </div>

            {/* Display of the CFG production or terminal */}
            <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-center shadow-inner">
              {isExpansion && activeTransition.ruleOrigin ? (
                <div className="text-xl sm:text-2xl font-bold tracking-wide">
                  <span className="text-indigo-400">{activeTransition.ruleOrigin.lhs}</span>
                  <span className="text-slate-500 mx-3">→</span>
                  <span className="text-emerald-400">
                    {activeTransition.ruleOrigin.rawRhs === 'ε' ? 'ε' : activeTransition.ruleOrigin.rawRhs}
                  </span>
                </div>
              ) : (
                <div className="text-xl sm:text-2xl font-bold tracking-wide">
                  <span className="text-emerald-400 font-bold">{activeTransition.inputSymbol}</span>
                  <span className="text-slate-500 text-sm font-sans mx-2">∈</span>
                  <span className="text-indigo-300 text-sm font-sans">Σ (Terminal Alphabet)</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {isExpansion
                ? `Rule alternative with non-terminal '${activeTransition.stackTop}' on LHS, deriving '${activeTransition.rawReplacement}'.`
                : `Terminal '${activeTransition.inputSymbol}' must be matched and consumed from the input tape when on top of the stack.`}
            </p>
          </div>

          {/* CENTER: Mapping Arrow Indicator */}
          <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-2">
            <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs mb-1">
              <ArrowRight className="w-5 h-5 hidden md:block" />
              <ChevronRight className="w-5 h-5 md:hidden" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-900">
              Synthesizes
            </span>
          </div>

          {/* RIGHT SIDE: Synthesized PDA Transition */}
          <div className="md:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>Resulting PDA Transition</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  isExpansion
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isExpansion ? 'Rule Expansion δ' : 'Terminal Match δ'}
              </span>
            </div>

            {/* Formal Transition Formula */}
            <div className="p-4 rounded-xl bg-slate-900 text-amber-300 font-mono text-center shadow-inner">
              <div className="text-xl sm:text-2xl font-bold tracking-wide">
                {activeTransition.formalNotation}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
              <div>
                <span className="text-slate-400 block font-sans">Input Symbol:</span>
                <strong className="text-emerald-700">
                  {activeTransition.inputSymbol === 'ε' ? 'ε (None)' : activeTransition.inputSymbol}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Stack Top:</span>
                <strong className="text-indigo-700">{activeTransition.stackTop}</strong>
              </div>
              <div>
                <span className="text-slate-400 block font-sans">Replacement:</span>
                <strong className="text-purple-700">{activeTransition.rawReplacement}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Pedagogical Explanation Banner */}
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs sm:text-sm text-indigo-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-indigo-900">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Mathematical Rationale & Conversion Principle:</span>
          </div>
          <p className="leading-relaxed">
            {activeTransition.explanation}
          </p>
          <div className="text-[11px] font-mono text-indigo-800/90 pt-1 border-t border-indigo-200/80">
            {isExpansion ? (
              <span>
                • Stack Convention: Replacing non-terminal '{activeTransition.stackTop}' with '{activeTransition.rawReplacement}' preserves leftmost derivation.
                Symbol '{activeTransition.stackReplacement[0] || 'ε'}' will sit at the very TOP of the stack.
              </span>
            ) : (
              <span>
                • Terminal Matching: Terminal '{activeTransition.inputSymbol}' on the tape matches the top of the stack; the PDA consumes '{activeTransition.inputSymbol}' from the tape and pops it from the stack (replaces with ε).
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
