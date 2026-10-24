import type { Edge, Node } from '@xyflow/react'

import type { RoadmapFlowNodeData } from './components/RoadmapFlowNode'

export const MIN_NODES = 3
export const SPLIT_SUGGESTION_NODES = 20
export const MAX_NODES = 25

type FlowNode = Node<RoadmapFlowNodeData>

export interface GraphCheck {
  errors: string[]
  advisories: string[]
}

const quote = (nodes: FlowNode[], ids: Set<string>): string =>
  nodes
    .filter((node) => ids.has(node.id))
    .map((node) => `"${node.data.title || 'Untitled'}"`)
    .join(', ')

/**
 * Mirrors the structural rules the backend enforces on save, so the editor can explain a
 * problem while it is still fixable instead of after a rejected request.
 */
export function checkGraph(nodes: FlowNode[], edges: Edge[]): GraphCheck {
  const errors: string[] = []
  const advisories: string[] = []

  if (nodes.length < MIN_NODES) {
    errors.push(`A roadmap needs at least ${MIN_NODES} nodes; this one has ${nodes.length}.`)
  }
  if (nodes.length > MAX_NODES) {
    errors.push(
      `A roadmap can hold at most ${MAX_NODES} nodes; this one has ${nodes.length}. ` +
        `Turn a branch into its own roadmap to make room.`,
    )
  }

  const roots = nodes.filter((node) => node.data.nodeType === 'ROOT')
  if (roots.length !== 1) {
    errors.push('A roadmap must have exactly one main node.')
    return { errors, advisories }
  }

  const outgoing = new Map<string, string[]>()
  const seenPairs = new Set<string>()
  for (const edge of edges) {
    const pair = `${edge.source}\u0000${edge.target}`
    if (seenPairs.has(pair)) continue
    seenPairs.add(pair)
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }

  const reachable = new Set<string>([roots[0].id])
  const queue = [roots[0].id]
  while (queue.length > 0) {
    for (const next of outgoing.get(queue.shift() as string) ?? []) {
      if (!reachable.has(next)) {
        reachable.add(next)
        queue.push(next)
      }
    }
  }

  const unreachable = new Set(nodes.filter((node) => !reachable.has(node.id)).map((n) => n.id))
  if (unreachable.size > 0) {
    errors.push(
      `Every node must be reachable from the main topic. Not connected: ${quote(nodes, unreachable)}.`,
    )
  }

  // Kahn's algorithm: whatever never reaches in-degree zero is sitting on a cycle.
  const inDegree = new Map<string, number>(nodes.map((node) => [node.id, 0]))
  for (const pair of seenPairs) {
    const target = pair.split('\u0000')[1]
    if (inDegree.has(target)) inDegree.set(target, (inDegree.get(target) as number) + 1)
  }

  const ready = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id)
  let settled = 0
  while (ready.length > 0) {
    settled++
    for (const next of outgoing.get(ready.shift() as string) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, remaining)
      if (remaining === 0) ready.push(next)
    }
  }

  if (settled !== nodes.length) {
    const looping = new Set(
      nodes.filter((node) => (inDegree.get(node.id) ?? 0) > 0).map((node) => node.id),
    )
    errors.push(
      `A roadmap must not contain a loop. These steps lead back into each other: ${quote(nodes, looping)}.`,
    )
  }

  const ungated = new Set(
    nodes
      .filter((node) => (outgoing.get(node.id)?.length ?? 0) > 1 && !node.data.gate)
      .map((node) => node.id),
  )
  if (ungated.size > 0) {
    errors.push(
      `A step may only lead to several next steps when it is marked as a gate. ` +
        `Mark as a gate or remove connections: ${quote(nodes, ungated)}.`,
    )
  }

  if (nodes.length >= SPLIT_SUGGESTION_NODES && nodes.length <= MAX_NODES) {
    advisories.push(
      `This roadmap has ${nodes.length} of ${MAX_NODES} nodes. ` +
        `Consider turning a branch into its own roadmap to keep it readable.`,
    )
  }

  return { errors, advisories }
}

/** Nodes reachable only through {@code nodeId} — what an extraction would move out. */
export function exclusiveBranchSize(nodes: FlowNode[], edges: Edge[], nodeId: string): number {
  const root = nodes.find((node) => node.data.nodeType === 'ROOT')
  if (!root) return 0

  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
  }

  const walk = (from: string, blocked: string | null): Set<string> => {
    const seen = new Set<string>()
    if (from === blocked) return seen
    seen.add(from)
    const queue = [from]
    while (queue.length > 0) {
      for (const next of outgoing.get(queue.shift() as string) ?? []) {
        if (next !== blocked && !seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    return seen
  }

  const below = walk(nodeId, null)
  below.delete(nodeId)
  const withoutNode = walk(root.id, nodeId)

  return [...below].filter((id) => !withoutNode.has(id)).length
}
