package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 잡알리오 (공공기관 채용정보) OpenAPI 호출 클라이언트.
 * - 명세: https://www.data.go.kr/data/15125273/openapi.do
 * - HTTP POST + 쿼리 파라미터 (serviceKey, pageNo, numOfRows, resultType=json, ongoingYn=Y)
 * - 응답이 구조화되어 있어 Gemini 요약 없이 prebuiltSummary 로 그대로 사용.
 */
@Slf4j
@Component
public class JobAlioFetcher {

    private static final String LIST_PATH = "/new/v1/recruit/list.do";
    private static final String SOURCE_SITE = "jobalio";
    private static final String BOARD_ID = "public";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${jobalio.api.key:}")
    private String apiKey;

    @Value("${jobalio.api.base-url:https://opendata.alio.go.kr}")
    private String baseUrl;

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * 진행중인 채용공고를 페이지 단위로 모두 수집.
     * @param maxPages 최대 페이지 수 (안전장치)
     * @param numOfRows 페이지당 행 수 (잡알리오 기본 10, 최대 100)
     */
    public List<ScholarshipDto> fetchOngoing(int maxPages, int numOfRows) {
        List<ScholarshipDto> result = new ArrayList<>();
        if (!isConfigured()) {
            log.warn("[잡알리오] API 키가 설정되지 않아 호출을 건너뜁니다.");
            return result;
        }

        for (int page = 1; page <= maxPages; page++) {
            List<ScholarshipDto> chunk;
            try {
                chunk = fetchPage(page, numOfRows);
            } catch (Exception e) {
                log.error("[잡알리오] 페이지 {} 호출 실패: {}", page, e.getMessage());
                break;
            }
            if (chunk.isEmpty()) break;
            result.addAll(chunk);
            if (chunk.size() < numOfRows) break; // 마지막 페이지
        }

        log.info("[잡알리오] 총 {}건 수집 완료", result.size());
        return result;
    }

    private List<ScholarshipDto> fetchPage(int pageNo, int numOfRows) throws Exception {
        // serviceKey 의 Base64 `==` 패딩 등 reserved 문자가 한 번만 URL 인코딩되도록 build → encode → toUri 순서
        URI uri = UriComponentsBuilder.fromUriString(baseUrl + LIST_PATH)
                .queryParam("serviceKey", apiKey)
                .queryParam("pageNo", pageNo)
                .queryParam("numOfRows", numOfRows)
                .queryParam("resultType", "json")
                .queryParam("ongoingYn", "Y")
                .build()
                .encode()
                .toUri();

        HttpHeaders headers = new HttpHeaders();
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<String> resp = restTemplate.exchange(uri, HttpMethod.POST, entity, String.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new RuntimeException("HTTP " + resp.getStatusCode());
        }

        JsonNode root = objectMapper.readTree(resp.getBody());
        int resultCode = root.path("resultCode").asInt(-1);
        // 잡알리오 명세: 0 = 정상, 200 = 성공 (둘 다 success)
        if (resultCode != 0 && resultCode != 200) {
            String msg = root.path("resultMsg").asText();
            throw new RuntimeException("잡알리오 응답 오류 code=" + resultCode + " msg=" + msg);
        }

        JsonNode results = root.path("result");
        List<ScholarshipDto> list = new ArrayList<>();
        if (!results.isArray()) return list;

        for (JsonNode item : results) {
            ScholarshipDto dto = mapItem(item);
            if (dto != null) list.add(dto);
        }
        return list;
    }

    private ScholarshipDto mapItem(JsonNode item) {
        long sn = item.path("recrutPblntSn").asLong(-1);
        if (sn <= 0) return null;
        String title = text(item, "recrutPbancTtl");
        if (title.isBlank()) return null;

        String srcUrl = text(item, "srcUrl");
        String link = srcUrl.isBlank()
                ? "https://job.alio.go.kr/recruitview.do?idx=" + sn
                : srcUrl;

        ScholarshipDto dto = new ScholarshipDto(sn, title, link);
        dto.setSourceSite(SOURCE_SITE);
        dto.setBoardId(BOARD_ID);
        dto.setCategory("JOB");
        dto.setNotice(false);
        dto.setAuthor(text(item, "instNm"));
        dto.setHasAttachment(false);

        // 게시일 = 채용공시 시작일
        LocalDate postedAt = parseYmd(text(item, "pbancBgngYmd"));
        dto.setPostedAt(postedAt != null ? postedAt : LocalDate.now());

        // 신청기간 — parseLatestDate 가 인식 가능한 포맷으로
        String bgn = formatYmd(text(item, "pbancBgngYmd"));
        String end = formatYmd(text(item, "pbancEndYmd"));
        if (!bgn.isBlank() || !end.isBlank()) {
            dto.setApplyPeriod("신청 기간: " + bgn + " ~ " + end);
        }

        // 채용 전용 필드
        dto.setCompanyName(text(item, "instNm"));
        dto.setWorkLocation(text(item, "workRgnNmLst"));
        dto.setRecruitmentCount(text(item, "recrutNope"));
        dto.setEmploymentType(text(item, "hireTypeNmLst"));
        dto.setExperienceLevel(text(item, "recrutSeNm"));

        String eligibility = text(item, "aplyQlfcCn");
        if (eligibility.isBlank()) eligibility = text(item, "acbgCondNmLst");
        dto.setEligibility(eligibility);

        // 본문(content) — 구조화된 필드를 사람이 읽을 수 있게 합침
        StringBuilder body = new StringBuilder();
        appendIfPresent(body, "기관", text(item, "instNm"));
        appendIfPresent(body, "채용분야 (NCS)", text(item, "ncsCdNmLst"));
        appendIfPresent(body, "고용형태", text(item, "hireTypeNmLst"));
        appendIfPresent(body, "경력구분", text(item, "recrutSeNm"));
        appendIfPresent(body, "근무지역", text(item, "workRgnNmLst"));
        appendIfPresent(body, "모집인원", text(item, "recrutNope"));
        appendIfPresent(body, "학력조건", text(item, "acbgCondNmLst"));
        appendIfPresent(body, "신청기간", bgn + " ~ " + end);
        appendIfPresent(body, "지원자격", eligibility);
        appendIfPresent(body, "우대사항", text(item, "prefCn"));
        appendIfPresent(body, "전형방법", text(item, "scrnprcdrMthdExpln"));
        appendIfPresent(body, "원문", srcUrl);
        dto.setContent(body.toString());

        // 사전 생성 요약 — CrawlPipeline 이 이걸 보면 Gemini 호출 스킵
        StringBuilder summary = new StringBuilder();
        summary.append("상태: 진행중\n");
        summary.append("지원 대상: ").append(safe(text(item, "recrutSeNm"))).append("\n");
        summary.append("신청 기간: ").append(bgn).append(" ~ ").append(end).append("\n");
        summary.append("핵심 혜택: ").append(safe(text(item, "hireTypeNmLst")))
                .append(" / 근무지 ").append(safe(text(item, "workRgnNmLst"))).append("\n");
        summary.append("상세 요약: ").append(safe(text(item, "instNm"))).append(" 에서 ")
                .append(safe(text(item, "ncsCdNmLst"))).append(" 분야 ")
                .append(safe(text(item, "recrutNope"))).append("명을 채용합니다.");
        dto.setPrebuiltSummary(summary.toString());

        if (!srcUrl.isBlank()) dto.getRelatedLinks().add(srcUrl);
        return dto;
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        if (v.isMissingNode() || v.isNull()) return "";
        if (v.isObject() && v.isEmpty()) return ""; // 빈 객체 {} 를 빈 값으로
        return v.asText("").trim();
    }

    private static String safe(String s) {
        return (s == null || s.isBlank()) ? "정보 없음" : s;
    }

    private static void appendIfPresent(StringBuilder sb, String label, String value) {
        if (value == null || value.isBlank() || value.equals(" ~ ")) return;
        sb.append(label).append(": ").append(value).append("\n");
    }

    /** "20260519" -> LocalDate(2026,5,19) */
    private static LocalDate parseYmd(String ymd) {
        if (ymd == null || ymd.length() != 8) return null;
        try {
            return LocalDate.parse(ymd, DateTimeFormatter.ofPattern("yyyyMMdd"));
        } catch (Exception ignored) {
            return null;
        }
    }

    /** "20260519" -> "2026.05.19" (parseLatestDate 인식용) */
    private static String formatYmd(String ymd) {
        LocalDate d = parseYmd(ymd);
        return d == null ? "" : d.format(DateTimeFormatter.ofPattern("yyyy.MM.dd"));
    }
}
