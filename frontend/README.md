# Frontend ProxiSkills

Application React 19 construite avec Vite. La structure est organisee par domaine fonctionnel pour que les pages metier restent faciles a trouver.

## Dossiers principaux

```text
src/
  api/          appels HTTP centralises
  assets/       images statiques utilisees par l'interface
  components/   composants reutilisables et UI communes
  context/      providers React globaux
  features/     pages groupees par domaine produit
  hooks/        hooks partages
  routes/       routes React Router et guards d'acces
  styles/       styles partages par surface
  utils/        helpers purs et metadata d'affichage
```

## Alias d'import

Le projet expose l'alias `@` vers `src`.

```js
import useAuth from '@/hooks/useAuth';
import Services from '@/features/services/pages/Services';
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
```
