# Android Test 4.11.2

L’APK de test, identifiant com.abzora.transfertpos.test et code 4112, intègre le verrouillage des bordereaux Courrier après confirmation d’arrivée. Il reprend également les correctifs de synchronisation et le champ date de naissance.

Le bouton Modifier est désactivé et grisé après arrivée ; un formulaire déjà ouvert est verrouillé lorsqu’une confirmation est reçue par synchronisation. Ouvrir et PDF restent disponibles.

Le paquet remplace les ressources web du test 4.11.1 par le build du correctif 8460466ec33c3772868435051f3615402697fc20 et actualise les numéros de version. Le code Java, les bibliothèques natives et les ressources Android restent identiques à ce paquet ; aucune nouvelle compilation Java n’est revendiquée. La signature est conservée, ce qui permet une installation de mise à jour sur les tests 4.11.0/4.11.1. Aucun essai sur téléphone physique n’a été exécuté ici.

Contrôles : signatures APK v2/v3, alignement 16 Ko, version, identifiant et égalité des ressources web avec le build final. Les validations du correctif comprennent 134 tests serveur et 37 tests JavaScript.

Fichier : YamTrans-4.11.2-Android-test.apk
Taille : 50 065 045 octets
SHA-256 : 1732dee501b7cdaef040900c28fe6c1df9db3c4a6d5605370c28318bdd9cd242

Le blocage serveur exige également le déploiement du commit serveur 85a678fae207e870b4f15d33e31e1881da043423. Le VPS n’a pas été modifié lors de la préparation de cet APK.
