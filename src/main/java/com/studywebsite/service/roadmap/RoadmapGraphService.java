package com.studywebsite.service.roadmap;

import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapEdge;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeType;
import com.studywebsite.model.User;
import com.studywebsite.repository.RoadmapRepository;
import com.studywebsite.repository.RoadmapEdgeRepository;
import com.studywebsite.repository.RoadmapNodeRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
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
    private final RoadmapGraphValidator validator;
    private final RoadmapRepository roadmapRepository;

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
    public void clearLinksTo(Long roadmapId) {
        nodeRepository.clearLinksTo(roadmapId);
        nodeRepository.flush();
    }

    @Transactional
    public void deleteGraph(Long roadmapId) {
        edgeRepository.deleteByRoadmap_Id(roadmapId);
        edgeRepository.flush();
        nodeRepository.deleteByRoadmap_Id(roadmapId);
        nodeRepository.flush();
    }

    /**
     * Splits a step and the branch hanging off it into a roadmap of its own, leaving the step
     * behind as a link. Only nodes reachable exclusively through the step move; anything the rest
     * of the graph still needs stays put. Rolls back unless both resulting graphs remain valid.
     */
    @Transactional
    public Roadmap extractNode(Roadmap roadmap, Long nodeId, User author) {
        RoadmapNode origin = getNode(roadmap.getId(), nodeId);
        if (origin.getNodeType() == RoadmapNodeType.ROOT) {
            throw new InvalidRoadmapGraphException("The main node cannot be split into its own roadmap");
        }
        if (origin.getLinkedRoadmapId() != null) {
            throw new InvalidRoadmapGraphException("This step already links to a roadmap of its own");
        }

        List<RoadmapNode> nodes = nodeRepository.findByRoadmap_IdOrderByIdAsc(roadmap.getId());
        List<RoadmapEdge> edges = edgeRepository.findByRoadmap_IdOrderByIdAsc(roadmap.getId());
        RoadmapNode root = nodes.stream()
                .filter(node -> node.getNodeType() == RoadmapNodeType.ROOT)
                .findFirst()
                .orElseThrow(() -> new InvalidRoadmapGraphException("This roadmap has no main node"));

        Set<Long> moving = exclusiveDescendants(origin.getId(), root.getId(), edges);
        if (moving.isEmpty()) {
            throw new InvalidRoadmapGraphException(
                    "\"" + origin.getTitle() + "\" has no branch of its own to split off");
        }

        Roadmap extracted = new Roadmap();
        extracted.setTitle(origin.getTitle());
        extracted.setDescription(origin.getDescription());
        extracted.setAuthor(author);
        extracted = roadmapRepository.save(extracted);

        Map<Long, RoadmapNode> copies = new LinkedHashMap<>();
        double offsetX = origin.getPositionX();
        double offsetY = origin.getPositionY();

        RoadmapNode newRoot = copyInto(extracted, origin, offsetX, offsetY);
        newRoot.setNodeType(RoadmapNodeType.ROOT);
        copies.put(origin.getId(), newRoot);

        for (RoadmapNode node : nodes) {
            if (moving.contains(node.getId())) {
                copies.put(node.getId(), copyInto(extracted, node, offsetX, offsetY));
            }
        }
        nodeRepository.saveAll(copies.values());
        nodeRepository.flush();

        List<RoadmapEdge> copiedEdges = new ArrayList<>();
        for (RoadmapEdge edge : edges) {
            RoadmapNode source = copies.get(edge.getSourceNode().getId());
            RoadmapNode target = copies.get(edge.getTargetNode().getId());
            if (source != null && target != null) {
                RoadmapEdge copy = new RoadmapEdge();
                copy.setRoadmap(extracted);
                copy.setSourceNode(source);
                copy.setTargetNode(target);
                copiedEdges.add(copy);
            }
        }
        edgeRepository.saveAll(copiedEdges);
        edgeRepository.flush();

        // Drop the moved branch from the original and leave the step pointing at the new roadmap.
        List<RoadmapEdge> staleEdges = edges.stream()
                .filter(edge -> moving.contains(edge.getSourceNode().getId())
                        || moving.contains(edge.getTargetNode().getId()))
                .toList();
        edgeRepository.deleteAll(staleEdges);
        edgeRepository.flush();

        nodeRepository.deleteAll(nodes.stream().filter(node -> moving.contains(node.getId())).toList());
        nodeRepository.flush();

        origin.setLinkedRoadmapId(extracted.getId());
        nodeRepository.save(origin);
        nodeRepository.flush();

        validator.validate(shapeOf(extracted.getId()));
        validator.validate(shapeOf(roadmap.getId()));

        return extracted;
    }

    /** Nodes reachable from {@code originId} that the rest of the graph cannot reach without it. */
    private Set<Long> exclusiveDescendants(Long originId, Long rootId, List<RoadmapEdge> edges) {
        Map<Long, List<Long>> outgoing = new HashMap<>();
        for (RoadmapEdge edge : edges) {
            outgoing.computeIfAbsent(edge.getSourceNode().getId(), id -> new ArrayList<>())
                    .add(edge.getTargetNode().getId());
        }

        Set<Long> belowOrigin = reach(originId, outgoing, Set.of());
        belowOrigin.remove(originId);

        Set<Long> withoutOrigin = reach(rootId, outgoing, Set.of(originId));

        Set<Long> exclusive = new LinkedHashSet<>(belowOrigin);
        exclusive.removeAll(withoutOrigin);
        return exclusive;
    }

    private Set<Long> reach(Long from, Map<Long, List<Long>> outgoing, Set<Long> blocked) {
        Set<Long> seen = new LinkedHashSet<>();
        Deque<Long> queue = new ArrayDeque<>();
        if (blocked.contains(from)) return seen;
        seen.add(from);
        queue.add(from);

        while (!queue.isEmpty()) {
            for (Long next : outgoing.getOrDefault(queue.poll(), List.of())) {
                if (!blocked.contains(next) && seen.add(next)) queue.add(next);
            }
        }
        return seen;
    }

    private RoadmapNode copyInto(Roadmap target, RoadmapNode source, double offsetX, double offsetY) {
        RoadmapNode copy = new RoadmapNode();
        copy.setRoadmap(target);
        copy.setTitle(source.getTitle());
        copy.setDescription(source.getDescription());
        copy.setContent(source.getContent());
        copy.setNodeType(source.getNodeType());
        copy.setGate(source.getGate());
        copy.setLinkedRoadmapId(source.getLinkedRoadmapId());
        copy.setPositionX(source.getPositionX() - offsetX);
        copy.setPositionY(source.getPositionY() - offsetY);
        return copy;
    }

    private RoadmapGraphValidator.GraphShape shapeOf(Long roadmapId) {
        List<RoadmapNode> nodes = nodeRepository.findByRoadmap_IdOrderByIdAsc(roadmapId);
        List<RoadmapEdge> edges = edgeRepository.findByRoadmap_IdOrderByIdAsc(roadmapId);

        List<String> refs = new ArrayList<>();
        Set<String> gates = new HashSet<>();
        Map<String, String> titles = new LinkedHashMap<>();
        String rootRef = null;

        for (RoadmapNode node : nodes) {
            String ref = String.valueOf(node.getId());
            refs.add(ref);
            titles.put(ref, node.getTitle());
            if (Boolean.TRUE.equals(node.getGate())) gates.add(ref);
            if (node.getNodeType() == RoadmapNodeType.ROOT) rootRef = ref;
        }

        List<String[]> edgePairs = edges.stream()
                .map(edge -> new String[]{
                        String.valueOf(edge.getSourceNode().getId()),
                        String.valueOf(edge.getTargetNode().getId())})
                .toList();

        return new RoadmapGraphValidator.GraphShape(refs, rootRef, gates, new ArrayList<>(edgePairs), titles);
    }

    /**
     * Replaces the roadmap's whole graph in one transaction: nodes and edges missing from the
     * payload are removed, so the editor can persist adds, moves, edits and deletions together.
     */
    @Transactional
    public void saveGraph(Roadmap roadmap, RoadmapGraphSaveDto payload) {
        List<RoadmapGraphSaveDto.NodeInput> nodeInputs = payload.getNodes() == null ? List.of() : payload.getNodes();
        List<RoadmapGraphSaveDto.EdgeInput> edgeInputs = payload.getEdges() == null ? List.of() : payload.getEdges();

        String rootRef = validateNodeInputs(nodeInputs);
        validator.validate(toShape(nodeInputs, edgeInputs, rootRef));

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
            node.setGate(Boolean.TRUE.equals(input.getGate()));

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

    private String validateNodeInputs(List<RoadmapGraphSaveDto.NodeInput> nodeInputs) {
        if (nodeInputs.isEmpty()) {
            throw new InvalidRoadmapGraphException("A roadmap must keep at least its main node");
        }

        Set<String> refs = new HashSet<>();
        String rootRef = null;
        long rootCount = 0;
        for (RoadmapGraphSaveDto.NodeInput input : nodeInputs) {
            if (!refs.add(input.getRef())) {
                throw new InvalidRoadmapGraphException("Duplicate node reference: " + input.getRef());
            }
            if (input.getNodeType() == RoadmapNodeType.ROOT) {
                rootCount++;
                rootRef = input.getRef();
            }
        }

        if (rootCount != 1) {
            throw new InvalidRoadmapGraphException("A roadmap must have exactly one main node");
        }
        return rootRef;
    }

    private RoadmapGraphValidator.GraphShape toShape(
            List<RoadmapGraphSaveDto.NodeInput> nodeInputs,
            List<RoadmapGraphSaveDto.EdgeInput> edgeInputs,
            String rootRef) {

        List<String> refs = new ArrayList<>();
        Set<String> gateRefs = new HashSet<>();
        Map<String, String> titles = new LinkedHashMap<>();
        for (RoadmapGraphSaveDto.NodeInput input : nodeInputs) {
            refs.add(input.getRef());
            titles.put(input.getRef(), input.getTitle());
            if (Boolean.TRUE.equals(input.getGate())) gateRefs.add(input.getRef());
        }

        List<String[]> edges = new ArrayList<>();
        for (RoadmapGraphSaveDto.EdgeInput input : edgeInputs) {
            if (!titles.containsKey(input.getSourceRef()) || !titles.containsKey(input.getTargetRef())) {
                throw new InvalidRoadmapGraphException(
                        "A connection points at a node that is not part of the graph");
            }
            if (input.getSourceRef().equals(input.getTargetRef())) {
                throw new InvalidRoadmapGraphException("A node cannot be connected to itself");
            }
            edges.add(new String[]{input.getSourceRef(), input.getTargetRef()});
        }

        return new RoadmapGraphValidator.GraphShape(refs, rootRef, gateRefs, edges, titles);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
