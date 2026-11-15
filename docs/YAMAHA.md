# Yamaha dans ChickenWing 1.10

## Consoles et fichiers

| Modèle | Voies mono | MIX | Matrices | DCA / mute groups | Local IN / OUT | Dante IN / OUT | Export |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| QL1 | 32 | 16 | 8 | 16 / 8 | 16 / 8 | 32 / 32 | .CLF |
| QL5 | 64 | 16 | 8 | 16 / 8 | 32 / 16 | 64 / 64 | .CLF |
| CL1 | 48 | 24 | 8 | 16 / 8 | 8 / 8 | 64 / 64 | .CLF |
| CL3 | 64 | 24 | 8 | 16 / 8 | 8 / 8 | 64 / 64 | .CLF |
| CL5 | 72 | 24 | 8 | 16 / 8 | 8 / 8 | 64 / 64 | .CLF |
| DM3 | 16 | 6 | 2 | 0 / 6 | 16 / 8 | 16 / 16 | .dm3f |
| DM3 Standard | 16 | 6 | 2 | 0 / 6 | 16 / 8 | — | .dm3f |
| DM5 | 60 | 24 | 12 | 12 / 12 | 32 / 16 | 64 / 64 | .dmxf |
| DM5 Compact | 48 | 24 | 12 | 12 / 12 | 16 / 16 | 64 / 64 | .dmxf |
| DM7 | 120 | 48 | 12 | 24 / 12 | 32 / 16 | 144 / 144 | .dmxf |
| DM7 Compact | 72 | 48 | 12 | 24 / 12 | 16 / 16 | 144 / 144 | .dmxf |

La colonne « voies » décrit les entrées mono éditables dans ChickenWing. Les tranches spécialisées ST IN et retours FX des consoles ne sont pas ajoutées à ce nombre. Une source stéréo utilise une paire de voies liées ; un MIX ou une matrice stéréo utilise une paire de bus. Ces paires logiques commencent sur un numéro impair. Les deux prises d’entrée peuvent commencer sur un port physique pair.

QL/CL proposent Stereo LR et Mono C. DM3 propose Stereo LR ; DM5/DM7 proposent Stereo A et B. Les assignations vers ces bus suivent le fader de la source, sans niveau d’envoi indépendant. Le mode FIXED / Groupe est commun à une paire de MIX. Les conflits FIXED / VARI sont signalés avant export.

Les connecteurs disponibles suivent le modèle : slots MY 1–2 sur QL et 1–3 sur CL ; USB sur DM ; AES/EBU selon la console. La carte PY-DSP se prépare dans l’onglet Effets ; les autres cartes PY, le décodage M/S, le passage de Stereo B en mono, les direct outs et le port-to-port se préparent dans l’éditeur Yamaha. Les DM1000/DM2000 ne font pas partie de cette version.

## Un patch Yamaha comporte plusieurs étages

Exemple : **Rio Y002, prise IN 7 → Dante IN 39 de la console → CH 3**. La prise de préampli, le canal de transport Dante et la voie de mixage sont trois adresses distinctes.

1. Dans **Nouveau show**, choisissez Yamaha, sa gamme, le modèle et une stagebox de départ.
2. Dans **Routing & envois → Stageboxes & Dante**, réglez les emplacements, Unit ID, fréquences et plages Dante. Les Unit ID sont saisis en décimal et affichés sous leur forme Yamaha hexadécimale : 10 devient Y00A.
3. Choisissez le rack comme **Interface** dans les entrées et sorties. « Entrée physique 7 » signifie la prise 7 du rack. Le début de plage Dante est appliqué lors de l’export.
4. Exportez aussi le **Plan stageboxes & Dante**. Il indique prises, canaux Dante, voies / bus, gains, 48 V, fréquence et mode de mise en place.

Les plages d’entrées et de sorties Dante sont indépendantes. Deux racks peuvent commencer à Dante IN 1 et Dante OUT 1 sans conflit ; deux racks ne peuvent pas occuper les mêmes canaux dans un même sens. Une sortie brute Dante et une sortie de rack qui désignent le même canal sont également reconnues comme un conflit. Deux voies partageant un préampli doivent préparer les mêmes gain et 48 V.

## Racks proposés

Rio3224-D / D2 / D3, Rio1608-D / D2 / D3, Tio1608-D / D2, Ri8-D et Ro8-D. Les ports exposés dans les interfaces de rack sont leurs prises analogiques. Les huit sorties AES supplémentaires d’une Rio3224 ne sont pas ajoutées aux seize sorties analogiques.

QL/CL sont préparées à 48 kHz ; DM peut être préparée à 48 ou 96 kHz. Le Tio1608-D original impose 48 kHz dans ce parcours. ChickenWing refuse les configurations de fréquence incompatibles. Les préamplis de rack se préparent de −6 à +66 dB ; ceux de la DM3 locale de 0 à +64 dB.

Les montages QL/CL sont limités à huit racks et DM5/DM7 à vingt-quatre. L’utilisation de plusieurs consoles avec les mêmes racks demande de choisir le propriétaire des préamplis et du rappel ; ChickenWing prépare un système à une console. Le partage de gains et les autorisations DDM se règlent sur le système réel.

## Transférer vers QL / CL

Ouvrez le `.CLF` avec QL Editor ou CL Editor **5.8.1**, configuré pour le modèle choisi. Les noms, patchs de voies et de ports, préamplis locaux, HPF, niveaux, mutes, liaisons stéréo, envois MIX / matrices, DCA et mute groups sont préparés dans la mémoire courante et en scène **001**.

QL/CL Editor prépare le patch interne de la console ; il ne réalise pas hors ligne les connexions Dante des appareils réels. Montez les racks sur la console, puis appliquez **DANTE INPUT PATCH** et **DANTE OUTPUT PATCH**, ou les abonnements dans Dante Controller. Appliquez les gains et 48 V externes avec le plan CSV. Les gains et 48 V locaux sont écrits dans le `.CLF`.

Enregistrez depuis l’éditeur et transférez sur clé USB. Le fichier contient une base de show complète avec une scène de préparation, pas l’ensemble d’un show Yamaha existant à fusionner automatiquement.

## Transférer vers DM5 / DM7

Utilisez **DM Editor 2.0.1**, avec une version de firmware compatible. Au lancement, sélectionnez exactement DM5, DM5 Compact, DM7 ou DM7 Compact. L’export utilise le format commun `.dmxf` enregistré par cette version ; il ne cible pas l’ancien DM7 Editor 1.x.

Chargez avec **Load with System Setting** pour reprendre les réglages système préparés. Le fichier contient le montage virtuel des racks, leurs modèles et Unit ID, le patch Dante IN vers les ports de ces racks, les valeurs de préampli prévues et la fréquence. Les UUID matériels ne sont pas inventés. Réassociez les racks virtuels aux appareils détectés et contrôlez **Device Mount**, **Dante Patch By**, **Dante Control ID** et **With Recall**.

Le mode « Patch IN préparé depuis la console » active la commande de patch par la console ; le mode Dante Controller laisse la gestion des abonnements au contrôleur. Les abonnements des récepteurs de sortie des racks restent à réaliser / vérifier sur place avec le plan. Le fichier prépare aussi les patchs internes de sorties vers les canaux Dante de la console.

Les gains et 48 V sont préparés dans le fichier et conservés par l’éditeur lors des essais. Leur application au matériel dépend du montage, des droits de commande et du rappel. Réenregistrez le fichier depuis DM Editor avant de le transférer sur USB.

## Transférer vers DM3 / Standard

Ouvrez le `.dm3f` dans **DM3 Editor 3.1.0**, en choisissant la variante appropriée. DM3 Standard utilise les ports locaux et USB, sans Dante.

Sur DM3 Dante, le mode **Auto Setup** décrit une configuration Yamaha à activer sur place : une seule Rio/Tio **Y001**, vers Dante IN 1–16 et OUT 1–8. Il ne remplace pas le patch des voies. Ri8-D et Ro8-D sont exclus d’Auto Setup ; ils restent utilisables par abonnements manuels. Une Rio3224 ne fournit pas 32 entrées simultanées à une DM3 dont la liaison Dante est limitée à seize.

Les mute groups DM3 concernent les entrées. Il n’y a pas de DCA sur ce modèle. Les valeurs de HA Dante sont préparées par canal de réception ; leur application aux racks doit être vérifiée sur le réseau réel.

## Périmètre et vérifications

Les racks FX et Premium se préparent dans ChickenWing avec leurs capacités propres : modèles natifs, bypass, Wet/Dry classique, inserts, bus d’envoi et retours. Les paramètres détaillés des algorithmes, EQ et dynamiques de tranche et fonctions de surface se terminent dans l’éditeur Yamaha. Voir [FX et Premium](YAMAHA-FX.md). Aucun algorithme WING/M32 n’est substitué dans un fichier Yamaha. Les noms de tranches utilisent actuellement une préparation commune sur huit caractères ASCII ; une normalisation des accents et une troncature sont appliquées à l’export.

Les snapshots de préparation restent des états ChickenWing. Chaque export écrit cet état en mémoire courante et en scène 001 d’un fichier indépendant. Exportez le projet JSON pour conserver tous les états, les documents importés et le plan de stageboxes.

Essais sur ce Mac, le **1 novembre 2026** :

- Génération et contrôles structurels sur les onze modèles : capacités, ports, paires, groupes, patchs, routage, scènes stockées, champs MBDF et checksums CLF.
- QL Editor 5.8.1 : ouverture du fichier final avec entrée stéréo, MIX stéréo, matrice stéréo, envois, groupes et scène 001 visible ; la mémoire réenregistrée est identique octet pour octet à celle générée.
- CL Editor 5.8.1 : ouverture d’un show CL généré. Les trois variantes partagent le moteur CLF, avec leurs capacités vérifiées par les tests.
- DM3 Editor 3.1.0 : ouverture et réenregistrement ; les noms, liens, relations stéréo et niveaux d’envois vérifiés sont conservés.
- DM Editor 2.0.1 : essais DM5 avec Rio et essai DM7 explicite, chargés avec les réglages système puis réenregistrés. Les paramètres contrôlés comprennent patchs internes, envois, groupes, matrice stéréo, montage Rio, patch Dante IN, HA, fréquence et phantom master. Les variantes Compact sont couvertes par les tests de génération ; leur rappel physique reste à vérifier.
- FX / Premium, 1–2 novembre 2026 : ouverture des fichiers combinés dans CL Editor et QL Editor, U76 à deux emplacements, Dual sur deux destinations mono et envoi/retour Premium. Réenregistrements conservant la mémoire CLF. DM5 et DM7 : sections FX, PremiumRack et Mixing intégralement conservées après réenregistrement ; PY-DSP virtuelle reconnue avec budget 96. DM3 : FX et Mixing intégralement conservés après réenregistrement.
- Navigateur : création d’un show DM7, ajout d’un deuxième rack, affectation de plages IN / OUT distinctes, sauvegarde locale et téléchargement réel du fichier natif depuis l’interface.

**Aucun essai de rappel sur console physique ni d’abonnement sur réseau Dante réel n’a été effectué.** Les essais dans les éditeurs ne démontrent pas la connexion effective des racks ou le résultat sonore.

## Sources et format

Règles de fonctionnement consultées dans les sources Yamaha : [FAQ CL, notamment limites de préparation hors ligne et partage des HA](https://usa.yamaha.com/products/proaudio/mixers/cl_series/faq.html), [DM7 Dante Setup](https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/11148721163.html), [montage manuel DM7](https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/11150379531.html), [Auto Setup DM3 : patch exact](https://manual.yamaha.com/pa/mixers/dm3/rm/en-US/7400384779.html), [modèles Auto Setup DM3](https://manual.yamaha.com/pa/mixers/dm3/rm/en-US/7399138955.html), [spécifications DM5](https://usa.yamaha.com/products/proaudio/mixers/dm5/specs.html), [spécifications DM7](https://usa.yamaha.com/products/proaudio/mixers/dm7/specs.html), [compatibilité DM Editor 2.0.1 / firmware](https://usa.yamaha.com/support/updates/dm_editor_mac.html), [manuel Rio-D2](https://usa.yamaha.com/files/download/other_assets/9/1128889/rio3224d2_en_om_e0.pdf).

Les fichiers de base de `public/yamaha` sont des sessions initiales enregistrées par les éditeurs installés. Aucun exécutable Yamaha n’est embarqué. L’adaptateur CLF reconstruit ses collections et leurs offsets puis recalcule les checksums des mémoires modifiées. L’adaptateur MBDF lit les schémas de paramètres embarqués, modifie les champs identifiés, puis reconstruit les conteneurs compressés et la liste des scènes. Les trames sources sont copiées avant modification et restent réutilisables entre exports.

Recherches indépendantes sur les formats, utilisées comme points de comparaison : [show-file-skills, documentation de format Yamaha](https://github.com/michaelkeithlewis/show-file-skills/blob/main/yamaha/references/FORMAT.md) et [dm3-tools](https://github.com/nospi/dm3-tools). Ces projets et Yamaha ne valident ni ne garantissent ChickenWing. Les écritures supplémentaires de routing et stageboxes ont été examinées avec les sauvegardes des éditeurs locaux.
