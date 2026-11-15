# FX et Premium Yamaha · ChickenWing 1.10

L’onglet **Rack d’effets** prépare les processeurs, les affectations et les retours dans la mémoire courante et dans la scène 001 du fichier natif. Les snapshots ChickenWing conservent cette préparation. Chaque famille utilise les identifiants et les valeurs initiales de son éditeur Yamaha.

## Racks EQ dédiés · version 1.11.2

Le rack EQ est indépendant des budgets FX et Premium : **16 unités CL/QL, 24 DM5, 32 DM7**. Le 31BandGEQ mono occupe une unité ; sa proposition stéréo utilise deux unités mono, une par côté. DM5/DM7 préparent aussi Flex15GEQ et 8BandPEQ. Sur CL/QL, ces deux derniers modèles sont référencés et identifiés à l’import, puis remplacés lors de la conversion ; leur écriture directe reste indisponible.

DM3 propose son EQ paramétrique natif à quatre bandes et le GEQ intégré aux MIX / Stereo : 31 bandes fixes, quinze réglables simultanément. Ce dernier ne peut pas être affecté à une entrée ou matrice. Les gains GEQ physiques à 31 valeurs sont vérifiés (±15 dB, nombre de bandes actives) ; les autres réglages sont à préparer dans l’éditeur.

Références : [DM7 · GEQ/PEQ](https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/8365295627.html), [DM3 · GEQ](https://manual.yamaha.com/pa/mixers/dm3/rm/en-US/6346207115.html), manuels CL/QL et DM5 liés dans [la table des correspondances](FX-EQUIVALENCE.md).

## Capacités

| Modèles | Rack FX | Premium | Inserts préparés par tranche | Retours d’envoi |
| --- | --- | --- | --- | --- |
| QL1, QL5, CL1, CL3, CL5 | 8 moteurs ; 54 algorithmes | 8 emplacements ; 18 configurations (9 processeurs × Dual / Stereo) | 2 modules au même point | 8 ST IN partagés entre FX et Premium |
| DM3, DM3 Standard | 2 moteurs ; 18 algorithmes | Aucun | Aucun dans ce parcours | 2 FX RTN stéréo ; 2 FX BUS dédiés, distincts des 6 MIX |
| DM5, DM5 Compact | 16 unités ; 43 algorithmes | 32 unités avec PY-DSP physique, 0 sans carte ; 33 configurations | 4 modules au même point | Paires de voies ordinaires réservées |
| DM7, DM7 Compact | 16 unités ; 43 algorithmes | 64 unités, 96 avec PY-DSP physique ; 33 configurations | 4 modules au même point | Paires de voies ordinaires réservées |

Les budgets FX et Premium restent indépendants. Sur DM5/DM7, une unité DSP n’est pas un moteur de réverbération complet : les algorithmes FX à deux unités commencent sur un numéro impair. Dans Premium, chaque banque a–f contient 16 unités, un processeur doit tenir dans sa banque. Le catalogue indique le coût exact par configuration.

Sur QL/CL, HQ.PITCH et FREEZE commencent sur un numéro impair. U76 Premium occupe deux emplacements et commence également sur un numéro impair. **Seuls les Premium Racks 1 et 2 permettent un envoi / retour ; les huit acceptent les inserts.** Les limites des ports sont décrites dans les [manuels QL Editor](https://usa.yamaha.com/files/download/other_assets/6/798476/qleditor_en_om_f0.pdf) et [CL Editor](https://europe.yamaha.com/en/download/files/2080999/).

## Préparer un processeur

1. Choisir un emplacement FX ou ajouter un Premium. Le catalogue et le compteur suivent le modèle de console et l’équipement PY-DSP déclaré.
2. Choisir le processeur. Les algorithmes incompatibles avec l’emplacement sont indisponibles.
3. Choisir **Envoi / retour** avec MIX gauche/droit et retour stéréo, ou **Insert** avec tranche, numéro de module et position. DM3 emploie ses FX BUS et FX RTN fixes.
4. Dans **Routing & envois**, préparer les niveaux et prélèvements des sources vers les bus, puis les envois des retours vers MIX, matrices ou Main selon la console.
5. Exporter le fichier natif et le rouvrir dans l’éditeur du modèle choisi. DM5/DM7 : **DM Editor 2.0.1 → Load with System Setting** pour reprendre le montage virtuel de la PY-DSP.

Un processeur Dual peut traiter automatiquement une paire stéréo ou deux tranches mono distinctes avec son côté B. Les modules d’une même tranche partagent leur position. Les doublons d’insert, chevauchements DSP, retours déjà occupés et rebouclages directs d’un retour vers son propre bus d’envoi bloquent la préparation incohérente.

Les retours DM5/DM7 comptent dans la capacité des entrées et suivent les opérations d’insertion et de renumérotation. Un retour ajouté est muté par défaut ; son niveau, son mute et son assignation Stereo se règlent dans le formulaire. Le Wet/Dry classique et le bypass sont exportés. Les réglages fins (durées, filtres, seuils, ratios, paramètres Wet/Dry propres aux Premium…) restent dans l’éditeur Yamaha, comme les paramètres avancés des racks WING/M32.

## Catalogues Premium

QL/CL : Portico5033, Portico5043, Portico5045, U76, Opt-2A, EQ-1A, DynamicEQ, Buss Comp 369, MBC4 ; chacun en Dual ou Stereo.

DM5/DM7 avec ressources disponibles : REV-X, OpenDeck, Analog Delay Dual / Stereo, Max100, Dual Phaser, Vintage Phaser, HQ.Pitch, Portico5033 Dual / Stereo, Equalizer601, DynamicEQ4 Dual / Stereo, Comp276, Comp276S, DaNSe Dual / Stereo, U76 Dual / Stereo, BussComp369 Dual / Stereo, Portico5043 Dual / Stereo, Portico5045 Dual / Stereo, Opt-2A Dual / Stereo, MBC4 Dual / Stereo, EQ-1A Dual / Stereo, DynamicEQ Dual / Stereo.

Les valeurs initiales ont été capturées indépendamment dans les éditeurs installés pour les 18 configurations CL/QL et les 33 configurations DM. Les coûts viennent de DM Editor **2.0.1** : DaNSe y consomme **8** unités, même si une ancienne table du manuel en indiquait 3. Les données CL et DM ne sont pas interchangées : certains réglages initiaux U76 diffèrent.

Les catalogues FX complets sont embarqués dans `src/yamaha-fx-data.js` (54 / 18 / 43), et Premium dans `src/yamaha-premium-data.js` (18 / 33). Références : [liste des 18 effets DM3](https://manual.yamaha.com/pa/mixers/dm3/rm/en-US/7432684939.html), [rack DM7](https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/10043507467.html), [spécifications DM7](https://usa.yamaha.com/products/proaudio/mixers/dm7/specs.html), [spécifications DM5](https://usa.yamaha.com/products/proaudio/mixers/dm5/specs.html).

## Écritures natives et vérification

CLF : FX dans MEMAPI, Premium dans la section MMSXLIT PremiumRack de chaque scène. Les ports d’entrée gauche et droit occupent deux tableaux distincts. L’énumération des sources Insert 2 inclut les seize ST IN avant les bus : MIX1 vaut 529, alors que CH1 vaut 441. Le bypass classique est un masque de huit bits. Les ST IN conservent leurs groupes stéréo réservés et une balance centrée.

DM : montage dans FX / PremiumRack, ports et inserts dans Mixing. Les adresses de sortie d’insert sont indexées d’abord par module A–D, puis par tranche. Les sorties Premium incluent la banque DSP. Le montage virtuel PY-DSP utilise le champ système natif `PY/CardName` ; il est reconnu comme **Virtual** par DM Editor et ne fournit des ressources matérielles que si la carte est réellement installée.

Essais des 1–2 novembre 2026 :

- Génération et validation sur les onze modèles ; catalogues, DSP, frontières de banques, paires de retours, côtés Dual, points et conflits d’insert, persistance JSON et renumérotation.
- CL Editor et QL Editor 5.8.1 : fichiers combinant réverbération, délai, FX en insert, Premium en envoi / retour, Portico Dual sur deux destinations mono et U76 en Insert 2 stéréo. Les mémoires MEMAPI et tous les paramètres Premium réenregistrés sont identiques aux données générées.
- DM Editor 2.0.1 en DM7 : U76 a1, REV-X a4 et Portico Dual b1, 11/64 unités. Après réenregistrement, **tous** les paramètres des sections FX, PremiumRack et Mixing sont identiques. Chargement de l’export provenant du navigateur avec PY-DSP : 11/96 unités et banques e/f **Virtual** reconnues.
- DM Editor 2.0.1 lancé en DM5 : FX classiques reconnus, Premium U76 / REV-X / Portico Dual, 11/32 unités et PY-DSP virtuelle. Après réenregistrement, tous les paramètres FX, PremiumRack et Mixing sont identiques. Le bypass des deux côtés de chaque montage est initialisé pour éviter un indicateur de bypass résiduel sur les montages Stereo.
- DM3 Editor 3.1.0 : HD Hall et Ping Pong Delay ; après réenregistrement, tous les paramètres FX et Mixing sont identiques.
- Navigateur : modification d’inserts, création d’un délai avec paire de retour réservée, changement de capacité PY-DSP et téléchargement réel du fichier natif.

Les essais dans les éditeurs vérifient les fichiers et leurs affectations. Aucun essai audio ou rappel sur console physique n’a été réalisé. Les variantes Compact et les trois variantes CL sont couvertes par la génération avec leurs capacités propres.
