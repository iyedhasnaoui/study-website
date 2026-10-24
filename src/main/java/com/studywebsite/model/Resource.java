package com.studywebsite.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "resources")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "title")
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "original_filename")
    private String originalFilename;

    @Column(name = "content_type")
    private String contentType;

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(name = "grade_note")
    private String gradeNote;

    @Column(name = "solution_approach", columnDefinition = "TEXT")
    private String solutionApproach;

    @Column(name = "method_used", columnDefinition = "TEXT")
    private String methodUsed;

    @Column(name = "roadmap_followed", columnDefinition = "TEXT")
    private String roadmapFollowed;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", length = 24)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.PENDING;

    @Column(name = "moderation_note", columnDefinition = "TEXT")
    private String moderationNote;

    @ManyToMany
    @JoinTable(
            name = "resource_tags",
            joinColumns = @JoinColumn(name = "resource_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<ZitounaTag> tags = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "type")
    private ResourceType type;

    @Column(name = "path")
    private String path;

    @OneToMany(mappedBy = "resource")
    @JsonIgnore
    @Builder.Default
    private List<ResourceRating> ratings = new ArrayList<>();
}

