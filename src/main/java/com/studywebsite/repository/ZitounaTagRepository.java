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

    @Query("SELECT zt FROM ZitounaTag zt JOIN zt.type tt " +
            "WHERE (:status IS NULL OR zt.status = :status) " +
            "  AND (:field IS NULL OR tt.field = :field) " +
            "  AND (:query IS NULL OR :query = '' " +
            "       OR LOWER(zt.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
            "       OR (zt.aliases IS NOT NULL AND LOWER(zt.aliases) LIKE LOWER(CONCAT('%', :query, '%')))) " +
            "ORDER BY zt.name ASC")
    List<ZitounaTag> search(
            @Param("status") TagStatus status,
            @Param("field") TagField field,
            @Param("query") String query
    );
}
