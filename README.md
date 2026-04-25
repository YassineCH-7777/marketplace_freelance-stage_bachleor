# FreelanceHub

FreelanceHub est une marketplace de services freelance avec un positionnement hyper-local.
L'objectif n'est pas seulement de mettre en relation des clients et des freelances, mais de faciliter des missions proches, concretes et parfois urgentes.

## Positionnement produit

La difference principale de FreelanceHub est la proximite operationnelle :

- recherche par ville pour trouver un prestataire proche
- filtres par mode d'intervention : sur place, hybride ou a distance
- disponibilite rapide : aujourd hui, sous 24h, ce week-end, cette semaine
- services adaptes au terrain : photo, depannage, cours, tournage, installation, evenementiel

Ce positionnement permet de se distinguer des plateformes freelance generalistes, souvent pensees pour des missions globales et 100 % distantes.

## Confiance locale forte

FreelanceHub ne cherche pas a ajouter des badges generiques de plus.
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

FreelanceHub ne s'arrete pas au matching entre client et freelance.
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

## Lancer le projet

### Avec Docker

```bash
docker compose up -d --build
```

Services exposes :

- frontend : `http://localhost:3000`
- backend : `http://localhost:8080`
- PostgreSQL : `localhost:5432`

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
