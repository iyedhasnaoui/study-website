package com.studywebsite.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "rating_criteria")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RatingCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name;

    @Column(name = "weight")
    private Double weight;

    @OneToMany(mappedBy = "criteria")
    @JsonIgnore
    private List<ResourceRating> resourceRatings = new ArrayList<>();
}

