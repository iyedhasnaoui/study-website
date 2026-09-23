package com.studywebsite.service;

import com.studywebsite.dto.zitouna.ZitounaDtos;
import com.studywebsite.model.*;
import com.studywebsite.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Predicate;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ZitounaService {
    private final ForumPostRepository forumPostRepository;
    private final RoadmapRepository roadmapRepository;
    private final ResourceRepository resourceRepository;
    private final FaqEntryRepository faqEntryRepository;
    private final UserRepository userRepository;
    private final TagService tagService;
    private final LearningMaterialStorageService materialStorageService;

    @Transactional(readOnly = true)
    public List<ZitounaDtos.FeedItemResponse> feed(String query, Set<String> requestedAreas, Set<Long> tagIds) {
        String cleanQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        Set<String> areas = requestedAreas == null ? Set.of() : requestedAreas;
        Set<Long> requestedTags = tagIds == null ? Set.of() : tagIds;

        Stream<ZitounaDtos.FeedItemResponse> forum = forumPostRepository.findAll().stream()
                .filter(post -> isPublished(post.getModerationStatus()))
                .filter(post -> matchesTags(post.getTags(), requestedTags))
                .map(post -> new ZitounaDtos.FeedItemResponse(
                        "FORUM", post.getId(), post.getTitle(), excerpt(post.getContent()),
                        userId(post.getAuthor()), username(post.getAuthor()), latest(post.getUpdatedAt(), post.getCreatedAt()),
                        effectiveStatus(post.getModerationStatus()), tags(post.getTags()), null));

        Stream<ZitounaDtos.FeedItemResponse> roadmaps = roadmapRepository.findAll().stream()
                .filter(roadmap -> isPublished(roadmap.getModerationStatus()))
                .filter(roadmap -> matchesTags(roadmap.getTags(), requestedTags))
                .map(roadmap -> new ZitounaDtos.FeedItemResponse(
                        "ROADMAP", roadmap.getId(), roadmap.getTitle(), excerpt(roadmap.getDescription()),
                        userId(roadmap.getAuthor()), username(roadmap.getAuthor()), latest(roadmap.getUpdatedAt(), roadmap.getCreatedAt()),
                        effectiveStatus(roadmap.getModerationStatus()), tags(roadmap.getTags()), null));

        Stream<ZitounaDtos.FeedItemResponse> materials = resourceRepository.findAll().stream()
                .filter(resource -> isPublished(resource.getModerationStatus()))
                .filter(resource -> matchesTags(resource.getTags(), requestedTags))
                .map(resource -> new ZitounaDtos.FeedItemResponse(
                        "LEARNING_MATERIAL", resource.getId(), resource.getTitle(), excerpt(resource.getDescription()),
                        userId(resource.getAuthor()), username(resource.getAuthor()), latest(resource.getUpdatedAt(), resource.getCreatedAt()),
                        effectiveStatus(resource.getModerationStatus()), tags(resource.getTags()),
                        "/api/learning-materials/" + resource.getId() + "/content"));

        Stream<ZitounaDtos.FeedItemResponse> faq = faqEntryRepository.findByPublishedTrueOrderByUpdatedAtDesc().stream()
                .filter(entry -> requestedTags.isEmpty())
                .map(entry -> new ZitounaDtos.FeedItemResponse(
                        "FAQ", entry.getId(), entry.getQuestion(), excerpt(entry.getAnswer()), null, "IAC admins",
                        latest(entry.getUpdatedAt(), entry.getCreatedAt()), ModerationStatus.APPROVED, List.of(), null));

        Predicate<ZitounaDtos.FeedItemResponse> areaFilter = item -> areas.isEmpty() || areas.contains(item.area());
        Predicate<ZitounaDtos.FeedItemResponse> textFilter = item -> cleanQuery.isBlank()
                || contains(item.title(), cleanQuery) || contains(item.excerpt(), cleanQuery)
                || item.tags().stream().anyMatch(tag -> contains(tag.name(), cleanQuery) || tag.aliases().stream().anyMatch(alias -> contains(alias, cleanQuery)));

        return Stream.of(forum, roadmaps, materials, faq)
                .flatMap(stream -> stream)
                .filter(areaFilter)
                .filter(textFilter)
                .sorted(Comparator.comparing(ZitounaDtos.FeedItemResponse::updatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    @Transactional
    public ZitounaDtos.LearningMaterialResponse submitMaterial(
            ZitounaDtos.LearningMaterialRequest request,
            MultipartFile file,
            Long userId
    ) {
        User author = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("User not found"));
        requireActive(author);
        LearningMaterialStorageService.StoredMaterial stored = materialStorageService.store(file, request.type());
        TagService.AppliedTags selection = tagService.resolveSelection(request.tags(), List.of(), userId);

        Resource material = Resource.builder()
                .author(author)
                .title(request.title().trim())
                .description(clean(request.description()))
                .type(request.type())
                .path(stored.path())
                .originalFilename(stored.originalFilename())
                .contentType(stored.contentType())
                .sizeBytes(stored.sizeBytes())
                .gradeNote(clean(request.gradeNote()))
                .solutionApproach(clean(request.solutionApproach()))
                .methodUsed(clean(request.methodUsed()))
                .roadmapFollowed(clean(request.roadmapFollowed()))
                .moderationStatus(ModerationStatus.PENDING)
                .tags(selection.tags())
                .build();
        return materialResponse(resourceRepository.save(material));
    }

    @Transactional(readOnly = true)
    public List<ZitounaDtos.LearningMaterialResponse> listMaterials(boolean includePending, Long userId) {
        return resourceRepository.findAll().stream()
                .filter(material -> isPublished(material.getModerationStatus())
                        || (includePending && material.getAuthor() != null && Objects.equals(material.getAuthor().getId(), userId)))
                .sorted(Comparator.comparing(Resource::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::materialResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Resource requireMaterial(Long id) {
        Resource material = resourceRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Learning material not found"));
        if (!isPublished(material.getModerationStatus())) {
            throw new EntityNotFoundException("Learning material not found");
        }
        return material;
    }

    @Transactional(readOnly = true)
    public List<ZitounaDtos.FaqResponse> listFaq() {
        return faqEntryRepository.findByPublishedTrueOrderByUpdatedAtDesc().stream().map(this::faqResponse).toList();
    }

    @Transactional
    public ZitounaDtos.FaqResponse createFaq(ZitounaDtos.FaqRequest request) {
        return faqResponse(faqEntryRepository.save(FaqEntry.builder()
                .question(request.question().trim())
                .answer(request.answer().trim())
                .published(request.published() == null || request.published())
                .build()));
    }

    @Transactional
    public ZitounaDtos.FaqResponse updateFaq(Long id, ZitounaDtos.FaqRequest request) {
        FaqEntry entry = faqEntryRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("FAQ entry not found"));
        entry.setQuestion(request.question().trim());
        entry.setAnswer(request.answer().trim());
        entry.setPublished(request.published() == null || request.published());
        return faqResponse(faqEntryRepository.save(entry));
    }

    @Transactional
    public void deleteFaq(Long id) {
        if (!faqEntryRepository.existsById(id)) throw new EntityNotFoundException("FAQ entry not found");
        faqEntryRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ZitounaDtos.ModerationQueueItem> moderationQueue() {
        Stream<ZitounaDtos.ModerationQueueItem> forum = forumPostRepository.findAll().stream()
                .filter(post -> needsReview(post.getModerationStatus()))
                .map(post -> queueItem("FORUM", post.getId(), post.getTitle(), post.getAuthor(),
                        post.getModerationStatus(), post.getCreatedAt(), Map.of("content", safe(post.getContent()))));
        Stream<ZitounaDtos.ModerationQueueItem> roadmaps = roadmapRepository.findAll().stream()
                .filter(roadmap -> needsReview(roadmap.getModerationStatus()))
                .map(roadmap -> queueItem("ROADMAP", roadmap.getId(), roadmap.getTitle(), roadmap.getAuthor(),
                        roadmap.getModerationStatus(), roadmap.getCreatedAt(), Map.of("description", safe(roadmap.getDescription()))));
        Stream<ZitounaDtos.ModerationQueueItem> materials = resourceRepository.findAll().stream()
                .filter(material -> needsReview(material.getModerationStatus()))
                .map(material -> queueItem("LEARNING_MATERIAL", material.getId(), material.getTitle(), material.getAuthor(),
                        material.getModerationStatus(), material.getCreatedAt(), Map.of(
                                "grade", safe(material.getGradeNote()),
                                "solutionApproach", safe(material.getSolutionApproach()),
                                "method", safe(material.getMethodUsed()),
                                "roadmap", safe(material.getRoadmapFollowed()),
                                "filename", safe(material.getOriginalFilename()))));
        return Stream.of(forum, roadmaps, materials).flatMap(stream -> stream)
                .sorted(Comparator.comparing(ZitounaDtos.ModerationQueueItem::submittedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    @Transactional
    public void moderate(String area, Long id, ModerationStatus status, String note) {
        if (status != ModerationStatus.APPROVED && status != ModerationStatus.REJECTED && status != ModerationStatus.NEEDS_FIXING) {
            throw new IllegalArgumentException("Unsupported moderation decision");
        }
        switch (area.toUpperCase(Locale.ROOT)) {
            case "FORUM" -> {
                ForumPost post = forumPostRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Forum post not found"));
                post.setModerationStatus(status);
                post.setModerationNote(clean(note));
                forumPostRepository.save(post);
            }
            case "ROADMAP" -> {
                Roadmap roadmap = roadmapRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Roadmap not found"));
                roadmap.setModerationStatus(status);
                roadmap.setModerationNote(clean(note));
                roadmapRepository.save(roadmap);
            }
            case "LEARNING_MATERIAL" -> {
                Resource resource = resourceRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Learning material not found"));
                resource.setModerationStatus(status);
                resource.setModerationNote(clean(note));
                resourceRepository.save(resource);
            }
            default -> throw new IllegalArgumentException("Unknown moderation area");
        }
    }

    @Transactional
    public void setUserBanned(Long userId, boolean banned) {
        User user = userRepository.findById(userId).orElseThrow(() -> new EntityNotFoundException("User not found"));
        user.setBanned(banned);
        userRepository.save(user);
    }

    @Transactional
    public int markContentThatBreaksCurrentTagRules() {
        int changed = 0;
        for (ForumPost post : forumPostRepository.findAll()) {
            if (isPublished(post.getModerationStatus()) && !tagService.followsCurrentRules(post.getTags())) {
                post.setModerationStatus(ModerationStatus.NEEDS_FIXING);
                post.setModerationNote("Tag requirements changed; please update this contribution.");
                forumPostRepository.save(post);
                changed++;
            }
        }
        for (Roadmap roadmap : roadmapRepository.findAll()) {
            if (isPublished(roadmap.getModerationStatus()) && !tagService.followsCurrentRules(roadmap.getTags())) {
                roadmap.setModerationStatus(ModerationStatus.NEEDS_FIXING);
                roadmap.setModerationNote("Tag requirements changed; please update this contribution.");
                roadmapRepository.save(roadmap);
                changed++;
            }
        }
        for (Resource material : resourceRepository.findAll()) {
            if (isPublished(material.getModerationStatus()) && !tagService.followsCurrentRules(material.getTags())) {
                material.setModerationStatus(ModerationStatus.NEEDS_FIXING);
                material.setModerationNote("Tag requirements changed; please update this contribution.");
                resourceRepository.save(material);
                changed++;
            }
        }
        return changed;
    }

    private ZitounaDtos.LearningMaterialResponse materialResponse(Resource material) {
        return new ZitounaDtos.LearningMaterialResponse(
                material.getId(), material.getTitle(), material.getDescription(), material.getType(),
                material.getOriginalFilename(), material.getContentType(), material.getSizeBytes(),
                material.getGradeNote(), material.getSolutionApproach(), material.getMethodUsed(), material.getRoadmapFollowed(),
                userId(material.getAuthor()), username(material.getAuthor()), effectiveStatus(material.getModerationStatus()),
                tags(material.getTags()), "/api/learning-materials/" + material.getId() + "/content",
                material.getCreatedAt(), material.getUpdatedAt());
    }

    private ZitounaDtos.FaqResponse faqResponse(FaqEntry entry) {
        return new ZitounaDtos.FaqResponse(entry.getId(), entry.getQuestion(), entry.getAnswer(), entry.getPublished(),
                entry.getCreatedAt(), entry.getUpdatedAt());
    }

    private ZitounaDtos.ModerationQueueItem queueItem(String area, Long id, String title, User author,
                                                       ModerationStatus status, LocalDateTime submittedAt,
                                                       Map<String, Object> details) {
        return new ZitounaDtos.ModerationQueueItem(area, id, title, userId(author), username(author),
                effectiveStatus(status), submittedAt, details);
    }

    private List<ZitounaDtos.TagResponse> tags(Set<ZitounaTag> tags) {
        if (tags == null) return List.of();
        return tags.stream().sorted(Comparator.comparing(ZitounaTag::getName)).map(tagService::toResponse).toList();
    }

    private boolean matchesTags(Set<ZitounaTag> tags, Set<Long> requested) {
        if (requested.isEmpty()) return true;
        if (tags == null) return false;
        Set<Long> actual = new HashSet<>();
        for (ZitounaTag tag : tags) {
            actual.add(tag.getId());
            ZitounaTag parent = tag.getParent();
            while (parent != null) {
                actual.add(parent.getId());
                parent = parent.getParent();
            }
        }
        return actual.containsAll(requested);
    }

    private boolean isPublished(ModerationStatus status) {
        return status == null || status == ModerationStatus.APPROVED;
    }

    private boolean needsReview(ModerationStatus status) {
        return status == ModerationStatus.PENDING || status == ModerationStatus.NEEDS_FIXING;
    }

    private ModerationStatus effectiveStatus(ModerationStatus status) {
        return status == null ? ModerationStatus.APPROVED : status;
    }

    private void requireActive(User user) {
        if (Boolean.TRUE.equals(user.getBanned())) throw new IllegalArgumentException("This account is not allowed to contribute");
    }

    private Long userId(User user) {
        return user == null ? null : user.getId();
    }

    private String username(User user) {
        return user == null ? null : user.getUsername();
    }

    private LocalDateTime latest(LocalDateTime updated, LocalDateTime created) {
        return updated == null ? created : updated;
    }

    private String excerpt(String value) {
        String clean = safe(value).strip().replaceAll("\\s+", " ");
        return clean.length() <= 260 ? clean : clean.substring(0, 257) + "...";
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }
}
