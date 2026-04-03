package com.example.demo.event;

import com.example.demo.ScholarshipDto;

public class CrawlEvent {
    private final ScholarshipDto scholarshipDto;

    public CrawlEvent(ScholarshipDto scholarshipDto) {
        this.scholarshipDto = scholarshipDto;
    }

    public ScholarshipDto getScholarshipDto() {
        return scholarshipDto;
    }
}
