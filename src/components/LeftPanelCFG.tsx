/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Edit3,
  Layers,
  RotateCcw,
  Settings2,
  Sparkles,
  Terminal,
  Trash2,
  Wand2
} from 'lucide-react';
import { CFG, GrammarParseError, ProductionRule, TokenizationMode } from '../types/grammar';
import { PRESET_GRAMMARS, PresetGrammar } from '../utils/parser';

interface LeftPanelCFGProps {
  grammarText: string;
  onGrammarTextChange: (text: string) => void;
  selectedPresetId: string | null;
  onSelectPreset: (preset: PresetGrammar) => void;
  isModified: boolean;
  tokenizationMode: TokenizationMode;
  onTokenizationModeChange: (mode: TokenizationMode) => void;
  customNonTerminals: string;
  onCustomNonTerminalsChange: (val: string) => void;
  customTerminals: string;
  onCustomTerminalsChange: (val: string) => void;
  customStartSymbol: string;
  onCustomStartSymbolChange: (val: string) => void;
  errors: GrammarParseError[];
  warnings: GrammarParseError[];
  cfg: CFG | null;
  onGeneratePDA: () => void;
  onClear: () => void;
  onResetToPreset?: () => void;
  activeConversionStep?: number; // 1-indexed step in "How Conversion Works"
}

export const LeftPanelCFG: React.FC<LeftPanelCFGProps> = ({
  grammarText,
  onGrammarTextChange,
  selectedPresetId,
  onSelectPreset,
  isModified,
  tokenizationMode,
  onTokenizationModeChange,
  customNonTerminals,
  onCustomNonTerminalsChange,
  customTerminals,
  onCustomTerminalsChange,
  customStartSymbol,
  onCustomStartSymbolChange,
  errors,
  warnings,
  cfg,
  onGeneratePDA,
  onClear,
  onResetToPreset,
  activeConversionStep = 1,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper to insert special symbol at cursor position
  const insertSymbol = (symbol: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const prev = textarea.value;
    const next = prev.substring(0, start) + symbol + prev.substring(end);
    onGrammarTextChange(next);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + symbol.length, start + symbol.length);
    }, 0);
  };

  const activePreset = PRESET_GRAMMARS.find((p) => p.id === selectedPresetId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Panel Top Header */}
      <div className="bg-slate-900 text-white px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600/70 text-white font-mono font-bold text-sm">
            CFG
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white uppercase">
              Left Panel: CFG Input
            </h2>
            <p className="text-[11px] text-slate-400">
              Select a predefined grammar or manually enter custom production rules
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium ${
            !selectedPresetId || isModified
              ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
          }`}
        >
          <Edit3 className="w-3 h-3" />
          <span>{!selectedPresetId ? 'Custom Grammar' : isModified ? 'Custom (Modified)' : 'Loaded Preset'}</span>
        </span>
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
        {/* Dropdown: "Select Grammar" (Mandatory Requirement 1) */}
        <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Grammar</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              15 Predefined Structures
            </span>
          </label>

          <select
            value={selectedPresetId ?? ''}
            onChange={(e) => {
              const found = PRESET_GRAMMARS.find((p) => p.id === e.target.value);
              if (found) onSelectPreset(found);
            }}
            className="w-full bg-white border border-slate-300 hover:border-slate-400 text-slate-900 text-xs sm:text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition shadow-xs"
          >
            <option value="" disabled>
              -- Select Grammar Structure --
            </option>
            <optgroup label="Beginner Grammars">
              {PRESET_GRAMMARS.filter((p) => p.difficulty === 'Beginner').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Intermediate Grammars">
              {PRESET_GRAMMARS.filter((p) => p.difficulty === 'Intermediate').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Advanced Grammars">
              {PRESET_GRAMMARS.filter((p) => p.difficulty === 'Advanced').map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>

          {activePreset && (
            <p className="text-[11px] text-slate-500 pt-0.5 leading-normal">
              <strong className="text-slate-700">{activePreset.name}:</strong> {activePreset.description}
            </p>
          )}
        </div>

        {/* Identified Symbols Badges (V, Σ, S) */}
        {cfg && (
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100">
              <span className="text-[10px] font-bold text-indigo-700 block uppercase">
                Non-Terminals (V)
              </span>
              <span className="font-bold text-indigo-950 text-xs truncate block" title={cfg.nonTerminals.join(', ')}>
                &#123; {cfg.nonTerminals.join(', ')} &#125;
              </span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 block uppercase">
                Terminals (Σ)
              </span>
              <span className="font-bold text-emerald-950 text-xs truncate block" title={cfg.terminals.join(', ')}>
                &#123; {cfg.terminals.join(', ') || '∅'} &#125;
              </span>
            </div>
            <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100">
              <span className="text-[10px] font-bold text-purple-700 block uppercase">
                Start Symbol (S)
              </span>
              <span className="font-bold text-purple-950 text-xs truncate block">
                {cfg.startSymbol}
              </span>
            </div>
          </div>
        )}

        {/* Quick Insert Symbol Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap pb-1 border-b border-slate-100">
          <span className="text-xs text-slate-500 mr-1 font-medium">Insert:</span>
          {[
            { label: '→', val: ' -> ', tip: 'Production arrow' },
            { label: 'ε', val: 'ε', tip: 'Epsilon (empty string)' },
            { label: '|', val: ' | ', tip: 'Alternative separator' },
            { label: '(', val: ' ( ', tip: 'Open parenthesis' },
            { label: ')', val: ' ) ', tip: 'Close parenthesis' },
            { label: '+', val: ' + ', tip: 'Plus operator' },
            { label: '*', val: ' * ', tip: 'Multiply operator' },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => insertSymbol(btn.val)}
              title={btn.tip}
              className="px-2.5 py-1 text-xs font-mono font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded border border-slate-200 transition active:scale-95 shadow-xs"
            >
              {btn.label}
            </button>
          ))}
          <span className="text-[11px] text-slate-400 ml-auto hidden sm:inline">
            Editable text area
          </span>
        </div>

        {/* Multiline Grammar Editor */}
        <div className="relative flex-1 min-h-[190px]">
          <textarea
            ref={textareaRef}
            value={grammarText}
            onChange={(e) => onGrammarTextChange(e.target.value)}
            placeholder={`Enter CFG production rules, for example:\nS -> a S b | ε\n\nOr multi-line:\nE -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`}
            className="w-full h-full font-mono text-sm leading-relaxed p-3.5 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none selection:bg-indigo-700 placeholder:text-slate-500 shadow-inner"
            spellCheck={false}
          />
        </div>

        {/* Parsed Production Rules List with Active Step Highlight */}
        {cfg && cfg.productions.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
              <span>Parsed CFG Productions ({cfg.productions.length})</span>
              <span className="text-indigo-600 font-normal">
                Step {activeConversionStep <= cfg.productions.length ? `#${activeConversionStep}` : 'Terminal Matches'} active
              </span>
            </span>

            <div className="space-y-1 font-mono text-xs max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200">
              {cfg.productions.map((p, idx) => {
                const isStepActive = activeConversionStep === idx + 1;

                return (
                  <div
                    key={p.id}
                    className={`px-2.5 py-1.5 rounded transition flex items-center justify-between ${
                      isStepActive
                        ? 'bg-indigo-600 text-white font-bold shadow-xs scale-101 ring-1 ring-indigo-400'
                        : 'bg-white text-slate-800 border border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-sans ${isStepActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                        Rule #{p.ruleNumber}:
                      </span>
                      <span>{p.lhs}</span>
                      <span className={isStepActive ? 'text-indigo-200' : 'text-slate-400'}>→</span>
                      <span className={isStepActive ? 'text-amber-200 font-bold' : 'text-emerald-700'}>
                        {p.rawRhs === 'ε' ? 'ε' : p.rawRhs}
                      </span>
                    </div>

                    {isStepActive && (
                      <span className="text-[10px] uppercase font-sans font-semibold bg-white/20 px-1.5 py-0.2 rounded">
                        Converting
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Declarations (Start Symbol, Non-Terminals, Terminals) */}
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
          >
            <div className="flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Symbol Declarations & Tokenization Options</span>
            </div>
            {showAdvanced ? (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-3 bg-white border-t border-slate-200 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Start Symbol (S):
                  </label>
                  <input
                    type="text"
                    value={customStartSymbol}
                    onChange={(e) => onCustomStartSymbolChange(e.target.value)}
                    placeholder={cfg?.startSymbol ? `Auto (${cfg.startSymbol})` : 'e.g. S'}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Non-Terminals (V):
                  </label>
                  <input
                    type="text"
                    value={customNonTerminals}
                    onChange={(e) => onCustomNonTerminalsChange(e.target.value)}
                    placeholder="Auto (or S, A, B)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Terminals (Σ):
                  </label>
                  <input
                    type="text"
                    value={customTerminals}
                    onChange={(e) => onCustomTerminalsChange(e.target.value)}
                    placeholder="Auto (or a, b)"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  Tokenization Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'auto', label: 'Auto Detect' },
                    { id: 'single_char', label: 'Single Chars' },
                    { id: 'spaced', label: 'Spaced Tokens' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onTokenizationModeChange(m.id as TokenizationMode)}
                      className={`p-1.5 text-center rounded border transition text-xs ${
                        tokenizationMode === m.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: Generate PDA & Clear */}
        <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGeneratePDA}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm transition shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Wand2 className="w-4 h-4" />
              <span>Generate PDA</span>
            </button>

            {isModified && onResetToPreset && (
              <button
                type="button"
                onClick={onResetToPreset}
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                title="Reset editor back to the selected preset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Preset</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClear}
            className="px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-slate-600 text-xs font-medium transition flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Syntax Errors Alert */}
        {errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-red-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Grammar Syntax Error{errors.length > 1 ? 's' : ''}:</span>
            </div>
            <ul className="list-disc list-inside text-red-600 space-y-0.5 ml-1">
              {errors.map((err, idx) => (
                <li key={idx}>
                  <span className="font-mono font-bold">Line {err.line}:</span> {err.message}
                  {err.snippet && <span className="font-mono text-slate-600 block pl-4">→ "{err.snippet}"</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && errors.length === 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-0.5">
            <div className="font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Grammar Advisory:</span>
            </div>
            {warnings.map((w, idx) => (
              <p key={idx} className="text-amber-700 pl-4.5">{w.message}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
