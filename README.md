# ChickenWing

Application locale de préparation de shows pour les consoles Behringer WING, WING COMPACT, WING RACK, Midas M32 / M32R (Compact) et Yamaha QL, CL, DM3, DM5 et DM7. Interface sombre, en français, sans compte, sans clé API et sans service cloud.

## Télécharger la bêta

Sur GitHub, ouvrez **Releases → ChickenWing 1.11.2 bêta 1 → Assets** et choisissez l’archive de votre système. Les versions de bureau intègrent le navigateur et les ressources OCR. Consultez les [instructions d’installation et les notes de version](docs/BETA.md).

Vous préparez la publication du projet ? Suivez le [guide GitHub](docs/GITHUB.md).

## Équivalences Soul / GEQ · version 1.11.2

Le convertisseur analyse les EQ de tranche WING en plus des effets en rack. **Soul Analog EQ** reçoit une proposition paramétrique / analogique (Equalizer601 sur DM7 et CL/QL, 8BandPEQ sur DM5 sans PY-DSP, EQ de tranche sur DM3). La modélisation et les courbes diffèrent ; les réglages restent à reconstruire.

**Graphic EQ** est proposé vers le **31BandGEQ dédié Yamaha**, avec deux unités pour un Main stéréo et des budgets indépendants des FX / Premium. DM3 utilise son GEQ de sortie limité à quinze bandes actives ; sur une entrée, un PEQ est proposé comme approximation. Voir la [référence persistante](docs/FX-EQUIVALENCE.md), mise à jour à partir des manuels.

## Correction GEQ WING → DM7 · version 1.11.1

Les inserts WING configurés mais en **bypass** gardent désormais leur affectation à l’import, leur position et leur état désactivé. Un GEQ peut donc conserver le remplacement proposé pour la DM7. Les anciens projets dont l’affectation était marquée inconnue sont relus depuis le snapshot de référence lorsqu’il est disponible. Si aucune affectation n’existe dans la source, le champ **Destination du remplacement dans la console cible** permet de choisir une voie, un bus, un Main ou une matrice, puis la position de l’insert, sans retirer l’effet.

## Show Evangelist · version 1.11

L’onglet **Show Evangelist**, dans l’espace de travail, importe une scène WING `.snap`, M32 `.scn`, Yamaha `.CLF` / `.dm3f` / `.dmxf` ou un projet ChickenWing, puis crée une préparation pour une autre console. Pour Yamaha et les projets, choisissez l’état à convertir. **Les cases de sélection permettent de retirer les voies une à une**, avec un compteur de voies de traitement sur la cible : 24 / 16 bloque la création, 16 / 16 la permet si les autres ressources tiennent aussi. Les paires stéréo sont comptées selon la console cible et restent entières.

La table persistante couvre **303 entrées de catalogue** et distingue même fonction, approximation, solution manuelle et effet sans équivalent retenu. Chaque conversion affiche les pertes, changements de patch et réglages à reconstruire. Le nouveau show conserve le rapport et sa source ; ils restent accessibles depuis la préparation et dans le projet JSON. La description : « Vous pouvez changer de religion, sans génocide. »

**Périmètre actuel : préparation et montages FX, pas traduction intégrale du mix.** Les traitements avancés de tranche ne sont pas traduits entre familles, et les paramètres fins des effets différents restent à reconstruire dans l’éditeur cible. Les banques natives compatibles sont conservées pour un même algorithme dans une même famille ; les limites sont affichées avant création. Voir [le guide de conversion](docs/SHOW-EVANGELIST.md) et [la table complète des effets](docs/FX-EQUIVALENCE.md).

## Ouvrir l’application

Depuis le code source sur Mac, double-cliquez sur **Lancer ChickenWing.command**. Gardez la fenêtre Terminal ouverte pendant l’utilisation. L’application s’ouvre sur **http://127.0.0.1:4173**. Arrêtez-la avec Ctrl+C dans le Terminal.

Autre méthode : `python3 server.py --open`. Python 3 suffit : aucune installation npm n’est nécessaire. Le serveur écoute uniquement sur l’interface locale. Dès le premier lancement, aucune connexion Internet n’est requise : PDF, Excel, OCR, modèles français et anglais sont fournis dans le dossier `public/vendor`.

Les shows sont sauvegardés dans IndexedDB, propre à ce navigateur et cette adresse. **Exportez régulièrement le projet ChickenWing** pour une sauvegarde portable. Vider les données du navigateur supprime sa copie locale. Un projet JSON contient les snapshots de préparation et le snapshot WING de référence.

## Imprimer la fiche technique du show

Dans **Exporter le show → Fiche A4 / PDF**, choisissez l’état actuel ou un snapshot et cochez les rubriques à emporter. Les patchs sont triés par interface et par prise physique. Le patch d’entrées indique le micro ou la DI, la voie console, le 48 V et le gain prévus. Pour les stageboxes Yamaha, le numéro Dante figure sous la prise du rack. La fiche peut aussi inclure les sorties, les effets et inserts, les bus internes et les points à vérifier.

Ouvrez **Plan de scène** pour placer instruments, micros, retours, in-ears et stageboxes. Déplacez les symboles à la souris, au doigt ou avec les flèches du clavier. Chaque symbole peut être renommé et relié à plusieurs entrées ou sorties. Glissez les liaisons ou utilisez les flèches à côté de chacune pour choisir leur ordre sur le repère. Le plan affiche les numéros du patch, avec les entrées en bleu et les sorties en orange. Il est enregistré avec l’état actuel ou le snapshot sélectionné, et inclus dans le projet JSON.

Dans l’aperçu, cochez **Plan de scène** pour imprimer le dessin et faire apparaître le symbole et le nom du repère à côté des lignes associées dans les patchs. Décochez les autres rubriques pour imprimer uniquement le dessin.

Le thème **Clair · papier** est sélectionné par défaut. Choisissez **Sombre · écran** pour une fiche à consulter sur écran. Vérifiez l’aperçu A4 portrait puis cliquez sur **Imprimer / Enregistrer en PDF**. Dans la fenêtre qui s’ouvre, choisissez l’imprimante ou la destination **Enregistrer en PDF**. Les téléchargements de scène console, de projet et de CSV sont regroupés sous **Fichiers console, CSV, JSON** dans la même fenêtre.

## Choisir une console par marque et gamme

Dans **Nouveau show**, **Configuration console**, les informations du show et l’aperçu d’import de fiche, choisissez la **Marque**, puis la **Gamme**, puis le **Modèle de console**. Chaque liste dépend du niveau précédent :

- **Behringer → WING** : WING, WING COMPACT et WING RACK.
- **Midas → M32** : M32 et M32R (Compact).
- **Yamaha → QL** : QL1 et QL5.
- **Yamaha → CL** : CL1, CL3 et CL5.
- **Yamaha → DM** : DM3, DM3 Standard, DM5, DM5 Compact, DM7 et DM7 Compact.

La M32R utilise les fonctions et l’export `.scn` de la famille M32, avec **16 entrées Local et 8 sorties Local**, sans sortie AES/EBU physique. L’assistant propose son Main LR sur **Local 7–8**. Les 32 voies de traitement, AES50 A/B, 8 FX, 8 DCA et 6 mute groups restent disponibles. Voir le [guide officiel M32R LIVE](https://mediadl.musictribe.com/media/PLM/data/docs/P0C7S/QSG_MI_0603-AEP_M32R-LIVE_WW.pdf) pour les connecteurs. L’export M32R est vérifié par tests logiciels ; son rappel dans M32-Edit et sur console physique reste à vérifier.

Les projets existants gardent leurs identifiants de modèle. La marque et la gamme sont déduites automatiquement, sans migration ni nouveau champ à enregistrer. Un show déjà préparé conserve la protection contre un changement de moteur de console ; créez un nouveau show pour travailler avec l’autre famille.

Pour enrichir la liste, le catalogue `CONSOLE_CATALOG` dans `src/consoles.js` centralise marques, gammes, modèles, moteur de traitement et capacités physiques. Les trois parcours utilisent le même composant `src/console-picker.js`. Une nouvelle gamme peut réutiliser un moteur déjà géré ; un nouveau moteur nécessite aussi l’implémentation de ses capacités, règles et format d’export. Les menus se mettent à jour depuis ce catalogue, sans modification des écrans.

## Yamaha · version 1.10

Les onze modèles Yamaha utilisent les mêmes écrans de patch, d’import, d’insertion, de routing, de groupes et de snapshots de préparation. Leurs nombres de voies, MIX, matrices, DCA et ports physiques sont propres au modèle choisi. Une paire stéréo utilise deux voies ou bus de traitement liés.

Dans l’assistant, choisissez une **stagebox de départ**. Ensuite, ouvrez **Routing & envois → Stageboxes & Dante** pour ajouter des Rio/Tio, nommer leurs emplacements, définir les Unit ID, les plages Dante d’entrée et de sortie et la fréquence du réseau. Les racks deviennent des interfaces dans les patchs. Le plan CSV relie leurs prises physiques aux canaux Dante et aux voies / bus de la console.

**Exporter le show** produit un fichier `.CLF` pour QL/CL, `.dm3f` pour DM3 / Standard, ou `.dmxf` pour DM5/DM7 avec **DM Editor 2.0.1**. Chaque fichier contient la mémoire courante et la scène **001** ; chaque snapshot de préparation peut aussi être exporté séparément. Les racks FX et Premium se préparent dans le même onglet Effets : algorithmes Yamaha, ressources DSP, bypass, inserts, bus d’envoi et retours. Les paramètres détaillés des algorithmes restent dans l’éditeur Yamaha.

Sélectionnez le bon modèle dans l’éditeur Yamaha, ouvrez le fichier et réenregistrez-le avant transfert USB. Pour DM5/DM7, **Load with System Setting** reprend le montage virtuel des racks et les réglages système préparés. Les abonnements Dante sur le réseau réel restent à contrôler : QL/CL Editor ne permettent pas de préparer hors ligne tout le montage réseau. Sur QL/CL, les gains et 48 V des racks sont fournis dans le plan CSV ; sur DM ils sont également préparés dans le fichier natif.

| Famille | Rack FX | Premium Racks |
| --- | --- | --- |
| QL1 / QL5, CL1 / CL3 / CL5 | 8 moteurs · 54 algorithmes | 8 emplacements · 9 processeurs Dual / Stereo ; U76 utilise 2 emplacements |
| DM3 / Standard | 2 moteurs · 18 algorithmes · 2 FX BUS et 2 FX RTN dédiés | Aucun |
| DM5 / Compact | 16 unités · 43 algorithmes | 32 unités avec carte physique PY-DSP ; aucun sans carte |
| DM7 / Compact | 16 unités · 43 algorithmes | 64 unités, ou 96 avec carte physique PY-DSP |

Le correctif **1.10.1** conserve les paires stéréo lors de l’insertion d’une voie ou d’un bus mono avant elles, sur Yamaha et M32. Les envois, inserts et affectations de groupes suivent les numéros déplacés ; les ports physiques restent indépendants.

Les budgets FX et Premium sont distincts. Les algorithmes gourmands consomment plusieurs unités ; ChickenWing contrôle le placement et les conflits. Sur QL/CL, seuls les Premium 1–2 acceptent les envois / retours. Les retours partagent les huit ST IN sur QL/CL, et réservent des paires de voies ordinaires sur DM5/DM7. Voir [le guide FX et Premium](docs/YAMAHA-FX.md).

Le [guide Yamaha détaillé](docs/YAMAHA.md) précise les capacités, le transfert, les limites et les essais réalisés avec les éditeurs installés. Aucun essai sur console physique ou réseau Dante réel n’a encore été effectué.

## Lecture des images quadrillées · version 1.8.2

Les images contenant un tableau bordé sont désormais lues **cellule par cellule** : détection des lignes de la grille, recadrage du texte, agrandissement local puis seconde lecture contrastée des références incertaines. Les cadres de plans de scène sans lignes répétées ne sont pas pris pour des tableaux. Le titre situé au-dessus du tableau reste associé à sa lecture pour conserver le contexte son / lumière.

Les en-têtes anglais **Number** et **Insert** sont reconnus. Les numéros du document sont conservés, y compris les trous dans la numérotation. Les demandes **COMP / GATE** sont conservées dans les notes de la voie et dans le projet ; elles ne créent pas automatiquement des processeurs ou des réglages. Les alternatives de micros et les libellés libres restent tels qu’écrits tant qu’un modèle précis n’est pas choisi.

La capture de 459 × 652 pixels fournie a été vérifiée dans le parcours d’import complet : **14 voies numérotées de 1 à 14**, référence MD421 récupérée, 8 demandes COMP et une demande GATE conservées. Le plan de scène et la rubrique vidéo ne créent aucune voie. Les caractères encore incertains sont signalés avec le numéro de voie et la colonne concernés ; par exemple « GTR micl » en CH10 demande une vérification du dernier caractère.

Le traitement reste entièrement local, avec les modèles OCR déjà fournis. Les images sans grille gardent la lecture de texte avec reconstruction des lignes ; le même moteur peut lire successivement un tableau quadrillé et une image sans grille. Une image inclinée, coupée ou dont le texte est illisible peut encore demander une correction dans l’aperçu.

## Correction de l’import de fiches de spectacle · version 1.8.1

La lecture automatique retient désormais les **patches audio identifiés**. Une liste de contacts, un inventaire de matériel (même son), un plan de feu ou une rubrique lumière / plateau / logistique ne crée aucune voie. Les PDF dont le texte duplique les titres de rubrique sont aussi pris en charge. Sans patch audio suffisamment identifiable, l’aperçu reste vide ; il est possible d’affecter manuellement les colonnes d’un vrai tableau audio.

Les lignes rédigées comme `Patch RIO IN: In1: DPA 1 / In2: DPA 2` ou `Patch Console OUT: Out 1: Rec 1 / Out 2: Rec 2` sont lues directement. **RIO est une stagebox** : choisissez l’interface du show qui lui correspond. **Console correspond aux ports Local**. Cette correspondance sert à préparer le patch ; elle ne configure pas le transport audio ni la compatibilité physique du matériel d’origine.

Les numéros IN / OUT sont conservés comme **adresses physiques**, même si plusieurs équipements utilisent IN 1 ou OUT 1. Les numéros CH / BUS sont alors proposés séparément. Les sources et envois des sorties d’enregistrement ne sont pas inventés. Pour un ajout issu de ces lignes physiques, la réaffectation des ports est désactivée par défaut ; un conflit demande une correction dans l’aperçu.

Seules les pages / feuilles contenant un patch audio sont sélectionnées automatiquement. L’inventaire son des autres pages peut compléter une référence de microphone clairement identifiable ; sa provenance apparaît sur la ligne. Une référence ambiguë reste à préciser. La console demandée par la fiche reste visible lorsque le show est préparé pour un autre modèle pris en charge par ChickenWing.

La case **Spare / secours** permet de marquer un secours explicitement. Les libellés contenant déjà « Spare », « Backup » ou « Secours » sont reconnus. Une entrée n’est jamais déclarée spare sur le seul fait qu’elle ressemble à la précédente.

Le correctif a été vérifié sur un PDF de onze pages : seule la page 3 fournit le patch, avec **12 entrées et 10 sorties**, dont TB sur **Local IN 8**. Le second DPA a été marqué **Spare sur RIO IN 2** dans le projet préparé, d’après la précision de l’utilisateur. Les BUS de sortie et les envois restent des propositions à finaliser. La fiche demande une Yamaha DM7 / DM7 Compact. Cette préparation ne crée pas de fichier natif Yamaha.

## Nouveautés de la version 1.8

**Importer une fiche** récupère un patch depuis un PDF texte ou scanné, une image (PNG, JPEG, WebP, BMP, TIFF), un classeur Excel XLSX/XLS ou ODS, un CSV/TSV ou du texte collé. Tout se passe sur cet ordinateur, sans compte, API, téléchargement de modèle ou connexion Internet. L’OCR français / anglais et les lecteurs de fichiers sont fournis avec l’application.

Le bouton est accessible dans le show et dans **Mes shows**. L’assistant **Nouveau show → Les entrées → Depuis une fiche technique** reprend le nom, l’artiste, la date, le lieu et la console déjà saisis.

1. Choisissez le fichier ou collez le tableau. Pour Excel, la première feuille contenant un patch est sélectionnée ; cochez les autres feuilles nécessaires. Pour un PDF, seules les pages avec un patch audio sont cochées ; ajustez la sélection si nécessaire.
2. Choisissez **Créer un nouveau show** ou **Ajouter au show**, la console et les interfaces à utiliser pour les adresses absentes.
3. Corrigez directement les sources, numéros, modèles de micros / DI, modes, interfaces, ports, gain et 48 V dans l’aperçu. Décochez les lignes à exclure. Les suggestions de micros utilisent la bibliothèque locale ; les références inconnues restent des libellés libres.
4. Pour un tableau inhabituel, ouvrez **Régler la lecture des colonnes**, affectez les colonnes et indiquez la première ligne de données. Le texte extrait peut aussi être corrigé puis relu. Changer les pages, feuilles ou règles de lecture remplace les corrections de l’aperçu.
5. Vérifiez les **Affectations après import**. L’option **Adapter les numéros et les ports aux places libres**, active par défaut pour un ajout de tableau (sauf patch rédigé avec des ports physiques explicites), réaffecte le patch en tenant compte des voies, sorties et bus internes existants. Sans cette option, les numéros et adresses explicites sont conservés ; les adresses absentes utilisent les ports libres. Les paires stéréo et capacités M32 / WING sont contrôlées avant application.
6. Cliquez sur **Créer le show** ou **Ajouter le patch**. Les conflits bloquent l’import sans modifier le show. Un ajout est annulable avec le bouton Annuler de l’éditeur. Attendez **Enregistré en local** avant de fermer ou recharger la page.

Les références exactes reconnues appliquent les règles d’alimentation de la bibliothèque ; une indication explicite de 48 V reste prioritaire. Aucun rapprochement approximatif n’active le phantom. Le texte, les notes non comprises et les pages / feuilles retenues sont conservés dans le projet ChickenWing. Toutes les voies importées restent marquées à vérifier, mutées et avec le fader à −∞.

La lecture ne remplace pas une interprétation humaine des plans de scène ou des demandes en prose. Un scan flou, une alternative de micros ou une mise en page complexe peut demander des corrections. Limites : **35 Mo par fichier, 30 pages par PDF, 10 000 lignes par feuille**.

## Ajustement de la version 1.7.2

L’espacement du titre **DCA & Mute groups** est uniformisé, avec une typographie continue entre ses deux couleurs.

## Ajustements de la version 1.7.1

Le titre de l’onglet **DCA & Mute** conserve une couleur uniforme. Les commandes de mute à l’intérieur restent rouges. Les patchs d’entrées et de sorties affichent un badge rouge **MUTE** à côté du nom lorsque le mute de la tranche est activé ; le badge disparaît dès sa désactivation.

## Nouveautés de la version 1.7

Les **commandes de mute et les mute groups utilisent le rouge** : interrupteurs de voies et de bus, affectations dans la matrice, états de groupe, commandes des DCA, Main et retours FX. Les couleurs des voies et des affectations DCA restent indépendantes.

Le **48 V** dispose d’un badge compact **ON / OFF** dans le patch d’entrées et d’un interrupteur dédié dans l’inspecteur. Son état actif associe une bordure ambrée, une icône et un libellé explicite sur fond sombre. La source physique concernée reste visible. Une interface sans préampli contrôlable indique l’alimentation en amont et désactive la commande. Les règles d’alimentation et d’export sont conservées.

## Nouveautés de la version 1.6

**Midas M32** est disponible dans le wizard de création. L’interface suit ses capacités : 32 voies, 16 bus mono ou paires stéréo liées, Main LR / M/C, 6 matrices, 8 moteurs FX, 8 DCA et 6 mute groups. Les interfaces propres à la WING sont masquées sur un show M32. Le catalogue M32 contient 61 algorithmes avec leurs icônes et leurs restrictions de slots. Il propose les retours FX 1–4 et les inserts FX 1–8, y compris l’utilisation indépendante des deux côtés d’un moteur sur deux tranches mono.

L’export **Scène M32** produit un `.scn` pour M32-Edit et la console sur clé USB, avec le routage User In / User Out de la génération 4.x. Les projets ChickenWing et snapshots de préparation gardent la console choisie. Les paires stéréo sont comptées et déplacées ensemble ; les liaisons et réglages impossibles sur M32 sont refusés. Les fonctions WING et leurs exports `.snap` restent disponibles.

Un export téléchargé depuis l’interface a été chargé et réenregistré dans M32-Edit 4.3. Le routage, les préamplis, les envois et les groupes du fichier réenregistré ont été comparés à la préparation. Aucun essai sur une console M32 physique n’a été réalisé. Consultez [le guide M32](docs/M32.md) pour les capacités, les limites de routage, le parcours de transfert et les réglages à finaliser dans M32-Edit.

## Nouveautés de la version 1.5

Les **groupes de couleur sont indépendants des DCA**. Un nouveau show, la démo, les modèles de patch et les fiches techniques ne créent ni nom ni affectation DCA par défaut. Les 16 emplacements restent disponibles dans la matrice.

Dans le patch, choisissez un **Groupe de couleur** pour colorer une voie, puis **Convertir ce groupe en DCA** si vous souhaitez contrôler tout ce groupe. Le bouton **Groupes & DCA** et l’onglet **DCA & Mute** donnent aussi accès à cette configuration. Choisissez **Couleurs uniquement** ou **Couleurs + DCA**, un emplacement libre et le nom partagé. La conversion affecte les voies actuellement dans le groupe. La case **Inclure automatiquement les futures voies de ce groupe**, désactivée par défaut, permet d’y rattacher aussi les voies ajoutées ou déplacées dans ce groupe ensuite. Sans cette case, les nouvelles voies gardent uniquement la couleur jusqu’à une affectation explicite.

**DCA sur mesure** permet de sélectionner librement des voies, auxiliaires, bus, Main et matrices, avec une recherche et un compteur de sélection. Ces affectations restent indépendantes des couleurs. Les cases de la matrice, les affectations multiples et les mute groups restent disponibles. Cliquez sur l’en-tête d’un DCA pour le renommer, régler son niveau / mute / couleur ou **Libérer ce DCA**. Libérer retire toutes ses affectations et son lien éventuel avec un groupe, puis remet l’emplacement à zéro ; le bouton Annuler de l’éditeur permet de revenir en arrière.

Revenir à **Couleurs uniquement** retire seulement les affectations créées par la conversion. Les autres DCA et mute groups sont conservés. Le lien et l’option d’inclusion des futures voies sont conservés dans le projet ChickenWing et les snapshots de travail. Le `.snap` WING contient les noms, états et affectations effectives ; les règles de groupe propres à l’application nécessitent le projet JSON pour être retrouvées.

À l’ouverture des anciens projets, les liens automatiques de la version 1.3 sont désactivés. Les DCA générés, non personnalisés, sont retirés des voies gérées automatiquement et leurs emplacements sont libérés s’ils n’ont plus de membres. Les DCA renommés ou dont le niveau, la couleur ou le mute ont été personnalisés restent des DCA indépendants ; les affectations manuelles supplémentaires et les mute groups sont conservés.

## Nouveautés de la version 1.4

Le thème adopte une géométrie plus proche d’une interface de console : panneaux et commandes à angles presque droits, onglets rectangulaires avec repère ambre, en-têtes mieux délimités et contours plus contrastés. Les interrupteurs deviennent rectangulaires ; les voyants d’état conservent leur forme ronde. Le patch, le rack FX, les DCA, les catalogues et les fenêtres partagent ces mêmes règles visuelles. Le thème sombre, les couleurs des voies et les fonctions de préparation sont conservés.

## Nouveautés de la version 1.3

Historique : avant la version 1.5, les **groupes d’entrées et leurs DCA partageaient automatiquement le même nom**. Ce lien est maintenant facultatif, selon la configuration décrite ci-dessus. Le champ « Groupe / DCA » indique le nom et le numéro liés. Changer de groupe retire uniquement le DCA lié au groupe précédent, affecte le nouveau et conserve les DCA supplémentaires ainsi que les mute groups. Renommer ce DCA dans « DCA & Mute » met aussi à jour les libellés des voies, les listes de choix et les filtres. Les anciens groupes génériques de la démo sont nommés et ses catégories partagées sont séparées ; les noms de DCA déjà personnalisés sont conservés.

Le champ **Microphone / DI** devient une recherche rapide : suggestions pendant la frappe, informations de type, directivité et alimentation, sélection au clic ou avec les flèches puis Entrée. La sélection applique le modèle et son alimentation à la source physique. Échap annule la recherche ; quitter le champ sans choisir conserve le modèle actuel. Un libellé libre reste disponible explicitement pour les références absentes, avec alimentation manuelle. Le catalogue complet et les fiches détaillées restent accessibles.

Le **Samson C02** rejoint la base : petit statique cardioïde, 48 V requis, adapté notamment aux overheads, cymbales et instruments acoustiques. Il est vendu en paire appairée, avec un XLR par microphone. Caractéristiques vérifiées dans la [fiche et notice Samson](https://samsontech.com/products/microphones/condenser-microphones/c02/).

## Nouveautés de la version 1.2

**DCA & Mute** est un nouvel onglet du show. La matrice permet d’affecter chaque tranche à plusieurs des **16 DCA** et **8 mute groups**. Elle inclut les voies CH, les auxiliaires, les bus, les quatre Main et les matrices. Le filtre « Sources utilisées » peut être désactivé pour afficher les 76 tranches de la console. Les affectations en masse portent uniquement sur les lignes affichées. Cliquez sur un en-tête pour nommer un groupe, préparer son mute et, pour un DCA, son niveau et sa couleur. Ces états sont exportés dans le `.snap` ; les faders individuels restent indépendants. Les affectations suivent les déplacements logiques et les snapshots de travail.

**Micros & DI** contient **341 références de 31 marques**, utilisables hors ligne. La recherche accepte modèles, alias, marques et instruments ; les filtres portent sur la technologie, l’alimentation, l’usage et le contexte. Chaque fiche indique le type de transducteur, la directivité, l’alimentation, des usages expliqués, les précautions propres à la version et un lien fabricant. Les alternatives sont proposées par usage principal, dans d’autres marques, avec leurs différences de type, directivité et alimentation visibles.

Le tri **Popularité indicative**, ainsi que les tris live et studio, repose sur un **indice éditorial**, sans données de ventes ou mesure de parts de marché. Les usages et remplacements sont des conseils de préparation, pas une garantie d’équivalence acoustique. La base couvre de nombreuses références courantes et historiques ; elle ne prétend pas répertorier tous les microphones existants. « Ajouter une référence » complète votre bibliothèque locale. Une référence personnelle affectée à une voie voyage dans le projet JSON grâce à sa fiche embarquée ; les références personnelles non affectées restent dans ce navigateur.

Dans l’inspecteur d’une voie, **Choisir dans la base** ouvre la même bibliothèque. Choisir un modèle prépare automatiquement son **48 V sur la source physique**. Le choix s’applique aussi aux voies utilisant exactement la même source. Les DI actives à pile ou phantom offrent un choix d’alimentation ; les rubans passifs, les modèles à boîtier dédié et les capsules HF sont distingués des modèles à phantom. Le SM7dB peut être préparé en mode actif ou bypass ; le D12 VR en passif ou avec filtres actifs. Une capsule miniature sans adaptateur identifié et un micro hybride à sorties séparées restent signalés à vérifier. Une source USB, AES/EBU ou autre interface sans commande de phantom indique le besoin d’une alimentation en amont. Les microphones stéréo demandent de compléter le câblage des deux canaux ; le modèle choisi ne réalloue pas le patch.

Le bouton 48 V reste disponible en manuel. Les modèles de patchs et les imports appliquent aussi le 48 V des références reconnues exactement ; une indication 48 V explicite de la fiche reste prioritaire. Une saisie libre du nom d’un micro ne déclenche aucune supposition : la fiche reconnue propose « Appliquer le 48 V conseillé ». Les shows déjà enregistrés gardent leur état de phantom jusqu’à un choix explicite. L’application prépare le fichier ; elle ne commande pas une console connectée. Les sources et règles de la base sont décrites dans [docs/MICROPHONES.md](docs/MICROPHONES.md).

## Nouveautés de la version 1.1

La démo s’appelle **Sourd Agency - Live Session**, avec **Michel Jason**, le **13 décembre 2012** à **Dans la haie - Blois**. Le bouton **Réinitialiser** propose de restaurer son patch d’origine ou de vider complètement voies, sorties, effets et snapshots. Le patch vierge conserve l’identité et le modèle de console actuels. La remise à zéro est annulable, et un show vide peut exporter une base neutre. Le rappel d’un snapshot conserve l’identité actuelle de la prestation.

**Ajouter une voie / une sortie** ouvre un assistant d’insertion : nom, numéro logique, format, interface et première adresse physique. Deux cases indépendantes permettent de décaler les numéros suivants et les adresses physiques suivantes. Une prévisualisation affiche chaque déplacement. Les paires d’entrées stéréo/M/S restent alignées sur une entrée impaire. Les numéros de bus, les envois et les destinations FX suivent leur source lors d’un déplacement.

**Renuméroter** permet de modifier les numéros logiques ou les adresses physiques, sur l’ensemble de la sélection ou à partir d’un numéro. Pour les sorties, les numéros BUS, MAIN et MTX restent des familles distinctes ; les ports physiques peuvent être traités toutes familles confondues. Le déplacement physique permet de choisir l’interface actuelle et l’interface de destination. Les conflits et dépassements de capacité sont présentés avant application ; aucune modification partielle n’est appliquée.

Le wizard peut ajouter des **bus de groupe**, des **bus d’effets** et des **bus libres**, sans sortie physique. Retours et bus internes se partagent les 16 bus WING. Le panneau **Bus & Main**, dans Routing & envois, permet de les nommer et de modifier leur format, niveau et mute. Les quatre Main sont accessibles, même sans sortie physique.

La matrice expose les **voies et bus en sources**, les **bus et Main en destinations**. Le mode **Application rapide** applique, en un clic, le niveau, l’activation et le point de prélèvement définis dans la barre d’outils. Un double-clic ouvre les paramètres détaillés sans appliquer le preset. Sans mode rapide, un clic ouvre les détails. Le mode GRP concerne les voies vers les bus ; les bus et Main utilisent des envois pré/post-fader. Un bus ne peut pas s’envoyer vers lui-même.

Le rack propose les **65 entrées du catalogue WING documenté**, avec pictogrammes et recherche, réparties en FX 1–8, STD et CH. Les effets FX 1–8 nécessitent un slot 1–8 ; STD et CH sont disponibles sur les 16 slots. Les modèles incompatibles sont grisés. « Aucun effet » libère le slot. Le catalogue a été comparé à la liste de la [documentation WING Remote Protocols 3.1.0, page 67](https://cdn-media.empowertribe.com/2106004e217b8eb2639d93672823eef5/WING_Remote-Protocols-3.1-03.pdf). Les paramètres détaillés des algorithmes se règlent dans WING-Edit ; ceux du modèle importé sont conservés s’il reste identique.

## Préparer une prestation

1. Créez un show avec l’assistant : identité, modèle de console, patch vierge ou modèle, wedges, IEM et Main LR.
2. Importez une fiche PDF, une image, un classeur Excel/ODS, un CSV/TSV ou un texte. L’aperçu permet de choisir les pages / feuilles, régler les colonnes et corriger les lignes. Créez un show depuis le fichier ou ajoutez le patch au show en cours.
3. Complétez les voies : numéro de voie, nom, micro, groupe, source et entrée physique, format mono/stéréo/M/S, 48 V, gain, coupe-bas, DCA, pan, fader, mute et assignation Main 1.
4. Préparez vos sorties depuis BUS, MAIN ou MTX vers les ports locaux, AES50 A/B/C, USB, StageConnect ou les cartes.
5. Réglez les envois de chaque voie vers les bus, avec niveau et point de prélèvement. Placez vos effets dans les inserts des voies, bus, mains ou matrices.
6. Capturez des snapshots de travail. Exportez le .snap correspondant à chaque état souhaité.

La lecture des documents est déterministe et utilise un OCR local pour les images et PDF scannés. Elle n’interprète pas le sens d’une fiche comme une IA. Les tableaux structurés donnent les meilleurs résultats. Les mises en page complexes, colonnes fusionnées, demandes en prose et plans de scène nécessitent une vérification manuelle. Les documents sont limités à 35 Mo et les PDF à 30 pages.

### Colonnes d’entrée reconnues

Exemple à enregistrer en CSV avec point-virgule :

```csv
CH;Source;Micro;Mode;Banque;Entrée;48V;Gain
1;Kick In;Beta91;M;A;1;oui;0
2;Snare Top;SM57;M;A;2;non;0
3;Keys;DI stéréo;ST;B;3;non;0
```

Une section de sorties peut avoir les colonnes `Bus;Nom;Mode;Sortie`. Exemple : `1;IEM Lead;ST;AES50 B 9`.

Les valeurs absentes utilisent des propositions explicites : mono, interface choisie dans l’aperçu (AES50 A par défaut), premier port libre adapté au format, gain 0 dB et 48 V désactivé sauf référence exacte reconnue. Les voies importées restent marquées à vérifier. Les annotations non comprises sont conservées dans le projet.

## Export WING

Le format généré est **snapshot.11**, à partir de la structure d’un fichier réellement enregistré par WING-Edit 3.3.3. Une base neutre est fournie. Les sources stéréo et M/S occupent une paire physique impaire/paire, sur une seule voie de mixage. Les bus stéréo occupent un seul bus et utilisent deux sorties physiques ; le routage interne utilise les indices gauche/droite `2n−1` et `2n`.

Un fichier `.snap` importé devient un nouveau show et son snapshot de référence. L’export conserve ses sections non gérées, notamment EQ, dynamiques, surface et algorithmes d’effets non exposés. Les paramètres modifiés dans l’éditeur remplacent les champs correspondants. Les anciens routages ou inserts gérés sont libérés en cas de déplacement ou suppression. Les sorties supplémentaires qui dupliquent un même bus restent conservées dans la référence ; une seule affectation de ce bus est éditable dans l’interface.

La palette WING est indexée ; les couleurs de l’interface servent au classement et peuvent différer de celles affichées sur la console. Les noms WING sont limités à 16 caractères. Les slots FX 1–8 acceptent les algorithmes premium proposés ; 9–16 sont réservés aux effets standard compatibles. Les paramètres détaillés des effets se règlent dans WING-Edit ; un changement d’algorithme utilise ses valeurs par défaut. Les alimentations fantômes et gains s’appliquent aux sources physiques. Deux voies peuvent partager une source si leurs paramètres physiques concordent.

**Les exports ne constituent pas des fichiers `.show`.** Le projet ChickenWing gère plusieurs états et exporte chaque snapshot séparément. Les nouvelles voies et sorties sont mutées, avec les faders à −∞. Un snapshot de référence conserve ses niveaux et états existants.

Ouvrez le fichier avec le bouton **LOAD** de WING-Edit pour vérifier le patch et les inserts. Vous pouvez ensuite l’enregistrer et le copier sur clé USB pour le rappeler depuis la console. La validation sur console physique et la vérification sonore restent à effectuer. Aucun pilotage réseau de console n’est implémenté.

Références : [documentation OSC officielle WING](https://mediadl.musictribe.com/download/software/behringer/WING/BE-P0BV2-WING-OSC-Documentation.pdf), [WING Remote Protocols de Patrick-Gilles Maillot](https://www.z80ne.com/behringer/docs/WING%20Remote%20Protocols.pdf).

## Vérification et développement

Le moteur et l’interface sont des modules JavaScript natifs, sans compilation. Les tests portent sur le routage et le contrat des exports, pas seulement sur le rendu.

```sh
node --test tests/*.test.js
python3 server.py
```

Les tests couvrent les paires stéréo/M/S, les indices gauche/droite des bus, les conflits, les capacités physiques, les insertions FX, la conservation des paramètres d’un snapshot importé et la lecture de patchs. Les fichiers synthétiques de `tests/fixtures` servent aux vérifications réelles des imports PDF, Excel et image OCR. Le test `tests/browser-import.mjs` vérifie la lecture, la création M32, l’édition, les feuilles, le mapping, l’ajout / annulation, la persistance, l’assistant et le rendu mobile dans un profil Chrome isolé, en bloquant toute requête externe. Il nécessite Playwright et Chrome déjà installés :

```sh
# Dans un second terminal, après python3 server.py
node tests/browser-import.mjs
# Si Playwright est fourni dans un autre dossier :
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/browser-import.mjs
```

Les captures des vérifications sont placées dans `output/playwright/` (ignoré par Git).

Technologies incluses : [PDF.js](https://github.com/mozilla/pdf.js) (Apache-2.0), [SheetJS CE](https://git.sheetjs.com/sheetjs/sheetjs) (Apache-2.0), [Tesseract.js](https://github.com/naptha/tesseract.js) (Apache-2.0), Tesseract.js-core et modèles OCR français/anglais. Les notices des bibliothèques sont fournies avec les ressources locales. ChickenWing est un outil indépendant, sans affiliation avec Behringer ou Music Tribe.
