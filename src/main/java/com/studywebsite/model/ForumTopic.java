package com.studywebsite.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "forum_topics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ForumTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Column(nullable = false, unique = true, length = 50)
    private String slug; 

    @Column(length = 20)
    private String icon; // e.g. "💬", "💡", or an icon identifier

    @Column(length = 255)
    private String description;
}