/* KimyaVerse 53 — birbirinden farkli, renkli bilim temali SVG oyun kapaklari */
(function () {
 "use strict";
 const specs = [["electron","Elektron Dizilimi","orbit","#408eff","#a459ff","1s²"],["lewis","Lewis Noktaları","lewis","#19a8cf","#a46aff","O"],["quiz","Karışık Test","quiz","#ff7c54","#e9ae43","?"],["unit","Ünite Testi","unit","#fa755b","#eab856","✓"],["memory","Hafıza Oyunu","memory","#5aa6ff","#a76fff","H"],["arena","KimyaVerse Arena","trophy","#ef9b34","#ec5caf","★"],["elements","Element Dedektifi","search","#32beaa","#55aaff","Na"],["isotope","İzotop Avcısı","nucleus","#a066f5","#68c4ff","¹⁴C"],["periodic","Periyodik Harita","periodic","#6e8dff","#b16afa","Fe"],["symbols","Sembol Eşleştir","memory","#ff9f51","#ff648c","Cu"],["states","Tanecik Dedektifi","states","#5a9cff","#23d0bd","●"],["safety","Güvenli Laboratuvar","safety","#fa934b","#ee5e87","!"],["bonds","Bağlar Arenası","bonds","#8b6aff","#39d5cf","H₂O"],["balance","Denklem Ustası","equation","#a05cff","#fb8d81","⇌"],["solutions","Çözelti Kaşifi","flask","#16b8c8","#47a5fb","M"],["formulas","Molekül Eşleştir","molecule","#54a2f8","#c66bff","CO₂"],["mol","Mol Laboratuvarı","mol","#5f79ef","#f0a85d","6.02"],["lab","Lab Simgelerini Bul","tubes","#39bad1","#a369f9","⚗"],["gas","Gaz Yasaları Odası","gas","#39a2ed","#32d7ba","PV"],["ph","pH Hesap Makinesi","ph","#f777ab","#7f75ec","pH"],["energy","Enerji Yolu","energy","#fa8850","#e056a8","ΔH"],["equilibrium","Denge Dedektifi","equilibrium","#23bbaa","#b989ed","Kc"],["organic","Organik Kodlar","organic","#87b44f","#55cfb9","C=C"],["electro","Pil Mühendisi","battery","#f5ac44","#40c6d5","Zn"],["class-bingo","Periyodik Bingo","bingo","#62a6f8","#a16aec","BINGO"],["class-tabu","Kimya Tabu","tabu","#fa6d9d","#ae6eeb","TABU"],["class-relay","Takım Rölesi","relay","#ffab50","#53b8ff","VS"]];
 const data = Object.fromEntries(specs.map(([id,title,kind,a,b,label])=>[id,{title,kind,a,b,label}]));
 const classic = {"Elektron Dizilimi":"electron","Lewis Noktaları":"lewis","Karışık Test":"quiz","Ünite Testi":"unit","Hafıza Oyunu":"memory","KimyaVerse Arena":"arena"};
 const circle=(x,y,r,fill,extra="")=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" '+extra+'/>';
 const rect=(x,y,w,h,fill,extra="")=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="15" fill="'+fill+'" '+extra+'/>';
 const line=(x,y,a,b,w=7,col="#fff")=>'<path d="M'+x+' '+y+' L'+a+' '+b+'" stroke="'+col+'" stroke-width="'+w+'" stroke-linecap="round" />';
 const txt=(s,x,y,z=46,col="#fff")=>'<text x="'+x+'" y="'+y+'" text-anchor="middle" font-family="Arial,sans-serif" font-size="'+z+'" font-weight="800" fill="'+col+'">'+s+'</text>';
 function scene(kind) {
  const glass='<path d="M-34 -78h68 M-21 -78v58l-62 104q-6 20 16 20H67q22 0 16-20L21-20v-58" stroke="#effcff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="#83dfff24"/>';
  const molecule=(arr=[[0,0,35],[73,-46,23],[-77,-44,23]])=>arr.map(([x,y,r],i)=>circle(x,y,r,i?"#a7ddff":"#ffc1ff",'stroke="#ffffffc4" stroke-width="6"')).join('');
  const dots=Array.from({length:16},(_,i)=>circle(-65+(i*37)%130,-49+(i*41)%108,5+(i%3)*2,"#ebffffcc")).join("");
  let out="";
  switch(kind) {
   case "orbit": case "nucleus": case "search":
    out='<g fill="none" stroke="#def8ff" stroke-width="5" opacity=".9"><ellipse rx="118" ry="45" transform="rotate(-42)"/><ellipse rx="118" ry="45" transform="rotate(45)"/><ellipse rx="116" ry="44"/></g>'+circle(0,0,27,"#ffd68a")+circle(80,-56,10,"#b9f8ff")+circle(-81,55,10,"#d9b4ff"); 
    if(kind==="search")out+='<circle cx="15" cy="-5" r="92" fill="none" stroke="#fff" stroke-width="11"/>'+line(82,66,136,120,14);
    if(kind==="nucleus")out+=circle(-11,5,17,"#6bc6ff")+circle(15,-8,14,"#fb9fd8");break;
   case "lewis":out=txt("O",0,42,116)+[[0,-90],[0,95],[-105,0],[105,0],[-77,-73],[77,-73],[-77,77],[77,77]].map(([x,y])=>circle(x,y,12,"#bafcff")).join("");break;
   case "quiz":case "unit":
    out=rect(-83,-110,170,222,"#f1f5ffc9",'stroke="#fff" stroke-width="5"');
    out+=[-65,-20,25,70].map(y=>rect(-55,y,98,7,"#527aa9")).join("");
    out+=txt(kind==="quiz"?"?":"✓",67,45,94,"#ffdc6d");break;
   case "memory":case "periodic":case "bingo":
    out=[[-118,-76,"H"],[-8,-76,"C"],[102,-76,"O"],[-118,35,"Fe"],[-8,35,"Cu"],[102,35,"Na"]].map(([x,y,t],i)=>rect(x-30,y-29,84,90,i%2?"#94d5ffb5":"#dac8ffb9",'stroke="#eefbff" stroke-width="4"')+txt(t,x+12,y+25,33,"#1b3764")).join("");
    break;
   case "trophy": out='<path d="M-66 -91H66V-19Q65 71 0 85Q-65 70-66-19Z" fill="#ffd87b" stroke="#fff0b1" stroke-width="9"/><path d="M-66 -60H-112Q-135 -10-83 33M66-60H111Q136-10 85 33" fill="none" stroke="#ffe09e" stroke-width="14"/>'+line(0,80,0,118,14)+line(-65,118,65,118,14)+txt("★",0,30,93,"#fff3cb");break;
   case "states":out=[-105,0,105].map((x,k)=>rect(x-45,-75,90,145,"#10204d77",'stroke="#e5f9ff" stroke-width="5"')+Array.from({length:k===0?9:k===1?7:4},(_,j)=>circle(x-24+(j*28)%57,-48+(j*35)%106,9,k===0?"#b9eaff":k===1?"#bde9fa":"#ffdbaf")).join("")).join("");break;
   case "safety":out='<path d="M0-114L127 99H-127Z" fill="#ffe199" stroke="#fff" stroke-width="10"/>'+txt("!",0,67,153,"#b24748");break;
   case "bonds":out=line(-76,-31,0,12,12)+line(0,12,79,-31,12)+circle(0,12,43,"#ee9cb8",'stroke="#fff" stroke-width="5"')+circle(-83,-37,31,"#b4efff",'stroke="#fff" stroke-width="5"')+circle(85,-37,31,"#b4efff",'stroke="#fff" stroke-width="5"');break;
   case "equation":out=txt("H₂", -103,30,63)+txt("+",-26,22,49)+txt("O₂",48,30,63)+txt("→",128,22,53);break;
   case "flask":case "tubes":out='<g transform="translate(0 7)">'+glass+'<path d="M-56 47h112l21 36h-154Z" fill="#64e7d0bd"/></g>'+circle(-24,60,8,"#fff")+circle(22,79,9,"#fff");if(kind==="tubes")out+='<g transform="translate(112 12) scale(.65)">'+glass+'</g>';break;
   case "molecule":out=molecule()+line(-75,-43,0,0,10)+line(0,0,72,-45,10)+txt("CO₂",0,109,44);break;
   case "mol":out=txt("6.02",0,25,90)+txt("× 10²³",20,80,50)+dots;break;
   case "gas":out=rect(-110,-110,220,210,"#25466e65",'stroke="#d8f8ff" stroke-width="9"')+line(-105,-66,105,-66,13)+line(0,-130,0,-66,14)+dots;break;
   case "ph":out=rect(-122,-50,244,90,"#e7f9ffcf")+Array.from({length:7},(_,i)=>rect(-109+i*32,-32,31,53,["#ee4f6e","#f8a559","#e4de5d","#75d3a4","#44b5e3","#6071e0","#ae67cf"][i])).join("")+txt("pH",0,-75,57);break;
   case "energy":out='<path d="M-120 88V-105M-120 88H135" stroke="#fff" stroke-width="8" fill="none"/><path d="M-105 45Q-40 50-18-65T75 0T135-48" stroke="#ffe09f" stroke-width="12" fill="none" stroke-linecap="round"/>'+txt("ΔH",76,-61,48);break;
   case "equilibrium":out='<path d="M-122 -36H104l-34-28M118 36H-108l34 28" stroke="#f3faff" stroke-width="13" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+txt("K",0,13,44);break;
   case "organic":out='<path d="M-1-98L86-47V49L0 98L-86 47V-49Z" stroke="#eeffcb" stroke-width="11" fill="#91dc9d30"/><circle r="53" stroke="#eeffcb" fill="none" stroke-width="7"/>';break;
   case "battery":out=rect(-105,-72,210,150,"#6e7fd5b5",'stroke="#f8fdff" stroke-width="8"')+rect(-9,-92,33,20,"#f8fdff")+txt("−", -65,27,70)+txt("+",62,27,69)+txt("⚡",0,54,83,"#ffe792");break;
   case "tabu":out=rect(-118,-92,236,185,"#ffdfebcf",'stroke="#fff" stroke-width="5"')+txt("TABU",0,-7,64,"#a73673")+line(-80,20,78,20,5,"#b973aa")+line(-70,51,70,51,5,"#b973aa");break;
   case "relay":out=[[-105,28,100],[0,-12,141],[105,42,88]].map(([x,y,h],i)=>rect(x-46,y,94,h,["#83b9ff","#ffe9a2","#f4a7cf"][i]) + txt(String(i===1?1:i===0?2:3),x,y+47,48,"#31436e")).join("");break;
   default:out=glass;
  }
  return '<g transform="translate(320 179)">'+out+'</g>';
 }
 function svgFor(spec,id) {
  const dark="#07182c";
  const gradient='<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+spec.a+'"/><stop offset=".5" stop-color="'+spec.b+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient><radialGradient id="gl" cx=".5" cy=".4" r=".7"><stop stop-color="#fff" stop-opacity=".23"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>';
  const sparks=Array.from({length:18},(_,i)=>circle(28+(i*139)%600,13+(i*97)%323,1.5+i%4,"#ffffff", 'opacity="'+(.16+(i%4)*.1)+'"')).join("");
  return '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="'+spec.title+' oyunu görseli">'+gradient+'<rect width="640" height="360" fill="url(#bg)"/><rect width="640" height="360" fill="url(#gl)"/><circle cx="90" cy="66" r="115" fill="#fff" opacity=".07"/><circle cx="570" cy="306" r="156" fill="#091733" opacity=".24"/>'+sparks+scene(spec.kind)+'</svg>';
 }
 function imageFor(id) {
  const spec=data[id]||data.quiz;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svgFor(spec,id));
 }
 function decorate() {
  const root=document.getElementById("gameCards");if(!root)return;
  root.querySelectorAll(".card").forEach(card=>{
   const head=card.querySelector(".cardbody h3"),cover=card.querySelector(".cardphoto");
   if(!head||!cover||cover.querySelector(".kv53-art"))return;
   const id=classic[head.textContent.trim()];if(id)addImage(cover,id);
  });
  root.querySelectorAll(".kv47-game-card").forEach(card=>{
   const cover=card.querySelector(".kv51-cover");
   if(!cover||cover.querySelector(".kv53-art"))return;
   const id=card.dataset.kv47Game||card.dataset.kv51Class;
   if(id&&data[id])addImage(cover,id);
  });
 }
 function addImage(cover,id) {
  const im=document.createElement("img");
  im.className="kv53-art";im.alt="";im.loading="lazy";im.decoding="async";im.src=imageFor(id);
  cover.appendChild(im);
  cover.dataset.kv53Art=id;
 }
 function init(){
  const grid=document.getElementById("gameCards");if(!grid)return;
  decorate();
  const observer=new MutationObserver(decorate);
  observer.observe(grid,{childList:true,subtree:true});
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
