import { useState, type ChangeEvent, type FormEvent } from 'react'

import {
  FORUM_POST_CONTENT_MAX_LENGTH,
  FORUM_POST_CONTENT_MIN_LENGTH,
  FORUM_POST_TITLE_MAX_LENGTH,
  FORUM_POST_TITLE_MIN_LENGTH,
  type ForumPostCreateDto,
  type ForumPostFormErrors,
} from '../types'

interface CreatePostFormProps {
  onCreate: (payload: ForumPostCreateDto) => Promise<void>
}

const initialFormState = {
  title: '',
  content: '',
  tagsText: '',
}

const validateForm = (state: typeof initialFormState): ForumPostFormErrors => {
  const errors: ForumPostFormErrors = {}
  const title = state.title.trim()
  const content = state.content.trim()

  if (title.length < FORUM_POST_TITLE_MIN_LENGTH) {
    errors.title = `Title must be at least ${FORUM_POST_TITLE_MIN_LENGTH} characters long.`
  } else if (title.length > FORUM_POST_TITLE_MAX_LENGTH) {
    errors.title = `Title must be at most ${FORUM_POST_TITLE_MAX_LENGTH} characters long.`
  }

  if (content.length < FORUM_POST_CONTENT_MIN_LENGTH) {
    errors.content = `Content must be at least ${FORUM_POST_CONTENT_MIN_LENGTH} characters long.`
  } else if (content.length > FORUM_POST_CONTENT_MAX_LENGTH) {
    errors.content = `Content must be at most ${FORUM_POST_CONTENT_MAX_LENGTH} characters long.`
  }

  return errors
}

const parseTags = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    ),
  )

export function CreatePostForm({ onCreate }: CreatePostFormProps) {
  const [formState, setFormState] = useState(initialFormState)
  const [fieldErrors, setFieldErrors] = useState<ForumPostFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (field: keyof typeof initialFormState) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateForm(formState)
    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const tags = parseTags(formState.tagsText)

      await onCreate({
        title: formState.title.trim(),
        content: formState.content.trim(),
        tags: tags.length > 0 ? tags : undefined,
      })

      setFormState(initialFormState)
      setFieldErrors({})
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create the post.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80"
      aria-labelledby="create-post-heading"
    >
      <div className="mb-5 space-y-1">
        <h2 id="create-post-heading" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
          Create post
        </h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Share a topic, ask a question, or start a conversation.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Title</span>
          <input
            type="text"
            value={formState.title}
            onChange={handleChange('title')}
            minLength={FORUM_POST_TITLE_MIN_LENGTH}
            maxLength={FORUM_POST_TITLE_MAX_LENGTH}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'forum-post-title-error' : undefined}
            placeholder="Title"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
          />
          {fieldErrors.title ? (
            <p className="text-sm text-rose-600 dark:text-rose-300" id="forum-post-title-error">
              {fieldErrors.title}
            </p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Content</span>
          <textarea
            value={formState.content}
            onChange={handleChange('content')}
            minLength={FORUM_POST_CONTENT_MIN_LENGTH}
            maxLength={FORUM_POST_CONTENT_MAX_LENGTH}
            rows={9}
            aria-invalid={Boolean(fieldErrors.content)}
            aria-describedby={fieldErrors.content ? 'forum-post-content-error' : undefined}
            placeholder="Write your post"
            className="min-h-44 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
          />
          {fieldErrors.content ? (
            <p className="text-sm text-rose-600 dark:text-rose-300" id="forum-post-content-error">
              {fieldErrors.content}
            </p>
          ) : null}
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">Tags</span>
          <input
            type="text"
            value={formState.tagsText}
            onChange={handleChange('tagsText')}
            placeholder="Tags"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-amber-400 dark:focus:ring-amber-500/20"
          />
        </label>

        {submitError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
            {submitError}
          </p>
        ) : null}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-full bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </section>
  )
}


