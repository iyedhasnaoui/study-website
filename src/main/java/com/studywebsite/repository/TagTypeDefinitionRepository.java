package com.studywebsite.repository;

import com.studywebsite.model.TagField;
import com.studywebsite.model.TagTypeDefinition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TagTypeDefinitionRepository extends JpaRepository<TagTypeDefinition, Long> {
    Optional<TagTypeDefinition> findByNameIgnoreCase(String name);
    List<TagTypeDefinition> findByFieldAndActiveTrueOrderByNameAsc(TagField field);
    List<TagTypeDefinition> findByActiveTrueOrderByFieldAscNameAsc();
}
