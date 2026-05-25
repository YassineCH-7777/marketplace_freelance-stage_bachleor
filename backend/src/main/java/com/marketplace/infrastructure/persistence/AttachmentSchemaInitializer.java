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
public class AttachmentSchemaInitializer implements ApplicationRunner {

    private final ObjectProvider<DataSource> dataSourceProvider;

    @Override
    public void run(ApplicationArguments args) {
        DataSource dataSource = dataSourceProvider.getIfAvailable();
        if (dataSource == null) {
            return;
        }

        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS attachments (
                    id                  BIGSERIAL PRIMARY KEY,
                    uploader_id         BIGINT NOT NULL,
                    message_id          BIGINT,
                    service_request_id  BIGINT,
                    order_id            BIGINT,
                    attachment_type     VARCHAR(40) NOT NULL DEFAULT 'OTHER',
                    original_file_name  VARCHAR(255) NOT NULL,
                    stored_file_name    VARCHAR(255) NOT NULL UNIQUE,
                    content_type        VARCHAR(120) NOT NULL,
                    file_size           BIGINT NOT NULL,
                    file_url            TEXT NOT NULL,
                    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT fk_attachments_uploader
                        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,

                    CONSTRAINT fk_attachments_message
                        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,

                    CONSTRAINT fk_attachments_service_request
                        FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,

                    CONSTRAINT fk_attachments_order
                        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

                    CONSTRAINT chk_attachments_file_size CHECK (file_size > 0),
                    CONSTRAINT chk_attachments_context CHECK (num_nonnulls(message_id, service_request_id, order_id) = 1)
                )
                """);
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id ON attachments(uploader_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_attachments_service_request_id ON attachments(service_request_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_attachments_order_id ON attachments(order_id)");
        jdbcTemplate.execute("CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC)");
    }
}
