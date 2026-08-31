import {useEffect, useMemo, useState} from 'react'

import {deleteRoadmapNode, getRoadmapNode, updateRoadmapNode, createRoadmapNode} from './api/roadmapApi'
import {MarkdownViewer} from './components/MarkdownViewer'
import type {RoadmapNodeResponseDto, RoadmapNodeUpdateDto} from './types'

interface RoadmapNodeDetailPageProps {
    roadmapId: number
    nodeId: number
    onBack: () => void
    onUpdated?: (node: RoadmapNodeResponseDto) => void
    onDeleted?: (nodeId: number) => void
}

export function RoadmapNodeDetailPage({
                                          roadmapId,
                                          nodeId,
                                          onBack,
                                          onUpdated,
                                          onDeleted,
                                      }: RoadmapNodeDetailPageProps) {
    const [node, setNode] = useState<RoadmapNodeResponseDto | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [draft, setDraft] = useState<RoadmapNodeUpdateDto>({
        title: '',
        content: '',
        parentStepId: null,
        orderIndex: null,
    })

    useEffect(() => {
        let mounted = true

        const load = async () => {
            setIsLoading(true)
            setLoadError(null)
            try {
                const data = await getRoadmapNode(roadmapId, nodeId)
                if (!mounted) return
                setNode(data)
                setDraft({
                    title: data.title,
                    content: data.content,
                    parentStepId: data.parentStepId,
                    orderIndex: data.orderIndex,
                })
            } catch (error) {
                if (!mounted) return
                setLoadError(error instanceof Error ? error.message : 'Unable to load roadmap node.')
            } finally {
                if (mounted) setIsLoading(false)
            }
        }

        void load()

        return () => {
            mounted = false
        }
    }, [nodeId, roadmapId])

    const parentLabel = useMemo(() => {
        if (!node?.parentStepId) return 'Root node'
        return `Parent #${node.parentStepId}`
    }, [node?.parentStepId])

    const handleSave = async () => {
        if (!node) return

        const nextTitle = draft.title?.trim() ?? ''
        const nextContent = draft.content?.trim() ?? ''

        if (!nextTitle) {
            setSaveError('Node title cannot be empty.')
            return
        }

        if (!nextContent) {
            setSaveError('Node content cannot be empty.')
            return
        }

        setIsSaving(true)
        setSaveError(null)

        try {
            const saved = await updateRoadmapNode(roadmapId, nodeId, {
                title: nextTitle,
                content: nextContent,
                parentStepId: draft.parentStepId ?? null,
                orderIndex: draft.orderIndex ?? null,
            })
            setNode(saved)
            onUpdated?.(saved)
            setIsEditing(false)
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Unable to update node.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)
        setSaveError(null)
        try {
            await deleteRoadmapNode(roadmapId, nodeId)
            onDeleted?.(nodeId)
            onBack()
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Unable to delete node.')
        } finally {
            setIsDeleting(false)
        }
    }

    const handleAddChildNode = async () => {
        try {
            const childNode = await createRoadmapNode(roadmapId, {
                title: 'New Child Node',
                content: 'Add content here...',
                parentStepId: nodeId
            })
            window.location.hash = `#roadmaps/${roadmapId}/nodes/${childNode.id}`
        } catch (e) {
            console.error('Failed to create child node', e)
        }
    }

    if (isLoading) {
        return (
            <div
                className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/60 dark:text-zinc-400">
                Loading node…
            </div>
        )
    }

    if (loadError || !node) {
        return (
            <div className="space-y-4">
                <div
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                    {loadError ?? 'Node not found.'}
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                    Back
                </button>
            </div>
        )
    }

    return (
        <article
            className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-600 dark:text-violet-300">
                        Roadmap node
                    </p>
                    {isEditing ? (
                        <div className="space-y-3">
                            <input
                                value={draft.title ?? ''}
                                onChange={(event) => setDraft((current) => ({...current, title: event.target.value}))}
                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
                            />
                            <textarea
                                value={draft.content ?? ''}
                                onChange={(event) => setDraft((current) => ({...current, content: event.target.value}))}
                                rows={12}
                                className="min-h-52 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-500/20"
                            />
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSaving ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                                {node.title}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-zinc-400">{parentLabel}</p>
                        </>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
                    >
                        Back
                    </button>
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-violet-300 hover:text-violet-700 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
                        >
                            Edit
                        </button>
                    ) : null}
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/70 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    >
                        {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>

            {saveError ? (
                <div
                    className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
                    {saveError}
                </div>
            ) : null}

            {!isEditing ? (
                <>
                    <div
                        className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <MarkdownViewer content={node.content}/>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-zinc-400">
                        <span>Order: {node.orderIndex ?? '—'}</span>
                        <span>Node ID: #{node.id}</span>
                        <span>Roadmap ID: #{node.roadmapId}</span>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
                        >
                            Edit node
                        </button>
                        <button
                            type="button"
                            onClick={handleAddChildNode}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                        >
                            + Add child node
                        </button>
                    </div>
                </>
            ) : null}
        </article>
    )
}