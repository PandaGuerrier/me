# ME

Tableau personnel de relations, sous forme d'arbre déplaçable. Base : MCL-APP (AdonisJS 7 + Inertia React + Tailwind/shadcn, monorepo pnpm/Turbo), allégée.

## Démarrer

```bash
pnpm install
cp apps/web/.env.example apps/web/.env   # puis remplir APP_KEY (node ace generate:key)
docker-compose --env-file apps/web/.env up -d
pnpm ace migration:run
pnpm dev
```

Ouvrir http://localhost:3333 — mot de passe : `APP_PASSWORD` (1234 par défaut).

## Le tableau

- Glisser le fond (ou deux doigts sur le trackpad) pour se déplacer, pincer ou ctrl/⌘ + molette pour zoomer.
- Glisser une carte pour la déplacer (position sauvegardée).
- Double-clic sur le fond : ajoute une personne à cet endroit. Clic sur une carte : modifier / supprimer.
- Raccourcis : `n` nouvelle personne, `+` / `-` zoom, `0` recentrer.

Statuts : Je n'aime pas, Connaissance, Ami·e, Crush, Amoureuse. Chaque personne peut avoir une date de rencontre, une date de fin (relation terminée → carte atténuée, lien en pointillés) et être « connue via » quelqu'un d'autre, ce qui forme l'arbre.

Le module est dans `apps/web/app/tree`.
