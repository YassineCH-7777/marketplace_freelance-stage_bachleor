# Backend ProxiSkills

API Spring Boot organisee en couches explicites.

## Structure

```text
src/main/java/com/marketplace/
  MarketplaceApplication.java
  application/
    service/          logique applicative et cas d'utilisation
  domain/
    model/            entites JPA
    enums/            statuts et roles metier
  infrastructure/
    config/           configuration Spring et OpenAPI
    persistence/      repositories Spring Data
    security/         JWT, filtres et configuration security
  web/
    controller/       endpoints REST
    dto/              contrats d'entree/sortie HTTP
    exception/        exceptions et handler global
```

## Commandes

```bash
mvn test
mvn spring-boot:run
```
