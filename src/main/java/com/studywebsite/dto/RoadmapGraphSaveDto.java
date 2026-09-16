package com.studywebsite.dto;

import com.studywebsite.model.RoadmapNodeType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Full replacement of a roadmap's graph. Nodes and edges absent from the payload are deleted.
 * Nodes carry a client-side {@code ref} so edges can point at nodes that do not have a database id yet.
 */
@Data
@NoArgsConstructor
public class RoadmapGraphSaveDto {

    @Valid
    private List<NodeInput> nodes = new ArrayList<>();

    @Valid
    private List<EdgeInput> edges = new ArrayList<>();

    @Data
    @NoArgsConstructor
    public static class NodeInput {

        /** Existing node id, or null for a node created in this editing session. */
        private Long id;

        /** Stable client-side identifier used by {@link EdgeInput} to reference this node. */
        @NotBlank
        private String ref;

        @NotBlank
        @Size(max = 200)
        private String title;

        @Size(max = 500)
        private String description;

        @Size(max = 100000)
        private String content;

        private RoadmapNodeType nodeType;

        @NotNull
        private Double positionX;

        @NotNull
        private Double positionY;
    }

    @Data
    @NoArgsConstructor
    public static class EdgeInput {

        private Long id;

        @NotBlank
        private String sourceRef;

        @NotBlank
        private String targetRef;
    }
}
