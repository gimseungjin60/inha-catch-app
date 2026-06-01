package com.example.demo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 씽굿(thinkcontest.com) 공모전 크롤러
 * JSON-LD 구조화 데이터 + 상세 페이지 Jsoup 파싱
 */
public class ThinkContestCrawler {

    private static final Logger log = LoggerFactory.getLogger(ThinkContestCrawler.class);
    private static final String INDEX_URL = "https://www.thinkcontest.com/thinkgood/user/contest/index.do";
    private static final String DETAIL_URL = "https://www.thinkcontest.com/thinkgood/user/contest/view.do?contest_pk=";
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final Pattern CONTEST_PK_PATTERN = Pattern.compile("contest_pk=(\\d+)");
    private static final Pattern DATE_PATTERN = Pattern.compile("(\\d{4})[-./](\\d{2})[-./](\\d{2})");

    /**
     * 메인 페이지의 JSON-LD + 주변 PK 탐색으로 공모전 목록 수집
     */
    public List<ScholarshipDto> crawlAllPages(int extraRange) throws Exception {
        List<ScholarshipDto> result = new ArrayList<>();
        Set<Long> collectedPks = new LinkedHashSet<>();

        // 1단계: 메인 페이지 JSON-LD에서 공모전 PK 추출
        log.info("[씽굿] 메인 페이지 JSON-LD 파싱 중...");
        Document indexDoc = Jsoup.connect(INDEX_URL)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .referrer("https://www.google.com")
                .timeout(15000)
                .get();

        Elements jsonLdScripts = indexDoc.select("script[type=application/ld+json]");
        for (Element script : jsonLdScripts) {
            try {
                JsonNode json = objectMapper.readTree(script.data());
                extractContestPks(json, collectedPks);
            } catch (Exception e) {
                // JSON 파싱 실패 무시
            }
        }

        // 페이지 내 모든 링크에서 contest_pk 추출
        Elements allLinks = indexDoc.select("a[href*=contest_pk]");
        for (Element link : allLinks) {
            Matcher m = CONTEST_PK_PATTERN.matcher(link.attr("href"));
            if (m.find()) {
                collectedPks.add(Long.parseLong(m.group(1)));
            }
        }

        log.info("[씽굿] JSON-LD/링크에서 {}개 공모전 PK 발견", collectedPks.size());

        // 2단계: 발견된 PK 주변 범위 탐색 (최신 공모전 발견용)
        if (!collectedPks.isEmpty() && extraRange > 0) {
            long maxPk = Collections.max(collectedPks);
            for (long pk = maxPk + 1; pk <= maxPk + extraRange; pk++) {
                collectedPks.add(pk);
            }
        }

        // 3단계: 각 PK의 상세 페이지를 크롤링
        for (Long pk : collectedPks) {
            try {
                ScholarshipDto dto = crawlDetailPage(pk);
                if (dto != null) {
                    result.add(dto);
                }
            } catch (Exception e) {
                log.debug("[씽굿] PK {} 상세 페이지 접근 실패: {}", pk, e.getMessage());
            }
        }

        log.info("[씽굿] 크롤링 완료: 총 {}건", result.size());
        return result;
    }

    /**
     * 개별 공모전 상세 페이지 크롤링
     */
    private ScholarshipDto crawlDetailPage(Long contestPk) throws Exception {
        String url = DETAIL_URL + contestPk;
        Document doc = Jsoup.connect(url)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .referrer("https://www.google.com")
                .timeout(15000)
                .get();

        // 제목 추출
        String title = "";
        Element titleEl = doc.selectFirst("h1");
        if (titleEl == null) titleEl = doc.selectFirst("h2");
        if (titleEl == null) titleEl = doc.selectFirst(".contest-title");
        if (titleEl != null) title = titleEl.text().trim();

        // 제목이 없거나 에러 페이지면 스킵
        if (title.isEmpty() || title.contains("오류") || title.contains("존재하지 않")) {
            return null;
        }

        ScholarshipDto dto = new ScholarshipDto(contestPk, title, url);
        dto.setSourceSite("thinkcontest");
        dto.setBoardId("contest");
        dto.setNotice(false);
        dto.setHasAttachment(false);
        dto.setPostedAt(LocalDate.now());

        // 메타 정보 추출
        Elements allText = doc.select("li, td, span, div, p");
        for (Element el : allText) {
            String text = el.ownText().trim();
            if (text.isEmpty()) continue;

            if (text.contains("접수기간") || text.contains("모집기간") || text.contains("공모기간")) {
                String period = extractAfterColon(text);
                if (period != null) dto.setApplyPeriod(period);
            } else if (text.contains("응모대상") || text.contains("참가자격") || text.contains("참가 자격")) {
                String elig = extractAfterColon(text);
                if (elig != null) dto.setEligibility(elig);
            } else if (text.contains("주최") || text.contains("주관")) {
                String org = extractAfterColon(text);
                if (org != null) dto.setAuthor(org);
            } else if (text.contains("총 상금") || text.contains("시상내역") || text.contains("시상 내역")) {
                String amount = extractAfterColon(text);
                if (amount != null) dto.setAmountInfo(amount);
            }
        }

        // 접수기간이 메타에서 못 찾은 경우 JSON-LD에서 추출
        if (dto.getApplyPeriod() == null) {
            for (Element script : doc.select("script[type=application/ld+json]")) {
                try {
                    JsonNode json = objectMapper.readTree(script.data());
                    if (json.has("endDate")) {
                        String startDate = json.has("startDate") ? json.get("startDate").asText() : "";
                        String endDate = json.get("endDate").asText();
                        dto.setApplyPeriod(startDate + " ~ " + endDate);
                    }
                } catch (Exception ignored) {}
            }
        }

        // 본문 추출
        Element contentEl = doc.selectFirst("#cms-content");
        if (contentEl == null) contentEl = doc.selectFirst(".cms-main-content");
        if (contentEl == null) contentEl = doc.selectFirst(".cont-sub");
        if (contentEl == null) contentEl = doc.selectFirst("article");

        String content = "";
        if (contentEl != null) {
            contentEl.select("br").append("\n");
            contentEl.select("p").prepend("\n\n");
            content = contentEl.text().replace("\\n", "\n").replaceAll("(?m)^[ \t]*\r?\n", "").trim();
        }

        // 본문이 너무 짧으면 전체 body에서 추출
        if (content.length() < 50) {
            String bodyText = doc.body().text();
            content = bodyText.substring(0, Math.min(bodyText.length(), 3000));
        }
        dto.setContent(content);

        // 관련 링크 + 이미지 수집
        List<String> relatedLinks = new ArrayList<>();
        if (contentEl != null) {
            for (Element a : contentEl.select("a[href^=http]")) {
                String href = a.absUrl("href");
                if (!href.contains("thinkcontest.com") && !href.isEmpty()) {
                    relatedLinks.add(href);
                }
            }
            for (Element img : contentEl.select("img")) {
                String imageUrl = img.hasAttr("data-src") ? img.absUrl("data-src") : img.absUrl("src");
                if (!imageUrl.isEmpty() && imageUrl.startsWith("http")) {
                    relatedLinks.add(imageUrl);
                }
            }
        }
        // 상세 페이지 전역에서 ld+json의 image 속성도 수집
        for (Element script : doc.select("script[type=application/ld+json]")) {
            try {
                JsonNode json = objectMapper.readTree(script.data());
                if (json.has("image")) {
                    JsonNode imageNode = json.get("image");
                    if (imageNode.isTextual() && imageNode.asText().startsWith("http")) {
                        relatedLinks.add(imageNode.asText());
                    } else if (imageNode.isArray()) {
                        for (JsonNode n : imageNode) {
                            if (n.isTextual() && n.asText().startsWith("http")) relatedLinks.add(n.asText());
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        dto.setRelatedLinks(relatedLinks);
        dto.setAttachments(new ArrayList<>());

        log.info("[씽굿] 상세 크롤링 완료: {}", dto.getTitle());
        return dto;
    }

    private void extractContestPks(JsonNode node, Set<Long> pks) {
        if (node.isArray()) {
            for (JsonNode item : node) {
                extractContestPks(item, pks);
            }
        } else if (node.isObject()) {
            // ItemList에서 URL 추출
            if (node.has("url")) {
                String url = node.get("url").asText();
                Matcher m = CONTEST_PK_PATTERN.matcher(url);
                if (m.find()) {
                    pks.add(Long.parseLong(m.group(1)));
                }
            }
            if (node.has("itemListElement")) {
                extractContestPks(node.get("itemListElement"), pks);
            }
            if (node.has("item")) {
                extractContestPks(node.get("item"), pks);
            }
        }
    }

    private String extractAfterColon(String text) {
        int colonIdx = text.indexOf(':');
        if (colonIdx < 0) colonIdx = text.indexOf('：');
        if (colonIdx >= 0 && colonIdx < text.length() - 1) {
            return text.substring(colonIdx + 1).trim();
        }
        return null;
    }
}
