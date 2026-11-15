import {newShow,channel} from '../../src/core.js';
import {initializeGroups,setAssignment} from '../../src/groups.js';
import {consoleModel,isDM3,ioCapacity} from '../../src/consoles.js';
export function yamahaTestShow(model){
 const s=newShow('CW '+model.toUpperCase());s.model=model;s.sampleRate=48;s.danteMode='console';
 if(ioCapacity('DANTE',s))s.stageboxes=[{id:'rio1',model:'rio1608d2',name:'Plateau',unitId:1,inputStart:1,outputStart:1,inputCount:16,outputCount:8}];
 s.channels=[channel(1,{name:'VOCAL',bank:'LCL',input:3,gain:30,phantom:true,hpf:120,fader:-5,sends:{1:{on:true,level:-12,tap:'PRE'}},matrixSends:{1:{on:true,level:-18,tap:'POST'}}}),channel(3,{name:'KEYS ST',bank:s.stageboxes?.length?'SB:rio1':'LCL',input:7,mode:'ST',gain:20,fader:-10,sends:{1:{on:true,level:-8,tap:'PRE'}}})];
 s.outputs=[{id:'iem',name:'IEM ST',source:'BUS',bus:1,mode:'ST',bank:s.stageboxes?.length?'SB:rio1':'LCL',port:1,mute:true,fader:-6,tap:'PRE',matrixSends:{1:{on:true,level:-15,tap:'POST'}}},{id:'main',name:'MAIN LR',source:'MAIN',bus:1,mode:'ST',bank:'LCL',port:ioCapacity('LCL',s,true)-1,mute:true,fader:-3,tap:'POST',matrixSends:{1:{on:true,level:-10,tap:'POST'}}}];
 initializeGroups(s);if(s.groups.dca.length){s.groups.dca.at(-1).name='BAND';setAssignment(s,'CH.1','dca',s.groups.dca.length,true);}setAssignment(s,'CH.1','mute',s.groups.mute.length,true);
 return s;
}
