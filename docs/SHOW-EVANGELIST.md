# Show Evangelist · ChickenWing

« Vous pouvez changer de religion, sans génocide. »

L’onglet **Show Evangelist** se trouve dans le menu **Espace de travail**. Il importe une scène native ou un projet, prépare une conversion vers l’un des 16 modèles, affiche les adaptations, puis crée un nouveau show indépendant. La source est conservée. Le traitement reste local et fonctionne sans Internet, compte ou API.

## Utilisation

1. Importer le fichier ou choisir **Utiliser le show en cours**.
2. Préciser la console source si nécessaire. Un `.CLF` partagé entre CL et QL nécessite de choisir le modèle. Pour Yamaha, choisir la **mémoire courante** ou une scène référencée dans le fichier ; un projet ChickenWing propose aussi ses snapshots.
3. Choisir la console cible et, pour DM5 / DM7, indiquer la présence physique éventuelle d’une **PY-DSP**.
4. Affecter chaque interface absente à une interface cible. Les transports AES50, Dante, cartes et ports locaux ne sont pas équivalents électriquement. Le convertisseur propose les mêmes numéros de prises ; les adresses peuvent être corrigées par voie et par sortie.
5. Dans **Les voies à emporter**, cocher les voies à conserver. Le compteur exprime leur coût sur la cible : **24 / 16 voies de traitement** bloque la conversion ; décocher huit mono donne **16 / 16**. Une paire stéréo coûte deux voies sur M32 / Yamaha et une voie WING. La paire reste entière. Les numéros sont réalloués en conservant autant que possible l’ordre, avec les paires sur des numéros impairs et les voies mono dans les places libres. Les affectations d’envois, groupes et inserts suivent ; un insert sur une voie retirée est signalé et retiré.
6. Examiner chaque proposition FX : même algorithme, même fonction, approximation, solution interne manuelle ou absence d’équivalent. Un menu permet de choisir un autre processeur disponible ou de retirer explicitement l’effet. Les inserts WING en bypass gardent leur destination et leur état. Si l’affectation source est introuvable, **Destination du remplacement dans la console cible** permet de sélectionner une voie, un bus, un Main ou une matrice et de préciser la position de l’insert ; les conflits et ressources restent contrôlés. Un manque de DSP reste bloquant tant que l’effet n’est pas retiré ou que la cible ne change pas.
7. Lire ou télécharger le rapport, puis **Convertir et créer le show**. Ouvrir sa préparation pour exporter le fichier natif. Le projet JSON emporte le rapport et le fichier source original (encodé en base64), ou la préparation source si la conversion part du show courant.

Les retraits de voies, les limites de ports, les changements de gain / coupe-bas, les affectations de groupes indisponibles et les pertes de routing sont détaillés. Une saturation de capacité n’entraîne aucune suppression implicite de voie. Des limites de bus ou d’insert peuvent encore bloquer une sélection d’entrées tenant dans le compteur : elles apparaissent séparément dans le rapport.

## Formats lus

| Source | Import | Sélection |
| --- | --- | --- |
| WING / COMPACT / RACK | `.snap`, snapshot JSON | Un snapshot |
| M32 / M32R | `.scn`, en-têtes 2.x / 3.x / 4.0 et routing lisible | Une scène ; un fichier `.show` doit être exporté en `.scn` depuis M32-Edit |
| QL1 / QL5, CL1 / CL3 / CL5 | `.CLF`, mémoire MEMAPI version 7 / Editor 5.8.1 | Mémoire courante ou scène stockée |
| DM3 / Standard | `.dm3f`, scène MBDF correspondante | Mémoire courante ou scène référencée |
| DM5 / Compact, DM7 / Compact | `.dmxf`, scène MBDF correspondante | Mémoire courante ou scène référencée |
| ChickenWing | Projet `.json` | État courant ou snapshot de préparation |

Limite : 35 Mo. Les formats et versions inconnus sont refusés sans modifier l’espace de travail. Les configurations de patch natives sortant du périmètre lisible sont signalées. Les noms des fichiers Yamaha ne sont pas utilisés pour deviner un modèle absent de leurs métadonnées. Les doublons physiques de sortie et les états gauche / droite indépendants qui ne rentrent pas dans le modèle de préparation sont signalés.

## Ce qui est effectivement converti

- Noms, sources, formats, ports, gain et 48 V lorsque le préampli cible le permet, coupe-bas, niveau, panoramique et mute des entrées.
- Bus, Main, matrices, sorties physiques et envois représentables ; niveaux et mutes, groupes DCA / mute disponibles. Les ressources absentes et liaisons non représentables sont explicitement signalées.
- Modèles d’EQ de tranche WING, y compris en bypass : Soul / E88 / E84 / F110 et EQ standard. Le convertisseur propose le processeur cible et indique les réglages à reconstruire. Soul → Equalizer601 est un rapprochement fonctionnel, pas une émulation SSL identique.
- GEQ dédiés : 16 unités CL/QL, 24 DM5, 32 DM7 ; 31BandGEQ stéréo occupe deux unités. Les montages, ports natifs, bypass et gains GEQ déjà décodés en dB suivent la conversion. DM3 emploie le GEQ de MIX / Stereo (15 bandes réglables), ou son PEQ de tranche pour un EQ sur une entrée.
- Algorithmes des racks FX / Premium, montages en insert et en envoi / retour, ressources DSP, sources et retours disponibles. Les FX BUS dédiés DM3 deviennent des bus ordinaires ailleurs. Les retours M32 / Yamaha deviennent des bus traités sur WING lorsque le montage est représentable.
- Banques de paramètres FX natives compatibles pour un **même algorithme de la même famille**, y compris après déplacement de slot. Une banque source absente ou un algorithme différent initialise la cible et le rapport le précise.
- Banques de traitement de tranche **M32 vers M32 / M32R**, **DM3 vers DM3 / Standard** et **DM5 / DM7 entre eux**, sur les chemins du schéma natif vérifiés. WING conserve les traitements de son snapshot de référence lors d’une conversion entre ses variantes ; les voies retirées sont mutées dans le fichier résultant.

## Limites qui comptent pour le son

Ce n’est pas encore une traduction intégrale du mix. Les **réglages détaillés d’EQ, gates, compresseurs, délais de tranche, polarités et sidechains ne sont pas traduits entre fabricants / familles de traitement**. Les banques EQ / dynamiques CL/QL ne sont pas réappliquées par ce parcours, même dans leur propre famille. La cible utilise alors sa base initiale et le rapport demande de reconstruire ces traitements à partir de la source jointe. Cette limite est affichée avant toute création.

Même fonction d’effet ne garantit pas le même résultat : il faut reconstruire les durées, prédélais, taux, seuils, ratios, filtres, modulation, tempo et autres paramètres quand la banque n’est pas directement compatible. La référence documente la fonction et le besoin de remplacement, sans inventer de traduction numérique d’indices propres aux constructeurs.

Les autres algorithmes de tranche qui peuvent remplacer manuellement un FX sont indiqués comme **solution manuelle**, pas comme processeur monté automatiquement. Par exemple, WING possède Wave Designer et 76 Limiter Amp dans sa dynamique de tranche ; ne pas les confondre avec un limiteur de rack. Le Freeze Yamaha est un échantillonneur : il n’est pas remplacé par une réverbération infinie. Shimmer, correcteur de justesse, réduction de bruit et Primary Source Enhancer gardent leurs fonctions distinctes.

Les paires liées dont les réglages principaux L/R diffèrent restent deux voies mono pour préserver ces différences. Les retours FX indépendants, les deux inserts mono d’un moteur Dual, les entrées internes hors FX, les sorties dupliquées, les bus saturés et les points d’insertion spécifiques peuvent nécessiter une reprise. Le bypass d’un FX M32 en envoi / retour ne reçoit pas de traduction inventée : le cas reste bloquant ou l’effet peut être retiré explicitement.

CL/QL : Flex15GEQ et 8BandPEQ sont identifiés à l’import et dans la table ; le convertisseur propose un processeur exportable, avec paramètres à reconstruire. Leur montage direct n’est pas encore préparé par ce parcours. Les deux GEQ mono d’un remplacement stéréo ne reçoivent pas de liaison de commandes inventée : vérifier la liaison dans l’éditeur si nécessaire.

Les scènes supplémentaires d’un show ne sont pas converties en lot. Talkback, automix, recall safe, MIDI, surface, abonnements réseau et matériel externe restent à reconfigurer. Les fichiers exportés doivent être ouverts et vérifiés dans l’éditeur cible. Aucun test sonore ni rappel sur une console physique n’a été effectué pour ce convertisseur.

## Référence durable et vérification

La [table complète des équivalences](FX-EQUIVALENCE.md) et les règles exécutées par l’application dans `src/fx-equivalence.js` constituent la référence persistante. Chaque conversion conserve sa version de référence dans son rapport. Les propositions sont des décisions éditoriales fondées sur les fonctions décrites dans les manuels, et restent modifiables dans l’aperçu.

Les tests couvrent les 16 modèles, les 256 couples source / cible sur un sous-ensemble commun, les onze lecteurs Yamaha en mémoire courante et scène enregistrée, le fichier M32 existant, la sélection 24 → 16, les paires stéréo, la renumérotation des inserts / groupes, les paramètres natifs compatibles, les ressources DSP, les formats invalides et les matrices WING. Le test Chrome isolé `tests/browser-converter.mjs` vérifie les cases, le compteur, la création, le rapport, la sauvegarde source, le téléchargement natif, la référence et l’affichage mobile sans requête externe.
