package com.studywebsite.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tag_types", uniqueConstraints = @UniqueConstraint(name = "uk_tag_type_name", columnNames = "name"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TagTypeDefinition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private TagField field;

    @Builder.Default
    @Column(name = "minimum_institutions", nullable = false)
    private Integer minimumInstitutions = 0;

    @Builder.Default
    @Column(name = "minimum_programs", nullable = false)
    private Integer minimumPrograms = 0;

    @Builder.Default
    @Column(nullable = false)
    private Boolean active = true;
}
