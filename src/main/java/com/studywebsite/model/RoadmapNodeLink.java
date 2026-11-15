package com.studywebsite.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * A link carried by a roadmap node. An internal link points at Zitun content by type and id, so
 * the reader always sees its current title; an external link is a plain web address.
 */
@Entity
@Table(name = "roadmap_node_links")
@Getter
@Setter
@NoArgsConstructor
public class RoadmapNodeLink {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private RoadmapNode node;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", length = 16, nullable = false)
    private RoadmapLinkKind kind;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", length = 32)
    private RoadmapLinkTarget targetType;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "url", length = 2000)
    private String url;

    /** The page title for an external link; for an internal one, the target's title when it was linked. */
    @Column(name = "label", length = 300)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;
}
