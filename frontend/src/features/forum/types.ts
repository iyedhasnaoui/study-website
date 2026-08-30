export const FORUM_POST_TITLE_MIN_LENGTH = 5
export const FORUM_POST_TITLE_MAX_LENGTH = 150
export const FORUM_POST_CONTENT_MIN_LENGTH = 10
export const FORUM_POST_CONTENT_MAX_LENGTH = 10000

export interface ForumPostCreateDto {
  title: string
  content: string
  tags?: string[] | null
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
  createdAt: string | null
  updatedAt: string | null
}

export interface ForumPostFormErrors {
  title?: string
  content?: string
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
  createdAt: string | null
  updatedAt: string | null
}

