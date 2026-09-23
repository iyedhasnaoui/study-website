package com.studywebsite.repository;

import com.studywebsite.model.TagField;
import com.studywebsite.model.TagStatus;
import com.studywebsite.model.ZitounaTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ZitounaTagRepository extends JpaRepository<ZitounaTag, Long> {
    Optional<ZitounaTag> findByNormalizedNameAndParentIsNull(String normalizedName);
    Optional<ZitounaTag> findByNormalizedNameAndParent_Id(String normalizedName, Long parentId);
    List<ZitounaTag> findByStatusOrderByNameAsc(TagStatus status);

    @Query("""
            select tag from ZitounaTag tag
            join fetch tag.type type
            left join fetch tag.parent parent
            where tag.status = :status
              and (:field is null or type.field = :field)
              and (:query is null or lower(tag.name) like lower(concat('%', :query, '%'))
                   or lower(coalesce(tag.aliases, '')) like lower(concat('%', :query, '%')))
            order by tag.name
            """)
    List<ZitounaTag> search(
            @Param("status") TagStatus status,
            @Param("field") TagField field,
            @Param("query") String query
    );
}
