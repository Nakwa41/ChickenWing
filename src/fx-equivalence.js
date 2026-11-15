// Functional reference, reviewed 2026-11-02. See docs/SHOW-EVANGELIST.md.
// Matches are editorial engineering proposals, never claims of identical sound.
import {FX_CATALOG} from './effects.js';
import {M32_FX_CATALOG} from './m32-effects.js';
import {yamahaFxCatalog,yamahaFxFamily,yamahaFxCapacity} from './yamaha-effects.js';
import {isYamaha,isM32,consoleModel} from './consoles.js';
export const FX_REFERENCE_VERSION='2026-11-02.2';
export const FX_SOURCES={
 wing:{title:'WING / COMPACT / RACK · User Manual, Effects',url:'https://cdn-media.empowertribe.com/e2017bd84d39449788188948571e49d2/Manual_WING%2C%20WING%20RACK%2C%20WING%20Compact.pdf'},
 m32:{title:'M32R · User Manual, §2.11 Internal Effects',url:'https://cdn-media.empowertribe.com/ad242ce7708f42028722ed6823d14fda/M32R_M_EN.pdf'},
 cl:{title:'CL · Reference Manual, Effects / Premium parameters',url:'https://usa.yamaha.com/files/download/other_assets/8/329238/cl5_en_rm_c0.pdf'},
 ql:{title:'QL V5.8 · Reference Manual, Effects / Premium',url:'https://usa.yamaha.com/files/download/other_assets/2/1506322/ql5_1_en_rm_e0.pdf'},
 dm3:{title:'DM3 · Effect Parameters',url:'https://manual.yamaha.com/pa/mixers/dm3/rm/en-US/7432684939.html'},
 dm7:{title:'DM7 · Reference Manual',url:'https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/index.html'},
 dm5:{title:'DM5 · User Guide, Appendix / Effects',url:'https://manual.yamaha.com/audio/mixers/dm5_dm5c/en-US/'},
 dm7eq:{title:'DM7 · GEQ/PEQ dedicated rack',url:'https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/8365295627.html'},
 dm3eq:{title:'DM3 · Output GEQ, 31 bands / 15 active',url:'https://manual.yamaha.com/pa/mixers/dm3/rm/en-US/6346207115.html'},
 premium:{title:'DM7 · Premium Parameters',url:'https://manual.yamaha.com/pa/mixers/dm7/rm/en-US/11039532811.html'}
};
// Description, external replacement specification, explicitly permitted fallbacks.
export const FX_FUNCTIONS={
 hall:['Réverbération de grande salle, avec queue diffuse.','Réverbération de salle avec prédélai, amortissement et temps de décroissance.',['room']],
 room:['Réverbération de pièce ou chambre, espace plus court et réflexions rapprochées.','Réverbération de pièce avec taille et premières réflexions.',['hall']],
 plate:['Réverbération de plaque, dense et brillante.','Réverbération de plaque avec prédélai et amortissement.',['hall']],
 ambience:['Premières réflexions et ambiance courte pour donner du relief.','Générateur de premières réflexions et ambiance courte.',['room']],
 gated:['Réverbération dont la queue est interrompue.','Réverbération gated avec longueur et enveloppe réglables.',[]],
 reverse:['Réverbération à enveloppe montante avant coupure.','Réverbération reverse / non linéaire à enveloppe montante.',[]],
 spring:['Résonances et dispersion caractéristiques de ressorts.','Simulation de réverbération à ressorts.',['ambience']],
 shimmer:['Réverbération avec transposition dans la boucle de réinjection.','Réverbération shimmer avec pitch dans le feedback.',[]],
 delay:['Répétitions numériques, temps et feedback réglables.','Délai stéréo avec temps gauche / droite et feedback.',['crossDelay','tapDelay']],
 monoDelay:['Répétitions à partir d’une entrée mono.','Délai mono avec temps et feedback.',['delay']],
 crossDelay:['Répétitions avec réinjection croisée entre les côtés.','Délai à feedback croisé gauche / droite.',['delay']],
 pingpong:['Répétitions alternant entre gauche et droite.','Délai ping-pong.',['crossDelay','delay']],
 tapDelay:['Plusieurs répétitions indépendantes réparties dans le temps et l’espace.','Délai multitap avec niveaux, panoramiques et temps individuels.',['delay']],
 modDelay:['Délai dont les répétitions sont modulées.','Délai avec modulation de temps.',['bbd','delay']],
 tapeDelay:['Écho coloré par une simulation de bande.','Écho à bande avec saturation et modulation.',['bbd','delay']],
 oilcan:['Écho diffus et modulé simulant un dispositif électrostatique à huile.','Écho oilcan avec modulation et diffusion.',['tapeDelay','bbd']],
 bbd:['Délai analogique à lignes de retard, répétitions filtrées et modulées.','Délai BBD avec filtrage et modulation.',['tapeDelay','modDelay']],
 chorus:['Retards modulés et désaccordés pour épaissir le signal.','Chorus stéréo à profondeur et vitesse réglables.',['ensemble']],
 dimension:['Chorus de type Dimension, élargissement à modulation discrète.','Chorus Dimension / spatialisation stéréo.',['chorus','ensemble']],
 ensemble:['Plusieurs voix modulées pour un ensemble large.','Chorus multivoix / ensemble.',['chorus','dimension']],
 flanger:['Retard court modulé produisant un filtrage en peigne mobile.','Flanger avec feedback et temps de retard.',['dynamicFlanger']],
 dynamicFlanger:['Flanger commandé par l’enveloppe du signal.','Flanger avec suiveur d’enveloppe.',['flanger']],
 phaser:['Réseau de déphasage produisant des creux mobiles.','Phaser à vitesse, profondeur et feedback réglables.',['dynamicPhaser']],
 dynamicPhaser:['Déphasage commandé par l’enveloppe du signal.','Phaser avec détection d’enveloppe.',['phaser']],
 tremolo:['Modulation périodique du niveau.','Trémolo avec profondeur et vitesse.',['panner']],
 panner:['Déplacement périodique du signal dans le champ stéréo.','Auto-pan avec profondeur et vitesse.',['tremolo']],
 rotary:['Simulation de haut-parleur tournant, Doppler et modulation.','Cabine rotative à vitesses lente / rapide.',[]],
 pitch:['Transposition de hauteur avec retard optionnel.','Pitch shifter stéréo / double voix.',['detune']],
 detune:['Désaccordage de plusieurs voix pour élargir le son.','Micro-pitch / detune multivoix.',['pitch','chorus']],
 doubler:['Doublement de voix avec variations de retard et de hauteur.','Doubleur vocal / ADT.',['detune','chorus']],
 correction:['Correction de hauteur en temps réel vers une gamme.','Correcteur de justesse avec gamme et vitesse de correction.',[]],
 sub:['Ajout d’une composante transposée dans le grave.','Générateur de sous-octave.',['subEnhance']],
 subEnhance:['Synthèse et contrôle de fréquences sous-graves.','Générateur de subharmoniques avec filtrage.',['sub']],
 psychoBass:['Ajout d’harmoniques pour suggérer un grave absent.','Renforcement psychoacoustique du grave, sans simple boost EQ.',[]],
 filter:['Filtre résonant piloté par modulation ou enveloppe.','Filtre résonant avec LFO et suiveur d’enveloppe.',['wah','dynamicFilter']],
 wah:['Balayage de filtre résonant de type wah.','Auto-wah avec résonance et modulation.',['filter','dynamicFilter']],
 dynamicFilter:['Filtre dont la fréquence suit l’enveloppe.','Filtre résonant commandé par enveloppe.',['filter','wah']],
 ring:['Multiplication du signal par une porteuse, sons métalliques.','Modulateur en anneau à fréquence réglable.',['dynamicRing']],
 dynamicRing:['Modulation en anneau dont la porteuse suit le signal.','Ring modulator piloté par enveloppe.',['ring']],
 synth:['Synthèse déclenchée / pilotée par le signal audio.','Synthétiseur audio avec suivi du signal et oscillateurs.',[]],
 distortion:['Saturation non linéaire et ajout d’harmoniques.','Distorsion / overdrive avec filtrage.',['tube','amp']],
 compDist:['Compression et distorsion dans un même traitement.','Compresseur suivi d’une distorsion.',['distortion']],
 amp:['Simulation d’amplificateur et de coloration guitare.','Simulation d’ampli avec baffle et gain.',[]],
 body:['Restauration de la résonance acoustique d’une guitare à capteur.','Traitement de résonance de caisse / BodyRez.',[]],
 tape:['Coloration et compression de bande, sans écho.','Simulation de magnétophone et saturation de bande.',['tube']],
 tube:['Saturation / coloration d’étage à lampes.','Simulation d’étage à lampes.',['tape','distortion']],
 geq:['Égalisation graphique par bandes fixes.','Égaliseur graphique avec bandes et largeur adaptées.',['peq']],
 peq:['Égalisation paramétrique, fréquence, gain et largeur réglables.','Égaliseur paramétrique ; vérifier les filtres et la coloration.',['geq']],
 passiveEq:['Égalisation passive de type programme, boosts et atténuations interactifs.','EQ passif de programme de type Pultec.',['peq']],
 midEq:['Égalisation passive dédiée aux médiums.','EQ médium de type MEQ.',['passiveEq','peq']],
 dynamicEq:['Gain d’égalisation dépendant du niveau dans chaque bande.','Égaliseur dynamique à seuils par bande.',['multiband']],
 isolator:['Séparation et atténuation de larges bandes pour isoler des registres.','Isolateur multibande avec coupures et gains.',['peq']],
 multiFilter:['Plusieurs filtres résonants agissant simultanément.','Banque de filtres avec résonance et gains.',['filter']],
 limiter:['Limitation des crêtes pour contrôler le niveau maximal.','Limiteur avec plafond, attaque et relâchement.',[]],
 fet:['Compression rapide de type FET / 1176.','Compresseur FET avec attaque et relâchement.',['compressor','vca']],
 opto:['Compression optique à réaction dépendante du programme.','Compresseur optique de type LA-2A.',['compressor']],
 variMu:['Compression à lampes de type vari-mu.','Compresseur vari-mu / Fairchild.',['compressor']],
 vca:['Compression de type VCA à seuil, ratio et enveloppe.','Compresseur VCA.',['compressor','busComp']],
 compressor:['Réduction de dynamique large bande.','Compresseur large bande avec seuil, ratio et enveloppe.',['vca','busComp']],
 busComp:['Compression de bus à coloration et liaison stéréo.','Compresseur de bus stéréo.',['compressor','vca']],
 multiband:['Compression / dynamique indépendante par bandes.','Processeur de dynamique multibande ; vérifier le nombre de bandes.',['dynamicEq']],
 deesser:['Réduction ciblée des sifflantes selon leur niveau.','De-esser à fréquence et seuil réglables.',['dynamicEq']],
 transient:['Modification indépendante de l’attaque et du sustain.','Processeur de transitoires, attaque et sustain.',[]],
 enhancer:['Traitement spectral / de phase pour clarifier et enrichir le son.','Enhancer spectral avec contrôle grave / aigu.',['exciter']],
 exciter:['Création d’harmoniques pour accentuer la présence.','Exciter harmonique.',['enhancer']],
 imager:['Modification de largeur et du champ stéréo.','Imageur stéréo / matrice M/S.',[]],
 suppressor:['Réduction adaptative de bruit spectral.','Réducteur de bruit adaptatif de type DaNSe.',[]],
 primary:['Contrôle dynamique du bruit ambiant pour une source dominante.','Primary Source Enhancer de type Portico 5045.',[]],
 sampler:['Enregistrement puis lecture d’un échantillon audio ; ce Freeze ne fige pas une réverbération.','Échantillonneur déclenchable avec capture et lecture audio.',[]],
 speaker:['Gestion d’enceinte réunissant filtrage, EQ dynamique et limiteur.','Processeur d’enceinte avec filtrage, égalisation dynamique et protection.',[]],
 strip:['Chaîne de traitements de tranche réunissant plusieurs modules.','Channel strip dont chaque module reproduit la chaîne d’origine.',[]],
 external:['Boucle d’insertion vers un processeur externe.','Prévoir le même processeur externe et son câblage.',[]],
 none:['Emplacement sans traitement.','Aucun traitement à remplacer.',[]]
};
const maps={wing:{},m32:{},cl:{},dm3:{},dm7:{}};
function add(family,kind,ids){for(const id of ids.split('|')){if(maps[family][id])throw new Error('Double référence FX '+id);maps[family][id]=kind;}}
const groups={
 wing:{none:'NONE',external:'EXT',hall:'HALL|CONCERT|V-REV|VSS3',room:'ROOM|CHAMBER|V-ROOM',plate:'PLATE|V-PLATE|BPLATE',ambience:'AMBI',gated:'GATED',reverse:'REVERSE',shimmer:'SHIMMER',spring:'SPRING',dimension:'DIMCRS',chorus:'CHORUS',flanger:'FLANGER',delay:'ST-DL',tapDelay:'TAP-DL',tapeDelay:'TAPE-DL',oilcan:'OILCAN',bbd:'BBD-DL',pitch:'PITCH|D-PITCH',geq:'GEQ|PIA',doubler:'DOUBLE',correction:'PCORR',limiter:'LIMITER',deesser:'DE-S2',enhancer:'ENHANCE',exciter:'EXCITER',psychoBass:'P-BASS',rotary:'ROTARY',phaser:'PHASER',panner:'PANNER',tape:'TAPE',filter:'MOOD',sub:'SUB',amp:'RACKAMP|UKROCK|ANGEL|JAZZC|DELUXE',body:'BODY',peq:'SOUL|E88|E84|F110',passiveEq:'PULSAR',multiband:'MACH4|C5-CMB',subEnhance:'SUB-M',imager:'V-IMG',speaker:'SPKMAN',dynamicEq:'DEQ3',strip:'*EVEN*|*SOUL*|*VINTAGE*|*BUS*|*MASTER*'},
 m32:{hall:'HALL|VREV',ambience:'AMBI',plate:'RPLT|PLAT',room:'ROOM|CHAM|VRM',gated:'GATE',reverse:'RVRS',delay:'DLY',tapDelay:'3TAP|4TAP',chorus:'CRS',flanger:'FLNG',phaser:'PHAS',dimension:'DIMC',filter:'FILT',rotary:'ROTA',panner:'PAN',sub:'SUB',modDelay:'MODD',geq:'GEQ2|GEQ|TEQ2|TEQ',deesser:'DES2|DES',passiveEq:'P1A|P1A2',midEq:'PQ5|PQ5S',transient:'WAVD',limiter:'LIM',multiband:'CMB|CMB2',variMu:'FAC|FAC1M|FAC2',opto:'LEC|LEC2',fet:'ULC|ULC2',enhancer:'ENH2|ENH|SON',exciter:'EXC2|EXC',imager:'IMG|EDI',amp:'AMP2|AMP',tube:'DRV2|DRV',pitch:'PIT2|PIT'},
 cl:{hall:'REV-X HALL|REVERB HALL|ST REVERB',room:'REV-X ROOM|REVERB ROOM|REVERB STAGE',plate:'REV-X PLATE|REVERB PLATE',ambience:'EARLY REF.',gated:'GATE REVERB',reverse:'REVERSE GATE',monoDelay:'MONO DELAY',delay:'STEREO DELAY',modDelay:'MOD.DELAY',tapDelay:'DELAY LCR',crossDelay:'ECHO',chorus:'CHORUS',flanger:'FLANGE',ensemble:'SYMPHONIC',phaser:'PHASER',dynamicFlanger:'DYNA.FLANGE',dynamicPhaser:'DYNA.PHASER',pitch:'HQ.PITCH|DUAL PITCH',tremolo:'TREMOLO',panner:'AUTO PAN',rotary:'ROTARY',ring:'RING MOD.',filter:'MOD.FILTER',dynamicFilter:'DYNA.FILTER',multiFilter:'MULTI FILTER',sampler:'FREEZE',distortion:'DISTORTION',amp:'AMP SIMULATE',fet:'COMP276|COMP276S',vca:'COMP260|COMP260S',peq:'EQUALIZER601',tape:'OPENDECK',multiband:'M.BAND DYNA.|M.BAND COMP'},
 dm3:{plate:'R3Plate|RevHDPlate',ambience:'EarlyRef',chorus:'Chorus',room:'RevHDRoom|R3Room',tapDelay:'DelayLCR',hall:'RevHDHall|R3Hall',monoDelay:'MonoDelay',flanger:'Flange',gated:'GateReverb',ensemble:'Symphonic',crossDelay:'Echo',phaser:'Phaser',pitch:'DualPitch',delay:'StereoDelay',pingpong:'PingPongDelay'},
 dm7:{ambience:'Space Simulator|Early Ref.',hall:'Reverb Hall|Rev. R3 Hall|Rev. HD Hall',bbd:'An. Delay Modern|An. Delay Retro',delay:'Stereo Delay',monoDelay:'Mono Delay',multiband:'M. Band Comp',rotary:'Rotary Speaker',amp:'Amp Simulator',pitch:'Dual Pitch',isolator:'Isolator',room:'Reverb Room|Reverb Stage|Rev. R3 Room|Rev. HD Room',plate:'Rev. R3 Plate|Rev. HD Plate',ring:'Ring Mod.',flanger:'VCM Flanger|Classic Flanger|Flanger',tremolo:'Tremolo',dynamicRing:'Dyna. Ring Mod.',tapDelay:'Delay LCR',crossDelay:'Cross Delay|Echo',chorus:'G Chorus|Chorus',compDist:'Comp Distortion',wah:'VCM Auto Wah',panner:'Auto Pan',ensemble:'Symphonic',phaser:'Phaser',dynamicFilter:'Dyna. Filter',dynamicPhaser:'Dyna. Phaser',detune:'Ens. Detune',gated:'Gate Reverb',reverse:'Reverse Gate',synth:'Auto Synth',pingpong:'Ping Pong Delay'}
};
for(const [family,kinds]of Object.entries(groups))for(const[kind,ids]of Object.entries(kinds))add(family,kind,ids);
// Compound algorithms have their own profile: ordering is part of the function.
const compounds={
 'delay+reverb':['Répétitions et réverbération en parallèle.','Délai et réverbération en parallèle.',['delay','hall']],
 'chorus+reverb':['Chorus et réverbération en parallèle.','Chorus et réverbération en parallèle.',['chorus','hall']],
 'flanger+reverb':['Flanger et réverbération en parallèle.','Flanger et réverbération en parallèle.',['flanger','hall']],
 'delay+chorus':['Délai et chorus combinés.','Délai et chorus avec le montage d’origine.',['modDelay','delay']],
 'delay+flanger':['Délai et flanger combinés.','Délai et flanger avec le montage d’origine.',['modDelay','delay']]
};
Object.assign(FX_FUNCTIONS,compounds);
add('wing','delay+reverb','DEL/REV');
for(const [kind,id]of Object.entries({'delay+reverb':'D/RV','chorus+reverb':'CR/R','flanger+reverb':'FL/R','delay+chorus':'D/CR','delay+flanger':'D/FL'}))add('m32',kind,id);
for(const [id,kind]of Object.entries({'REV+CHORUS':'chorus+reverb','REV+FLANGE':'flanger+reverb','DELAY+REV':'delay+reverb'}))add('cl',kind,id);
for(const[id,description,fallback]of [
 ['REV->CHORUS','Réverbération suivie d’un chorus.',['chorus+reverb']],['REV->FLANGE','Réverbération suivie d’un flanger.',['flanger+reverb']],['REV+SYMPHO.','Réverbération et ensemble en parallèle.',['chorus+reverb']],['REV->SYMPHO.','Réverbération suivie d’un ensemble.',['chorus+reverb']],['REV->PAN','Réverbération suivie d’un auto-pan.',['hall']],['DELAY+ER.','Délai et premières réflexions en parallèle.',['delay+reverb']],['DELAY->ER.','Délai suivi de premières réflexions.',['delay+reverb']],['DELAY->REV','Délai suivi d’une réverbération.',['delay+reverb']],['DIST->DELAY','Distorsion suivie d’un délai.',['modDelay']]]){FX_FUNCTIONS[id]=[description,description+' Reproduire aussi l’ordre des traitements.',fallback];add('cl',id,id);}
const premiumKinds={Portico5033:'peq',Portico5043:'compressor',Portico5045:'primary',U76:'fet','Opt-2A':'opto','EQ-1A':'passiveEq',DynamicEQ:'dynamicEq',DynamicEQ4:'dynamicEq','Buss Comp 369':'busComp',BussComp369:'busComp',MBC4:'multiband','REV-X':'hall',OpenDeck:'tape','Analog Delay':'bbd',Max100:'phaser','Dual Phaser':'phaser','Vintage Phaser':'phaser','HQ.Pitch':'pitch',Equalizer601:'peq',Comp276:'fet',Comp276S:'fet',DaNSe:'suppressor'};
const wingNative=[{id:'WING_PEQ',name:'WING EQ de tranche',kind:'peq',rack:'channel',group:'CH'}];
export const fxFamily=s=>isYamaha(s)?yamahaFxFamily(s):isM32(s)?'m32':'wing';
export function effectReference(s,id,rack='fx'){
 const family=fxFamily(s),catalog=isYamaha(s)?yamahaFxCatalog(s,rack):isM32(s)?M32_FX_CATALOG:[...FX_CATALOG,...wingNative],info=catalog.find(x=>x.id===id)||catalog.find(x=>x.name.toLowerCase()===String(id).trim().toLowerCase())||(!isYamaha(s)&&!isM32(s)&&String(id).toUpperCase()==='EQ'?catalog.find(x=>x.id==='GEQ'):null);
 id=info?.id||id;
 let kind=maps[family]?.[id];if(rack==='premium')kind=premiumKinds[id.replace(/ (?:Dual|Du|St)$/,'')];
 kind=info?.kind||kind;
 const fn=FX_FUNCTIONS[kind];if(!info||!fn)return {id,name:info?.name||id,kind:'unknown',description:'Algorithme non documenté dans cette version de la référence.',replacement:'Identifier le traitement dans le manuel source avant de choisir un remplacement.',fallbacks:[],family,rack,source:FX_SOURCES[family],known:false};
 return {...info,kind,description:info.kind==='geq'?`Égaliseur graphique à ${info.bands} bandes fixes${info.maxActiveBands?`, dont ${info.maxActiveBands} réglables simultanément`:''} ; gain par bande, pas de fréquence ou Q libre.`:info.kind==='peq'?`${info.bands} bandes paramétriques ; fréquence, gain et largeur réglables, sans la modélisation analogique du Soul.`:id==='SOUL'?'EQ paramétrique analogique à quatre bandes ; Q des médiums dépendant du gain, fréquences ÷3 / ×3.':info.id==='Equalizer601'||info.id==='EQUALIZER601'?'Modélisation d’un EQ analogique des années 1970, six bandes et coloration de circuit.':fn[0],replacement:fn[1],fallbacks:fn[2],family,rack,source:FX_SOURCES[rack==='channel'&&family==='dm3'?'dm3eq':rack==='eq'&&family==='dm7'&&consoleModel(s).dm==='dm7'?'dm7eq':rack==='premium'&&family==='dm7'?'premium':isYamaha(s)&&!consoleModel(s).dm?consoleModel(s).family:consoleModel(s).dm||family],known:true,dual:info.dual||/Dual| Du$/.test(id)||family==='cl'&&rack==='fx'&&['COMP276','COMP260'].includes(id)||['GEQ2','TEQ2','DES2','P1A2','PQ5S','CMB2','FAC2','LEC2','ULC2','ENH2','EXC2','AMP2','DRV2','PIT2'].includes(id)};
}
export function referenceCatalog(s,{availableOnly=false}={}){
 const cats=isYamaha(s)?[...yamahaFxCatalog(s),...yamahaFxCatalog(s,'premium'),...yamahaFxCatalog(s,'eq'),...yamahaFxCatalog(s,'channel')]:isM32(s)?M32_FX_CATALOG:[...FX_CATALOG,...wingNative];
 return cats.map(f=>effectReference(s,f.id,f.rack||'fx')).filter(f=>!availableOnly||!f.referenceOnly&&(f.rack!=='premium'||yamahaFxCapacity(s,'premium').slots>=f.size));
}
export function matchEffect(source,target,f,{override,stereo:stereoOverride,targetKind}={}){
 const from=effectReference(source,f.model,f.rack||'fx'),all=referenceCatalog(target,{availableOnly:true}).filter(x=>!['none','external'].includes(x.kind)&&(!(targetKind||f.target)||!x.allowedTargets||x.allowedTargets.includes(targetKind||f.target)));
 const identical=fxFamily(source)===fxFamily(target);
 let candidates=from.known?all.filter(x=>x.kind===from.kind):[];
 const sourceStrip=f.target==='CH'?source?.channels?.find(c=>c.n===f.targetN):[...(source?.outputs||[]),...(source?.mixes||[])].find(m=>m.source===f.target&&m.bus===f.targetN),stereo=stereoOverride??(sourceStrip?.mode==='ST'||!!f.rightTarget);
 const rank=x=>(x.maxActiveBands?10:0)+(from.id==='SOUL'&&x.id==='Equalizer601'?-8:0)+(from.id==='SOUL'&&x.id==='EQUALIZER601'?-8:0)+(stereo&&x.inputs===1?20:0)+(identical&&x.id===from.id&&x.rack===from.rack?-100:0)+(f.rightTarget&&!x.dual?20:x.dual!==from.dual?3:0)+(x.rack==='premium'?2:0)+(x.size||1)/10;
 candidates.sort((a,b)=>rank(a)-rank(b));let status=candidates.length?'functional':'missing';
 if(!candidates.length&&from.known&&!(from.kind==='peq'&&fxFamily(target)==='m32')){for(const kind of from.fallbacks){candidates=all.filter(x=>x.kind===kind).sort((a,b)=>rank(a)-rank(b));if(candidates.length){status='approximate';break;}}}
 let to=candidates[0]||null;
 if(override==='omit'){to=null;status='omitted';}else if(override){to=all.find(x=>`${x.rack}:${x.id}`===override)||null;status=to?(to.kind===from.kind?'functional':'approximate'):'missing';}
 if(to&&identical&&to.id===from.id&&to.rack===from.rack)status='same';
 const manual=(!to&&from.known)?manualAlternative(target,from.kind):null;if(manual&&status!=='omitted')status='manual';
 let reason=status==='manual'?`Pas de remplacement automatique dans ce rack. Solution interne à reconstruire : ${manual}`:status==='same'?'Même algorithme dans la même famille de format.':status==='functional'?'Même fonction de traitement ; caractère sonore et réglages à comparer.':status==='approximate'?`Compromis : ${to.description} La fonction d’origine n’est reproduite que partiellement. ${from.replacement}`:status==='omitted'?'Effet retiré à votre demande.':`Aucun équivalent retenu dans le rack pris en charge. Vérifier les processeurs de tranche ou prévoir en plugin / matériel : ${from.replacement}`;
 if(from.id==='SOUL'&&to)reason+=' Le Soul possède quatre bandes et un Q dépendant du gain ; la fonction d’EQ est conservée, la modélisation et les courbes restent différentes.';
 return {from,to,status,reason,manualAlternative:manual,candidates:candidates.slice(0,8),parameters:status==='same'?'Conservés si une banque native compatible est disponible.':'Réglages détaillés à reconstruire dans l’éditeur cible ; les valeurs brutes ne sont pas interchangeables.'};
}

function manualAlternative(target,kind){
 if(fxFamily(target)==='m32'&&kind==='peq')return 'EQ paramétrique de tranche M32, quatre bandes sur les entrées et six sur les bus : reprendre les filtres ; pas de modélisation Soul équivalente.';
 if(fxFamily(target)==='wing')return ({fet:'76 Limiter Amp dans la dynamique de tranche.',opto:'LA Leveler dans la dynamique de tranche.',variMu:'Fair Compressor dans la dynamique de tranche.',transient:'Wave Designer dans la dynamique de tranche.',compressor:'compresseur de tranche WING.',vca:'compresseur de tranche WING ; comparer la courbe et la détection.',busComp:'compresseur de bus WING ; comparer la couleur et la liaison.'})[kind]||null;
 if(fxFamily(target)==='dm3')return ({peq:'EQ paramétrique de tranche DM3.',geq:'GEQ de sortie DM3, selon la tranche et les ressources.',compressor:'compresseur de tranche DM3.',vca:'compresseur de tranche DM3 ; caractère VCA à comparer.',fet:'compresseur de tranche DM3 ; la coloration FET reste approximative.',opto:'compresseur de tranche DM3 ; la loi optique reste approximative.',limiter:'compresseur de tranche à fort ratio ; vérifier la protection des crêtes.'})[kind]||null;
 return null;
}
