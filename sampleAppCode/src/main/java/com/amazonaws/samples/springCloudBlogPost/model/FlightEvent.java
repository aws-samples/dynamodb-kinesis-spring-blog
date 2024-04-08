package com.amazonaws.samples.springCloudBlogPost.model;

import java.time.LocalDateTime;

public record FlightEvent(FlightStatus flightStatus, String departureAirport, String arrivalAirport, LocalDateTime departureDateTime, LocalDateTime arrivalDateTime) {
}
