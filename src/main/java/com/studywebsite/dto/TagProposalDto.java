package com.studywebsite.dto;

import com.studywebsite.model.TagField;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TagProposalDto {
    @NotBlank
    @Size(max = 120)
    private String name;

    @NotNull
    private TagField field;

    private Long parentId;
}
