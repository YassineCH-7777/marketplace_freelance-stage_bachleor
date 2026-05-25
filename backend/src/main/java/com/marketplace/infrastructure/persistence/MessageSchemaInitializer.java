package com.marketplace.infrastructure.persistence;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;

@Component
@RequiredArgsConstructor
public class MessageSchemaInitializer implements ApplicationRunner {

    private final ObjectProvider<DataSource> dataSourceProvider;

    @Override
    public void run(ApplicationArguments args) {
        DataSource dataSource = dataSourceProvider.getIfAvailable();
        if (dataSource == null) {
            return;
        }

        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'messages'
                    ) THEN
                        ALTER TABLE messages
                            ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;

                        CREATE INDEX IF NOT EXISTS idx_messages_is_important
                            ON messages(is_important);
                    END IF;
                END $$;
                """);
    }
}
