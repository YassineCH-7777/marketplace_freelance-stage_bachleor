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
public class FavoriteSchemaInitializer implements ApplicationRunner {

    private final ObjectProvider<DataSource> dataSourceProvider;

    @Override
    public void run(ApplicationArguments args) {
        DataSource dataSource = dataSourceProvider.getIfAvailable();
        if (dataSource == null) {
            return;
        }

        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS client_favorites (
                    id             BIGSERIAL PRIMARY KEY,
                    client_id      BIGINT NOT NULL,
                    service_id     BIGINT,
                    freelancer_id  BIGINT,
                    created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT fk_client_favorites_client
                        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

                    CONSTRAINT fk_client_favorites_service
                        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,

                    CONSTRAINT fk_client_favorites_freelancer
                        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,

                    CONSTRAINT chk_client_favorites_context CHECK (num_nonnulls(service_id, freelancer_id) = 1),
                    CONSTRAINT uq_client_favorites_service UNIQUE (client_id, service_id),
                    CONSTRAINT uq_client_favorites_freelancer UNIQUE (client_id, freelancer_id)
                )
                """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_client_favorites_client_id ON client_favorites(client_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_client_favorites_service_id ON client_favorites(service_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_client_favorites_freelancer_id ON client_favorites(freelancer_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_client_favorites_created_at ON client_favorites(created_at DESC)");
    }
}
