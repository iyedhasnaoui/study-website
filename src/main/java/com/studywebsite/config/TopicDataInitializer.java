package com.studywebsite.config;

import com.studywebsite.model.ForumTopic;
import com.studywebsite.repository.ForumTopicRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class TopicDataInitializer {

    @Bean
    public CommandLineRunner seedTopics(ForumTopicRepository topicRepository) {
        return args -> {
            if (topicRepository.count() == 0) {
                List<ForumTopic> defaultTopics = List.of(
                        ForumTopic.builder()
                                .name("Algorithms & Data Structures")
                                .slug("algorithms-and-data-structures")
                                .icon("🧩")
                                .description("Asymptotic analysis, graph traversal, dynamic programming, and core data structures.")
                                .build(),

                        ForumTopic.builder()
                                .name("Machine Learning")
                                .slug("machine-learning")
                                .icon("🧠")
                                .description("Supervised and unsupervised models, neural architectures, loss functions, and optimization.")
                                .build(),

                        ForumTopic.builder()
                                .name("Signal Theory")
                                .slug("signal-theory")
                                .icon("📡")
                                .description("Continuous and discrete systems, Fourier transforms, filtering, and sampling.")
                                .build(),

                        ForumTopic.builder()
                                .name("Probability Theory")
                                .slug("probability-theory")
                                .icon("🎲")
                                .description("Random variables, conditioning, discrete/continuous distributions, and limit theorems.")
                                .build(),

                        ForumTopic.builder()
                                .name("Statistics")
                                .slug("statistics")
                                .icon("📊")
                                .description("Hypothesis testing, confidence intervals, regression analysis, and parameter estimation.")
                                .build(),

                        ForumTopic.builder()
                                .name("Robotics")
                                .slug("robotics")
                                .icon("🤖")
                                .description("Kinematics, sensor integration, state estimation, path planning, and control.")
                                .build(),

                        ForumTopic.builder()
                                .name("Software Engineering")
                                .slug("software-engineering")
                                .icon("⚙️")
                                .description("System architecture, design patterns, testing workflows, and project practices.")
                                .build()
                );

                topicRepository.saveAll(defaultTopics);
            }
        };
    }
}