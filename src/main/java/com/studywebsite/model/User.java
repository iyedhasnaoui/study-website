package com.studywebsite.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "number_contributions")
    private Integer numberContributions;

    @Column(name = "trust_score")
    private Double trustScore;

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    @Column(name = "additional_info", columnDefinition = "TEXT")
    private String additionalInfo;

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<UserRole> userRoles = new ArrayList<>();

    @OneToMany(mappedBy = "author")
    @JsonIgnore
    private List<ForumPost> forumPosts = new ArrayList<>();

    @OneToMany(mappedBy = "author")
    @JsonIgnore
    private List<ForumReply> forumReplies = new ArrayList<>();

    @OneToMany(mappedBy = "author")
    @JsonIgnore
    private List<Resource> resources = new ArrayList<>();

    @OneToMany(mappedBy = "author")
    @JsonIgnore
    private List<Roadmap> roadmaps = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<Verification> verifications = new ArrayList<>();

    @OneToMany(mappedBy = "reviewedByUser")
    @JsonIgnore
    private List<Verification> reviewedVerifications = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<ResourceRating> resourceRatings = new ArrayList<>();

    @OneToMany(mappedBy = "user")
    @JsonIgnore
    private List<UserActivityLog> activityLogs = new ArrayList<>();
}

