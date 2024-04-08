package com.amazonaws.samples.springCloudBlogPost.configuration;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.MessageConverter;

@Configuration
@AllArgsConstructor
public class CustomConfiguration {

    private final ObjectMapper objectMapper;

    @Bean
    public MessageConverter customMessageConverter() {
        return new DynamoDBMessageConverter(this.objectMapper);
    }

}