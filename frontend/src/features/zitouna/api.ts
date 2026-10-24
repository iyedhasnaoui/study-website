import { apiClient } from '../../lib/apiClient'
import type {
  FaqEntry,
  FeedArea,
  FeedItem,
  LearningMaterial,
  ModerationQueueItem,
  TagField,
  TagTypeDefinition,
  TagTypePayload,
  ZitounaTag,
} from './types'

export async function getTags(field?: TagField): Promise<ZitounaTag[]> {
  const response = await apiClient.get<ZitounaTag[]>('/api/tags', { params: field ? { field } : undefined })
  return response.data
}

export async function getTagTypes(): Promise<TagTypeDefinition[]> {
  const response = await apiClient.get<TagTypeDefinition[]>('/api/tag-types')
  return response.data
}

export async function proposeTag(payload: { name: string; field: TagField; parentId?: number }): Promise<ZitounaTag> {
  const response = await apiClient.post<ZitounaTag>('/api/tags/proposals', payload)
  return response.data
}

export async function getZitounaFeed(filters: {
  query?: string
  areas?: FeedArea[]
  tagIds?: number[]
}): Promise<FeedItem[]> {
  const response = await apiClient.get<FeedItem[]>('/api/zitouna/feed', {
    params: {
      q: filters.query || undefined,
      areas: filters.areas?.length ? filters.areas.join(',') : undefined,
      tagIds: filters.tagIds?.length ? filters.tagIds.join(',') : undefined,
    },
  })
  return response.data
}

export async function getLearningMaterials(includeMine = false): Promise<LearningMaterial[]> {
  const response = await apiClient.get<LearningMaterial[]>('/api/learning-materials', { params: { includeMine } })
  return response.data
}

export async function submitLearningMaterial(
  payload: Record<string, unknown>,
  file: File,
): Promise<LearningMaterial> {
  const data = new FormData()
  data.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  data.append('file', file, file.name)
  const response = await apiClient.post<LearningMaterial>('/api/learning-materials', data)
  return response.data
}

export async function getFaq(): Promise<FaqEntry[]> {
  const response = await apiClient.get<FaqEntry[]>('/api/faq')
  return response.data
}

export async function createFaq(payload: { question: string; answer: string; published: boolean }): Promise<FaqEntry> {
  const response = await apiClient.post<FaqEntry>('/api/admin/faq', payload)
  return response.data
}

export async function createTagType(payload: TagTypePayload): Promise<TagTypeDefinition> {
  const response = await apiClient.post<TagTypeDefinition>('/api/admin/tag-types', payload)
  return response.data
}

export async function getModerationQueue(): Promise<ModerationQueueItem[]> {
  const response = await apiClient.get<ModerationQueueItem[]>('/api/admin/moderation')
  return response.data
}

export async function moderate(
  item: ModerationQueueItem,
  decision: 'approve' | 'reject' | 'needs-fixing',
  note = '',
): Promise<void> {
  await apiClient.post(`/api/admin/moderation/${item.area}/${item.id}/${decision}`, { note })
}

export async function getTagProposals(): Promise<ZitounaTag[]> {
  const response = await apiClient.get<ZitounaTag[]>('/api/admin/tags/proposals')
  return response.data
}

export async function decideTag(
  tag: ZitounaTag,
  decision: 'approve' | 'reject',
  typeId?: number,
): Promise<void> {
  if (decision === 'approve') {
    await apiClient.post(`/api/admin/tags/${tag.id}/approve`, { typeId, aliases: tag.aliases })
  } else {
    await apiClient.post(`/api/admin/tags/${tag.id}/reject`, { note: 'Not part of the approved taxonomy' })
  }
}
