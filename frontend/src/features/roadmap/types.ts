export type RoadmapNodeType = 'ROOT' | 'PRIMARY' | 'SECONDARY' | 'OPTIONAL' | 'NOTE'

export interface RoadmapNodeResponseDto {
  id: number
  roadmapId: number | null
  title: string
  description: string | null
  content: string | null
  nodeType: RoadmapNodeType
  positionX: number
  positionY: number
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
  nodes: RoadmapNodeResponseDto[]
  edges: RoadmapEdgeResponseDto[]
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
  }[]
  edges: {
    id?: number | null
    sourceRef: string
    targetRef: string
  }[]
}

export interface RoadmapCreateDto {
  title: string
  description?: string | null
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
}

export interface RoadmapNodeUpdateDto {
  title?: string | null
  description?: string | null
  content?: string | null
  nodeType?: RoadmapNodeType
  positionX?: number
  positionY?: number
}
