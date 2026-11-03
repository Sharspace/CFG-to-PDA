/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LeftPanelCFG } from './components/LeftPanelCFG';
import { RightPanelPDA } from './components/RightPanelPDA';
import { HowConversionWorksSection } from './components/HowConversionWorksSection';
import { SimulatorSection } from './components/SimulatorSection';
import { TheoryModal } from './components/TheoryModal';
import { PRESET_GRAMMARS, PresetGrammar, parseCFG } from './utils/parser';
import { convertCFGtoPDA } from './utils/converter';
import { TokenizationMode } from './types/grammar';

export default function App() {
  // Default: Example 5: Balanced a's and b's
  const defaultPreset = PRESET_GRAMMARS.find(p => p.id === 'ex-5-balanced-an-bn') || PRESET_GRAMMARS[0];

  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(defaultPreset.id);
  const [presetOriginalText, setPresetOriginalText] = useState<string>(defaultPreset.grammarText);
  const [grammarText, setGrammarText] = useState<string>(defaultPreset.grammarText);
  const [tokenizationMode, setTokenizationMode] = useState<TokenizationMode>(defaultPreset.tokenizationMode);
  const [customNonTerminals, setCustomNonTerminals] = useState<string>('');
  const [customTerminals, setCustomTerminals] = useState<string>('');
  const [customStartSymbol, setCustomStartSymbol] = useState<string>('');

  // Synchronized Conversion Step (1-indexed transition)
  const [conversionStep, setConversionStep] = useState<number>(1);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Check if modified from the loaded preset
  const isModified = useMemo(() => {
    if (!selectedPresetId) return true;
    return grammarText.trim() !== presetOriginalText.trim();
  }, [selectedPresetId, grammarText, presetOriginalText]);

  // Active preset object
  const activePreset = useMemo(() => {
    return PRESET_GRAMMARS.find(p => p.id === selectedPresetId) || null;
  }, [selectedPresetId]);

  // Unified CFG parser pipeline
  const { cfg, errors, warnings } = useMemo(() => {
    const customNTList = customNonTerminals.trim()
      ? customNonTerminals.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
      : undefined;
    const customTList = customTerminals.trim()
      ? customTerminals.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
      : undefined;

    return parseCFG(grammarText, {
      tokenizationMode,
      customNonTerminals: customNTList,
      customTerminals: customTList,
      customStartSymbol: customStartSymbol.trim() || undefined,
    });
  }, [grammarText, tokenizationMode, customNonTerminals, customTerminals, customStartSymbol]);

  // Unified Single-State PDA conversion engine
  const pda = useMemo(() => {
    if (!cfg) return null;
    return convertCFGtoPDA(cfg);
  }, [cfg]);

  // Reset conversion step when grammar transitions count changes
  useEffect(() => {
    setConversionStep(1);
  }, [grammarText, tokenizationMode, customNonTerminals, customTerminals, customStartSymbol]);

  // Handle Preset Selection from the dropdown
  const handleSelectPreset = (preset: PresetGrammar) => {
    setSelectedPresetId(preset.id);
    setPresetOriginalText(preset.grammarText);
    setGrammarText(preset.grammarText);
    setTokenizationMode(preset.tokenizationMode);
    setCustomNonTerminals('');
    setCustomTerminals('');
    setCustomStartSymbol('');
    setConversionStep(1);
  };

  // Reset editor back to selected preset
  const handleResetToPreset = () => {
    if (activePreset) {
      setGrammarText(activePreset.grammarText);
      setTokenizationMode(activePreset.tokenizationMode);
      setCustomNonTerminals('');
      setCustomTerminals('');
      setCustomStartSymbol('');
      setConversionStep(1);
    }
  };

  // Clear manual editor
  const handleClear = () => {
    setGrammarText('');
    setSelectedPresetId(null);
    setPresetOriginalText('');
    setCustomNonTerminals('');
    setCustomTerminals('');
    setCustomStartSymbol('');
    setConversionStep(1);
  };

  // Explicit Generate action
  const handleGeneratePDA = () => {
    const worksElement = document.getElementById('how-conversion-works');
    if (worksElement) {
      worksElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Global reset
  const handleGlobalReset = () => {
    handleSelectPreset(defaultPreset);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        cfg={cfg}
        pda={pda}
        simulationResult={null}
        selectedPresetId={selectedPresetId ?? ''}
        onSelectPreset={handleSelectPreset}
        onReset={handleGlobalReset}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Workspace: Desktop-first side-by-side workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TWO-PANEL EQUAL-WIDTH WORKSPACE (Mandatory Requirements 1 & 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* LEFT PANEL: CFG INPUT */}
          <div className="h-full">
            <LeftPanelCFG
              grammarText={grammarText}
              onGrammarTextChange={(text) => setGrammarText(text)}
              selectedPresetId={selectedPresetId}
              onSelectPreset={handleSelectPreset}
              isModified={isModified}
              tokenizationMode={tokenizationMode}
              onTokenizationModeChange={setTokenizationMode}
              customNonTerminals={customNonTerminals}
              onCustomNonTerminalsChange={setCustomNonTerminals}
              customTerminals={customTerminals}
              onCustomTerminalsChange={setCustomTerminals}
              customStartSymbol={customStartSymbol}
              onCustomStartSymbolChange={setCustomStartSymbol}
              errors={errors}
              warnings={warnings}
              cfg={cfg}
              onGeneratePDA={handleGeneratePDA}
              onClear={handleClear}
              onResetToPreset={activePreset ? handleResetToPreset : undefined}
              activeConversionStep={conversionStep}
            />
          </div>

          {/* RIGHT PANEL: LIVE PDA CONVERSION */}
          <div className="h-full">
            <RightPanelPDA
              pda={pda}
              cfg={cfg}
              activeConversionStep={conversionStep}
            />
          </div>
        </div>

        {/* SECTION: HOW THE CONVERSION WORKS (Mandatory Requirement 3) */}
        <div id="how-conversion-works">
          <HowConversionWorksSection
            cfg={cfg}
            pda={pda}
            currentStep={conversionStep}
            onStepChange={(step) => setConversionStep(step)}
          />
        </div>

        {/* SECTION: INTERACTIVE STRING SIMULATOR & TRACE */}
        <SimulatorSection
          pda={pda}
          cfg={cfg}
          sampleAcceptedTests={activePreset?.sampleAcceptedTests}
          sampleRejectedTests={activePreset?.sampleRejectedTests}
        />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono">
            M = (&#123; q₀ &#125;, &Sigma;, &Gamma;, &delta;, q₀, S) &nbsp;|&nbsp; Acceptance by Empty Stack N(M) = L(G)
          </p>
          <p className="text-slate-400">
            Universal CFG to Single-State Nondeterministic Pushdown Automaton Synthesizer
          </p>
        </div>
      </footer>

      {/* Theory & Help Modal */}
      <TheoryModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
