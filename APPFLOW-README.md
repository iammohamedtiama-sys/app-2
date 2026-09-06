# Transport POS Android v3.0 - Appflow

Le projet est prêt à être placé directement à la racine du dépôt Appflow : `package.json`, `capacitor.config.json`, `src/` et `android/` sont au premier niveau.

Build Appflow :
1. `npm ci`
2. `npm run build`
3. `npx cap sync android`
4. build Gradle Android.

Le dossier `dist/` n'est volontairement pas versionné dans cette archive : Vite le régénère avant `cap sync`.
