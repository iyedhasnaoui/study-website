package com.studywebsite.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "roadmap_nodes")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Roadmap roadmap;

    @Column(name = "title")
    private String title;

    @Column(name = "description")
    private String description;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", length = 32)
    @Builder.Default
    private RoadmapNodeType nodeType = RoadmapNodeType.PRIMARY;

    @Column(name = "position_x")
    @Builder.Default
    private Double positionX = 0.0;

    @Column(name = "position_y")
    @Builder.Default
    private Double positionY = 0.0;

    // Nodes predating the graph model have no type or coordinates; give them usable defaults on load.
    @PrePersist
    @PreUpdate
    @PostLoad
    private void applyDefaults() {
        if (nodeType == null) nodeType = RoadmapNodeType.PRIMARY;
        if (positionX == null) positionX = 0.0;
        if (positionY == null) positionY = 0.0;
    }
}
