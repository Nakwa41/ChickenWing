// Offline editorial catalogue. Scores describe familiarity, not measured sales.
export const CATALOG_VERSION='2026.10';
export const normalizeMic=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ø/g,'o').replace(/\+/g,'plus').replace(/[^a-z0-9]/g,'');
export const TYPES={d:'Dynamique',da:'Dynamique actif',c:'Statique',t:'Statique à lampe',r:'Ruban passif',a:'Ruban actif',h:'Hybride dynamique / statique',di:'DI active',dp:'DI passive'};
export const PATTERNS={card:'Cardioïde',super:'Supercardioïde',hyper:'Hypercardioïde',wide:'Cardioïde large',omni:'Omnidirectionnel',eight:'Bidirectionnel · figure en 8',multi:'Directivités commutables',shotgun:'Supercardioïde / lobaire',xy:'Stéréo X/Y cardioïde',ms:'Stéréo M/S',na:'Sans objet · signal direct'};
export const POWER={required:{label:'48 V requis',on:true,tone:'green',text:'Alimentation phantom requise sur la connexion XLR de cette version.'},none:{label:'Sans 48 V',on:false,tone:'neutral',text:'Fonctionnement passif : aucune alimentation phantom nécessaire.'},battery:{label:'48 V ou pile',on:true,tone:'green',text:'Phantom ou pile interne. Le mode automatique choisit le phantom ; choisissez « Pile » si vous utilisez la pile.'},optional:{label:'48 V optionnel',on:false,tone:'amber',text:'Le 48 V active une fonction supplémentaire. Le fonctionnement passif reste le choix par défaut.'},external:{label:'Boîtier dédié',on:false,tone:'amber',text:'Utiliser l’alimentation dédiée du fabricant. L’entrée console reçoit sa sortie audio, sans phantom.'},adapter:{label:'Adaptateur à vérifier',on:false,tone:'amber',text:'La capsule reçoit une basse tension via son adaptateur ou son émetteur. Ne pas appliquer directement 48 V. Sélectionner la version XLR complète si elle est disponible.'},wireless:{label:'Émetteur HF',on:false,tone:'neutral',text:'Capsule alimentée par son émetteur. La sortie du récepteur ne nécessite pas le 48 V de la console.'},split:{label:'Deux sorties à vérifier',on:false,tone:'amber',text:'Sorties séparées : le phantom concerne seulement la partie statique. Configurer les deux entrées séparément, selon la notice.'}};
export const USES={
 vocal:{label:'Voix live',why:'La prise de proximité isole la voix et limite la repisse. La directivité et le placement du retour comptent autant que le modèle.',contexts:['Live'],tags:['chant','voix','chœurs','scene','wedge']},
 studio:{label:'Voix studio',why:'La sensibilité et la définition facilitent la capture des nuances. Prévoir une suspension, un antipop et une pièce adaptée.',contexts:['Studio'],tags:['chant','voix','doublage','narration','podcast']},
 broadcast:{label:'Parole / broadcast',why:'La prise rapprochée privilégie l’intelligibilité et réduit le son de la pièce. Un préampli avec suffisamment de gain est utile pour les modèles passifs peu sensibles.',contexts:['Live','Studio'],tags:['parole','podcast','radio','streaming','voix']},
 snare:{label:'Caisse claire / percussions',why:'La reprise proche met en avant l’attaque et sépare les éléments du kit. Vérifier l’angle, la repisse du charley et le niveau admissible.',contexts:['Live','Studio'],tags:['batterie','snare','caisse claire','percussions']},
 tom:{label:'Toms / percussions',why:'La reprise proche apporte impact et lisibilité dans le bas médium. Le placement près du cercle et l’orientation déterminent attaque et résonance.',contexts:['Live','Studio'],tags:['batterie','tom','conga','percussions']},
 kick:{label:'Grosse caisse / grave',why:'Le gabarit et la réponse sont adaptés aux sources graves à fort niveau. À l’intérieur on privilégie l’attaque ; à l’extérieur, le corps et la résonance.',contexts:['Live','Studio'],tags:['batterie','kick','grosse caisse','ampli basse','tuba']},
 amp:{label:'Ampli guitare',why:'La proximité donne une bonne séparation et supporte les niveaux d’un haut-parleur. Déplacer du centre vers le bord du cône réduit souvent la brillance.',contexts:['Live','Studio'],tags:['guitare','ampli','electric','cuivres','saxophone']},
 pencil:{label:'Acoustique / overhead',why:'La petite membrane restitue les transitoires et les détails. Utile sur cymbales, guitare acoustique, piano et cordes ; contrôler phase et repisse en paire.',contexts:['Live','Studio'],tags:['overhead','charley','hi hat','guitare acoustique','piano','cordes','percussions','orchestre']},
 large:{label:'Studio polyvalent',why:'La grande membrane convient aux voix et aux instruments acoustiques. La distance, la directivité disponible et l’acoustique de la pièce façonnent fortement le résultat.',contexts:['Studio','Live'],tags:['voix','piano','guitare acoustique','overhead','cordes','cuivres']},
 ribbon:{label:'Ampli / cuivres / ambiance',why:'Le ruban peut adoucir les sources brillantes et restituer le corps des amplis ou des cuivres. Éviter les souffles d’air directs ; orienter les lobes et les zones de rejet.',contexts:['Studio','Live'],tags:['guitare','ampli','cuivres','cordes','overhead','room','ambiance']},
 clip:{label:'Instrument sur pince',why:'Le montage proche suit les mouvements de l’instrument et stabilise la distance de reprise. Contrôler la fixation, la repisse et la compatibilité de l’adaptateur.',contexts:['Live','Studio'],tags:['saxophone','cuivres','violon','violoncelle','cordes','accordeon','percussions']},
 lav:{label:'Cravate / serre-tête',why:'Le placement près de la bouche maintient un niveau régulier quand la personne bouge. Soigner les frottements, le souffle et la compatibilité avec l’émetteur ou l’adaptateur.',contexts:['Live','Studio'],tags:['theatre','conference','parole','cravate','serre tete','costume']},
 shotgun:{label:'Perche / prise de son',why:'Le tube à interférences resserre la captation dans l’aigu. Utile en perche ou en extérieur ; une pièce réfléchissante peut colorer les sons hors axe.',contexts:['Studio','Live'],tags:['cinema','perche','dialogue','tournage','exterieur']},
 omni:{label:'Ambiance / classique',why:'L’omnidirectionnel capte la pièce et les graves sans effet de proximité marqué. Il convient aux ensembles, au piano et aux ambiances dans une acoustique favorable.',contexts:['Studio','Live'],tags:['orchestre','classique','piano','room','ambiance','cordes']},
 measurement:{label:'Mesure acoustique',why:'La réponse de mesure sert à analyser le système et la salle. Utiliser le fichier de calibration propre au microphone lorsqu’il existe.',contexts:['Live','Studio'],tags:['mesure','calibration','systeme','smaart','rew']},
 di:{label:'Basse / guitare / claviers en direct',why:'La DI adapte l’impédance et symétrise le signal pour le transport vers le préampli. Vérifier le niveau, le pad et l’impédance requise par un capteur passif ou piézo.',contexts:['Live','Studio'],tags:['basse','guitare','clavier','synth','playback','di','piezo']},
 boundary:{label:'Surface / grosse caisse / parole',why:'La capsule près d’une surface limite les réflexions très courtes entre la surface et le microphone. Le placement et la forme de la surface influencent le résultat.',contexts:['Live','Studio'],tags:['kick','grosse caisse','piano','conference','theatre','surface']}
};
export const SOURCES={
 shure:['Guides et fiches Shure','https://www.shure.com/en-US/support/downloads'],sm58:['Shure · guide SM58','https://www.shure.com/en-US/docs/guide/SM58'],sm7db:['Shure · guide SM7dB','https://www.shure.com/en-US/docs/guide/SM7dB'],
 senn:['Sennheiser · notices evolution wired','https://docs.cloud.sennheiser.com/en-us/evolution-wired/'],senncat:['Sennheiser · microphones','https://www.sennheiser.com/en-gb/product-families/microphones-evolution'],mkh:['Sennheiser · MKH 416','https://docs.cloud.sennheiser.com/en-us/mkh-416-mkh-418-s/info-mkh-416.html'],
 neumann:['Neumann · microphones et capsules','https://www.neumann.com/en-us/products/microphones'],akg:['AKG · microphones et notices','https://www.akg.com/microphones'],d12:['AKG · D12 VR','https://www.akg.com/D12VR.html'],c414:['AKG · notice C414 XLS / XLII','https://at.akg.com/on/demandware.static/-/Sites-masterCatalog_Harman/default/dwaabcd3f2/pdfs/AKG_C414XLS_C414XLII_Manual.pdf'],
 beyer:['beyerdynamic · série M','https://north-america.beyerdynamic.com/m-series-facelift'],at:['Audio-Technica · catalogue professionnel','https://docs.audio-technica.com/us/Vol2.Microfonos-Pro_2024_abril.pdf'],audix:['Audix · catalogue fabricant','https://static.videndummediasolutions.com/media/external/audix/AUDIX_catalogue_2024-10-WEB.pdf'],dpa:['DPA · catalogue microphones','https://www.dpamicrophones.com/microphones/'],
 schoeps:['Schoeps · notice CMC / MK','https://schoeps.de/fileadmin/user_upload/user_upload/Downloads/Bedienungsanleitungen/SCHOEPS_Manual_CMC_MK_E_2015-10-03_1444311033__1_.pdf'],rode:['RØDE · support alimentation phantom','https://help.rode.com/hc/en-us/articles/15907826499983-Which-R%C3%98DE-Products-Support-48V-Phantom-Power-for-Condenser-Microphones'],nt5:['RØDE · fiche NT5','https://edge.rode.com/pdf/page/336/modules/4244/NT5_SS_Datasheet_04.pdf'],nt3:['RØDE · NT3','https://rode.com/en-us/products/nt3'],
 lewitt:['LEWITT · catalogue fabricant','https://www.lewitt-audio.com/download/product-catalogue'],se:['sE Electronics · documentation et alimentation','https://seelectronics.com/faq/'],seribbon:['sE · notice VR1 / VR2','https://seelectronics.com/wp-content/uploads/2021/11/VR1VR2UserManual.pdf'],sedrums:['sE · notice V KICK / V BEAT','https://seelectronics.com/wp-content/uploads/2021/11/VKICK-VBEAT-VCLAMPUserManualv8.pdf'],
 austrian:['Austrian Audio · microphones','https://austrian.audio/microphones/'],od505:['Austrian Audio · OD505','https://austrian.audio/product/od505/'],earth:['Earthworks · guides et fiches','https://earthworksaudio.com/support/user-guides/'],sr117:['Earthworks · SR117','https://earthworksaudio.com/wp-content/uploads/2023/03/SR117-Quickstart-Guide-1.pdf'],tele:['TELEFUNKEN · documentation','https://www.telefunken-elektroakustik.com/documents/'],royer:['Royer · R-121 et R-122 MKII','https://royerlabs.com/faq/what-is-the-difference-between-the-r-121-and-the-r-122-mkii/'],aea:['AEA · alimentation des rubans actifs','https://aearibbonmics.com/support/troubleshooting-aea-products/'],aear84:['AEA · notice série R84','https://www.aearibbonmics.com/wp-content/uploads/2018/01/AEA-R84-Series-OwnersManual-January2018.pdf'],
 radial:['Radial · DI','https://www.radialeng.com/product_category/direct-box'],j48:['Radial · J48','https://www.radialeng.com/product/j48'],bss:['BSS · AR-133','https://bssaudio.com/en-US/products/ar-133.html'],country:['Countryman · notice Type 85','https://www.countryman.com/wp-content/uploads/2017/07/type_85_di_box_datasheet.pdf'],neve:['Rupert Neve Designs · RNDI','https://rupertneve.com/products/rndi/'],behringer:['Behringer · documentation produits','https://www.behringer.com/downloads.html'],klark:['Klark Teknik · documentation produits','https://www.klarkteknik.com/downloads.html'],palmer:['Palmer · DI boxes','https://www.palmer-germany.com/en/products/di-boxes/'],whirlwind:['Whirlwind · IMP 2','https://www.whirlwindusa.com/products/black-boxes-effects-and-dis-direct-boxes-imp-2'],avalon:['Avalon · U5','https://www.avalondesign.com/instrudi.html']
};
Object.assign(SOURCES,{
 samson:['Samson · C02, caractéristiques et notice','https://samsontech.com/products/microphones/condenser-microphones/c02/'],
 ev:['Electro-Voice · catalogue microphones','https://products.electrovoice.com/binary/EV_MicrophoneCatalog_EMEA_March2024_v3_WEB_LR.pdf'],
 heil:['Heil Sound · PR 40','https://heilsound.com/product/pr-40/'],
 sony:['Sony · fiche C-80','https://pro.sony/en_HR/pdf/c-80'],
 sanken:['Sanken · COS-11D, variantes et alimentation','https://www.sankenmicrophones.com/production/lavalier/cos-11d/']
});
const entries=[];
function add(brand,source,rows){for(const line of rows.trim().split('\n')){const [model,type,pattern,power,family,rank,note='',aliases='',ref='']=line.split('|');entries.push({id:normalizeMic(brand+' '+model),brand,model,type,pattern,power,families:family.split(','),rank:Number(rank),note,aliases:aliases.split(',').filter(Boolean),source:ref||source,connector:power==='adapter'?'Miniature / adaptateur':power==='wireless'?'Capsule HF':power==='split'?'2 sorties audio':power==='external'?'Alimentation dédiée → XLR':'XLR',channels:['xy','ms'].includes(pattern)?2:1});}}
add('Shure','shure',`
SM57|d|card|none|snare,amp|100|Référence de proximité pour caisse claire et ampli guitare.|SM 57
SM58|d|card|none|vocal,broadcast|100|Cardioïde : placer le wedge vers l’arrière du micro.|SM 58|sm58
SM7B|d|card|none|broadcast,studio|96|Prévoir du gain propre ; le microphone seul ne demande pas de phantom.|SM7
SM7dB|da|card|required|broadcast,studio|86|48 V pour le préampli intégré ; le mode bypass fonctionne sans phantom.||sm7db
SM48|d|card|none|vocal|63
SM86|c|card|required|vocal|74
SM87A|c|super|required|vocal|67
SM81|c|card|required|pencil|89
SM94|c|card|battery|pencil|56|Phantom ou pile interne.
BETA 52A|d|super|none|kick|97||Beta52,B52,B52A
BETA 56A|d|super|none|tom,snare|82||Beta56,B56,B56A
BETA 57A|d|super|none|snare,amp,vocal|85||Beta57,B57,B57A
BETA 58A|d|super|none|vocal|97|Supercardioïde : éviter de placer le retour exactement dans le lobe arrière.|Beta58,B58,B58A
BETA 87A|c|super|required|vocal|88||B87A
BETA 87C|c|card|required|vocal|76||B87C
BETA 91A|c|card|required|kick,boundary|96|Directivité demi-cardioïde sur une surface ; préampli intégré.|Beta91,B91,B91A
BETA 98H/C|c|card|required|clip|84|Version filaire avec préampli XLR ; la version WB98H/C HF est différente.|Beta98HC
BETA 181/C|c|card|required|pencil,snare|66|Corps BETA 181 avec capsule cardioïde.
KSM8|d|card|none|vocal|83|Double diaphragme dynamique, pas un statique.
KSM9|c|multi|required|vocal|85|Cardioïde ou supercardioïde.
KSM9HS|c|multi|required|vocal|65|Subcardioïde ou hypercardioïde.
KSM32|c|card|required|large|82
KSM44A|c|multi|required|large|74|Omni, cardioïde ou figure en 8.
KSM137|c|card|required|pencil|72
KSM141|c|multi|required|pencil,omni|68|Cardioïde ou omnidirectionnel.
KSM313/NE|r|eight|none|ribbon|62|Ruban passif ; les deux faces ont des caractères différents.|KSM313
KSM353/ED|r|eight|none|ribbon|57|Ruban passif.|KSM353
PGA57|d|card|none|snare,amp|59
PGA58|d|card|none|vocal|66
PGA52|d|card|none|kick|57
PGA56|d|card|none|tom|54
PGA81|c|card|required|pencil|61
MX412/C|c|card|required|broadcast|62|Version col de cygne XLR avec préampli ; capsule /C cardioïde.
MX418/C|c|card|required|broadcast|62|Version col de cygne XLR avec préampli ; capsule /C cardioïde.
`);
add('Sennheiser','senn',`
e 835|d|card|none|vocal|93||e835
e 845|d|super|none|vocal|79||e845
e 865|c|super|required|vocal|77||e865
e 935|d|card|none|vocal|94||e935
e 945|d|super|none|vocal|92||e945
e 965|c|multi|required|vocal|80|Cardioïde ou supercardioïde.|e965
e 602-II|d|card|none|kick|86||e602,e602II
e 604|d|card|none|tom,snare|94||e604
e 609 silver|d|super|none|amp|90||e609
e 608|d|super|none|clip,tom|62||e608
e 614|c|super|required|pencil|69||e614
e 901|c|card|required|kick,boundary|90|Demi-cardioïde, microphone de surface.|e901
e 902|d|card|none|kick|83||e902
e 904|d|card|none|tom,snare|93||e904
e 906|d|super|none|amp|95|Trois positions de filtre de présence ; capsule dynamique supercardioïde.|e906
e 908 B + MZA 900 P|c|card|required|clip|69|Version XLR avec adaptateur MZA 900 P ; la capsule ew seule est différente.|e908B XLR
e 914|c|card|required|pencil|81||e914
MD 421-II|d|card|none|tom,amp,kick|96|Filtre de grave commutable ; distinguer les anciennes variantes de connectique.|MD421,MD421II,MD 421
MD 441-U|d|super|none|amp,vocal,snare|89|Supercardioïde avec filtres commutables.|MD441,MD441U
MD 435|d|card|none|vocal|72||MD435
MD 445|d|super|none|vocal|70||MD445
MK 4|c|card|required|large|68||MK4
MK 8|c|multi|required|large|61|Omni, cardioïde large, cardioïde, supercardioïde et figure en 8.|MK8
MKH 416 P48|c|shotgun|required|shotgun|93|Version P48 uniquement. Les anciennes variantes T-power nécessitent un autre circuit.|MKH416 P48|mkh
MKH 20|c|omni|required|omni|68
MKH 30|c|eight|required|omni|66|Figure en 8 utile comme composante S d’un couple M/S.
MKH 40|c|card|required|pencil|72
MKH 50|c|super|required|shotgun,pencil|84|Sans long tube à interférences ; fréquent en dialogue intérieur.
MKH 8020|c|omni|required|omni|73
MKH 8040|c|card|required|pencil|75
MKH 8050|c|super|required|shotgun,pencil|77
MKH 8090|c|wide|required|omni,pencil|55
MKH 8060|c|shotgun|required|shotgun|76
MKH 8070|c|shotgun|required|shotgun|57
MKE 600|c|shotgun|battery|shotgun|83|Pile AA ou phantom 48 V.
MMD 935-1|d|card|wireless|vocal|74|Capsule HF, alimentée par l’émetteur ; pas de 48 V au récepteur.
MMD 945-1|d|super|wireless|vocal|72|Capsule HF, alimentée par l’émetteur.
MMK 965-1|c|multi|wireless|vocal|66|Capsule HF cardioïde / supercardioïde ; pas la version filaire e 965.
`);
add('Neumann','neumann',`
U 87 Ai|c|multi|required|studio,large|99|Omni, cardioïde et figure en 8 ; pad et coupe-bas.|U87,U87Ai,U 87
TLM 103|c|card|required|studio,large|95||TLM103
TLM 102|c|card|required|studio,large|87||TLM102
TLM 107|c|multi|required|large|72|Cinq directivités : omni, large, cardioïde, hypercardioïde, figure en 8.
TLM 49|c|card|required|studio|74
TLM 67|c|multi|required|large|64|Statique FET, pas une version à lampe du U 67.
TLM 170 R|c|multi|required|large|64|Cinq directivités.
TLM 193|c|card|required|large|65
KM 184|c|card|required|pencil|97||KM184
KM 183|c|omni|required|omni|75||KM183
KM 185|c|hyper|required|pencil|73||KM185
KMS 104|c|card|required|vocal|82||KMS104
KMS 104 plus|c|card|required|vocal|68|Réponse grave étendue par rapport au KMS 104.
KMS 105|c|super|required|vocal|93||KMS105
U 47 fet|c|card|required|kick,studio|85|Version FET à phantom, différente du U 47 à lampe.|U47fet
U 67|t|multi|external|studio,large|86|Alimentation dédiée NU 67 ; ne pas activer le 48 V sur sa sortie audio.|U67
M 149 Tube|t|multi|external|studio,large|75|Alimentation dédiée ; neuf positions de directivité.|M149
M 147 Tube|t|card|external|studio|65|Alimentation dédiée.|M147
KK 204|c|card|wireless|vocal|66|Tête pour système HF compatible ; pas une entrée XLR directe.
KK 205|c|super|wireless|vocal|72|Tête pour système HF compatible ; pas de phantom au récepteur.
`);
add('AKG','akg',`
D112 MkII|d|card|none|kick|95||D112,D112mkII
D12 VR|d|card|optional|kick|80|Sans phantom : son passif. Avec 48 V : filtres actifs, niveau réduit de 10 dB.|D12VR|d12
D5|d|super|none|vocal|81
D7|d|super|none|vocal|69
C5|c|card|required|vocal|65
C7|c|super|required|vocal|62
C535 EB|c|card|required|vocal,pencil|72||C535,C535EB
C414 XLS|c|multi|required|large,pencil|96|Neuf positions, de l’omni à la figure en 8.|C414XLS|c414
C414 XLII|c|multi|required|studio,large|93|Neuf positions ; présence plus marquée que le XLS.|C414XLII|c414
C214|c|card|required|large|87
C314|c|multi|required|large|67|Omni, cardioïde, supercardioïde, figure en 8.
C451 B|c|card|required|pencil|92||C451B
C1000 S|c|multi|battery|pencil|79|Cardioïde ; accessoire PPC pour hypercardioïde. Piles ou phantom.|C1000S
C391 B|c|card|required|pencil|70|Ensemble SE 300 B + capsule CK 91.|C391B
C430|c|card|required|pencil|62
C411 PP|c|na|required|clip|59|Capteur de vibration ; version PP XLR, différente de la version L basse tension.
C519 M|c|card|required|clip|68|Version M avec adaptateur XLR, différente de C519 ML.
P120|c|card|required|large|75
P220|c|card|required|large|73
P420|c|multi|required|large|67|Omni, cardioïde, figure en 8.
P170|c|card|required|pencil|74
P820 Tube|t|multi|external|large|56|Bloc d’alimentation externe dédié.
C12 VR|t|multi|external|studio,large|72|Microphone à lampe avec alimentation dédiée.|C12VR
`);
add('beyerdynamic','beyer',`
M 88 TG|d|hyper|none|kick,amp,vocal|88||M88,M88TG
M 201|d|hyper|none|snare,tom,amp|90||M201,M201TG
M 69 TG|d|hyper|none|amp,snare,vocal|68||M69TG
M 160|r|hyper|none|ribbon|88|Double ruban passif hypercardioïde, pas figure en 8.|M160
M 130|r|eight|none|ribbon|69|Ruban passif figure en 8.|M130
MC 930|c|card|required|pencil|75||MC930
MC 950|c|super|required|pencil|57||MC950
MM 1|c|omni|required|measurement|73||MM1
TG V50d|d|card|none|vocal|67||TGV50d
TG V70d|d|hyper|none|vocal|64||TGV70d
`);
add('Audio-Technica','at',`
AT2020|c|card|required|studio,large|93|Version XLR ; les versions USB sont différentes.
AT2035|c|card|required|large|86
AT2050|c|multi|required|large|75|Omni, cardioïde, figure en 8.
AT2040|d|hyper|none|broadcast|72|Version XLR passive.
AT4033a|c|card|required|large|80
AT4040|c|card|required|large|84
AT4050|c|multi|required|large|87|Omni, cardioïde, figure en 8.
AT4047/SV|c|card|required|studio,large|73||AT4047
AT4053b|c|hyper|required|pencil,shotgun|72
AT4041|c|card|required|pencil|74
AT4021|c|card|required|pencil|62
AT4022|c|omni|required|omni|55
AT2010|c|card|required|vocal|66
AE5400|c|card|required|vocal|67
AE3300|c|card|required|vocal|61
AE6100|d|hyper|none|vocal|68
AE4100|d|card|none|vocal|64
ATM650|d|hyper|none|amp,snare|69
ATM510|d|card|none|vocal|60
ATM230|d|hyper|none|tom|74
ATM250|d|hyper|none|kick|65
ATM450|c|card|required|pencil|66
ATM350a + module XLR|c|card|required|clip|82|Système complet avec module d’alimentation XLR ; la capsule seule ne reçoit pas directement 48 V.|ATM350a XLR
AE2500|h|card|split|kick|60|Un XLR 5 points et câble vers deux entrées : dynamique sans 48 V, statique avec 48 V.
ATM250DE|h|card|split|kick|53|Deux éléments, sorties séparées ; phantom uniquement côté statique.
BP40|d|hyper|none|broadcast|65
BP4025|c|xy|required|pencil,omni|58|Sortie stéréo, deux entrées phantom via le câble adapté.
`);
add('Audix','audix',`
i5|d|card|none|snare,amp|89
D6|d|card|none|kick|93
D2|d|hyper|none|tom|83
D4|d|hyper|none|tom,kick|81
D1|d|hyper|none|snare|61
OM2|d|hyper|none|vocal|76
OM3|d|hyper|none|vocal|73
OM5|d|hyper|none|vocal|85
OM6|d|hyper|none|vocal|77
OM7|d|hyper|none|vocal|79|Faible sensibilité ; prévoir du gain, bon contrôle de la technique de proximité.
ADX51|c|card|required|pencil|75
SCX1-C|c|card|required|pencil|68|Capsule cardioïde ; variantes HC et O distinctes.|SCX1 cardioid
SCX1-HC|c|hyper|required|shotgun,pencil|64|Capsule hypercardioïde.
SCX25A|c|card|required|large,pencil|69
A131|c|card|required|large|57
A231|c|card|required|studio,large|54
f50|d|card|none|vocal|53
f5|d|hyper|none|snare,amp|51
f6|d|hyper|none|kick|51
f9|c|card|required|pencil|51
`);
add('DPA','dpa',`
2028|c|super|required|vocal|85|Version filaire XLR ; les capsules HF 2028 sont différentes.
4018V d:facto|c|super|required|vocal|87|Microphone vocal filaire complet.|d:facto 4018V
4055|c|card|required|kick|80|Cardioïde ouverte, dédiée à la grosse caisse.
4099 + adaptateur XLR|c|super|required|clip|96|Ensemble complet avec adaptateur XLR phantom DPA compatible. Confirmer la connectique du kit.|4099 XLR
4099 MicroDot|c|super|adapter|clip|91|Capsule miniature seule : adaptateur approprié indispensable.|4099
2012|c|card|required|pencil,snare|74
2015|c|wide|required|pencil|72
2011A|c|card|required|pencil|74
2006A|c|omni|required|omni|68
4006A|c|omni|required|omni|90
4011A|c|card|required|pencil|91
4015A|c|wide|required|pencil,omni|71
4018A|c|super|required|pencil|73
4090|c|omni|required|omni|65
2017|c|shotgun|required|shotgun|64
4017B|c|shotgun|required|shotgun|77
4060 MicroDot|c|omni|adapter|lav,omni|90|Basse tension via émetteur ou adaptateur compatible.|4060
4061 MicroDot|c|omni|adapter|lav,clip|87|Version pour niveaux plus élevés que 4060.|4061
4071 MicroDot|c|omni|adapter|lav|73
6060 MicroDot|c|omni|adapter|lav|79
6061 MicroDot|c|omni|adapter|lav|73
4066 MicroDot|c|omni|adapter|lav|85
4088 MicroDot|c|card|adapter|lav|86
4188 MicroDot|c|card|adapter|lav|71
4488 MicroDot|c|card|adapter|lav|69
6066 MicroDot|c|omni|adapter|lav|78
`);
add('Schoeps','schoeps',`
CMC 6 + MK 4|c|card|required|pencil|88|Microphone complet avec capsule MK 4 ; CMC 6 accepte P12 / P48.|CMC6 MK4
CMC 6 + MK 41|c|super|required|shotgun,pencil|87|Microphone complet avec capsule MK 41.|CMC6 MK41
CMC 6 + MK 2|c|omni|required|omni|74|Microphone complet, capsule omni de champ libre.
CMC 6 + MK 21|c|wide|required|pencil,omni|70
CMC 6 + MK 22|c|wide|required|pencil|64|Cardioïde ouverte.
CMC 6 + MK 8|c|eight|required|omni|68|Capsule bidirectionnelle, utile en M/S.
CCM 4|c|card|required|pencil|76
CCM 41|c|super|required|shotgun,pencil|78
CMIT 5 U|c|shotgun|required|shotgun|86
MiniCMIT|c|shotgun|required|shotgun|74
`);
add('RØDE','rode',`
NT1 Signature|c|card|required|studio,large|88|Version XLR analogique.|NT1 Signature Series
NT1-A|c|card|required|studio,large|94||NT1A
NT2-A|c|multi|required|large|84|Omni, cardioïde et figure en 8.|NT2A
NT1000|c|card|required|large|63
NT2000|c|multi|required|large|65|Directivité continûment variable.
NT5|c|card|required|pencil|90|||nt5
M5|c|card|required|pencil|79
NT55|c|multi|required|pencil,omni|70|Capsules cardioïde et omnidirectionnelle interchangeables.
TF5|c|card|required|pencil|64
NT3|c|card|battery|pencil,vocal|75|Pile 9 V ou phantom.||nt3
M3|c|card|battery|pencil|67|Pile 9 V ou phantom 24 / 48 V.
NT4|c|xy|battery|pencil|66|Stéréo X/Y ; deux entrées via le câble adapté, ou pile interne.
NTK|t|card|external|studio|77|Alimentation externe dédiée.
K2|t|multi|external|studio,large|75|Directivité variable, alimentation externe dédiée.
NTR|a|eight|required|ribbon|63|Ruban actif : le 48 V est requis.
Procaster|d|card|none|broadcast|84
PodMic|d|card|none|broadcast|89|Version XLR dynamique passive.
NTG1|c|shotgun|required|shotgun|65
NTG2|c|shotgun|battery|shotgun|79|Pile AA ou phantom.
NTG3|c|shotgun|required|shotgun|82
NTG4|c|shotgun|required|shotgun|63
NTG4+|c|shotgun|battery|shotgun|65|Batterie interne rechargeable ou phantom.
NTG5|c|shotgun|required|shotgun|75
`);
add('LEWITT','lewitt',`
MTP 550 DM|d|card|none|vocal|68
MTP 550 CM|c|card|required|vocal|55
MTP 940 CM|c|multi|required|vocal|61|Cardioïde, cardioïde large ou supercardioïde.
LCT 040 MATCH|c|card|required|pencil|72
LCT 140 AIR|c|card|required|pencil|75
LCT 240 PRO|c|card|required|large|77
LCT 440 PURE|c|card|required|studio,large|84
LCT 441 FLEX|c|multi|required|large|66|Huit directivités.
LCT 540 S|c|card|required|studio,large|66
LCT 640 TS|c|multi|required|large|63|Seconde sortie optionnelle pour double membrane ; régler le câblage séparément.
DTP 340 REX|d|card|none|kick|59
DTP 640 REX|h|card|split|kick|57|Éléments dynamique et statique à sorties séparées.
`);
add('sE Electronics','se',`
V3|d|card|none|vocal|65
V7|d|super|none|vocal|92
V7 X|d|super|none|amp,snare|78
V BEAT|d|super|none|tom,snare|77|||sedrums
V KICK|d|super|none|kick|80|||sedrums
sE7|c|card|required|pencil|70
sE8|c|card|required|pencil|80
RN17|c|card|required|pencil|57
X1 A|c|card|required|large|65
X1 S|c|card|required|large|78
sE2200|c|card|required|studio,large|81
sE2300|c|multi|required|large|63|Omni, cardioïde et figure en 8.
sE4100|c|card|required|large|58
sE4400|c|multi|required|large|65|Omni, cardioïde, hypercardioïde et figure en 8.
VR1|r|eight|none|ribbon|72|Ruban passif, à distinguer du VR2.||seribbon
VR2|a|eight|required|ribbon|66|Ruban actif nécessitant le 48 V.||seribbon
X1 R|r|eight|none|ribbon|61|Ruban passif.
RNR1|a|eight|required|ribbon|55|Ruban actif à phantom.
`);
add('Austrian Audio','austrian',`
OD505|da|super|required|vocal|76|Dynamique actif : 48 V indispensable, malgré la capsule dynamique.||od505
OD5|da|card|required|snare,tom,amp|68|Dynamique actif nécessitant le 48 V.
OD303|d|super|none|vocal|62
OC18|c|card|required|large|79
OC818|c|multi|required|large|83|Omni, cardioïde, hypercardioïde et figure en 8 ; seconde sortie de membrane optionnelle.
OC16|c|card|required|large|66
CC8|c|card|required|pencil|72
OC707|c|super|required|vocal|68|Version filaire, différente de la capsule OC707 WL1.
OC7|c|card|required|pencil,snare|61
`);
add('Earthworks','earth',`
SR314|c|card|required|vocal|78|Statique cardioïde, alimentation 24–48 V.
SR117|c|super|required|vocal|73|Statique supercardioïde, P48 requis.||sr117
SR25|c|card|required|pencil|77
SR30|c|card|required|pencil|63
QTC40|c|omni|required|omni|61
QTC50|c|omni|required|omni|55
TC20|c|omni|required|omni|58
M23|c|omni|required|measurement|79
M30|c|omni|required|measurement|81
M50|c|omni|required|measurement|55
`);
add('TELEFUNKEN','tele',`
M80|d|super|none|vocal,snare|84
M81|d|super|none|vocal,amp|77
M82|d|card|none|kick,broadcast|68
M60 FET + TK60|c|card|required|pencil|64|Corps complet avec capsule TK60 cardioïde.
M60 FET + TK61|c|omni|required|omni|51
M60 FET + TK62|c|hyper|required|pencil|51
TF11|c|card|required|large|61|FET à phantom, pas à lampe.
TF29 Copperhead|t|card|external|studio|64|Alimentation dédiée.
TF39 Copperhead Deluxe|t|multi|external|studio,large|54
TF47|t|multi|external|studio,large|62
TF51|t|multi|external|studio,large|58
ELA M 251E|t|multi|external|studio,large|78|Alimentation dédiée ; cardioïde, omni et figure en 8.
U47|t|multi|external|studio,large|80|Réédition à lampe, alimentation dédiée ; cardioïde / omni.
C12|t|multi|external|studio,large|72|Microphone à lampe avec alimentation dédiée.
`);
add('Royer','royer',`
R-121|r|eight|none|ribbon|95|Ruban passif.|R121
R-122 MKII|a|eight|required|ribbon|82|Ruban actif à phantom ; ne pas confondre avec le R-121.|R122 MKII
R-10|r|eight|none|ribbon|77|Ruban passif.|R10
SF-12|r|eight|none|ribbon|63|Deux rubans passifs en couple stéréo ; câble adapté et deux entrées.|SF12
SF-24|a|eight|required|ribbon|57|Deux rubans actifs stéréo, phantom sur les deux entrées.|SF24
`);
add('AEA','aea',`
R84|r|eight|none|ribbon|82|Ruban passif, différent du R84A.||aear84
R84A|a|eight|required|ribbon|68|Version active à phantom.||aear84
R44CE|r|eight|none|ribbon|68|Ruban passif.
R88|r|eight|none|ribbon|66|Couple stéréo de rubans passifs ; deux entrées.
R88A|a|eight|required|ribbon|54|Couple stéréo de rubans actifs ; deux entrées phantom.
N22|a|eight|required|ribbon|72|Ruban actif optimisé pour la proximité.
N8|a|eight|required|ribbon|63|Ruban actif pour captation à distance.
KU5A|a|super|required|ribbon|61|Ruban actif supercardioïde ; pas figure en 8.
`);
add('Radial','radial',`
J48|di|na|required|di|98|DI active alimentée uniquement par phantom, sans pile.||j48
Pro48|di|na|required|di|89|DI active alimentée par phantom 48 V.
JDI|dp|na|none|di|97|DI passive à transformateur ; aucune alimentation.
ProDI|dp|na|none|di|94|DI passive mono.
ProD2|dp|na|none|di|94|DI passive stéréo, deux entrées console.
JDI Duplex|dp|na|none|di|79|DI passive deux canaux.
PZ-DI|di|na|required|di|76|Impédance sélectionnable, adaptée notamment aux capteurs piézo.|PZDI
StageBug SB-1|di|na|required|di|68|DI active à phantom.
StageBug SB-2|dp|na|none|di|64|DI passive.
`);
add('BSS','bss',`AR-133|di|na|battery|di|98|DI active : phantom 20–48 V ou pile 9 V.|AR133`);
add('Countryman','country',`Type 85|di|na|battery|di|85|DI active : phantom 48 V ou pile 9 V.|Type85`);
add('Rupert Neve Designs','neve',`RNDI|di|na|required|di|87|DI active à transformateur, alimentation phantom 48 V.`);
add('Behringer','behringer',`
DI100 Ultra-DI|di|na|battery|di|84|DI active : pile 9 V ou phantom.|DI100
DI20 Ultra-DI|di|na|battery|di|70|DI active deux canaux : pile ou phantom.|DI20
DI400P Ultra-DI|dp|na|none|di|73|DI passive.|DI400P
ECM8000|c|omni|required|measurement|85|Micro de mesure ; utiliser une calibration individuelle si disponible.
`);
add('Klark Teknik','klark',`DN100|di|na|required|di|85|DI active alimentée par phantom.
DN200|di|na|required|di|72|DI active deux canaux, alimentée par phantom.`);
add('Palmer','palmer',`PAN 01|dp|na|none|di|74|DI passive.|PAN01
PAN 02|di|na|battery|di|68|DI active : pile ou phantom.|PAN02`);
add('Whirlwind','whirlwind',`IMP 2|dp|na|none|di|83|DI passive à transformateur.|IMP2`);
add('Avalon','avalon',`U5|di|na|external|di|83|Préampli / DI alimenté sur secteur ; sa sortie audio ne demande pas de phantom.`);

add('Electro-Voice','ev',`
RE20|d|card|none|broadcast,kick,amp|94|Variable-D : effet de proximité réduit.
RE320|d|card|none|broadcast,kick|80|Deux courbes commutables, voix / instrument et grosse caisse.
ND76|d|card|none|vocal|70
ND86|d|super|none|vocal|64
ND96|d|super|none|vocal|64
ND66|c|card|required|pencil|57
`);
add('Heil Sound','heil',`PR 40|d|card|none|broadcast,kick|79|Reprise par l’extrémité de la grille, pas par le côté.|PR40`);
add('Sony','sony',`C-80|c|card|required|studio,large|71|Statique FET à phantom, à distinguer du C-800G à alimentation dédiée.|C80`);
add('Samson','samson',`C02|c|card|required|pencil|77|Petit statique cardioïde à 48 V. Vendu en paire appairée, avec une connexion XLR et une entrée console par microphone. Utile en overheads, sur cymbales et instruments acoustiques.|C 02,C-02,CO2`);
add('Sanken','sanken',`
COS-11D XLR|c|omni|required|lav|81|Version filaire XLR avec circuit P48 ; pas la capsule HF seule.
COS-11D-BP|c|omni|battery|lav|66|Version filaire avec boîtier pile AA ou phantom 12–52 V.
COS-11D HF|c|omni|adapter|lav|90|Version basse tension pour émetteur : 3–10 V selon le câblage, pas 48 V direct.|COS11D
`);
const three='Omni · cardioïde · figure en 8',nine='Omni · cardioïde large · cardioïde · hypercardioïde · figure en 8 et positions intermédiaires';
const polarDetails={KSM9:'Cardioïde · supercardioïde',KSM9HS:'Subcardioïde · hypercardioïde',KSM44A:three,KSM141:'Cardioïde · omni','e 965':'Cardioïde · supercardioïde','MMK 965-1':'Cardioïde · supercardioïde','MK 8':'Omni · large · cardioïde · supercardioïde · figure en 8','U 87 Ai':three,'TLM 107':'Omni · large · cardioïde · hypercardioïde · figure en 8','TLM 67':three,'TLM 170 R':'Omni · large · cardioïde · hypercardioïde · figure en 8','U 67':three,'M 149 Tube':nine,'C414 XLS':nine,'C414 XLII':nine,C314:'Omni · cardioïde · supercardioïde · figure en 8','C1000 S':'Cardioïde · hypercardioïde avec accessoire PPC',P420:three,'P820 Tube':nine,'C12 VR':nine,AT2050:three,AT4050:three,'NT2-A':three,NT2000:'Omni à figure en 8, réglage continu',NT55:'Cardioïde ou omni, par échange de capsule',K2:'Omni à figure en 8, réglage continu','MTP 940 CM':'Cardioïde large · cardioïde · supercardioïde','LCT 441 FLEX':'Omni · large · cardioïde · supercardioïde · figure en 8 et directivités inversées','LCT 640 TS':'Omni · large · cardioïde · supercardioïde · figure en 8',sE2300:three,sE4400:'Omni · cardioïde · hypercardioïde · figure en 8',OC818:'Omni · cardioïde · hypercardioïde · figure en 8','TF39 Copperhead Deluxe':nine,TF47:three,TF51:nine,'ELA M 251E':three,U47:'Cardioïde · omni',C12:nine};
export const MICROPHONES=entries.map(m=>({...m,polarDetail:polarDetails[m.model]||PATTERNS[m.pattern],channels:m.channels===2||['SF-12','SF-24','R88','R88A','ProD2','JDI Duplex','DI20 Ultra-DI','DN200'].includes(m.model)?2:1,liveRank:Math.min(100,m.rank+(m.families.includes('vocal')||m.families.includes('di')?2:0)-(m.families.includes('studio')?12:0)),studioRank:Math.min(100,m.rank+(m.families.includes('studio')||m.families.includes('ribbon')?2:0)),sourceUrl:SOURCES[m.source][1]}));
const exact=new Map();for(const m of MICROPHONES)for(const key of [m.model,...m.aliases])for(const name of [key,m.brand+' '+key]){const normalized=normalizeMic(name);if(!exact.has(normalized))exact.set(normalized,m);else if(exact.get(normalized)?.id!==m.id)exact.set(normalized,null);}
export function resolveMic(name,custom=[]){return custom.find(m=>normalizeMic(m.brand+' '+m.model)===normalizeMic(name))||exact.get(normalizeMic(name))||null;}

const parseMicCode=key=>/^([a-z]*)(\d+)([a-z][a-z0-9]*)?$/.exec(key);
const micForms=model=>{
 const keys=[...new Set([model.model,...(model.aliases||[])].map(normalizeMic))];
 const brandWords=model.brand.split(/[\s-]+/).map(normalizeMic).filter(Boolean);
 return {model,brand:normalizeMic(model.brand),initials:brandWords.length>1?brandWords.map(w=>w[0]).join(''):'',keys,codes:keys.map(parseMicCode).filter(Boolean)};
};
const catalogForms=MICROPHONES.map(micForms);
function oneLetterEdit(a,b){
 if(a===b||Math.abs(a.length-b.length)>1)return false;
 if(a.length>b.length)[a,b]=[b,a];
 let i=0;while(i<a.length&&a[i]===b[i])i++;
 if(a.length<b.length)return a.slice(i)===b.slice(i+1);
 return a.slice(i+1)===b.slice(i+1)||a[i]===b[i+1]&&a[i+1]===b[i]&&a.slice(i+2)===b.slice(i+2);
}
function closeMicCode(query,reference,allowMissingSeries,model){
 const [,series,number,suffix='']=query,[,refSeries,refNumber,refSuffix='']=reference;
 if(number!==refNumber)return false;
 // A suffix can identify the connection, power supply or version. Never change it or omit its digits.
 if(suffix!==refSuffix&&(!refSuffix.startsWith(suffix)||/\d/.test(refSuffix.slice(suffix.length))||['adapter','wireless','split'].includes(model.power)))return false;
 if(!series)return allowMissingSeries;
 return refSeries.startsWith(series)||suffix===refSuffix&&number.length>=2&&series.length>=2&&refSeries.length>=2&&oneLetterEdit(series,refSeries);
}
function matchMicNames(value,custom,{bareNumber=false}={}){
 const name=String(value??'').trim(),key=normalizeMic(name),model=resolveMic(name,custom);
 if(model)return {models:[model],approximate:false};
 // An ambiguous exact name or a list of alternatives is never resolved by guessing.
 const numeric=bareNumber&&/^\d{3,4}$/.test(name);
 if(exact.has(key)||name.length>80||!numeric&&!/^\p{L}[\p{L}\d\s.-]*$/u.test(name)||/\b(?:ou|or)\b/i.test(name))return {models:[],approximate:false};
 const words=name.split(/\s+/),queries=[];
 for(let i=0;i<words.length;i++){
  const brand=normalizeMic(words.slice(0,i).join(' ')),label=words.slice(i).join(' '),codeKey=normalizeMic(label);
  // Only allow spaces inside the model code once its number starts (e.g. TLM 170 R).
  const code=/^[a-z]*[.\s-]*\d/i.test(label)?parseMicCode(codeKey):null;
  if(brand||code)queries.push({brand,codeKey,code});
 }
 const candidates=new Map();
 for(const entry of [...catalogForms,...custom.map(micForms)]){
  if(!queries.some(({brand,codeKey,code})=>{
   if(brand&&brand!==entry.brand&&brand!==entry.initials&&!(brand.length>=3&&(entry.brand.startsWith(brand)||entry.brand.length>=5&&oneLetterEdit(brand,entry.brand))))return false;
   return brand&&entry.keys.includes(codeKey)||code&&entry.codes.some(ref=>closeMicCode(code,ref,!!brand||numeric,entry.model));
  }))continue;
  candidates.set(entry.model.id,entry.model);
 }
 return {models:[...candidates.values()],approximate:true};
}
export function matchImportedMic(value,custom=[],options={}){
 const {models,approximate}=matchMicNames(value,custom,options);
 return models.length===1?{model:models[0],approximate}:null;
}
export function searchMicrophones({query='',brand='',type='',power='',use='',context='',sort='popular',custom=[]}={}){
 const words=String(query).trim().split(/\s+/).map(normalizeMic).filter(Boolean);
 const nameMatches=new Set(matchMicNames(query,custom,{bareNumber:true}).models.map(m=>m.id));
 const matches=m=>{const text=[m.brand,m.model,...(m.aliases||[]),TYPES[m.type],PATTERNS[m.pattern],POWER[m.power]?.label,m.note,...m.families.flatMap(f=>[USES[f]?.label,...USES[f]?.tags||[]])].join(' '),tokens=text.split(/[\s·/,;:()—-]+/).map(normalizeMic),flat=normalizeMic(text);return words.every(w=>w==='di'?['di','dp'].includes(m.type):w==='oh'?m.families.includes('pencil'):w.length<=2?tokens.includes(w)||normalizeMic(m.model).startsWith(w):flat.includes(w));};
 const matchesFilters=m=>(!brand||m.brand===brand)&&(!type||m.type===type)&&(!power||m.power===power)&&(!use||m.families.includes(use))&&(!context||m.families.some(f=>USES[f]?.contexts.includes(context)));
 const rankKey=sort==='live'?'liveRank':sort==='studio'?'studioRank':'rank';
 const compareName=(a,b)=>`${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
 return [...MICROPHONES,...custom]
  .filter(m=>matchesFilters(m)&&(nameMatches.has(m.id)||matches(m)))
  .sort((a,b)=>{
   if(sort==='name')return compareName(a,b);
   if(sort==='relevance'&&nameMatches.has(a.id)!==nameMatches.has(b.id))return nameMatches.has(a.id)?-1:1;
   return (b[rankKey]||0)-(a[rankKey]||0)||compareName(a,b);
  });
}
export function alternatives(m,{custom=[],limit=6}={}){
 // Same principal application; avoid presenting HF capsules or special power arrangements as drop-in replacements.
 return [...MICROPHONES,...custom].filter(x=>x.brand!==m.brand&&x.families.includes(m.families[0])&&((['di','dp'].includes(m.type))===['di','dp'].includes(x.type))&&(!['adapter','wireless','split'].includes(x.power)||x.power===m.power)).sort((a,b)=>b.rank-a.rank||a.model.localeCompare(b.model)).slice(0,limit);
}
export const phantomCapable=c=>(['LCL','A','B','C'].includes(c.bank)||c.bank?.startsWith('SB:'));
export function validMicProfile(m){return !!m&&typeof m.id==='string'&&typeof m.brand==='string'&&typeof m.model==='string'&&!!TYPES[m.type]&&!!PATTERNS[m.pattern]&&!!POWER[m.power]&&Array.isArray(m.families)&&m.families.length>0&&m.families.every(f=>!!USES[f])&&(!m.sourceUrl||typeof m.sourceUrl==='string'&&/^https?:\/\//i.test(m.sourceUrl));}
export function recommendation(m,choice='default'){
 if(!m||!POWER[m.power])return null;
 if(m.custom&&!m.verified)return null;
 if(choice==='battery'&&m.power==='battery'||choice==='bypass'&&m.id==='shuresm7db')return false;
 if(choice==='active'&&m.power==='optional')return true;
 return POWER[m.power].on;
}
export function applyMicrophone(s,c,m,choice='default'){
 const on=recommendation(m,choice);if(on===null)throw new Error('Vérifiez l’alimentation de cette référence avant l’affectation automatique.');
 const shared=s.channels.filter(x=>x.bank===c.bank&&x.input===c.input&&x.mode===c.mode);
 for(const x of shared){Object.assign(x,{mic:`${m.brand} ${m.model}`,micId:m.id,micProfile:structuredClone(m),phantomMode:'auto',powerChoice:choice,phantom:phantomCapable(x)&&on});}
 return shared.length;
}
export function manualPhantom(s,c,on){for(const x of s.channels.filter(x=>x.bank===c.bank&&x.input===c.input&&x.mode===c.mode))Object.assign(x,{phantom:phantomCapable(x)&&on,phantomMode:'manual'});}
export function refreshPhantom(s,c){const m=c.micProfile||resolveMic(c.mic);if(c.phantomMode==='auto'&&m)applyMicrophone(s,c,m,c.powerChoice);else if(!phantomCapable(c))c.phantom=false;}
export function microphoneStatus(c){
 const m=c.micProfile||resolveMic(c.mic);if(!m)return {tone:'amber',text:'Référence libre · alimentation à vérifier',model:null};
 const wanted=recommendation(m,c.powerChoice),manual=c.phantomMode!=='auto';
 if(wanted&& !phantomCapable(c))return {tone:'amber',text:'48 V requis en amont · cette interface ne le commande pas',model:m};
 if(['adapter','split'].includes(m.power))return {tone:'amber',text:POWER[m.power].text,model:m};
 return {tone:manual?'amber':POWER[m.power].tone,text:manual?`48 V manuel · fiche : ${POWER[m.power].label}`:`48 V automatique · ${c.phantom?'activé':'désactivé'}${c.powerChoice==='battery'?' · pile choisie':c.powerChoice==='bypass'?' · bypass':''}`,model:m};
}
