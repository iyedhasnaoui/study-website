package com.studywebsite.model;

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
@Table(name = "forum_posts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "title")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", length = 24)
    @Builder.Default
    private ModerationStatus moderationStatus = ModerationStatus.PENDING;

    @Column(name = "moderation_note", columnDefinition = "TEXT")
    private String moderationNote;

    // Public title/content remain unchanged while an approved post has a proposed edit.
    @Column(name = "pending_title")
    private String pendingTitle;

    @Column(name = "pending_content", columnDefinition = "TEXT")
    private String pendingContent;

    @Enumerated(EnumType.STRING)
    @Column(name = "revision_status", length = 24)
    private ModerationStatus revisionStatus;

    @Column(name = "revision_note", columnDefinition = "TEXT")
    private String revisionNote;

    @Version
    @Column(name = "version", nullable = false, columnDefinition = "bigint default 0")
    private long version;

    @ManyToMany
    @JoinTable(
            name = "forum_post_tags",
            joinColumns = @JoinColumn(name = "post_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Set<ZitounaTag> tags = new HashSet<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "home_institution_tag_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ZitounaTag homeInstitution;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_institution_tag_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ZitounaTag partnerInstitution;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<ForumAttachment> attachments = new ArrayList<>();
}

