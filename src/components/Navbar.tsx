/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BookOpen, Copy, Download, HelpCircle, Layers, RefreshCw, Check, Sparkles } from 'lucide-react';
import { CFG, PDA, SimulationResult } from '../types/grammar';
import { PRESET_GRAMMARS, PresetGrammar } from '../utils/parser';
import { downloadFile, exportPDAToCSV, exportPDAToJSON, exportPDAToLaTeX } from '../utils/export';

interface NavbarProps {
  cfg: CFG | null;
  pda: PDA | null;
  simulationResult: SimulationResult | null;
  selectedPresetId: string;
  onSelectPreset: (preset: PresetGrammar) => void;
  onReset: () => void;
  onOpenHelp: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cfg,
  pda,
  selectedPresetId,
  onSelectPreset,
  onReset,
  onOpenHelp,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleCopyDefinition = () => {
    if (!pda || !cfg) return;
    const latex = exportPDAToLaTeX(pda, cfg);
    navigator.clipboard.writeText(latex);
    setCopiedType('latex');
    setTimeout(() => setCopiedType(null), 2500);
  };

  const handleExport = (format: 'latex' | 'json' | 'csv') => {
    if (!pda || !cfg) return;
    setShowExportMenu(false);
    if (format === 'latex') {
      const content = exportPDAToLaTeX(pda, cfg);
      downloadFile(`cfg_to_pda_${cfg.startSymbol}.tex`, content, 'application/x-latex');
    } else if (format === 'json') {
      const content = exportPDAToJSON(pda, cfg);
      downloadFile(`cfg_to_pda_${cfg.startSymbol}.json`, content, 'application/json');
    } else if (format === 'csv') {
      const content = exportPDAToCSV(pda);
      downloadFile(`pda_transitions_${cfg.startSymbol}.csv`, content, 'text/csv');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white font-mono font-bold text-lg shadow-sm">
            δ
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                CFG <span className="text-indigo-400">→</span> Single-State PDA
              </h1>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-indigo-950 text-indigo-300 border border-indigo-700/60">
                Acceptance by Empty Stack: N(M)
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              Side-by-Side Interactive Conversion Workspace
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* Preset Selector Dropdown */}
          <div className="hidden lg:flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-slate-400" />
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const found = PRESET_GRAMMARS.find(p => p.id === e.target.value);
                if (found) onSelectPreset(found);
              }}
              className="bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs sm:text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium max-w-[200px] truncate"
              title="Select a pre-built textbook grammar"
            >
              <option value="" disabled>-- Load Preset CFG --</option>
              <optgroup label="Beginner Level">
                {PRESET_GRAMMARS.filter(p => p.difficulty === 'Beginner').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Intermediate Level">
                {PRESET_GRAMMARS.filter(p => p.difficulty === 'Intermediate').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
              <optgroup label="Advanced Level">
                {PRESET_GRAMMARS.filter(p => p.difficulty === 'Advanced').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!pda}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download results"
            >
              <Download className="w-4 h-4 text-slate-300" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-xl bg-slate-800 border border-slate-700 py-1 text-xs sm:text-sm z-50">
                <button
                  onClick={() => handleExport('latex')}
                  className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                >
                  <span>LaTeX Document</span>
                  <span className="text-[10px] text-slate-400 font-mono">.tex</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                >
                  <span>Formal PDA Spec</span>
                  <span className="text-[10px] text-slate-400 font-mono">.json</span>
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-slate-200 hover:bg-slate-700 flex items-center justify-between"
                >
                  <span>Transition Table</span>
                  <span className="text-[10px] text-slate-400 font-mono">.csv</span>
                </button>
              </div>
            )}
          </div>

          {/* Copy LaTeX Button */}
          <button
            onClick={handleCopyDefinition}
            disabled={!pda}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Copy formal LaTeX definition to clipboard"
          >
            {copiedType === 'latex' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 hidden sm:inline">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-300" />
                <span className="hidden sm:inline">Copy LaTeX</span>
              </>
            )}
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
            title="Theoretical Guide & Notation Help"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Guide</span>
          </button>

          {/* Reset Button */}
          <button
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Reset Grammar and Clear Inputs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
