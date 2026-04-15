package com.example.demo;

import com.google.firebase.messaging.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class FCMService {

    private final FirebaseMessaging firebaseMessaging;

    public FCMService(@Nullable FirebaseMessaging firebaseMessaging) {
        this.firebaseMessaging = firebaseMessaging;
    }

    public boolean isAvailable() {
        return firebaseMessaging != null;
    }

    /**
     * 단일 사용자에게 푸시 알림 발송
     */
    public boolean sendToUser(String fcmToken, String title, String body, Map<String, String> data) {
        if (!isAvailable() || fcmToken == null || fcmToken.isBlank()) {
            return false;
        }

        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putAllData(data)
                    .setAndroidConfig(AndroidConfig.builder()
                            .setPriority(AndroidConfig.Priority.HIGH)
                            .setNotification(AndroidNotification.builder()
                                    .setClickAction("OPEN_SCHOLARSHIP_DETAIL")
                                    .build())
                            .build())
                    .build();

            String messageId = firebaseMessaging.send(message);
            log.debug("FCM 발송 성공: {}", messageId);
            return true;
        } catch (FirebaseMessagingException e) {
            if (e.getMessagingErrorCode() == MessagingErrorCode.UNREGISTERED
                    || e.getMessagingErrorCode() == MessagingErrorCode.INVALID_ARGUMENT) {
                log.warn("유효하지 않은 FCM 토큰: {}", fcmToken.substring(0, Math.min(10, fcmToken.length())));
            } else {
                log.error("FCM 발송 실패: {}", e.getMessage());
            }
            return false;
        }
    }

    /**
     * 여러 사용자에게 일괄 푸시 알림 발송
     */
    public int sendToMultipleUsers(List<String> fcmTokens, String title, String body, Map<String, String> data) {
        if (!isAvailable() || fcmTokens == null || fcmTokens.isEmpty()) {
            return 0;
        }

        // FCM은 한번에 최대 500개 토큰 처리
        int successCount = 0;
        for (int i = 0; i < fcmTokens.size(); i += 500) {
            List<String> batch = fcmTokens.subList(i, Math.min(i + 500, fcmTokens.size()));

            try {
                MulticastMessage message = MulticastMessage.builder()
                        .addAllTokens(batch)
                        .setNotification(Notification.builder()
                                .setTitle(title)
                                .setBody(body)
                                .build())
                        .putAllData(data)
                        .setAndroidConfig(AndroidConfig.builder()
                                .setPriority(AndroidConfig.Priority.HIGH)
                                .build())
                        .build();

                BatchResponse response = firebaseMessaging.sendEachForMulticast(message);
                successCount += response.getSuccessCount();

                if (response.getFailureCount() > 0) {
                    log.warn("FCM 일괄 발송 일부 실패: 성공 {}, 실패 {}",
                            response.getSuccessCount(), response.getFailureCount());
                }
            } catch (FirebaseMessagingException e) {
                log.error("FCM 일괄 발송 오류: {}", e.getMessage());
            }
        }

        return successCount;
    }
}
