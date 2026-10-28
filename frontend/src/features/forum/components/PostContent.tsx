import { useId, useState } from 'react'

const PREVIEW_LENGTH = 600

export function PostContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false)
  const contentId = useId()
  const isLong = content.length > PREVIEW_LENGTH

  if (!content) return null

  return (
    <div className="mt-5 min-w-0">
      <p id={contentId} className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700 dark:text-zinc-300">
        {isLong && !expanded ? `${content.slice(0, PREVIEW_LENGTH).trimEnd()}…` : content}
      </p>
      {isLong ? (
        <button type="button" aria-expanded={expanded} aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 text-sm font-semibold text-amber-700 underline dark:text-amber-200">
          {expanded ? 'Show less' : 'Read more'}
        </button>
      ) : null}
    </div>
  )
}
