package com.studywebsite.dto;

import com.studywebsite.model.RoadmapLinkKind;
import com.studywebsite.model.RoadmapLinkTarget;
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

        private Boolean gate;

        private Long linkedRoadmapId;

        /** Replaces the node's links; when left out (null) the stored links are kept as they are. */
        @Valid
        private List<LinkInput> links;

        /**
         * Replaces the node's vouches; when left out (null) they are kept as they are. A vouch sent
         * back unchanged keeps the admin's decision.
         */
        @Valid
        private List<VouchInput> vouches;
    }

    @Data
    @NoArgsConstructor
    public static class LinkInput {

        @NotNull
        private RoadmapLinkKind kind;

        /** Internal links only. */
        private RoadmapLinkTarget targetType;

        /** Internal links only. */
        private Long targetId;

        /** External links only: an http or https address. */
        @Size(max = 2000)
        private String url;

        /** External links only; the server names internal links after their target. */
        @Size(max = 200)
        private String label;
    }

    @Data
    @NoArgsConstructor
    public static class VouchInput {

        /** Existing vouch id, or null for a person added in this editing session. */
        private Long id;

        @NotBlank
        @Size(max = 120)
        private String personName;

        @Size(max = 300)
        private String note;
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
