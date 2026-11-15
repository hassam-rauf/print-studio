'use strict';

const products = {
  mug: {name:'Ceramic Mug', label:'Mugs', type:'mug', price:2900, surfaces:['Wrap'], inches:[8.5,3.5], intro:'Design a ceramic mug with a full print wrap and your choice of handle color.'},
  tumbler: {name:'Insulated Tumbler', label:'Tumblers', type:'tumbler', price:6900, surfaces:['Wrap'], inches:[9.3,7.5], intro:'Personalize a stainless steel tumbler with artwork that wraps around the body.'},
  shirt: {name:'Classic T-Shirt', label:'T-shirts', type:'shirt', price:4900, surfaces:['Front','Back'], inches:[11,14], intro:'Print original artwork on the front and back of a cotton crew neck.'},
  bag: {name:'Canvas Tote Bag', label:'Bags', type:'bag', price:3900, surfaces:['Front','Back'], inches:[10,10], intro:'Customize both sides of a reusable cotton canvas tote.'},
  keychain: {name:'Acrylic Keychain', label:'Keychains', type:'keychain', price:1900, surfaces:['Front','Back'], inches:[2,2], intro:'Design both sides of a lightweight acrylic keychain.'},
  photo: {name:'Sunday Photo Card', type:'card', price:600, color:'#f7e9dc', surfaces:['Front','Back'], inches:[5,7], intro:'A front photo and a message on the reverse.'},
  note: {name:'Garden Note Card', type:'card', price:500, color:'#e7ecdb', surfaces:['Front','Back'], inches:[5,7], intro:'A two-sided note with an editable greeting.'}
};
const colorways = {White:'#f6f4ee', Ivory:'#f0e7d4', Black:'#282832', Cobalt:'#3856aa', Forest:'#285243', Natural:'#d6bf95', Blush:'#e6b9b0', Clear:'#d7e7ed'};
const optionSets = {
  mug:{Style:{'Two-tone':0,'Classic':-100},Size:{'11 oz':0,'15 oz':350},Color:{Forest:0,Cobalt:0,Black:0},Finish:{'Glossy white':0,'Warm ivory':150}},
  tumbler:{Size:{'20 oz':0,'30 oz':600},Color:{White:0,Cobalt:0,Black:0},Finish:{Matte:0,Gloss:200}},
  shirt:{Size:{XS:0,S:0,M:0,L:0,XL:100,'2XL':250},Color:{White:0,Black:0,Cobalt:0,Blush:0},Fabric:{Cotton:0,'Heavyweight cotton':400}},
  bag:{Size:{Standard:0,Large:350},Color:{Natural:0,Black:0,White:0},Fabric:{Canvas:0,'Heavy canvas':300}},
  keychain:{Shape:{Circle:0,Square:0,Rectangle:100},Size:{'2 in':0,'2.5 in':200},Color:{Clear:0,White:0},Hardware:{Silver:0,Gold:150}},
  card:{Size:{'5 × 7 in':0,'4 × 6 in':-20},Paper:{Matte:0,Linen:59},Corners:{Square:0,Rounded:20},Envelopes:{White:0,None:-10},Printing:{Standard:0,HD:40}}
};
const productViews = {
  mug:[['Left',-90],['Front Left',-45],['Center',0],['Front Right',45],['Right',90],['Handle',180],['With Donut',35]],
  tumbler:[['Left',-90],['Front Left',-45],['Center',0],['Front Right',45],['Right',90],['Back',180],['With Lid',15]],
  shirt:[['Front',0],['Back',1],['Print Detail',0]],
  bag:[['Front',0],['Back',1],['Print Detail',0]],
  keychain:[['Front',0],['Back',1],['Print Detail',0]],
  card:[['Front',0],['Back',1]]
};
const catalogKeys = Object.keys(products).filter(key=>products[key].label);
const productFor = doc => products[doc.key];
const isWrap = doc => productFor(doc).surfaces.length===1;
const viewsFor = doc => productViews[productFor(doc).type];
const defaultView = doc => isWrap(doc)?'Center':'Front';
function availableOptions(doc){
  const choices=optionSets[productFor(doc).type];
  if(doc.key!=='mug'||doc.options.Style!=='Classic')return choices;
  return {...choices,Color:{White:0}};
}
function inchesFor(doc) {
  const size=doc.options.Size;
  if(doc.key==='mug'&&size==='15 oz')return [9,4];
  if(doc.key==='tumbler'&&size==='30 oz')return [10,8];
  if(doc.key==='bag'&&size==='Large')return [12,12];
  if(doc.key==='keychain'){
    const edge=size==='2.5 in'?2.5:2;
    return [edge,doc.options.Shape==='Rectangle'?edge*.7:edge];
  }
  if(productFor(doc).type==='card'&&size==='4 × 6 in')return [4,6];
  return productFor(doc).inches;
}
function artGeometry(doc) {
  if(doc.key==='mug'&&!doc.options.Style)return [400,190];
  const [w,h]=inchesFor(doc);
  return [400,Math.round(400*h/w)];
}
function layerName(item){
  if(item.kind==='photo')return item.name||'Image';
  if(item.kind==='shape')return item.shape;
  return item.text||'Text';
}
// Sample amounts in fils for the approval preview.
const emirateDelivery = {
  Dubai:1500, 'Abu Dhabi':2200, Sharjah:1800, Ajman:1800,
  'Umm Al Quwain':2500, 'Ras Al Khaimah':2500, Fujairah:2500
};
const expressSurcharge=1500, designReviewPrice=1500;
const whatsappUrl='https://wa.me/971566344539';
const storageKey = 'print-studio-v1';
const byId = id => document.getElementById(id);
const id = () => crypto.randomUUID();
const clone = value => structuredClone(value);
const aedAmounts=new Intl.NumberFormat('en-AE',{minimumFractionDigits:2,maximumFractionDigits:2});
const money = fils => 'AED '+aedAmounts.format(fils/100);
const safe = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (label,action,data='',extra='') => '<button type="button" data-action="'+action+'" data-value="'+safe(data)+'" '+extra+'>'+safe(label)+'</button>';
const app = byId('app');
let state = {cart:[], saved:[], orders:[], draft:null, promo:false, emirate:''};
try { state={...state,...JSON.parse(localStorage.getItem(storageKey))}; } catch {}
let page='landing', design, side=0, step='Design', selected=null, preview=null, filter='', search='';
let undo=[], redo=[], editingId=null, noticeTimer, drag=null, address=null, delivery='Standard', protection=false;

const historyApi=window.history;
let activeTool='Templates',activeView='Center',zoom=100,showGuides=true,showGrid=false,showRuler=true,snapToGrid=false,saveStatus='Draft';
let giftMessage='';
let toolPanelOpen=false;
const mobileEditor=window.matchMedia('(max-width: 780px)');
function notify(message) {
  byId('notice').textContent=message;
  clearTimeout(noticeTimer);
  noticeTimer=setTimeout(()=>byId('notice').textContent='',3500);
}
function persist(next=state) {
  try {localStorage.setItem(storageKey,JSON.stringify(next)); state=next; return true;}
  catch {notify('Browser storage is full. Remove unused designs or use a smaller image.'); return false;}
}
function layer(text,x=200,y=150,size=34) {
  return {id:id(),kind:'text',text,x,y,size,rotation:0,color:'#284234',font:'Georgia',bold:false,hidden:false,locked:false};
}
function fresh(key, sample=false) {
  const p=products[key];
  const surfaces=p.surfaces.map(()=>[]);
  const options=Object.fromEntries(Object.entries(optionSets[p.type]).map(([name,values])=>[name,Object.keys(values)[0]]));
  if(p.type==='shirt') options.Size='M';
  const doc={key,surfaces,backgrounds:surfaces.map(()=>p.color||'transparent'),options,quantity:1};
  if(key==='photo'){
    surfaces[0].push({id:id(),kind:'photo',x:200,y:180,size:260,rotation:0,src:null},layer('The Taylor Family',200,389,36),layer('Warm wishes',200,445,24));
    surfaces[1].push(layer('A little note from us to you.',200,228,24));
  }
  if(key==='note'){
    surfaces[0].push(layer('Thinking of you',200,229,42),layer('With love',200,294,27));
    surfaces[1].push(layer('A little note from us to you.',200,228,24));
  }
  if(sample) applyTemplate(doc,'morning');
  return doc;
}
function applyTemplate(doc,name){
  const [w,h]=dimensions(doc);
  const themes={morning:['The Morning Club','#184a36','✦'],coast:['COASTAL CLUB','#244bc7','☀'],made:['Made for you','#9c3654','♥']};
  const [copy,color,symbol]=themes[name];
  const centers=isWrap(doc)?[w*.13,w/2,w*.87]:[w/2];
  doc.backgrounds=doc.surfaces.map(()=> 'transparent');
  delete doc.backgroundImages;
  doc.surfaces=doc.surfaces.map((_,index)=>centers.flatMap(x=>[
    {...layer(symbol,x,h*.38,Math.min(33,h*.23)),color},
    {...layer(index?'EST. 2026':copy,x,h*.56,isWrap(doc)?21:36),font:'Instrument Serif',color}
  ]));
}
function unit(doc) {
  return productFor(doc).price+Object.entries(availableOptions(doc)).reduce((sum,[name,choices])=>sum+(choices[doc.options[name]]??0),0);
}
function dimensions(doc){return artGeometry(doc);}
function geometry(item) {
  if(item.kind==='photo') return [item.size,item.size*(item.aspect||1)];
  if(item.kind==='shape') return [item.size,item.size*(item.shape==='Line'?.07:1)];
  const lines=item.orientation==='Vertical'?Array.from(item.text):item.text.split('\n');
  return [Math.max(item.size,...lines.map(line=>measureLine(line,item))), item.size*((lines.length-1)*(item.leading||1.16)+1.25)+Math.abs(item.curve||0)];
}
const measureContext=document.createElement('canvas').getContext('2d');
function measureLine(text,item){
  measureContext.font=(item.italic?'italic ':'')+(item.bold?'700 ':'400 ')+item.size+'px "'+item.font+'"';
  return measureContext.measureText(text).width+Math.max(0,text.length-1)*(item.spacing||0);
}
function shapeMarkup(shape,w,h,color){
  const fill=' fill="'+safe(color)+'"';
  if(shape==='Circle')return '<ellipse rx="'+w/2+'" ry="'+h/2+'"'+fill+'/>';
  if(shape==='Triangle')return '<polygon points="0,'+(-h/2)+' '+w/2+','+h/2+' '+(-w/2)+','+h/2+'"'+fill+'/>';
  return '<rect x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'" rx="'+(shape==='Rounded square'?w*.16:0)+'"'+fill+'/>';
}
function layerArtwork(item,scope,edit){
  const [w,h]=geometry(item);
  const common=' fill="'+safe(item.color)+'"';
  const target=edit?' data-layer="'+safe(item.id)+'"':'';
  const flip=' scale('+(item.flipX?-1:1)+' '+(item.flipY?-1:1)+')';
  let inside='';
  if(item.kind==='shape')inside=shapeMarkup(item.shape,w,h,item.color);
  if(item.kind==='photo'){
    const box=' x="'+(-w/2)+'" y="'+(-h/2)+'" width="'+w+'" height="'+h+'"';
    if(!item.src)inside='<rect'+box+' fill="#dbe5f3"/><text y="0" text-anchor="middle" fill="#455778" font-size="18">Replace sample photo</text>';
    else{
      const clip='clip-'+scope+'-'+item.id;
      const zoom=item.cropZoom||1, offsetX=(item.cropX||0)*w/100, offsetY=(item.cropY||0)*h/100;
      const effects={Mono:'grayscale(1)',Sepia:'sepia(1)',Cool:'saturate(.75) hue-rotate(12deg)',Vivid:'saturate(1.45)'};
      inside='<defs><clipPath id="'+clip+'"><rect'+box+'/></clipPath></defs><g clip-path="url(#'+clip+')"><image href="'+safe(item.src)+'" x="'+(-w*zoom/2+offsetX)+'" y="'+(-h*zoom/2+offsetY)+'" width="'+w*zoom+'" height="'+h*zoom+'" preserveAspectRatio="xMidYMid '+(item.fit==='Fit'?'meet':'slice')+'" style="filter:'+(effects[item.filter]||'none')+'"/></g>';
    }
  }
  if(item.kind==='text'){
    const anchor={Left:'start',Center:'middle',Right:'end'}[item.align]||'middle';
    const x={start:-w/2,middle:0,end:w/2}[anchor];
    const attr=common+' font-family="'+safe(item.font)+'" font-size="'+item.size+'" text-anchor="'+anchor+'" font-weight="'+(item.bold?700:400)+'" font-style="'+(item.italic?'italic':'normal')+'" letter-spacing="'+(item.spacing||0)+'"'+(item.stroke?' stroke="'+safe(item.strokeColor||'#ffffff')+'" stroke-width="1.6" paint-order="stroke"':'')+(item.shadow?' style="filter:drop-shadow(2px 3px 2px #11182766)"':'');
    if(item.curve&&!item.text.includes('\n')){
      const path='curve-'+scope+'-'+item.id;
      inside='<path id="'+path+'" d="M '+(-w/2)+' 0 Q 0 '+(-item.curve)+' '+w/2+' 0" fill="none"/><text'+attr.replace('text-anchor="'+anchor+'"','text-anchor="middle"')+'><textPath href="#'+path+'" startOffset="50%">'+safe(item.text)+'</textPath></text>';
    }else{
      const lines=item.orientation==='Vertical'?Array.from(item.text):item.text.split('\n');
      inside='<text'+attr+'>'+lines.map((part,i)=>'<tspan x="'+x+'" dy="'+(i?(item.leading||1.16):0)+'em">'+safe(part)+'</tspan>').join('')+'</text>';
    }
  }
  const isSelected=edit&&selected===item.id;
  const y=item.kind==='text'?-item.size:-h/2;
  const bounds=' x="'+(-w/2)+'" y="'+y+'" width="'+w+'" height="'+h+'"';
  const handles=isSelected?'<rect'+bounds+' fill="none" stroke="#134bff" stroke-width="1.5" pointer-events="none"/>'+
    [[-w/2,y],[w/2,y],[-w/2,y+h],[w/2,y+h]].map(([x,hy])=>'<rect x="'+(x-3)+'" y="'+(hy-3)+'" width="6" height="6" fill="white" stroke="#134bff" data-resize="true"/>').join(''):'';
  return '<g'+target+' transform="translate('+item.x+' '+item.y+') rotate('+item.rotation+')"><g transform="'+flip.trim()+'" opacity="'+((item.opacity??100)/100)+'">'+inside+'</g>'+(edit?'<rect'+bounds+' fill="transparent" pointer-events="all"/>':'')+handles+'</g>';
}
function composition(doc,index,scope,edit){
  const [w,h]=dimensions(doc);
  const background=doc.backgrounds[index];
  return '<rect width="'+w+'" height="'+h+'" fill="'+safe(background)+'"/>'+
    (doc.backgroundImages?.[index]?'<image href="'+safe(doc.backgroundImages[index])+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid slice"/>':'')+
    doc.surfaces[index].filter(item=>!item.hidden).map(item=>{
      const mode=item.tile;
      if(!mode||mode==='None')return layerArtwork(item,scope,edit);
      const [width,height]=geometry(item);
      const dx=Math.max(35,width+18),dy=Math.max(22,height+18);
      const pattern='tile-'+scope+'-'+item.id;
      const motif={...item,x:dx/2,y:dy/2,tile:'None'};
      const lower={...motif,x:dx*(mode==='Half Brick'?1:.5),y:dy*1.5,flipX:mode==='Mirror'?!motif.flipX:motif.flipX};
      if(mode==='Half Drop'){lower.x=dx*1.5;lower.y=dy;}
      const patternW=mode==='Half Drop'?dx*2:dx,patternH=mode==='Half Drop'?dy:dy*2;
      return '<defs><pattern id="'+pattern+'" patternUnits="userSpaceOnUse" width="'+patternW+'" height="'+patternH+'" x="'+(item.x-dx/2)+'" y="'+(item.y-dy/2)+'">'+layerArtwork(motif,scope+'a',false)+layerArtwork(lower,scope+'b',false)+'</pattern></defs><rect width="'+w+'" height="'+h+'" fill="url(#'+pattern+')" pointer-events="none"/>'+(edit?layerArtwork(item,scope,edit):'');
    }).join('');
}
let svgSerial=0;
function art(doc,index=0,edit=false) {
  const [w,h]=dimensions(doc);
  const scope='art'+(++svgSerial);
  const [inchWidth,inchHeight]=inchesFor(doc);
  const outputWidth=edit?w:inchWidth+'in',outputHeight=edit?h:inchHeight+'in';
  const guides=edit&&showGuides?'<rect class="guide" x="1" y="1" width="'+(w-2)+'" height="'+(h-2)+'" fill="none" stroke="#f59e8b"/><rect class="guide" x="8" y="8" width="'+(w-16)+'" height="'+(h-16)+'" fill="none" stroke="#4575db"/><rect class="guide" x="22" y="22" width="'+(w-44)+'" height="'+(h-44)+'" fill="none" stroke="#239d70" stroke-dasharray="6 4"/>':'';
  return '<svg class="art" role="img" aria-label="'+(edit?'Editable design canvas':'Product artwork')+'" width="'+outputWidth+'" height="'+outputHeight+'" viewBox="0 0 '+w+' '+h+'" xmlns="http://www.w3.org/2000/svg">'+composition(doc,index,scope,edit)+guides+'</svg>';
}
function planar(doc,view){
  const type=productFor(doc).type, index=view==='Back'?1:0;
  if(type==='card')return art(doc,index);
  const scope='flat'+(++svgSerial), [w,h]=dimensions(doc);
  const color=colorways[doc.options.Color]||colorways.White;
  const outline={
    shirt:'M119 61 L149 52 Q170 83 191 52 L221 61 L284 109 L249 155 L224 139 L226 281 L114 281 L116 139 L91 155 L56 109 Z',
    bag:'M75 99 L265 99 L250 275 Q170 292 90 275 Z',
    keychain:doc.options.Shape==='Circle'?'M171 95 A90 90 0 1 1 170 275 A90 90 0 0 1 171 95 Z':
      'M90 109 Q90 98 101 98 L239 98 Q250 98 250 109 L250 '+(doc.options.Shape==='Rectangle'?237:258)+' Q250 '+(doc.options.Shape==='Rectangle'?248:269)+' 239 '+(doc.options.Shape==='Rectangle'?248:269)+' H101 Q90 '+(doc.options.Shape==='Rectangle'?248:269)+' 90 '+(doc.options.Shape==='Rectangle'?237:258)+' Z'
  }[type];
  const hw=doc.options.Hardware==='Gold'?'#bc9b54':'#929da9';
  const extra=type==='bag'?'<path d="M112 108 V69 Q112 27 170 27 Q228 27 228 69 V108" fill="none" stroke="'+color+'" stroke-width="16"/><path d="M94 108 H246" stroke="#75684c58" stroke-width="2"/>':
    type==='keychain'?'<circle cx="170" cy="67" r="29" fill="none" stroke="'+hw+'" stroke-width="7"/><circle cx="170" cy="95" r="13" fill="none" stroke="'+hw+'" stroke-width="5"/>':
    '<path d="M149 53 Q170 '+(index?69:88)+' 191 53" fill="none" stroke="#18283e36" stroke-width="4"/>';
  const size=type==='shirt'?[108,132]:type==='bag'?[140,140]:[160,doc.options.Shape==='Rectangle'?112:160];
  const x=(340-size[0])/2,y=type==='keychain'?106:125;
  const transform=view==='Print Detail'?' translate(-43,-46) scale(1.26)':'';
  return '<svg class="product-svg" viewBox="0 0 340 320" role="img" aria-label="'+safe(productFor(doc).name+' '+view)+'" xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="'+scope+'"><path d="'+outline+'"/></clipPath><linearGradient id="'+scope+'Shade"><stop stop-color="#000000" stop-opacity=".21"/><stop offset=".48" stop-color="#ffffff" stop-opacity=".13"/><stop offset="1" stop-color="#000000" stop-opacity=".10"/></linearGradient></defs><ellipse cx="170" cy="283" rx="105" ry="14" fill="#1a2b531a"/><g transform="'+transform+'"><path d="'+outline+'" fill="'+color+'"/>'+extra+'<g clip-path="url(#'+scope+')"><g transform="translate('+x+' '+y+') scale('+(size[0]/w)+' '+(size[1]/h)+')">'+composition(doc,index,scope,false)+'</g></g><path d="'+outline+'" fill="url(#'+scope+'Shade)" stroke="#34425f22"/></g></svg>';
}

const mockPhotos={
  mug:{
    Center:[0,0], Left:[5,-95], 'Front Left':[6,-48], 'Front Right':[7,45],
    Right:[8,95], Handle:[9,180], 'With Donut':[10,0]
  },
  tumbler:{
    Center:[1,0], Left:[12,-95], 'Front Left':[12,-48], 'Front Right':[13,48],
    Right:[19,95], Back:[14,180], 'With Lid':[15,0]
  },
  shirt:{Front:[2,102,280,86,293],Back:[11,101,284,83,290]},
  bag:{Front:[3,111,274,134,298],Back:[18,93,288,138,303]},
  keychain:{Front:[4,108,278,143,312],Back:[4,108,278,143,312]}
};

// Left/right limits of the printable band, in photo pixels. Each row contains
// the top edge and the bottom edge as [left x, right x, left y, right y, bow].
const wrapBands={
  0:[[107,261,96,97,8],[108,259,263,263,17]],
  1:[[128,256,69,69,7],[142,240,277,277,12]],
  5:[[130,297,66,62,8],[131,296,258,258,19]],
  6:[[129,297,75,69,12],[129,296,257,257,20]],
  7:[[86,256,66,65,13],[89,255,258,258,19]],
  8:[[102,272,65,65,11],[104,272,270,270,17]],
  9:[[110,278,65,63,10],[111,277,267,267,19]],
  10:[[154,295,99,98,9],[155,294,246,246,15]],
  12:[[113,269,73,58,12],[134,247,287,287,14]],
  13:[[117,269,55,69,13],[137,250,287,287,14]],
  14:[[116,269,66,66,5],[135,250,287,287,14]],
  15:[[100,281,117,114,51],[137,247,290,285,20]],
  19:[[119,269,66,66,5],[134,255,286,286,13]]
};
function bandPoint([left,right,yLeft,yRight,bow],pos){
  return [left+(right-left)*pos,yLeft+(yRight-yLeft)*pos+4*bow*pos*(1-pos)];
}
const svgNum=value=>Number(value.toFixed(4));
function wrapProjection(w,h,scope,cell,angle,mini){
  const [top,bottom]=wrapBands[cell];
  const circumference=w, phase=.5+angle/360;
  const stripCount=mini?12:44;
  return Array.from({length:stripCount},(_,i)=>{
    const from=i/stripCount,to=(i+1)/stripCount,mid=(from+to)/2;
    const source=u=>circumference*(phase+Math.asin(2*u-1)/(2*Math.PI));
    const start=source(from),end=source(to),center=(start+end)/2;
    const [tx,ty]=bandPoint(top,mid), [bx,by]=bandPoint(bottom,mid);
    const lo=Math.max(0,from-.22/(top[1]-top[0]));
    const hi=Math.min(1,to+.22/(top[1]-top[0]));
    const quad=[bandPoint(top,lo),bandPoint(top,hi),bandPoint(bottom,hi),bandPoint(bottom,lo)];
    const sx=Math.max(top[1]-top[0],bottom[1]-bottom[0])*(to-from)/(end-start);
    const sy=(by-ty)/h, shear=(bx-tx)/h;
    const rise=(bandPoint(top,to)[1]-bandPoint(top,from)[1]+bandPoint(bottom,to)[1]-bandPoint(bottom,from)[1])/2;
    const slope=rise/(end-start);
    const clip=scope+'Strip'+i;
    let copies='';
    // Only reference artwork periods that contribute to this strip. At the
    // seam both are cropped to the printable sheet before they meet.
    for(let turn=Math.floor((start-.5)/w);turn<=Math.floor((end+.5)/w);turn++){
      const offset=turn*w-center;
      const matrix=[sx,slope,shear,sy,tx+sx*offset,ty+slope*offset].map(svgNum).join(' ');
      copies+='<use href="#'+scope+'Artwork" transform="matrix('+matrix+')"/>';
    }
    return '<clipPath id="'+clip+'"><polygon points="'+quad.map(point=>point.map(svgNum).join(',')).join(' ')+'"/></clipPath><g clip-path="url(#'+clip+')">'+copies+'</g>';
  }).join('');
}

function variantTint(doc,view,cell){
  const type=doc.key, color=colorways[doc.options.Color];
  const shapeMasks={
    shirt:{2:'M32 89 L97 47 L149 27 Q190 45 234 24 L286 47 L349 91 L311 145 L285 130 L295 316 L86 316 L93 131 L68 145 Z',11:'M33 86 L99 42 L151 17 Q192 36 233 17 L288 42 L350 86 L313 140 L287 127 L295 316 L85 316 L94 127 L69 139 Z'},
    bag:{3:'M100 124 H284 V311 H100 Z',18:'M82 124 H303 V322 H82 Z'},
    tumbler:{1:'M127 74 H257 L240 283 Q193 304 142 283 Z',12:'M110 82 H267 L251 303 Q192 330 130 303 Z',13:'M114 82 H273 L251 303 Q195 330 137 303 Z',14:'M114 69 H271 L252 305 Q190 329 130 305 Z',15:'M94 150 Q181 196 283 141 L252 298 Q190 337 130 291 Z',19:'M118 65 H270 L257 305 Q193 330 130 300 Z'}
  };
  const mask=shapeMasks[type]?.[cell];
  if(type==='keychain'){
    const faces={
      4:'<ellipse cx="193" cy="227" rx="85" ry="84" />',
      16:'<rect x="106" y="148" width="176" height="154" rx="22" />',
      17:'<rect x="143" y="133" width="211" height="84" rx="18" />'
    };
    const rings={4:[193,72,53,53],16:[193,72,53,51],17:[66,174,48,46]};
    const face=doc.options.Color==='White'?'<g fill="#fff" opacity=".56">'+faces[cell]+'</g>':'';
    if(doc.options.Hardware!=='Gold')return face;
    const [cx,cy,rx,ry]=rings[cell];
    return face+'<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="none" stroke="#bb8f38" stroke-width="4" opacity=".75"/>';
  }
  const tintWhite=type==='bag'&&doc.options.Color==='White';
  const tinted=mask&&color&&(tintWhite||!['White','Natural'].includes(doc.options.Color))?
    '<path d="'+mask+'" fill="'+(tintWhite?'#fff':color)+'" opacity="'+(tintWhite?.5:.74)+'"/>':'';
  if(type!=='mug')return tinted;
  const [top,bottom]=wrapBands[cell];
  const body=doc.options.Finish==='Warm ivory'
    ?'<path d="M'+top[0]+' '+top[2]+' Q'+((top[0]+top[1])/2)+' '+((top[2]+top[3])/2+top[4]*2)+' '+top[1]+' '+top[3]+
      ' L'+bottom[1]+' '+bottom[3]+' Q'+((bottom[0]+bottom[1])/2)+' '+((bottom[2]+bottom[3])/2+bottom[4]*2)+' '+bottom[0]+' '+bottom[2]+
      ' Z" fill="#efcf8c" opacity=".29"/>':'';

  if(doc.options.Style==='Classic'||doc.options.Color==='Black'||doc.options.Color==='Cobalt'){
    const rim={0:[185,89,80,14],5:[211,54,83,12],6:[210,67,84,21],7:[167,61,83,19],8:[186,61,85,16],9:[193,59,86,16],10:[224,89,71,11]}[cell];
    const handles={0:'M267 111 C337 110 350 237 267 243',5:'M123 84 C49 80 34 211 123 231',6:'M126 83 C58 82 34 211 126 228',7:'M253 86 C342 74 360 232 253 236',8:'M272 95 C342 88 336 233 272 242',9:'M192 99 V254',10:'M294 110 C363 104 367 211 294 223'};
    const tintColor=doc.options.Style==='Classic'?'#e1dfd8':color;
    return body+'<ellipse cx="'+rim[0]+'" cy="'+rim[1]+'" rx="'+rim[2]+'" ry="'+rim[3]+'" fill="'+tintColor+'" opacity=".83"/><path d="'+handles[cell]+'" stroke="'+tintColor+'" opacity=".83" stroke-width="'+(view==='Handle'?32:13)+'" fill="none" stroke-linecap="round"/>';
  }
  return body;
}
function previewSurface(doc,view,detailSide=0){
  if(isWrap(doc))return 0;
  if(view==='Print Detail')return detailSide===1?1:0;
  return view==='Back'?1:0;
}
function photoProduct(doc,view,mini,detailSide){
  const type=doc.key, photos=mockPhotos[type];
  const viewIndex=previewSurface(doc,view,detailSide);
  const surfaceView=view==='Print Detail'?productFor(doc).surfaces[viewIndex]:view;
  const keychainShape={Square:[16,106,282,148,302],Rectangle:[17,143,354,133,217]};
  const mapping=type==='keychain'?keychainShape[doc.options.Shape]:null;
  const [cell,x0,x1,y0,y1]=mapping||photos[surfaceView]||photos[defaultView(doc)];
  const [w,h]=dimensions(doc), scope='proof'+(++svgSerial);
  let artwork='';
  if(isWrap(doc)){
    artwork=wrapProjection(w,h,scope,cell,x0,mini);
  }else{
    // Keep typography and images proportional within the photo's print area.
    const cx=(x0+x1)/2,cy=(y0+y1)/2,scale=Math.min((x1-x0)/w,(y1-y0)/h);
    const inset=type==='keychain'&&doc.options.Shape==='Circle'
      ?'<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+((x1-x0)/2)+'" ry="'+((y1-y0)/2)+'"/>'
      :'<rect x="'+x0+'" y="'+y0+'" width="'+(x1-x0)+'" height="'+(y1-y0)+'"/>';
    artwork='<clipPath id="'+scope+'Face">'+inset+'</clipPath><g clip-path="url(#'+scope+'Face)"><use href="#'+scope+'Artwork" transform="translate('+(cx-w*scale/2)+' '+(cy-h*scale/2)+') scale('+scale+')"/></g>';
  }
  const occlusion=type==='mug'&&view==='Handle'?'<mask id="'+scope+'Handle"><rect width="384" height="341" fill="white"/><rect x="172" y="92" width="44" height="179" rx="21" fill="black"/></mask>':'';
  const detail=view==='Print Detail'?' detail':'';
  const label=productFor(doc).name+' '+(detail?surfaceView+' ': '')+view;
  const sheet='<clipPath id="'+scope+'Sheet"><rect width="'+w+'" height="'+h+'"/></clipPath>';
  const tint=variantTint(doc,surfaceView,cell);
  const tintLayer=tint?'<svg class="variant-tint" viewBox="0 0 384 341" aria-hidden="true">'+tint+'</svg>':'';
  return '<div class="photo-proof'+detail+'" role="img" aria-label="'+safe(label)+'"><div class="photo-composite photo-cell-'+cell+'">'+tintLayer+'<svg viewBox="0 0 384 341" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>'+sheet+'<g id="'+scope+'Artwork" clip-path="url(#'+scope+'Sheet)">'+composition(doc,viewIndex,scope,false)+'</g>'+occlusion+'</defs><g'+(occlusion?' mask="url(#'+scope+'Handle)"':'')+'>'+artwork+'</g></svg></div></div>';
}
function productImage(doc,view=defaultView(doc),mini=false,detailSide=0){
  if(mockPhotos[doc.key])return photoProduct(doc,view,mini,detailSide);
  return planar(doc,view);
}
function mockup(doc,index=0,view=isWrap(doc)?'Center':productFor(doc).surfaces[index]) {
  return '<div class="stage product-stage">'+productImage(doc,view,false,index)+'</div>';
}

function openDesign(doc,line=null,initial='Design') {
  design=clone(doc); editingId=line; side=0; selected=null; undo=[]; redo=[]; step=initial;
  activeTool='Templates'; activeView=defaultView(design); zoom=100; toolPanelOpen=false;
  saveStatus='Draft';saveDraft();go('editor',design.key);
}
function saveDraft() {
  const saved=persist({...state,draft:{design:clone(design),editingId}});
  saveStatus=saved?'Saved':'Unsaved';
  if(byId('save-status'))byId('save-status').textContent=saveStatus;
  return saved;
}
function change(apply,redraw=true) {
  undo.push(clone(design));
  if(undo.length>30)undo.shift();
  redo=[];apply();saveDraft();
  if(redraw)render();
}
function applyHistory(from,to){
  if(!from.length)return;
  to.push(clone(design));
  design=from.pop();saveDraft();render();
}
function input(label,attrs){return '<label>'+label+'<input '+attrs+'></label>';}
function currentLayer(){return design.surfaces[side].find(item=>item.id===selected);}
function quantityInput(){return input('Quantity','id="quantity" type="number" min="1" max="999" value="'+design.quantity+'"');}
function designPrice(){return money(unit(design)*design.quantity)+' · '+money(unit(design))+' each';}
function layerBounds(item,w,h){
  const y=item.kind==='text'?-item.size:-h/2;
  const r=item.rotation*Math.PI/180, c=Math.cos(r), s=Math.sin(r);
  const corners=[[-w/2,y],[w/2,y],[-w/2,y+h],[w/2,y+h]];
  const xs=corners.map(([x,y])=>item.x+x*c-y*s), ys=corners.map(([x,y])=>item.y+x*s+y*c);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
}
function issues(){
  const result=[];
  const [w,h]=dimensions(design), [inches]=inchesFor(design);
  design.surfaces.forEach((items,index)=>items.forEach(item=>{
    if(item.hidden)return;
    if(item.kind==='photo'&&!item.src)result.push({index,item,message:'Replace the sample photo'});
    const [lw,lh]=geometry(item);
    const bounds=layerBounds(item,lw,lh);
    if(!item.tile||item.tile==='None'){
      if(bounds.minX<22||bounds.minY<22||bounds.maxX>w-22||bounds.maxY>h-22)
        result.push({index,item,message:'Artwork extends outside the safe area'});
    }
    if(item.kind==='photo'&&item.src&&item.pixels/(lw/w*inches)<150)
      result.push({index,item,message:'Image may print at low resolution'});
  }));
  return result;
}

function productTiles(keys){
  return keys.map(key=>{
    const sample=fresh(key,true);
    const lowest=products[key].price+Object.values(availableOptions(sample)).reduce((total,choices)=>total+Math.min(...Object.values(choices)),0);
    return '<article class="tile">'+button('', 'product',key,'class="tile-media" aria-label="'+products[key].name+'"').replace('></button>','>'+productImage(sample,defaultView(sample),true)+'</button>')+
      '<div class="tile-info"><h2>'+products[key].name+'</h2><span>From '+money(lowest)+'</span>'+button('Customize','product',key,'class="tile-action"')+'</div></article>';
  }).join('');
}
function landing(){
  return '<section class="landing-hero"><div class="landing-copy"><p class="eyebrow">Al Nafees Custom Studio</p><h1>Your design.<br><em>Your product.</em></h1><p>Personalize mugs, tumblers, T-shirts, totes and keychains with your own photo, logo or message. See how it looks before you order.</p><div class="row">'+button('Shop products','catalog','','class="primary"')+button('Design a mug','product','mug')+'</div></div><div class="hero-photo" role="img" aria-label="A personalized mug, tumbler, canvas bag, T-shirt, and keychain"></div></section>'+
    '<section class="landing-products"><div class="section-head"><h2>Choose a product</h2>'+button('View all','catalog')+'</div><div class="grid">'+productTiles(catalogKeys)+'</div></section>';
}
function catalog(){
  const matches=catalogKeys.filter(key=>(!filter||filter===key)&&products[key].name.toLowerCase().includes(search.toLowerCase()));
  return '<section class="page-title"><h1>Shop custom products</h1><p>Choose a product and make it your own.</p></section><div class="catalog-controls"><input id="search" type="search" aria-label="Search products" placeholder="Search products" value="'+safe(search)+'"><select id="filter" aria-label="Product category"><option value="">All products</option>'+catalogKeys.map(key=>'<option value="'+key+'" '+(filter===key?'selected':'')+'>'+products[key].label+'</option>').join('')+'</select></div><div class="grid">'+(matches.length?productTiles(matches):'<p>No products match your search.</p>')+'</div>';
}
function previewButtons(doc,active,action,mini=true,detailSide=0){
  return '<div class="view-buttons '+(mini?'thumbs':'')+'">'+viewsFor(doc).map(([view])=>'<button type="button" data-action="'+action+'" data-value="'+view+'" aria-label="'+view+'" aria-pressed="'+(view===active)+'">'+(mini?productImage(doc,view,true,detailSide):'')+'<span>'+view+'</span></button>').join('')+'</div>';
}
function customerSupport(){
  return '<section class="customer-support" aria-label="Order support"><h2>Need help with your order?</h2>'+
    '<p>Ask about returns or replacements for personalized items. The policy is pending approval.</p>'+
    '<a href="'+whatsappUrl+'" target="_blank" rel="noopener noreferrer">WhatsApp Al Nafees</a></section>';
}
function productView(){
  const p=productFor(design), sample=fresh(design.key,true);
  sample.options={...design.options};
  applyTemplate(sample,'morning');
  return '<div class="breadcrumbs">'+button('All products','catalog')+'<span>/</span>'+p.name+'</div><div class="product-page"><section class="stack">'+mockup(sample,side,activeView)+previewButtons(sample,activeView,'view',false)+'</section><section class="panel stack"><h1>'+p.name+'</h1><p>'+p.intro+'</p><strong class="price">'+money(unit(design))+' each</strong>'+options(false)+'<div class="row">'+button('Start with a template','sample','','class="primary"')+button('Start from blank','blank')+'</div>'+customerSupport()+'</section></div>';
}
function sideName(index,doc=design){return productFor(doc).surfaces[index];}
function optionLabel(name,choices,current){
  const label=design.key==='mug'&&name==='Color'?'Handle & rim color':name;
  return '<label>'+safe(label)+'<select data-option="'+name+'">'+Object.entries(choices).map(([value,price])=>'<option value="'+safe(value)+'" '+(current===value?'selected':'')+'>'+value+(price?' ('+(price>0?'+':'−')+money(Math.abs(price))+')':'')+'</option>').join('')+'</select></label>';
}
function options(includeQty=true){
  return '<div class="options">'+Object.entries(availableOptions(design)).map(([name,choices])=>optionLabel(name,choices,design.options[name])).join('')+(includeQty?quantityInput():'')+'</div>';
}
const fontChoices=['Instrument Serif','Geist','Georgia','Arial','Courier New','Verdana','Trebuchet MS'];
const graphicChoices=['✦','☀','♥','✿','☾','★','✧','◆'];
const templates=[['morning','The Morning Club'],['coast','Coastal Club'],['made','Made for you']];
const toolItems=[['Edit','✎'],['Text','T'],['Uploads','↑'],['Background','▧'],['Templates','▦'],['Elements','◇'],['Icons','✦'],['Layers','▱']];
function selectProperty(label,name,values,value){
  return '<label>'+label+'<select data-property="'+name+'">'+values.map(v=>'<option '+(v===value?'selected':'')+'>'+safe(v)+'</option>').join('')+'</select></label>';
}
function numberProperty(label,name,min,max,value,increment=1){
  return input(label,'type="number" min="'+min+'" max="'+max+'" step="'+increment+'" data-property="'+name+'" value="'+value+'"');
}
function properties(item){
  if(!item)return '<p class="muted">Select an object on the canvas or in Layers.</p>';
  if(item.locked)return '<p>This layer is locked.</p>'+button('Unlock layer','lock',item.id);
  if(activeTool==='Effects')return '<div class="stack">'+numberProperty('Opacity (%)','opacity',0,100,item.opacity??100)+selectProperty('Tiling','tile',['None','Basic','Half Brick','Half Drop','Mirror'],item.tile||'None')+
    (item.kind==='text'?numberProperty('Line spacing','leading',.6,3,item.leading||1.16,.01)+numberProperty('Letter spacing','spacing',-8,30,item.spacing||0)+numberProperty('Curve','curve',-120,120,item.curve||0)+selectProperty('Orientation','orientation',['Horizontal','Vertical'],item.orientation||'Horizontal')+'<div class="row">'+button('Shadow','toggle','shadow','aria-pressed="'+Boolean(item.shadow)+'"')+button('Stroke','toggle','stroke','aria-pressed="'+Boolean(item.stroke)+'"')+'</div>':
     item.kind==='photo'?selectProperty('Filter','filter',['Original','Mono','Sepia','Cool','Vivid'],item.filter||'Original'):'')+'</div>';
  if(activeTool==='Crop'&&item.kind==='photo')return '<div class="stack">'+numberProperty('Crop zoom','cropZoom',1,4,item.cropZoom||1,.05)+numberProperty('Horizontal offset (%)','cropX',-100,100,item.cropX||0)+numberProperty('Vertical offset (%)','cropY',-100,100,item.cropY||0)+selectProperty('Image fit','fit',['Fill','Fit'],item.fit||'Fill')+button('Reset crop','reset-crop')+'</div>';
  if(activeTool==='Align')return '<div class="stack">'+numberProperty('X position','x',-1000,1500,item.x)+numberProperty('Y position','y',-1000,1500,item.y)+numberProperty('Rotation','rotation',-180,180,item.rotation)+'<div class="row">'+['Left','Center','Right','Top','Middle','Bottom'].map(v=>button(v,'align',v)).join('')+'</div><div class="row">'+button('Flip horizontal','toggle','flipX')+button('Flip vertical','toggle','flipY')+'</div></div>';
  if(item.kind==='text')return '<div class="stack"><label>Text<textarea data-property="text" maxlength="500">'+safe(item.text)+'</textarea></label>'+
    selectProperty('Font','font',fontChoices,item.font)+input('Color','type="color" data-property="color" value="'+item.color+'"')+numberProperty('Size','size',8,400,item.size)+
    selectProperty('Text alignment','align',['Left','Center','Right'],item.align||'Center')+
    '<div class="row">'+button('Bold','bold','','aria-pressed="'+Boolean(item.bold)+'"')+button('Italic','toggle','italic','aria-pressed="'+Boolean(item.italic)+'"')+'</div></div>';
  if(item.kind==='photo')return '<div class="stack">'+input('Replace image','type="file" id="replace-image" accept="image/png,image/jpeg,image/webp" data-upload="replace"')+
    numberProperty('Size','size',8,900,item.size)+button('Crop','tool','Crop')+'</div>';
  return '<div class="stack">'+input('Color','type="color" data-property="color" value="'+item.color+'"')+numberProperty('Size','size',8,900,item.size)+'</div>';
}
function layerList(){
  const list=design.surfaces[side];
  return '<div class="layer-list stack">'+(list.length?list.slice().reverse().map(item=>'<div class="layer-row">'+
    button(layerName(item),'select',item.id,'aria-pressed="'+(selected===item.id)+'" title="'+safe(layerName(item))+'"')+
    button('↑','raise',item.id,'aria-label="Bring forward"')+button('↓','lower',item.id,'aria-label="Send backward"')+
    button(item.hidden?'Show':'Hide','hide',item.id)+button(item.locked?'Unlock':'Lock','lock',item.id)+'</div>').join(''):'<p class="muted">Add artwork or text to this surface.</p>')+'</div>';
}
function controls(){
  const item=currentLayer();
  const labels={Edit:'Personalize',Text:'Text',Uploads:'Uploads',Background:'Background',Templates:'Templates',Elements:'Elements',Icons:'Icons',Layers:'Layers',Effects:'Effects',Crop:'Crop image',Align:'Alignment',Product:'Product options'};
  const panels={
    Product:()=>options(false),
    Edit:()=>layerList()+properties(item),
    Text:()=>button('Add text','add-text','','class="primary"')+(item?.kind==='text'?properties(item):''),
    Uploads:()=>input('Upload image','type="file" accept="image/png,image/jpeg,image/webp" data-upload="add"')+(item?.kind==='photo'?properties(item):''),
    Background:()=>input('Background color','type="color" id="background" value="'+(design.backgrounds[side]==='transparent'?'#ffffff':design.backgrounds[side])+'"')+button('Transparent','clear-background')+input('Background image','type="file" accept="image/png,image/jpeg,image/webp" data-upload="background"')+(design.backgroundImages?.[side]?button('Remove background image','remove-background'):''),
    Templates:()=>templates.map(([value,name])=>button(name,'template',value,'class="template-choice"')).join(''),
    Elements:()=>'<div class="elements">'+['Square','Rounded square','Circle','Triangle','Line'].map(name=>button(name,'add-shape',name)).join('')+'</div>',
    Icons:()=>'<input id="icon-search" type="search" aria-label="Search icons" placeholder="Search icons"><div id="icon-results" class="elements">'+graphicChoices.map((glyph,i)=>button(glyph,'add-icon',i,'aria-label="'+iconNames[i]+'"')).join('')+'</div>',
    Layers:()=>layerList()+properties(item),
    Effects:()=>properties(item),
    Crop:()=>properties(item),
    Align:()=>properties(item)
  };
  return '<div class="inspector-head"><h2>'+labels[activeTool]+'</h2>'+
    button('Close tools','close-tools','','class="mobile-close-tools"')+'</div>'+
    '<div class="inspector-body">'+panels[activeTool]()+'</div>';
}
const iconNames=['Sparkle','Sun','Heart','Flower','Moon','Star','Outline sparkle','Diamond'];
function contextToolbar(){
  const item=currentLayer();
  if(!item)return '<span class="muted">Select an object to edit</span>';
  const edit=item.kind==='text'?button('Edit text','tool','Text'):item.kind==='photo'?button('Replace','tool','Uploads')+button('Crop','tool','Crop')+button('Fit','fit','Fit')+button('Fill','fit','Fill'):'';
  return edit+button('Align','tool','Align')+button('Effects','tool','Effects')+button('Duplicate','duplicate')+button('Delete','delete');
}
function canvas(inlinePreview=''){
  const [w,h]=inchesFor(design);
  const sides=isWrap(design)?'':productFor(design).surfaces.map((name,index)=>
    button(name,'side',index,'aria-pressed="'+(side===index)+'"')).join('');
  const quick='<div class="mobile-design-actions">'+
    button('Product','tool','Product','aria-label="Product options" aria-controls="design-tools" aria-expanded="'+(activeTool==='Product'&&toolPanelOpen)+'"')+sides+
    button('↶','undo','','aria-label="Undo" '+(undo.length?'':'disabled'))+
    button('↷','redo','','aria-label="Redo" '+(redo.length?'':'disabled'))+'</div>';
  return '<div class="design-center">'+quick+'<div class="context-toolbar">'+contextToolbar()+'</div><div class="workspace-surfaces'+(design.key==='mug'?' mug-workspace':'')+'">'+inlinePreview+'<div class="canvas-scroll"><div class="canvas-card '+(showGrid?'show-grid':'')+'" style="--zoom:'+zoom+';--aspect:'+dimensions(design).join('/')+'">'+art(design,side,true)+'</div>'+(showRuler?'<div class="ruler">'+w+' × '+h+' in</div>':'')+'</div></div><div class="canvas-controls">'+button('−','zoom','-25','aria-label="Zoom out"')+'<span>'+zoom+'%</span>'+button('+','zoom','25','aria-label="Zoom in"')+button('Fit','zoom-fit')+button('Guides','guides','','aria-pressed="'+showGuides+'"')+button('Grid','grid','','aria-pressed="'+showGrid+'"')+button('Ruler','ruler','','aria-pressed="'+showRuler+'"')+button('Snap','snap','','aria-pressed="'+snapToGrid+'"')+'</div></div>';
}
function previewPanel(){
  const p=productFor(design);
  return '<aside class="editor-preview"><h2>Product preview</h2><p>'+p.name+'</p><div id="live-product" class="live-product">'+productImage(design,activeView,false,side)+'</div>'+previewButtons(design,activeView,'view',true,side)+'</aside>';
}
function review(){
  const found=issues();
  return '<h2>Review your design</h2><p>Check the artwork, print boundaries and selected options.</p><dl class="review-options">'+Object.entries(design.options).map(([key,value])=>'<div><dt>'+safe(key)+'</dt><dd>'+safe(value)+'</dd></div>').join('')+'</dl>'+
    (found.length?'<div class="warning stack">'+found.map(issue=>button(sideName(issue.index)+' · '+issue.message,'fix',issue.index+':'+issue.item.id)).join('')+'</div>':'<p class="success">No print warnings found.</p>')+quantityInput();
}
function editor(){
  const card=productFor(design).type==='card';
  const all=card?['Details','Design','Options','Review']:['Design','Options','Review'];
  const next=all[all.indexOf(step)+1];
  const steps='<nav class="steps" aria-label="Design steps">'+all.map(name=>button(name==='Details'?'Moment':name,'step',name,'aria-pressed="'+(name===step)+'"')).join('')+'</nav>';
  const nextButton=next?button('Next: '+next,'step',next,'class="primary"'):button(editingId?'Update cart item':'Add to cart','add-cart','','class="primary"');
  const head='<div class="editor-head">'+button('Save & exit','save-exit')+'<span id="save-status" class="saved">✓ '+saveStatus+'</span>'+steps+button('Preview','preview')+nextButton+'</div>';
  if(step==='Design'){
    const tools=mobileEditor.matches?toolItems:[['Product','◫'],...toolItems];
    const rail='<nav class="tool-rail" aria-label="Design tools">'+tools.map(([name,icon])=>
      '<button type="button" data-action="tool" data-value="'+name+'" aria-controls="design-tools" aria-pressed="'+
      (activeTool===name&&(!mobileEditor.matches||toolPanelOpen))+'"><span aria-hidden="true">'+icon+'</span>'+name+'</button>').join('')+'</nav>';
    const inspector='<aside id="design-tools" class="inspector stack" data-tool="'+safe(activeTool)+'">'+
      controls()+'<div class="row history">'+button('Undo','undo','',undo.length?'':'disabled')+
      button('Redo','redo','',redo.length?'':'disabled')+'</div></aside>';
    const photoPreview=previewPanel();
    const mobile=mobileEditor.matches;
    return head+'<div class="editor-layout'+(toolPanelOpen?' tools-open':'')+'">'+rail+inspector+
      canvas(mobile?photoPreview:'')+(mobile?'':photoPreview)+'</div>';
  }
  const details=()=>'<h2>Personalize</h2><form id="details" class="stack">'+input('Name','name="name" maxlength="70"')+input('Greeting','name="greeting" maxlength="70"')+'<label>Message on back<textarea name="message" maxlength="250"></textarea></label><button class="primary">Apply details</button></form>';
  const body={Details:details,Options:()=>'<h2>Product options</h2>'+options(),Review:review}[step]();
  return head+'<div class="editor-other"><div class="panel stack">'+body+'<strong id="design-price">'+designPrice()+'</strong></div>'+previewPanel()+'</div>';
}
function showProof(doc,view=defaultView(doc),detailSide=0){
  const index=previewSurface(doc,view,detailSide);
  preview={doc,view,side:index};
  byId('proof-content').innerHTML='<div class="section-head"><h2>Product preview</h2><label>Zoom<select id="proof-zoom"><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label></div><div class="proof-viewport">'+productImage(doc,view,false,index)+'</div>'+previewButtons(doc,view,'proof-view',false)+
    '<p class="muted">'+Object.values(doc.options).map(safe).join(' · ')+'</p>';
  if(!byId('proof').open)byId('proof').showModal();
}
function subtotal(){return state.cart.reduce((sum,line)=>sum+unit(line.design)*line.design.quantity,0);}
function deliverySelector(inForm=false){
  const options=Object.keys(emirateDelivery).map(name=>'<option value="'+name+'" '+(state.emirate===name?'selected':'')+'>'+name+'</option>').join('');
  return '<label>Emirate<select id="delivery-emirate"'+(inForm?' name="emirate" required':'')+'>'+
    '<option value="">Select your emirate</option>'+options+'</select></label>';
}
function deliveryMethod(){
  return '<label>Delivery speed<select id="delivery">'+['Standard','Express'].map(name=>
    '<option '+(name===delivery?'selected':'')+'>'+name+'</option>').join('')+'</select></label>';
}
function totals(){
  const base=subtotal();
  const discount=state.promo?Math.round(base*.1):0;
  const review=protection?designReviewPrice:0;
  const hasEmirate=Object.hasOwn(emirateDelivery,state.emirate);
  const freight=hasEmirate?emirateDelivery[state.emirate]+(delivery==='Express'?expressSurcharge:0):0;
  const total=base-discount+review+freight;
  const rows=[['Subtotal',money(base)]];
  if(discount)rows.push(['Discount','−'+money(discount)]);
  if(review)rows.push(['Design review',money(review)]);
  rows.push(['Delivery',hasEmirate?money(freight):'Select your emirate']);
  rows.push([hasEmirate?'Estimated total':'Before delivery',money(total)]);
  return {total,html:'<div class="totals">'+rows.map(([key,value])=>'<div><span>'+key+'</span><strong>'+value+'</strong></div>').join('')+'</div>'};
}
function refreshTotals(){
  const summary=app.querySelector('.totals');
  if(summary)summary.outerHTML=totals().html;
}
function cartLine(line,saved=false) {
  const doc=line.design;
  return '<article class="panel line">'+productImage(doc,defaultView(doc),true)+'<div class="stack"><strong>'+products[doc.key].name+'</strong><small>'+Object.values(doc.options).map(safe).join(' · ')+'</small><strong data-line-total="'+line.id+'">'+money(unit(doc)*doc.quantity)+'</strong>'+
    (saved?'':input('Quantity','type="number" min="1" max="999" data-cart-quantity="'+line.id+'" value="'+doc.quantity+'"'))+
    '<div class="row">'+(saved?button('Move to cart','restore',line.id):button('Preview','cart-preview',line.id)+button('Edit item','edit-cart',line.id)+button('Copy & edit','copy',line.id)+button('Save for later','later',line.id))+button('Remove',saved?'remove-saved':'remove',line.id)+'</div></div></article>';
}
function cart(){
  return '<h1>Your cart</h1><div class="checkout"><section class="stack">'+(state.cart.map(line=>cartLine(line)).join('')||'<p>Your cart is empty.</p>'+button('Shop products','catalog'))+
    (state.saved.length?'<h2>Saved for later</h2>'+state.saved.map(line=>cartLine(line,true)).join(''):'')+'</section>'+
    (state.cart.length?'<aside class="panel stack"><h2>Order summary</h2>'+deliverySelector()+deliveryMethod()+
    '<div aria-live="polite">'+totals().html+'</div>'+
    '<form id="promo" class="promo-form">'+input('Promo code','name="code" placeholder="Try STUDIO10" required')+'<button>Apply</button></form>'+
    (state.promo?button('Remove STUDIO10','remove-promo'):'')+button('Checkout','checkout','','class="primary"')+customerSupport()+'</aside>':'')+'</div>';
}
function checkout(){
  const field=(label,name,extra='')=>input(label,'name="'+name+'" value="'+safe(address?.[name])+'" required '+extra);
  return '<h1>Checkout</h1><div class="checkout"><section class="panel stack"><h2>Delivery details</h2>'+
    '<p>Use sample contact details for this test order.</p><form id="address" class="stack">'+
    field('Full name','name','autocomplete="name"')+field('Email','email','type="email" autocomplete="email"')+
    deliverySelector(true)+field('Building and street address','street','autocomplete="street-address"')+
    field('City or area','city','autocomplete="address-level2"')+
    '<button>Confirm delivery details</button></form>'+
    (address?'<section id="quoted" class="stack"><label>Gift message<textarea id="gift-message" maxlength="200">'+safe(giftMessage)+'</textarea></label>'+
    '<h2>Test order</h2><p>Your test order stays in this browser. This checkout does not collect payment.</p>'+
    button('Place test order','place','','class="primary"')+'</section>':'')+'</section>'+
    '<aside class="panel stack"><h2>Order summary</h2>'+state.cart.map(line=>'<div class="checkout-item">'+
    productImage(line.design,defaultView(line.design),true)+'<div><strong>'+productFor(line.design).name+
    '</strong><p>Quantity '+line.design.quantity+'</p>'+button('Preview','cart-preview',line.id)+'</div></div>').join('')+
    deliveryMethod()+'<label class="review-extras"><input type="checkbox" id="protection" '+(protection?'checked':'')+
    '> Design review · '+money(designReviewPrice)+'</label><div aria-live="polite">'+totals().html+'</div>'+
    button('Back to cart','cart')+customerSupport()+'</aside></div>';
}
function orderView(){
  const order=state.orders.at(-1);
  return '<section class="hero"><h1>Test order placed</h1><p>Order '+safe(order.id.slice(0,8).toUpperCase())+' · '+(order.currency==='AED'?money(order.total):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(order.total/100))+'</p>'+button('Continue shopping','home','','class="primary"')+'</section><div class="grid">'+order.items.map(line=>'<article class="tile">'+mockup(line.design)+'<div class="tile-info"><h2>'+products[line.design.key].name+'</h2><p>Quantity '+line.design.quantity+'</p><div class="row">'+button('View order proof','order-preview',line.id)+line.design.surfaces.map((_,index)=>button('Export '+sideName(index,line.design).toLowerCase(),'export',line.id+':'+index)).join('')+'</div></div></article>').join('')+'</div>';
}
function animateProductView(photo){
  if(!photo||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  photo.animate([{opacity:.42},{opacity:1}],{duration:190,easing:'ease-out'});
}
function updateCount(){byId('count').textContent=state.cart.reduce((sum,line)=>sum+line.design.quantity,0);}
function render(){
  const views={landing,catalog,product:productView,editor,cart,checkout,order:orderView};
  document.body.classList.toggle('design-page',page==='editor');
  const railScroll=app.querySelector('.tool-rail')?.scrollLeft||0;
  const previousInspector=app.querySelector('.inspector');
  const panelScroll=previousInspector?.dataset.tool===activeTool
    ?previousInspector.querySelector('.inspector-body').scrollTop:0;
  app.innerHTML=views[page]();
  const rail=app.querySelector('.tool-rail');
  if(rail)rail.scrollLeft=railScroll;
  const inspectorBody=app.querySelector('.inspector-body');
  if(inspectorBody)inspectorBody.scrollTop=panelScroll;
  updateCount();
}
function go(next,key=''){
  page=next;
  const hash=next==='landing'?'#home':'#'+next+(key?'/'+key:'');
  if(location.hash!==hash)historyApi.pushState({},'',hash);
  render();
  window.scrollTo(0,0);
}
function route(){
  const [path,key]=location.hash.slice(1).split('/');
  const next={home:'landing',catalog:'catalog',product:'product',editor:'editor',cart:'cart',checkout:'checkout',order:'order'}[path]||'landing';
  if((next==='product'||next==='editor')&&products[key]){
    if(next==='editor'){
      const saved=state.draft?.design.key===key?state.draft:null;
      openDesign(saved?.design||fresh(key),saved&&state.cart.some(line=>line.id===saved.editingId)?saved.editingId:null);
      return;
    }
    design=fresh(key);side=0;activeView=defaultView(design);page=next;
  }else if(next==='checkout'&&!state.cart.length)page='cart';
  else if(next==='order'&&!state.orders.length)page='landing';
  else if(next==='product'||next==='editor')page='catalog';
  else page=next;
  render();
}
function editLayer(apply,redraw=true){const item=currentLayer();if(item&&!item.locked)change(()=>apply(item),redraw);}
function toolFor(item){
  return item?.kind==='text'?'Text':item?.kind==='photo'?'Uploads':'Edit';
}
function addLayer(item){
  change(()=>{design.surfaces[side].push(item);selected=item.id;activeTool=toolFor(item);});
}
function reorderLayer(value,delta){
  const list=design.surfaces[side], from=list.findIndex(item=>item.id===value), to=from+delta;
  if(from>=0&&to>=0&&to<list.length)change(()=>{[list[from],list[to]]=[list[to],list[from]];});
}
function updateOption(key,value){
  design.options[key]=value;
  for(const [name,choices] of Object.entries(availableOptions(design))){
    if(!Object.hasOwn(choices,design.options[name]))design.options[name]=Object.keys(choices)[0];
  }
}
function updateCart(action,lineId){
  const saved=action==='restore'||action==='remove-saved';
  const source=saved?'saved':'cart', target=saved?'cart':'saved';
  const line=state[source].find(item=>item.id===lineId);
  if(!line)return;
  const next={...state,[source]:state[source].filter(item=>item.id!==lineId)};
  if(action==='restore'||action==='later')next[target]=[...state[target],line];
  if(persist(next))render();
}
const actions={
  home(){go('landing');},
  catalog(){go('catalog');},
  product(key){design=fresh(key);side=0;activeView=defaultView(design);go('product',key);},
  sample(){const doc=clone(design);applyTemplate(doc,'morning');openDesign(doc);},
  blank(){openDesign(design);},
  view(value){
    const changed=value!==activeView;
    activeView=value;
    const index=productFor(design).surfaces.indexOf(value);
    if(index>=0){side=index;selected=null;}
    render();
    if(changed)animateProductView(app.querySelector('.product-stage .photo-proof, #live-product .photo-proof'));
  },
  tool(value){
    activeTool=value;
    toolPanelOpen=true;
    render();
  },
  'close-tools'(){
    toolPanelOpen=false;
    render();
  },
  zoom(value){zoom=Math.max(50,Math.min(250,zoom+Number(value)));render();},
  'zoom-fit'(){zoom=100;render();},
  guides(){showGuides=!showGuides;render();},
  grid(){showGrid=!showGrid;render();},
  ruler(){showRuler=!showRuler;render();},
  snap(){snapToGrid=!snapToGrid;render();},
  template(value){
    if(design.surfaces.some(items=>items.length)&&!confirm('Replace your current artwork with this template? You can undo this change.'))return;
    change(()=>{applyTemplate(design,value);selected=null;});
  },
  'add-icon'(index){addLayer(layer(graphicChoices[Number(index)],200,dimensions(design)[1]/2,40));},
  'clear-background'(){change(()=>design.backgrounds[side]='transparent');},
  'remove-background'(){change(()=>delete design.backgroundImages[side]);},
  'reset-crop'(){editLayer(item=>Object.assign(item,{cropZoom:1,cropX:0,cropY:0,fit:'Fill'}));},
  fit(value){editLayer(item=>item.fit=value);},
  align(value){
    const [w,h]=dimensions(design);
    editLayer(item=>{
      const [lw,lh]=geometry(item), reference=layerBounds(item,lw,lh), margin=22;
      if(value==='Left')item.x+=margin-reference.minX;
      if(value==='Right')item.x+=w-margin-reference.maxX;
      if(value==='Center')item.x+=w/2-(reference.minX+reference.maxX)/2;
      if(value==='Top')item.y+=margin-reference.minY;
      if(value==='Bottom')item.y+=h-margin-reference.maxY;
      if(value==='Middle')item.y+=h/2-(reference.minY+reference.maxY)/2;
    });
  },
  toggle(name){editLayer(item=>item[name]=!item[name]);},
  lower(value){reorderLayer(value,-1);},
  cart(){go('cart');},
  draft(){if(state.draft)openDesign(state.draft.design,state.cart.some(line=>line.id===state.draft.editingId)?state.draft.editingId:null);else notify('No saved draft yet.');},

  step(value){step=value;toolPanelOpen=false;render();},
  side(value){side=Number(value);selected=null;activeView=sideName(side);render();},
  select(value){selected=value;if(activeTool!=='Layers')activeTool=toolFor(currentLayer());render();},
  preview(){showProof(design,activeView,side);},
  'proof-view'(value){
    const changed=value!==preview.view;
    showProof(preview.doc,value,preview.side);
    if(changed)animateProductView(byId('proof-content').querySelector('.photo-proof'));
  },
  undo(){applyHistory(undo,redo);},
  redo(){applyHistory(redo,undo);},
  'save-exit'(){if(saveDraft()){go('landing');notify('Draft saved.');}},
  'add-text'(){addLayer(layer('Your text',200,dimensions(design)[1]/2));},
  'add-shape'(name){addLayer({...layer('',200,dimensions(design)[1]/2,70),kind:'shape',shape:name});},
  bold(){editLayer(item=>item.bold=!item.bold);},
  duplicate(){editLayer(item=>{const copy={...item,id:id(),x:item.x+10,y:item.y+10};design.surfaces[side].push(copy);selected=copy.id;});},
  delete(){editLayer(item=>{design.surfaces[side]=design.surfaces[side].filter(other=>other.id!==item.id);selected=null;});},
  raise(value){reorderLayer(value,1);},
  lock(value){change(()=>{const item=design.surfaces[side].find(entry=>entry.id===value);item.locked=!item.locked;});},
  hide(value){change(()=>{const item=design.surfaces[side].find(entry=>entry.id===value);item.hidden=!item.hidden;});},
  fix(value){const [index,key]=value.split(':');side=Number(index);selected=key;step='Design';activeTool=toolFor(currentLayer());if(!isWrap(design))activeView=sideName(side);render();},
  'add-cart'(){
    const pendingQuantity=byId('quantity');
    if(pendingQuantity)design.quantity=quantity(pendingQuantity.value);
    const line={id:editingId||id(),design:clone(design)};
    const cart=editingId?state.cart.map(item=>item.id===editingId?line:item):[...state.cart,line];
    if(persist({...state,cart,draft:null})){go('cart');notify(editingId?'Cart item updated.':'Added to cart.');}
  },
  'edit-cart'(key){const line=state.cart.find(item=>item.id===key);openDesign(line.design,line.id);},
  copy(key){openDesign(state.cart.find(item=>item.id===key).design);},
  'cart-preview'(key){showProof(state.cart.find(item=>item.id===key).design);},
  remove(key){updateCart('remove',key);},
  later(key){updateCart('later',key);},
  restore(key){updateCart('restore',key);},
  'remove-saved'(key){updateCart('remove-saved',key);},
  'remove-promo'(){if(persist({...state,promo:false}))render();},
  checkout(){if(state.cart.length)go('checkout');},
  place(){
    if(!address||address.emirate!==state.emirate||!state.cart.length)return;
    const order={id:id(),items:clone(state.cart),total:totals().total,currency:'AED',emirate:state.emirate,delivery,giftMessage,created:new Date().toISOString()};
    if(persist({...state,orders:[...state.orders,order],cart:[],promo:false})){address=null;protection=false;giftMessage='';go('order');}
  },
  'order-preview'(key){
    const line=state.orders.at(-1)?.items.find(item=>item.id===key);
    if(line)showProof(line.design);
  },
  export(value){
    const [key,index]=value.split(':');
    const line=state.orders.at(-1).items.find(item=>item.id===key);
    const source=art(line.design,Number(index));
    const blob=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
    const link=document.createElement('a');
    link.href=blob;link.download=line.design.key+'-'+index+'.svg';link.click();
    setTimeout(()=>URL.revokeObjectURL(blob),1000);
  }
};
document.addEventListener('paste',event=>{
  if(page!=='editor'||step!=='Design'||byId('proof').open)return;
  const image=Array.from(event.clipboardData?.files||[]).find(file=>file.type.startsWith('image/'));
  if(!image)return;
  event.preventDefault();
  activeTool='Uploads';
  uploadImage(image,'add');
});
document.addEventListener('click',event=>{
  const control=event.target.closest('button[data-action]');
  if(control)actions[control.dataset.action]?.(control.dataset.value);
});
document.addEventListener('submit',event=>{
  const form=event.target;
  if(!['details','promo','address'].includes(form.id))return;
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  if(form.id==='details'){
    const text=design.surfaces[0].filter(item=>item.kind==='text');
    change(()=>{if(values.name&&text[0])text[0].text=values.name;if(values.greeting&&text[1])text[1].text=values.greeting;if(values.message&&design.surfaces[1][0])design.surfaces[1][0].text=values.message;step='Design';});
  }
  if(form.id==='promo'){
    if(values.code.trim().toUpperCase()!=='STUDIO10')return notify('That promo code is invalid.');
    if(persist({...state,promo:true}))render();
  }
  if(form.id==='address'){
    if(!Object.hasOwn(emirateDelivery,values.emirate)||Object.values(values).some(value=>!value.trim()))return notify('Complete all delivery fields.');
    if(values.emirate!==state.emirate&&!persist({...state,emirate:values.emirate}))return;
    address=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,value.trim()]));render();
  }
});
document.addEventListener('input',event=>{
  const field=event.target;
  if(field.id==='gift-message')giftMessage=field.value;
  if(field.id==='quantity'&&field.value!==''){
    design.quantity=quantity(field.value);
    byId('design-price').textContent=designPrice();
  }
  if(field.dataset.property==='text'&&currentLayer()&&!currentLayer().locked){
    if(!field.dataset.editing){
      undo.push(clone(design));
      if(undo.length>30)undo.shift();
      redo=[];field.dataset.editing='true';
    }
    currentLayer().text=field.value;
    queueTextPreview();
  }
  if(field.id==='icon-search'){
    byId('icon-results').innerHTML=graphicChoices.map((glyph,i)=>iconNames[i].toLowerCase().includes(field.value.toLowerCase())?button(glyph,'add-icon',i,'aria-label="'+iconNames[i]+'"'):'').join('');
  }
  if(field.id==='search'){
    search=field.value;const updated=document.createElement('div');updated.innerHTML=catalog();
    app.querySelector('.grid').replaceWith(updated.querySelector('.grid'));
  }
  if(page==='checkout'&&field.form?.id==='address'&&address){
    address=null;
    byId('quoted')?.remove();
    refreshTotals();
  }
});
document.addEventListener('change',async event=>{
  const field=event.target;
  const {option,property,upload,cartQuantity}=field.dataset;
  if(field.id==='filter'){filter=field.value;render();}
  if(field.id==='background')change(()=>design.backgrounds[side]=field.value);
  if(field.id==='quantity'){
    design.quantity=quantity(field.value);
    saveDraft();
    field.value=design.quantity;
    byId('design-price').textContent=designPrice();
    refreshHistoryButtons();
  }
  if(field.id==='delivery-emirate'){
    const emirate=field.value;
    if(!persist({...state,emirate}))field.value=state.emirate;
    else{
      if(address?.emirate!==emirate)address=null;
      refreshTotals();
    }
  }
  if(field.id==='delivery'){delivery=field.value;refreshTotals();}
  if(field.id==='protection'){protection=field.checked;refreshTotals();}
  if(field.id==='proof-zoom'){
    const viewport=byId('proof-content').querySelector('.proof-viewport');
    viewport.style.setProperty('--proof-width',(Number(field.value)*100)+'%');
    viewport.style.setProperty('--proof-scale',field.value);
    viewport.style.setProperty('--proof-max',(Number(field.value)*100)+'%');
  }
  if(option){
    if(page==='editor')change(()=>updateOption(option,field.value));
    else {updateOption(option,field.value);render();}
  }
  if(property==='text'&&field.dataset.editing){
    delete field.dataset.editing;
    saveDraft();
  }else if(property){
    const value=field.type==='number'?Math.min(Number(field.max),Math.max(Number(field.min),Number(field.value))):field.value;
    editLayer(item=>item[property]=value,false);
    field.value=value;
    app.querySelector('.canvas-card .art').outerHTML=art(design,side,true);
    byId('live-product').innerHTML=productImage(design,activeView,false,side);
    app.querySelector('.editor-preview .thumbs').outerHTML=previewButtons(design,activeView,'view',true,side);
    const label=app.querySelector('.layer-list button[data-value="'+selected+'"]');
    if(property==='text'&&label)label.textContent=value||'Text';
    refreshHistoryButtons();
  }
  if(cartQuantity){
    const cart=state.cart.map(line=>line.id===cartQuantity?{...line,design:{...line.design,quantity:quantity(field.value)}}:line);
    if(persist({...state,cart})){
      const doc=cart.find(line=>line.id===cartQuantity).design;
      field.value=doc.quantity;
      app.querySelector('[data-line-total="'+cartQuantity+'"]').textContent=money(unit(doc)*doc.quantity);
      refreshTotals();
      updateCount();
    }
  }
  if(upload&&field.files[0])await uploadImage(field.files[0],upload);
});
let textFrame=0;
function queueTextPreview(){
  if(textFrame)return;
  textFrame=requestAnimationFrame(()=>{
    textFrame=0;
    if(page!=='editor'||step!=='Design')return;
    app.querySelector('.canvas-card .art').outerHTML=art(design,side,true);
    byId('live-product').innerHTML=productImage(design,activeView,false,side);
    app.querySelector('.editor-preview .thumbs').outerHTML=previewButtons(design,activeView,'view',true,side);
    const label=app.querySelector('.layer-list button[data-value="'+selected+'"]');
    if(label)label.textContent=currentLayer()?.text||'Text';
    refreshHistoryButtons();
  });
}
function refreshHistoryButtons(){
  app.querySelectorAll('button[data-action="undo"]').forEach(button=>button.disabled=!undo.length);
  app.querySelectorAll('button[data-action="redo"]').forEach(button=>button.disabled=!redo.length);
}
function quantity(value){return Math.max(1,Math.min(999,Math.trunc(Number(value))||1));}
async function uploadImage(file,mode){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8_000_000)return notify('Choose a PNG, JPEG, or WebP image under 8 MB.');
  const target=design, index=side, item=currentLayer();
  try {
    const bitmap=await createImageBitmap(file);
    const scale=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const pixels=Math.round(Math.min(bitmap.width,bitmap.height)*scale);
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    bitmap.close();
    if(page!=='editor'||design!==target||side!==index)return;
    const src=canvas.toDataURL('image/webp',.86);
    if(mode==='background'){
      change(()=>{design.backgroundImages??=[];design.backgroundImages[index]=src;});
      return;
    }
    if(mode==='replace'&&(!design.surfaces[index].includes(item)||item.locked))return;
    change(()=>{
      if(mode==='replace'){Object.assign(item,{src,pixels,name:file.name});return;}
      const created={id:id(),kind:'photo',x:200,y:dimensions(design)[1]/2,size:140,rotation:0,src,pixels,name:file.name,aspect:Math.max(.35,Math.min(2.2,canvas.height/canvas.width))};
      design.surfaces[side].push(created);selected=created.id;
    });
  } catch {notify('Could not open that image.');}
}
app.addEventListener('pointerdown',event=>{
  const group=event.target.closest('[data-layer]');
  if(!group||event.button!==0)return;
  const item=design.surfaces[side].find(entry=>entry.id===group.dataset.layer);
  if(!item||item.locked)return;
  const svg=group.ownerSVGElement, transform=svg.getScreenCTM().inverse();
  const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(transform);
  const resize=event.target.hasAttribute('data-resize');
  drag={item,group,transform,point,x:item.x,y:item.y,size:item.size,resize,pointer:event.pointerId};
  group.setPointerCapture(event.pointerId);event.preventDefault();
});
app.addEventListener('pointermove',event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  const to=new DOMPoint(event.clientX,event.clientY).matrixTransform(drag.transform);
  if(drag.resize){
    const before=Math.max(8,Math.hypot(drag.point.x-drag.item.x,drag.point.y-drag.item.y));
    drag.size=Math.max(8,Math.min(900,Math.round(drag.item.size*Math.hypot(to.x-drag.item.x,to.y-drag.item.y)/before)));
    const scale=drag.size/drag.item.size;
    drag.group.setAttribute('transform','translate('+drag.x+' '+drag.y+') rotate('+drag.item.rotation+') scale('+scale+')');
    return;
  }
  drag.x=Math.round(drag.item.x+to.x-drag.point.x);drag.y=Math.round(drag.item.y+to.y-drag.point.y);
  if(snapToGrid){drag.x=Math.round(drag.x/5)*5;drag.y=Math.round(drag.y/5)*5;}
  drag.group.setAttribute('transform','translate('+drag.x+' '+drag.y+') rotate('+drag.item.rotation+')');
});
function endDrag(event){
  if(!drag||drag.pointer!==event.pointerId)return;
  const {item,x,y,size}=drag;drag=null;selected=item.id;activeTool=toolFor(item);
  if(event.type!=='pointercancel'&&(item.x!==x||item.y!==y||item.size!==size))change(()=>Object.assign(item,{x,y,size}));
  else render();
}
app.addEventListener('pointerup',endDrag);
app.addEventListener('pointercancel',endDrag);
window.addEventListener('popstate',route);
function syncEditorHeight(){
  const height=window.visualViewport?.height;
  if(height)document.documentElement.style.setProperty('--editor-viewport',height+'px');
}
window.visualViewport?.addEventListener('resize',syncEditorHeight);
syncEditorHeight();
mobileEditor.addEventListener('change',()=>{if(page==='editor')render();});
document.addEventListener('keydown',event=>{
  if(page!=='editor'||step!=='Design'||byId('proof').open||event.target.matches('input,textarea,select,[contenteditable]'))return;
  const movement={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
  if(movement&&currentLayer()){
    event.preventDefault();
    const distance=event.shiftKey?10:1;
    editLayer(item=>{item.x+=movement[0]*distance;item.y+=movement[1]*distance;});
  }
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
    event.preventDefault();
    if(event.shiftKey)actions.redo();else actions.undo();
  }
  if(event.key==='Delete'&&currentLayer())actions.delete();
});
route();
