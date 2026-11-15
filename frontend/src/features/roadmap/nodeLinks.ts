import { resolveApiUrl } from '../../lib/apiClient'
import type { FeedItem } from '../zitouna/types'
import type {
  RoadmapLinkSuggestion,
  RoadmapLinkTarget,
  RoadmapNodeLink,
  RoadmapNodeType,
  RoadmapNodeVouch,
} from './types'

export const TARGET_LABELS: Record<RoadmapLinkTarget, string> = {
  FORUM: 'Forum',
  LEARNING_MATERIAL: 'Learning material',
  FAQ: 'FAQ',
  ROADMAP: 'Roadmap',
}

/** Only steps can be vouched for: the main topic and notes are not something a person did. */
export const acceptsVouches = (type: RoadmapNodeType): boolean => type !== 'ROOT' && type !== 'NOTE'

/** e.g. Forum: "Which criteria are examined?" (4) */
export function linkText(link: RoadmapNodeLink): string {
  if (link.kind === 'EXTERNAL' || !link.targetType) return link.label
  const title = link.targetType === 'FORUM' ? `“${link.label}”` : link.label
  const replies = link.targetType === 'FORUM' && link.replyCount != null ? ` (${link.replyCount})` : ''
  return `${TARGET_LABELS[link.targetType]}: ${title}${replies}`
}

/** Where a link leads; files and other websites open in a new tab. */
export function linkHref(link: RoadmapNodeLink): { href: string; newTab: boolean } {
  if (link.kind === 'EXTERNAL') return { href: link.url ?? '#', newTab: true }
  switch (link.targetType) {
    case 'FORUM':
      return { href: `#forum/${link.targetId}`, newTab: false }
    case 'ROADMAP':
      return { href: `#roadmaps/${link.targetId}`, newTab: false }
    case 'LEARNING_MATERIAL':
      return { href: resolveApiUrl(`/api/learning-materials/${link.targetId}/content`), newTab: true }
    case 'FAQ':
    default:
      return { href: '#zitouna/faq', newTab: false }
  }
}

export const isSameTarget = (
  link: RoadmapNodeLink,
  targetType: RoadmapLinkTarget,
  targetId: number,
): boolean => link.kind === 'INTERNAL' && link.targetType === targetType && link.targetId === targetId

export function suggestionToLink(suggestion: RoadmapLinkSuggestion): RoadmapNodeLink {
  return {
    kind: 'INTERNAL',
    targetType: suggestion.targetType,
    targetId: suggestion.targetId,
    url: null,
    label: suggestion.title,
    insideTag: true,
    available: true,
    replyCount: suggestion.replyCount,
  }
}

/** A search hit on Zitun, linked by hand; it is inside the tag only if the website suggested it too. */
export function feedItemToLink(item: FeedItem, insideTag: boolean): RoadmapNodeLink {
  return {
    kind: 'INTERNAL',
    targetType: item.area,
    targetId: item.id,
    url: null,
    label: item.title,
    insideTag,
    available: true,
    replyCount: null,
  }
}

/**
 * Accepts what people paste ("youtube.com/…" included) and returns a full http(s) address, or
 * null when it is not a web page. Other schemes are refused because they are not pages and could
 * run code when clicked.
 */
export function normaliseWebAddress(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(candidate)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname.includes('.')) return null
    return url.toString()
  } catch {
    return null
  }
}

export function externalLink(url: string, label: string): RoadmapNodeLink {
  return {
    kind: 'EXTERNAL',
    targetType: null,
    targetId: null,
    url,
    label: label.trim() || new URL(url).hostname,
    insideTag: false,
    available: true,
    replyCount: null,
  }
}

export function vouchText(vouch: RoadmapNodeVouch): string {
  return vouch.note ? `${vouch.personName} — ${vouch.note}` : vouch.personName
}
