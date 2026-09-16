package com.studywebsite.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
        name = "roadmap_edges",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_roadmap_edge_source_target",
                columnNames = {"roadmap_id", "source_node_id", "target_node_id"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoadmapEdge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "roadmap_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Roadmap roadmap;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_node_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private RoadmapNode sourceNode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_node_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private RoadmapNode targetNode;
}
