package com.studywebsite.service.roadmap;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Structural rules a roadmap graph must satisfy before it can be stored. Works on opaque node
 * references so it can run on an unsaved editor payload as well as on persisted rows.
 */
@Component
public class RoadmapGraphValidator {

    public static final int MIN_NODES = 3;
    public static final int SPLIT_SUGGESTION_NODES = 20;
    public static final int MAX_NODES = 25;

    /**
     * @param nodeRefs  every node in the graph, in payload order
     * @param rootRef   the single main topic
     * @param gateRefs  nodes explicitly marked as a fork
     * @param edges     directed connections as {sourceRef, targetRef}
     */
    public record GraphShape(
            List<String> nodeRefs,
            String rootRef,
            Set<String> gateRefs,
            List<String[]> edges,
            Map<String, String> titlesByRef
    ) {
    }

    public void validate(GraphShape shape) {
        checkSize(shape.nodeRefs().size());
        checkReachability(shape);
        checkAcyclic(shape);
        checkGates(shape);
    }

    /** Non-blocking advice shown alongside a graph, such as the nudge to split a large roadmap. */
    public List<String> advisories(int nodeCount) {
        List<String> advisories = new ArrayList<>();
        if (nodeCount >= SPLIT_SUGGESTION_NODES && nodeCount <= MAX_NODES) {
            advisories.add("This roadmap has " + nodeCount + " of " + MAX_NODES
                    + " nodes. Consider turning a branch into its own roadmap to keep it readable.");
        }
        return advisories;
    }

    private void checkSize(int nodeCount) {
        if (nodeCount < MIN_NODES) {
            throw new InvalidRoadmapGraphException(
                    "A roadmap needs at least " + MIN_NODES + " nodes; this one has " + nodeCount + ".");
        }
        if (nodeCount > MAX_NODES) {
            throw new InvalidRoadmapGraphException(
                    "A roadmap can hold at most " + MAX_NODES + " nodes; this one has " + nodeCount
                            + ". Turn a branch into its own roadmap to make room.");
        }
    }

    private void checkReachability(GraphShape shape) {
        Map<String, List<String>> outgoing = outgoing(shape);

        Set<String> seen = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>();
        seen.add(shape.rootRef());
        queue.add(shape.rootRef());

        while (!queue.isEmpty()) {
            for (String next : outgoing.getOrDefault(queue.poll(), List.of())) {
                if (seen.add(next)) queue.add(next);
            }
        }

        Set<String> unreachable = new LinkedHashSet<>(shape.nodeRefs());
        unreachable.removeAll(seen);

        if (!unreachable.isEmpty()) {
            throw new InvalidRoadmapGraphException(
                    "Every node must be reachable from the main topic. Not connected: "
                            + describe(shape, unreachable) + ".");
        }
    }

    private void checkAcyclic(GraphShape shape) {
        Map<String, List<String>> outgoing = outgoing(shape);

        Map<String, Integer> inDegree = new HashMap<>();
        shape.nodeRefs().forEach(ref -> inDegree.put(ref, 0));
        for (String[] edge : distinctEdges(shape)) {
            inDegree.computeIfPresent(edge[1], (ref, count) -> count + 1);
        }

        Deque<String> queue = new ArrayDeque<>();
        inDegree.forEach((ref, count) -> {
            if (count == 0) queue.add(ref);
        });

        int settled = 0;
        while (!queue.isEmpty()) {
            settled++;
            for (String next : outgoing.getOrDefault(queue.poll(), List.of())) {
                Integer remaining = inDegree.computeIfPresent(next, (ref, count) -> count - 1);
                if (remaining != null && remaining == 0) {
                    queue.add(next);
                }
            }
        }

        if (settled != shape.nodeRefs().size()) {
            // Whatever Kahn's algorithm could not settle is exactly the set of nodes on a cycle.
            Set<String> looping = new LinkedHashSet<>();
            shape.nodeRefs().forEach(ref -> {
                if (inDegree.getOrDefault(ref, 0) > 0) looping.add(ref);
            });
            throw new InvalidRoadmapGraphException(
                    "A roadmap must not contain a loop. These steps lead back into each other: "
                            + describe(shape, looping) + ".");
        }
    }

    private void checkGates(GraphShape shape) {
        Map<String, List<String>> outgoing = outgoing(shape);

        Set<String> ungated = new LinkedHashSet<>();
        for (Map.Entry<String, List<String>> entry : outgoing.entrySet()) {
            if (entry.getValue().size() > 1 && !shape.gateRefs().contains(entry.getKey())) {
                ungated.add(entry.getKey());
            }
        }

        if (!ungated.isEmpty()) {
            throw new InvalidRoadmapGraphException(
                    "A step may only lead to several next steps when it is marked as a gate. "
                            + "Mark as a gate or remove connections: " + describe(shape, ungated) + ".");
        }
    }

    private Map<String, List<String>> outgoing(GraphShape shape) {
        Map<String, List<String>> outgoing = new HashMap<>();
        for (String[] edge : distinctEdges(shape)) {
            outgoing.computeIfAbsent(edge[0], ref -> new ArrayList<>()).add(edge[1]);
        }
        return outgoing;
    }

    private List<String[]> distinctEdges(GraphShape shape) {
        Set<String> seen = new HashSet<>();
        List<String[]> distinct = new ArrayList<>();
        for (String[] edge : shape.edges()) {
            if (seen.add(edge[0] + "\u0000" + edge[1])) distinct.add(edge);
        }
        return distinct;
    }

    private String describe(GraphShape shape, Set<String> refs) {
        return refs.stream()
                .map(ref -> "\"" + shape.titlesByRef().getOrDefault(ref, ref) + "\"")
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
    }
}
