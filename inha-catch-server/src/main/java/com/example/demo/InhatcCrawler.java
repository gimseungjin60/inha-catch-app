package com.example.demo;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class InhatcCrawler {

    private static final Logger log = LoggerFactory.getLogger(InhatcCrawler.class);
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy.MM.dd");
    private static final Pattern ARTICLE_ID_PATTERN = Pattern.compile("/(\\d+)/artclView\\.do");
    private static final Pattern APPLY_PERIOD_PATTERN = Pattern.compile("(신청\\s*기간[:：]?\\s*[^\\n]+)");
    private static final Pattern ELIGIBILITY_PATTERN = Pattern.compile("(지원\\s*대상[:：]?\\s*[^\\n]+)");
    private static final Pattern AMOUNT_PATTERN = Pattern.compile("(장학\\s*금액[:：]?\\s*[^\\n]+)");

    // 날짜 파싱 집계 (crawlAllPages 호출 단위로 리셋)
    private int dateParseSuccess = 0;
    private int dateParseFail = 0;
    private String firstFailSample = null;

    public List<ScholarshipDto> crawlAllPages(String boardId) throws Exception {
        List<ScholarshipDto> result = new ArrayList<>();
        Set<String> visitedLinks = new HashSet<>();

        // 올해(currentYear)와 전년도(currentYear-1)까지만 수집. 2026년엔 2025·2026.
        int cutoffYear = LocalDate.now().getYear() - 1;

        // 집계 카운터 리셋
        dateParseSuccess = 0;
        dateParseFail = 0;
        firstFailSample = null;
        log.info("[날짜 파싱] board={} 시작...", boardId);

        int page = 1;
        while (true) {
            String url = "https://www.inhatc.ac.kr/bbs/kr/" + boardId + "/artclList.do?page=" + page;
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0")
                    .referrer("https://www.google.com")
                    .timeout(10000)
                    .get();

            Elements rows = doc.select("table tbody tr");
            if (rows.isEmpty()) {
                break;
            }

            int added = 0;
            boolean stopCrawling = false;
            for (Element row : rows) {
                Element titleElement = row.selectFirst("td:nth-child(2) a");
                if (titleElement == null) {
                    continue;
                }

                String title = titleElement.text().trim();
                String link = titleElement.absUrl("href");
                if (link.isEmpty() || visitedLinks.contains(link)) {
                    continue;
                }

                Long articleId = extractArticleId(link);
                String numberText = textOrEmpty(row.selectFirst("td:nth-child(1)"));
                boolean isNotice = row.hasClass("notice") || numberText.contains("공지");

                String author = textOrEmpty(row.selectFirst("td:nth-child(4)"));
                LocalDate postedAt = parseDate(textOrEmpty(row.selectFirst("td:nth-child(5)")));
                
                if (postedAt != null && postedAt.getYear() < cutoffYear) {
                    if (!isNotice) {
                        log.info("[{}년 이전] 일반 데이터 발견. 크롤링 종료. ({})", cutoffYear, title);
                        stopCrawling = true;
                        break;
                    } else {
                        log.debug("[{}년 이전] 공지사항 스킵. ({})", cutoffYear, title);
                        continue;
                    }
                }
                
                Integer viewCount = parseInt(textOrEmpty(row.selectFirst("td:nth-child(6)")));
                boolean hasAttachment = row.select("td:nth-child(3) img, td:nth-child(3) a, td:nth-child(3) i").size() > 0;

                ScholarshipDto dto = new ScholarshipDto(articleId, title, link);
                dto.setNotice(isNotice);
                dto.setAuthor(author);
                dto.setPostedAt(postedAt);
                dto.setViewCount(viewCount);
                dto.setHasAttachment(hasAttachment);

                result.add(dto);
                visitedLinks.add(link);
                added++;
            }

            if (stopCrawling || added == 0 || page >= 200) {
                break;
            }
            page++;
        }

        // 날짜 파싱 집계 한 줄로
        String summary = "[날짜 파싱 결과] board=" + boardId
                + " 성공=" + dateParseSuccess
                + " 실패=" + dateParseFail;
        if (dateParseFail > 0 && firstFailSample != null) {
            summary += " (실패 샘플: '" + firstFailSample + "')";
        }
        log.info(summary);

        return result;
    }

    public void crawlDetail(ScholarshipDto dto) throws Exception {
        Document doc = Jsoup.connect(dto.getLink())
                .userAgent("Mozilla/5.0")
                .referrer("https://www.google.com")
                .timeout(10000)
                .get();

        // 상세 페이지 구조 변경 대비: 본문 selector fallback
        Element contentElement = selectFirstNonEmpty(
                doc,
                "#artclView .view-con",
                ".view-con",
                "#artclView .view_con",
                ".view_con",
                "#artclView",
                ".artclView",
                ".board_view_con"
        );

        if (contentElement == null) {
            dto.setContent("");
            dto.setAttachments(new ArrayList<>());
            dto.setRelatedLinks(new ArrayList<>());
            dto.setApplyPeriod(null);
            dto.setEligibility(null);
            dto.setAmountInfo(null);
            log.warn("본문 추출 실패: {}", dto.getLink());
            return;
        }

        // 본문 내 줄바꿈, 문단 유지
        contentElement.select("br").append("\\n");
        contentElement.select("p").prepend("\\n\\n");
        String textContent = contentElement.text().replace("\\n", "\n").replaceAll("(?m)^[ \t]*\r?\n", "").trim();

        // 본문 내 이미지 URL 수집 (lazy-load 대응)
        List<String> imageUrls = new ArrayList<>();
        for (Element img : contentElement.select("img")) {
            String imageUrl = "";
            if (img.hasAttr("data-src")) {
                imageUrl = img.absUrl("data-src");
            }
            if (imageUrl.isEmpty()) {
                imageUrl = img.absUrl("src");
            }
            if (!imageUrl.isEmpty()) {
                imageUrls.add(imageUrl);
            }
        }

        // 현재 DB content 컬럼(텍스트) 하나만 사용 중이라, 이미지 URL을 함께 저장
        StringBuilder mergedContent = new StringBuilder(textContent);
        if (!imageUrls.isEmpty()) {
            mergedContent.append("\n\n[IMAGES]\n");
            for (String imageUrl : imageUrls) {
                mergedContent.append(imageUrl).append("\n");
            }
        }
        String finalContent = mergedContent.toString().trim();
        dto.setContent(finalContent);

        if (finalContent.isEmpty()) {
            log.warn("본문 비어 있음: {}", dto.getLink());
        } else {
            log.debug("본문 길이: {} / {}", finalContent.length(), dto.getLink());
        }

        List<AttachmentDto> attachmentList = new ArrayList<>();
        Elements attachLinks = doc.select(
                ".file a, .attach a, .artclFile a, .view_file a, a[href*=download], a[href*=atchFileId]"
        );

        for (Element a : attachLinks) {
            String fileName = a.text().trim();
            String fileUrl = a.absUrl("href");
            if (!fileUrl.isEmpty()) {
                attachmentList.add(new AttachmentDto(fileName, fileUrl));
            }
        }
        dto.setAttachments(attachmentList);
        dto.setHasAttachment(dto.isHasAttachment() || !attachmentList.isEmpty());

        List<String> relatedLinks = new ArrayList<>();
        for (Element a : contentElement.select("a[href]")) {
            String href = a.absUrl("href");
            if (href.startsWith("http")) {
                relatedLinks.add(href);
            }
        }
        // 이미지 URL도 relatedLinks에 포함해두면 프론트에서 활용하기 쉬움
        relatedLinks.addAll(imageUrls);
        dto.setRelatedLinks(relatedLinks);

        dto.setApplyPeriod(extractFirst(textContent, APPLY_PERIOD_PATTERN));
        dto.setEligibility(extractFirst(textContent, ELIGIBILITY_PATTERN));
        dto.setAmountInfo(extractFirst(textContent, AMOUNT_PATTERN));
    }

    // Note: 이름은 기존 그대로 두고 동작만 "존재하면 반환"으로 변경
    private Element selectFirstNonEmpty(Document doc, String... selectors) {
        for (String selector : selectors) {
            Element found = doc.selectFirst(selector);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    private Long extractArticleId(String link) {
        Matcher m = ARTICLE_ID_PATTERN.matcher(link);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        try {
            String clean = value.replace("-", ".").replace("/", ".").trim();
            if (clean.matches("^\\d{2}\\.\\d{2}\\.\\d{2}$")) {
                clean = "20" + clean;
            }
            LocalDate parsed = LocalDate.parse(clean, DateTimeFormatter.ofPattern("yyyy.MM.dd"));
            dateParseSuccess++;
            return parsed;
        } catch (Exception ignored) {
            dateParseFail++;
            if (firstFailSample == null) firstFailSample = value;
            return null;
        }
    }

    private Integer parseInt(String value) {
        try {
            return Integer.parseInt(value.replaceAll("[^0-9]", ""));
        } catch (Exception ignored) {
            return null;
        }
    }

    private String textOrEmpty(Element element) {
        return element == null ? "" : element.text().trim();
    }

    private String extractFirst(String content, Pattern pattern) {
        Matcher matcher = pattern.matcher(content);
        return matcher.find() ? matcher.group(1) : null;
    }
}
