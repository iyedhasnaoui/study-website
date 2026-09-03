import { useState } from 'react'

import { createRoadmap } from '../api/roadmapApi'
import type { RoadmapCreateDto } from '../types'

interface CreateRoadmapFormProps {
  onCreated?: () => void
  onSuccessNavigate?: () => void
}

export function CreateRoadmapForm({ onCreated }: CreateRoadmapFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const payload: RoadmapCreateDto = {
      title: title.trim(),
      description: description.trim() || null,
    }

    if (!payload.title) {
      setError('Roadmap title cannot be empty.')
      return
    }

    setIsSaving(true)

    try {
      await createRoadmap(payload)
      setTitle('')
      setDescription('')
      onCreated?.()
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to create roadmap.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
        Create roadmap
      </h2>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Frontend Foundations"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-zinc-400">
            Description
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={6}
            placeholder="Describe the path and goals..."
            className="min-h-36 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
          />
        </label>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Creating…' : 'Create roadmap'}
        </button>
      </form>
    </section>
  )
}