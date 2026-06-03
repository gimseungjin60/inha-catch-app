package com.example.demo;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.JsonSerializer;
import com.fasterxml.jackson.databind.SerializerProvider;

import java.io.IOException;

/**
 * 요약 필드 직렬화 전용 시리얼라이저.
 * 내부 에러로 생성 실패한 요약({@link GeminiService#isErrorSummary})은 사용자에게 노출되지 않도록
 * 빈 문자열("")로 치환해 내려보낸다. 표시 문구는 앱이 담당한다.
 *
 * DB 저장값/Lombok getter는 원본 그대로이며(이 시리얼라이저는 Jackson 직렬화에만 관여),
 * backfill 재생성 판별·추천 점수 계산·검색은 영향을 받지 않는다.
 */
public class SummaryDisplaySerializer extends JsonSerializer<String> {

    @Override
    public void serialize(String value, JsonGenerator gen, SerializerProvider serializers) throws IOException {
        gen.writeString(GeminiService.isErrorSummary(value) ? "" : value);
    }
}
