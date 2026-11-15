package com.studywebsite.service.roadmap;

import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.dto.RoadmapNodeVouchDto;
import com.studywebsite.dto.zitouna.ZitounaDtos;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeType;
import com.studywebsite.model.RoadmapNodeVouch;
import com.studywebsite.model.User;
import com.studywebsite.repository.RoadmapNodeVouchRepository;
import com.studywebsite.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * People who vouch for a roadmap step: somebody who actually did it, usually the author of the
 * forum post the step is built on. Naming a real person is a claim, so every new or changed
 * vouch waits for an admin, and readers only ever see the accepted ones.
 */
@Service
@RequiredArgsConstructor
public class RoadmapVouchService {

    public static final String QUEUE_AREA = "ROADMAP_VOUCH";
    static final int MAX_VOUCHES_PER_NODE = 10;

    private final RoadmapNodeVouchRepository vouchRepository;
    private final UserRepository userRepository;

    /** Only steps can be vouched for; the main topic and notes are not something a person "did". */
    public static boolean acceptsVouches(RoadmapNodeType type) {
        return type != RoadmapNodeType.ROOT && type != RoadmapNodeType.NOTE;
    }

    public void checkCount(String nodeTitle, List<RoadmapGraphSaveDto.VouchInput> inputs) {
        if (inputs != null && inputs.size() > MAX_VOUCHES_PER_NODE) {
            throw new InvalidRoadmapGraphException("\"" + nodeTitle + "\" names " + inputs.size()
                    + " people; a step can be vouched for by at most " + MAX_VOUCHES_PER_NODE);
        }
    }

    /**
     * Replaces the node's vouches. A vouch sent back unchanged keeps the admin's decision; a new
     * one, or one whose name or note was edited, goes back to waiting for an admin. Ids that do not
     * belong to this node are treated as new, so a decision can never be carried to another step.
     */
    @Transactional
    public void replace(RoadmapNode node, List<RoadmapGraphSaveDto.VouchInput> inputs, Long editorId) {
        List<RoadmapGraphSaveDto.VouchInput> wanted = inputs == null || !acceptsVouches(node.getNodeType())
                ? List.of()
                : inputs;

        Map<Long, RoadmapNodeVouch> existing = node.getId() == null ? Map.of()
                : vouchRepository.findByNode_IdOrderBySortOrderAscIdAsc(node.getId()).stream()
                        .collect(Collectors.toMap(RoadmapNodeVouch::getId, Function.identity()));

        List<RoadmapNodeVouch> kept = new ArrayList<>();
        for (RoadmapGraphSaveDto.VouchInput input : wanted) {
            String personName = input.getPersonName().trim();
            String note = blankToNull(input.getNote());

            RoadmapNodeVouch vouch = input.getId() == null ? null : existing.get(input.getId());
            if (vouch != null && kept.contains(vouch)) {
                vouch = null;
            }
            if (vouch == null) {
                vouch = new RoadmapNodeVouch();
                vouch.setNode(node);
                vouch.setProposedBy(editorId == null ? null : userRepository.getReferenceById(editorId));
            } else if (!personName.equals(vouch.getPersonName()) || !Objects.equals(note, vouch.getNote())) {
                vouch.setStatus(ModerationStatus.PENDING);
                vouch.setDecidedAt(null);
                vouch.setProposedBy(editorId == null ? null : userRepository.getReferenceById(editorId));
            }

            vouch.setPersonName(personName);
            vouch.setNote(note);
            vouch.setSortOrder(kept.size());
            kept.add(vouch);
        }

        List<RoadmapNodeVouch> removed = existing.values().stream()
                .filter(vouch -> !kept.contains(vouch))
                .toList();
        vouchRepository.deleteAll(removed);
        vouchRepository.saveAll(kept);
    }

    @Transactional
    public void deleteForNodes(Collection<Long> nodeIds) {
        if (nodeIds.isEmpty()) return;
        vouchRepository.deleteAll(vouchRepository.findByNode_IdIn(nodeIds));
        vouchRepository.flush();
    }

    /** Moves a step's vouches along with it when its branch becomes a roadmap of its own. */
    @Transactional
    public void copy(Long fromNodeId, RoadmapNode to) {
        List<RoadmapNodeVouch> copies = vouchRepository.findByNode_IdOrderBySortOrderAscIdAsc(fromNodeId).stream()
                .map(source -> {
                    RoadmapNodeVouch copy = new RoadmapNodeVouch();
                    copy.setNode(to);
                    copy.setPersonName(source.getPersonName());
                    copy.setNote(source.getNote());
                    copy.setStatus(source.getStatus());
                    copy.setDecidedAt(source.getDecidedAt());
                    copy.setProposedBy(source.getProposedBy());
                    copy.setSortOrder(source.getSortOrder());
                    return copy;
                })
                .toList();
        vouchRepository.saveAll(copies);
    }

    /** Every node's vouches, keyed by node id; readers only get the accepted ones. */
    @Transactional(readOnly = true)
    public Map<Long, List<RoadmapNodeVouchDto>> vouchesByNode(Long roadmapId, boolean includeUndecided) {
        Map<Long, List<RoadmapNodeVouchDto>> byNode = new LinkedHashMap<>();
        for (RoadmapNodeVouch vouch : vouchRepository.findByNode_Roadmap_IdOrderBySortOrderAscIdAsc(roadmapId)) {
            if (includeUndecided || vouch.getStatus() == ModerationStatus.APPROVED) {
                byNode.computeIfAbsent(vouch.getNode().getId(), id -> new ArrayList<>())
                        .add(new RoadmapNodeVouchDto(vouch.getId(), vouch.getPersonName(), vouch.getNote(), vouch.getStatus()));
            }
        }
        return byNode;
    }

    /** Vouches waiting for an admin, shaped for the shared approval queue. */
    @Transactional(readOnly = true)
    public List<ZitounaDtos.ModerationQueueItem> queueItems() {
        return vouchRepository.findForReview(ModerationStatus.PENDING).stream()
                .map(vouch -> {
                    RoadmapNode node = vouch.getNode();
                    User proposer = vouch.getProposedBy();

                    Map<String, Object> details = new LinkedHashMap<>();
                    details.put("roadmap", node.getRoadmap().getTitle());
                    details.put("roadmapId", node.getRoadmap().getId());
                    details.put("step", node.getTitle());
                    details.put("nodeId", node.getId());
                    details.put("person", vouch.getPersonName());
                    details.put("note", vouch.getNote() == null ? "" : vouch.getNote());

                    return new ZitounaDtos.ModerationQueueItem(
                            QUEUE_AREA,
                            vouch.getId(),
                            vouch.getPersonName() + " vouches for \"" + node.getTitle() + "\"",
                            proposer == null ? null : proposer.getId(),
                            proposer == null ? null : proposer.getUsername(),
                            vouch.getStatus(),
                            vouch.getCreatedAt(),
                            details);
                })
                .toList();
    }

    @Transactional
    public void decide(Long vouchId, ModerationStatus decision) {
        if (decision != ModerationStatus.APPROVED && decision != ModerationStatus.REJECTED) {
            throw new IllegalArgumentException("A vouch can only be accepted or rejected");
        }
        RoadmapNodeVouch vouch = vouchRepository.findById(vouchId)
                .orElseThrow(() -> new EntityNotFoundException("Vouch not found"));
        vouch.setStatus(decision);
        vouch.setDecidedAt(LocalDateTime.now());
        vouchRepository.save(vouch);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
