import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type OnBeforeDelete,
} from '@xyflow/react'

import { extractErrorMessage, saveRoadmapGraph } from '../api/roadmapApi'
import type { RoadmapGraphResponseDto, RoadmapGraphSaveDto, RoadmapNodeType } from '../types'
import { NODE_TYPE_LABELS, RoadmapFlowNode, type RoadmapFlowNodeData } from './RoadmapFlowNode'
import { RoadmapFloatingEdge } from './RoadmapFloatingEdge'
import { RoadmapNodeInspector } from './RoadmapNodeInspector'

import '@xyflow/react/dist/style.css'

type FlowNode = Node<RoadmapFlowNodeData>

const nodeTypes = { roadmapNode: RoadmapFlowNode }
const edgeTypes = { floating: RoadmapFloatingEdge }

const EDGE_DEFAULTS = {
  type: 'floating',
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: '#64748b' },
} as const

const nodeId = (dbId: number) => `n${dbId}`
const edgeId = (source: string, target: string) => `${source}->${target}`

function toFlowNodes(graph: RoadmapGraphResponseDto): FlowNode[] {
  return graph.nodes.map((node) => ({
    id: nodeId(node.id),
    type: 'roadmapNode',
    position: { x: node.positionX, y: node.positionY },
    data: {
      dbId: node.id,
      title: node.title,
      description: node.description,
      content: node.content,
      nodeType: node.nodeType,
    },
  }))
}

function toFlowEdges(graph: RoadmapGraphResponseDto): Edge[] {
  return graph.edges.map((edge) => ({
    ...EDGE_DEFAULTS,
    id: edgeId(nodeId(edge.sourceNodeId), nodeId(edge.targetNodeId)),
    source: nodeId(edge.sourceNodeId),
    target: nodeId(edge.targetNodeId),
  }))
}

interface RoadmapGraphEditorProps {
  roadmapId: number
  graph: RoadmapGraphResponseDto
  canEdit: boolean
  /** Deep-link target: selects and centres this node once the canvas has measured its nodes. */
  focusNodeId?: number | null
  onDirtyChange?: (dirty: boolean) => void
}

export function RoadmapGraphEditor(props: RoadmapGraphEditorProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvas {...props} />
    </ReactFlowProvider>
  )
}

function GraphCanvas({
  roadmapId,
  graph,
  canEdit,
  focusNodeId,
  onDirtyChange,
}: RoadmapGraphEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(toFlowNodes(graph))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(graph))
  const [selectedId, setSelectedId] = useState<string | null>(
    focusNodeId ? nodeId(focusNodeId) : null,
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const nextTempId = useRef(0)
  const canvasRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const applyGraph = useCallback(
    (next: RoadmapGraphResponseDto) => {
      setNodes(toFlowNodes(next))
      setEdges(toFlowEdges(next))
      setIsDirty(false)
    },
    [setEdges, setNodes],
  )

  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  useEffect(() => {
    if (!focusNodeId) return
    const target = nodeId(focusNodeId)
    setSelectedId(target)
    // Centring only works once React Flow has measured the nodes, which happens after first paint.
    const timer = window.setTimeout(
      () => void fitView({ nodes: [{ id: target }], duration: 400, maxZoom: 1.2 }),
      200,
    )
    return () => window.clearTimeout(timer)
  }, [fitView, focusNodeId])

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      onNodesChange(changes)
      // A drag emits many intermediate positions; only the final drop is a real change to persist.
      if (changes.some((change) => change.type === 'position' && change.dragging === false)) {
        setIsDirty(true)
      }
    },
    [onNodesChange],
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!canEdit || connection.source === connection.target) return

      const id = edgeId(connection.source, connection.target)
      if (edges.some((edge) => edge.id === id)) return

      setEdges((current) => addEdge({ ...connection, ...EDGE_DEFAULTS, id }, current))
      setIsDirty(true)
    },
    [canEdit, edges, setEdges],
  )

  const handleAddNode = useCallback(
    (type: RoadmapNodeType) => {
      const id = `tmp-${nextTempId.current++}`
      const bounds = canvasRef.current?.getBoundingClientRect()
      const position = screenToFlowPosition({
        x: (bounds?.left ?? 0) + (bounds?.width ?? 800) / 2,
        y: (bounds?.top ?? 0) + (bounds?.height ?? 600) / 2,
      })

      const node: FlowNode = {
        id,
        type: 'roadmapNode',
        position,
        data: {
          dbId: null,
          title: 'New step',
          description: null,
          content: null,
          nodeType: type,
        },
      }

      setNodes((current) => [...current, node])
      setSelectedId(id)
      setIsDirty(true)
    },
    [screenToFlowPosition, setNodes],
  )

  const patchSelectedNode = useCallback(
    (patch: Partial<RoadmapFlowNodeData>) => {
      if (!selectedId) return
      setNodes((current) =>
        current.map((node) =>
          node.id === selectedId ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      )
      setIsDirty(true)
    },
    [selectedId, setNodes],
  )

  const removeNode = useCallback(
    (id: string) => {
      setNodes((current) => current.filter((node) => node.id !== id))
      setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
      setSelectedId((current) => (current === id ? null : current))
      setIsDirty(true)
    },
    [setEdges, setNodes],
  )

  // The main node is the entry point of the roadmap, so the Delete key must not remove it.
  const handleBeforeDelete: OnBeforeDelete<FlowNode> = useCallback(
    async ({ nodes: deleted, edges: deletedEdges }) => {
      if (!canEdit) return false
      const removable = deleted.filter((node) => node.data.nodeType !== 'ROOT')
      if (removable.length === 0 && deletedEdges.length === 0) return false
      setIsDirty(true)
      return { nodes: removable, edges: deletedEdges }
    },
    [canEdit],
  )

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setError(null)

    const payload: RoadmapGraphSaveDto = {
      nodes: nodes.map((node) => ({
        id: node.data.dbId,
        ref: node.id,
        title: node.data.title.trim() || 'Untitled step',
        description: node.data.description,
        content: node.data.content,
        nodeType: node.data.nodeType,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
      })),
      edges: edges.map((edge) => ({ sourceRef: edge.source, targetRef: edge.target })),
    }

    try {
      applyGraph(await saveRoadmapGraph(roadmapId, payload))
      setSavedAt(new Date().toLocaleTimeString())
    } catch (saveError) {
      setError(extractErrorMessage(saveError, 'Unable to save the roadmap graph.'))
    } finally {
      setIsSaving(false)
    }
  }, [applyGraph, edges, nodes, roadmapId])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div
        ref={canvasRef}
        className="h-[640px] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <ReactFlow<FlowNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onBeforeDelete={handleBeforeDelete}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          connectionMode={ConnectionMode.Loose}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable
          deleteKeyCode={['Delete', 'Backspace']}
          minZoom={0.2}
          maxZoom={2.5}
          fitView
          colorMode="system"
          proOptions={{ hideAttribution: false }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="hidden! sm:block!" />

          {canEdit ? (
            <Panel
              position="top-left"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90"
            >
              {(['PRIMARY', 'SECONDARY', 'OPTIONAL', 'NOTE'] as RoadmapNodeType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAddNode(type)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-400 hover:text-amber-700 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-amber-500/60 dark:hover:text-amber-200"
                >
                  + {NODE_TYPE_LABELS[type]}
                </button>
              ))}

              <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-zinc-700" />

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !isDirty}
                className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving…' : isDirty ? 'Save graph' : 'Saved'}
              </button>
            </Panel>
          ) : null}

          <Panel
            position="bottom-center"
            className="rounded-full border border-gray-200 bg-white/90 px-3 py-1 text-[11px] text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90 dark:text-zinc-400"
          >
            {canEdit
              ? 'Drag from a node edge to connect · drag nodes to move · Delete removes selection'
              : 'Scroll to zoom · drag to pan · click a node to read its notes'}
          </Panel>
        </ReactFlow>
      </div>

      <div className="flex flex-col gap-3">
        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {canEdit ? (
          <div className="rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-xs text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-zinc-400">
            {isDirty
              ? 'Unsaved changes — press Save graph to store them.'
              : savedAt
                ? `All changes saved at ${savedAt}.`
                : 'Everything is saved.'}
          </div>
        ) : null}

        {selectedNode ? (
          <RoadmapNodeInspector
            node={selectedNode}
            canEdit={canEdit}
            onChange={patchSelectedNode}
            onDelete={() => removeNode(selectedNode.id)}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-400">
            Select a node to {canEdit ? 'edit it' : 'read its notes'}.
          </div>
        )}
      </div>
    </div>
  )
}
