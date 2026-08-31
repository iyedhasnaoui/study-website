export const formatDateTime = (value: string | null): string => {
  if (!value) return 'Unknown'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}

export const countNodes = (nodes: { childSteps: unknown[] }[]): number => {
  const walk = (list: { childSteps: unknown[] }[]): number =>
    list.reduce((total, node) => total + 1 + walk(node.childSteps as { childSteps: unknown[] }[]), 0)

  return walk(nodes)
}