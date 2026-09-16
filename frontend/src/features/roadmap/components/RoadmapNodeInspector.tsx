import type { Node } from '@xyflow/react'

import { MarkdownViewer } from './MarkdownViewer'
import { NODE_TYPE_LABELS, type RoadmapFlowNodeData } from './RoadmapFlowNode'
import type { RoadmapNodeType } from '../types'

const EDITABLE_TYPES: RoadmapNodeType[] = ['PRIMARY', 'SECONDARY', 'OPTIONAL', 'NOTE']

interface RoadmapNodeInspectorProps {
  node: Node<RoadmapFlowNodeData>
  canEdit: boolean
  onChange: (patch: Partial<RoadmapFlowNodeData>) => void
  onDelete: () => void
  onClose: () => void
}

const fieldClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20'

export function RoadmapNodeInspector({
  node,
  canEdit,
  onChange,
  onDelete,
  onClose,
}: RoadmapNodeInspectorProps) {
  const isRoot = node.data.nodeType === 'ROOT'

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
            {NODE_TYPE_LABELS[node.data.nodeType]}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
            {node.data.dbId ? `Node #${node.data.dbId}` : 'Not saved yet'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Close
        </button>
      </div>

      {canEdit ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Title</span>
            <input
              value={node.data.title}
              onChange={(event) => onChange({ title: event.target.value })}
              className={fieldClass}
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              Subtitle <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              value={node.data.description ?? ''}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="e.g. 2 weeks, prerequisite…"
              className={fieldClass}
            />
          </label>

          {!isRoot ? (
            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">Category</span>
              <select
                value={node.data.nodeType}
                onChange={(event) => onChange({ nodeType: event.target.value as RoadmapNodeType })}
                className={fieldClass}
              >
                {EDITABLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {NODE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300">
              Notes <span className="font-normal text-slate-400">(markdown)</span>
            </span>
            <textarea
              value={node.data.content ?? ''}
              onChange={(event) => onChange({ content: event.target.value })}
              rows={10}
              placeholder="Resources, exercises, what to know before moving on…"
              className={`${fieldClass} min-h-44 resize-y`}
            />
          </label>

          <button
            type="button"
            onClick={onDelete}
            disabled={isRoot}
            title={isRoot ? 'The main node cannot be deleted' : undefined}
            className="w-full rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            Delete node
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
            {node.data.title}
          </h3>
          {node.data.description ? (
            <p className="text-sm text-slate-500 dark:text-zinc-400">{node.data.description}</p>
          ) : null}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            {node.data.content?.trim() ? (
              <MarkdownViewer content={node.data.content} />
            ) : (
              <p className="text-sm text-slate-400 dark:text-zinc-500">No notes for this step yet.</p>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
