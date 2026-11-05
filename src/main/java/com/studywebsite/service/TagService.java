package com.studywebsite.service;

import com.studywebsite.dto.TagProposalDto;
import com.studywebsite.dto.TagSelectionDto;
import com.studywebsite.dto.zitouna.ZitounaDtos;
import com.studywebsite.model.*;
import com.studywebsite.repository.TagTypeDefinitionRepository;
import com.studywebsite.repository.UserRepository;
import com.studywebsite.repository.ZitounaTagRepository;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagTypeDefinitionRepository typeRepository;
    private final ZitounaTagRepository tagRepository;
    private final UserRepository userRepository;

    @PostConstruct
    @Transactional
    public void seedTaxonomy() {
        if (typeRepository.count() > 0) return;

        TagTypeDefinition university = saveType("University", TagField.INSTITUTION, 0, 0);
        saveType("Company", TagField.INSTITUTION, 0, 0);
        saveType("Research institute", TagField.INSTITUTION, 0, 0);
        saveType("Bachelor", TagField.PROGRAM, 1, 0);
        saveType("Master", TagField.PROGRAM, 1, 0);
        saveType("Scholarship", TagField.PROGRAM, 1, 0);
        saveType("Werkstudent", TagField.PROGRAM, 1, 0);
        TagTypeDefinition exchange = saveType("Exchange", TagField.PROGRAM, 2, 0);
        saveType("Double degree", TagField.PROGRAM, 2, 0);
        TagTypeDefinition course = saveType("Course", TagField.TOPIC, 1, 1);
        saveType("Process", TagField.TOPIC, 1, 1);
        saveType("Step", TagField.TOPIC, 1, 1);
        saveType("Subtopic", TagField.SUBTOPIC, 0, 0);

        saveApprovedTag("TUM", university, null, "TU München,Technical University of Munich");
        saveApprovedTag("University of Singapore", university, null, "NUS,National University of Singapore");
        saveApprovedTag("Exchange program", exchange, null, "Austauschprogramm");
        saveApprovedTag("Analysis 1", course, null, "Calculus 1");
    }

    @Transactional(readOnly = true)
    public List<ZitounaDtos.TagTypeResponse> listTypes() {
        return typeRepository.findByActiveTrueOrderByFieldAscNameAsc().stream().map(this::toResponse).toList();
    }

    @Transactional
    public ZitounaDtos.TagTypeResponse createType(ZitounaDtos.TagTypeRequest request) {
        typeRepository.findByNameIgnoreCase(request.name().trim()).ifPresent(existing -> {
            throw new IllegalArgumentException("A tag type with this name already exists");
        });
        return toResponse(typeRepository.save(TagTypeDefinition.builder()
                .name(request.name().trim())
                .field(request.field())
                .minimumInstitutions(orZero(request.minimumInstitutions()))
                .minimumPrograms(orZero(request.minimumPrograms()))
                .active(request.active() == null || request.active())
                .build()));
    }

    @Transactional
    public ZitounaDtos.TagTypeResponse updateType(Long id, ZitounaDtos.TagTypeRequest request) {
        TagTypeDefinition type = typeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Tag type not found"));
        typeRepository.findByNameIgnoreCase(request.name().trim())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("A tag type with this name already exists");
                });
        type.setName(request.name().trim());
        type.setField(request.field());
        type.setMinimumInstitutions(orZero(request.minimumInstitutions()));
        type.setMinimumPrograms(orZero(request.minimumPrograms()));
        type.setActive(request.active() == null || request.active());
        return toResponse(typeRepository.save(type));
    }

    @Transactional(readOnly = true)
    public List<ZitounaDtos.TagResponse> listTags(TagStatus status, TagField field, String query) {
        String cleanQuery = query == null || query.isBlank() ? null : query.trim();
        return tagRepository.search(status == null ? TagStatus.APPROVED : status, field, cleanQuery)
                .stream().map(this::toResponse).toList();
    }

    @Transactional
    public ZitounaDtos.TagResponse propose(ZitounaDtos.TagProposalRequest request, Long userId) {
        ZitounaTag parent = requireValidParent(request.field(), request.parentId());
        Optional<ZitounaTag> existing = findExisting(request.name(), parent);
        if (existing.isPresent()) {
            ZitounaTag tag = existing.get();
            if (tag.getType().getField() != request.field()) {
                throw new IllegalArgumentException(tag.getName() + " is already a "
                        + tag.getType().getField().name().toLowerCase() + " tag");
            }
            if (tag.getStatus() == TagStatus.REJECTED) {
                throw new IllegalArgumentException("This tag was rejected and cannot be proposed again");
            }
            throw new IllegalArgumentException(tag.getStatus() == TagStatus.APPROVED
                    ? "An approved tag with this name already exists"
                    : "A proposal with this name is already awaiting review");
        }

        TagTypeDefinition type = defaultType(request.field());
        User proposer = userId == null ? null : userRepository.findById(userId).orElse(null);
        ZitounaTag tag = ZitounaTag.builder()
                .name(request.name().trim())
                .normalizedName(normalize(request.name()))
                .type(type)
                .parent(parent)
                .status(TagStatus.PROPOSED)
                .proposedBy(proposer)
                .build();
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public ZitounaDtos.TagResponse createApprovedTag(ZitounaDtos.TagCreateRequest request) {
        TagTypeDefinition type = typeRepository.findById(request.typeId())
                .orElseThrow(() -> new EntityNotFoundException("Tag type not found"));
        if (!Boolean.TRUE.equals(type.getActive())) {
            throw new IllegalArgumentException("Tags can only use an active tag type");
        }
        ZitounaTag parent = requireValidParent(type.getField(), request.parentId());
        if (findExisting(request.name(), parent).isPresent()) {
            throw new IllegalArgumentException("A tag with this name already exists");
        }
        ZitounaTag tag = ZitounaTag.builder()
                .name(request.name().trim())
                .normalizedName(normalize(request.name()))
                .type(type)
                .parent(parent)
                .status(TagStatus.APPROVED)
                .aliases(joinAliases(request.aliases()))
                .build();
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public ZitounaDtos.TagResponse approve(Long tagId, ZitounaDtos.TagDecisionRequest request) {
        ZitounaTag tag = requireTag(tagId);
        TagTypeDefinition type = typeRepository.findById(request.typeId())
                .orElseThrow(() -> new EntityNotFoundException("Tag type not found"));
        if (!Boolean.TRUE.equals(type.getActive()) || type.getField() != tag.getType().getField()) {
            throw new IllegalArgumentException("A proposed tag must be approved with an active type in its field");
        }
        requireValidParent(type.getField(), tag.getParent() == null ? null : tag.getParent().getId());
        tag.setType(type);
        tag.setAliases(joinAliases(request.aliases()));
        tag.setDecisionReason(request.reason());
        tag.setStatus(TagStatus.APPROVED);
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public ZitounaDtos.TagResponse reject(Long tagId, ZitounaDtos.ModerationDecisionRequest request) {
        ZitounaTag tag = requireTag(tagId);
        tag.setStatus(TagStatus.REJECTED);
        tag.setDecisionReason(request == null ? null : request.note());
        return toResponse(tagRepository.save(tag));
    }

    @Transactional
    public AppliedTags resolveSelection(TagSelectionDto selection, List<String> legacyNames, Long userId) {
        LinkedHashSet<ZitounaTag> tags = new LinkedHashSet<>();
        ZitounaTag home = null;
        ZitounaTag partner = null;

        if (selection != null) {
            home = resolveApproved(selection.getHomeInstitutionId(), TagField.INSTITUTION, false);
            partner = resolveApproved(selection.getPartnerInstitutionId(), TagField.INSTITUTION, false);
            if (home != null) tags.add(home);
            if (partner != null) tags.add(partner);

            // Validate home and partner are distinct when both are provided
            if (home != null && partner != null && home.getId().equals(partner.getId())) {
                throw new IllegalArgumentException("Home and partner institutions must be distinct");
            }

            // Filter out home/partner IDs from institutionIds to avoid duplicate lookups
            List<Long> institutionIds = filterInstitutionIds(selection.getInstitutionIds(), home, partner);
            addIds(tags, institutionIds, TagField.INSTITUTION);
            addIds(tags, selection.getProgramIds(), TagField.PROGRAM);
            addIds(tags, selection.getTopicIds(), TagField.TOPIC);
            addIds(tags, selection.getSubtopicIds(), TagField.SUBTOPIC);

            for (TagProposalDto proposal : safe(selection.getProposals())) {
                ZitounaDtos.TagResponse created = propose(new ZitounaDtos.TagProposalRequest(
                        proposal.getName(), proposal.getField(), proposal.getParentId()), userId);
                tags.add(requireTag(created.id()));
            }
        }

        for (String legacyName : safe(legacyNames)) {
            if (legacyName == null || legacyName.isBlank()) continue;
            Optional<ZitounaTag> existing = findExisting(legacyName, null);
            ZitounaTag tag;
            if (existing.isPresent()) {
                tag = existing.get();
                if (tags.contains(tag)) continue;
                if (tag.getStatus() != TagStatus.APPROVED) {
                    String state = tag.getStatus() == TagStatus.REJECTED
                            ? "rejected" : "awaiting admin approval";
                    throw new IllegalArgumentException("Tag is " + state);
                }
            } else {
                ZitounaDtos.TagResponse proposed = propose(
                        new ZitounaDtos.TagProposalRequest(legacyName.trim(), TagField.TOPIC, null), userId);
                tag = requireTag(proposed.id());
            }
            tags.add(tag);
        }

        validateRules(tags);
        if (tags.isEmpty()) {
            throw new IllegalArgumentException("At least one tag is required");
        }
        boolean needsTwoNamedInstitutions = tags.stream()
                .filter(tag -> tag.getStatus() == TagStatus.APPROVED)
                .anyMatch(tag -> orZero(tag.getType().getMinimumInstitutions()) >= 2);
        if (needsTwoNamedInstitutions && (home == null || partner == null)) {
            throw new IllegalArgumentException("Exchange and double-degree content needs distinct home and partner institutions");
        }
        return new AppliedTags(tags, home, partner);
    }

    @Transactional(readOnly = true)
    public ZitounaDtos.TagResponse toResponse(ZitounaTag tag) {
        return new ZitounaDtos.TagResponse(
                tag.getId(),
                tag.getName(),
                tag.getType().getField(),
                tag.getType().getName(),
                tag.getParent() == null ? null : tag.getParent().getId(),
                tag.getParent() == null ? null : tag.getParent().getName(),
                tag.getStatus(),
                splitAliases(tag.getAliases()),
                tag.getDecisionReason()
        );
    }

    private void validateRules(Set<ZitounaTag> tags) {
        Set<ZitounaTag> inherited = new LinkedHashSet<>();
        for (ZitounaTag selected : tags) {
            ZitounaTag current = selected;
            while (current != null) {
                if (current.getStatus() == TagStatus.APPROVED) inherited.add(current);
                current = current.getParent();
            }
        }
        long institutions = inherited.stream().filter(tag -> tag.getType().getField() == TagField.INSTITUTION).count();
        long programs = inherited.stream().filter(tag -> tag.getType().getField() == TagField.PROGRAM).count();

        for (ZitounaTag tag : inherited) {
            TagTypeDefinition type = tag.getType();
            if (institutions < orZero(type.getMinimumInstitutions())) {
                throw new IllegalArgumentException(tag.getName() + " requires at least "
                        + type.getMinimumInstitutions() + " institution tag(s)");
            }
            if (programs < orZero(type.getMinimumPrograms())) {
                throw new IllegalArgumentException(tag.getName() + " requires at least "
                        + type.getMinimumPrograms() + " program or position tag(s)");
            }
        }
    }

    public boolean followsCurrentRules(Set<ZitounaTag> tags) {
        try {
            validateRules(tags == null ? Set.of() : tags);
            return true;
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }

    private ZitounaTag requireValidParent(TagField field, Long parentId) {
        if (field != TagField.SUBTOPIC) {
            if (parentId != null) throw new IllegalArgumentException("Only subtopics can have a parent tag");
            return null;
        }
        if (parentId == null) throw new IllegalArgumentException("A subtopic must belong to a topic or subtopic");
        ZitounaTag parent = requireTag(parentId);
        if (parent.getStatus() != TagStatus.APPROVED) {
            throw new IllegalArgumentException("A subtopic must have an approved parent");
        }
        TagField parentField = parent.getType().getField();
        if (parentField == TagField.TOPIC) return parent;
        if (parentField == TagField.SUBTOPIC && parent.getParent() != null
                && parent.getParent().getType().getField() == TagField.TOPIC) return parent;
        throw new IllegalArgumentException("Only two subtopic levels are supported");
    }

    private void addIds(Set<ZitounaTag> target, List<Long> ids, TagField field) {
        for (Long id : safe(ids)) {
            target.add(resolveApproved(id, field, true));
        }
    }

    private ZitounaTag resolveApproved(Long id, TagField field, boolean failWhenMissing) {
        if (id == null) return null;
        ZitounaTag tag = tagRepository.findById(id).orElse(null);
        if (tag == null) {
            if (failWhenMissing) throw new EntityNotFoundException("Tag not found");
            return null;
        }
        if (tag.getStatus() != TagStatus.APPROVED) {
            if (failWhenMissing) {
                String reason = tag.getStatus() == TagStatus.REJECTED ? "rejected" : "awaiting admin approval";
                throw new IllegalArgumentException("Tag is " + reason);
            }
            return null;
        }
        if (tag.getType().getField() != field) {
            if (failWhenMissing) {
                throw new IllegalArgumentException(tag.getName() + " is a " + tag.getType().getField().name().toLowerCase()
                        + " tag and cannot be used as " + field.name().toLowerCase());
            }
            return null;
        }
        return tag;
    }

    private Optional<ZitounaTag> findExisting(String name, ZitounaTag parent) {
        String normalized = normalize(name);
        return parent == null
                ? tagRepository.findByNormalizedNameAndParentIsNull(normalized)
                : tagRepository.findByNormalizedNameAndParent_Id(normalized, parent.getId());
    }

    private ZitounaTag requireTag(Long id) {
        return tagRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Tag not found"));
    }

    private TagTypeDefinition defaultType(TagField field) {
        return typeRepository.findByFieldAndActiveTrueOrderByNameAsc(field).stream().findFirst()
                .orElseThrow(() -> new IllegalStateException("No active tag type is configured for " + field));
    }

    private TagTypeDefinition saveType(String name, TagField field, int institutions, int programs) {
        return typeRepository.save(TagTypeDefinition.builder()
                .name(name)
                .field(field)
                .minimumInstitutions(institutions)
                .minimumPrograms(programs)
                .active(true)
                .build());
    }

    private void saveApprovedTag(String name, TagTypeDefinition type, ZitounaTag parent, String aliases) {
        tagRepository.save(ZitounaTag.builder()
                .name(name)
                .normalizedName(normalize(name))
                .type(type)
                .parent(parent)
                .status(TagStatus.APPROVED)
                .aliases(aliases)
                .build());
    }

    private ZitounaDtos.TagTypeResponse toResponse(TagTypeDefinition type) {
        return new ZitounaDtos.TagTypeResponse(type.getId(), type.getName(), type.getField(),
                type.getMinimumInstitutions(), type.getMinimumPrograms(), type.getActive());
    }

    private String normalize(String value) {
        String withoutAccents = Normalizer.normalize(value == null ? "" : value.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return withoutAccents.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private String joinAliases(List<String> aliases) {
        if (aliases == null) return null;
        return aliases.stream().filter(Objects::nonNull).map(String::trim).filter(value -> !value.isBlank())
                .distinct().collect(Collectors.joining(","));
    }

    private List<String> splitAliases(String aliases) {
        if (aliases == null || aliases.isBlank()) return List.of();
        return Arrays.stream(aliases.split(",")).map(String::trim).filter(value -> !value.isBlank()).toList();
    }

    private int orZero(Integer value) {
        return value == null ? 0 : value;
    }

    private <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }

    private List<Long> filterInstitutionIds(List<Long> institutionIds, ZitounaTag home, ZitounaTag partner) {
        return safe(institutionIds).stream()
                .filter(id -> home == null || !id.equals(home.getId()))
                .filter(id -> partner == null || !id.equals(partner.getId()))
                .collect(Collectors.toList());
    }

    public record AppliedTags(Set<ZitounaTag> tags, ZitounaTag homeInstitution, ZitounaTag partnerInstitution) {
    }
}
