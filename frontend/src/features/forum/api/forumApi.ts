import axios from 'axios'

import type {
  ForumPostCreateDto,
  ForumPostResponseDto,
  ForumPostUpdateDto,
  ForumReplyCreateDto,
  ForumReplyResponseDto,
  ForumReplyUpdateDto,
} from '../types'

const DEFAULT_BASE_URL = 'http://localhost:8080'
const DEFAULT_USER_ID = 1

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '')

const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL?.trim() ?? DEFAULT_BASE_URL,
)

export const forumApiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

const withUserHeader = (userId: number = DEFAULT_USER_ID) => ({
  'X-User-Id': String(userId),
})

export async function getForumPosts(tag?: string): Promise<ForumPostResponseDto[]> {
  const response = await forumApiClient.get<ForumPostResponseDto[]>('/api/forum/posts', {
    params: tag && tag.trim().length > 0 ? { tag: tag.trim() } : undefined,
  })

  return response.data
}

export async function getForumPostById(id: number): Promise<ForumPostResponseDto> {
  const response = await forumApiClient.get<ForumPostResponseDto>(`/api/forum/posts/${id}`)
  return response.data
}

export async function createForumPost(
  payload: ForumPostCreateDto,
  userId: number = DEFAULT_USER_ID,
): Promise<ForumPostResponseDto> {
  const response = await forumApiClient.post<ForumPostResponseDto>(
    '/api/forum/posts',
    payload,
    {
      headers: withUserHeader(userId),
    },
  )

  return response.data
}

export async function updateForumPost(
  id: number,
  payload: ForumPostUpdateDto,
  userId: number = DEFAULT_USER_ID,
): Promise<ForumPostResponseDto> {
  const response = await forumApiClient.put<ForumPostResponseDto>(
    `/api/forum/posts/${id}`,
    payload,
    {
      headers: withUserHeader(userId),
    },
  )

  return response.data
}

export async function updatePost(
  id: number,
  payload: ForumPostUpdateDto,
  userId: number = DEFAULT_USER_ID,
): Promise<ForumPostResponseDto> {
  return updateForumPost(id, payload, userId)
}

export async function deleteForumPost(id: number, userId: number = DEFAULT_USER_ID): Promise<void> {
  await forumApiClient.delete(`/api/forum/posts/${id}`, {
    headers: withUserHeader(userId),
  })
}

export async function getRepliesByPostId(postId: number): Promise<ForumReplyResponseDto[]> {
  const response = await forumApiClient.get<ForumReplyResponseDto[]>(
    `/api/forum/posts/${postId}/replies`,
  )

  return response.data
}

export async function createReply(
  postId: number,
  payload: ForumReplyCreateDto,
  userId: number = DEFAULT_USER_ID,
): Promise<ForumReplyResponseDto> {
  const response = await forumApiClient.post<ForumReplyResponseDto>(
    `/api/forum/posts/${postId}/replies`,
    payload,
    {
      headers: withUserHeader(userId),
    },
  )

  return response.data
}

export async function updateReply(
  postId: number,
  id: number,
  payload: ForumReplyUpdateDto,
  userId: number = DEFAULT_USER_ID,
): Promise<ForumReplyResponseDto> {
  const response = await forumApiClient.put<ForumReplyResponseDto>(
    `/api/forum/posts/${postId}/replies/${id}`,
    payload,
    {
      headers: withUserHeader(userId),
    },
  )

  return response.data
}

export async function deleteReply(
  postId: number,
  id: number,
  userId: number = DEFAULT_USER_ID,
): Promise<void> {
  await forumApiClient.delete(`/api/forum/posts/${postId}/replies/${id}`, {
    headers: withUserHeader(userId),
  })
}

