package com.example.demo;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.FileInputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Firebase Cloud Messaging 서비스.
 * firebase.service-account-path 가 비어있으면 초기화 스킵 (개발 환경용).
 */
@Service
public class FcmService {

    private static final Logger log = LoggerFactory.getLogger(FcmService.class);

    @Value("${firebase.service-account-path:}")
    private String serviceAccountPath;

    private boolean enabled = false;

    @PostConstruct
    public void init() {
        if (serviceAccountPath == null || serviceAccountPath.isBlank()) {
            log.warn("[FCM] firebase.service-account-path 미설정 → FCM 비활성화");
            return;
        }
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                try (FileInputStream serviceAccount = new FileInputStream(serviceAccountPath)) {
                    FirebaseOptions options = FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                            .build();
                    FirebaseApp.initializeApp(options);
                }
            }
            enabled = true;
            log.info("[FCM] Firebase Admin SDK 초기화 완료");
        } catch (Exception e) {
            log.error("[FCM] Firebase 초기화 실패: {}", e.getMessage());
            enabled = false;
        }
    }

    /**
     * 특정 사용자 단말로 푸시 발송.
     * @param fcmToken 대상 단말 FCM 토큰
     * @param title 알림 제목
     * @param body 알림 본문
     * @param scholarshipId 탭 시 이동할 공고 ID (nullable)
     */
    public boolean sendToDevice(String fcmToken, String title, String body, Long scholarshipId) {
        if (!enabled) {
            log.debug("[FCM] 비활성화 상태라 전송 생략: {}", title);
            return false;
        }
        if (fcmToken == null || fcmToken.isBlank()) return false;

        try {
            Map<String, String> data = new HashMap<>();
            if (scholarshipId != null) data.put("scholarshipId", String.valueOf(scholarshipId));
            data.put("type", "NEW");

            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putAllData(data)
                    .build();

            String resp = FirebaseMessaging.getInstance().send(message);
            log.info("[FCM] 전송 성공 msgId={} title={}", resp, title);
            return true;
        } catch (Exception e) {
            log.warn("[FCM] 전송 실패 ({}): {}", title, e.getMessage());
            return false;
        }
    }
}
