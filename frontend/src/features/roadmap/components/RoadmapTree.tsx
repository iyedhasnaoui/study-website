import { useMemo } from 'react'
import { Background, ReactFlow, type Edge, type Node } from '@xyflow/react'

import type { RoadmapNodeResponseDto } from '../types'

import '@xyflow/react/dist/style.css'

interface RoadmapTreeProps {
  nodes: RoadmapNodeResponseDto[]
  onNodeClick?: (nodeId: number) => void
}

const NODE_WIDTH = 260
const NODE_HEIGHT = 84
const X_GAP = 90
const Y_GAP = 42

type Positioned = {
  id: number
  depth: number
  x: number
  y: number
}

function layoutTree(nodes: RoadmapNodeResponseDto[]): { positioned: Positioned[]; edges: Edge[] } {
  const positioned: Positioned[] = []
  const edges: Edge[] = []

  const walk = (node: RoadmapNodeResponseDto, depth: number, xOffset: number): number => {
    const children = node.childSteps ?? []

    if (children.length === 0) {
      positioned.push({
        id: node.id,
        depth,
        x: xOffset,
        y: depth * (NODE_HEIGHT + Y_GAP),
      })
      return xOffset + NODE_WIDTH + X_GAP
    }

    let currentX = xOffset
    const childCenters: number[] = []

    for (const child of children) {
      const nextX = walk(child, depth + 1, currentX)
      childCenters.push(currentX + NODE_WIDTH / 2)
      currentX = nextX
    }

    const centerX = childCenters.reduce((sum, value) => sum + value, 0) / childCenters.length

    positioned.push({
      id: node.id,
      depth,
      x: centerX - NODE_WIDTH / 2,
      y: depth * (NODE_HEIGHT + Y_GAP),
    })

    for (const child of children) {
      edges.push({
        id: `${node.id}-${child.id}`,
        source: String(node.id),
        target: String(child.id),
        animated: false,
      })
    }

    return currentX
  }

  let offset = 0
  for (const root of nodes) {
    offset = walk(root, 0, offset) + X_GAP
  }

  return { positioned, edges }
}

function flatten(nodes: RoadmapNodeResponseDto[]): RoadmapNodeResponseDto[] {
  const result: RoadmapNodeResponseDto[] = []
  const walk = (node: RoadmapNodeResponseDto) => {
    result.push(node)
    node.childSteps.forEach(walk)
  }
  nodes.forEach(walk)
  return result
}

export function RoadmapTree({ nodes, onNodeClick }: RoadmapTreeProps) {
  const { positioned, edges } = useMemo(() => layoutTree(nodes), [nodes])
  const flat = useMemo(() => flatten(nodes), [nodes])

  const flowNodes: Node[] = useMemo(
      () =>
          positioned.map((item) => {
            const node = flat.find((entry) => entry.id === item.id)
            return {
              id: String(item.id),
              position: { x: item.x, y: item.y },
              data: { label: node?.title ?? 'Untitled' },
              className: 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 rounded-2xl shadow-sm',
              style: {
                width: NODE_WIDTH,
                padding: '20px 10px',
                fontSize: 14,
                fontWeight: 600,
              },
            }
          }),
      [flat, positioned],
  )

  return (
      <div className="h-[720px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white/95 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <ReactFlow
            nodes={flowNodes}
            edges={edges}
            fitView
            colorMode="system"
            onNodeClick={(_, node) => onNodeClick?.(Number(node.id))}
        >
          <Background />
        </ReactFlow>
      </div>
  )
}