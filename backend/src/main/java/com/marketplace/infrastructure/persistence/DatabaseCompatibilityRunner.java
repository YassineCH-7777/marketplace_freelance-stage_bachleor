package com.marketplace.infrastructure.persistence;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnBean(JdbcTemplate.class)
@RequiredArgsConstructor
public class DatabaseCompatibilityRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        ensureUserAuthColumns();
    }

    private void ensureUserAuthColumns() {
        jdbcTemplate.execute("ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'DELETED'");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'PASSWORD'");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS search_city VARCHAR(120)");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS search_place_id VARCHAR(255)");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS search_latitude DOUBLE PRECISION");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS search_longitude DOUBLE PRECISION");
        jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS search_radius_km INT NOT NULL DEFAULT 10");
        jdbcTemplate.update("""
                UPDATE users
                SET email_verified = TRUE
                WHERE status = 'ACTIVE'
                  AND email_verified = FALSE
                """);
    }
}
