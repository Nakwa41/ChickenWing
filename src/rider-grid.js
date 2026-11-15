// Detect ruled tables from long, intersecting strokes. Text and stage-plan boxes
// without repeated rows do not qualify. Pure pixel geometry, used by local OCR.
export function detectTableGrids({data,width,height}){
 const ink=(x,y)=>{const i=(y*width+x)*4;return data[i+3]>80&&data[i]*.299+data[i+1]*.587+data[i+2]*.114<190;};
 const minWidth=Math.max(80,Math.round(width*.22)),strokes=[];
 for(let y=0;y<height;y++){
  let start=-1,last=-1;
  for(let x=0;x<=width;x++){
   if(x<width&&ink(x,y)){if(start<0)start=x;last=x;}
   else if(start>=0&&(x-last>2||x===width)){
    if(last-start+1>=minWidth)strokes.push({left:start,right:last,y});start=-1;last=-1;
   }
  }
 }
 const groups=[];
 for(const stroke of strokes){
  let group=groups.find(g=>Math.abs(g.left-stroke.left)<4&&Math.abs(g.right-stroke.right)<4);
  if(!group){group={left:stroke.left,right:stroke.right,lines:[]};groups.push(group);}
  const last=group.lines.at(-1);if(last&&stroke.y-last.end<=2){last.end=stroke.y;last.y=(last.start+last.end)/2;}
  else group.lines.push({start:stroke.y,end:stroke.y,y:stroke.y});
 }
 const tables=[];
 for(const group of groups){
  if(group.lines.length<4)continue;
  const distances=group.lines.slice(1).map((l,i)=>l.y-group.lines[i].y).sort((a,b)=>a-b),median=distances[Math.floor(distances.length/2)];
  const chunks=[];let chunk=[];
  for(const line of group.lines){if(chunk.length&&line.y-chunk.at(-1).y>Math.max(30,median*3)){chunks.push(chunk);chunk=[];}chunk.push(line);}chunks.push(chunk);
  for(const lines of chunks){
   if(lines.length<4)continue;
   const top=lines[0].y,bottom=lines.at(-1).y,ys=lines.map(l=>l.y),xs=[];
   if(bottom-top<25)continue;
   for(let x=Math.max(0,group.left-2);x<=Math.min(width-1,group.right+2);x++){
    let count=0;for(let y=Math.ceil(top);y<=Math.floor(bottom);y++)if(ink(x,y))count++;
    if(count/(bottom-top+1)>.75){const last=xs.at(-1);if(last&&x-last.end<=2){last.end=x;last.x=(last.start+x)/2;}else xs.push({start:x,end:x,x});}
   }
   if(xs.length<3||xs.length>17)continue;
   const columns=xs.map(c=>c.x);
   if(columns.some((x,i)=>i&&x-columns[i-1]<12))continue;
   tables.push({left:columns[0],right:columns.at(-1),top,bottom,xs:columns,ys});
  }
 }
 return tables.sort((a,b)=>a.top-b.top||a.left-b.left);
}
export function gridCell(table,row,col){
 const x=Math.ceil(table.xs[col]+2),y=Math.ceil(table.ys[row]+2);
 return {x,y,width:Math.max(1,Math.floor(table.xs[col+1]-2)-x),height:Math.max(1,Math.floor(table.ys[row+1]-2)-y)};
}
