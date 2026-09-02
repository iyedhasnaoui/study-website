import axios from 'axios'

import type {
  RoadmapCreateDto,
  RoadmapNodeCreateDto,
  RoadmapNodeResponseDto,
  RoadmapNodeUpdateDto,
  RoadmapResponseDto,
  RoadmapUpdateDto,
} from '../types'

const DEFAULT_BASE_URL = 'http://localhost:8080'
const DEFAULT_USER_ID = 1

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '')

const apiBaseUrl = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL?.trim() ?? DEFAULT_BASE_URL,
)

export const roadmapApiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

const withUserHeader = (userId: number = DEFAULT_USER_ID) => ({
  'X-User-Id': String(userId),
})

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const maybeMessage = error.response?.data?.message || error.response?.data?.error
    if (typeof maybeMessage === 'string' && maybeMessage.trim().length > 0) {
      return maybeMessage
    }
  }

  return error instanceof Error ? error.message : fallback
}

export async function getRoadmaps(query?: string): Promise<RoadmapResponseDto[]> {
  const response = await roadmapApiClient.get<RoadmapResponseDto[]>('/api/roadmaps', {
    params: query && query.trim().length > 0 ? { q: query.trim() } : undefined,
  })

  return response.data
}

export async function getRoadmapById(id: number): Promise<RoadmapResponseDto> {
  const response = await roadmapApiClient.get<RoadmapResponseDto>(`/api/roadmaps/${id}`)
  return response.data
}

export async function createRoadmap(
  payload: RoadmapCreateDto,
  userId: number = DEFAULT_USER_ID,
): Promise<RoadmapResponseDto> {
  const response = await roadmapApiClient.post<RoadmapResponseDto>('/api/roadmaps', payload, {
    headers: withUserHeader(userId),
  })
  return response.data
}

export async function updateRoadmap(
  id: number,
  payload: RoadmapUpdateDto,
): Promise<RoadmapResponseDto> {
  const response = await roadmapApiClient.put<RoadmapResponseDto>(`/api/roadmaps/${id}`, payload)
  return response.data
}

export async function deleteRoadmap(id: number): Promise<void> {
  await roadmapApiClient.delete(`/api/roadmaps/${id}`)
}

export async function getRoadmapNodes(roadmapId: number): Promise<RoadmapNodeResponseDto[]> {
  const response = await roadmapApiClient.get<RoadmapNodeResponseDto[]>(
    `/api/roadmaps/${roadmapId}/nodes`,
  )
  return response.data
}

export async function getRoadmapNode(
  roadmapId: number,
  nodeId: number,
): Promise<RoadmapNodeResponseDto> {
  const response = await roadmapApiClient.get<RoadmapNodeResponseDto>(
    `/api/roadmaps/${roadmapId}/nodes/${nodeId}`,
  )
  return response.data
}

export async function createRoadmapNode(
  roadmapId: number,
  payload: RoadmapNodeCreateDto,
): Promise<RoadmapNodeResponseDto> {
  const response = await roadmapApiClient.post<RoadmapNodeResponseDto>(
    `/api/roadmaps/${roadmapId}/nodes`,
    payload,
    {
      headers: withUserHeader(),
    },
  )
  return response.data
}

export async function updateRoadmapNode(
  roadmapId: number,
  nodeId: number,
  payload: RoadmapNodeUpdateDto,
): Promise<RoadmapNodeResponseDto> {
  const response = await roadmapApiClient.put<RoadmapNodeResponseDto>(
    `/api/roadmaps/${roadmapId}/nodes/${nodeId}`,
    payload,
  )
  return response.data
}

export async function deleteRoadmapNode(roadmapId: number, nodeId: number): Promise<void> {
  await roadmapApiClient.delete(`/api/roadmaps/${roadmapId}/nodes/${nodeId}`)
}

export { extractErrorMessage }