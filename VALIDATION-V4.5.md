# Validation YAM TRANS v4.5.0

Validation finale effectuée le 13/09/2026.

- `src/main.js` : syntaxe JavaScript valide (`node --check`).
- Android : `versionName 4.5.0`, `versionCode 450`.
- `package.json` et `package-lock.json` : version 4.5.0 cohérente.
- Frontend Android et Web : même logique métier v4.5.
- Dossiers `.gradle`, `node_modules`, `dist` et `build` exclus de l'archive de livraison.
- Anti-double clic côté client et anti-doublon côté serveur.
- Filtres et récapitulatifs Courrier / Bagages / Tickets.
- Destinations autorisées par agence.
- Scans Bagages chargement / arrivée / retrait.
- Manifestes Bagages : impression + confirmation arrivée globale.
- PDF : noms d'agents résolus, séparateurs normalisés, texte jsPDF assaini.
