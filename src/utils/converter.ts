/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CFG, PDA, PDATransition } from '../types/grammar';

export function convertCFGtoPDA(cfg: CFG): PDA {
  const transitions: PDATransition[] = [];
  let index = 1;

  // 1. Convert every production rule A -> α into:
  // δ(q0, ε, A) = (q0, α)
  // Stack replacement convention: if α = X1 X2 ... Xk, X1 is at the top of stack.
  // If α is ε, stack replacement is empty (pop A).
  for (const prod of cfg.productions) {
    const isEps = prod.isEpsilon || prod.rhs.length === 0 || (prod.rhs.length === 1 && prod.rhs[0] === 'ε');
    const replacementTokens = isEps ? [] : [...prod.rhs];
    const replacementDisplay = isEps ? 'ε' : replacementTokens.join(cfg.tokenizationMode === 'spaced' ? ' ' : '');

    const transition: PDATransition = {
      id: `trans-${index}`,
      index: index++,
      type: 'expansion',
      fromState: 'q0',
      inputSymbol: 'ε',
      stackTop: prod.lhs,
      toState: 'q0',
      stackReplacement: replacementTokens,
      rawReplacement: replacementDisplay,
      ruleOrigin: prod,
      formalNotation: `δ(q₀, ε, ${prod.lhs}) = (q₀, ${replacementDisplay})`,
      explanation: isEps
        ? `Rule Expansion (${prod.lhs} → ε): On reading no input (ε), pop non-terminal '${prod.lhs}' from the top of the stack without pushing anything (erasing '${prod.lhs}').`
        : `Rule Expansion (${prod.lhs} → ${replacementDisplay}): On reading no input (ε), pop non-terminal '${prod.lhs}' from the top of the stack and push '${replacementDisplay}' in exact left-to-right order (placing '${replacementTokens[0]}' at the new top of the stack).`,
    };

    transitions.push(transition);
  }

  // 2. Generate terminal matching transitions for every terminal a ∈ Σ:
  // δ(q0, a, a) = (q0, ε)
  for (const term of cfg.terminals) {
    const transition: PDATransition = {
      id: `trans-${index}`,
      index: index++,
      type: 'matching',
      fromState: 'q0',
      inputSymbol: term,
      stackTop: term,
      toState: 'q0',
      stackReplacement: [],
      rawReplacement: 'ε',
      formalNotation: `δ(q₀, ${term}, ${term}) = (q₀, ε)`,
      explanation: `Terminal Matching: Read terminal symbol '${term}' from the input tape. Because the top of the stack is also '${term}', consume '${term}' and pop it from the stack.`,
    };

    transitions.push(transition);
  }

  // Stack alphabet Γ = V ∪ Σ
  const stackAlphabet = Array.from(new Set([...cfg.nonTerminals, ...cfg.terminals]));

  return {
    states: ['q0'],
    inputAlphabet: cfg.terminals,
    stackAlphabet,
    startState: 'q0',
    initialStackSymbol: cfg.startSymbol,
    transitions,
    acceptance: 'empty_stack',
  };
}
