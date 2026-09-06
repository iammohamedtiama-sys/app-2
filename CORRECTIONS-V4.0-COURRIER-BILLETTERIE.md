# YAM TRANS v4.0 — Courrier + Billetterie

Cette version conserve le module Courrier/Colis existant et ajoute un second module Billetterie transport.

## Accueil et droits
- Après connexion, affichage des blocs Courrier et Tickets si les deux sont autorisés.
- Si un seul module est accordé à la société/utilisateur, accès direct à ce module.
- Droits par société puis par utilisateur.
- Rôles billetterie : vente, embarquement, dispatch, chauffeur, manager, rapports.

## Tableau de bord
- Filtre par date pour consulter les journées passées.
- Retour automatique à la date du jour lors du changement de journée si aucun historique n'est volontairement sélectionné.

## Billetterie
- Bus, immatriculation, chauffeur, convoyeur et équipements.
- Plans de sièges visuels avec zones VIP et Simple.
- Lignes, arrêts intermédiaires, points d'embarquement et de descente.
- Programmation des départs, tarifs VIP/Simple et disponibilité des sièges.
- Vente de billet, PNR, QR code, PDF et lien public de téléchargement.
- Scan QR à l'embarquement, contrôle des doublons et présence.
- Annulation/remboursement avec journalisation.
- Fidélité clients et points.
- Rapports billetterie, recettes, occupation et performance des lignes.

## Communications
- SMS et WhatsApp disponibles pour Courrier et Billetterie selon les droits accordés par le Super Super Admin.
- Envoi effectué côté serveur afin de ne pas exposer les secrets fournisseur dans l'application.
- Journal de communication synchronisé pour statistiques et suivi.

## Compatibilité
- Le nom Android reste YAM TRANS.
- L'applicationId existant est conservé.
- Le formulaire Nouvel envoi reste en formulaire long.
- La configuration des imprimantes reste par utilisateur.
