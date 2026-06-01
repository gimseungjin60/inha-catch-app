package com.example.demo;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 위비티(wevity.com) 공모전/대외활동 크롤러
 * SSR 사이트로 Jsoup만으로 크롤링 가능
 */
public class WevityCrawler {

    private static final Logger log = LoggerFactory.getLogger(WevityCrawler.class);
    private static final String BASE_URL = "https://www.wevity.com";
    private static final String LIST_URL = BASE_URL + "/?c=find&s=1&gub=1&gp=";
    private static final Pattern IX_PATTERN = Pattern.compile("ix=(\\d+)");
    private static final Pattern DDAY_PATTERN = Pattern.compile("D-(\\d+)");

    /**
     * 목록 페이지를 순회하며 공모전 정보를 수집
     * @param maxPages 최대 크롤링 페이지 수
     */
    public List<ScholarshipDto> crawlAllPages(int maxPages) throws Exception {
        List<ScholarshipDto> result = new ArrayList<>();
        Set<String> visitedIds = new HashSet<>();

        for (int page = 1; page <= maxPages; page++) {
            String url = LIST_URL + page;
            log.info("[위비티] 목록 크롤링: 페이지 {}", page);

            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .referrer("https://www.google.com")
                    .timeout(15000)
                    .get();

            // 공모전 목록 링크 추출
            Elements contestLinks = doc.select("a[href*=gbn=view]");
            if (contestLinks.isEmpty()) {
                log.info("[위비티] 페이지 {}에 더 이상 항목 없음. 크롤링 종료.", page);
                break;
            }

            int added = 0;
            for (Element link : contestLinks) {
                String href = link.attr("href");
                Matcher ixMatcher = IX_PATTERN.matcher(href);
                if (!ixMatcher.find()) continue;

                String contestId = ixMatcher.group(1);
                if (visitedIds.contains(contestId)) continue;

                String title = link.text().trim();
                // SPECIAL, HOT 등의 배지 텍스트 제거
                title = title.replaceAll("(SPECIAL|HOT|NEW|BEST)\\s*$", "").trim();
                if (title.isEmpty()) continue;

                String fullUrl = BASE_URL + "/?c=find&s=1&gub=1&gbn=view&gp=1&ix=" + contestId;

                // 같은 행에서 주최사, D-day, 조회수 추출
                Element row = link.closest("tr");
                String organizer = "";
                String ddayText = "";
                Integer viewCount = null;

                if (row != null) {
                    Elements tds = row.select("td");
                    if (tds.size() >= 4) {
                        organizer = tds.get(1).text().trim();
                        ddayText = tds.get(2).text().trim();
                        viewCount = parseViewCount(tds.get(3).text().trim());
                    }
                }

                // 마감된 항목 스킵
                if (ddayText.contains("마감")) continue;

                ScholarshipDto dto = new ScholarshipDto(Long.parseLong(contestId), title, fullUrl);
                dto.setSourceSite("wevity");
                dto.setBoardId("contest");
                dto.setAuthor(organizer);
                dto.setPostedAt(LocalDate.now()); // 위비티는 등록일이 목록에 없어서 현재 날짜 사용
                dto.setViewCount(viewCount);
                dto.setNotice(false);
                dto.setHasAttachment(false);

                // D-day에서 접수기간 추정
                if (!ddayText.isEmpty()) {
                    Matcher ddayMatcher = DDAY_PATTERN.matcher(ddayText);
                    if (ddayMatcher.find()) {
                        int daysLeft = Integer.parseInt(ddayMatcher.group(1));
                        LocalDate deadline = LocalDate.now().plusDays(daysLeft);
                        dto.setApplyPeriod("~ " + deadline.toString());
                    }
                }

                result.add(dto);
                visitedIds.add(contestId);
                added++;
            }

            if (added == 0) break;
        }

        log.info("[위비티] 목록 크롤링 완료: 총 {}건", result.size());
        return result;
    }

    /**
     * 상세 페이지에서 본문, 접수기간, 자격, 상금 등 추출
     */
    public void crawlDetail(ScholarshipDto dto) throws Exception {
        Document doc = Jsoup.connect(dto.getLink())
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .referrer("https://www.google.com")
                .timeout(15000)
                .get();

        // 제목 보정 (상세 페이지의 h6 태그)
        Element titleEl = doc.selectFirst("h6");
        if (titleEl != null && !titleEl.text().trim().isEmpty()) {
            dto.setTitle(titleEl.text().trim());
        }

        // 메타 정보 추출 (ul > li 구조)
        Elements metaItems = doc.select("ul li");
        for (Element li : metaItems) {
            String text = li.text().trim();
            if (text.startsWith("접수기간") || text.contains("접수기간")) {
                String period = text.replaceAll("접수기간\\s*[:：]?\\s*", "").trim();
                if (!period.isEmpty()) dto.setApplyPeriod(period);
            } else if (text.startsWith("응모대상") || text.contains("응모대상")) {
                String eligibility = text.replaceAll("응모대상\\s*[:：]?\\s*", "").trim();
                if (!eligibility.isEmpty()) dto.setEligibility(eligibility);
            } else if (text.startsWith("주최") || text.contains("주최/주관")) {
                String org = text.replaceAll("주최/?주관?\\s*[:：]?\\s*", "").trim();
                if (!org.isEmpty()) dto.setAuthor(org);
            } else if (text.startsWith("총 상금") || text.contains("총상금")) {
                String amount = text.replaceAll("총\\s*상금\\s*[:：]?\\s*", "").trim();
                if (!amount.isEmpty()) dto.setAmountInfo(amount);
            }
        }

        // 본문 추출
        Element contentArea = doc.selectFirst(".cont-sub");
        if (contentArea == null) contentArea = doc.selectFirst(".view-con");
        if (contentArea == null) contentArea = doc.selectFirst("article");
        if (contentArea == null) contentArea = doc.body();

        String content = "";
        if (contentArea != null) {
            contentArea.select("br").append("\n");
            contentArea.select("p").prepend("\n\n");
            content = contentArea.text().replace("\\n", "\n").replaceAll("(?m)^[ \t]*\r?\n", "").trim();

            // 본문이 너무 짧으면 전체 body에서 추출
            if (content.length() < 50) {
                content = doc.body().text().substring(0, Math.min(doc.body().text().length(), 3000));
            }
        }
        dto.setContent(content);

        // 관련 링크 + 이미지 추출
        List<String> relatedLinks = new ArrayList<>();
        if (contentArea != null) {
            for (Element a : contentArea.select("a[href^=http]")) {
                String href = a.absUrl("href");
                if (!href.contains("wevity.com") && !href.isEmpty()) {
                    relatedLinks.add(href);
                }
            }
            // 포스터/본문 이미지 수집 (lazy-load 대응)
            for (Element img : contentArea.select("img")) {
                String imageUrl = img.hasAttr("data-src") ? img.absUrl("data-src") : img.absUrl("src");
                if (!imageUrl.isEmpty() && imageUrl.startsWith("http")) {
                    relatedLinks.add(imageUrl);
                }
            }
        }
        dto.setRelatedLinks(relatedLinks);
        dto.setAttachments(new ArrayList<>());

        log.info("[위비티] 상세 크롤링 완료: {}", dto.getTitle());
    }

    private Integer parseViewCount(String text) {
        try {
            return Integer.parseInt(text.replaceAll("[^0-9]", ""));
        } catch (Exception e) {
            return null;
        }
    }
}
