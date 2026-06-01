package com.example.demo;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * 이메일 발송 래퍼.
 * spring.mail.host(또는 SMTP 환경변수)가 설정되지 않으면 JavaMailSender 빈이 없으므로
 * 자동으로 비활성화된다(FCMService와 동일한 안전장치). 로컬/CI 환경에서 SMTP 없이도 기동 가능.
 */
@Slf4j
@Service
public class EmailService {

    private final JavaMailSender mailSender; // 미설정 시 null

    @Value("${app.mail.from:no-reply@inhacatch.kr}")
    private String fromAddress;

    // host가 빈 문자열이면(=환경변수 미설정) 자동 구성된 빈이 있더라도 비활성으로 간주
    @Value("${spring.mail.host:}")
    private String mailHost;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSender = mailSenderProvider.getIfAvailable();
    }

    public boolean isEnabled() {
        return mailSender != null && mailHost != null && !mailHost.isBlank();
    }

    /**
     * 단순 텍스트 메일 발송. 실패해도 호출부 흐름을 끊지 않도록 예외를 던지지 않고 false 반환.
     */
    public boolean send(String to, String subject, String body) {
        if (!isEnabled()) {
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            return true;
        } catch (Exception e) {
            log.warn("[EmailService] 메일 발송 실패 to={}: {}", to, e.getMessage());
            return false;
        }
    }

    /**
     * 비밀번호 재설정 임시 비밀번호 안내 메일.
     */
    public boolean sendTempPassword(String to, String tempPassword) {
        String subject = "[인하캐치] 임시 비밀번호 안내";
        String body = "안녕하세요, 인하캐치입니다.\n\n"
                + "요청하신 임시 비밀번호는 아래와 같습니다.\n\n"
                + "    " + tempPassword + "\n\n"
                + "로그인 후 반드시 [내 정보 > 비밀번호 변경]에서 새 비밀번호로 변경해주세요.\n"
                + "본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.\n\n"
                + "— 인하캐치 드림";
        return send(to, subject, body);
    }
}
