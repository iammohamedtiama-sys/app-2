# Yam-Trans Android v3.2 — correctif stockage mobile

- `currentCompany` est désormais sauvegardé sous forme légère : aucun logo/image Base64 dans `localStorage`.
- Le cache de connexion hors ligne conserve aussi une société légère.
- Les paramètres locaux ne persistent plus les médias Base64 de branding.
- Les photos de colis sont compressées (max 1280 px, JPEG ~72 %) avant stockage/synchronisation.
- Après synchronisation serveur, les copies locales persistées des photos ne sont plus conservées inutilement dans `localStorage`.
- Une migration automatique nettoie les anciens `currentCompany` et `settings` trop lourds au démarrage.
- Les erreurs de quota ne font plus échouer brutalement l’enregistrement de la société.
