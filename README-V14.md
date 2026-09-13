# Yam-Trans POS v14

Corrections principales :
- QR codes Bluetooth imprimés comme images raster ESC/POS pour une meilleure compatibilité.
- Logo Yam-Trans imprimé par défaut sur les tickets et talons, remplaçable par le super utilisateur.
- Code d'envoi généré avec le préfixe de la ville/agence de départ.
- Code centré, en gras et encadré sur reçu et talon Bluetooth.
- Bordereaux imprimables en A4 via le service Android et en 58/80 mm directement en Bluetooth.
- Logo Yam-Trans dans l'en-tête et le pied des bordereaux.
- Bouton PDF séparé du bouton Imprimer.

Après extraction :
```powershell
npm install
npm run build
npx cap sync android
```
Puis reconstruire l'APK, car le plugin Android natif a été modifié.
