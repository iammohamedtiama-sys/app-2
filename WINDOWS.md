# Yam-Trans 4.7.0 pour Windows

La version Windows réutilise les écrans et les règles métier de l’application 4.7.0 : Courrier, Bagages, Tickets, comptes, droits, clients, fidélité, rapports et exploitation transport. Les modules visibles dépendent des droits de la société et du compte connecté.

## Installer ou lancer

- `YamTrans-4.7.0-Windows-Installation.exe` installe l’application pour l’utilisateur Windows, ajoute les raccourcis et un programme de désinstallation.
- `YamTrans-4.7.0-Windows-Portable.exe` lance l’application sans installation.
- Cible : Windows 10/11, processeur x64. La première connexion nécessite Internet et les mêmes identifiants de société et de compte que l’application.
- Le serveur par défaut reste `https://sync.print-station.tech`. Le serveur doit disposer des API 4.7.0 pour les nouvelles opérations transport.
- Les données locales restent dans `%APPDATA%\YamTrans`, séparées du dossier de l’exécutable. Elles persistent lors des mises à jour et ne sont pas supprimées par le programme de désinstallation.

## Périphériques Windows

Dans « Mes imprimantes », le dialogue Windows permet de choisir une imprimante système. Le mode « Imprimantes Windows » propose les files déjà installées dans Windows pour affecter séparément le reçu et l’étiquette. Une imprimante USB, réseau ou Bluetooth doit disposer d’une file et d’un pilote Windows fonctionnels. Une adresse Bluetooth Android ne constitue pas une file Windows.

Les PDF utilisent le dialogue d’enregistrement Windows. Le scanner QR et les photos utilisent la webcam. Le lecteur QR de secours est embarqué et ne nécessite pas de téléchargement à l’exécution.

La protection des sièges entre agences exige toujours une connexion au serveur. Les règles de synchronisation et de régularisation restent celles de la version 4.7.0.

## Compilation

```bash
npm ci
npm run desktop:test
npm run desktop:windows
```

Les fichiers se trouvent dans `release-windows/`. La compilation produit l’application portable avec Electron Builder puis l’installateur avec le compilateur NSIS téléchargé par celui-ci. `MAKENSIS_PATH` permet de préciser l’emplacement du compilateur si nécessaire.

## Vérifications et limites

Les tests métier client et les tests d’impression Windows passent. Un test Electron sous Linux vérifie l’ouverture des modules, l’API de bureau isolée, le décodage QR et la persistance après rechargement. Les fichiers Windows sont inspectés comme exécutables PE et leur contenu embarqué est comparé à la compilation web.

L’installation et l’impression sur un PC Windows physique restent à valider avec les périphériques de la compagnie. Les exécutables ne disposent pas d’une signature Authenticode. Aucun certificat d’éditeur n’a été fourni.
