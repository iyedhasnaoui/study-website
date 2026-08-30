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
    <section className="forum-panel forum-panel--form" aria-labelledby="create-post-heading">
      <h2 id="create-post-heading">Create post</h2>

      <form className="forum-form" onSubmit={handleSubmit} noValidate>
        <label className="forum-field">
          <input
            type="text"
            value={formState.title}
            onChange={handleChange('title')}
            aria-label="Title"
            minLength={FORUM_POST_TITLE_MIN_LENGTH}
            maxLength={FORUM_POST_TITLE_MAX_LENGTH}
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'forum-post-title-error' : undefined}
            placeholder="Title"
          />
          {fieldErrors.title ? (
            <p className="forum-field__error" id="forum-post-title-error">
              {fieldErrors.title}
            </p>
          ) : null}
        </label>

        <label className="forum-field">
          <textarea
            value={formState.content}
            onChange={handleChange('content')}
            aria-label="Content"
            minLength={FORUM_POST_CONTENT_MIN_LENGTH}
            maxLength={FORUM_POST_CONTENT_MAX_LENGTH}
            rows={9}
            aria-invalid={Boolean(fieldErrors.content)}
            aria-describedby={fieldErrors.content ? 'forum-post-content-error' : undefined}
            placeholder="Write your post"
          />
          {fieldErrors.content ? (
            <p className="forum-field__error" id="forum-post-content-error">
              {fieldErrors.content}
            </p>
          ) : null}
        </label>

        <label className="forum-field">
          <input
            type="text"
            value={formState.tagsText}
            onChange={handleChange('tagsText')}
            aria-label="Tags"
            placeholder="Tags"
          />
        </label>

        {submitError ? <p className="forum-form__error">{submitError}</p> : null}

        <div className="forum-form__actions">
          <button type="submit" className="forum-button" disabled={isSubmitting}>
            {isSubmitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </form>
    </section>
  )
}


