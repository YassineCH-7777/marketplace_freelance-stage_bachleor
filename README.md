# ProxiSkills

ProxiSkills est une marketplace de services freelance avec un positionnement hyper-local.
L'objectif n'est pas seulement de mettre en relation des clients et des freelances, mais de faciliter des missions proches, concretes et parfois urgentes.

## Positionnement produit

La difference principale de ProxiSkills est la proximite operationnelle :

- recherche par ville pour trouver un prestataire proche
- filtres par mode d'intervention : sur place, hybride ou a distance
- disponibilite rapide : aujourd hui, sous 24h, ce week-end, cette semaine
- services adaptes au terrain : photo, depannage, cours, tournage, installation, evenementiel

Ce positionnement permet de se distinguer des plateformes freelance generalistes, souvent pensees pour des missions globales et 100 % distantes.

## Confiance locale forte

ProxiSkills ne cherche pas a ajouter des badges generiques de plus.
La logique produit est de montrer des preuves utiles pour une relation locale reelle :

- ville visible et confirmee sur le profil
- capacite a intervenir sur place ou en hybride
- disponibilite rapide visible avant prise de contact
- historique d'avis publics
- signal de clients recurrents quand il existe

Les prochains badges a forte valeur locale seraient :

- identite validee
- telephone valide
- freelance rencontre localement
- avis separes en qualite, ponctualite et communication

## Marketplace orientee execution

ProxiSkills ne s'arrete pas au matching entre client et freelance.
Le produit peut aller jusqu'au pilotage simple de la mission :

- checklist de mission visible
- etapes de validation faciles a suivre
- preuve de livraison et notes de suivi
- progression visuelle de la mission
- compte-rendu final telechargeable

La logique n'est pas de reproduire un gros outil de gestion de projet.
L'objectif est plutot de proposer un mini suivi de mission, simple et concret, adapte aux prestations locales et operationnelles.

## Fonctionnalites actuelles

- authentification et gestion des roles client / freelance
- publication et consultation de services
- recherche publique par mot-cle, categorie, ville, mode et delai
- profils freelances publics
- demandes de prestation, messagerie et suivi de commandes
- visualisation du brief initial, du suivi, des dates et du compte-rendu de mission
- stack locale complete avec frontend, backend et base PostgreSQL

## Stack technique

- frontend : React 19 + Vite
- backend : Spring Boot 3 + Spring Security + JPA
- base de donnees : PostgreSQL 15
- orchestration locale : Docker Compose

## Structure du projet

```text
marketplace_freelance/
  backend/                 API Spring Boot
    src/main/java/
      application/         services et cas d'utilisation
      domain/              modeles metier et enums
      infrastructure/      persistence, security et configuration
      web/                 controllers, DTO et gestion des erreurs HTTP
    src/main/resources/    configuration et scripts SQL
    src/test/java/         tests unitaires et integration
  frontend/                application React/Vite
    src/api/               clients HTTP vers le backend
    src/components/        composants reutilisables
    src/features/          pages regroupees par domaine produit
    src/hooks/             hooks React partages
    src/routes/            declaration des routes et guards
    src/styles/            styles globaux par surface
    src/utils/             fonctions de formatage et metadata
```

## Lancer le projet

### Avec Docker

```bash
docker compose up -d --build
```

Services exposes :

- frontend : `http://localhost:3000`
- backend : `http://localhost:8080`
- PostgreSQL : `localhost:5432`
- n8n : `http://localhost:5678`

## Assistants IA avec n8n

Deux workflows n8n importables sont fournis a la racine :

- `assistant_client.json` : aide le client a transformer une idee en brief structure.
- `assistant_freelance.json` : aide le freelance a completer son profil.

Apres import dans n8n, configurez les credentials Groq et Postgres, activez les workflows, puis exposez les Chat Trigger en mode Embedded Chat. Le frontend appelle ces webhooks avec `chatInput`, `sessionId` et `metadata`.

Les workflows utilisent Groq Cloud avec le modele `llama-3.3-70b-versatile`, une alternative en ligne avec plan gratuit. Pour obtenir la cle :

1. Ouvrez `https://console.groq.com/keys`
2. Connectez-vous ou creez un compte
3. Cliquez sur `Create API Key`
4. Dans n8n, creez un credential `Groq` et collez cette cle

Variables frontend a definir dans `frontend/.env` :

```bash
VITE_N8N_CLIENT_CHAT_URL=http://localhost:5678/webhook/97c1a41f-8ef0-4d63-a924-92eb634384d1/chat
VITE_N8N_FREELANCE_CHAT_URL=http://localhost:5678/webhook/97c1a41f-8ef0-4d63-a924-92eb634384d2/chat
```

L'assistant client est disponible sur la fiche service et peut pre-remplir le message de demande ainsi que le prix propose. L'assistant freelance est disponible sur la page profil et peut pre-remplir le headline, la bio, les competences, la ville et le portfolio apres validation manuelle.

Les outils HTTP des workflows n8n appellent les endpoints Spring Boot suivants :

```text
POST ${BACKEND_API_URL}/api/requests/draft
POST ${BACKEND_API_URL}/api/freelancers/profile/draft
```

Ces endpoints enregistrent uniquement des brouillons IA. Ils ne creent pas de demande officielle et ne modifient pas le profil public sans validation utilisateur.

URL backend selon l'emplacement de n8n :

```text
n8n dans docker-compose : BACKEND_API_URL=http://backend:8080
n8n local hors Docker : BACKEND_API_URL=http://localhost:8080
n8n Docker separe, backend sur la machine : BACKEND_API_URL=http://host.docker.internal:8080
n8n Cloud : utiliser une URL publique vers le backend, par exemple via un tunnel
```

### En developpement separe

Frontend :

```bash
cd frontend
npm install
npm run dev
```

Backend :

```bash
cd backend
mvn spring-boot:run
```

## Prochaine evolution produit

Les prochaines briques naturelles pour renforcer le positionnement hyper-local sont :

- recherche par quartier
- rayon kilometrique autour d'une adresse
- priorisation des freelances disponibles maintenant
- badges de confiance terrain plus fins
- avis multi-axes pour les missions locales
- relances automatiques via n8n

