# YamTrans 4.8.0

Application de gestion de transport : Tickets, Bagages, Courrier et exploitation. Client Web, Android/Capacitor et Windows/Electron.

- [Fonctions et mise en service 4.8](OPERATIONS-4.8.md)
- [Installation et compilation Windows](WINDOWS.md)
- [Contrôles de validation](VALIDATION-4.8.md)

## Comptes de démonstration

- Administrateur : `admin` / `admin123`
- Agence Ouagadougou : `ouaga` / `ouaga123`
- Agence Abidjan : `abidjan` / `abidjan123`

Changez les mots de passe dans l'administration avant une utilisation réelle.

## Fonctionnalités

- comptes administrateur et agences ;
- chaque agence est à la fois agence d'expédition et de réception ;
- tarification automatique : colis = pourcentage de la valeur déclarée, enveloppe = montant fixe ;
- remplacement manuel des frais sur un envoi particulier ;
- personnalisation des tarifs depuis l'administration ;
- génération de deux PDF : reçu client et étiquette colis avec QR code ;
- suivi des statuts ;
- rapports et recettes ;
- personnalisation du logo, nom, téléphone et adresse des tickets ;
- configuration IKODDI depuis l'administration ;
- SMS au dépôt, à l'arrivée et à la livraison ;
- file d'attente SMS en cas d'absence de connexion ;
- stockage local hors ligne.

## Limites importantes

- Les données sont encore stockées localement sur chaque appareil. Pour partager les données entre Ouaga et Abidjan, il faut connecter un serveur/API central.
- La clé IKODDI stockée dans l'application peut être extraite d'un APK. En production, faites passer l'envoi SMS par un backend sécurisé.
- Les PDF sont générés automatiquement. L'impression dépend du service d'impression Android ou de l'application de l'imprimante installée sur le terminal.

## Build avec VS Code sous Windows

1. Installer Node.js LTS, Android Studio et le SDK Android.
2. Ouvrir ce dossier dans VS Code.
3. Dans le terminal :

```powershell
npm install
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

APK généré :

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build signé pour production

Dans Android Studio : `Build > Generate Signed Bundle / APK > APK`, puis créer ou sélectionner une clé de signature.
