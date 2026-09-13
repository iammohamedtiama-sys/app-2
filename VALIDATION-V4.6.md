# Validation YAM TRANS v4.6

- `node --check src/main.js` : OK.
- Aucune déclaration de fonction JavaScript dupliquée après intégration v4.6.
- Version Android : 4.6.0 / versionCode 460.
- Les sources Web et Android partagent le même `src/main.js` et `src/style.css` métier.
- Compilation Gradle complète non reproduite dans l'environnement de génération : le téléchargement de Gradle depuis `services.gradle.org` est bloqué par la résolution DNS de l'environnement.
- `npm ci` a également échoué dans l'environnement de génération avant le build Vite à cause de l'environnement npm/réseau ; aucune nouvelle dépendance npm n'a été ajoutée en v4.6.
