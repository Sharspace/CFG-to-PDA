/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CFG, PDA, PDATransition, SimulationResult, SimulationStep } from '../types/grammar';
import { isEpsilonSymbol } from './parser';

export interface SimulationOptions {
  maxExploredNodes?: number;
  maxStackDepth?: number;
  maxPathLength?: number;
}

interface SearchNode {
  id: string;
  parentId?: string;
  stepNumber: number;
  consumedTokens: string[];
  remainingInput: string[];
  stack: string[]; // stack[0] is top of stack
  transitionApplied?: PDATransition;
  actionDescription: string;
  path: SearchNode[];
  depth: number;
  pathFingerprints: Set<string>;
}

export function simulatePDA(
  pda: PDA,
  cfg: CFG,
  rawInput: string,
  options: SimulationOptions = {}
): SimulationResult {
  const maxExploredNodes = options.maxExploredNodes ?? 3500;
  const baseDepth = options.maxPathLength ?? 45;

  // 1. Tokenize input based on cfg tokenization mode
  const inputTokens = tokenizeInputString(rawInput, cfg);

  // Initial configuration
  // State: q0, Remaining input: inputTokens, Stack: [Z0] where Z0 = S
  const initialStack = [pda.initialStackSymbol];

  const rootNode: SearchNode = {
    id: 'node-0',
    stepNumber: 0,
    consumedTokens: [],
    remainingInput: [...inputTokens],
    stack: [...initialStack],
    actionDescription: `Initial configuration: State q₀, Input tape loaded with [${inputTokens.join(', ') || 'ε'}], Initial stack [${pda.initialStackSymbol}]`,
    path: [],
    depth: 0,
    pathFingerprints: new Set([makeFingerprint(inputTokens, initialStack)]),
  };
  rootNode.path = [rootNode];

  // Quick check for empty input on empty start?
  if (inputTokens.length === 0 && initialStack.length === 0) {
    return buildResult(true, 'Input string accepted by empty stack (trivially empty).', [convertToStep(rootNode, 'accepted')], inputTokens, rawInput, 1, 0, []);
  }

  // Pre-index transitions for fast lookup
  const nonTerminalTransitions = new Map<string, PDATransition[]>();
  const terminalTransitions = new Map<string, PDATransition>();

  for (const t of pda.transitions) {
    if (t.type === 'expansion') {
      const list = nonTerminalTransitions.get(t.stackTop) || [];
      list.push(t);
      nonTerminalTransitions.set(t.stackTop, list);
    } else if (t.type === 'matching') {
      terminalTransitions.set(t.stackTop, t);
    }
  }

  // Priority Queue / BFS Frontier
  // We prioritize nodes that have matched more input, or have reasonable stack size
  const queue: SearchNode[] = [rootNode];
  let nodesExplored = 0;
  let winningNode: SearchNode | null = null;
  let deepestNode: SearchNode = rootNode;
  let depthLimitReached = false;

  const maxStackLimit = Math.max(25, inputTokens.length * 4 + 15);

  while (queue.length > 0 && nodesExplored < maxExploredNodes) {
    // Sort or shift: prioritize nodes that matched more input (fewer remaining tokens)
    // To balance BFS with greedy matching, sort by remaining input length ascending
    if (queue.length > 1) {
      queue.sort((a, b) => {
        if (a.remainingInput.length !== b.remainingInput.length) {
          return a.remainingInput.length - b.remainingInput.length;
        }
        return a.stack.length - b.stack.length;
      });
    }

    const current = queue.shift()!;
    nodesExplored++;

    if (current.depth > deepestNode.depth) {
      deepestNode = current;
    }

    // Check acceptance condition: empty input AND empty stack
    if (current.remainingInput.length === 0 && current.stack.length === 0) {
      winningNode = current;
      break;
    }

    // If stack is empty but remaining input is not empty -> dead end
    if (current.stack.length === 0 && current.remainingInput.length > 0) {
      continue;
    }

    // Depth or stack length safeguard (prevent infinite left recursion loops)
    if (current.depth >= baseDepth || current.stack.length > maxStackLimit) {
      depthLimitReached = true;
      continue;
    }

    const topSymbol = current.stack[0];
    const restStack = current.stack.slice(1);

    // Case A: Top of stack is a Non-Terminal A ∈ V
    // Epsilon transitions δ(q0, ε, A) = (q0, α)
    if (nonTerminalTransitions.has(topSymbol)) {
      const expansions = nonTerminalTransitions.get(topSymbol)!;
      for (let i = 0; i < expansions.length; i++) {
        const trans = expansions[i];
        // Replacement is pushed onto stack: α = X1 ... Xk, X1 is top
        const newStack = [...trans.stackReplacement, ...restStack];
        const fingerprint = makeFingerprint(current.remainingInput, newStack);

        // Cycle check along current branch to prevent infinite recursion on identical configuration
        if (current.pathFingerprints.has(fingerprint)) {
          continue;
        }

        const newPathFingerprints = new Set(current.pathFingerprints);
        newPathFingerprints.add(fingerprint);

        const childNode: SearchNode = {
          id: `node-${nodesExplored}-${i}`,
          parentId: current.id,
          stepNumber: current.stepNumber + 1,
          consumedTokens: [...current.consumedTokens],
          remainingInput: [...current.remainingInput],
          stack: newStack,
          transitionApplied: trans,
          actionDescription: trans.rawReplacement === 'ε'
            ? `Applied ${trans.formalNotation}: Popped '${topSymbol}' via ε-production (erased).`
            : `Applied ${trans.formalNotation}: Replaced '${topSymbol}' with [${trans.stackReplacement.join(', ')}].`,
          path: [],
          depth: current.depth + 1,
          pathFingerprints: newPathFingerprints,
        };
        childNode.path = [...current.path, childNode];
        queue.push(childNode);
      }
    }
    // Case B: Top of stack is a Terminal a ∈ Σ
    // Terminal matching transition: δ(q0, a, a) = (q0, ε)
    else if (terminalTransitions.has(topSymbol)) {
      const trans = terminalTransitions.get(topSymbol)!;
      // Check if input head matches top of stack
      if (current.remainingInput.length > 0 && current.remainingInput[0] === topSymbol) {
        const nextRemaining = current.remainingInput.slice(1);
        const nextConsumed = [...current.consumedTokens, topSymbol];
        const fingerprint = makeFingerprint(nextRemaining, restStack);

        const newPathFingerprints = new Set(current.pathFingerprints);
        newPathFingerprints.add(fingerprint);

        const childNode: SearchNode = {
          id: `node-${nodesExplored}-match`,
          parentId: current.id,
          stepNumber: current.stepNumber + 1,
          consumedTokens: nextConsumed,
          remainingInput: nextRemaining,
          stack: restStack,
          transitionApplied: trans,
          actionDescription: `Matched terminal '${topSymbol}' from input tape with stack top. Consumed '${topSymbol}' and popped from stack.`,
          path: [],
          depth: current.depth + 1,
          pathFingerprints: newPathFingerprints,
        };
        childNode.path = [...current.path, childNode];
        queue.push(childNode);
      } else {
        // Mismatch between stack terminal and input terminal -> dead end for this branch
        // No transitions possible
      }
    }
  }

  if (winningNode) {
    const steps = winningNode.path.map((n, idx) => {
      const isLast = idx === winningNode!.path.length - 1;
      return convertToStep(n, isLast ? 'accepted' : 'active');
    });

    const derivation = buildDerivationSequence(steps);

    return buildResult(
      true,
      `SUCCESS: Input string is ACCEPTED by the Single-State PDA with empty stack in ${steps.length - 1} transitions.`,
      steps,
      inputTokens,
      rawInput,
      nodesExplored,
      Math.max(...steps.map(s => s.stack.length)),
      derivation
    );
  }

  // Not accepted
  const longestTrace = deepestNode.path.map((n, idx) => {
    const isLast = idx === deepestNode.path.length - 1;
    return convertToStep(n, isLast ? (depthLimitReached ? 'depth_exceeded' : 'dead_end') : 'active');
  });

  const failureReason = depthLimitReached
    ? `REJECTED (or Search Bound Reached): Explored ${nodesExplored} configurations up to depth limit without finding an accepting sequence of transitions.`
    : `REJECTED: No valid nondeterministic sequence of transitions leads to an empty stack with the entire input consumed (explored ${nodesExplored} configurations).`;

  return buildResult(
    false,
    failureReason,
    longestTrace,
    inputTokens,
    rawInput,
    nodesExplored,
    Math.max(...longestTrace.map(s => s.stack.length), 0),
    [],
    depthLimitReached
  );
}

function makeFingerprint(remaining: string[], stack: string[]): string {
  return `${remaining.join('|')}::${stack.join('|')}`;
}

export function tokenizeInputString(rawInput: string, cfg: CFG): string[] {
  const trimmed = rawInput.trim();
  if (!trimmed || isEpsilonSymbol(trimmed)) {
    return [];
  }

  // If user explicitly provided whitespace separated tokens (or quotes)
  if (trimmed.includes(' ') || trimmed.includes('"') || trimmed.includes("'")) {
    const regex = /"([^"]+)"|'([^']+)'|(\S+)/g;
    const tokens: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(trimmed)) !== null) {
      const t = match[1] ?? match[2] ?? match[3];
      if (t) tokens.push(t);
    }
    return tokens;
  }

  // Continuous string without spaces:
  // If all terminals in Σ are single character, split characters
  const allTerminalsSingleChar = cfg.terminals.length > 0 && cfg.terminals.every(t => t.length === 1);
  if (allTerminalsSingleChar || cfg.tokenizationMode === 'single_char') {
    return trimmed.split('');
  }

  // Maximal-munch matching against declared terminals
  const sortedTerminals = [...cfg.terminals].sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let pos = 0;
  while (pos < trimmed.length) {
    let matched = false;
    for (const term of sortedTerminals) {
      if (trimmed.startsWith(term, pos)) {
        tokens.push(term);
        pos += term.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Single character fallback
      tokens.push(trimmed[pos]);
      pos++;
    }
  }
  return tokens;
}

function convertToStep(node: SearchNode, status: SimulationStep['status']): SimulationStep {
  return {
    id: node.id,
    stepNumber: node.stepNumber,
    state: 'q0',
    remainingInput: node.remainingInput,
    stack: node.stack,
    transitionApplied: node.transitionApplied,
    actionDescription: node.actionDescription,
    parentStepId: node.parentId,
    status,
    derivationSnapshot: [...node.consumedTokens, ...node.stack],
  };
}

function buildDerivationSequence(steps: SimulationStep[]): string[] {
  const sequence: string[] = [];
  for (const step of steps) {
    if (step.derivationSnapshot && step.derivationSnapshot.length > 0) {
      const form = step.derivationSnapshot.join(' ');
      if (sequence.length === 0 || sequence[sequence.length - 1] !== form) {
        sequence.push(form);
      }
    }
  }
  return sequence;
}

function buildResult(
  isAccepted: boolean,
  verdictMessage: string,
  executionPath: SimulationStep[],
  inputTokens: string[],
  rawInput: string,
  totalStepsExplored: number,
  maxStackDepth: number,
  derivationSequence: string[],
  depthLimitReached: boolean = false
): SimulationResult {
  return {
    inputString: rawInput,
    inputTokens,
    isAccepted,
    verdictMessage,
    executionPath,
    totalStepsExplored,
    maxStackDepth,
    derivationSequence,
    allBranchesCount: totalStepsExplored,
    depthLimitReached,
  };
}
