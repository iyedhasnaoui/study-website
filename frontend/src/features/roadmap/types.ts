export interface RoadmapNodeResponseDto {
  id: number
  roadmapId: number | null
  parentStepId: number | null
  title: string
  content: string
  orderIndex: number | null
  childSteps: RoadmapNodeResponseDto[]
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
  content?: string | null
  parentStepId?: number | null
  orderIndex?: number | null
}

export interface RoadmapNodeUpdateDto {
  title?: string | null
  content?: string | null
  parentStepId?: number | null
  orderIndex?: number | null
}