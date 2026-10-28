import type { ModerationQueueItem } from '../types'

const labels: Record<string, string> = {
  description: 'Description', content: 'Content for review', type: 'Type', tags: 'Tags',
  reviewKind: 'Review', publishedTitle: 'Currently published title', publishedContent: 'Currently published content',
  grade: 'Grade', solutionApproach: 'Solution approach', method: 'Method',
  roadmap: 'Roadmap', filename: 'Filename',
}

export function ModerationDetails({ item }: { item: ModerationQueueItem }) {
  return (
    <>
      {item.submittedAt ? <p>Submitted: <time dateTime={item.submittedAt}>{item.submittedAt}</time></p> : null}
      <dl>
        {Object.entries(item.details).map(([key, value]) => {
          const text = Array.isArray(value) ? value.filter((entry) => typeof entry === 'string').join(', ')
            : typeof value === 'string' ? value : ''
          return text ? <div key={key}><dt className="font-semibold">{labels[key] ?? key}</dt>
            <dd className="whitespace-pre-wrap break-words">{text}</dd></div> : null
        })}
      </dl>
    </>
  )
}
