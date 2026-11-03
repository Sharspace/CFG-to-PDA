/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Check, HelpCircle, Layers, Lightbulb, X } from 'lucide-react';

interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">
                CFG to Single-State PDA Converter: Theory & Usage Guide
              </h3>
              <p className="text-xs text-slate-400">
                Formal language theory reference & algorithm explanation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Section 1: The Core Theorem */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              The Equivalence Theorem
            </h4>
            <p>
              In formal language theory (Hopcroft & Ullman, Sipser), every Context-Free Grammar (CFG) has an equivalent
              <strong> nondeterministic pushdown automaton (PDA) with exactly ONE state</strong> that accepts by
              <strong> empty stack (null stack)</strong>:
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs">
              M = ( &#123; q₀ &#125;, &Sigma;, V &cup; &Sigma;, &delta;, q₀, S )
            </div>
            <p>
              Because the PDA accepts by empty stack, no separate set of accepting states <span className="font-mono">F</span> is needed.
              A string <span className="font-mono">w</span> is accepted if:
            </p>
            <div className="p-2 bg-indigo-50 rounded border border-indigo-200 font-mono text-center text-indigo-900 font-bold">
              (q₀, w, S) ⊢* (q₀, ε, ε)
            </div>
          </div>

          {/* Section 2: Two Rules of the Transition Function */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              The Two-Rule Transition Construction
            </h4>
            <p>
              The transition function <span className="font-mono">&delta;</span> is synthesized exclusively via two deterministic principles:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-2">
              <li>
                <strong>Rule Expansion Transitions (Non-Terminals):</strong> For every grammar production rule{' '}
                <span className="font-mono">A → α</span>:
                <div className="font-mono bg-slate-100 p-2 rounded mt-1 text-indigo-950 font-bold">
                  &delta;(q₀, ε, A) = (q₀, α)
                </div>
                On reading <strong>no input (ε)</strong>, if <span className="font-mono">A</span> is on top of the stack,
                pop <span className="font-mono">A</span> and push <span className="font-mono">α</span> in left-to-right order
                (so the first symbol of <span className="font-mono">α</span> sits at the new stack top).
              </li>
              <li>
                <strong>Terminal Matching Transitions (Terminals):</strong> For every terminal symbol{' '}
                <span className="font-mono">a ∈ &Sigma;</span>:
                <div className="font-mono bg-slate-100 p-2 rounded mt-1 text-emerald-950 font-bold">
                  &delta;(q₀, a, a) = (q₀, ε)
                </div>
                When terminal <span className="font-mono">a</span> reaches top of stack, consume terminal{' '}
                <span className="font-mono">a</span> from the input tape and pop it from stack.
              </li>
            </ul>
          </div>

          {/* Section 3: Leftmost Derivation Isomorphism */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              Isomorphism to Leftmost Derivation
            </h4>
            <p>
              Why does this single-state construction work for all CFGs?
              The pushdown stack dynamically stores the suffix of the current sentential form in a <strong>leftmost derivation</strong>.
              When non-terminals appear at the top, they are expanded just like the leftmost variable in a derivation step.
              When terminals appear at the top, they are verified and matched against the input.
            </p>
          </div>

          {/* Section 4: Grammar Syntax & Options */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">4</span>
              Grammar Syntax & Tokenization Modes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold block text-slate-900 mb-1">Single-Character Mode</span>
                <p className="text-xs text-slate-600">
                  Ideal for classic textbook grammars like <span className="font-mono">{'S -> a S b | ε'}</span>.
                  Every character is treated as an atomic symbol.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold block text-slate-900 mb-1">Spaced / Token Mode</span>
                <p className="text-xs text-slate-600">
                  Ideal for programming language grammars with multi-character tokens like{' '}
                  <span className="font-mono">{'Expr -> Expr + Term | id'}</span>. Whitespace delimits tokens.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
