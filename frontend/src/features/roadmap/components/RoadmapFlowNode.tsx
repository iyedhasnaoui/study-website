import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import type { RoadmapNodeType } from '../types'

export interface RoadmapFlowNodeData extends Record<string, unknown> {
  dbId: number | null
  title: string
  description: string | null
  content: string | null
  nodeType: RoadmapNodeType
}

const TYPE_STYLES: Record<RoadmapNodeType, string> = {
  ROOT: 'bg-slate-900 text-white border-slate-900 dark:bg-amber-400 dark:text-slate-900 dark:border-amber-300',
  PRIMARY: 'bg-amber-300 text-slate-900 border-slate-900 dark:border-amber-200',
  SECONDARY: 'bg-amber-100 text-slate-900 border-slate-800 dark:bg-amber-200 dark:border-amber-300',
  OPTIONAL:
    'bg-white text-slate-700 border-dashed border-slate-400 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-600',
  NOTE: 'bg-transparent text-slate-500 border-transparent shadow-none dark:text-zinc-400',
}

export const NODE_TYPE_LABELS: Record<RoadmapNodeType, string> = {
  ROOT: 'Main topic',
  PRIMARY: 'Core step',
  SECONDARY: 'Sub step',
  OPTIONAL: 'Optional',
  NOTE: 'Note',
}

function RoadmapFlowNodeComponent({ data, selected }: NodeProps) {
  const { title, description, content, nodeType } = data as RoadmapFlowNodeData
  const isNote = nodeType === 'NOTE'
  const hasContent = Boolean(content && content.trim())

  return (
    <div
      className={[
        'relative rounded-lg border-2 px-4 py-2.5 text-center transition',
        isNote ? 'min-w-[140px]' : 'min-w-[170px] shadow-[3px_3px_0_0_rgba(15,23,42,0.85)]',
        TYPE_STYLES[nodeType] ?? TYPE_STYLES.PRIMARY,
        selected ? 'ring-2 ring-sky-500 ring-offset-2 ring-offset-transparent' : '',
      ].join(' ')}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="h-2.5! w-2.5! border-2! border-white! bg-slate-900! dark:border-zinc-900! dark:bg-amber-300!"
      />

      <p className={isNote ? 'text-xs italic' : 'text-sm font-bold leading-snug'}>{title}</p>

      {description ? (
        <p className="mt-0.5 text-[11px] font-medium opacity-70">{description}</p>
      ) : null}

      {hasContent && !isNote ? (
        <span
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[9px] font-bold text-white"
          title="This node has notes"
        >
          i
        </span>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! border-2! border-white! bg-slate-900! dark:border-zinc-900! dark:bg-amber-300!"
      />
    </div>
  )
}

export const RoadmapFlowNode = memo(RoadmapFlowNodeComponent)
