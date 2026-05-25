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
public class OrderDisputeSchemaInitializer implements ApplicationRunner {

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
                          AND table_name = 'orders'
                    ) THEN
                        ALTER TABLE orders
                            ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
                            ADD COLUMN IF NOT EXISTS dispute_admin_notes TEXT,
                            ADD COLUMN IF NOT EXISTS dispute_opened_by_id BIGINT,
                            ADD COLUMN IF NOT EXISTS dispute_opened_at TIMESTAMPTZ,
                            ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
                            ADD COLUMN IF NOT EXISTS dispute_resolution VARCHAR(30);

                        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_dispute_opened_by') THEN
                            ALTER TABLE orders
                                ADD CONSTRAINT fk_orders_dispute_opened_by
                                FOREIGN KEY (dispute_opened_by_id) REFERENCES users(id) ON DELETE SET NULL;
                        END IF;
                    END IF;
                END $$;
                """);
        jdbcTemplate.execute("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM information_schema.tables
                        WHERE table_schema = 'public'
                          AND table_name = 'orders'
                    ) THEN
                        CREATE INDEX IF NOT EXISTS idx_orders_dispute_opened_at ON orders(dispute_opened_at DESC);
                    END IF;
                END $$;
                """);
    }
}
