# ─── Build stage ───
FROM gradle:8.10-jdk17 AS builder
WORKDIR /workspace

# 의존성만 먼저 복사해 캐시 활용
COPY build.gradle settings.gradle gradlew ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon || true

# 소스 복사 후 빌드
COPY src ./src
RUN gradle bootJar --no-daemon -x test

# ─── Runtime stage ───
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# 비root 유저
RUN addgroup -S app && adduser -S app -G app
USER app

COPY --from=builder /workspace/build/libs/*.jar app.jar

# Firebase 서비스 계정 JSON은 외부 볼륨 또는 시크릿으로 마운트
# (docker-compose에서 ./secrets:/app/secrets:ro 바인드)
ENV FIREBASE_SERVICE_ACCOUNT_PATH=/app/secrets/firebase-service-account.json

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
