export type TagField = 'INSTITUTION' | 'PROGRAM' | 'TOPIC' | 'SUBTOPIC'
export type TagStatus = 'PROPOSED' | 'APPROVED' | 'REJECTED'
export type ModerationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_FIXING'
export type FeedArea = 'FORUM' | 'ROADMAP' | 'LEARNING_MATERIAL' | 'FAQ'

export interface ZitounaTag {
  id: number
  name: string
  field: TagField
  type: string
  parentId: number | null
  parentName: string | null
  status: TagStatus
  aliases: string[]
  decisionReason: string | null
}

export interface TagTypeDefinition {
  id: number
  name: string
  field: TagField
  minimumInstitutions: number
  minimumPrograms: number
  active: boolean
}

export interface TagTypePayload {
  name: string
  field: TagField
  minimumInstitutions: number
  minimumPrograms: number
  active: boolean
}

export interface FeedItem {
  area: FeedArea
  id: number
  title: string
  excerpt: string
  authorId: number | null
  authorUsername: string | null
  updatedAt: string | null
  moderationStatus: ModerationStatus
  tags: ZitounaTag[]
  contentUrl: string | null
}

export interface LearningMaterial {
  id: number
  title: string
  description: string | null
  type: 'PDF' | 'AUDIO' | 'VIDEO' | 'ROADMAP'
  originalFilename: string | null
  contentType: string | null
  sizeBytes: number | null
  gradeNote: string | null
  solutionApproach: string | null
  methodUsed: string | null
  roadmapFollowed: string | null
  authorId: number | null
  authorUsername: string | null
  moderationStatus: ModerationStatus
  tags: ZitounaTag[]
  contentUrl: string
  createdAt: string | null
  updatedAt: string | null
}

export interface FaqEntry {
  id: number
  question: string
  answer: string
  published: boolean
  createdAt: string | null
  updatedAt: string | null
}

export interface ModerationQueueItem {
  area: Exclude<FeedArea, 'FAQ'>
  id: number
  title: string
  authorId: number | null
  authorUsername: string | null
  status: ModerationStatus
  submittedAt: string | null
  details: Record<string, unknown>
}
