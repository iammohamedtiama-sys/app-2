# Yam-Trans POS v12 — correction impression Bluetooth

## Correction principale

- L'impression automatique après l'enregistrement utilise désormais exactement le même plugin Bluetooth ESC/POS que le bouton de test.
- Le reçu client est imprimé seul en premier.
- Le talon est imprimé uniquement après action sur le bouton « Imprimer le Talon ».
- Une nouvelle tentative d'impression réutilise le colis déjà enregistré et ne crée jamais un nouvel envoi.
- En cas d'échec, aucun PDF ne s'ouvre automatiquement.
- Le bouton de nouvelle tentative reste disponible dans la fenêtre de confirmation.
- Les impressions manuelles « Reçu client » et « Étiquette colis » utilisent aussi le Bluetooth direct lorsque ce mode est configuré.

## Vérification

La syntaxe JavaScript a été contrôlée avec `node --check src/main.js`. La compilation Vite complète n'a pas pu être exécutée dans l'environnement de génération car une archive npm était indisponible sur le registre interne.
