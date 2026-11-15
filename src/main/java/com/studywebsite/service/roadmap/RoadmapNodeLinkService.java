package com.studywebsite.service.roadmap;

import com.studywebsite.dto.RoadmapGraphSaveDto;
import com.studywebsite.dto.RoadmapLinkSuggestionDto;
import com.studywebsite.dto.RoadmapNodeLinkDto;
import com.studywebsite.model.FaqEntry;
import com.studywebsite.model.ForumPost;
import com.studywebsite.model.ModerationStatus;
import com.studywebsite.model.Resource;
import com.studywebsite.model.Roadmap;
import com.studywebsite.model.RoadmapLinkKind;
import com.studywebsite.model.RoadmapLinkTarget;
import com.studywebsite.model.RoadmapNode;
import com.studywebsite.model.RoadmapNodeLink;
import com.studywebsite.model.ZitounaTag;
import com.studywebsite.repository.FaqEntryRepository;
import com.studywebsite.repository.ForumPostRepository;
import com.studywebsite.repository.ResourceRepository;
import com.studywebsite.repository.RoadmapNodeLinkRepository;
import com.studywebsite.repository.RoadmapRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The links part of a roadmap node: what connects a step to the rest of Zitun and to the web.
 * Internal links are stored by type and id and resolved on every read, so a renamed target shows
 * its new title and a deleted or unpublished one is never shown to readers.
 */
@Service
@RequiredArgsConstructor
public class RoadmapNodeLinkService {

    static final int MAX_LINKS_PER_NODE = 20;
    private static final int MAX_SUGGESTIONS_PER_TYPE = 30;

    private final RoadmapNodeLinkRepository linkRepository;
    private final RoadmapRepository roadmapRepository;
    private final ForumPostRepository forumPostRepository;
    private final ResourceRepository resourceRepository;
    private final FaqEntryRepository faqEntryRepository;

    /** What a link's target looks like right now. */
    private record Target(String title, boolean available, Integer replyCount, Set<ZitounaTag> tags) {
    }

    /**
     * Validates one node's links and turns them into unsaved entities, so a bad link rejects the
     * whole save before anything is written.
     */
    @Transactional(readOnly = true)
    public List<RoadmapNodeLink> prepare(Long roadmapId, String nodeTitle, List<RoadmapGraphSaveDto.LinkInput> inputs) {
        if (inputs == null || inputs.isEmpty()) return List.of();
        if (inputs.size() > MAX_LINKS_PER_NODE) {
            throw new InvalidRoadmapGraphException("\"" + nodeTitle + "\" has " + inputs.size()
                    + " links; a node can carry at most " + MAX_LINKS_PER_NODE);
        }

        Map<RoadmapLinkTarget, Map<Long, Target>> targets = resolve(inputs.stream()
                .filter(input -> input.getKind() == RoadmapLinkKind.INTERNAL)
                .filter(input -> input.getTargetType() != null && input.getTargetId() != null)
                .map(input -> new TargetKey(input.getTargetType(), input.getTargetId()))
                .toList());

        List<RoadmapNodeLink> links = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (RoadmapGraphSaveDto.LinkInput input : inputs) {
            RoadmapNodeLink link = input.getKind() == RoadmapLinkKind.INTERNAL
                    ? internalLink(roadmapId, nodeTitle, input, targets)
                    : externalLink(nodeTitle, input);

            String identity = link.getKind() == RoadmapLinkKind.INTERNAL
                    ? link.getTargetType() + ":" + link.getTargetId()
                    : link.getUrl();
            if (seen.add(identity)) {
                link.setSortOrder(links.size());
                links.add(link);
            }
        }
        return links;
    }

    /** Replaces the node's links with ones from {@link #prepare}. */
    @Transactional
    public void replace(RoadmapNode node, List<RoadmapNodeLink> links) {
        if (node.getId() != null) {
            linkRepository.deleteAll(linkRepository.findByNode_IdOrderBySortOrderAscIdAsc(node.getId()));
        }
        for (RoadmapNodeLink link : links) {
            link.setNode(node);
        }
        linkRepository.saveAll(links);
    }

    @Transactional
    public void deleteForNodes(Collection<Long> nodeIds) {
        if (nodeIds.isEmpty()) return;
        linkRepository.deleteAll(linkRepository.findByNode_IdIn(nodeIds));
        linkRepository.flush();
    }

    /** Gives {@code to} the same links as {@code from}, used when a branch becomes its own roadmap. */
    @Transactional
    public void copy(Long fromNodeId, RoadmapNode to) {
        List<RoadmapNodeLink> copies = linkRepository.findByNode_IdOrderBySortOrderAscIdAsc(fromNodeId).stream()
                .map(source -> {
                    RoadmapNodeLink copy = new RoadmapNodeLink();
                    copy.setNode(to);
                    copy.setKind(source.getKind());
                    copy.setTargetType(source.getTargetType());
                    copy.setTargetId(source.getTargetId());
                    copy.setUrl(source.getUrl());
                    copy.setLabel(source.getLabel());
                    copy.setSortOrder(source.getSortOrder());
                    return copy;
                })
                .toList();
        linkRepository.saveAll(copies);
    }

    /**
     * Every node's links, keyed by node id. Readers never see links whose target is gone or not
     * published; editors do, flagged as unavailable, so they can remove them.
     */
    @Transactional(readOnly = true)
    public Map<Long, List<RoadmapNodeLinkDto>> linksByNode(Long roadmapId, boolean includeUnavailable) {
        List<RoadmapNodeLink> links = linkRepository.findByNode_Roadmap_IdOrderBySortOrderAscIdAsc(roadmapId);
        if (links.isEmpty()) return Map.of();

        Set<Long> roadmapTags = roadmapTagIds(roadmapId);
        Map<RoadmapLinkTarget, Map<Long, Target>> targets = resolve(links.stream()
                .filter(link -> link.getKind() == RoadmapLinkKind.INTERNAL)
                .map(link -> new TargetKey(link.getTargetType(), link.getTargetId()))
                .toList());

        Map<Long, List<RoadmapNodeLinkDto>> byNode = new LinkedHashMap<>();
        for (RoadmapNodeLink link : links) {
            RoadmapNodeLinkDto dto = toDto(link, targets, roadmapTags);
            if (dto.available() || includeUnavailable) {
                byNode.computeIfAbsent(link.getNode().getId(), id -> new ArrayList<>()).add(dto);
            }
        }
        return byNode;
    }

    /**
     * Published content on Zitun that carries every tag of the roadmap — the same rule the
     * filtered Zitouna feed uses — for the editor to pick links from.
     */
    @Transactional(readOnly = true)
    public List<RoadmapLinkSuggestionDto> suggestions(Long roadmapId) {
        Set<Long> required = roadmapTagIds(roadmapId);
        // Without tags every item would match, which is no suggestion at all.
        if (required.isEmpty()) return List.of();

        List<RoadmapLinkSuggestionDto> suggestions = new ArrayList<>();

        forumPostRepository.findAll().stream()
                .filter(post -> isPublished(post.getModerationStatus()))
                .filter(post -> carriesAll(post.getTags(), required))
                .sorted(Comparator.comparing(ForumPost::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_SUGGESTIONS_PER_TYPE)
                .forEach(post -> suggestions.add(new RoadmapLinkSuggestionDto(
                        RoadmapLinkTarget.FORUM, post.getId(), post.getTitle(), replyCount(post))));

        resourceRepository.findAll().stream()
                .filter(material -> isPublished(material.getModerationStatus()))
                .filter(material -> carriesAll(material.getTags(), required))
                .sorted(Comparator.comparing(Resource::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_SUGGESTIONS_PER_TYPE)
                .forEach(material -> suggestions.add(new RoadmapLinkSuggestionDto(
                        RoadmapLinkTarget.LEARNING_MATERIAL, material.getId(), material.getTitle(), null)));

        faqEntryRepository.findByPublishedTrueOrderByUpdatedAtDesc().stream()
                .filter(entry -> carriesAll(entry.getTags(), required))
                .limit(MAX_SUGGESTIONS_PER_TYPE)
                .forEach(entry -> suggestions.add(new RoadmapLinkSuggestionDto(
                        RoadmapLinkTarget.FAQ, entry.getId(), entry.getQuestion(), null)));

        roadmapRepository.findAll().stream()
                .filter(other -> !other.getId().equals(roadmapId))
                .filter(other -> isPublished(other.getModerationStatus()))
                .filter(other -> carriesAll(other.getTags(), required))
                .sorted(Comparator.comparing(Roadmap::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(MAX_SUGGESTIONS_PER_TYPE)
                .forEach(other -> suggestions.add(new RoadmapLinkSuggestionDto(
                        RoadmapLinkTarget.ROADMAP, other.getId(), other.getTitle(), null)));

        return suggestions;
    }

    // --- building links -------------------------------------------------------

    private RoadmapNodeLink internalLink(
            Long roadmapId,
            String nodeTitle,
            RoadmapGraphSaveDto.LinkInput input,
            Map<RoadmapLinkTarget, Map<Long, Target>> targets) {

        if (input.getTargetType() == null || input.getTargetId() == null) {
            throw new InvalidRoadmapGraphException(
                    "\"" + nodeTitle + "\" has a link to Zitun content without saying which content");
        }
        if (input.getTargetType() == RoadmapLinkTarget.ROADMAP && input.getTargetId().equals(roadmapId)) {
            throw new InvalidRoadmapGraphException("\"" + nodeTitle + "\" links to the roadmap it is part of");
        }

        Target target = targets.getOrDefault(input.getTargetType(), Map.of()).get(input.getTargetId());
        if (target == null || !target.available()) {
            throw new InvalidRoadmapGraphException("\"" + nodeTitle + "\" links to " + describe(input.getTargetType())
                    + " that is no longer available. Remove that link before saving");
        }

        RoadmapNodeLink link = new RoadmapNodeLink();
        link.setKind(RoadmapLinkKind.INTERNAL);
        link.setTargetType(input.getTargetType());
        link.setTargetId(input.getTargetId());
        link.setLabel(truncate(target.title(), 300));
        return link;
    }

    private RoadmapNodeLink externalLink(String nodeTitle, RoadmapGraphSaveDto.LinkInput input) {
        String url = input.getUrl() == null ? "" : input.getUrl().trim();
        URI uri;
        try {
            uri = new URI(url);
        } catch (URISyntaxException invalid) {
            uri = null;
        }
        // Only web addresses: anything else (javascript:, data:, file:) is not a page and could run code.
        String scheme = uri == null || uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (uri == null || !(scheme.equals("http") || scheme.equals("https")) || uri.getHost() == null) {
            throw new InvalidRoadmapGraphException("\"" + nodeTitle + "\" has a link that is not a web address "
                    + "starting with http:// or https://" + (url.isEmpty() ? "" : ": " + truncate(url, 80)));
        }

        String label = input.getLabel() == null ? "" : input.getLabel().trim();
        RoadmapNodeLink link = new RoadmapNodeLink();
        link.setKind(RoadmapLinkKind.EXTERNAL);
        link.setUrl(url);
        link.setLabel(label.isEmpty() ? uri.getHost() : label);
        return link;
    }

    private RoadmapNodeLinkDto toDto(
            RoadmapNodeLink link,
            Map<RoadmapLinkTarget, Map<Long, Target>> targets,
            Set<Long> roadmapTags) {

        if (link.getKind() == RoadmapLinkKind.EXTERNAL) {
            return new RoadmapNodeLinkDto(link.getId(), link.getKind(), null, null,
                    link.getUrl(), link.getLabel(), false, true, null);
        }

        Target target = targets.getOrDefault(link.getTargetType(), Map.of()).get(link.getTargetId());
        boolean available = target != null && target.available();
        boolean insideTag = available && !roadmapTags.isEmpty() && carriesAll(target.tags(), roadmapTags);
        return new RoadmapNodeLinkDto(link.getId(), link.getKind(), link.getTargetType(), link.getTargetId(), null,
                available ? target.title() : link.getLabel(), insideTag, available,
                available ? target.replyCount() : null);
    }

    // --- resolving targets ----------------------------------------------------

    private record TargetKey(RoadmapLinkTarget type, Long id) {
    }

    /** Looks every target up with one query per content type. */
    private Map<RoadmapLinkTarget, Map<Long, Target>> resolve(Collection<TargetKey> keys) {
        Map<RoadmapLinkTarget, Set<Long>> idsByType = new EnumMap<>(RoadmapLinkTarget.class);
        for (TargetKey key : keys) {
            idsByType.computeIfAbsent(key.type(), type -> new LinkedHashSet<>()).add(key.id());
        }

        Map<RoadmapLinkTarget, Map<Long, Target>> resolved = new EnumMap<>(RoadmapLinkTarget.class);
        idsByType.forEach((type, ids) -> resolved.put(type, switch (type) {
            case FORUM -> forumPostRepository.findAllById(ids).stream().collect(Collectors.toMap(
                    ForumPost::getId,
                    post -> new Target(post.getTitle(), isPublished(post.getModerationStatus()),
                            replyCount(post), post.getTags())));
            case LEARNING_MATERIAL -> resourceRepository.findAllById(ids).stream().collect(Collectors.toMap(
                    Resource::getId,
                    material -> new Target(material.getTitle(), isPublished(material.getModerationStatus()),
                            null, material.getTags())));
            case FAQ -> faqEntryRepository.findAllById(ids).stream().collect(Collectors.toMap(
                    FaqEntry::getId,
                    entry -> new Target(entry.getQuestion(), Boolean.TRUE.equals(entry.getPublished()),
                            null, entry.getTags())));
            case ROADMAP -> roadmapRepository.findAllById(ids).stream().collect(Collectors.toMap(
                    Roadmap::getId,
                    other -> new Target(other.getTitle(), isPublished(other.getModerationStatus()),
                            null, other.getTags())));
        }));
        return resolved;
    }

    private Set<Long> roadmapTagIds(Long roadmapId) {
        Roadmap roadmap = roadmapRepository.findByIdWithTags(roadmapId)
                .orElseThrow(() -> new EntityNotFoundException("Roadmap entity not found"));
        return roadmap.getTags() == null ? Set.of() : roadmap.getTags().stream()
                .map(ZitounaTag::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    /** Same tag rule as the Zitouna feed: a tag also counts as carrying each of its parents. */
    private static boolean carriesAll(Set<ZitounaTag> tags, Set<Long> required) {
        if (tags == null || tags.isEmpty()) return false;
        Set<Long> carried = new HashSet<>();
        for (ZitounaTag tag : tags) {
            for (ZitounaTag current = tag; current != null; current = current.getParent()) {
                carried.add(current.getId());
            }
        }
        return carried.containsAll(required);
    }

    private static boolean isPublished(ModerationStatus status) {
        return status == null || status == ModerationStatus.APPROVED;
    }

    private static Integer replyCount(ForumPost post) {
        return post.getReplies() == null ? 0 : post.getReplies().size();
    }

    private static String describe(RoadmapLinkTarget type) {
        return switch (type) {
            case FORUM -> "a forum thread";
            case LEARNING_MATERIAL -> "a learning material";
            case FAQ -> "an FAQ entry";
            case ROADMAP -> "a roadmap";
        };
    }

    private static String truncate(String value, int max) {
        if (value == null) return null;
        return value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }
}
