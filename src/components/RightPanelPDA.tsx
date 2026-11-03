/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Cpu,
  FunctionSquare,
  Layers,
  ShieldCheck,
  Table as TableIcon
} from 'lucide-react';
import { CFG, PDA, PDATransition } from '../types/grammar';

interface RightPanelPDAProps {
  pda: PDA | null;
  cfg: CFG | null;
  activeConversionStep?: number; // 1-indexed transition currently active in "How Conversion Works"
}

export const RightPanelPDA: React.FC<RightPanelPDAProps> = ({
  pda,
  cfg,
  activeConversionStep = 1,
}) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLTableRowElement>(null);

  // Auto-scroll the active transition into view inside the table when step changes
  useEffect(() => {
    if (activeRowRef.current && tableContainerRef.current) {
      activeRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeConversionStep]);

  if (!pda || !cfg) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-center text-slate-400 h-full">
        <Cpu className="w-10 h-10 mb-3 opacity-40" />
        <h3 className="font-bold text-slate-700 text-sm">PDA Output Unavailable</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Provide a valid Context-Free Grammar on the left panel to synthesize the equivalent single-state PDA.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Panel Top Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-600/80 text-white font-mono font-bold text-sm">
            PDA
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white uppercase">
              Right Panel: Live PDA Conversion
            </h2>
            <p className="text-[11px] text-slate-400">
              M = (&#123; q₀ &#125;, &Sigma;, &Gamma;, &delta;, q₀, {pda.initialStackSymbol}) &nbsp;|&nbsp; Acceptance by Empty Stack
            </p>
          </div>
        </div>

        {/* State Badge */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Q = &#123; q₀ &#125; (1 State)</span>
        </span>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        {/* Formal 6-Tuple Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">
              States (Q)
            </span>
            <span className="font-bold text-indigo-700 text-sm">&#123; q₀ &#125;</span>
            <span className="text-[10px] text-slate-400 block font-sans">Strictly 1 state</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">
              Input Alphabet (Σ)
            </span>
            <span className="font-bold text-emerald-700 text-xs truncate block" title={pda.inputAlphabet.join(', ')}>
              &#123; {pda.inputAlphabet.join(', ') || '∅'} &#125;
            </span>
            <span className="text-[10px] text-slate-400 block font-sans">|Σ| = {pda.inputAlphabet.length}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">
              Stack Alphabet (Γ)
            </span>
            <span className="font-bold text-purple-700 text-xs truncate block" title={pda.stackAlphabet.join(', ')}>
              &#123; {pda.stackAlphabet.join(', ')} &#125;
            </span>
            <span className="text-[10px] text-slate-400 block font-sans">V ∪ Σ ({pda.stackAlphabet.length} symbols)</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-sans font-bold">
              Start Symbol (Z₀) & Mode
            </span>
            <span className="font-bold text-violet-700 text-sm">Z₀ = {pda.initialStackSymbol}</span>
            <span className="text-[10px] text-emerald-600 block font-sans font-bold">Empty Stack: N(M)</span>
          </div>
        </div>

        {/* Transition Table Header & Counts */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Complete PDA Transition Table ({pda.transitions.length} Transitions)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Highlighted: Transition #{activeConversionStep}
          </span>
        </div>

        {/* Interactive Transition Table with Synchronized Active Row Highlighting */}
        <div
          ref={tableContainerRef}
          className="border border-slate-200 rounded-xl overflow-x-auto max-h-[300px] overflow-y-auto flex-1 shadow-inner bg-slate-50/30"
        >
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-sans font-semibold sticky top-0 z-10 border-b border-slate-200 shadow-xs">
              <tr>
                <th className="py-2 px-3 w-10 text-center">#</th>
                <th className="py-2 px-3 w-24">Current State</th>
                <th className="py-2 px-3 w-20">Input</th>
                <th className="py-2 px-3 w-24">Stack Top</th>
                <th className="py-2 px-3 w-24">Next State</th>
                <th className="py-2 px-3 w-32">Stack Replacement</th>
                <th className="py-2 px-3 min-w-[180px]">Formal Transition Rule</th>
                <th className="py-2 px-3 font-sans min-w-[180px]">Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {pda.transitions.map((t) => {
                const isHighlighted = t.index === activeConversionStep;

                return (
                  <tr
                    key={t.id}
                    ref={isHighlighted ? activeRowRef : null}
                    className={`transition-all duration-200 ${
                      isHighlighted
                        ? 'bg-indigo-600 text-white font-bold ring-2 ring-indigo-500 scale-100 shadow-sm'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <td className="py-2 px-3 text-center opacity-70">{t.index}</td>
                    <td className={`py-2 px-3 font-bold ${isHighlighted ? 'text-white' : 'text-indigo-600'}`}>
                      q₀
                    </td>
                    <td className="py-2 px-3">
                      {t.inputSymbol === 'ε' ? (
                        <span className={`italic ${isHighlighted ? 'text-indigo-200' : 'text-slate-400'}`}>
                          ε
                        </span>
                      ) : (
                        <span className={`font-bold ${isHighlighted ? 'text-emerald-300' : 'text-emerald-700'}`}>
                          {t.inputSymbol}
                        </span>
                      )}
                    </td>
                    <td className={`py-2 px-3 font-bold ${isHighlighted ? 'text-white' : 'text-slate-900'}`}>
                      {t.stackTop}
                    </td>
                    <td className={`py-2 px-3 font-bold ${isHighlighted ? 'text-white' : 'text-indigo-600'}`}>
                      q₀
                    </td>
                    <td className={`py-2 px-3 ${isHighlighted ? 'text-purple-200 font-bold' : 'text-purple-700 font-bold'}`}>
                      {t.rawReplacement === 'ε' ? (
                        <span className={isHighlighted ? 'text-indigo-200' : 'text-slate-400'}>ε (pop)</span>
                      ) : (
                        t.rawReplacement
                      )}
                    </td>
                    <td className={`py-2 px-3 ${isHighlighted ? 'text-amber-200 font-bold' : 'text-slate-900 font-bold'}`}>
                      {t.formalNotation}
                    </td>
                    <td className={`py-2 px-3 font-sans text-xs ${isHighlighted ? 'text-indigo-100' : 'text-slate-500'}`}>
                      {t.type === 'expansion' ? 'Rule Expansion' : 'Terminal Match'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Transition Summary Pill */}
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Rule Expansions: <strong className="text-indigo-700">{pda.transitions.filter(t => t.type === 'expansion').length}</strong>
            </span>
            <span>
              Terminal Matches: <strong className="text-emerald-700">{pda.transitions.filter(t => t.type === 'matching').length}</strong>
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">
            δ(q₀, ε, A) & δ(q₀, a, a)
          </span>
        </div>
      </div>
    </div>
  );
};
