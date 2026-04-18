-- =========================================================
-- MARKETPLACE DE SERVICES FREELANCE LOCAL
-- PostgreSQL - Script complet
-- =========================================================
-- Exécuter ce script dans pgAdmin sur la base voulue
-- Exemple :
--   CREATE DATABASE marketplace_freelance_local;
-- puis exécuter ce script dans cette base
-- =========================================================

BEGIN;

-- =========================================================
-- 1) EXTENSIONS
-- =========================================================
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- 2) TYPES ENUM
-- =========================================================
DO $$
BEGIN
    CREATE TYPE user_role AS ENUM ('CLIENT', 'FREELANCER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING', 'DELETED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE availability_status AS ENUM ('AVAILABLE', 'BUSY', 'OFFLINE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE service_status AS ENUM ('DRAFT', 'PUBLISHED', 'SUSPENDED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE pricing_type AS ENUM ('FIXED', 'HOURLY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE request_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE order_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE notification_type AS ENUM (
        'NEW_REQUEST',
        'REQUEST_ACCEPTED',
        'REQUEST_REJECTED',
        'NEW_MESSAGE',
        'ORDER_UPDATED',
        'NEW_REVIEW',
        'SYSTEM'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE report_target_type AS ENUM ('USER', 'SERVICE', 'MESSAGE', 'REVIEW');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE report_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =========================================================
-- 3) FONCTIONS UTILES
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_freelancer_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_freelancer_id BIGINT;
BEGIN
    v_freelancer_id := COALESCE(NEW.freelancer_id, OLD.freelancer_id);

    UPDATE freelancer_profiles fp
    SET
        average_rating = COALESCE(src.avg_rating, 0),
        total_reviews  = COALESCE(src.total_reviews, 0),
        updated_at     = CURRENT_TIMESTAMP
    FROM (
        SELECT
            freelancer_id,
            ROUND(AVG(rating)::numeric, 2) AS avg_rating,
            COUNT(*)::INT AS total_reviews
        FROM reviews
        WHERE freelancer_id = v_freelancer_id
        GROUP BY freelancer_id
    ) AS src
    WHERE fp.id = v_freelancer_id;

    IF NOT FOUND THEN
        UPDATE freelancer_profiles
        SET
            average_rating = 0,
            total_reviews = 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_freelancer_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_completed_orders_count()
RETURNS TRIGGER AS $$
DECLARE
    v_freelancer_id BIGINT;
BEGIN
    v_freelancer_id := COALESCE(NEW.freelancer_id, OLD.freelancer_id);

    UPDATE freelancer_profiles fp
    SET
        completed_orders = (
            SELECT COUNT(*)
            FROM orders o
            WHERE o.freelancer_id = v_freelancer_id
              AND o.status = 'COMPLETED'
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE fp.id = v_freelancer_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- 4) TABLE USERS
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id                  BIGSERIAL PRIMARY KEY,
    first_name          VARCHAR(100) NOT NULL,
    last_name           VARCHAR(100) NOT NULL,
    email               CITEXT NOT NULL UNIQUE,
    password_hash       VARCHAR(255) NOT NULL,
    role                user_role NOT NULL DEFAULT 'CLIENT',
    phone               VARCHAR(30),
    city                VARCHAR(120),
    profile_picture_url TEXT,
    status              user_status NOT NULL DEFAULT 'ACTIVE',
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_first_name_not_empty CHECK (char_length(trim(first_name)) >= 2),
    CONSTRAINT chk_users_last_name_not_empty  CHECK (char_length(trim(last_name)) >= 2),
    CONSTRAINT chk_users_email_format CHECK (position('@' in email) > 1)
);

-- =========================================================
-- 5) TABLE FREELANCER PROFILES
-- =========================================================
CREATE TABLE IF NOT EXISTS freelancer_profiles (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE,
    headline            VARCHAR(150),
    professional_bio    TEXT,
    skills              TEXT[] NOT NULL DEFAULT '{}',
    hourly_rate         NUMERIC(10,2) NOT NULL DEFAULT 0,
    experience_years    SMALLINT NOT NULL DEFAULT 0,
    portfolio_url       TEXT,
    availability        availability_status NOT NULL DEFAULT 'AVAILABLE',
    average_rating      NUMERIC(3,2) NOT NULL DEFAULT 0,
    total_reviews       INT NOT NULL DEFAULT 0,
    completed_orders    INT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_freelancer_profiles_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_freelancer_hourly_rate CHECK (hourly_rate >= 0),
    CONSTRAINT chk_freelancer_experience_years CHECK (experience_years >= 0 AND experience_years <= 60),
    CONSTRAINT chk_freelancer_average_rating CHECK (average_rating >= 0 AND average_rating <= 5),
    CONSTRAINT chk_freelancer_total_reviews CHECK (total_reviews >= 0),
    CONSTRAINT chk_freelancer_completed_orders CHECK (completed_orders >= 0)
);

-- =========================================================
-- 6) TABLE CATEGORIES
-- =========================================================
CREATE TABLE IF NOT EXISTS categories (
    id              BIGSERIAL PRIMARY KEY,
    parent_id       BIGINT,
    name            CITEXT NOT NULL UNIQUE,
    slug            CITEXT NOT NULL UNIQUE,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_categories_parent
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- =========================================================
-- 7) TABLE SERVICES
-- =========================================================
CREATE TABLE IF NOT EXISTS services (
    id                  BIGSERIAL PRIMARY KEY,
    freelancer_id       BIGINT NOT NULL,
    category_id         BIGINT NOT NULL,
    title               VARCHAR(160) NOT NULL,
    slug                CITEXT NOT NULL UNIQUE,
    short_description   VARCHAR(300),
    description         TEXT NOT NULL,
    price               NUMERIC(12,2) NOT NULL,
    pricing_type        pricing_type NOT NULL DEFAULT 'FIXED',
    delivery_time_days  INT NOT NULL DEFAULT 1,
    city                VARCHAR(120) NOT NULL,
    is_remote           BOOLEAN NOT NULL DEFAULT FALSE,
    status              service_status NOT NULL DEFAULT 'DRAFT',
    cover_image_url     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_services_freelancer
        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,

    CONSTRAINT fk_services_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,

    CONSTRAINT chk_services_title_not_empty CHECK (char_length(trim(title)) >= 3),
    CONSTRAINT chk_services_description_not_empty CHECK (char_length(trim(description)) >= 10),
    CONSTRAINT chk_services_price CHECK (price >= 0),
    CONSTRAINT chk_services_delivery_time_days CHECK (delivery_time_days >= 0)
);

-- =========================================================
-- 8) TABLE SERVICE IMAGES
-- =========================================================
CREATE TABLE IF NOT EXISTS service_images (
    id              BIGSERIAL PRIMARY KEY,
    service_id      BIGINT NOT NULL,
    image_url       TEXT NOT NULL,
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_images_service
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,

    CONSTRAINT chk_service_images_sort_order CHECK (sort_order >= 0)
);

-- =========================================================
-- 9) TABLE ORDER REQUESTS
-- =========================================================
CREATE TABLE IF NOT EXISTS order_requests (
    id                  BIGSERIAL PRIMARY KEY,
    client_id           BIGINT NOT NULL,
    service_id          BIGINT NOT NULL,
    message             TEXT NOT NULL,
    proposed_budget     NUMERIC(12,2),
    proposed_date       DATE,
    status              request_status NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_requests_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_order_requests_service
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,

    CONSTRAINT chk_order_requests_message_not_empty CHECK (char_length(trim(message)) >= 5),
    CONSTRAINT chk_order_requests_proposed_budget CHECK (proposed_budget IS NULL OR proposed_budget >= 0)
);

-- =========================================================
-- 10) TABLE ORDERS
-- =========================================================
CREATE TABLE IF NOT EXISTS orders (
    id                  BIGSERIAL PRIMARY KEY,
    request_id          BIGINT NOT NULL UNIQUE,
    service_id          BIGINT NOT NULL,
    client_id           BIGINT NOT NULL,
    freelancer_id       BIGINT NOT NULL,
    agreed_price        NUMERIC(12,2) NOT NULL,
    start_date          DATE,
    end_date            DATE,
    status              order_status NOT NULL DEFAULT 'PENDING',
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_request
        FOREIGN KEY (request_id) REFERENCES order_requests(id) ON DELETE RESTRICT,

    CONSTRAINT fk_orders_service
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT,

    CONSTRAINT fk_orders_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE RESTRICT,

    CONSTRAINT fk_orders_freelancer
        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE RESTRICT,

    CONSTRAINT chk_orders_price CHECK (agreed_price >= 0),
    CONSTRAINT chk_orders_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

-- =========================================================
-- 11) TABLE CONVERSATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS conversations (
    id                  BIGSERIAL PRIMARY KEY,
    client_id           BIGINT NOT NULL,
    freelancer_id       BIGINT NOT NULL,
    order_id            BIGINT,
    last_message_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_conversations_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_conversations_freelancer
        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,

    CONSTRAINT fk_conversations_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Une conversation unique par commande
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_order
    ON conversations(order_id)
    WHERE order_id IS NOT NULL;

-- Une conversation générale unique client/freelance hors commande
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_general
    ON conversations(client_id, freelancer_id)
    WHERE order_id IS NULL;

-- =========================================================
-- 12) TABLE MESSAGES
-- =========================================================
CREATE TABLE IF NOT EXISTS messages (
    id                  BIGSERIAL PRIMARY KEY,
    conversation_id     BIGINT NOT NULL,
    sender_user_id      BIGINT NOT NULL,
    content             TEXT NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_messages_content_not_empty CHECK (char_length(trim(content)) >= 1)
);

-- =========================================================
-- 13) TABLE REVIEWS
-- =========================================================
CREATE TABLE IF NOT EXISTS reviews (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT NOT NULL UNIQUE,
    client_id           BIGINT NOT NULL,
    freelancer_id       BIGINT NOT NULL,
    rating              INT NOT NULL,
    comment             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

    CONSTRAINT fk_reviews_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_reviews_freelancer
        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,

    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

-- =========================================================
-- 14) TABLE NOTIFICATIONS
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    type                notification_type NOT NULL,
    title               VARCHAR(150) NOT NULL,
    body                TEXT,
    related_entity_type VARCHAR(50),
    related_entity_id   BIGINT,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_notifications_title_not_empty CHECK (char_length(trim(title)) >= 2)
);

-- =========================================================
-- 15) TABLE REPORTS
-- =========================================================
CREATE TABLE IF NOT EXISTS reports (
    id                  BIGSERIAL PRIMARY KEY,
    reporter_id         BIGINT NOT NULL,
    target_type         report_target_type NOT NULL,
    target_id           BIGINT NOT NULL,
    reason              TEXT NOT NULL,
    status              report_status NOT NULL DEFAULT 'OPEN',
    admin_note          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reports_reporter
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_reports_reason_not_empty CHECK (char_length(trim(reason)) >= 5)
);

-- =========================================================
-- 16) INDEX
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);

CREATE INDEX IF NOT EXISTS idx_freelancer_profiles_user_id ON freelancer_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_profiles_availability ON freelancer_profiles(availability);

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

CREATE INDEX IF NOT EXISTS idx_services_freelancer_id ON services(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_city ON services(city);
CREATE INDEX IF NOT EXISTS idx_services_status ON services(status);
CREATE INDEX IF NOT EXISTS idx_services_price ON services(price);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON services(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_images_service_id ON service_images(service_id);

CREATE INDEX IF NOT EXISTS idx_order_requests_client_id ON order_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_service_id ON order_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_requests_created_at ON order_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_freelancer_id ON orders(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_freelancer_id ON conversations(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

CREATE INDEX IF NOT EXISTS idx_reviews_freelancer_id ON reviews(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target_type ON reports(target_type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- =========================================================
-- 17) TRIGGERS updated_at
-- =========================================================
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_freelancer_profiles_updated_at ON freelancer_profiles;
CREATE TRIGGER trg_freelancer_profiles_updated_at
BEFORE UPDATE ON freelancer_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_services_updated_at ON services;
CREATE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_order_requests_updated_at ON order_requests;
CREATE TRIGGER trg_order_requests_updated_at
BEFORE UPDATE ON order_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_conversations_updated_at ON conversations;
CREATE TRIGGER trg_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reports_updated_at ON reports;
CREATE TRIGGER trg_reports_updated_at
BEFORE UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- 18) TRIGGERS métiers
-- =========================================================
DROP TRIGGER IF EXISTS trg_reviews_refresh_freelancer_rating ON reviews;
CREATE TRIGGER trg_reviews_refresh_freelancer_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION refresh_freelancer_rating();

DROP TRIGGER IF EXISTS trg_orders_refresh_completed_orders ON orders;
CREATE TRIGGER trg_orders_refresh_completed_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION refresh_completed_orders_count();

COMMIT;
