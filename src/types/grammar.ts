/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TokenizationMode = 'auto' | 'single_char' | 'spaced';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export interface ProductionRule {
  id: string;
  ruleNumber: number;
  lhs: string; // Non-terminal on the LHS (e.g., 'S')
  rhs: string[]; // Sequence of symbols/tokens on RHS (e.g., ['a', 'S', 'b'] or ['ε'])
  rawRhs: string; // Raw string representation of this alternative
  isEpsilon: boolean;
  line: number;
}

export interface CFG {
  nonTerminals: string[]; // V
  terminals: string[]; // Σ
  startSymbol: string; // S ∈ V
  productions: ProductionRule[]; // R
  rawText: string;
  tokenizationMode: TokenizationMode;
  properties: {
    hasLeftRecursion: boolean;
    hasRightRecursion: boolean;
    hasIndirectRecursion: boolean;
    hasEpsilonProductions: boolean;
    hasUnitProductions: boolean;
    isAmbiguousPotentially: boolean;
    unreachableSymbols: string[];
    unproductiveSymbols: string[];
  };
}

export interface GrammarParseError {
  line: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  snippet?: string;
}

export interface PDATransition {
  id: string;
  index: number;
  type: 'expansion' | 'matching';
  fromState: 'q0';
  inputSymbol: string; // 'ε' or terminal symbol a ∈ Σ
  stackTop: string; // non-terminal A ∈ V or terminal a ∈ Σ
  toState: 'q0';
  stackReplacement: string[]; // Symbols to push (top-first), or [] for ε
  rawReplacement: string; // Formatted replacement string e.g. "a S b" or "ε"
  ruleOrigin?: ProductionRule;
  formalNotation: string; // e.g. "δ(q0, ε, S) = (q0, a S b)"
  explanation: string;
}

export interface PDA {
  states: ['q0'];
  inputAlphabet: string[]; // Σ
  stackAlphabet: string[]; // Γ = V ∪ Σ
  startState: 'q0';
  initialStackSymbol: string; // Z0 = S
  transitions: PDATransition[];
  acceptance: 'empty_stack'; // N(M)
}

export interface SimulationStep {
  id: string;
  stepNumber: number;
  state: 'q0';
  remainingInput: string[];
  stack: string[]; // stack[0] is top of the stack
  transitionApplied?: PDATransition;
  actionDescription: string;
  parentStepId?: string;
  branchIndex?: number;
  derivationSnapshot?: string[];
  status: 'active' | 'accepted' | 'dead_end' | 'depth_exceeded';
}

export interface SimulationResult {
  inputString: string;
  inputTokens: string[];
  isAccepted: boolean;
  verdictMessage: string;
  executionPath: SimulationStep[];
  totalStepsExplored: number;
  maxStackDepth: number;
  derivationSequence: string[];
  allBranchesCount: number;
  depthLimitReached: boolean;
}

export interface BatchTestItem {
  id: string;
  input: string;
  expectedResult?: boolean;
  actualResult?: boolean;
  status?: 'pending' | 'passed' | 'failed' | 'running';
  stepsCount?: number;
}
