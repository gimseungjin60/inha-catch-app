package com.example.demo;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class InhatcCrawler {

    private static final Logger log = LoggerFactory.getLogger(InhatcCrawler.class);

    private static final Pattern ARTICLE_ID_PATTERN = Pattern.compile("/(\\d+)/artclView\\.do");
    private static final Pattern COMBBBS_ID_PATTERN = Pattern.compile("jf_combBbs_view\\('kr','(\\d+)','(\\d+)','(\\d+)'\\)");
    private static final Pattern APPLY_PERIOD_PATTERN = Pattern.compile("(신청\\s*기간[:：]?\\s*[^\\n]+)");
    private static final Pattern ELIGIBILITY_PATTERN = Pattern.compile("(지원\\s*대상[:：]?\\s*[^\\n]+)");
    private static final Pattern AMOUNT_PATTERN = Pattern.compile("(장학\\s*금액[:：]?\\s*[^\\n]+)");

    private static final int MIN_YEAR = 2025;

    /**
     * 장학정보 크롤링 (게시판 17)
     * URL: /bbs/kr/17/artclList.do?page={page}
     */
    public List<ScholarshipDto> crawlScholarshipPages() throws Exception {
        List<ScholarshipDto> result = new ArrayList<>();
        Set<String> visitedLinks = new HashSet<>();

        int page = 1;
        while (true) {
            String url = "https://www.inhatc.ac.kr/bbs/kr/17/artclList.do?page=" + page;
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0")
                    .referrer("https://www.google.com")
                    .timeout(15000)
                    .get();

            Elements rows = doc.select("table tbody tr");
            if (rows.isEmpty()) break;

            int added = 0;
            boolean stopCrawling = false;

            for (Element row : rows) {
                Element titleElement = row.selectFirst("td:nth-child(2) a");
                if (titleElement == null) continue;

                String title = titleElement.text().trim();
                String link = titleElement.absUrl("href");
                if (link.isEmpty() || visitedLinks.contains(link)) continue;

                Long articleId = extractArticleId(link);

                // 날짜 파싱 (td 3번째 = 작성일)
                LocalDate postedAt = parseDate(textOrEmpty(row.selectFirst("td:nth-child(3)")));
                if (postedAt == null) {
                    log.debug("[장학] 날짜 없는 게시글 스킵: {}", title);
                    continue;
                }

                // MIN_YEAR 미만 데이터는 크롤링 중단
                if (postedAt.getYear() < MIN_YEAR) {
                    log.info("[장학] {}년도 이하 데이터 발견. 크롤링 종료: {}", MIN_YEAR - 1, title);
                    stopCrawling = true;
                    break;
                }

                String numberText = textOrEmpty(row.selectFirst("td:nth-child(1)"));
                boolean isNotice = row.hasClass("notice") || numberText.contains("공지");
                String author = "";
                Integer viewCount = parseInt(textOrEmpty(row.selectFirst("td:nth-child(4)")));
                boolean hasAttachment = !row.select("td:nth-child(5) img, td:nth-child(5) a, td:nth-child(5) i").isEmpty();

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

            if (stopCrawling || added == 0 || page >= 100) break;
            page++;
        }

        log.info("[장학] 총 {}건 수집 완료", result.size());
        return result;
    }

    /**
     * 공모전 크롤링
     * URL: /combBbs/kr/2/list.do?findWord=공모전&findType=sj&page={page}
     */
    public List<ScholarshipDto> crawlContestPages() throws Exception {
        List<ScholarshipDto> result = new ArrayList<>();
        Set<String> visitedIds = new HashSet<>();

        int page = 1;
        while (true) {
            String url = "https://www.inhatc.ac.kr/combBbs/kr/2/list.do?findWord=%EA%B3%B5%EB%AA%A8%EC%A0%84&findType=sj&page=" + page;
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0")
                    .referrer("https://www.google.com")
                    .timeout(15000)
                    .get();

            Elements rows = doc.select("table tbody tr");
            if (rows.isEmpty()) break;

            int added = 0;
            boolean stopCrawling = false;

            for (Element row : rows) {
                Element titleElement = row.selectFirst("td:nth-child(2) a");
                if (titleElement == null) continue;

                String title = titleElement.text().trim();

                // JavaScript 링크에서 ID 추출: jf_combBbs_view('kr','2','18','104773')
                String onclick = titleElement.attr("href");
                if (onclick == null || onclick.isEmpty()) {
                    onclick = titleElement.attr("onclick");
                }
                Matcher idMatcher = COMBBBS_ID_PATTERN.matcher(onclick != null ? onclick : "");
                if (!idMatcher.find()) continue;

                String combBbsId = idMatcher.group(2); // 게시판 카테고리 ID (18 등)
                String articleIdStr = idMatcher.group(3);
                Long articleId;
                try {
                    articleId = Long.parseLong(articleIdStr);
                } catch (NumberFormatException e) {
                    continue;
                }

                String uniqueKey = combBbsId + "_" + articleId;
                if (visitedIds.contains(uniqueKey)) continue;

                // 날짜 파싱
                LocalDate postedAt = parseDate(textOrEmpty(row.selectFirst("td:nth-child(4)")));
                if (postedAt == null) {
                    // 공모전 테이블은 컬럼 구조가 다를 수 있으므로 3번째도 시도
                    postedAt = parseDate(textOrEmpty(row.selectFirst("td:nth-child(3)")));
                }
                if (postedAt == null) {
                    log.debug("[공모전] 날짜 없는 게시글 스킵: {}", title);
                    continue;
                }

                if (postedAt.getYear() < MIN_YEAR) {
                    log.info("[공모전] {}년도 이하 데이터 발견. 크롤링 종료: {}", MIN_YEAR - 1, title);
                    stopCrawling = true;
                    break;
                }

                // 상세 페이지 URL 구성
                String detailUrl = "https://www.inhatc.ac.kr/combBbs/kr/2/" + combBbsId + "/" + articleId + "/view.do";

                String author = textOrEmpty(row.selectFirst("td:nth-child(3)"));
                Integer viewCount = parseInt(textOrEmpty(row.selectFirst("td:nth-child(5)")));

                ScholarshipDto dto = new ScholarshipDto(articleId, title, detailUrl);
                dto.setNotice(false);
                dto.setAuthor(author);
                dto.setPostedAt(postedAt);
                dto.setViewCount(viewCount);
                dto.setHasAttachment(false);

                result.add(dto);
                visitedIds.add(uniqueKey);
                added++;
            }

            if (stopCrawling || added == 0 || page >= 50) break;
            page++;
        }

        log.info("[공모전] 총 {}건 수집 완료", result.size());
        return result;
    }

    /**
     * 취업정보 크롤링 (er/402 게시판)
     * URL: /bbs/er/402/artclList.do?page={page}
     * 컬럼 구조는 장학정보와 동일 (번호/제목/작성일/조회수/첨부)
     */
    public List<ScholarshipDto> crawlJobPages() throws Exception {
        List<ScholarshipDto> result = new ArrayList<>();
        Set<String> visitedLinks = new HashSet<>();

        int page = 1;
        while (true) {
            String url = "https://www.inhatc.ac.kr/bbs/er/402/artclList.do?page=" + page;
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0")
                    .referrer("https://www.google.com")
                    .timeout(15000)
                    .get();

            Elements rows = doc.select("table tbody tr");
            if (rows.isEmpty()) break;

            int added = 0;
            boolean stopCrawling = false;

            for (Element row : rows) {
                Element titleElement = row.selectFirst("td:nth-child(2) a");
                if (titleElement == null) continue;

                String title = titleElement.text().trim();
                String link = titleElement.absUrl("href");
                if (link.isEmpty() || visitedLinks.contains(link)) continue;

                Long articleId = extractArticleId(link);
                if (articleId == null) continue;

                LocalDate postedAt = parseDate(textOrEmpty(row.selectFirst("td:nth-child(3)")));
                if (postedAt == null) {
                    log.debug("[취업] 날짜 없는 게시글 스킵: {}", title);
                    continue;
                }

                if (postedAt.getYear() < MIN_YEAR) {
                    log.info("[취업] {}년도 이하 데이터 발견. 크롤링 종료: {}", MIN_YEAR - 1, title);
                    stopCrawling = true;
                    break;
                }

                String numberText = textOrEmpty(row.selectFirst("td:nth-child(1)"));
                boolean isNotice = row.hasClass("notice") || numberText.contains("공지");
                Integer viewCount = parseInt(textOrEmpty(row.selectFirst("td:nth-child(4)")));
                boolean hasAttachment = !row.select("td:nth-child(5) img, td:nth-child(5) a, td:nth-child(5) i").isEmpty();

                ScholarshipDto dto = new ScholarshipDto(articleId, title, link);
                dto.setNotice(isNotice);
                dto.setAuthor("");
                dto.setPostedAt(postedAt);
                dto.setViewCount(viewCount);
                dto.setHasAttachment(hasAttachment);

                result.add(dto);
                visitedLinks.add(link);
                added++;
            }

            if (stopCrawling || added == 0 || page >= 100) break;
            page++;
        }

        log.info("[취업] 총 {}건 수집 완료", result.size());
        return result;
    }

    /**
     * 기존 호환용: boardId별 크롤링
     */
    public List<ScholarshipDto> crawlAllPages(String boardId) throws Exception {
        return crawlScholarshipPages();
    }

    /**
     * 상세 페이지 크롤링 (장학/공모전 공통)
     */
    public void crawlDetail(ScholarshipDto dto) throws Exception {
        Document doc = Jsoup.connect(dto.getLink())
                .userAgent("Mozilla/5.0")
                .referrer("https://www.google.com")
                .timeout(15000)
                .get();

        Element contentElement = selectFirstNonEmpty(
                doc,
                "#artclView .view-con",
                ".view-con",
                "#artclView .view_con",
                ".view_con",
                "#artclView",
                ".artclView",
                ".board_view_con",
                ".view_content",
                "#contents .con"
        );

        if (contentElement == null) {
            dto.setContent("");
            dto.setAttachments(new ArrayList<>());
            dto.setRelatedLinks(new ArrayList<>());
            dto.setApplyPeriod(null);
            dto.setEligibility(null);
            dto.setAmountInfo(null);
            log.warn("[WARN] 본문 추출 실패: {}", dto.getLink());
            return;
        }

        contentElement.select("br").append("\n");
        contentElement.select("p").prepend("\n\n");
        String textContent = contentElement.wholeText().replaceAll("(?m)^\\s*$\n", "").trim();

        List<String> imageUrls = new ArrayList<>();
        for (Element img : contentElement.select("img")) {
            String imageUrl = img.hasAttr("data-src") ? img.absUrl("data-src") : "";
            if (imageUrl.isEmpty()) imageUrl = img.absUrl("src");
            if (!imageUrl.isEmpty()) imageUrls.add(imageUrl);
        }

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
            log.warn("[WARN] 본문 비어 있음: {}", dto.getLink());
        } else {
            log.debug("[OK] 본문 길이: {} / {}", finalContent.length(), dto.getLink());
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
            if (href.startsWith("http")) relatedLinks.add(href);
        }
        relatedLinks.addAll(imageUrls);
        dto.setRelatedLinks(relatedLinks);

        dto.setApplyPeriod(extractFirst(textContent, APPLY_PERIOD_PATTERN));
        dto.setEligibility(extractFirst(textContent, ELIGIBILITY_PATTERN));
        dto.setAmountInfo(extractFirst(textContent, AMOUNT_PATTERN));
    }

    private Element selectFirstNonEmpty(Document doc, String... selectors) {
        for (String selector : selectors) {
            Element found = doc.selectFirst(selector);
            if (found != null) return found;
        }
        return null;
    }

    private Long extractArticleId(String link) {
        Matcher m = ARTICLE_ID_PATTERN.matcher(link);
        if (m.find()) {
            try { return Long.parseLong(m.group(1)); }
            catch (NumberFormatException ignored) { return null; }
        }
        return null;
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        try {
            String clean = value.replace("-", ".").replace("/", ".").trim();
            // 끝에 마침표 제거 (예: "2026.03.31.")
            if (clean.endsWith(".")) clean = clean.substring(0, clean.length() - 1);
            if (clean.matches("^\\d{2}\\.\\d{2}\\.\\d{2}$")) {
                clean = "20" + clean;
            }
            return LocalDate.parse(clean, DateTimeFormatter.ofPattern("yyyy.MM.dd"));
        } catch (Exception ignored) {
            log.debug("[parseDate] 날짜 파싱 실패: {}", value);
            return null;
        }
    }

    private Integer parseInt(String value) {
        try { return Integer.parseInt(value.replaceAll("[^0-9]", "")); }
        catch (Exception ignored) { return null; }
    }

    private String textOrEmpty(Element element) {
        return element == null ? "" : element.text().trim();
    }

    private String extractFirst(String content, Pattern pattern) {
        Matcher matcher = pattern.matcher(content);
        return matcher.find() ? matcher.group(1) : null;
    }
}
