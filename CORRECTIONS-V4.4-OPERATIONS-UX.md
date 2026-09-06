# YAM TRANS v4.4 — Opérations, Bagages, Utilisateurs et UX mobile

## Super Admin plateforme
- Seul le rôle `platform_admin` peut modifier ou annuler une opération Courrier ou Bagages d’une société.
- Une annulation ne détruit pas l’historique : la ligne reste visible avec la mention **Annulé**.
- Les montants des opérations annulées sont exclus des recettes et des statistiques.
- La fiche société > Opérations propose date, type, recherche, modification et annulation.

## Courrier
- Un seul montant métier : **Montant Courrier**.
- Suppression de l’interface « montant encaissé / reste à payer » pour les nouveaux envois.
- Les nouveaux envois ne créent plus une écriture de paiement distincte : le montant de l’opération est le `fee`.
- Les rapports PDF/XLS/impression utilisent ce montant unique et affichent **Annulé** pour une opération annulée.
- Le retrait affiche le montant Courrier sans demander de solde à encaisser.
- La photo du colis est réellement reliée au bouton de capture et reste facultative.

## Bagages
- Un seul champ financier : **Montant payé**.
- Photo facultative du bagage.
- Après enregistrement, choix explicite : **Imprimer le reçu**, **Imprimer l’étiquette**, ou **Imprimer les deux**.
- Les imprimantes configurées par utilisateur sont utilisées; à défaut, l’impression Android/PDF sert de repli.
- Une opération annulée reste visible avec la mention **Annulé** et son montant sort des recettes.

## Tableau de bord et listes
- Filtres du tableau de bord redessinés pour téléphone/tablette/ordinateur.
- Filtres essentiels visibles immédiatement, filtres avancés repliables.
- Suppression du parcours en 3 étapes pour les filtres.
- Raccourcis Aujourd’hui / Hier / 7 jours / Ce mois.
- La page Envois affiche par défaut les envois du jour; date, agence et recherche permettent d’accéder à l’historique.

## Utilisateurs
- Modification du nom, identifiant, rôle, agence et modules.
- Réinitialisation du mot de passe sans connaître l’ancien.
- Désactivation / réactivation du compte sans suppression définitive.
- Les utilisateurs désactivés restent visibles dans l’administration.

Version Android : 4.4.0 — versionCode 440.
