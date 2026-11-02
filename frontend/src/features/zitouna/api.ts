import {apiClient} from '../../lib/apiClient'
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

export async function getLearningMaterials(params?: {
    includeMine?: boolean
    query?: string
    tagIds?: number[]
}): Promise<LearningMaterial[]> {
    const response = await apiClient.get<LearningMaterial[]>('/api/learning-materials', {
        params: {
            includeMine: params?.includeMine ?? false,
            q: params?.query && params.query.trim().length > 0 ? params.query.trim() : undefined,
            tagIds: params?.tagIds && params.tagIds.length > 0 ? params.tagIds.join(',') : undefined,
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

export async function getFaq(filters?: { query?: string; tagIds?: number[] }): Promise<FaqEntry[]> {
    const response = await apiClient.get<FaqEntry[]>('/api/faq', {
        params: {
            q: filters?.query || undefined,
            tagIds: filters?.tagIds?.length ? filters.tagIds.join(',') : undefined,
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