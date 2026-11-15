package com.studywebsite.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * A person named as having actually done a roadmap step. The name is a claim about a real
 * person, so readers only see it once an admin has accepted it.
 */
@Entity
@Table(name = "roadmap_node_vouches")
@Getter
@Setter
@NoArgsConstructor
public class RoadmapNodeVouch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private RoadmapNode node;

    @Column(name = "person_name", length = 120, nullable = false)
    private String personName;

    /** What the person did, e.g. "wrote the forum thread (2025)". */
    @Column(name = "note", length = 300)
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 24, nullable = false)
    private ModerationStatus status = ModerationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_by_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private User proposedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
