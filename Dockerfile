# Railway/backend Dockerfile for the monorepo root.
# Local Docker Compose still uses backend/Dockerfile.
FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY backend/pom.xml ./pom.xml
COPY backend/src ./src

RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
