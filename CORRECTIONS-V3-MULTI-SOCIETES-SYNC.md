# Transport POS v3.0 — synchronisation robuste et multi-sociétés

## Synchronisation / offline-online
- Les données locales sont maintenant séparées par société (`tenant:<companyId>`), ce qui empêche qu'une société voie les colis d'une autre sur le même appareil.
- La première connexion d'un compte se fait en ligne; le compte est ensuite utilisable hors ligne sur l'appareil déjà autorisé.
- Après connexion en ligne, toutes les données de la société sont récupérées depuis le serveur. Un nouveau téléphone ne repart donc plus à zéro.
- La fusion ne se base plus uniquement sur l'heure du téléphone. Chaque entité reçoit une `_serverVersion`; une modification provenant d'un appareil obsolète est détectée comme conflit et n'écrase pas silencieusement la version serveur.
- L'indicateur d'état différencie désormais : hors ligne, Internet présent mais serveur indisponible, synchronisation en cours, en ligne et synchronisé.
- Synchronisation automatique au retour réseau et vérification périodique du serveur.

## Numéros de colis
- Suppression du compteur `OUA-00001` purement local qui pouvait redémarrer à zéro sur chaque téléphone.
- Le serveur réserve des blocs de 100 numéros uniques par société et par code agence.
- Chaque appareil peut consommer son bloc hors ligne sans collision avec les autres appareils.
- Si un bloc est épuisé hors ligne, l'app bloque la création plutôt que de fabriquer un numéro potentiellement dupliqué.

## Multi-sociétés
- Écran de connexion : Code société + Identifiant + Mot de passe.
- Chaque société dispose de ses utilisateurs, agences, colis, paiements, dépenses, bordereaux et paramètres locaux séparés.
- Le branding (nom, téléphone, logo) est appliqué après connexion.
- Le QR client inclut aussi le code société dans le lien de suivi.
- Un même numéro `OUA-00001` peut exister dans deux sociétés différentes sans conflit de tracking.
- Nouveau rôle `Super Super Admin` / `platform_admin` pour créer les sociétés.

## Reçus / QR / identité
- QR du reçu = lien public de suivi du colis avec société + code colis.
- Message explicite ajouté : scanner le QR code avec le téléphone pour suivre le colis étape par étape et localiser le point de retrait.
- Logo de la société utilisé sur ticket HTML, PDF et impression Bluetooth ESC/POS lorsqu'il est configuré.
- Le QR interne du talon ne contient plus le nom ni le téléphone du destinataire.

## Exports
- Export PDF comptabilité renforcé (pagination, erreurs gérées, nom de société dynamique).
- Export CSV comptabilité et rapport avec encodage UTF-8/BOM.
- Sur Android, ajout d'un partage natif des PDF/CSV via `NativePrinter.shareBase64File` afin de ne plus dépendre du téléchargement WebView.
- Sur Windows/Web, fallback vers le téléchargement standard.

## Administration
- Les nouveaux utilisateurs sont créés côté serveur : ils existent donc sur tous les téléphones/PC de la société.
- La désactivation d'un utilisateur est propagée côté serveur.
- Le Super Super Admin crée une société et son premier administrateur depuis l'application.

## Version
- Application Android : 3.0.0 (`versionCode 30`).
- Nom générique du launcher : Transport POS.
