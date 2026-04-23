# Multi-stage Dockerfile for building and running the Spring Boot backend

# Build stage: use Maven to compile the app and create the executable jar
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /workspace

# copy maven manifest first for dependency caching
COPY pom.xml ./
COPY src ./src/

RUN mvn -B -DskipTests package

# Runtime stage: slim JRE image
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy packaged jar from build stage
COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar

EXPOSE 8080

# sensible defaults for connecting to the postgres service in docker-compose
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/marketplace_freelance
ENV SPRING_DATASOURCE_USERNAME=postgres
ENV SPRING_DATASOURCE_PASSWORD=admin
ENV SERVER_PORT=8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
