# Yam-Trans POS v13

Correctifs principaux :
- impression Bluetooth du reçu et du talon avec en-tête, QR codes, code colis très grand et centré, guichetier et nombre de colis ;
- champ « Nombre de colis » dans l’enregistrement, repris sur les tickets, talons, rapports et bordereaux ;
- aperçu de bordereau rendu directement en HTML (plus de page blanche liée aux blob URLs) ;
- impression Android et export PDF séparés et fonctionnels pour les bordereaux ;
- filtres rapports, réinitialisation, export PDF et CSV fiabilisés ;
- boutons protégés contre les doubles clics, états de chargement et animation tactile.

Après extraction :
```bash
npm install
npm run build
npx cap sync android
```
