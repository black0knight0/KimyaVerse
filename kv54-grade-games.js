/* KimyaVerse 54: tek sinif filtresi + dokuz etkileşimli ust sinif oyunu */
(function(){
"use strict";
var $=id=>document.getElementById(id);
var oldGrades={electron:[9],lewis:[9],memory:[10],unit:[11],quiz:[12],arena:[9,10,11,12]};
var classGrades={"class-bingo":[9],"class-tabu":[9,10,11,12],"class-relay":[11,12]};
var definitions=[
{id:"kv54-balance",grade:10,title:"Tepkime Terazisi",desc:"Katsayıları değiştir, iki taraftaki atomları denkleştir.",kind:"balance",tag:"DENKLEM"},
{id:"kv54-mol",grade:10,title:"Mol Fabrikası",desc:"Madde miktarını ayarla ve hedef kütleye ulaş.",kind:"mol",tag:"MOL"},
{id:"kv54-separate",grade:10,title:"Karışım Atölyesi",desc:"Karışımı ayırmak için doğru laboratuvar aracını uygula.",kind:"separate",tag:"KARIŞIM"},
{id:"kv54-gas",grade:11,title:"Gaz Pistonu",desc:"Pistonu hareket ettir, Boyle yasasıyla hedef basınca ulaş.",kind:"gas",tag:"GAZ"},
{id:"kv54-rate",grade:11,title:"Çarpışma Laboratuvarı",desc:"Sıcaklık, derişim ve katalizörle model hızını değiştir.",kind:"rate",tag:"HIZ"},
{id:"kv54-equilibrium",grade:11,title:"Dengeyi Kaydır",desc:"Koşulları değiştirip denge yönünü görerek hedefe ulaş.",kind:"equilibrium",tag:"DENGE"},
{id:"kv54-organic",grade:12,title:"Organik Yapı Kur",desc:"Karbon sayısını ve fonksiyonel grubu seçip molekül oluştur.",kind:"organic",tag:"ORGANİK"},
{id:"kv54-cell",grade:12,title:"Elektrokimya Hücresi",desc:"Anot ve katodu doğru yerleştirerek pil devresi kur.",kind:"cell",tag:"PİL"},
{id:"kv54-polymer",grade:12,title:"Polimer Zinciri",desc:"Uygun monomerleri sıralayıp polimer zinciri oluştur.",kind:"polymer",tag:"POLİMER"}
];
var pending=null,loaded=false,grade="all";
function el(tag,cls,content){var x=document.createElement(tag);if(cls)x.className=cls;if(content!=null)x.textContent=content;return x;}
function btn(text,fn,cls=""){var x=el("button","kv54-btn "+cls,text);x.type="button";x.onclick=fn;return x;}
function text(tag,s){return el(tag,"",s);}
function currentGrade(){var s=$("kv47GameGrade");return s?s.value:"all";}
function isVisible(grades,f){return f==="all"||grades.includes(Number(f));}
function syncClassicGrade(){
 var f=currentGrade();if(f==="all")return;
 try{
  if(typeof state!=="undefined"&&state&&Number(state.grade)!==Number(f)){
    state.grade=Number(f);
    if(typeof store==="function")store();
    if(typeof refreshCounters==="function")refreshCounters();
  }
 }catch(e){console.warn("Sınıf senkronizasyonu:",e);}
}
function applyGrade(){
 var grid=$("gameCards");if(!grid)return;
 grade=currentGrade();
 grid.querySelectorAll(".card").forEach(function(card){
   var action=card.querySelector("button[data-game]");
   if(!action)return;
   var grades=oldGrades[action.dataset.game]||[];
   card.classList.toggle("kv54-hidden",!isVisible(grades,grade));
   card.dataset.kv54Grades=grades.join(",");
 });
 grid.querySelectorAll("[data-kv51-class]").forEach(function(card){
   var id=card.dataset.kv51Class, original=classGrades[id];
   var extra=definitions.find(x=>x.id===id);
   var target=original||(extra?[extra.grade]:[9,10,11,12]);
   card.classList.toggle("kv54-hidden",!isVisible(target,grade));
 });
 var note=$("kv54GradeNote");
 if(note)note.textContent=grade==="all"?"Tüm sınıfların oyunları · Arena her sınıfta":grade+". sınıfa uygun oyunlar · Arena her sınıfta";
}
function buildCards(){
 var grid=$("gameCards");if(!grid)return;
 var holder=$("kv54Games");
 if(!holder){holder=el("div");holder.id="kv54Games";holder.style.display="contents";}
 definitions.forEach(function(g){
   if(holder.querySelector('[data-kv51-class="'+g.id+'"]'))return;
   var card=el("button","kv47-game-card kv54-game-card");card.type="button";card.dataset.kv51Class=g.id;
   var cover=el("div","kv51-cover");cover.append(text("span",g.tag));
   card.append(cover,text("small",g.grade+". SINIF · ETKİLEŞİMLİ"),text("strong",g.title),text("p",g.desc),el("span","kv47-launch","Oyunu aç →"));
   card.onclick=function(){launch(g);};holder.append(card);
 });
 if(!grid.contains(holder))grid.append(holder);
}
function init(){
 var select=$("kv47GameGrade"),grid=$("gameCards");
 if(!grid||!select){if(pending<18){pending=(pending||0)+1;setTimeout(init,180);}return;}
 if(loaded)return;loaded=true;
 var note=el("p","kv54-grade-note");note.id="kv54GradeNote";
 var bar=document.querySelector("#games .kv51-class-filter");
 if(bar)bar.append(note);else select.parentElement.append(note);
 // Orijinal kv47 filtresi de burada çalışır; biz eski kartlari ve sinif oyunlarini senkronluyoruz.
 select.addEventListener("change",function(){syncClassicGrade();buildCards();applyGrade();});
 buildCards();applyGrade();
 var scheduled=false;
 new MutationObserver(function(){
   if(scheduled)return;scheduled=true;
   queueMicrotask(function(){scheduled=false;buildCards();applyGrade();});
 }).observe(grid,{childList:true});
}
function shell(g){
 if(typeof window.go==="function")window.go("play");
 var root=$("playContent");if(!root)return null;
 $("playTitle").textContent=g.title;$("playSubtitle").textContent=g.desc;
 root.className="gameboard kv54-play";root.replaceChildren();
 var panel=el("section","kv54-panel"),meta=el("div","kv54-progress"),stage=el("div","kv54-stage");
 panel.append(meta,stage);root.append(panel);
 return {panel,meta,stage};
}
function launch(g){
 var ui=shell(g);if(!ui)return;
 var round=0,score=0,completed=false;
 var all={
 balance:[
 {forms:["H₂","O₂","H₂O"],atoms:[{H:2},{O:2},{H:2,O:1}],target:[2,1,2]},
 {forms:["N₂","H₂","NH₃"],atoms:[{N:2},{H:2},{N:1,H:3}],target:[1,3,2]},
 {forms:["Fe","O₂","Fe₂O₃"],atoms:[{Fe:1},{O:2},{Fe:2,O:3}],target:[4,3,2]}
 ],
 mol:[
 {name:"Su (H₂O)",molar:18,grams:36,answer:2},
 {name:"Karbondioksit (CO₂)",molar:44,grams:22,answer:.5},
 {name:"Oksijen (O₂)",molar:32,grams:8,answer:.25}
 ],
 separate:[
 {mix:"Demir tozu + kum",correct:"Mıknatıs",why:"Demir manyetik olduğu için mıknatısla ayrılır."},
 {mix:"Kum + su",correct:"Süzme",why:"Suda çözünmeyen kum filtrede tutulur."},
 {mix:"Tuzlu su",correct:"Buharlaştırma",why:"Su uzaklaştırılarak çözünmüş tuz elde edilir."},
 {mix:"Zeytinyağı + su",correct:"Ayırma hunisi",why:"Birbirine karışmayan sıvı fazları ayrılır."}
 ],
 gas:[
 {p:2,v:3,target:3},{p:1,v:6,target:2},{p:4,v:2,target:2}
 ],
 rate:[{goal:2},{goal:3},{goal:4}],
 equilibrium:[
 {goal:"sağ",exo:true,title:"Ürün oluşumunu artır",hint:"Giren eklenmesi dengeyi ürünlere doğru kaydırır."},
 {goal:"sol",exo:true,title:"Giren oluşumunu artır",hint:"Ekzotermik tepkimede sıcaklığı artırmak dengeyi girenlere kaydırır."},
 {goal:"sağ",exo:false,title:"Endotermik tepkimede ürünleri artır",hint:"Isı artışı endotermik yönde dengeyi kaydırır."}
 ],
 organic:[
 {name:"Etanol",carbons:2,group:"−OH",formula:"C₂H₅OH"},
 {name:"Propanon (aseton)",carbons:3,group:"C=O",formula:"CH₃COCH₃"},
 {name:"Etanoik asit",carbons:2,group:"−COOH",formula:"CH₃COOH"}
 ],
 cell:[
 {first:"Cu",second:"Zn",anode:"Zn",cathode:"Cu",pot:"Zn daha kolay yükseltgenir."},
 {first:"Mg",second:"Cu",anode:"Mg",cathode:"Cu",pot:"Mg'nin indirgenme eğilimi daha düşüktür."},
 {first:"Fe",second:"Cu",anode:"Fe",cathode:"Cu",pot:"Fe yükseltgenirken Cu iyonları indirgenir."}
 ],
 polymer:[
 {name:"Polietilen",unit:"Eten",repeat:4,link:"−CH₂−CH₂−"},
 {name:"Polipropilen",unit:"Propen",repeat:3,link:"−CH₂−CH(CH₃)−"},
 {name:"PVC",unit:"Vinil klorür",repeat:4,link:"−CH₂−CHCl−"}
 ]
 }[g.kind];
 function render(){
   ui.meta.textContent=g.grade+". SINIF · "+(round+1)+"/"+all.length+" aşama · "+score+" başarılı";
   ui.stage.replaceChildren();
   if(completed){ui.stage.append(text("h2","Tebrikler! "+score+"/"+all.length+" görevi tamamladın."),text("p","Bunlar öğrenme oyunlarıdır; Supabase lig XP'si ayrı doğrulanır."),btn("Yeniden oyna",function(){round=0;score=0;completed=false;render();},"primary"));return;}
   var d=all[round],feedback=el("div","kv54-feedback"),controls=el("div","kv54-controls");
   var solved=false;
   function message(s,ok){feedback.textContent=s;feedback.dataset.ok=ok?"true":"false";}
   function success(s){
     if(solved)return;solved=true;score++;
     message(s,true);controls.replaceChildren(btn(round===all.length-1?"Sonucu gör":"Sonraki aşama →",function(){round++;if(round>=all.length)completed=true;render();},"primary"));
     ui.meta.textContent=g.grade+". SINIF · "+(round+1)+"/"+all.length+" aşama · "+score+" başarılı";
   }
   function rowTitle(title,subtitle){ui.stage.append(text("h2",title),text("p",subtitle));}
   function checkButton(fn){controls.append(btn("Kontrol et",fn,"primary"));}
   if(g.kind==="balance"){
     rowTitle("Tepkimeni denkleştir","Her elementin atom sayısı girenlerde ve ürünlerde eşit olmalı.");
     var coeff=d.forms.map(()=>1),board=el("div","kv54-coefficients"),tally=el("div","kv54-tally");
     function update(){
       board.replaceChildren();
       d.forms.forEach(function(form,i){
         if(i===2)board.append(text("b","→"));
         var cell=el("div","kv54-coeff-cell"),counter=el("div","kv54-counter");
         counter.append(btn("−",function(){coeff[i]=Math.max(1,coeff[i]-1);update();}),text("strong",String(coeff[i])),btn("+",function(){coeff[i]=Math.min(7,coeff[i]+1);update();}));
         cell.append(text("strong",form),counter);board.append(cell);
       });
       var lhs={},rhs={};d.atoms.forEach(function(at,i){Object.keys(at).forEach(function(a){var into=i===2?rhs:lhs;into[a]=(into[a]||0)+at[a]*coeff[i];});});
       tally.textContent="Girenler: "+JSON.stringify(lhs)+" | Ürünler: "+JSON.stringify(rhs);
     }
     ui.stage.append(board,tally);update();
     checkButton(function(){if(coeff.every((n,i)=>n===d.target[i]))success("Denklem doğru dengelendi!");else message("Henüz denge yok. Element atomlarını iki tarafta say.",false);});
     controls.append(btn("İpucu",function(){message("En küçük tam sayı katsayılarını kullan. Her atom türü iki tarafta eşit olmalı.",false);}));
   }else if(g.kind==="mol"){
     rowTitle("Mol Fabrikası","Hedef kütleye ulaşacak mol miktarını ayarla.");
     var amount=0,number=el("strong","kv54-readout"),slider=el("input","kv54-slider");
     slider.type="range";slider.min="0";slider.max="4";slider.step=".25";slider.value="0";
     function update(){amount=Number(slider.value);number.textContent=amount.toLocaleString("tr-TR")+" mol = "+(amount*d.molar).toLocaleString("tr-TR")+" g";}
     slider.oninput=update;ui.stage.append(text("h3",d.name+" · Molar kütle "+d.molar+" g/mol"),text("p","Hedef: "+d.grams+" g"),slider,number);update();
     checkButton(function(){if(Math.abs(amount-d.answer)<.001)success("Harika! m = n × M.");else message("Hedef kütle / molar kütle = gerekli mol.",false);});
   }else if(g.kind==="separate"){
     rowTitle("Karışım Atölyesi","Ayrılacak karışım: "+d.mix);
     var chosen="",tools=el("div","kv54-tools");
     ["Mıknatıs","Süzme","Buharlaştırma","Ayırma hunisi"].forEach(function(m){
       var b=btn(m,function(){chosen=m;tools.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));message(m+" laboratuvar yöntemi seçildi. Uygula'ya bas.",false);});
       tools.append(b);
     });ui.stage.append(tools);
     controls.append(btn("Yöntemi uygula",function(){if(chosen===d.correct)success(d.why);else message("Bu karışım için uygun değil. Başka bir yöntem dene.",false);},"primary"));
   }else if(g.kind==="gas"){
     rowTitle("Gaz Pistonu","Sıcaklık sabitken basınç ve hacim ters orantılıdır (P₁V₁=P₂V₂).");
     var readout=el("strong","kv54-readout"),slider=el("input","kv54-slider"),piston=el("div","kv54-piston");
     slider.type="range";slider.min=".5";slider.max="8";slider.step=".5";slider.value=String(d.v);
     function update(){var v=Number(slider.value);var p=d.p*d.v/v;readout.textContent=v.toLocaleString("tr-TR")+" L · "+p.toFixed(2).replace(".",",")+" atm";piston.style.width=(v/8*100)+"%";}
     slider.oninput=update;
     ui.stage.append(text("h3","Başlangıç: "+d.p+" atm, "+d.v+" L · Hedef: "+d.target+" atm"),el("div","kv54-piston-track"),slider,readout);
     ui.stage.querySelector(".kv54-piston-track").append(piston);update();
     checkButton(function(){var p=d.p*d.v/Number(slider.value);if(Math.abs(p-d.target)<.051)success("Piston doğru yerde! Basınç × hacim sabit.");else message("Hacmi azaltınca basınç artar; artırınca azalır.",false);});
   }else if(g.kind==="rate"){
     rowTitle("Çarpışma Laboratuvarı","Temsili modelde hız artışı hedefi: +"+d.goal+" birim.");
     var widgets=el("div","kv54-tools"),status=el("strong","kv54-readout"),values=[false,false,false];
     ["Sıcaklığı artır (+2)","Derişimi artır (+2)","Katalizör ekle (+1)"].forEach(function(t,i){var b=btn(t,function(){values[i]=!values[i];b.classList.toggle("selected",values[i]);update();});widgets.append(b);});
     function update(){status.textContent="Model hız artışı: +"+(values[0]*2+values[1]*2+values[2]);}
     ui.stage.append(widgets,status,text("small","Bu gerçek bir hız hesabı değildir; değişkenlerin etki yönünü anlamak için basitleştirilmiştir."));update();
     checkButton(function(){if(values[0]*2+values[1]*2+values[2]===d.goal)success("İstenen model hızı oluşturuldu.");else message("Değişkenleri açıp kapatarak hedefe yaklaş.",false);});
   }else if(g.kind==="equilibrium"){
     rowTitle("Dengeyi Kaydır",d.title+" · Hedef yön: "+(d.goal==="sağ"?"Ürünler →":"← Girenler"));
     var bar=el("div","kv54-balance-visual"),chosen="";bar.append(text("span","Girenler"),el("div","kv54-balance-fill"),text("span","Ürünler"));
     var options=el("div","kv54-tools");var controlsMap=[["Giren ekle","sağ"],["Ürün ekle","sol"],["Ürünü uzaklaştır","sağ"],["Sıcaklığı artır",d.exo?"sol":"sağ"]];
     controlsMap.forEach(function(opt){var b=btn(opt[0],function(){chosen=opt[1];options.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));bar.dataset.shift=chosen;message("Modelde denge "+(chosen==="sağ"?"ürünlere":"girenlere")+" kaydı.",false);});options.append(b);});
     ui.stage.append(text("p",d.exo?"İleri tepkime ekzotermiktir.":"İleri tepkime endotermiktir."),bar,options);
     checkButton(function(){if(chosen===d.goal)success("Doğru! Le Châtelier ilkesini kullandın.");else message(d.hint,false);});
   }else if(g.kind==="organic"){
     rowTitle("Organik Yapı Kur","Hedef molekül: "+d.name);
     var carbons=1,selected="−OH",model=el("div","kv54-molecule"),row=el("div","kv54-controls"),groups=el("div","kv54-tools");
     function update(){model.textContent=carbons+" karbon · "+selected+" grubu";}
     row.append(btn("− karbon",function(){carbons=Math.max(1,carbons-1);update();}),btn("+ karbon",function(){carbons=Math.min(6,carbons+1);update();}));
     ["−OH","C=O","−COOH"].forEach(function(group){var b=btn(group,function(){selected=group;groups.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));update();});groups.append(b);});
     ui.stage.append(row,groups,model);update();
     checkButton(function(){if(carbons===d.carbons&&selected===d.group)success("Yapı tamamlandı: "+d.formula);else message("Hedef molekülün karbon sayısını ve fonksiyonel grubunu incele.",false);});
   }else if(g.kind==="cell"){
     rowTitle("Elektrokimya Hücresi",d.first+" ve "+d.second+" metalleriyle galvanik hücre kur.");
     var a="",c="",choices=[d.first,d.second];
     var selectors=el("div","kv54-electrodes");
     function pick(label,fn){var holder=el("div","kv54-electrode"),select=el("select");select.append(el("option","","Metal seç"),...choices.map(x=>{var o=el("option","",x);o.value=x;return o;}));select.onchange=function(){fn(select.value);};holder.append(text("strong",label),select);selectors.append(holder);}
     pick("Anot (yükseltgenme)",function(x){a=x;});
     pick("Katot (indirgenme)",function(x){c=x;});
     ui.stage.append(selectors,text("p","Elektronlar dış devrede anottan katoda hareket eder."));
     checkButton(function(){if(a===d.anode&&c===d.cathode)success(d.pot+" Elektron akışı: "+a+" → "+c+".");else message("Yükseltgenme anotta, indirgenme katotta olur. Metallerin eğilimini düşün.",false);});
   }else if(g.kind==="polymer"){
     rowTitle("Polimer Zinciri",d.name+" için "+d.repeat+" birimli doğru zinciri kur.");
     var chain=[],pool=["Eten","Propen","Vinil klorür"],chosen=d.unit,buttons=el("div","kv54-tools"),chainView=el("div","kv54-chain");
     function update(){chainView.replaceChildren();if(!chain.length)chainView.append(text("small","Henüz zincir yok."));chain.forEach(function(u){chainView.append(el("span","kv54-chain-unit",u));});}
     pool.forEach(function(item){var b=btn("+ "+item,function(){if(chain.length<6){chain.push(item);update();}});buttons.append(b);});
     ui.stage.append(buttons,chainView);update();
     controls.append(btn("Son birimi çıkar",function(){chain.pop();update();}),btn("Zinciri kontrol et",function(){if(chain.length===d.repeat&&chain.every(x=>x===chosen))success(d.name+" yapı birimi: "+d.link+".");else message(d.repeat+" adet doğru monomer kullan. Gerekirse son birimi çıkar.",false);},"primary"));
   }
   ui.stage.append(controls,feedback);
 }
 render();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else setTimeout(init,0);
})();