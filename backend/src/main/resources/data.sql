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
INSERT INTO users (first_name, last_name, email, password_hash, role, phone, city, search_city, search_latitude, search_longitude, search_radius_km, status, email_verified)
VALUES
    ('Admin', 'Global', 'admin@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'ADMIN', '0102030405', 'Casablanca', 'Casablanca', 33.5731, -7.5898, 10, 'ACTIVE', TRUE),
    ('Yassine', 'Freelancer', 'freelance1@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'FREELANCER', '0612345678', 'Marrakech', 'Marrakech', 31.6295, -7.9811, 20, 'ACTIVE', TRUE),
    ('Ilyas', 'Client', 'client1@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'CLIENT', '0611223344', 'Rabat', 'Casablanca', 33.5731, -7.5898, 20, 'ACTIVE', TRUE),
    ('Mohamed', 'Client', 'client2@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'CLIENT', '0655667788', 'Tanger', 'Tanger', 35.7595, -5.8340, 10, 'ACTIVE', TRUE),
    ('Mahmoud', 'Freelancer', 'freelance2@marketplace.com', '$2a$10$jKrYUaknITLwAhq9VbXJw.azOL3gxC3oj3VMzL35tT9/HXoVRU19i', 'FREELANCER', '0677889900', 'Agadir', 'Agadir', 30.4278, -9.5981, 20, 'ACTIVE', TRUE)
ON CONFLICT (email) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    search_city = EXCLUDED.search_city,
    search_latitude = EXCLUDED.search_latitude,
    search_longitude = EXCLUDED.search_longitude,
    search_radius_km = EXCLUDED.search_radius_km,
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

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Audit vitesse et SEO pour site vitrine', 'audit-vitesse-seo-site-vitrine', 'Audit technique rapide avec recommandations actionnables.', 'Analyse des performances, SEO technique, structure des pages et priorites de correction pour un site vitrine ou une landing page.', 700.00, 'FIXED', 3, 'Remote', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'developpement-web'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Creation landing page express pour commerce local', 'landing-page-express-commerce-local', 'Page de vente simple pour campagne locale ou lancement rapide.', 'Creation d une landing page responsive avec sections offre, preuves, contact et appel a l action, livree avec mise en ligne accompagnee.', 1200.00, 'FIXED', 5, 'Casablanca', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'developpement-web'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Depannage PC et reseau sur place a Rabat', 'depannage-pc-reseau-rabat', 'Intervention rapide pour postes, routeurs et imprimantes.', 'Je me deplace a Rabat pour diagnostiquer les problemes PC, reseau local, imprimante ou connexion internet et remettre le poste en service.', 300.00, 'FIXED', 1, 'Rabat', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'support-informatique'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Installation caisse et wifi pour boutique', 'installation-caisse-wifi-boutique', 'Configuration terrain pour commerces et petits bureaux.', 'Installation sur place d une caisse, d un reseau wifi invite, imprimantes et tests de connexion pour demarrer sans blocage.', 650.00, 'FIXED', 2, 'Casablanca', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'support-informatique'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Shooting produits e-commerce a Casablanca', 'shooting-produits-ecommerce-casablanca', 'Photos propres pour catalogue, boutique en ligne et reseaux sociaux.', 'Je realise un shooting produit sur place a Casablanca avec lumiere, cadrage, retouche couleur et livraison d images pretes pour publication.', 850.00, 'FIXED', 2, 'Casablanca', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'photographie'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Pack stories Instagram pour commerce local', 'pack-stories-instagram-commerce-local', 'Templates, textes courts et planning de stories pour une semaine.', 'Creation d un pack stories et posts courts pour annoncer une offre locale, avec adaptation aux couleurs de la marque et calendrier simple.', 380.00, 'FIXED', 3, 'Tanger', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'community-management'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Charte graphique pour restaurant ou salon', 'charte-graphique-restaurant-salon', 'Identite visuelle simple pour commerce de proximite.', 'Creation d une mini charte graphique avec couleurs, typographies, logo simplifie et exemples d usage pour supports imprimes et reseaux sociaux.', 1100.00, 'FIXED', 7, 'Rabat', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'design-graphique'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Retouche photo immobiliere express', 'retouche-photo-immobiliere-express', 'Retouches lumineuses pour annonces Airbnb et immobilier.', 'Correction de luminosite, perspectives, couleurs et recadrage pour rendre vos photos immobilieres plus nettes et plus attractives.', 220.00, 'FIXED', 1, 'Remote', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'photographie'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Aftermovie evenement local a Agadir', 'aftermovie-evenement-local-agadir', 'Captation et montage court pour soirees, salons et ouvertures.', 'Tournage sur place a Agadir puis montage d un aftermovie court avec musique, titrage et versions adaptees aux reseaux sociaux.', 1400.00, 'FIXED', 4, 'Agadir', FALSE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'montage-video'
WHERE u.email = 'freelance2@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO services (freelancer_id, category_id, title, slug, short_description, description, price, pricing_type, delivery_time_days, city, is_remote, status)
SELECT fp.id, cat.id, 'Cours Excel et outils no-code pour equipe', 'cours-excel-no-code-equipe', 'Formation pratique pour gagner du temps sur les taches internes.', 'Formation a distance ou en hybride pour apprendre les bases Excel, automatiser des tableaux et organiser un petit workflow no-code.', 250.00, 'HOURLY', 4, 'Rabat', TRUE, 'PUBLISHED'
FROM freelancer_profiles fp JOIN users u ON fp.user_id = u.id JOIN categories cat ON cat.slug = 'cours-particuliers'
WHERE u.email = 'freelance1@marketplace.com'
ON CONFLICT (slug) DO NOTHING;

-- 4B) DEMANDES CLIENTS PUBLIQUES (SERVICE REQUESTS)
INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Refonte du menu digital pour restaurant', 'Nous voulons refaire le menu digital de notre restaurant avec une page propre, des photos et un bouton WhatsApp pour les reservations.', 900.00, 1800.00, CURRENT_DATE + 12, 'Marrakech', TRUE, TRUE, ARRAY['Design', 'React', 'WhatsApp'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'developpement-web'
WHERE u.email = 'client1@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Refonte du menu digital pour restaurant');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Photos d appartement pour annonce Airbnb', 'J ai besoin de photos lumineuses pour un appartement a mettre sur Airbnb, avec retouche simple et livraison rapide.', 350.00, 700.00, CURRENT_DATE + 3, 'Agadir', FALSE, TRUE, ARRAY['Photo', 'Retouche', 'Immobilier'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'photographie'
WHERE u.email = 'client2@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Photos d appartement pour annonce Airbnb');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Community management pour lancement boutique', 'Nous ouvrons une boutique a Casablanca et nous cherchons quelqu un pour preparer les posts, stories et textes de lancement.', 1200.00, 2500.00, CURRENT_DATE + 20, 'Casablanca', TRUE, FALSE, ARRAY['Instagram', 'Stories', 'Planning editorial'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'community-management'
WHERE u.email = 'client1@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Community management pour lancement boutique');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Depannage reseau bureau en urgence', 'Le reseau du bureau est instable et deux imprimantes ne repondent plus. Intervention souhaitee sur place a Rabat.', 250.00, 600.00, CURRENT_DATE + 1, 'Rabat', FALSE, TRUE, ARRAY['Reseau', 'Imprimante', 'Diagnostic'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'support-informatique'
WHERE u.email = 'client2@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Depannage reseau bureau en urgence');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Montage video reel produit', 'Nous avons des rushs produit et voulons un reel dynamique pour Instagram avec sous-titres et format vertical.', 300.00, 900.00, CURRENT_DATE + 7, 'Tanger', TRUE, FALSE, ARRAY['Reels', 'Sous-titres', 'Montage vertical'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'montage-video'
WHERE u.email = 'client1@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Montage video reel produit');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Cours de mathematiques a domicile', 'Recherche professeur pour accompagner un lyceen deux fois par semaine, idealement avec exercices et suivi simple.', 150.00, 300.00, CURRENT_DATE + 15, 'Fes', FALSE, FALSE, ARRAY['Mathematiques', 'Pedagogie', 'Suivi'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'cours-particuliers'
WHERE u.email = 'client2@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Cours de mathematiques a domicile');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Redaction de pages SEO pour site vitrine', 'Besoin de textes clairs pour cinq pages de site vitrine avec titres, meta descriptions et ton professionnel.', 500.00, 1200.00, CURRENT_DATE + 10, 'Remote', TRUE, FALSE, ARRAY['SEO', 'Redaction web', 'Brief'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'redaction'
WHERE u.email = 'client1@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Redaction de pages SEO pour site vitrine');

INSERT INTO service_requests (client_id, category_id, title, description, budget_min, budget_max, deadline, city, is_remote, is_urgent, required_skills, status)
SELECT u.id, cat.id, 'Installation wifi et imprimante pour cabinet', 'Cabinet medical a Marrakech cherche une installation wifi propre avec imprimante partagee et verification des postes.', 400.00, 900.00, CURRENT_DATE + 5, 'Marrakech', FALSE, FALSE, ARRAY['Wifi', 'Imprimante', 'Installation sur place'], 'OPEN'
FROM users u JOIN categories cat ON cat.slug = 'support-informatique'
WHERE u.email = 'client2@marketplace.com'
  AND NOT EXISTS (SELECT 1 FROM service_requests sr WHERE sr.client_id = u.id AND sr.title = 'Installation wifi et imprimante pour cabinet');

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
INSERT INTO orders (request_id, service_id, client_id, freelancer_id, agreed_price, start_date, end_date, due_date, progress_percentage, payment_status, status, notes)
SELECT rq.id, s.id, u_client.id, fp.id, 1200.00, '2024-05-01', NULL, '2024-05-15', 60, 'PENDING', 'IN_PROGRESS', 'Projet en cours de développement, phase de design validée.'
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

INSERT INTO orders (request_id, service_id, client_id, freelancer_id, agreed_price, start_date, end_date, due_date, progress_percentage, payment_status, status, notes, delivery_note)
SELECT 1000, s.id, u_client.id, fp.id, 40.00, '2024-01-10', '2024-01-11', '2024-01-11', 100, 'PAID', 'COMPLETED', 'Dépannage rapide effectué.', 'Intervention terminee, connexion et imprimante testees.'
FROM services s
JOIN freelancer_profiles fp ON s.freelancer_id = fp.id
JOIN users u_client ON u_client.email = 'client1@marketplace.com'
WHERE s.slug = 'support-informatique-pro'
LIMIT 1
ON CONFLICT (id) DO NOTHING; -- On ignore si déjà présent (id 1000 est arbitraire ici pour le test)

-- 6B) JALONS ET ACTIVITE DE MISSION
INSERT INTO mission_milestones (order_id, title, description, amount, deadline, status, sort_order)
SELECT o.id, 'Cadrage', 'Brief, livrables et planning confirmes.', 240.00, o.due_date, 'COMPLETED', 1
FROM orders o
WHERE o.notes = 'Projet en cours de développement, phase de design validée.'
  AND NOT EXISTS (SELECT 1 FROM mission_milestones mm WHERE mm.order_id = o.id AND mm.sort_order = 1);

INSERT INTO mission_milestones (order_id, title, description, amount, deadline, status, sort_order)
SELECT o.id, 'Execution', 'Production principale en cours.', 720.00, o.due_date, 'IN_PROGRESS', 2
FROM orders o
WHERE o.notes = 'Projet en cours de développement, phase de design validée.'
  AND NOT EXISTS (SELECT 1 FROM mission_milestones mm WHERE mm.order_id = o.id AND mm.sort_order = 2);

INSERT INTO mission_milestones (order_id, title, description, amount, deadline, status, sort_order)
SELECT o.id, 'Livraison et validation', 'Livraison finale puis retour client.', 240.00, o.due_date, 'PENDING', 3
FROM orders o
WHERE o.notes = 'Projet en cours de développement, phase de design validée.'
  AND NOT EXISTS (SELECT 1 FROM mission_milestones mm WHERE mm.order_id = o.id AND mm.sort_order = 3);

INSERT INTO mission_activities (order_id, actor_user_id, type, title, details, progress_snapshot, status_snapshot)
SELECT o.id, u.id, 'STARTED', 'Mission demarree', 'Phase de design validee, production en cours.', o.progress_percentage, o.status
FROM orders o
JOIN freelancer_profiles fp ON o.freelancer_id = fp.id
JOIN users u ON fp.user_id = u.id
WHERE o.notes = 'Projet en cours de développement, phase de design validée.'
  AND NOT EXISTS (SELECT 1 FROM mission_activities ma WHERE ma.order_id = o.id AND ma.type = 'STARTED');

INSERT INTO mission_activities (order_id, actor_user_id, type, title, details, progress_snapshot, status_snapshot)
SELECT o.id, u.id, 'CLIENT_ACCEPTED', 'Livraison validee par le client', 'Mission finalisee et paiement marque comme libere.', o.progress_percentage, o.status
FROM orders o
JOIN users u ON o.client_id = u.id
WHERE o.notes = 'Dépannage rapide effectué.'
  AND NOT EXISTS (SELECT 1 FROM mission_activities ma WHERE ma.order_id = o.id AND ma.type = 'CLIENT_ACCEPTED');

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
