import Markdown from 'react-markdown'

interface MarkdownViewerProps {
    content: string
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
    return (
        <div className="prose prose-slate max-w-none prose-headings:tracking-tight dark:prose-invert">
            <Markdown>{content}</Markdown>
        </div>
    )
}