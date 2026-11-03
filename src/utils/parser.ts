/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CFG, GrammarParseError, ProductionRule, TokenizationMode } from '../types/grammar';

export const EPSILON_ALIASES = new Set([
  'ε',
  '\\epsilon',
  'eps',
  'epsilon',
  'e',
  '^',
  'λ',
  'lambda',
  'empty',
  '""',
  "''"
]);

export function isEpsilonSymbol(token: string): boolean {
  if (!token) return true;
  const clean = token.trim();
  return clean === '' || EPSILON_ALIASES.has(clean) || EPSILON_ALIASES.has(clean.toLowerCase());
}

export interface ParseOptions {
  tokenizationMode?: TokenizationMode;
  customNonTerminals?: string[];
  customTerminals?: string[];
  customStartSymbol?: string;
}

export interface ParseResult {
  cfg: CFG | null;
  errors: GrammarParseError[];
  warnings: GrammarParseError[];
}

export function parseCFG(rawInput: string, options: ParseOptions = {}): ParseResult {
  const errors: GrammarParseError[] = [];
  const warnings: GrammarParseError[] = [];

  const lines = rawInput.split('\n');
  const rawRules: { line: number; lhs: string; rhsAlternatives: string[] }[] = [];
  const declaredLHS = new Set<string>();

  // Regex to match arrows: ->, →, ::=, =>, or lone :
  const arrowRegex = /->|→|::=|=>|:/;

  // First pass: identify lines and LHS symbols
  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i];
    const lineNum = i + 1;
    // Strip comments (# or //)
    const commentIdx = originalLine.search(/#|\/\//);
    const lineText = (commentIdx !== -1 ? originalLine.substring(0, commentIdx) : originalLine).trim();

    if (!lineText) continue;

    const match = lineText.match(arrowRegex);
    if (!match || match.index === undefined) {
      errors.push({
        line: lineNum,
        message: `Missing production arrow (use '->', '→', or '::=')`,
        severity: 'error',
        snippet: lineText,
      });
      continue;
    }

    const lhsRaw = lineText.substring(0, match.index).trim();
    const rhsRaw = lineText.substring(match.index + match[0].length).trim();

    if (!lhsRaw) {
      errors.push({
        line: lineNum,
        message: `Left-hand side (non-terminal) is missing before '${match[0]}'`,
        severity: 'error',
        snippet: lineText,
      });
      continue;
    }

    // Split multiple alternatives separated by |
    const alternatives = rhsRaw.split('|').map(alt => alt.trim());
    rawRules.push({
      line: lineNum,
      lhs: lhsRaw,
      rhsAlternatives: alternatives,
    });

    declaredLHS.add(lhsRaw);
  }

  if (errors.length > 0) {
    return { cfg: null, errors, warnings };
  }

  if (rawRules.length === 0) {
    errors.push({
      line: 1,
      message: 'Grammar is empty. Please enter at least one production rule.',
      severity: 'error',
    });
    return { cfg: null, errors, warnings };
  }

  // Determine non-terminals V
  const nonTerminals = options.customNonTerminals && options.customNonTerminals.length > 0
    ? Array.from(new Set([...options.customNonTerminals, ...declaredLHS]))
    : Array.from(declaredLHS);

  const nonTerminalSet = new Set(nonTerminals);

  // Determine tokenization mode
  let mode: TokenizationMode = options.tokenizationMode || 'auto';
  if (mode === 'auto') {
    // Check if any non-terminal or RHS token has length > 1 (excluding epsilon aliases)
    const hasMultiCharSymbol = rawRules.some(r =>
      r.lhs.length > 1 ||
      r.rhsAlternatives.some(alt => {
        const tokens = tokenizeSpaced(alt);
        return tokens.some(t => t.length > 1 && !isEpsilonSymbol(t));
      })
    );
    mode = hasMultiCharSymbol ? 'spaced' : 'single_char';
  }

  // Tokenize RHS strings
  const productions: ProductionRule[] = [];
  const foundTerminals = new Set<string>();
  let ruleCounter = 1;

  for (const r of rawRules) {
    const { line, lhs, rhsAlternatives } = r;

    for (const alt of rhsAlternatives) {
      const isEps = isEpsilonSymbol(alt);
      let tokens: string[] = [];

      if (!isEps) {
        if (mode === 'spaced') {
          // Tokenize by whitespace, keeping quoted phrases intact if any
          tokens = tokenizeSpaced(alt);
        } else {
          // Single character mode
          tokens = tokenizeSingleChar(alt);
        }
      }

      // Check tokens: if not in non-terminals, it's a terminal
      for (const t of tokens) {
        if (!isEpsilonSymbol(t) && !nonTerminalSet.has(t)) {
          foundTerminals.add(t);
        }
      }

      productions.push({
        id: `rule-${ruleCounter}`,
        ruleNumber: ruleCounter++,
        lhs,
        rhs: isEps ? ['ε'] : tokens,
        rawRhs: isEps ? 'ε' : tokens.join(mode === 'spaced' ? ' ' : ''),
        isEpsilon: isEps,
        line,
      });
    }
  }

  // Determine terminals Σ
  const terminals = options.customTerminals && options.customTerminals.length > 0
    ? Array.from(new Set([...options.customTerminals, ...foundTerminals])).filter(t => !nonTerminalSet.has(t) && !isEpsilonSymbol(t))
    : Array.from(foundTerminals).filter(t => !nonTerminalSet.has(t) && !isEpsilonSymbol(t));

  // Determine start symbol S
  let startSymbol = options.customStartSymbol?.trim() || rawRules[0].lhs;
  if (!nonTerminalSet.has(startSymbol)) {
    warnings.push({
      line: 1,
      message: `Specified start symbol '${startSymbol}' is not declared in the rules. Defaulting to '${rawRules[0].lhs}'.`,
      severity: 'warning',
    });
    startSymbol = rawRules[0].lhs;
  }

  // Analyze CFG properties
  const properties = analyzeGrammarProperties(nonTerminals, terminals, startSymbol, productions);

  const cfg: CFG = {
    nonTerminals,
    terminals,
    startSymbol,
    productions,
    rawText: rawInput,
    tokenizationMode: mode,
    properties,
  };

  return { cfg, errors, warnings };
}

function tokenizeSpaced(text: string): string[] {
  // Support quoted tokens like 'id' or "num"
  const tokens: string[] = [];
  const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const token = match[1] ?? match[2] ?? match[3];
    if (token) {
      tokens.push(token);
    }
  }

  return tokens;
}

function tokenizeSingleChar(text: string): string[] {
  const clean = text.replace(/\s+/g, '');
  if (!clean) return [];

  // Check if it's an epsilon alias
  if (isEpsilonSymbol(clean)) return [];

  return clean.split('');
}

function analyzeGrammarProperties(
  nonTerminals: string[],
  terminals: string[],
  startSymbol: string,
  productions: ProductionRule[]
) {
  let hasLeftRecursion = false;
  let hasRightRecursion = false;
  let hasEpsilonProductions = false;
  let hasUnitProductions = false;

  const nonTerminalSet = new Set(nonTerminals);

  // Graph for indirect recursion
  const directDerivesMap = new Map<string, Set<string>>();
  for (const nt of nonTerminals) {
    directDerivesMap.set(nt, new Set<string>());
  }

  for (const p of productions) {
    if (p.isEpsilon || p.rhs.length === 0 || (p.rhs.length === 1 && p.rhs[0] === 'ε')) {
      hasEpsilonProductions = true;
      continue;
    }

    // Direct left recursion: A -> A α
    if (p.rhs[0] === p.lhs) {
      hasLeftRecursion = true;
    }

    // Direct right recursion: A -> α A
    if (p.rhs[p.rhs.length - 1] === p.lhs) {
      hasRightRecursion = true;
    }

    // Unit production: A -> B where B ∈ V
    if (p.rhs.length === 1 && nonTerminalSet.has(p.rhs[0])) {
      hasUnitProductions = true;
    }

    // Populate derivation graph
    for (const token of p.rhs) {
      if (nonTerminalSet.has(token)) {
        directDerivesMap.get(p.lhs)?.add(token);
      }
    }
  }

  // Detect indirect recursion (cycles of length > 1 in dependency graph)
  let hasIndirectRecursion = false;
  for (const nt of nonTerminals) {
    const visited = new Set<string>();
    const stack = [nt];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const neighbors = directDerivesMap.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (neighbor === nt && current !== nt) {
          hasIndirectRecursion = true;
          break;
        }
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
      if (hasIndirectRecursion) break;
    }
    if (hasIndirectRecursion) break;
  }

  // Reachable symbols from startSymbol
  const reachable = new Set<string>([startSymbol]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of productions) {
      if (reachable.has(p.lhs)) {
        for (const sym of p.rhs) {
          if (!reachable.has(sym)) {
            reachable.add(sym);
            changed = true;
          }
        }
      }
    }
  }

  const unreachableSymbols = nonTerminals.filter(nt => !reachable.has(nt));

  // Productive symbols (can generate terminal string)
  const productive = new Set<string>(terminals);
  productive.add('ε');
  changed = true;
  while (changed) {
    changed = false;
    for (const p of productions) {
      if (!productive.has(p.lhs)) {
        const canProduce = p.isEpsilon || p.rhs.every(sym => productive.has(sym));
        if (canProduce) {
          productive.add(p.lhs);
          changed = true;
        }
      }
    }
  }

  const unproductiveSymbols = nonTerminals.filter(nt => !productive.has(nt));

  // Ambiguity check heuristic (e.g. S -> S S or multiple recursive calls)
  const isAmbiguousPotentially = productions.some(p => {
    const occurrences = p.rhs.filter(s => s === p.lhs).length;
    return occurrences >= 2;
  });

  return {
    hasLeftRecursion,
    hasRightRecursion,
    hasIndirectRecursion,
    hasEpsilonProductions,
    hasUnitProductions,
    isAmbiguousPotentially,
    unreachableSymbols,
    unproductiveSymbols,
  };
}

export interface PresetGrammar {
  id: string;
  name: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: string;
  description: string;
  grammarText: string;
  tokenizationMode: TokenizationMode;
  sampleAcceptedTests: string[];
  sampleRejectedTests: string[];
}

export const PRESET_GRAMMARS: PresetGrammar[] = [
  // --- BEGINNER LEVEL ---
  {
    id: 'ex-1-simple-recursive',
    name: 'Example 1: Simple Recursive Grammar',
    difficulty: 'Beginner',
    category: 'Right Recursion',
    description: 'Generates strings of the form aⁿb (n ≥ 0) with simple right recursion.',
    grammarText: `S -> aS | b`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['b', 'ab', 'aab', 'aaab'],
    sampleRejectedTests: ['', 'a', 'ba', 'bb'],
  },
  {
    id: 'ex-2-epsilon-production',
    name: 'Example 2: Epsilon Production',
    difficulty: 'Beginner',
    category: 'Nullable / Epsilon',
    description: 'Generates aⁿ (n ≥ 0), terminating with an epsilon (empty string) production.',
    grammarText: `S -> aS | ε`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['', 'a', 'aa', 'aaa'],
    sampleRejectedTests: ['b', 'ab', 'ba'],
  },
  {
    id: 'ex-3-multiple-alternatives',
    name: 'Example 3: Multiple Alternatives',
    difficulty: 'Beginner',
    category: 'Finite Language',
    description: 'Generates a single terminal choice {a, b, c} with no recursion.',
    grammarText: `S -> a | b | c`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['a', 'b', 'c'],
    sampleRejectedTests: ['', 'ab', 'd', 'aa'],
  },
  {
    id: 'ex-4-simple-concatenation',
    name: 'Example 4: Simple Concatenation',
    difficulty: 'Beginner',
    category: 'Concatenation',
    description: 'Concatenation of two distinct non-terminals deriving fixed terminal symbols {ab}.',
    grammarText: `S -> AB\nA -> a\nB -> b`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['ab'],
    sampleRejectedTests: ['', 'a', 'b', 'ba', 'aabb'],
  },
  {
    id: 'ex-5-balanced-an-bn',
    name: 'Example 5: Balanced a\'s and b\'s',
    difficulty: 'Beginner',
    category: 'Balanced Context-Free',
    description: 'Classic language {aⁿbⁿ | n ≥ 0} demonstrating push/pop stack balance.',
    grammarText: `S -> aSb | ε`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['', 'ab', 'aabb', 'aaabbb'],
    sampleRejectedTests: ['a', 'b', 'ba', 'aab', 'abb'],
  },

  // --- INTERMEDIATE LEVEL ---
  {
    id: 'ex-6-multiple-non-terminals',
    name: 'Example 6: Multiple Non-terminals',
    difficulty: 'Intermediate',
    category: 'Independent Iteration',
    description: 'Generates a⁺b⁺, concatenating two independently recursing non-terminals.',
    grammarText: `S -> AB\nA -> aA | a\nB -> bB | b`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['ab', 'aab', 'abb', 'aabb', 'aaabb'],
    sampleRejectedTests: ['', 'a', 'b', 'ba'],
  },
  {
    id: 'ex-7-unit-production',
    name: 'Example 7: Unit Production',
    difficulty: 'Intermediate',
    category: 'Unit Derivation',
    description: 'Features a unit production S → A with subsequent recursive expansion.',
    grammarText: `S -> A\nA -> aA | b`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['b', 'ab', 'aab', 'aaab'],
    sampleRejectedTests: ['', 'a', 'bb', 'ba'],
  },
  {
    id: 'ex-8-left-recursive',
    name: 'Example 8: Left Recursive Grammar',
    difficulty: 'Intermediate',
    category: 'Left Recursion',
    description: 'Classic direct left recursion S → Sa generating baⁿ (n ≥ 0).',
    grammarText: `S -> Sa | b`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['b', 'ba', 'baa', 'baaa'],
    sampleRejectedTests: ['', 'a', 'ab', 'bba'],
  },
  {
    id: 'ex-9-multiple-recursive-alternatives',
    name: 'Example 9: Multiple Recursive Alternatives',
    difficulty: 'Intermediate',
    category: 'Prefix Branching',
    description: 'Generates all binary strings {a, b}* using multiple recursive alternatives.',
    grammarText: `S -> aS | bS | ε`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['', 'a', 'b', 'ab', 'ba', 'abba'],
    sampleRejectedTests: ['c', 'abc'],
  },
  {
    id: 'ex-10-palindrome-grammar',
    name: 'Example 10: Palindrome Grammar',
    difficulty: 'Intermediate',
    category: 'Palindromes',
    description: 'Generates all even and odd length palindromes over {a, b}.',
    grammarText: `S -> aSa | bSb | a | b | ε`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['', 'a', 'b', 'aa', 'bb', 'aba', 'bab', 'abba', 'aabaa'],
    sampleRejectedTests: ['ab', 'ba', 'abb', 'aab'],
  },

  // --- ADVANCED LEVEL ---
  {
    id: 'ex-11-ambiguous-grammar',
    name: 'Example 11: Ambiguous Grammar',
    difficulty: 'Advanced',
    category: 'Ambiguity',
    description: 'Famous arithmetic grammar with multiple leftmost parse trees for identical strings.',
    grammarText: `E -> E + E | E * E | id`,
    tokenizationMode: 'spaced',
    sampleAcceptedTests: ['id', 'id + id', 'id * id', 'id + id * id'],
    sampleRejectedTests: ['', '+', 'id +', '* id'],
  },
  {
    id: 'ex-12-nested-expressions',
    name: 'Example 12: Nested Expressions',
    difficulty: 'Advanced',
    category: 'Precedence & Nesting',
    description: 'Standard unambiguous compiler arithmetic grammar with precedence and parentheses.',
    grammarText: `E -> E + T | T\nT -> T * F | F\nF -> ( E ) | id`,
    tokenizationMode: 'spaced',
    sampleAcceptedTests: ['id', 'id + id', 'id * id', '( id + id ) * id'],
    sampleRejectedTests: ['', '+', 'id +', '(', '( id'],
  },
  {
    id: 'ex-13-indirect-recursion',
    name: 'Example 13: Indirect Recursion',
    difficulty: 'Advanced',
    category: 'Mutual Recursion',
    description: 'Features a mutual cycle between S and A (S → Aa, A → Sc).',
    grammarText: `S -> Aa | b\nA -> Sc | a`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['b', 'aa', 'bca', 'aaca'],
    sampleRejectedTests: ['', 'a', 'c'],
  },
  {
    id: 'ex-14-recursive-concatenation',
    name: 'Example 14: Recursive Concatenation',
    difficulty: 'Advanced',
    category: 'Non-deterministic Splitting',
    description: 'Highly ambiguous grammar S → SS | a | b generating all non-empty strings {a, b}⁺.',
    grammarText: `S -> SS | a | b`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['a', 'b', 'ab', 'ba', 'aa', 'aab', 'bba'],
    sampleRejectedTests: ['', 'c', 'ac'],
  },
  {
    id: 'ex-15-multiple-nullable',
    name: 'Example 15: Multiple Nullable Non-terminals',
    difficulty: 'Advanced',
    category: 'Nullable Concatenation',
    description: 'Concatenation of two independently nullable variables deriving a*b*.',
    grammarText: `S -> AB\nA -> aA | ε\nB -> bB | ε`,
    tokenizationMode: 'single_char',
    sampleAcceptedTests: ['', 'a', 'b', 'ab', 'aa', 'bb', 'aabb'],
    sampleRejectedTests: ['ba', 'aba', 'bab'],
  },
];
