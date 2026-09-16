package com.studywebsite.service.roadmap;

import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapEdge;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeType;
import com.studywebsite.repository.RoadmapEdgeRepository;
import com.studywebsite.repository.RoadmapNodeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoadmapGraphService {

    private static final double ROOT_X = 0.0;
    private static final double ROOT_Y = 0.0;

    private final RoadmapNodeRepository nodeRepository;
    private final RoadmapEdgeRepository edgeRepository;

    @Transactional(readOnly = true)
    public List<RoadmapNode> findNodes(Long roadmapId) {
        return nodeRepository.findByRoadmap_IdOrderByIdAsc(roadmapId);
    }

    @Transactional(readOnly = true)
    public List<RoadmapEdge> findEdges(Long roadmapId) {
        return edgeRepository.findByRoadmap_IdOrderByIdAsc(roadmapId);
    }

    @Transactional(readOnly = true)
    public RoadmapNode getNode(Long roadmapId, Long nodeId) {
        RoadmapNode node = nodeRepository.findById(nodeId)
                .orElseThrow(() -> new EntityNotFoundException("Roadmap node not found"));
        if (node.getRoadmap() == null || !roadmapId.equals(node.getRoadmap().getId())) {
            throw new EntityNotFoundException("Roadmap node not found");
        }
        return node;
    }

    /**
     * Every roadmap opens with a single main node carrying the roadmap topic, which the editor
     * treats as the entry point of the graph and does not allow deleting.
     */
    @Transactional
    public RoadmapNode createRootNode(Roadmap roadmap) {
        RoadmapNode root = new RoadmapNode();
        root.setRoadmap(roadmap);
        root.setTitle(roadmap.getTitle());
        root.setDescription(roadmap.getDescription());
        root.setContent("Start here. Describe what this roadmap covers.");
        root.setNodeType(RoadmapNodeType.ROOT);
        root.setPositionX(ROOT_X);
        root.setPositionY(ROOT_Y);
        return nodeRepository.save(root);
    }

    @Transactional
    public RoadmapNode createNode(Roadmap roadmap, RoadmapNode node) {
        if (node.getNodeType() == RoadmapNodeType.ROOT) {
            throw new InvalidRoadmapGraphException("A roadmap can only have one main node");
        }
        node.setRoadmap(roadmap);
        return nodeRepository.save(node);
    }

    @Transactional
    public RoadmapNode updateNode(RoadmapNode node) {
        return nodeRepository.save(node);
    }

    @Transactional
    public void deleteNode(Long roadmapId, Long nodeId) {
        RoadmapNode node = getNode(roadmapId, nodeId);
        if (node.getNodeType() == RoadmapNodeType.ROOT) {
            throw new InvalidRoadmapGraphException("The main node of a roadmap cannot be deleted");
        }
        edgeRepository.deleteBySourceNode_IdOrTargetNode_Id(nodeId, nodeId);
        edgeRepository.flush();
        nodeRepository.delete(node);
    }

    @Transactional
    public void deleteGraph(Long roadmapId) {
        edgeRepository.deleteByRoadmap_Id(roadmapId);
        edgeRepository.flush();
        nodeRepository.deleteByRoadmap_Id(roadmapId);
        nodeRepository.flush();
    }

    /**
     * Replaces the roadmap's whole graph in one transaction: nodes and edges missing from the
     * payload are removed, so the editor can persist adds, moves, edits and deletions together.
     */
    @Transactional
    public void saveGraph(Roadmap roadmap, RoadmapGraphSaveDto payload) {
        List<RoadmapGraphSaveDto.NodeInput> nodeInputs = payload.getNodes() == null ? List.of() : payload.getNodes();
        List<RoadmapGraphSaveDto.EdgeInput> edgeInputs = payload.getEdges() == null ? List.of() : payload.getEdges();

        validateNodeInputs(nodeInputs);

        Map<Long, RoadmapNode> existingById = nodeRepository.findByRoadmap_IdOrderByIdAsc(roadmap.getId())
                .stream()
                .collect(Collectors.toMap(RoadmapNode::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));

        Map<String, RoadmapNode> nodesByRef = new LinkedHashMap<>();
        for (RoadmapGraphSaveDto.NodeInput input : nodeInputs) {
            RoadmapNode node;
            if (input.getId() != null) {
                node = existingById.get(input.getId());
                if (node == null) {
                    throw new InvalidRoadmapGraphException(
                            "Node " + input.getId() + " does not belong to this roadmap");
                }
            } else {
                node = new RoadmapNode();
                node.setRoadmap(roadmap);
            }

            node.setTitle(input.getTitle().trim());
            node.setDescription(blankToNull(input.getDescription()));
            node.setContent(input.getContent());
            node.setNodeType(input.getNodeType() == null ? RoadmapNodeType.PRIMARY : input.getNodeType());
            node.setPositionX(input.getPositionX());
            node.setPositionY(input.getPositionY());

            nodesByRef.put(input.getRef(), node);
        }

        List<RoadmapNode> savedNodes = nodeRepository.saveAll(nodesByRef.values());
        nodeRepository.flush();

        Set<Long> keptNodeIds = savedNodes.stream().map(RoadmapNode::getId).collect(Collectors.toSet());
        List<RoadmapNode> removedNodes = existingById.values().stream()
                .filter(node -> !keptNodeIds.contains(node.getId()))
                .toList();

        // Edges are rebuilt from scratch, which also clears any edge attached to a removed node.
        edgeRepository.deleteByRoadmap_Id(roadmap.getId());
        edgeRepository.flush();

        if (!removedNodes.isEmpty()) {
            nodeRepository.deleteAll(removedNodes);
            nodeRepository.flush();
        }

        List<RoadmapEdge> edges = new ArrayList<>();
        Set<String> seenConnections = new HashSet<>();
        for (RoadmapGraphSaveDto.EdgeInput input : edgeInputs) {
            RoadmapNode source = nodesByRef.get(input.getSourceRef());
            RoadmapNode target = nodesByRef.get(input.getTargetRef());

            if (source == null || target == null) {
                throw new InvalidRoadmapGraphException("A connection points at a node that is not part of the graph");
            }
            if (source.getId().equals(target.getId())) {
                throw new InvalidRoadmapGraphException("A node cannot be connected to itself");
            }
            if (!seenConnections.add(source.getId() + "->" + target.getId())) {
                continue;
            }

            RoadmapEdge edge = new RoadmapEdge();
            edge.setRoadmap(roadmap);
            edge.setSourceNode(source);
            edge.setTargetNode(target);
            edges.add(edge);
        }

        edgeRepository.saveAll(edges);
        edgeRepository.flush();
    }

    private void validateNodeInputs(List<RoadmapGraphSaveDto.NodeInput> nodeInputs) {
        if (nodeInputs.isEmpty()) {
            throw new InvalidRoadmapGraphException("A roadmap must keep at least its main node");
        }

        Set<String> refs = new HashSet<>();
        long rootCount = 0;
        for (RoadmapGraphSaveDto.NodeInput input : nodeInputs) {
            if (!refs.add(input.getRef())) {
                throw new InvalidRoadmapGraphException("Duplicate node reference: " + input.getRef());
            }
            if (input.getNodeType() == RoadmapNodeType.ROOT) {
                rootCount++;
            }
        }

        if (rootCount != 1) {
            throw new InvalidRoadmapGraphException("A roadmap must have exactly one main node");
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
