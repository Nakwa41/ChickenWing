# Bibliothèque microphones et DI

Base locale 2026.10 : **341 références, 31 marques**. Les versions XLR, HF, miniatures, à pile ou à boîtier dédié sont distinguées lorsqu’elles impliquent une alimentation différente. Certaines références historiques restent utilisées ; leur présence ne signifie pas qu’elles sont encore commercialisées.

Les sources ci-dessous sont des notices, fiches et catalogues des fabricants. Plusieurs fiches utilisent un catalogue de gamme ou un centre de documentation, plutôt qu’une notice individuelle. Les conseils d’usage, alternatives et indices de popularité sont éditoriaux. La recherche et les fiches fonctionnent hors ligne ; ouvrir un lien fabricant demande une connexion Internet.

## Automatisation du 48 V

- Choisir explicitement un modèle applique sa politique sur LCL / AES50 A, B ou C, ainsi qu’aux voies partageant cette même source et ce même format.
- Les imports reconnaissent les noms et les alias du catalogue (par exemple B52, B58 ou B91). Ils préparent le 48 V prévu par la fiche du modèle ; une valeur 48 V explicite du document reste prioritaire.
- Pour l’ensemble du catalogue, l’import peut aussi retrouver un modèle unique à partir d’une marque abrégée, d’un code incomplet ou d’une petite faute de frappe. Il garde le libellé d’origine dans l’aperçu et affiche le nom du modèle proposé. Le 48 V reste manuel jusqu’à confirmation du modèle. Les cas ambigus, comme B87 ou C414, et les alternatives restent des libellés libres. Les voies importées restent marquées à vérifier.
- Un modèle passif coupe le 48 V ; un modèle nécessitant le phantom l’active. Les dynamiques actifs et rubans actifs ont des politiques distinctes.
- Les modèles à pile ou phantom proposent les deux choix. Le D12 VR est passif par défaut ; ses filtres actifs demandent un choix explicite. Le SM7dB propose préampli actif ou bypass.
- Les modèles à alimentation dédiée, capsules HF et miniatures sans adaptateur identifié ne déclenchent pas le phantom. Un hybride à sorties séparées demande de configurer chaque élément séparément.
- Les interfaces sans commande de préampli gardent le 48 V désactivé et signalent le besoin en amont. Le câblage des deux canaux d’un microphone stéréo reste à préparer.
- Modifier manuellement le 48 V conserve une dérogation manuelle. Une saisie libre ne devine pas un modèle. Les shows existants gardent leur état jusqu’à un choix explicite.

Le fichier exporté contient la préparation du phantom ; ChickenWing n’envoie aucune commande à une console connectée.

## Classement et alternatives

Les scores de 1 à 100 sont une appréciation éditoriale de la familiarité des références en live et en studio. Ce ne sont ni des chiffres de vente, ni des parts de marché, ni un classement mesuré. Les tris live et studio pondèrent cet indice selon les usages renseignés. Aucune télémétrie n’est collectée.

Les alternatives sont choisies dans les autres marques pour le même usage principal, puis classées selon cet indice. Leurs différences de technologie, directivité et alimentation sont affichées. Une alternative d’usage ne garantit pas une réponse sonore, une connectique ou un résultat identiques. Vérifier aussi fixation, adaptateur et câblage.

## Compléter la base

Le champ de la voie propose une recherche rapide avec sélection au clic ou au clavier. Une saisie partielle ne change pas le modèle actuel. Le C02 de Samson est documenté comme statique cardioïde à phantom 48 V, avec un connecteur XLR par microphone de la paire.

« Ajouter une référence » conserve un modèle personnel dans ce navigateur. La vérification de l’alimentation est demandée avant son utilisation automatique. La fiche d’un modèle affecté est embarquée dans le projet ChickenWing ; les références personnelles non affectées restent dans ce navigateur. Leur classement de popularité reste non renseigné.

La source maintenable est `src/microphones.js`. Le fichier `docs/microphones.csv` présente toutes les références livrées avec leurs caractéristiques et liens.

## Sources fabricant

- [Guides et fiches Shure](https://www.shure.com/en-US/support/downloads)
- [Shure · guide SM58](https://www.shure.com/en-US/docs/guide/SM58)
- [Shure · guide SM7dB](https://www.shure.com/en-US/docs/guide/SM7dB)
- [Sennheiser · notices evolution wired](https://docs.cloud.sennheiser.com/en-us/evolution-wired/)
- [Sennheiser · microphones](https://www.sennheiser.com/en-gb/product-families/microphones-evolution)
- [Sennheiser · MKH 416](https://docs.cloud.sennheiser.com/en-us/mkh-416-mkh-418-s/info-mkh-416.html)
- [Neumann · microphones et capsules](https://www.neumann.com/en-us/products/microphones)
- [AKG · microphones et notices](https://www.akg.com/microphones)
- [AKG · D12 VR](https://www.akg.com/D12VR.html)
- [AKG · notice C414 XLS / XLII](https://at.akg.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwaabcd3f2/pdfs/AKG_C414XLS_C414XLII_Manual.pdf)
- [beyerdynamic · série M](https://north-america.beyerdynamic.com/m-series-facelift)
- [Audio-Technica · catalogue professionnel](https://docs.audio-technica.com/us/Vol2.Microfonos-Pro_2024_abril.pdf)
- [Audix · catalogue fabricant](https://static.videndummediasolutions.com/media/external/audix/AUDIX_catalogue_2024-10-WEB.pdf)
- [DPA · catalogue microphones](https://www.dpamicrophones.com/microphones/)
- [Schoeps · notice CMC / MK](https://schoeps.de/fileadmin/user_upload/user_upload/Downloads/Bedienungsanleitungen/SCHOEPS_Manual_CMC_MK_E_2015-10-03_1444311033__1_.pdf)
- [RØDE · support alimentation phantom](https://help.rode.com/hc/en-us/articles/15907826499983-Which-R%C3%98DE-Products-Support-48V-Phantom-Power-for-Condenser-Microphones)
- [RØDE · fiche NT5](https://edge.rode.com/pdf/page/336/modules/4244/NT5_SS_Datasheet_04.pdf)
- [RØDE · NT3](https://rode.com/en-us/products/nt3)
- [LEWITT · catalogue fabricant](https://www.lewitt-audio.com/download/product-catalogue)
- [sE Electronics · documentation et alimentation](https://seelectronics.com/faq/)
- [sE · notice VR1 / VR2](https://seelectronics.com/wp-content/uploads/2021/11/VR1VR2UserManual.pdf)
- [sE · notice V KICK / V BEAT](https://seelectronics.com/wp-content/uploads/2021/11/VKICK-VBEAT-VCLAMPUserManualv8.pdf)
- [Austrian Audio · microphones](https://austrian.audio/microphones/)
- [Austrian Audio · OD505](https://austrian.audio/product/od505/)
- [Earthworks · guides et fiches](https://earthworksaudio.com/support/user-guides/)
- [Earthworks · SR117](https://earthworksaudio.com/wp-content/uploads/2023/03/SR117-Quickstart-Guide-1.pdf)
- [TELEFUNKEN · documentation](https://www.telefunken-elektroakustik.com/documents/)
- [Royer · R-121 et R-122 MKII](https://royerlabs.com/faq/what-is-the-difference-between-the-r-121-and-the-r-122-mkii/)
- [AEA · alimentation des rubans actifs](https://aearibbonmics.com/support/troubleshooting-aea-products/)
- [AEA · notice série R84](https://www.aearibbonmics.com/wp-content/uploads/2018/01/AEA-R84-Series-OwnersManual-January2018.pdf)
- [Radial · DI](https://www.radialeng.com/product_category/direct-box)
- [Radial · J48](https://www.radialeng.com/product/j48)
- [BSS · AR-133](https://bssaudio.com/en-US/products/ar-133.html)
- [Countryman · notice Type 85](https://www.countryman.com/wp-content/uploads/2017/07/type_85_di_box_datasheet.pdf)
- [Rupert Neve Designs · RNDI](https://rupertneve.com/products/rndi/)
- [Behringer · documentation produits](https://www.behringer.com/downloads.html)
- [Klark Teknik · documentation produits](https://www.klarkteknik.com/downloads.html)
- [Palmer · DI boxes](https://www.palmer-germany.com/en/products/di-boxes/)
- [Whirlwind · IMP 2](https://www.whirlwindusa.com/products/black-boxes-effects-and-dis-direct-boxes-imp-2)
- [Avalon · U5](https://www.avalondesign.com/instrudi.html)
- [Samson · C02, caractéristiques et notice](https://samsontech.com/products/microphones/condenser-microphones/c02/)
- [Electro-Voice · catalogue microphones](https://products.electrovoice.com/binary/EV_MicrophoneCatalog_EMEA_March2024_v3_WEB_LR.pdf)
- [Heil Sound · PR 40](https://heilsound.com/product/pr-40/)
- [Sony · fiche C-80](https://pro.sony/en_HR/pdf/c-80)
- [Sanken · COS-11D, variantes et alimentation](https://www.sankenmicrophones.com/production/lavalier/cos-11d/)
