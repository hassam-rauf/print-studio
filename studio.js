'use strict';

const products = {
  photo: {name:'Sunday Photo Card', type:'card', price:165, color:'#f7e9dc', intro:'A front photo and a message on the reverse.'},
  note: {name:'Garden Note Card', type:'card', price:145, color:'#e7ecdb', intro:'A two-sided note with an editable greeting.'},
  mug: {name:'Classic White Mug', type:'mug', price:1695, color:'#ffffff', intro:'Start with a blank wrap and add your own artwork.'}
};
const optionSets = {
  card:{Size:{'5 × 7 in':0,'4 × 6 in':-20},Paper:{'Matte':0,'Linen':59},Corners:{'Square':0,'Rounded':20},Envelopes:{'White':0,'None':-10},Printing:{'Standard':0,'HD':40}},
  mug:{Size:{'11 oz':0,'15 oz':350},Finish:{'Glossy white':0,'Warm ivory':150}}
};
const shipping = {Standard:699, Express:1599};
const storageKey = 'print-studio-v1';
const byId = id => document.getElementById(id);
const id = () => crypto.randomUUID();
const clone = value => structuredClone(value);
const money = cents => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
const safe = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button = (label,action,data='',extra='') => '<button type="button" data-action="'+action+'" data-value="'+safe(data)+'" '+extra+'>'+safe(label)+'</button>';
const app = byId('app');
let state = {cart:[], saved:[], orders:[], draft:null, promo:false};
try { state={...state,...JSON.parse(localStorage.getItem(storageKey))}; } catch {}
let page='catalog', design, side=0, step='Design', selected=null, preview=null, filter='', search='';
let undo=[], redo=[], editingId=null, noticeTimer, drag=null, address=null, delivery='Standard', protection=false;

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
function fresh(key) {
  const product=products[key];
  const surfaces=product.type==='mug'?[[]]:[
    key==='photo'?[{id:id(),kind:'photo',x:200,y:180,size:260,rotation:0,src:null},layer('The Taylor Family',200,389,36),layer('Warm wishes',200,445,24)]:
    [layer('Thinking of you',200,229,42),layer('With love',200,294,27)],
    [layer('A little note from us to you.',200,228,24)]
  ];
  const options=Object.fromEntries(Object.entries(optionSets[product.type]).map(([name,choices])=>[name,Object.keys(choices)[0]]));
  return {key,surfaces,backgrounds:surfaces.map(()=>product.color),options,quantity:1};
}
function openDesign(doc,line=null,initial='Design') {
  design=clone(doc); editingId=line; side=0; selected=null; undo=[]; redo=[]; step=initial; page='editor'; render();
}
function saveDraft() { return persist({...state,draft:{design:clone(design),editingId}}); }
function change(apply,redraw=true) {
  undo.push(clone(design));
  if(undo.length>40) undo.shift();
  redo=[]; apply(); saveDraft();
  if(redraw) render();
}
function history(from,to) {
  if(!from.length) return;
  to.push(clone(design)); design=from.pop(); saveDraft(); render();
}
function unit(doc) {
  const product=products[doc.key];
  return product.price+Object.entries(doc.options).reduce((sum,[name,value])=>sum+(optionSets[product.type][name][value]??0),0);
}
function dimensions(doc) {
  if(products[doc.key].type==='mug') return [400,190];
  return [400,doc.options.Size==='4 × 6 in'?600:560];
}
function art(doc,index=0,edit=false) {
  const [width,height]=dimensions(doc);
  const radius=doc.options.Corners==='Rounded'?18:0;
  const content=doc.surfaces[index].filter(item=>!item.hidden).map(item=>{
    const target=edit?' data-layer="'+safe(item.id)+'"':'';
    const marker=edit&&selected===item.id?'<rect x="-'+item.size/2+'" y="-'+item.size/2+'" width="'+item.size+'" height="'+item.size+'" fill="none" stroke="#be664b" stroke-dasharray="6 4" pointer-events="none"/>':'';
    let inside;
    if(item.kind==='photo'){
      const box=' x="-'+item.size/2+'" y="-'+item.size/2+'" width="'+item.size+'" height="'+item.size+'"';
      inside=item.src?'<image href="'+safe(item.src)+'"'+box+' preserveAspectRatio="xMidYMid slice"/>':
      '<rect'+box+' fill="#c4cdb9"/><text y="4" text-anchor="middle" fill="#33443a" font-size="18">Your photo</text>';
    }else{
      const lines=item.text.split('\n').map((part,i)=>'<tspan x="0" dy="'+(i?1.16:0)+'em">'+safe(part)+'</tspan>').join('');
      inside='<text text-anchor="middle" fill="'+safe(item.color)+'" font-family="'+safe(item.font)+'" font-size="'+item.size+'" font-weight="'+(item.bold?700:400)+'">'+lines+'</text>';
    }
    return '<g'+target+' transform="translate('+item.x+' '+item.y+') rotate('+item.rotation+')">'+inside+marker+'</g>';
  }).join('');
  const guide='<rect class="guide" x="22" y="22" width="'+(width-44)+'" height="'+(height-44)+'" fill="none" stroke="#6d856e" stroke-dasharray="6 5"/>';
  return '<svg class="art" role="img" aria-label="'+(edit?'Editable design canvas':'Product artwork')+'" viewBox="0 0 '+width+' '+height+'" xmlns="http://www.w3.org/2000/svg" style="border-radius:'+radius+'px"><rect width="'+width+'" height="'+height+'" fill="'+safe(doc.backgrounds[index])+'"/>'+content+(edit?guide:'')+'</svg>';
}
function mockup(doc,index=0,angle='Center') {
  if(products[doc.key].type==='card') return '<div class="stage">'+art(doc,index)+'</div>';
  const sideClass=angle==='Left'?' left':'';
  const offset={Left:20,Center:0,Right:-20}[angle];
  const finish=doc.options.Finish==='Warm ivory'?'background:#f2e7ce;':'';
  return '<div class="stage"><div class="mug'+sideClass+'" style="'+finish+'"><div style="width:88%;overflow:hidden"><div style="transform:translateX('+offset+'%)">'+art(doc)+'</div></div></div>';
}
function catalog() {
  const matches=Object.entries(products).filter(([,product])=>(!filter||filter===product.type)&&product.name.toLowerCase().includes(search.toLowerCase()));
  return '<section class="hero"><h1>Make it yours.</h1><p>Personalize a card or design your own mug. See the finished design before you order.</p><div class="row">'+button('Personalize a card','start','photo','class="primary"')+button('Design a mug','start','mug')+'</div></section><div class="catalog-controls"><input id="search" type="search" aria-label="Search products" placeholder="Search products" value="'+safe(search)+'"><select id="filter" aria-label="Product category"><option value="">All products</option><option value="card" '+(filter==='card'?'selected':'')+'>Cards</option><option value="mug" '+(filter==='mug'?'selected':'')+'>Mugs</option></select></div><div class="grid">'+(matches.length?matches.map(([key,p])=>'<article class="tile">'+mockup(fresh(key))+'<h2>'+p.name+'</h2><p>'+p.intro+'</p><div class="row"><strong>From '+money(p.price)+'</strong>'+button('View product','product',key)+'</div></article>').join(''):'<p>No products match your search.</p>')+'</div>';
}
function productView(){
  const p=products[design.key];
  return '<div class="workspace">'+mockup(design)+'<section class="panel stack"><h1>'+p.name+'</h1><p>'+p.intro+'</p><strong>'+money(unit(design))+' each</strong>'+button('Preview','preview')+button(p.type==='mug'?'Add your design':'Personalize this design','start',design.key,'class="primary"')+'</section></div>';
}
function input(label,attrs) {return '<label>'+label+'<input '+attrs+'></label>';}
function sideName(index) {return design.surfaces.length===1?'Wrap':index===0?'Front':'Back';}
function currentLayer(){return design.surfaces[side].find(item=>item.id===selected);}
function quantityInput(){return input('Quantity','id="quantity" type="number" min="1" max="999" value="'+design.quantity+'"');}
function options(){
  return Object.entries(optionSets[products[design.key].type]).map(([name,choices])=>'<label>'+name+'<select data-option="'+name+'">'+Object.entries(choices).map(([value,price])=>'<option value="'+safe(value)+'" '+(design.options[name]===value?'selected':'')+'>'+value+(price?' ('+(price>0?'+':'−')+money(Math.abs(price))+')':'')+'</option>').join('')+'</select></label>').join('')+quantityInput();
}
function controls(){
  const item=currentLayer();
  const props=item&&!item.locked?'<fieldset class="stack"><legend>Selected layer</legend>'+
    (item.kind==='text'?'<label>Text<textarea data-property="text">'+safe(item.text)+'</textarea></label>'+
      '<label>Font<select data-property="font">'+['Georgia','Arial','Courier New'].map(font=>'<option '+(font===item.font?'selected':'')+'>'+font+'</option>').join('')+'</select></label>'+
      input('Text color','type="color" data-property="color" value="'+item.color+'"')+button(item.bold?'Unbold':'Bold','bold'):
      input('Replace image','type="file" accept="image/png,image/jpeg,image/webp" data-upload="replace"'))+
    input('Size','type="number" min="8" max="900" data-property="size" value="'+item.size+'"')+
    input('Rotation','type="number" min="-180" max="180" data-property="rotation" value="'+item.rotation+'"')+
    '<div class="row">'+button('Duplicate','duplicate')+button('Delete','delete')+'</div></fieldset>':'';
  return '<div class="stack"><div class="row">'+button('Add text','add-text')+button('Add star','add-shape')+'</div>'+
    input('Upload image','type="file" accept="image/png,image/jpeg,image/webp" data-upload="add"')+
    input('Background','type="color" id="background" value="'+design.backgrounds[side]+'"')+
    '<fieldset class="stack layer-list"><legend>Layers</legend>'+design.surfaces[side].map(item=>'<div>'+
      button(item.kind==='photo'?'Photo':item.text||'Text','select',item.id,'aria-pressed="'+(selected===item.id)+'"')+
      button('↑','raise',item.id,'aria-label="Bring forward"')+button(item.hidden?'Show':'Hide','hide',item.id)+button(item.locked?'Unlock':'Lock','lock',item.id)+'</div>').reverse().join('')+'</fieldset>'+props+'</div>';
}
function issues(){
  const result=[];
  const [w,h]=dimensions(design);
  design.surfaces.forEach((items,index)=>items.forEach(item=>{
    if(item.hidden)return;
    if(item.kind==='photo'&&!item.src) result.push({index,item,message:'Replace the sample photo'});
    if(item.x<22||item.x>w-22||item.y<22||item.y>h-22) result.push({index,item,message:'Layer center is outside the safe area'});
    if(item.kind==='photo'&&item.src&&item.pixels<item.size*2) result.push({index,item,message:'Image may print at low resolution'});
  }));
  return result;
}
function editor() {
  const all=products[design.key].type==='card'?['Details','Design','Options','Review']:['Design','Options','Review'];
  const next=all[all.indexOf(step)+1];
  const body={
    Details:()=>'<form id="details" class="stack">'+input('Name','name="name" maxlength="70" placeholder="The Taylor Family"')+input('Greeting','name="greeting" maxlength="70" placeholder="Warm wishes"')+'<label>Message on back<textarea name="message" maxlength="250"></textarea></label><button class="primary">Apply details</button></form>',
    Design:controls,
    Options:options,
    Review:()=>'<h2>Review your design</h2><p>Check each side and confirm your options.</p>'+Object.entries(design.options).map(([key,value])=>'<div>'+key+': '+safe(value)+'</div>').join('')+
      (issues().length?'<div class="warning stack">'+issues().map(issue=>button(sideName(issue.index)+' · '+issue.message,'fix',issue.index+':'+issue.item.id)).join('')+'</div>':'')+quantityInput()
  }[step]();
  return '<div class="row"><h2>'+products[design.key].name+'</h2></div><div class="steps">'+all.map(name=>button(name,'step',name,'aria-pressed="'+(name===step)+'"')).join('')+'</div><div class="workspace"><section class="panel stack">'+body+
    '<strong id="design-price">'+designPrice()+'</strong><div class="row">'+(next?button('Next: '+next,'step',next,'class="primary"'):button(editingId?'Update cart item':'Add to cart','add-cart','','class="primary"'))+'</div></section><section>'+
    (step==='Design'?'<div class="stage">'+art(design,side,true)+'</div>':mockup(design,side))+
    '<div class="toolbar">'+design.surfaces.map((_,index)=>button(sideName(index),'side',index,'aria-pressed="'+(side===index)+'"')).join('')+button('Preview','preview')+button('Undo','undo','',undo.length?'':'disabled')+button('Redo','redo','',redo.length?'':'disabled')+button('Save & exit','save-exit')+'</div></section></div>';
}
function designPrice(){return money(unit(design)*design.quantity)+' · '+money(unit(design))+' each';}

function subtotal(){return state.cart.reduce((sum,line)=>sum+unit(line.design)*line.design.quantity,0);}
function totals(quoted=false){
  const base=subtotal(), discount=state.promo?Math.round(base*.1):0;
  const fee=protection?399:0;
  const freight=quoted?shipping[delivery]+(address.country==='Canada'?500:0):0;
  const tax=quoted?Math.round((base-discount+fee)*({NY:.08875,CA:.0725,ON:.13}[address.region.toUpperCase()]??0)):0;
  const total=base-discount+fee+freight+tax;
  const rows=[['Subtotal',money(base)],['Discount','−'+money(discount)],['Design review',money(fee)],['Shipping',quoted?money(freight):'At checkout'],['Estimated tax',quoted?money(tax):'At checkout'],['Total',money(total)]];
  return {total,html:'<div class="totals">'+rows.map(([key,value])=>'<div><span>'+key+'</span><strong>'+value+'</strong></div>').join('')+'</div>'};
}
function cartLine(line,saved=false) {
  const doc=line.design;
  return '<article class="panel line">'+art(doc)+'<div class="stack"><strong>'+products[doc.key].name+'</strong><small>'+Object.values(doc.options).map(safe).join(' · ')+'</small><strong data-line-total="'+line.id+'">'+money(unit(doc)*doc.quantity)+'</strong>'+
    (saved?'':input('Quantity','type="number" min="1" max="999" data-cart-quantity="'+line.id+'" value="'+doc.quantity+'"'))+
    '<div class="row">'+(saved?button('Move to cart','restore',line.id):button('Preview','cart-preview',line.id)+button('Edit item','edit-cart',line.id)+button('Copy & edit','copy',line.id)+button('Save for later','later',line.id))+button('Remove',saved?'remove-saved':'remove',line.id)+'</div></div></article>';
}
function cart(){
  return '<h1>Your cart</h1><div class="checkout"><section class="stack">'+(state.cart.map(line=>cartLine(line)).join('')||'<p>Your cart is empty.</p>'+button('Shop products','catalog'))+
    (state.saved.length?'<h2>Saved for later</h2>'+state.saved.map(line=>cartLine(line,true)).join(''):'')+'</section>'+
    (state.cart.length?'<aside class="panel stack"><h2>Order summary</h2><form id="promo" class="stack">'+input('Promo code','name="code" placeholder="Try STUDIO10" required')+'<button>Apply</button></form>'+
    (state.promo?button('Remove STUDIO10','remove-promo'):'')+totals().html+button('Checkout','checkout','','class="primary"')+'</aside>':'')+'</div>';
}
function checkout(){
  const field=(label,name,extra='')=>input(label,'name="'+name+'" value="'+safe(address?.[name])+'" required '+extra);
  return '<h1>Checkout</h1><div class="checkout"><section class="panel stack"><h2>Delivery</h2><form id="address" class="stack">'+field('Full name','name','autocomplete="name"')+field('Email','email','type="email" autocomplete="email"')+
    '<label>Country<select name="country"><option>United States</option><option '+(address?.country==='Canada'?'selected':'')+'>Canada</option></select></label>'+
    field('Street address','street','autocomplete="street-address"')+field('City','city')+field('State or province code','region','pattern="[A-Za-z]{2}" maxlength="2"')+field('Postal code','postal','autocomplete="postal-code"')+'<button>Calculate shipping</button></form>'+
    (address?'<section id="quoted" class="stack"><h2>Shipping method</h2><label>Delivery speed<select id="delivery">'+Object.entries(shipping).map(([name,price])=>'<option value="'+name+'" '+(name===delivery?'selected':'')+'>'+name+' · '+money(price+(address.country==='Canada'?500:0))+'</option>').join('')+'</select></label><h2>Payment</h2><p>Test checkout. The order is recorded in this browser and no money is collected.</p>'+button('Place test order','place','','class="primary"')+'</section>':'')+'</section>'+
    '<aside class="panel stack"><h2>Order summary</h2><label style="display:block"><input type="checkbox" id="protection" '+(protection?'checked':'')+'> Design review · $3.99</label>'+totals(Boolean(address)).html+button('Back to cart','cart')+'</aside></div>';
}
function orderView(){
  const order=state.orders.at(-1);
  return '<section class="hero"><h1>Test order placed</h1><p>Order '+safe(order.id.slice(0,8).toUpperCase())+' · '+money(order.total)+'</p>'+button('Continue shopping','catalog','','class="primary"')+'</section><div class="grid">'+order.items.map(line=>'<article class="tile">'+mockup(line.design)+'<h2>'+products[line.design.key].name+'</h2><p>Quantity '+line.design.quantity+'</p>'+line.design.surfaces.map((_,index)=>button('Export '+(line.design.surfaces.length===1?'wrap':index?'back':'front'),'export',line.id+':'+index)).join('')+'</article>').join('')+'</div>';
}
function updateCount(){byId('count').textContent=state.cart.reduce((sum,line)=>sum+line.design.quantity,0);}
function render(){
  const views={catalog,product:productView,editor,cart,checkout,order:orderView};
  app.innerHTML=views[page]();
  updateCount();
}
function showProof(doc,index=0,angle='Center'){
  preview={doc,index,angle};
  const controls=doc.surfaces.length>1?['Front','Back']:['Left','Center','Right'];
  byId('proof-content').innerHTML='<h2>Product preview</h2>'+mockup(doc,index,angle)+'<div class="toolbar">'+controls.map((name,i)=>button(name,'proof-view',doc.surfaces.length>1?i:name,'aria-pressed="'+(doc.surfaces.length>1?i===index:name===angle)+'"')).join('')+'</div>';
  if(!byId('proof').open) byId('proof').showModal();
}
function editLayer(apply,redraw=true){const item=currentLayer();if(item&&!item.locked)change(()=>apply(item),redraw);}
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
  catalog(){page='catalog';render();},
  product(key){design=fresh(key);page='product';render();},
  cart(){page='cart';render();},
  draft(){if(state.draft)openDesign(state.draft.design,state.cart.some(line=>line.id===state.draft.editingId)?state.draft.editingId:null);else notify('No saved draft yet.');},
  start(key){openDesign(fresh(key),null,products[key].type==='mug'?'Design':'Details');},
  step(value){step=value;render();},
  side(value){side=Number(value);selected=null;render();},
  select(value){selected=value;render();},
  preview(){showProof(design,page==='editor'?side:0);},
  'proof-view'(value){if(preview.doc.surfaces.length>1)showProof(preview.doc,Number(value));else showProof(preview.doc,0,value);},
  undo(){history(undo,redo);},
  redo(){history(redo,undo);},
  'save-exit'(){if(saveDraft()){page='catalog';render();notify('Draft saved.');}},
  'add-text'(){change(()=>{const item=layer('Your text',200,dimensions(design)[1]/2);design.surfaces[side].push(item);selected=item.id;});},
  'add-shape'(){change(()=>{const item=layer('✦',200,dimensions(design)[1]/2,60);design.surfaces[side].push(item);selected=item.id;});},
  bold(){editLayer(item=>item.bold=!item.bold);},
  duplicate(){editLayer(item=>{const copy={...item,id:id(),x:item.x+10,y:item.y+10};design.surfaces[side].push(copy);selected=copy.id;});},
  delete(){editLayer(item=>{design.surfaces[side]=design.surfaces[side].filter(other=>other.id!==item.id);selected=null;});},
  raise(value){const list=design.surfaces[side],i=list.findIndex(item=>item.id===value);if(i>=0&&i<list.length-1)change(()=>{[list[i],list[i+1]]=[list[i+1],list[i]];});},
  lock(value){change(()=>{const item=design.surfaces[side].find(entry=>entry.id===value);item.locked=!item.locked;});},
  hide(value){change(()=>{const item=design.surfaces[side].find(entry=>entry.id===value);item.hidden=!item.hidden;});},
  fix(value){const [index,key]=value.split(':');side=Number(index);selected=key;step='Design';render();},
  'add-cart'(){const line={id:editingId||id(),design:clone(design)};
    const cart=editingId?state.cart.map(item=>item.id===editingId?line:item):[...state.cart,line];
    if(persist({...state,cart,draft:null})){page='cart';render();notify(editingId?'Cart item updated.':'Added to cart.');}
  },
  'edit-cart'(key){const line=state.cart.find(item=>item.id===key);openDesign(line.design,line.id);},
  copy(key){openDesign(state.cart.find(item=>item.id===key).design);},
  'cart-preview'(key){showProof(state.cart.find(item=>item.id===key).design);},
  remove(key){updateCart('remove',key);},
  later(key){updateCart('later',key);},
  restore(key){updateCart('restore',key);},
  'remove-saved'(key){updateCart('remove-saved',key);},
  'remove-promo'(){if(persist({...state,promo:false}))render();},
  checkout(){if(state.cart.length){page='checkout';render();}},
  place(){
    if(!address||!state.cart.length)return;
    const order={id:id(),items:clone(state.cart),total:totals(true).total,delivery,created:new Date().toISOString()};
    if(persist({...state,orders:[...state.orders,order],cart:[],promo:false})){address=null;protection=false;page='order';render();}
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
    if(Object.values(values).some(value=>!value.trim()))return notify('Complete all delivery fields.');
    address=Object.fromEntries(Object.entries(values).map(([name,value])=>[name,value.trim()]));render();
  }
});
document.addEventListener('input',event=>{
  const field=event.target;
  if(field.id==='search'){
    search=field.value;const updated=document.createElement('div');updated.innerHTML=catalog();
    app.querySelector('.grid').replaceWith(updated.querySelector('.grid'));
  }
  if(page==='checkout'&&field.form?.id==='address'&&address){
    address=null;
    byId('quoted')?.remove();
    app.querySelector('.totals').outerHTML=totals().html;
  }
});
document.addEventListener('change',async event=>{
  const field=event.target;
  const {option,property,upload,cartQuantity}=field.dataset;
  if(field.id==='filter'){filter=field.value;render();}
  if(field.id==='background')change(()=>design.backgrounds[side]=field.value);
  if(field.id==='quantity'){
    change(()=>design.quantity=quantity(field.value),false);
    field.value=design.quantity;
    byId('design-price').textContent=designPrice();
    refreshHistoryButtons();
  }
  if(field.id==='delivery'){delivery=field.value;app.querySelector('.totals').outerHTML=totals(true).html;}
  if(field.id==='protection'){protection=field.checked;app.querySelector('.totals').outerHTML=totals(Boolean(address)).html;}
  if(option)change(()=>design.options[option]=field.value);
  if(property){
    const value=field.type==='number'?Math.min(Number(field.max),Math.max(Number(field.min),Number(field.value))):field.value;
    editLayer(item=>item[property]=value,false);
    field.value=value;
    app.querySelector('.stage .art').outerHTML=art(design,side,true);
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
      app.querySelector('.totals').outerHTML=totals().html;
      updateCount();
    }
  }
  if(upload&&field.files[0])await uploadImage(field.files[0],upload);
});
function refreshHistoryButtons(){
  app.querySelector('button[data-action="undo"]').disabled=!undo.length;
  app.querySelector('button[data-action="redo"]').disabled=!redo.length;
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
    if(mode==='replace'&&(!design.surfaces[index].includes(item)||item.locked))return;
    change(()=>{
      if(mode==='replace'){Object.assign(item,{src,pixels});return;}
      const created={id:id(),kind:'photo',x:200,y:dimensions(design)[1]/2,size:140,rotation:0,src,pixels};
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
  drag={item,group,transform,point,x:item.x,y:item.y,pointer:event.pointerId};
  group.setPointerCapture(event.pointerId);event.preventDefault();
});
app.addEventListener('pointermove',event=>{
  if(!drag||drag.pointer!==event.pointerId)return;
  const to=new DOMPoint(event.clientX,event.clientY).matrixTransform(drag.transform);
  drag.x=Math.round(drag.item.x+to.x-drag.point.x);drag.y=Math.round(drag.item.y+to.y-drag.point.y);
  drag.group.setAttribute('transform','translate('+drag.x+' '+drag.y+') rotate('+drag.item.rotation+')');
});
function endDrag(event){
  if(!drag||drag.pointer!==event.pointerId)return;
  const {item,x,y}=drag;drag=null;selected=item.id;
  if(event.type!=='pointercancel'&&(item.x!==x||item.y!==y))change(()=>Object.assign(item,{x,y}));
  else render();
}
app.addEventListener('pointerup',endDrag);
app.addEventListener('pointercancel',endDrag);
render();
