package com.studywebsite.controller;

import com.studywebsite.dto.RoadmapEdgeResponseDto;
import com.studywebsite.dto.RoadmapGraphResponseDto;
import com.studywebsite.dto.RoadmapNodeResponseDto;
import com.studywebsite.dto.RoadmapResponseDto;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapEdge;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.ZitounaTag;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RoadmapMapper {

    public RoadmapNodeResponseDto toNodeDto(RoadmapNode node) {
        return RoadmapNodeResponseDto.builder()
                .id(node.getId())
                .roadmapId(node.getRoadmap() != null ? node.getRoadmap().getId() : null)
                .title(node.getTitle())
                .description(node.getDescription())
                .content(node.getContent())
                .nodeType(node.getNodeType())
                .positionX(node.getPositionX())
                .positionY(node.getPositionY())
                .gate(node.getGate())
                .linkedRoadmapId(node.getLinkedRoadmapId())
                .build();
    }

    public RoadmapEdgeResponseDto toEdgeDto(RoadmapEdge edge) {
        return RoadmapEdgeResponseDto.builder()
                .id(edge.getId())
                .roadmapId(edge.getRoadmap() != null ? edge.getRoadmap().getId() : null)
                .sourceNodeId(edge.getSourceNode() != null ? edge.getSourceNode().getId() : null)
                .targetNodeId(edge.getTargetNode() != null ? edge.getTargetNode().getId() : null)
                .build();
    }

    public RoadmapResponseDto toRoadmapDto(Roadmap roadmap, List<RoadmapNode> nodes, List<RoadmapEdge> edges) {
        return RoadmapResponseDto.builder()
                .id(roadmap.getId())
                .authorId(roadmap.getAuthor() != null ? roadmap.getAuthor().getId() : null)
                .authorUsername(roadmap.getAuthor() != null ? roadmap.getAuthor().getUsername() : null)
                .title(roadmap.getTitle())
                .description(roadmap.getDescription())
                .createdAt(roadmap.getCreatedAt())
                .updatedAt(roadmap.getUpdatedAt())
                .nodes(nodes.stream().map(this::toNodeDto).toList())
                .edges(edges.stream().map(this::toEdgeDto).toList())
                .tags(tagNames(roadmap))
                .moderationStatus(roadmap.getModerationStatus() == null
                        ? ModerationStatus.APPROVED
                        : roadmap.getModerationStatus())
                .moderationNote(roadmap.getModerationNote())
                .build();
    }

    private List<String> tagNames(Roadmap roadmap) {
        return roadmap.getTags() == null ? List.of() : roadmap.getTags().stream()
                .map(ZitounaTag::getName)
                .sorted()
                .toList();
    }

    public RoadmapGraphResponseDto toGraphDto(
            Roadmap roadmap,
            List<RoadmapNode> nodes,
            List<RoadmapEdge> edges,
            List<String> advisories) {

        return RoadmapGraphResponseDto.builder()
                .roadmapId(roadmap.getId())
                .title(roadmap.getTitle())
                .description(roadmap.getDescription())
                .authorId(roadmap.getAuthor() != null ? roadmap.getAuthor().getId() : null)
                .authorUsername(roadmap.getAuthor() != null ? roadmap.getAuthor().getUsername() : null)
                .createdAt(roadmap.getCreatedAt())
                .updatedAt(roadmap.getUpdatedAt())
                .moderationStatus(roadmap.getModerationStatus())
                .moderationNote(roadmap.getModerationNote())
                .nodes(nodes.stream().map(this::toNodeDto).toList())
                .edges(edges.stream().map(this::toEdgeDto).toList())
                .advisories(advisories)
                .build();
    }
}
