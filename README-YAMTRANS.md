# YamTrans POS v4

Version améliorée du MVP Android Capacitor.

## Principales fonctions
- Identité YamTrans et logo intégré.
- Comptes créés par l’administrateur.
- Gestion dynamique des villes et agences.
- Codes colis par destination (ex. OUA-00001).
- Deux QR distincts : annuaire des agences sur le reçu, identification du colis sur l’étiquette.
- Formats 80x80 mm et 58x57 mm.
- Paramètres d’impression Android, USB/OTG, Bluetooth et POS intégré.
- Recettes cloisonnées par agence d’origine.
- Suivi des colis entrants pour l’agence de destination.
- Recherche sans fermeture du clavier.
- Valeur déclarée et frais toujours modifiables.

## Build
```bash
npm install
npm run build
npx cap sync android
```

> L’impression silencieuse directe dépend du SDK du constructeur du POS. Le mode universel ouvre le service d’impression Android.
