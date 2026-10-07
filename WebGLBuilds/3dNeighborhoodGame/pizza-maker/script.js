(()=>{'use strict';
const $=id=>document.getElementById(id);
const toppingData={Pepperoni:'🔴',Mushrooms:'🍄',Peppers:'🫑',Olives:'🫒',Onions:'🧅',Sausage:'🟤',Pineapple:'🍍',Bacon:'🥓',Anchovies:'🐟',Artichoke:'🌿'};
const seasoningTypes=['Garlic Butter','Italian Herbs','Parmesan Garlic','Everything Seasoning','Plain Crust'];const seasoningIcons={'Garlic Butter':'🧄','Italian Herbs':'🌿','Parmesan Garlic':'🧀','Everything Seasoning':'✨','Plain Crust':'⭕'};
const sauceTypes=['Classic Tomato','Spicy Marinara','BBQ','Alfredo','Pesto'];const cheeseTypes=['Mozzarella','Cheddar','Parmesan','Provolone','Vegan Cheese'];
const streets=['Maple Street','Oak Avenue','Pine Court','Elm Street','Cedar Lane','Willow Drive','Birch Road','Cherry Boulevard'];
const sizes=['Small','Medium','Large'];
const randomItem=items=>items[Math.floor(Math.random()*items.length)];
let previousOrderSignature='';
function randomOrder(){
 let candidate,signature,tries=0;
 do{
  const toppingNames=Object.keys(toppingData);
  const count=Math.floor(Math.random()*4); // 0-3 different toppings, including plain cheese
  const toppings=[];
  while(toppings.length<count){const t=randomItem(toppingNames);if(!toppings.includes(t))toppings.push(t)}
  candidate={size:randomItem(sizes),toppings,
   sauce:randomItem(sauceTypes),cheese:randomItem(cheeseTypes),
   seasoning:randomItem(seasoningTypes),
   address:`${Math.floor(Math.random()*190)+10} ${randomItem(streets)}`};
  signature=JSON.stringify([candidate.size,candidate.toppings,candidate.sauce,candidate.cheese,candidate.seasoning]);
  tries++;
 }while(signature===previousOrderSignature&&tries<20);
 previousOrderSignature=signature;
 return candidate;
}

let crustMarks=[],chosenSeasoning=null,seasoningMode=false;let placedPieces=[],activeTopping=null,chosenSauce=null,chosenCheese=null,paintMode=null,painting=false,sauceMarks=[],cheeseMarks=[];let externalOrder=null;let order,step,chosenSize,selected,hasSauce,hasCheese,bakeQuality,baking=false,progress=0,timer=null,round=0;
const buttons=(labels,fn)=>{ $('choices').replaceChildren();labels.forEach(label=>{const b=document.createElement('button');b.textContent=label;b.type='button';b.onclick=()=>fn(label,b);$('choices').append(b)})};
const message=t=>$('feedback').textContent=t;
function start(){clearInterval(timer);baking=false;round++;order=externalOrder || randomOrder();step=0;chosenSize=null;selected=[];placedPieces=[];crustMarks=[];chosenSeasoning=null;seasoningMode=false;$('crustSeasoning').replaceChildren();activeTopping=null;hasSauce=false;hasCheese=false;chosenSauce=null;chosenCheese=null;paintMode=null;sauceMarks=[];cheeseMarks=[];bakeQuality=0;progress=0;$('pizza').className='pizza';drawPaint();$('toppings').replaceChildren();$('meterFill').style.width='0%';$('meterLabel').textContent='Ready to prep';$('ticket').innerHTML=`<div class="order-heading">🧾 CUSTOMER ORDER #${String(round).padStart(3,'0')}</div><div class="order-line">🍕 <b>Size:</b> ${order.size}</div><div class="order-line order-toppings">🧀 ${order.toppings.join(' + ') || 'Plain cheese'}</div><div class="order-line">🍅 Sauce: ${order.sauce||'Classic Tomato'}</div><div class="order-line">🧀 Cheese: ${order.cheese||'Mozzarella'}</div><div class="order-line">🌿 Crust: ${order.seasoning||"Plain Crust"}</div><div class="order-line">🏠 <b>Address:</b> ${order.address}</div><div class="order-line">✓ Make this pizza exactly as ordered!</div>`;render()}
function render(){message('');$('next').disabled=true;$('next').textContent='Continue →';const titles=['1. Choose pizza size','2. Spread sauce','3. Add cheese','4. Add toppings','5. Season the crust','6. Bake the pizza','7. Box the order'];$('stepTitle').textContent=titles[step];$('stage').textContent=['DOUGH STATION','SAUCE STATION','CHEESE STATION','TOPPING STATION','CRUST SEASONING','PIZZA OVEN','BOXING STATION'][step];
if(step===0){$('instruction').textContent='Select the size from the order ticket.';buttons(['Small','Medium','Large'],(s,b)=>{chosenSize=s;$('pizza').className='pizza '+s.toLowerCase();highlight(b);$('next').disabled=false})}
if(step===1){$('instruction').textContent='Choose a sauce, then DRAG your mouse or finger across the pizza to paint it on. Cover the dough yourself!';
buttons(sauceTypes,(name,b)=>{chosenSauce=name;paintMode='sauce';highlight(b);message('Paint '+name+' on the pizza!')});
addPaintControls('sauce');$('next').disabled=sauceMarks.length<6;
}
if(step===2){$('instruction').textContent='Choose your cheese, then DRAG across the pizza to sprinkle it on yourself!';
buttons(cheeseTypes,(name,b)=>{chosenCheese=name;paintMode='cheese';highlight(b);message('Sprinkle '+name+' across the pizza!')});
addPaintControls('cheese');$('next').disabled=cheeseMarks.length<6;
}
if(step===3){
$('instruction').textContent='Choose a topping, then CLICK or TAP the pizza to place each piece yourself. Add as many pieces as you want!';
buttons(Object.keys(toppingData),(name,b)=>{activeTopping=name;highlight(b);message('Now placing '+name+'. Tap the pizza to add pieces.');});
const undo=document.createElement('button');undo.type='button';undo.textContent='↶ Undo last piece';undo.onclick=()=>{placedPieces.pop();drawToppings();message(placedPieces.length+' pieces placed')};$('choices').append(undo);
const clear=document.createElement('button');clear.type='button';clear.textContent='✕ Clear toppings';clear.onclick=()=>{placedPieces=[];drawToppings();message('Toppings cleared')};$('choices').append(clear);
$('next').disabled=false;
}
if(step===4){
 $('instruction').textContent='Choose a crust seasoning, then TAP or DRAG around the OUTER EDGE of the pizza to season the crust!';
 buttons(seasoningTypes,(name,b)=>{chosenSeasoning=name;seasoningMode=name!=='Plain Crust';highlight(b);message(seasoningMode?'Brush '+name+' onto the outer crust!':'Plain crust selected — no seasoning needed.');$('next').disabled=seasoningMode?crustMarks.length<4:false});
 const undo=document.createElement('button');undo.textContent='↶ Undo seasoning';undo.onclick=()=>{crustMarks.pop();drawCrustSeasoning();$('next').disabled=seasoningMode&&crustMarks.length<4};$('choices').append(undo);
 const clear=document.createElement('button');clear.textContent='✕ Clear seasoning';clear.onclick=()=>{crustMarks=[];drawCrustSeasoning();$('next').disabled=seasoningMode};$('choices').append(clear);
 $('next').disabled=!(chosenSeasoning==='Plain Crust'||(chosenSeasoning&&crustMarks.length>=4));
}
if(step===5){$('instruction').textContent='Start baking, then remove the pizza while the meter is in the green PERFECT zone (60–80%).';buttons(['🔥 Start Baking','🧤 Remove Pizza'],(name)=>{if(name.startsWith('🔥')){if(baking||progress>0)return;baking=true;timer=setInterval(()=>{progress=Math.min(100,progress+1);$('meterFill').style.width=progress+'%';updateBurnAppearance();$('meterFill').style.background=progress<60?'#e5a63d':progress<=80?'#239956':'#a52a20';$('meterLabel').textContent=progress<60?'RAW':progress<=80?'PERFECT':'BURNING';if(progress===100){stopBake()}},100)}else if(progress>0){stopBake()}})}
if(step===6){$('instruction').textContent='Put the pizza in the delivery box and check the results.';buttons(['📦 Box Pizza'],()=>{showBoxedPizza();$('next').disabled=false;message('Pizza is in the box! Finish the order to return to the shop for delivery.')});$('next').textContent='Finish order ✓'}
}
const sauceColors={'Classic Tomato':'#bd3121','Spicy Marinara':'#a71d13','BBQ':'#743721','Alfredo':'#f6e4ba','Pesto':'#3d8b42'};
const cheeseColors={'Mozzarella':'#ffe9a2','Cheddar':'#f8a935','Parmesan':'#f8e8ba','Provolone':'#ffe8a0','Vegan Cheese':'#f0cf73'};
const canvas=$('paintCanvas'),ctx=canvas.getContext('2d');canvas.width=600;canvas.height=600;
function drawPaint(){ctx.clearRect(0,0,600,600);
 for(const [marks,color] of [[sauceMarks,sauceColors[chosenSauce]||'#bd3121'],[cheeseMarks,cheeseColors[chosenCheese]||'#ffe9a2']]){
 ctx.fillStyle=color;
 marks.forEach(({x,y,r})=>{ctx.beginPath();ctx.arc(x*6,y*6,r,0,Math.PI*2);ctx.fill()});
 }}
function addPaintControls(layer){const undo=document.createElement('button');undo.textContent='↶ Undo stroke';undo.type='button';undo.onclick=()=>{const marks=layer==='sauce'?sauceMarks:cheeseMarks;marks.splice(Math.max(0,marks.length-18));drawPaint();$('next').disabled=marks.length<6};$('choices').append(undo);
const clear=document.createElement('button');clear.textContent='✕ Clear '+layer;clear.type='button';clear.onclick=()=>{if(layer==='sauce')sauceMarks=[];else cheeseMarks=[];drawPaint();$('next').disabled=true};$('choices').append(clear)}
function paintAt(e){if(!paintMode||!((step===1&&paintMode==='sauce')||(step===2&&paintMode==='cheese')))return;
const rect=$('pizza').getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;
if((x-50)**2+(y-50)**2>38**2)return;
const marks=paintMode==='sauce'?sauceMarks:cheeseMarks;
const radius=paintMode==='sauce'?42:9;
marks.push({x,y,r:radius});drawPaint();$('next').disabled=marks.length<6;
message(marks.length<6?'Keep painting to cover the pizza!':'Looking good! Continue painting or press Continue →')}
$('pizza').addEventListener('pointerdown',e=>{if(step!==1&&step!==2&&step!==4)return;if(step===4){if(!chosenSeasoning){message('Choose a crust seasoning first!');return}if(chosenSeasoning==='Plain Crust')return;painting=true;$('pizza').setPointerCapture(e.pointerId);seasonCrustAt(e);return}if(!paintMode){message('Choose a sauce or cheese first!');return}painting=true;$('pizza').setPointerCapture(e.pointerId);paintAt(e)});
$('pizza').addEventListener('pointermove',e=>{if(painting){if(step===4)seasonCrustAt(e);else paintAt(e)}});
$('pizza').addEventListener('pointerup',()=>{painting=false});
$('pizza').addEventListener('pointercancel',()=>{painting=false});
function drawCrustSeasoning(){
 const layer=$('crustSeasoning');layer.replaceChildren();
 const colors={'Garlic Butter':'#eac348','Italian Herbs':'#427d36','Parmesan Garlic':'#f3df9a','Everything Seasoning':'#493c2b'};
 for(const {x,y} of crustMarks){
  const dot=document.createElement('span');dot.className='crust-seasoning-dot';
  dot.style.left=x+'%';dot.style.top=y+'%';dot.style.background=colors[chosenSeasoning]||'#eac348';
  layer.append(dot);
 }
}
function seasonCrustAt(e){
 if(step!==4||!seasoningMode)return;
 const rect=$('pizza').getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;
 const distance=Math.hypot(x-50,y-50);
 if(distance<39||distance>50){message('Season the outer crust ring, not the middle!');return}
 const last=crustMarks[crustMarks.length-1];
 if(last&&Math.hypot(last.x-x,last.y-y)<2.5)return;
 crustMarks.push({x:+x.toFixed(1),y:+y.toFixed(1)});drawCrustSeasoning();
 $('next').disabled=crustMarks.length<4;
 message(crustMarks.length<4?'Keep seasoning the crust!':'Crust seasoned! Continue when ready.');
}
function updateBurnAppearance(){
 const pizza=$('pizza');
 pizza.classList.toggle('pizza-burnt',progress>=85);
 pizza.classList.toggle('pizza-charred',progress>=96);
 pizza.classList.toggle('pizza-golden',progress>=60&&progress<85);
}
function stopBake(){updateBurnAppearance();clearInterval(timer);baking=false;bakeQuality=progress>=60&&progress<=80?100:Math.max(0,100-Math.abs(progress-70)*2.5);$('next').disabled=false;message(progress>=60&&progress<=80?'Perfect bake!':progress<60?'Undercooked pizza!':'Pizza is overcooked!')}
function highlight(b){[...$('choices').children].forEach(el=>el.classList.remove('selected'));b.classList.add('selected')}
function drawToppings(){
$('toppings').replaceChildren();
placedPieces.forEach(({name,x,y})=>{const p=document.createElement('span');p.className='piece';p.textContent=toppingData[name];p.style.left=x+'%';p.style.top=y+'%';$('toppings').append(p)});
selected=[...new Set(placedPieces.map(p=>p.name))];
}
$('pizza').addEventListener('pointerdown',e=>{
if(step!==3||!activeTopping)return;
const rect=$('pizza').getBoundingClientRect();
const x=(e.clientX-rect.left)/rect.width*100,y=(e.clientY-rect.top)/rect.height*100;
// The pizza is round: keep all toppings within the crust.
const dx=x-50,dy=y-50;if(dx*dx+dy*dy>39*39){message('Place the topping inside the crust!');return;}
placedPieces.push({name:activeTopping,x:+x.toFixed(1),y:+y.toFixed(1)});
drawToppings();message(placedPieces.length+' pieces placed. Keep going or continue!');
});
function showBoxedPizza(){
 const box=$('deliveryBox');
 box.hidden=false;
 document.body.classList.add('pizza-is-boxed');
 $('stage').textContent='📦 BOXED & READY';
}
function finish(){showBoxedPizza();document.body.classList.add('order-finished');$('exitShop').textContent='🚪 Pizza Ready! Back to Shop →';let score=100;const issues=[];if(chosenSize!==order.size){score-=20;issues.push('Wrong pizza size')}if(sauceMarks.length<6){score-=15;issues.push('Not enough sauce')}if(cheeseMarks.length<6){score-=15;issues.push('Not enough cheese')}if(chosenSauce!==(order.sauce||'Classic Tomato')){score-=12;issues.push('Wrong sauce')}if(chosenCheese!==(order.cheese||'Mozzarella')){score-=12;issues.push('Wrong cheese')}const missing=order.toppings.filter(t=>!selected.includes(t));const extra=selected.filter(t=>!order.toppings.includes(t));score-=missing.length*15+extra.length*10;if(missing.length)issues.push('Missing: '+missing.join(', '));if(extra.length)issues.push('Extra: '+extra.join(', '));if(chosenSeasoning!==(order.seasoning||'Plain Crust')){score-=8;issues.push('Wrong crust seasoning')}if(chosenSeasoning!=='Plain Crust'&&crustMarks.length<4){score-=8;issues.push('Crust not fully seasoned')}if(bakeQuality<100){score-=Math.round((100-bakeQuality)*.25);issues.push('Bake timing was off')}score=Math.max(0,score);$('stepTitle').textContent='Order complete!';$('stage').textContent='DELIVERY READY';$('instruction').textContent=`📦 Pizza boxed! Quality: ${score}%. Exit back to the shop and get ready for delivery!`;$('choices').replaceChildren();$('next').disabled=true;$('next').textContent='Order completed';$('feedback').innerHTML=`<strong>${score>=90?'🌟 Excellent work!':score>=60?'🙂 Customer may notice mistakes':'😠 Customer may be upset'}</strong><br>${issues.length?issues.join('<br>'):'Everything matches the ticket!'}<br>Deliver to: ${order.address}`;const result={type:'pizzaComplete',orderId:round,address:order.address,requestedSize:order.size,actualSize:chosenSize,requestedToppings:order.toppings,actualToppings:selected,toppingPieces:placedPieces,quality:score,bakeQuality,actualSauce:chosenSauce,actualCheese:chosenCheese,sauceCoverage:sauceMarks.length,cheeseCoverage:cheeseMarks.length,crustSeasoning:chosenSeasoning,crustSeasoningMarks:crustMarks.length};try{window.parent.postMessage(result,window.location.origin)}catch(e){}try{localStorage.setItem('pizzaDeliveryLastPizza',JSON.stringify(result))}catch(e){}}
$('next').addEventListener('click',()=>{if(step===5&&baking)return;if(step===1)hasSauce=sauceMarks.length>=6;if(step===2)hasCheese=cheeseMarks.length>=6;paintMode=null;if(step===6){finish();return}step++;render()});$('restart').addEventListener('click',()=>{document.body.classList.remove('order-finished','pizza-is-boxed');$('deliveryBox').hidden=true;$('exitShop').textContent='🚪 Exit — Back to Shop';externalOrder=null;start()});
$('exitShop').addEventListener('click',()=>{
  // When embedded in the 3D shop, ask the parent to close the iframe.
  if(window.parent!==window){
    window.parent.postMessage({type:'closePizzaGame'},window.location.origin);
    return;
  }
  // Standalone mode: allow a safe explicit shop URL or use the default folder.
  const params=new URLSearchParams(window.location.search);
  const target=params.get('shop');
  const safeTarget=target && !target.startsWith('//') && !target.startsWith('\\') && !/^[a-z][a-z0-9+.-]*:/i.test(target) ? target : '../shop/index.html';
  window.location.href=safeTarget;
});

// Optionally receive an order from the parent 3D shop using postMessage.
// Example: iframe.contentWindow.postMessage({type:'setPizzaOrder',order:{size:'Large',toppings:['Pepperoni','Mushrooms'],address:'126 Maple Street',sauce:'Classic Tomato',cheese:'Mozzarella'}}, location.origin)
function applyOrder(candidate){
 if(!candidate || !['Small','Medium','Large'].includes(candidate.size) || !Array.isArray(candidate.toppings))return;
 const cleanToppings=[...new Set(candidate.toppings.filter(t=>Object.hasOwn(toppingData,t)))];
 const cleanAddress=String(candidate.address||'Pickup').slice(0,90);
 externalOrder={size:candidate.size,toppings:cleanToppings,address:cleanAddress,sauce:sauceTypes.includes(candidate.sauce)?candidate.sauce:'Classic Tomato',cheese:cheeseTypes.includes(candidate.cheese)?candidate.cheese:'Mozzarella',seasoning:seasoningTypes.includes(candidate.seasoning)?candidate.seasoning:'Plain Crust'};document.body.classList.remove('order-finished','pizza-is-boxed');$('deliveryBox').hidden=true;$('exitShop').textContent='🚪 Exit — Back to Shop';start();
}
window.addEventListener('message',event=>{
 if(event.origin!==window.location.origin || event.data?.type!=='setPizzaOrder')return;
 applyOrder(event.data.order);
});
// Standalone mode generates a new random customer order on every start/restart.
start();
})();
