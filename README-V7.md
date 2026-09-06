# YamTrans POS v7 — version consolidée

Cette version consolide les demandes exprimées pendant les échanges :

- menu principal complet accessible sur mobile ;
- paramètres administrateur restaurés et enrichis ;
- identité de la société, logo, agences, villes, utilisateurs et rôles ;
- tarification colis et enveloppes avec frais modifiables ;
- recherche automatique des clients par téléphone ;
- confirmation avant enregistrement et impression ;
- impression Android et Bluetooth ESC/POS directe, formats 58/80 mm ;
- reçu client et étiquette colis avec QR distincts ;
- bordereaux par destination ;
- suivi des colis et recherche tracking ;
- exploitation : trajets, lignes, stations, véhicules, horaires, chauffeurs/convoyeurs ;
- recettes limitées par agence et dépenses d’agence ;
- filtres comptables et exports PDF + CSV compatible Excel ;
- photos facultatives et durée de conservation configurable (14 jours par défaut) ;
- sauvegarde/restauration JSON et journal d’audit ;
- mode hors connexion local.

## Important

La synchronisation réelle entre plusieurs appareils nécessite encore un backend/API central et une base en ligne. Cette archive reste un prototype fonctionnel local/offline avec structure prête à connecter à une API.

## Comptes de démonstration

- admin / admin123
- ouaga / ouaga123
- abidjan / abidjan123

## Build

```powershell
npm install
npm run build
npx cap sync android
```
