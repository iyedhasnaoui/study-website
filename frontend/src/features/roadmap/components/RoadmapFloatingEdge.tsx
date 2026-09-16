import {
  BaseEdge,
  Position,
  getBezierPath,
  useInternalNode,
  type EdgeProps,
  type InternalNode,
  type Node,
} from '@xyflow/react'

type FlowNode = InternalNode<Node>

/**
 * Edges attach to whichever side of each box faces the other one, so a saved graph redraws
 * identically from node coordinates alone — no handle positions have to be persisted.
 */
function getNodeIntersection(node: FlowNode, other: FlowNode) {
  const width = node.measured.width ?? 0
  const height = node.measured.height ?? 0
  const halfWidth = width / 2
  const halfHeight = height / 2

  if (halfWidth === 0 || halfHeight === 0) {
    return { x: node.internals.positionAbsolute.x, y: node.internals.positionAbsolute.y }
  }

  const centerX = node.internals.positionAbsolute.x + halfWidth
  const centerY = node.internals.positionAbsolute.y + halfHeight
  const otherCenterX = other.internals.positionAbsolute.x + (other.measured.width ?? 0) / 2
  const otherCenterY = other.internals.positionAbsolute.y + (other.measured.height ?? 0) / 2

  const dx = (otherCenterX - centerX) / (2 * halfWidth)
  const dy = (otherCenterY - centerY) / (2 * halfHeight)
  const u = dx - dy
  const v = dx + dy
  const scale = 1 / (Math.abs(u) + Math.abs(v) || 1)

  return {
    x: halfWidth * scale * (u + v) + centerX,
    y: halfHeight * scale * (v - u) + centerY,
  }
}

function getEdgePosition(node: FlowNode, point: { x: number; y: number }): Position {
  const nodeX = Math.round(node.internals.positionAbsolute.x)
  const nodeY = Math.round(node.internals.positionAbsolute.y)
  const pointX = Math.round(point.x)
  const pointY = Math.round(point.y)

  if (pointX <= nodeX + 1) return Position.Left
  if (pointX >= nodeX + (node.measured.width ?? 0) - 1) return Position.Right
  if (pointY <= nodeY + 1) return Position.Top
  return Position.Bottom
}

export function RoadmapFloatingEdge({ id, source, target, markerEnd, style, selected }: EdgeProps) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)

  if (!sourceNode || !targetNode) return null

  const sourcePoint = getNodeIntersection(sourceNode, targetNode)
  const targetPoint = getNodeIntersection(targetNode, sourceNode)

  const [path] = getBezierPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    sourcePosition: getEdgePosition(sourceNode, sourcePoint),
    targetX: targetPoint.x,
    targetY: targetPoint.y,
    targetPosition: getEdgePosition(targetNode, targetPoint),
  })

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={{
        strokeWidth: selected ? 3 : 2,
        stroke: selected ? '#0284c7' : '#94a3b8',
        ...style,
      }}
    />
  )
}
