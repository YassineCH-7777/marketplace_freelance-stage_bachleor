-- =========================================================
-- MARKETPLACE DE SERVICES FREELANCE - DONNÉES DE TEST
-- =========================================================

-- 1) CATÉGORIES (Données initiales)
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

-- 2) UTILISATEURS (Mot de passe par défaut : password123)
-- Hash BCrypt pour "password123"
INSERT INTO users (first_name, last_name, email, password_hash, role, phone, city, status, email_verified)
VALUES
    ('Admin', 'Global', 'admin@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'ADMIN', '0102030405', 'Casablanca', 'ACTIVE', TRUE),
    ('Yassine', 'Freelancer', 'freelance1@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'FREELANCER', '0612345678', 'Marrakech', 'ACTIVE', TRUE),
    ('Ilyas', 'Client', 'client1@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'CLIENT', '0611223344', 'Rabat', 'ACTIVE', TRUE),
    ('Mohamed', 'Client', 'client2@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'CLIENT', '0655667788', 'Tanger', 'ACTIVE', TRUE),
    ('Mahmoud', 'Freelancer', 'freelance2@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'FREELANCER', '0677889900', 'Agadir', 'ACTIVE', TRUE)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    status = EXCLUDED.status,
    email_verified = EXCLUDED.email_verified;

-- 3) PROFILS FREELANCE
-- On récupère les IDs via subqueries pour être robuste
INSERT INTO freelancer_profiles (user_id, headline, professional_bio, skills, hourly_rate, experience_years, availability, average_rating, total_reviews, completed_orders)
SELECT id, 'Développeur Fullstack Java/React', 'Expert en développement web avec 5 ans d''expérience sur Spring Boot et React.', ARRAY['Java', 'Spring Boot', 'React', 'PostgreSQL'], 50.00, 5, 'AVAILABLE', 4.8, 12, 15
FROM users WHERE email = 'freelance1@marketplace.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO freelancer_profiles (user_id, headline, professional_bio, skills, hourly_rate, experience_years, availability, average_rating, total_reviews, completed_orders)
SELECT id, 'UI/UX Designer & Créatrice Graphique', 'Passionnée par le design centré utilisateur et la création d''identités visuelles uniques.', ARRAY['Figma', 'Adobe XD', 'Photoshop', 'Illustrator'], 45.00, 3, 'AVAILABLE', 4.9, 8, 10
FROM users WHERE email = 'freelance2@marketplace.com'
ON CONFLICT (user_id) DO NOTHING;

-- 4) SERVICES
INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Création de site web professionnel', 'site-web-professionnel-react', 'Un site web moderne et responsive pour votre entreprise.', 'Je propose la création complète de votre site web en utilisant React pour le frontend et Spring Boot pour le backend. Inclus : Design responsive, SEO de base, et déploiement.', 1500.00, 'FIXED', 14, 'Marrakech', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'developpement-web'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Design de Logo & Identité Visuelle', 'logo-identite-visuelle-sop', 'Un logo mémorable et une charte graphique complète.', 'Création d''un logo unique avec 3 propositions initiales, révisions illimitées et livraison dans tous les formats nécessaires (SVG, PNG, AI).', 300.00, 'FIXED', 5, 'Agadir', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'design-graphique'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Maintenance & Support Informatique', 'support-informatique-pro', 'Assistance technique rapide pour vos problèmes PC/Réseau.', 'Dépannage à distance ou sur place pour problèmes logiciels, configuration de messagerie, ou optimisation système.', 40.00, 'HOURLY', 1, 'Marrakech', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'support-informatique'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Reportage photo sur place pour commerces et biens', 'reportage-photo-sur-place', 'Photos rapides pour commerces, locations saisonnieres et annonces locales.', 'Je me deplace sur place pour realiser des photos lumineuses de votre boutique, logement ou restaurant avec livraison retouchee sous 24h.', 450.00, 'FIXED', 1, 'Agadir', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'photographie'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Cours particuliers a domicile ou en visio', 'cours-particuliers-domicile-visio', 'Accompagnement flexible pour collegiens, lyceens et etudiants.', 'Cours de soutien a domicile dans votre ville ou a distance en visio, avec possibilite de preparation intensive pour ce week-end.', 180.00, 'HOURLY', 2, 'Agadir', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'cours-particuliers'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Tournage et montage pour evenement local', 'tournage-montage-evenement-local', 'Captation legere pour salons, soirees et lancements.', 'Je couvre votre evenement avec tournage sur place, capsules reseaux sociaux et montage express pour diffusion locale dans la semaine.', 900.00, 'FIXED', 3, 'Marrakech', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'montage-video'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Installation wifi et imprimantes sur place', 'installation-wifi-imprimantes-sur-place', 'Installation et configuration rapide pour bureaux, commerces et appartements.', 'Je me deplace pour installer votre wifi, configurer vos imprimantes et verifier le reseau local afin que tout fonctionne le jour meme.', 350.00, 'FIXED', 1, 'Marrakech', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'support-informatique'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Montage reels et capsules video a distance', 'montage-reels-distance', 'Montage rapide pour reels, stories et teasers livres a distance.', 'Je prends vos rushs a distance et livre un montage court optimise pour Instagram, TikTok ou publicite locale en moins de 48h.', 260.00, 'FIXED', 2, 'Remote', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'montage-video'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

-- 5) DEMANDES DE COMMANDE (ORDER REQUESTS)
INSERT INTO order_requests (client_id, service_id, message, proposed_budget, proposed_date, status)
SELECT u.id, s.id, 'Bonjour, j''aurais besoin d''un site pour mon restaurant à Marrakech.', 1200.00, '2024-05-01', 'ACCEPTED'
FROM users u, services s WHERE u.email = 'client1@marketplace.com' AND s.slug = 'site-web-professionnel-react'
AND NOT EXISTS (SELECT 1 FROM order_requests WHERE client_id = u.id AND service_id = s.id);

INSERT INTO order_requests (client_id, service_id, message, proposed_budget, proposed_date, status)
SELECT u.id, s.id, 'Je lance une nouvelle marque de vêtements et j''ai besoin d''un logo.', 300.00, '2024-04-20', 'PENDING'
FROM users u, services s WHERE u.email = 'client2@marketplace.com' AND s.slug = 'logo-identite-visuelle-sop'
AND NOT EXISTS (SELECT 1 FROM order_requests WHERE client_id = u.id AND service_id = s.id);

-- 6) COMMANDES (ORDERS)
INSERT INTO orders (request_id, service_id, client_id, freelancer_id, agreed_price, start_date, end_date, status, notes)
SELECT rq.id, s.id, u_client.id, fp.id, 1200.00, '2024-05-01', '2024-05-15', 'IN_PROGRESS', 'Projet en cours de développement, phase de design validée.'
FROM order_requests rq
JOIN services s ON rq.service_id = s.id
JOIN users u_client ON rq.client_id = u_client.id
JOIN freelancer_profiles fp ON s.freelancer_id = fp.id
WHERE u_client.email = 'client1@marketplace.com' AND s.slug = 'site-web-professionnel-react'
ON CONFLICT (request_id) DO NOTHING;

-- 7) AVIS (REVIEWS)
-- Note: Les avis ne peuvent être ajoutés que pour des commandes terminées dans un vrai système.
-- Ici on force une commande terminée pour le test.
-- Pour satisfaire la contrainte FK (request_id -> order_requests.id),
-- on crée d'abord une entrée d'ordre de requête avec l'ID 1000 si elle n'existe pas.
INSERT INTO order_requests (id, client_id, service_id, message, proposed_budget, proposed_date, status)
SELECT 1000, u.id, s.id, 'Commande de test pour dépannage rapide', 40.00, '2024-01-10', 'ACCEPTED'
FROM users u
JOIN services s ON s.slug = 'support-informatique-pro'
WHERE u.email = 'client1@marketplace.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (request_id, service_id, client_id, freelancer_id, agreed_price, start_date, end_date, status, notes)
SELECT 1000, s.id, u_client.id, fp.id, 40.00, '2024-01-10', '2024-01-11', 'COMPLETED', 'Dépannage rapide effectué.'
FROM services s
JOIN freelancer_profiles fp ON s.freelancer_id = fp.id
JOIN users u_client ON u_client.email = 'client1@marketplace.com'
WHERE s.slug = 'support-informatique-pro'
LIMIT 1
ON CONFLICT (id) DO NOTHING; -- On ignore si déjà présent (id 1000 est arbitraire ici pour le test)

-- On suppose que l'ordre précédent a pris l'ID 1 ou qu'on peut le retrouver
INSERT INTO reviews (
    order_id,
    client_id,
    freelancer_id,
    rating,
    quality_rating,
    punctuality_rating,
    communication_rating,
    comment
)
SELECT o.id, o.client_id, o.freelancer_id, 5, 5, 5, 5, 'Super service ! Très compétent et rapide.'
FROM orders o WHERE o.notes = 'Dépannage rapide effectué.'
ON CONFLICT (order_id) DO NOTHING;
