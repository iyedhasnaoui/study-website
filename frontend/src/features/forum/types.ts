export const FORUM_POST_TITLE_MIN_LENGTH = 5
export const FORUM_POST_TITLE_MAX_LENGTH = 150
export const FORUM_POST_CONTENT_MAX_LENGTH = 10000

export type ForumAttachmentType = 'PDF' | 'AUDIO' | 'VIDEO'

export interface ForumAttachmentResponseDto {
  id: number
  filename: string
  mimeType: string
  type: ForumAttachmentType
  sizeBytes: number
  contentUrl: string
  createdAt: string | null
}

export interface TagProposalDto {
  name: string
  field: 'INSTITUTION' | 'PROGRAM' | 'TOPIC' | 'SUBTOPIC'
  parentId?: number | null
}

export interface TagSelectionDto {
  homeInstitutionId?: number | null
  partnerInstitutionId?: number | null
  institutionIds?: number[]
  programIds?: number[]
  topicIds?: number[]
  subtopicIds?: number[]
  proposals?: TagProposalDto[]
}

export interface ForumPostCreateDto {
  title: string
  content: string
  tags?: string[] | null
  tagSelection?: TagSelectionDto | null
}

export interface ForumPostUpdateDto {
  title?: string | null
  content?: string | null
  tags?: string[] | null
}

export interface ForumPostResponseDto {
  id: number
  title: string
  content: string
  authorId: number | null
  authorUsername: string | null
  tags: string[]
  attachments: ForumAttachmentResponseDto[]
  createdAt: string | null
  updatedAt: string | null
}

export interface ForumPostFormErrors {
  title?: string
  content?: string
  attachments?: string
}

export interface ForumReplyCreateDto {
  content: string
}

export interface ForumReplyUpdateDto {
  content?: string | null
}

export interface ForumReplyResponseDto {
  id: number
  postId: number | null
  content: string
  authorId: number | null
  authorUsername: string | null
  attachments: ForumAttachmentResponseDto[]
  createdAt: string | null
  updatedAt: string | null
}

