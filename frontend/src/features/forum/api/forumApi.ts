import type {
  ForumPostCreateDto,
  ForumPostResponseDto,
  ForumPostUpdateDto,
  ForumReplyCreateDto,
  ForumReplyResponseDto,
  ForumReplyUpdateDto,
} from '../types'
import { apiClient, requireAuthenticatedUser } from '../../../lib/apiClient'

export const forumApiClient = apiClient

const withUserHeader = (userId?: number) => {
  const authenticatedUser = requireAuthenticatedUser()
  return { 'X-User-Id': String(userId ?? authenticatedUser.id) }
}

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
  userId?: number,
  files: File[] = [],
): Promise<ForumPostResponseDto> {
  if (files.length > 0) {
    const formData = new FormData()
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    files.forEach((file) => formData.append('files', file, file.name))

    const response = await forumApiClient.post<ForumPostResponseDto>('/api/forum/posts', formData, {
      headers: withUserHeader(userId),
    })
    return response.data
  }

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
  userId?: number,
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
  userId?: number,
): Promise<ForumPostResponseDto> {
  return updateForumPost(id, payload, userId)
}

export async function deleteForumPost(id: number, userId?: number): Promise<void> {
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
  userId?: number,
  files: File[] = [],
): Promise<ForumReplyResponseDto> {
  if (files.length > 0) {
    const formData = new FormData()
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    files.forEach((file) => formData.append('files', file, file.name))

    const response = await forumApiClient.post<ForumReplyResponseDto>(
      `/api/forum/posts/${postId}/replies`,
      formData,
      { headers: withUserHeader(userId) },
    )
    return response.data
  }

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
  userId?: number,
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
  userId?: number,
): Promise<void> {
  await forumApiClient.delete(`/api/forum/posts/${postId}/replies/${id}`, {
    headers: withUserHeader(userId),
  })
}

