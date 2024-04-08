package com.amazonaws.samples.springCloudBlogPost.service;

import com.amazonaws.samples.springCloudBlogPost.SpringCloudBlogPostApplication;
import com.amazonaws.samples.springCloudBlogPost.model.FlightEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.stereotype.Service;

import java.util.function.Consumer;

@Service
public class ChangeCaptureService {

    static final Logger logger = LoggerFactory.getLogger(SpringCloudBlogPostApplication.class);

    @Bean
    public Consumer<String> printDynamoDBmessage() {
        return logger::info;
    }

    @Bean
    public Consumer<FlightEvent> printFlightEvent() {
        return flightEvent -> logger.info(flightEvent.toString());
    }
}
