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
    CREATE TYPE order_status AS ENUM (
        'PENDING',
        'ACCEPTED',
        'IN_PROGRESS',
        'WAITING_CLIENT',
        'DELIVERED',
        'REVISION',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'WAITING_CLIENT';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'REVISION';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'DISPUTED';

DO $$
BEGIN
    CREATE TYPE payment_status AS ENUM ('UNPAID', 'PENDING', 'PAID', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE mission_milestone_status AS ENUM ('PENDING', 'IN_PROGRESS', 'WAITING_CLIENT', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE mission_activity_type AS ENUM (
        'CREATED',
        'ACCEPTED',
        'STARTED',
        'PROGRESS_UPDATED',
        'MILESTONE_UPDATED',
        'DELIVERY_SUBMITTED',
        'CLIENT_ACCEPTED',
        'REVISION_REQUESTED',
        'STATUS_CHANGED',
        'PAYMENT_UPDATED',
        'CANCELLED',
        'DISPUTED'
    );
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
    search_city         VARCHAR(120),
    search_place_id     VARCHAR(255),
    search_latitude     DOUBLE PRECISION,
    search_longitude    DOUBLE PRECISION,
    search_radius_km    INT NOT NULL DEFAULT 10,
    profile_picture_url TEXT,
    status              user_status NOT NULL DEFAULT 'ACTIVE',
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at       TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_users_first_name_not_empty CHECK (char_length(trim(first_name)) >= 2),
    CONSTRAINT chk_users_last_name_not_empty  CHECK (char_length(trim(last_name)) >= 2),
    CONSTRAINT chk_users_email_format CHECK (position('@' in email) > 1),
    CONSTRAINT chk_users_search_latitude CHECK (search_latitude IS NULL OR search_latitude BETWEEN -90 AND 90),
    CONSTRAINT chk_users_search_longitude CHECK (search_longitude IS NULL OR search_longitude BETWEEN -180 AND 180),
    CONSTRAINT chk_users_search_radius CHECK (search_radius_km IN (5, 10, 20, 50))
);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS search_city VARCHAR(120),
    ADD COLUMN IF NOT EXISTS search_place_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS search_latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS search_longitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS search_radius_km INT NOT NULL DEFAULT 10;

UPDATE users
SET search_radius_km = 10
WHERE search_radius_km IS NULL
   OR search_radius_km NOT IN (5, 10, 20, 50);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_search_latitude') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_search_latitude CHECK (search_latitude IS NULL OR search_latitude BETWEEN -90 AND 90);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_search_longitude') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_search_longitude CHECK (search_longitude IS NULL OR search_longitude BETWEEN -180 AND 180);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_search_radius') THEN
        ALTER TABLE users
            ADD CONSTRAINT chk_users_search_radius CHECK (search_radius_km IN (5, 10, 20, 50));
    END IF;
END $$;

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
-- 8B) TABLE CLIENT FAVORITES
-- =========================================================
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
-- 9B) TABLE CLIENT REQUEST DRAFTS
-- =========================================================
CREATE TABLE IF NOT EXISTS client_request_drafts (
    id              BIGSERIAL PRIMARY KEY,
    client_id       BIGINT NOT NULL,
    category        VARCHAR(120),
    city            VARCHAR(120),
    mode            VARCHAR(30),
    budget          NUMERIC(12,2),
    deadline_days   INT,
    objective       TEXT,
    deliverables    TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_client_request_drafts_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_client_request_drafts_budget CHECK (budget IS NULL OR budget >= 0),
    CONSTRAINT chk_client_request_drafts_deadline CHECK (deadline_days IS NULL OR deadline_days >= 0)
);

-- =========================================================
-- 9C) TABLE FREELANCER PROFILE DRAFTS
-- =========================================================
CREATE TABLE IF NOT EXISTS freelancer_profile_drafts (
    id                          BIGSERIAL PRIMARY KEY,
    user_id                     BIGINT NOT NULL UNIQUE,
    headline                    VARCHAR(150),
    professional_bio            TEXT,
    skills                      TEXT[] NOT NULL DEFAULT '{}',
    city                        VARCHAR(120),
    availability                VARCHAR(40),
    hourly_rate                 NUMERIC(10,2),
    portfolio_url               TEXT,
    primary_categories          TEXT[] NOT NULL DEFAULT '{}',
    remote_mode                 VARCHAR(40),
    profile_completion_score    INT,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_freelancer_profile_drafts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_freelancer_profile_drafts_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
    CONSTRAINT chk_freelancer_profile_drafts_completion CHECK (
        profile_completion_score IS NULL OR profile_completion_score BETWEEN 0 AND 100
    )
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
    due_date            DATE,
    progress_percentage INT NOT NULL DEFAULT 0,
    payment_status      payment_status NOT NULL DEFAULT 'UNPAID',
    status              order_status NOT NULL DEFAULT 'PENDING',
    notes               TEXT,
    delivery_note       TEXT,
    revision_request    TEXT,
    revision_count      INT NOT NULL DEFAULT 0,
    max_revision_rounds INT NOT NULL DEFAULT 3,
    delivered_at        TIMESTAMPTZ,
    dispute_reason      TEXT,
    dispute_admin_notes TEXT,
    dispute_opened_by_id BIGINT,
    dispute_opened_at   TIMESTAMPTZ,
    dispute_resolved_at TIMESTAMPTZ,
    dispute_resolution  VARCHAR(30),
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

    CONSTRAINT fk_orders_dispute_opened_by
        FOREIGN KEY (dispute_opened_by_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT chk_orders_price CHECK (agreed_price >= 0),
    CONSTRAINT chk_orders_progress CHECK (progress_percentage BETWEEN 0 AND 100),
    CONSTRAINT chk_orders_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS progress_percentage INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_status payment_status NOT NULL DEFAULT 'UNPAID',
    ADD COLUMN IF NOT EXISTS delivery_note TEXT,
    ADD COLUMN IF NOT EXISTS revision_request TEXT,
    ADD COLUMN IF NOT EXISTS revision_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_revision_rounds INT NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispute_admin_notes TEXT,
    ADD COLUMN IF NOT EXISTS dispute_opened_by_id BIGINT,
    ADD COLUMN IF NOT EXISTS dispute_opened_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_resolution VARCHAR(30);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_dispute_opened_by') THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_dispute_opened_by
            FOREIGN KEY (dispute_opened_by_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

UPDATE orders
SET
    revision_count = COALESCE(revision_count, 0),
    max_revision_rounds = COALESCE(max_revision_rounds, 3);

UPDATE orders
SET progress_percentage = CASE
    WHEN status = 'COMPLETED' THEN 100
    WHEN status = 'IN_PROGRESS' THEN GREATEST(progress_percentage, 60)
    WHEN status = 'CANCELLED' THEN GREATEST(progress_percentage, 10)
    ELSE progress_percentage
END
WHERE progress_percentage = 0;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_progress') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_progress CHECK (progress_percentage BETWEEN 0 AND 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_revision_count') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_revision_count CHECK (revision_count >= 0);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_orders_max_revision_rounds') THEN
        ALTER TABLE orders
            ADD CONSTRAINT chk_orders_max_revision_rounds CHECK (max_revision_rounds >= 0);
    END IF;
END $$;

-- =========================================================
-- 10B) TABLE MISSION MILESTONES
-- =========================================================
CREATE TABLE IF NOT EXISTS mission_milestones (
    id              BIGSERIAL PRIMARY KEY,
    order_id        BIGINT NOT NULL,
    title           VARCHAR(160) NOT NULL,
    description     TEXT,
    amount          NUMERIC(12,2),
    deadline        DATE,
    timer_duration_minutes INT,
    timer_started_at       TIMESTAMPTZ,
    timer_completed_at     TIMESTAMPTZ,
    status          mission_milestone_status NOT NULL DEFAULT 'PENDING',
    sort_order      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mission_milestones_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

    CONSTRAINT chk_mission_milestones_title_not_empty CHECK (char_length(trim(title)) >= 2),
    CONSTRAINT chk_mission_milestones_amount CHECK (amount IS NULL OR amount >= 0),
    CONSTRAINT chk_mission_milestones_timer_duration CHECK (
        timer_duration_minutes IS NULL OR timer_duration_minutes > 0
    )
);

ALTER TABLE mission_milestones
    ADD COLUMN IF NOT EXISTS timer_duration_minutes INT,
    ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS timer_completed_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_mission_milestones_timer_duration') THEN
        ALTER TABLE mission_milestones
            ADD CONSTRAINT chk_mission_milestones_timer_duration CHECK (
                timer_duration_minutes IS NULL OR timer_duration_minutes > 0
            );
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mission_milestones_order_sort
    ON mission_milestones(order_id, sort_order);

-- =========================================================
-- 10C) TABLE MISSION ACTIVITIES
-- =========================================================
CREATE TABLE IF NOT EXISTS mission_activities (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT NOT NULL,
    actor_user_id       BIGINT,
    type                mission_activity_type NOT NULL,
    title               VARCHAR(180) NOT NULL,
    details             TEXT,
    progress_snapshot   INT,
    status_snapshot     order_status,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mission_activities_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

    CONSTRAINT fk_mission_activities_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT chk_mission_activities_title_not_empty CHECK (char_length(trim(title)) >= 2),
    CONSTRAINT chk_mission_activities_progress CHECK (
        progress_snapshot IS NULL OR progress_snapshot BETWEEN 0 AND 100
    )
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
    is_important        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,

    CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_messages_content_not_empty CHECK (char_length(trim(content)) >= 1)
);

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS is_important BOOLEAN NOT NULL DEFAULT FALSE;

-- =========================================================
-- 13) TABLE REVIEWS
-- =========================================================
CREATE TABLE IF NOT EXISTS reviews (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT NOT NULL UNIQUE,
    client_id           BIGINT NOT NULL,
    freelancer_id       BIGINT NOT NULL,
    rating              INT NOT NULL,
    quality_rating      INT NOT NULL,
    punctuality_rating  INT NOT NULL,
    communication_rating INT NOT NULL,
    comment             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reviews_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

    CONSTRAINT fk_reviews_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_reviews_freelancer
        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,

    CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_quality_rating CHECK (quality_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_punctuality_rating CHECK (punctuality_rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_communication_rating CHECK (communication_rating BETWEEN 1 AND 5)
);

ALTER TABLE reviews
    ADD COLUMN IF NOT EXISTS quality_rating INT,
    ADD COLUMN IF NOT EXISTS punctuality_rating INT,
    ADD COLUMN IF NOT EXISTS communication_rating INT;

UPDATE reviews
SET
    quality_rating = COALESCE(quality_rating, rating),
    punctuality_rating = COALESCE(punctuality_rating, rating),
    communication_rating = COALESCE(communication_rating, rating)
WHERE quality_rating IS NULL
   OR punctuality_rating IS NULL
   OR communication_rating IS NULL;

ALTER TABLE reviews
    ALTER COLUMN quality_rating SET NOT NULL,
    ALTER COLUMN punctuality_rating SET NOT NULL,
    ALTER COLUMN communication_rating SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_quality_rating') THEN
        ALTER TABLE reviews
            ADD CONSTRAINT chk_reviews_quality_rating CHECK (quality_rating BETWEEN 1 AND 5);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_punctuality_rating') THEN
        ALTER TABLE reviews
            ADD CONSTRAINT chk_reviews_punctuality_rating CHECK (punctuality_rating BETWEEN 1 AND 5);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_communication_rating') THEN
        ALTER TABLE reviews
            ADD CONSTRAINT chk_reviews_communication_rating CHECK (communication_rating BETWEEN 1 AND 5);
    END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_users_search_city ON users(search_city);

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

CREATE INDEX IF NOT EXISTS idx_client_favorites_client_id ON client_favorites(client_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_service_id ON client_favorites(service_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_freelancer_id ON client_favorites(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_client_favorites_created_at ON client_favorites(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_requests_client_id ON order_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_service_id ON order_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_order_requests_status ON order_requests(status);
CREATE INDEX IF NOT EXISTS idx_order_requests_created_at ON order_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_request_drafts_client_id ON client_request_drafts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_request_drafts_updated_at ON client_request_drafts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_freelancer_profile_drafts_user_id ON freelancer_profile_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_freelancer_profile_drafts_updated_at ON freelancer_profile_drafts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_freelancer_id ON orders(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_orders_service_id ON orders(service_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_dispute_opened_at ON orders(dispute_opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_mission_milestones_order_id ON mission_milestones(order_id);
CREATE INDEX IF NOT EXISTS idx_mission_milestones_status ON mission_milestones(status);
CREATE INDEX IF NOT EXISTS idx_mission_milestones_deadline ON mission_milestones(deadline);

CREATE INDEX IF NOT EXISTS idx_mission_activities_order_id ON mission_activities(order_id);
CREATE INDEX IF NOT EXISTS idx_mission_activities_actor_user_id ON mission_activities(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_mission_activities_created_at ON mission_activities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_freelancer_id ON conversations(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_is_important ON messages(is_important);

CREATE INDEX IF NOT EXISTS idx_reviews_freelancer_id ON reviews(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
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

DROP TRIGGER IF EXISTS trg_client_request_drafts_updated_at ON client_request_drafts;
CREATE TRIGGER trg_client_request_drafts_updated_at
BEFORE UPDATE ON client_request_drafts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_freelancer_profile_drafts_updated_at ON freelancer_profile_drafts;
CREATE TRIGGER trg_freelancer_profile_drafts_updated_at
BEFORE UPDATE ON freelancer_profile_drafts
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_mission_milestones_updated_at ON mission_milestones;
CREATE TRIGGER trg_mission_milestones_updated_at
BEFORE UPDATE ON mission_milestones
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

-- =========================================================
-- 19) ENUM TYPES - DEMAND-DRIVEN MARKETPLACE
-- =========================================================
DO $$
BEGIN
    CREATE TYPE service_request_status AS ENUM (
        'OPEN', 'IN_DISCUSSION', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE proposal_status AS ENUM (
        'PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_SERVICE_REQUEST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'NEW_PROPOSAL';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'PROPOSAL_ACCEPTED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'PROPOSAL_REJECTED';

-- =========================================================
-- 20) TABLE SERVICE REQUESTS (demandes clients)
-- =========================================================
CREATE TABLE IF NOT EXISTS service_requests (
    id                  BIGSERIAL PRIMARY KEY,
    client_id           BIGINT NOT NULL,
    category_id         BIGINT NOT NULL,
    title               VARCHAR(200) NOT NULL,
    description         TEXT NOT NULL,
    budget_min          NUMERIC(12,2),
    budget_max          NUMERIC(12,2),
    deadline            DATE,
    city                VARCHAR(120),
    is_remote           BOOLEAN NOT NULL DEFAULT FALSE,
    is_urgent           BOOLEAN NOT NULL DEFAULT FALSE,
    required_skills     TEXT[] NOT NULL DEFAULT '{}',
    status              service_request_status NOT NULL DEFAULT 'OPEN',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_service_requests_client
        FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_service_requests_category
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,

    CONSTRAINT chk_service_requests_title_not_empty CHECK (char_length(trim(title)) >= 3),
    CONSTRAINT chk_service_requests_description_not_empty CHECK (char_length(trim(description)) >= 10),
    CONSTRAINT chk_service_requests_budget_min CHECK (budget_min IS NULL OR budget_min >= 0),
    CONSTRAINT chk_service_requests_budget_max CHECK (budget_max IS NULL OR budget_max >= 0),
    CONSTRAINT chk_service_requests_budget_range CHECK (
        budget_min IS NULL OR budget_max IS NULL OR budget_max >= budget_min
    )
);

-- =========================================================
-- 21) TABLE PROPOSALS (candidatures freelance)
-- =========================================================
CREATE TABLE IF NOT EXISTS proposals (
    id                      BIGSERIAL PRIMARY KEY,
    service_request_id      BIGINT NOT NULL,
    freelancer_id           BIGINT NOT NULL,
    message                 TEXT NOT NULL,
    proposed_price          NUMERIC(12,2) NOT NULL,
    estimated_days          INT NOT NULL,
    proposed_steps          TEXT[] NOT NULL DEFAULT '{}',
    portfolio_url           TEXT,
    status                  proposal_status NOT NULL DEFAULT 'PENDING',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_proposals_service_request
        FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,

    CONSTRAINT fk_proposals_freelancer
        FOREIGN KEY (freelancer_id) REFERENCES freelancer_profiles(id) ON DELETE CASCADE,

    CONSTRAINT chk_proposals_message_not_empty CHECK (char_length(trim(message)) >= 5),
    CONSTRAINT chk_proposals_proposed_price CHECK (proposed_price >= 0),
    CONSTRAINT chk_proposals_estimated_days CHECK (estimated_days >= 1),

    CONSTRAINT uq_proposals_request_freelancer UNIQUE (service_request_id, freelancer_id)
);

ALTER TABLE proposals
    ADD COLUMN IF NOT EXISTS proposed_steps TEXT[] NOT NULL DEFAULT '{}';

-- =========================================================
-- 21B) TABLE ATTACHMENTS (pieces jointes)
-- =========================================================
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
);

-- Ajout colonne proposal_id optionnel sur orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proposal_id BIGINT;
ALTER TABLE orders ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN request_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_proposal') THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_proposal
            FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =========================================================
-- 22) INDEXES - DEMAND-DRIVEN MARKETPLACE
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_service_requests_client_id ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_category_id ON service_requests(category_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_city ON service_requests(city);
CREATE INDEX IF NOT EXISTS idx_service_requests_is_urgent ON service_requests(is_urgent);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_requests_deadline ON service_requests(deadline);

CREATE INDEX IF NOT EXISTS idx_proposals_service_request_id ON proposals(service_request_id);
CREATE INDEX IF NOT EXISTS idx_proposals_freelancer_id ON proposals(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_created_at ON proposals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_proposal_id ON orders(proposal_id);

CREATE INDEX IF NOT EXISTS idx_attachments_uploader_id ON attachments(uploader_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_service_request_id ON attachments(service_request_id);
CREATE INDEX IF NOT EXISTS idx_attachments_order_id ON attachments(order_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at DESC);

-- =========================================================
-- 23) TRIGGERS - DEMAND-DRIVEN MARKETPLACE
-- =========================================================
DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON service_requests;
CREATE TRIGGER trg_service_requests_updated_at
BEFORE UPDATE ON service_requests
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
CREATE TRIGGER trg_proposals_updated_at
BEFORE UPDATE ON proposals
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;
