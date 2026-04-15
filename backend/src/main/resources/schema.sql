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

-- =========================================================
-- 19) DONNÉES INITIALES (CATEGORIES)
-- =========================================================
INSERT INTO categories (name, slug, description, is_active)
VALUES
    ('Design graphique', 'design-graphique', 'Création de logos, affiches, bannières et identité visuelle', TRUE),
    ('Développement web', 'developpement-web', 'Création de sites web, applications web et intégrations', TRUE),
    ('Photographie', 'photographie', 'Shooting photo, retouche et couverture d’événements', TRUE),
    ('Montage vidéo', 'montage-video', 'Montage, habillage vidéo et contenus réseaux sociaux', TRUE),
    ('Rédaction', 'redaction', 'Rédaction web, correction, transcription et contenu éditorial', TRUE),
    ('Support informatique', 'support-informatique', 'Assistance technique, maintenance et dépannage informatique', TRUE),
    ('Community management', 'community-management', 'Gestion de réseaux sociaux et stratégie de contenu', TRUE),
    ('Cours particuliers', 'cours-particuliers', 'Cours de soutien, accompagnement scolaire et formation', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- =========================================================
-- 20) DONNÉES DE TEST (USERS)
-- =========================================================
-- Note: les mots de passe utilisent un faux hash générique (pour 'password' ou autre). 
-- Vous devrez passer par votre API d'inscription/login ou un password encoder pour générer de vrais hash valides.
INSERT INTO users (first_name, last_name, email, password_hash, role, city, status, email_verified)
VALUES
    ('Admin', 'System', 'admin@marketplace.com', '$2a$10$wYFpB/G3Wb/F1Jz9r1pGBOOMw2H3y1C5.rW.FZZqYFpB/G3Wb/F1J', 'ADMIN', 'Paris', 'ACTIVE', TRUE),
    ('Alice', 'Client', 'client1@marketplace.com', '$2a$10$wYFpB/G3Wb/F1Jz9r1pGBOOMw2H3y1C5.rW.FZZqYFpB/G3Wb/F1J', 'CLIENT', 'Lyon', 'ACTIVE', TRUE),
    ('Bob', 'Client', 'client2@marketplace.com', '$2a$10$wYFpB/G3Wb/F1Jz9r1pGBOOMw2H3y1C5.rW.FZZqYFpB/G3Wb/F1J', 'CLIENT', 'Bordeaux', 'ACTIVE', TRUE),
    ('Charlie', 'Freelance', 'freelance1@marketplace.com', '$2a$10$wYFpB/G3Wb/F1Jz9r1pGBOOMw2H3y1C5.rW.FZZqYFpB/G3Wb/F1J', 'FREELANCER', 'Lille', 'ACTIVE', TRUE),
    ('Diana', 'Freelance', 'freelance2@marketplace.com', '$2a$10$wYFpB/G3Wb/F1Jz9r1pGBOOMw2H3y1C5.rW.FZZqYFpB/G3Wb/F1J', 'FREELANCER', 'Nantes', 'ACTIVE', TRUE),
    ('Eve', 'Freelance', 'freelance3@marketplace.com', '$2a$10$wYFpB/G3Wb/F1Jz9r1pGBOOMw2H3y1C5.rW.FZZqYFpB/G3Wb/F1J', 'FREELANCER', 'Paris', 'ACTIVE', TRUE);

-- =========================================================
-- 21) DONNÉES DE TEST (FREELANCER PROFILES)
-- =========================================================
-- IDs : Charlie (4), Diana (5), Eve (6)
INSERT INTO freelancer_profiles (user_id, headline, professional_bio, skills, hourly_rate, experience_years, availability, average_rating, total_reviews, completed_orders)
VALUES
    (4, 'Développeur Fullstack React/Node', 'Passionné par le développement web depuis 5 ans, je crée des applications sur mesure.', ARRAY['React', 'Node.js', 'PostgreSQL'], 45.00, 5, 'AVAILABLE', 4.5, 2, 5),
    (5, 'Experte en développement Web (Java/Spring)', 'Création backend robuste et scalable. Plus de 8 ans d''expérience en entreprise.', ARRAY['Java', 'Spring Boot', 'SQL'], 60.00, 8, 'BUSY', 5.0, 1, 10),
    (6, 'Designer Graphique & UI/UX', 'Je conçois des identités visuelles remarquables et des interfaces utilisateur intuitives.', ARRAY['Figma', 'Photoshop', 'Illustrator'], 40.00, 4, 'AVAILABLE', 0.0, 0, 0);

-- =========================================================
-- 22) DONNÉES DE TEST (SERVICES)
-- =========================================================
-- id categories 1 = Design, 2 = Dev web, id freelances = 1(Charlie), 2(Diana), 3(Eve)
INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
VALUES
    (1, 2, 'Création d''application web React', 'creation-app-react', 'Développement frontend', 'Application React JS performante et design. Je gère l''intégration maquette jusqu''au déploiement.', 500.00, 'FIXED', 10, 'Lille', TRUE, 'PUBLISHED'),
    (2, 2, 'API REST Java Spring Boot', 'api-rest-java-spring-boot', 'Développement backend sécurisé', 'Création d''une architecture backend avec Spring Boot et base de données relationnelle. Tests exhaustifs.', 800.00, 'FIXED', 15, 'Nantes', TRUE, 'PUBLISHED'),
    (3, 1, 'Création de Logo Premium', 'creation-logo-premium', 'Logo de qualité professionnelle', 'Un logo unique, sur-mesure pour votre entreprise. Entièrement vectoriel, déclinable pour le web et le print.', 150.00, 'FIXED', 3, 'Paris', TRUE, 'PUBLISHED');

-- =========================================================
-- 23) DONNÉES DE TEST (ORDER REQUESTS)
-- =========================================================
INSERT INTO order_requests (client_id, service_id, message, proposed_budget, proposed_date, status)
VALUES
    (2, 1, 'Bonjour, je souhaiterais une app React pour mon entreprise pour gérer les commandes en ligne.', 500.00, '2024-12-01', 'ACCEPTED'),
    (3, 2, 'Avez-vous des disponibilités pour une API ce mois-ci ? Le cahier des charges est prêt.', 750.00, '2025-01-15', 'PENDING'),
    (2, 3, 'J''ai besoin d''un logo pour une association locale.', 150.00, '2024-10-10', 'COMPLETED');

-- =========================================================
-- 24) DONNÉES DE TEST (ORDERS)
-- =========================================================
INSERT INTO orders (request_id, service_id, client_id, freelancer_id, agreed_price, start_date, end_date, status, notes)
VALUES
    (1, 1, 2, 1, 500.00, '2024-05-01', '2024-05-15', 'IN_PROGRESS', 'En attente des maquettes finales du client.'),
    (3, 3, 2, 3, 150.00, '2024-04-01', '2024-04-05', 'COMPLETED', 'Client très satisfait.');

-- =========================================================
-- 25) DONNÉES DE TEST (REVIEWS)
-- =========================================================
INSERT INTO reviews (order_id, client_id, freelancer_id, rating, comment)
VALUES
    (2, 2, 3, 5, 'Très beau travail, livré dans les temps. Je recommande !');

COMMIT;
