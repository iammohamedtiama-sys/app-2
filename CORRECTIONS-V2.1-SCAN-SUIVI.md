# Yam-Trans Android 2.1 — Scan bordereaux & suivi client

## Ajouts
- Création/modification des bordereaux par scan des QR des talons, sans liste à cocher.
- Ajout manuel par code conservé comme solution de secours.
- Le premier talon scanné fixe origine et destination du bordereau.
- Refus immédiat des doublons, colis déjà affectés, colis déjà partis et trajets incompatibles.
- Liste visuelle des colis scannés avec possibilité de retirer un colis avant validation.
- QR du reçu client = lien complet vers la page publique de suivi de l'envoi.
- Le QR logistique du talon reste distinct pour les opérations internes.
- Création d'agence enrichie : nom du point de retrait, adresse, indication, lien Google Maps, latitude et longitude.
- Affichage d'un lien Google Maps dans l'administration des agences.
- Scanner QR renforcé : comprend QR JSON Yam-Trans, code simple et URL de suivi contenant `?code=`.

## Compatibilité
- Les anciens colis et agences restent lisibles.
- Les agences existantes sans géolocalisation restent utilisables ; il suffit de compléter leur fiche à la prochaine mise à jour.
