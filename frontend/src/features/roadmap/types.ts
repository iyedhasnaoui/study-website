import type {TagItem, TagProposalItem} from "../../components/TagAutocomplete"

export type RoadmapNodeType = 'ROOT' | 'PRIMARY' | 'SECONDARY' | 'OPTIONAL' | 'NOTE'

/** INTERNAL points at content on Zitun, EXTERNAL at a page somewhere else on the web. */
export type RoadmapLinkKind = 'INTERNAL' | 'EXTERNAL'
export type RoadmapLinkTarget = 'FORUM' | 'LEARNING_MATERIAL' | 'FAQ' | 'ROADMAP'
export type VouchStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_FIXING'

export interface RoadmapNodeLink {
    id?: number | null
    kind: RoadmapLinkKind
    targetType: RoadmapLinkTarget | null
    targetId: number | null
    url: string | null
    /** The target's current title, or the page title of an external link. */
    label: string
    /** Zitun content carrying every tag of the roadmap. */
    insideTag: boolean
    /** False once the target was deleted or unpublished; readers never receive such links. */
    available: boolean
    replyCount: number | null
}

/** A person who actually did a step. Readers only ever receive accepted ones. */
export interface RoadmapNodeVouch {
    id: number | null
    personName: string
    note: string | null
    status: VouchStatus
}

/** Published content with the roadmap's tags, offered for linking. */
export interface RoadmapLinkSuggestion {
    targetType: RoadmapLinkTarget
    targetId: number
    title: string
    replyCount: number | null
}

export interface RoadmapNodeResponseDto {
    id: number
    roadmapId: number | null
    title: string
    description: string | null
    content: string | null
    nodeType: RoadmapNodeType
    positionX: number
    positionY: number
    gate: boolean
    linkedRoadmapId: number | null
    /** Filled when the whole graph is read. */
    links?: RoadmapNodeLink[]
    vouches?: RoadmapNodeVouch[]
}

export interface RoadmapEdgeResponseDto {
    id: number
    roadmapId: number | null
    sourceNodeId: number
    targetNodeId: number
}

export interface RoadmapResponseDto {
    id: number
    authorId: number | null
    authorUsername: string | null
    title: string
    description: string
    createdAt: string | null
    updatedAt: string | null
    moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_FIXING' | null
    moderationNote?: string | null
    nodes: RoadmapNodeResponseDto[]
    edges: RoadmapEdgeResponseDto[]
    tags: string[]
}

export interface RoadmapGraphResponseDto {
    roadmapId: number
    title: string
    description: string | null
    authorId: number | null
    authorUsername: string | null
    createdAt: string | null
    updatedAt: string | null
    nodes: RoadmapNodeResponseDto[]
    edges: RoadmapEdgeResponseDto[]
    moderationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_FIXING' | null
    moderationNote?: string | null
    advisories: string[]
    tags: string[]
}

export interface RoadmapGraphSaveDto {
    nodes: {
        id?: number | null
        ref: string
        title: string
        description?: string | null
        content?: string | null
        nodeType: RoadmapNodeType
        positionX: number
        positionY: number
        gate: boolean
        links: {
            kind: RoadmapLinkKind
            targetType?: RoadmapLinkTarget | null
            targetId?: number | null
            url?: string | null
            label?: string | null
        }[]
        vouches: {
            id: number | null
            personName: string
            note: string | null
        }[]
    }[]
    edges: {
        id?: number | null
        sourceRef: string
        targetRef: string
    }[]
}

export interface TagSelectionDto {
    homeInstitutionId?: number | null
    partnerInstitutionId?: number | null
    institutionIds?: number[]
    programIds?: number[]
    topicIds?: number[]
    subtopicIds?: number[]
    proposals?: TagProposalItem[]
}

export interface RoadmapCreateDto {
    title: string
    description?: string | null
    tagSelection?: TagSelectionDto
}

export interface RoadmapUpdateDto {
    title?: string | null
    description?: string | null
}

export interface RoadmapNodeCreateDto {
    title: string
    description?: string | null
    content?: string | null
    nodeType?: RoadmapNodeType
    positionX?: number
    positionY?: number
    gate?: boolean
}

export interface RoadmapNodeUpdateDto {
    title?: string | null
    description?: string | null
    content?: string | null
    nodeType?: RoadmapNodeType
    positionX?: number
    positionY?: number
    gate?: boolean
}

export interface GetRoadmapsParams { // DTO for Query
    query?: string
    tags?: TagItem[] | number[]
    page?: number
    size?: number
}