import {apiClient} from '../../lib/apiClient'
import type {
    FaqEntry,
    FeedArea,
    FeedItem,
    LearningMaterial,
    ModerationQueueItem,
    TagField,
    TagCreatePayload,
    TagTypeDefinition,
    TagTypePayload,
    ZitounaTag,
} from './types'

export const TAGS_UPDATED_EVENT = 'study-website:tags-updated'

export function notifyTagsUpdated(): void {
    window.dispatchEvent(new Event(TAGS_UPDATED_EVENT))
}

export async function getTags(field?: TagField): Promise<ZitounaTag[]> {
    const response = await apiClient.get<ZitounaTag[]>('/api/tags', {params: field ? {field} : undefined})
    return response.data
}

export async function getTagTypes(): Promise<TagTypeDefinition[]> {
    const response = await apiClient.get<TagTypeDefinition[]>('/api/tag-types')
    return response.data
}


export interface PaginatedResponse<T> {
    content: T[]
    page: number
    size: number
    total: number
    totalPages: number
}

export async function getZitounaFeed(filters: {
    query?: string
    areas?: FeedArea[]
    tagIds?: number[]
    page?: number
    size?: number
}): Promise<FeedItem[] | PaginatedResponse<FeedItem>> {
    const response = await apiClient.get<FeedItem[] | PaginatedResponse<FeedItem>>('/api/zitouna/feed', {
        params: {
            q: filters.query || undefined,
            areas: filters.areas?.length ? filters.areas.join(',') : undefined,
            tagIds: filters.tagIds?.length ? filters.tagIds.join(',') : undefined,
            page: filters.page ?? undefined,
            size: filters.size ?? undefined,
        },
    })
    return response.data
}

export async function getLearningMaterials(params?: {
    includeMine?: boolean
    query?: string
    tagIds?: number[]
    page?: number
    size?: number
}): Promise<LearningMaterial[] | PaginatedResponse<LearningMaterial>> {
    const response = await apiClient.get<LearningMaterial[] | PaginatedResponse<LearningMaterial>>('/api/learning-materials', {
        params: {
            includeMine: params?.includeMine ?? false,
            q: params?.query && params.query.trim().length > 0 ? params.query.trim() : undefined,
            tagIds: params?.tagIds && params.tagIds.length > 0 ? params.tagIds.join(',') : undefined,
            page: params?.page ?? undefined,
            size: params?.size ?? undefined,
        },
    })
    return response.data
}

export async function deleteLearningMaterial(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/learning-materials/${id}`)
}

export async function submitLearningMaterial(
    payload: {
        title: string
        description?: string
        type: string
        gradeNote?: string
        solutionApproach?: string
        methodUsed?: string
        roadmapFollowed?: string
        tags?: {
            homeInstitutionId?: number | null
            partnerInstitutionId?: number | null
            institutionIds?: number[]
            programIds?: number[]
            topicIds?: number[]
            subtopicIds?: number[]
            proposals?: { name: string; field: TagField; parentId?: number | null }[]
        }
    },
    file: File,
): Promise<LearningMaterial> {
    const formData = new FormData()
    formData.append('file', file)

    // Construct JSON object matching ZitounaDtos.LearningMaterialRequest
    const materialPayload = {
        title: payload.title,
        description: payload.description || '',
        type: payload.type,
        gradeNote: payload.gradeNote || '',
        solutionApproach: payload.solutionApproach || '',
        methodUsed: payload.methodUsed || '',
        roadmapFollowed: payload.roadmapFollowed || '',
        tags: {
            homeInstitutionId: payload.tags?.homeInstitutionId ?? null,
            partnerInstitutionId: payload.tags?.partnerInstitutionId ?? null,
            institutionIds: payload.tags?.institutionIds ?? [],
            programIds: payload.tags?.programIds ?? [],
            topicIds: payload.tags?.topicIds ?? [],
            subtopicIds: payload.tags?.subtopicIds ?? [],
            proposals: payload.tags?.proposals ?? [],
        },
    }

    formData.append(
        'payload',
        new Blob([JSON.stringify(materialPayload)], { type: 'application/json' }),
    )

    const response = await apiClient.post<LearningMaterial>('/api/learning-materials', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })

    return response.data
}

export async function getFaq(filters?: {
    query?: string
    tagIds?: number[]
    page?: number
    size?: number
}): Promise<FaqEntry[] | PaginatedResponse<FaqEntry>> {
    const response = await apiClient.get<FaqEntry[] | PaginatedResponse<FaqEntry>>('/api/faq', {
        params: {
            q: filters?.query || undefined,
            tagIds: filters?.tagIds?.length ? filters.tagIds.join(',') : undefined,
            page: filters?.page ?? undefined,
            size: filters?.size ?? undefined,
        },
    })
    return response.data
}

export async function createFaq(payload: {
    question: string;
    answer: string;
    published: boolean;
    tagIds?: number[]
}): Promise<FaqEntry> {
    const response = await apiClient.post<FaqEntry>('/api/admin/faq', payload)
    return response.data
}

// Omit the 'tags' array from the Partial payload and replace it with an optional 'tagIds' array
export async function updateFaq(id: number, payload: Partial<Omit<FaqEntry, 'tags'> & {
    tagIds: number[]
}>): Promise<FaqEntry> {
    const response = await apiClient.patch<FaqEntry>(`/api/admin/faq/${id}`, payload)
    return response.data
}

export async function deleteFaq(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/faq/${id}`)
}

export async function createTagType(payload: TagTypePayload): Promise<TagTypeDefinition> {
    const response = await apiClient.post<TagTypeDefinition>('/api/admin/tag-types', payload)
    return response.data
}

export async function createTag(payload: TagCreatePayload): Promise<ZitounaTag> {
    const response = await apiClient.post<ZitounaTag>('/api/admin/tags', payload)
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
    await apiClient.post(`/api/admin/moderation/${item.area}/${item.id}/${decision}`, {note, version: item.details?.version})
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
        await apiClient.post(`/api/admin/tags/${tag.id}/approve`, {typeId, aliases: tag.aliases})
    } else {
        await apiClient.post(`/api/admin/tags/${tag.id}/reject`, {note: 'Not part of the approved taxonomy'})
    }
}