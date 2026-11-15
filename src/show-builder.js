import {newShow,channel,uid,nextInput,validate} from './core.js';
import {pairedStereo,isYamaha,defaultBank,consoleProfile,nextFreeNumber,logicalWidth,mainOutputPort} from './consoles.js';
import {makeMix} from './routing.js';
import {resolveMic,applyMicrophone} from './microphones.js';
export function createWizardShow(w,preset){
 const s=newShow(w.name);Object.assign(s,{artist:w.artist||'',date:w.date||'',venue:w.venue||'',model:w.model||'wing',...(isYamaha(w)?{stageboxes:structuredClone(w.stageboxes||[]),sampleRate:w.sampleRate||48,danteMode:w.danteMode||'manual'}:{})});
 let cursor=1;const rows=w.preset==='empty'?Array.from({length:w.count},(_,i)=>[`Voie ${i+1}`,'','M']):preset?.rows||[];
 for(const row of rows){const mode=row[2]||'M',n=pairedStereo(s)?(mode==='ST'&&cursor%2===0?cursor+1:cursor):nextFreeNumber(s,'CH',mode);if(!n||pairedStereo(s)&&n+(mode==='ST'?1:0)>consoleProfile(s).channels)throw new Error('Le patch dépasse le nombre de voies disponibles, paires stéréo comprises.');cursor=n+(pairedStereo(s)&&mode==='ST'?2:1);const c=channel(n,{name:row[0],mic:row[1],mode,bank:w.bank||defaultBank(s),category:preset?.category||(/bass/i.test(row[0])?'Basse':/guitar|acoustic/i.test(row[0])?'Guitares':/vocal/i.test(row[0])?'Voix':/keys|playback/i.test(row[0])?'Claviers':'Batterie')});if(w.preset==='empty')c.category='Autres';c.input=nextInput(s,c.bank,c.mode);s.channels.push(c);const model=resolveMic(c.mic);if(model)applyMicrophone(s,c,model);}
 let bus=1,port=1;
 const reserve=(mode)=>{if(pairedStereo(s)&&mode==='ST'&&bus%2===0)bus++;const n=bus;bus+=logicalWidth(s,{source:'BUS',mode});return n;};
 for(let i=1;i<=w.wedges+w.iems;i++){const stereo=i>w.wedges,mode=stereo?'ST':'M';s.outputs.push({id:uid(),source:'BUS',bus:reserve(mode),name:stereo?`IEM ${i-w.wedges}`:`Wedge ${i}`,type:stereo?'IEM':'Wedge',mode,bank:w.outBank||defaultBank(s),port,tap:'PRE',mute:true,fader:-144});port+=stereo?2:1;}
 for(const [count,type,label]of [[w.groups,'Groupe','Groupe'],[w.fxBuses,'FX','FX'],[w.extraBuses,'Autre','Bus libre']])for(let i=1;i<=count;i++)s.mixes.push(makeMix('BUS',reserve(pairedStereo(s)?'M':'ST'),{name:`${label} ${i}`,type,mode:pairedStereo(s)?'M':'ST',tap:type==='Groupe'?'GRP':'POST'}));
 if(w.mainLR)s.outputs.push({id:uid(),source:'MAIN',bus:1,name:'Main LR',type:'Main',mode:'ST',bank:'LCL',port:mainOutputPort(s),tap:'POST',mute:true,fader:-144});
 const errors=validate(s).filter(i=>i.level==='error');if(errors.length)throw new Error(errors.map(i=>i.text).join('\n'));return s;
}
