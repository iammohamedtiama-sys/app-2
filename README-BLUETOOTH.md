# Impression Bluetooth YamTrans v6

Cette version ajoute une impression thermique Bluetooth directe en ESC/POS.

## Configuration sur Android
1. Allumer l'imprimante et charger le papier 58 mm ou 80 mm.
2. Dans Android, ouvrir Bluetooth et associer l'imprimante. Les codes PIN fréquents sont 0000 ou 1234.
3. Dans YamTrans : Paramètres > Impression.
4. Choisir « Bluetooth ESC/POS direct ».
5. Cliquer « Détecter les imprimantes » et sélectionner l'appareil associé.
6. Enregistrer, puis cliquer « Ticket test Bluetooth ».

Après configuration, « Confirmer et imprimer » envoie directement le reçu client et l'étiquette colis à l'imprimante, sans PDF. Si l'impression Bluetooth échoue, l'application propose automatiquement le service d'impression Android en secours.

## Compatibilité
La connexion utilise Bluetooth Classic RFCOMM / SPP et les commandes ESC/POS, compatibles avec la majorité des imprimantes thermiques portables génériques 58/80 mm. Certains appareils propriétaires peuvent nécessiter le SDK du fabricant.
