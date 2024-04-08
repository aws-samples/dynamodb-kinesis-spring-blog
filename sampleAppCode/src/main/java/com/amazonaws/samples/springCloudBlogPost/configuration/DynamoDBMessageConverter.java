package com.amazonaws.samples.springCloudBlogPost.configuration;

import com.amazonaws.samples.springCloudBlogPost.SpringCloudBlogPostApplication;
import com.amazonaws.samples.springCloudBlogPost.model.FlightEvent;
import com.amazonaws.samples.springCloudBlogPost.model.FlightStatus;
import com.fasterxml.jackson.core.TreeNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jetbrains.annotations.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.converter.AbstractMessageConverter;
import org.springframework.stereotype.Component;
import org.springframework.util.MimeType;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class DynamoDBMessageConverter extends AbstractMessageConverter {

    static final Logger logger = LoggerFactory.getLogger(SpringCloudBlogPostApplication.class);
    private final ObjectMapper objectMapper;

    public DynamoDBMessageConverter(ObjectMapper objectMapper) {
        super(new MimeType("application", "ddb"));
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean supports(Class<?> cls) {
        return cls.equals(FlightEvent.class);
    }

    @Override
    protected Object convertFromInternal(Message<?> message, @NotNull Class<?> targetClass, @Nullable Object conversionHint) {
        try {
            String flightEventStatus = objectMapper.readTree((byte[]) message.getPayload()).get("eventName").toString();
            FlightStatus flightStatus = FlightStatus.NEW;
            switch (flightEventStatus) {
                case "MODIFY": flightStatus = FlightStatus.MODIFIED;
                case "REMOVE": flightStatus = FlightStatus.CANCELLED;
            }
            TreeNode flightJson = objectMapper.readTree((byte[]) message.getPayload()).get("dynamodb").get("NewImage");
            String departureAirport = flightJson.get("departureAirport").get("S").toString();
            String arrivalAirport = flightJson.get("arrivalAirport").get("S").toString();
            LocalDateTime departureDateTime = LocalDateTime.parse(flightJson.get("departureDateTime").get("S").toString().replaceAll("\"", ""), DateTimeFormatter.ISO_DATE_TIME);
            LocalDateTime arrivalDateTime = LocalDateTime.parse(flightJson.get("arrivalDateTime").get("S").toString().replaceAll("\"", ""), DateTimeFormatter.ISO_DATE_TIME);
            return new FlightEvent(flightStatus, departureAirport, arrivalAirport, departureDateTime, arrivalDateTime);
        } catch (IOException e) {
            logger.error("Error converting DynamoDB stream message", e);
            return null;
        }
    }
}
