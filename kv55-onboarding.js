/* KV55 - kisa karsilama, kisilestirme, sinif odagi, ogretmen etkinligi */
(function(){
"use strict";
const KEY="kv55_preferences_v1";
const $=id=>document.getElementById(id);
const e=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
const saved=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")}catch(_){return null}};
let prefs=saved();
function save(p){prefs=p;localStorage.setItem(KEY,JSON.stringify(p));apply(p);}
function selectedGrade(){return [9,10,11,12].includes(Number(prefs?.grade))?Number(prefs.grade):9;}
function apply(p){
 if(!p)return;
 const grade=Number(p.grade);
 const teacherPanel=$("kv55TeacherPanel");if(teacherPanel)teacherPanel.hidden=p.role!=="teacher";
 if(window.state&&[9,10,11,12].includes(grade)&&Number(window.state.grade)!==grade){
  window.state.grade=grade;
  try{if(typeof window.store==="function")window.store();}catch(_){}
 }
 ["profileGrade","testGradeSelect","kv47GameGrade","kv23Grade","kv22Grade","kv33SlideGrade","kv33CardGrade","kv50BotGrade"].forEach(id=>{
  const sel=$(id);if(!sel)return;
  const desired=String(grade);if(sel.value!==desired&&Array.from(sel.options).some(o=>o.value===desired)){
   sel.value=desired;
   sel.dispatchEvent(new Event("change",{bubbles:true}));
  }
 });
 const tab=$("gradeTabs")?.querySelector('[data-grade="'+grade+'"]');
 if(tab&&!tab.classList.contains("sel"))tab.click();
 const label=$("kv55WelcomePersonal");if(label){
  label.textContent=p.role==="teacher"?"Öğretmen çalışma alanın hazır.":grade+". sınıf kimya konuları seni bekliyor.";
 }
 const section=$("games");
 if(section)section.dataset.kv55Grade=String(grade);
 filterChoices();
}
function filterChoices(){
 if(!prefs)return;
 const grade=String(selectedGrade()),allAllowed=prefs.role==="teacher";
 const tabs=$("gradeTabs");
 if(tabs)tabs.querySelectorAll("[data-grade]").forEach(btn=>{
  btn.hidden=!allAllowed&&btn.dataset.grade!==grade;
 });
 ["testGradeSelect","kv47GameGrade","kv23Grade","kv22Grade","kv33SlideGrade","kv33CardGrade","kv50BotGrade"].forEach(id=>{
  const sel=$(id);if(!sel)return;
  for(const o of sel.options){
   const match=o.value===grade;
   o.hidden=!allAllowed&&!match;
   o.disabled=!allAllowed&&!match;
  }
 });
}
function focusGrade(g){
 const before=prefs||{role:"student",goal:"explore",career:""};
 save({...before,grade:Number(g)});
 try{const b=document.querySelector('#gradeTabs [data-grade="'+g+'"]');if(b)b.click();}catch(_){}
}
function intro(edit){
 if($("kv55Overlay"))return;
 let step=-1,info={role:prefs?.role||"student",grade:prefs?.grade||9,goal:prefs?.goal||"learn",career:prefs?.career||""};
 const overlay=e("div","kv55-overlay");overlay.id="kv55Overlay";overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","KimyaVerse kişiselleştirme");
 const pane=e("section","kv55-pane"),progress=e("div","kv55-progress"),title=e("h2"),hint=e("p"),body=e("div","kv55-answer"),actions=e("div","kv55-actions");
 const back=e("button","kv55-light","Geri"),skip=e("button","kv55-light","Şimdilik keşfet"),next=e("button","kv55-primary","Başlayalım");
 back.type=skip.type=next.type="button";actions.append(back,skip,next);
 pane.append(e("div","kv55-brand","⚛ KimyaVerse"),progress,title,hint,body,actions);overlay.append(pane);document.body.append(overlay);
 const questions=[
  {title:"KimyaVerse'i nasıl kullanacaksın?",hint:"Öğrenci veya öğretmen olarak devam edebilirsin.",key:"role",options:[["student","Öğrenciyim"],["teacher","Öğretmenim"]]},
  {title:"Hangi sınıfla başlayalım?",hint:"Şimdilik o sınıfın içeriklerini görürsün. Ayarlardan değiştirebilirsin.",key:"grade",options:[[9,"9. sınıf"],[10,"10. sınıf"],[11,"11. sınıf"],[12,"12. sınıf"]]},
  {title:"Kimyada neye odaklanalım?",hint:"İçerikleri senin öğrenme amacına göre öne çıkaracağız.",key:"goal",options:[["learn","Konu öğrenmek"],["exam","Yazılılara hazırlanmak"],["play","Oyunlarla öğrenmek"],["3d","3D ve deneyler"]]},
  {title:"İleride ne olmak istiyorsun?",hint:"İstersen boş bırakabilirsin. Bu yanıt öneriler için kullanılabilir.",key:"career"}
 ];
 function finish(guest){
  if(!guest)save(info);else localStorage.setItem("kv55_intro_skipped","yes");
  overlay.remove();
  if(!guest)guide(info);
 }
 function render(){
  progress.textContent=step<0?"HOŞ GELDİN":(step+1)+" / 4";
  title.textContent=step<0?(edit?"Tercihlerini güncelle":"Kimyayı keşfet. Oyna. Öğren."):questions[step].title;
  hint.textContent=step<0?"Mavi-mor KimyaVerse evrenini sana göre düzenleyelim. Dört kısa soru, zorunlu üyelik yok.":questions[step].hint;
  body.replaceChildren();
  if(step<0){body.append(e("p","kv55-intro-note","Akademi, oyunlar, laboratuvar ve 3D keşif seninle."));}
  else{
   const q=questions[step];
   if(q.options){
    q.options.forEach(([value,label])=>{
     const b=e("button","kv55-option"+(String(info[q.key])===String(value)?" is-picked":""),label);
     b.type="button";b.onclick=()=>{info[q.key]=value;render();};body.append(b);
    });
   }else{
    const input=e("input","kv55-career");input.type="text";input.maxLength=80;input.placeholder="Örn. mühendis, doktor, öğretmen…";input.value=info.career||"";
    input.oninput=()=>info.career=input.value.trim().slice(0,80);body.append(input);
   }
  }
  back.hidden=step<0;skip.hidden=edit||step>0;
  next.textContent=step===-1?"Başlayalım":step===3?"Tercihleri kaydet":"Devam et";
 }
 next.onclick=()=>{if(step===3)finish(false);else{step++;render();}};
 back.onclick=()=>{step--;render();};
 skip.onclick=()=>finish(true);
 overlay.addEventListener("keydown",ev=>{if(ev.key==="Escape"&&!edit)finish(true)});
 render();next.focus();
}
function guide(p){
 const grade=Number(p.grade);
 const text=p.role==="teacher"?"Öğretmen etkinliklerini oluşturabilir ve sınıfta oyun oynatabilirsin.":p.goal==="exam"?"Yazılı ve testler senin için öne çıkarıldı.":p.goal==="play"?"Oyun Merkezi'nden başlayabilirsin.":p.goal==="3d"?"3D Keşif Stüdyosu seni bekliyor.":"Akademi'den konularını keşfedebilirsin.";
 const message=$("kv55WelcomePersonal");if(message)message.textContent=grade+". sınıf · "+text;
}
function settings(){
 const root=$("settings");if(!root||$("kv55Preferences"))return;
 const panel=e("div","panel kv55-settings");panel.id="kv55Preferences";
 panel.append(e("h3","","Kişiselleştirme"),e("p","","Sınıfını ve öğrenme hedefini buradan değiştirebilirsin."));
 const grade=e("select");grade.id="kv55GradeSetting";
 for(let i=9;i<=12;i++){const opt=e("option","",i+". sınıf");opt.value=String(i);grade.append(opt);}
 grade.value=String(selectedGrade());
 grade.onchange=()=>{focusGrade(grade.value);const msg=$("kv55GradeSaved");if(msg)msg.textContent="Sınıfın güncellendi.";};
 const label=e("label","","Görüntülenecek sınıf");label.append(grade);
 const edit=e("button","btn alt","Tercihleri düzenle");edit.type="button";edit.onclick=()=>intro(true);
 const status=e("p","kv55-saved","");status.id="kv55GradeSaved";
 panel.append(label,edit,status);(root.querySelector(".settinggrid")||root).prepend(panel);
 const profileGrade=$("profileGrade");if(profileGrade?.closest("label"))profileGrade.closest("label").hidden=true;
 const theme=$("themeSetting");if(theme){theme.value="violet";theme.dispatchEvent(new Event("change",{bubbles:true}));const setting=theme.closest("label");if(setting)setting.hidden=true;}
 const heading=root.querySelector(".sectionhead p");if(heading)heading.textContent="Öğrenme hedefini, sınıfını ve kullanım tercihlerini düzenle.";
}
function teacher(){
 const games=$("games");if(!games||$("kv55TeacherPanel"))return;
 const panel=e("section","kv55-teacher panel");panel.id="kv55TeacherPanel";
 panel.append(e("h2","","Öğretmen için sınıf etkinlikleri"),e("p","","Kimya Tabu, Bingo ve Arena'yı akıllı tahtada oynatabilirsin. Aşağıdan bir çalışma yönergesi oluşturup bağlantısını öğrencilerle paylaşabilirsin."));
 const row=e("div","kv55-teacher-grid");
 const grade=e("select");for(let i=9;i<=12;i++){let o=e("option","",i+". sınıf");o.value=i;grade.append(o);}grade.value=String(selectedGrade());
 const topic=e("input");topic.placeholder="Konu: örn. Mol kavramı";topic.maxLength=100;
 const instructions=e("textarea");instructions.placeholder="Ödev yönergesi (en fazla 500 karakter)";instructions.maxLength=500;instructions.rows=3;
 const due=e("input");due.type="date";
 const field=(name,node)=>{let l=e("label","",name);l.append(node);row.append(l);};
 field("Sınıf",grade);field("Konu",topic);field("Yönerge",instructions);field("Teslim tarihi (isteğe bağlı)",due);
 const output=e("input","kv55-share");output.readOnly=true;output.placeholder="Ödev bağlantısı burada oluşacak";
 const create=e("button","btn","Ödev bağlantısı oluştur");create.type="button";
 create.onclick=()=>{
  const title=topic.value.trim(),note=instructions.value.trim();
  if(!title||!note){output.value="Önce konu ve yönerge yaz.";return;}
  const data={g:Number(grade.value),t:title.slice(0,100),n:note.slice(0,500),d:due.value};
  const bytes=new TextEncoder().encode(JSON.stringify(data));
  let binary="";bytes.forEach(x=>binary+=String.fromCharCode(x));
  const encoded=btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const url=new URL(location.href);url.searchParams.set("kvhw",encoded);url.hash="#home";output.value=url.toString();
  output.focus();output.select();
 };
 const copy=e("button","btn alt","Bağlantıyı kopyala");copy.type="button";
 copy.onclick=async()=>{if(!output.value.startsWith("http"))return;try{await navigator.clipboard.writeText(output.value);copy.textContent="Kopyalandı";}catch(_){output.select();document.execCommand("copy");}};
 const note=e("p","kv55-teacher-note","Bu özellik paylaşılabilir ödev yönergesi oluşturur. Öğrenci teslimlerini, puanlarını veya tamamlanma durumlarını henüz takip etmez; bunun için daha sonra Supabase bağlantısı gerekir.");
 panel.append(row,create,output,copy,note);
 games.append(panel);
}
function receiveHomework(){
 const raw=new URLSearchParams(location.search).get("kvhw");if(!raw||raw.length>2500)return;
 try{
  const padded=raw.replace(/-/g,"+").replace(/_/g,"/");const bytes=Uint8Array.from(atob(padded),x=>x.charCodeAt(0));
  const d=JSON.parse(new TextDecoder().decode(bytes));
  if(![9,10,11,12].includes(Number(d.g))||typeof d.t!=="string"||typeof d.n!=="string")return;
  const panel=e("section","kv55-assignment panel");panel.id="kv55Assignment";
  panel.append(e("h3","","Öğretmeninden bir çalışma"),e("strong","",d.g+". sınıf · "+d.t.slice(0,100)),e("p","",d.n.slice(0,500)));
  if(d.d)panel.append(e("p","","Teslim tarihi: "+d.d.slice(0,10)));
  const action=e("button","btn alt","Çalışmaya git");action.onclick=()=>{if(typeof window.go==="function")window.go("tests");};
  panel.append(action,e("small","","Bu bağlantı yalnızca yönergeyi paylaşır; teslim kaydı göndermez."));
  const home=$("home");if(home)home.prepend(panel);
 }catch(_){}
}
function modelAsk(){
 const models=$("models");if(!models||$("kv55ModelAsk"))return;
 const b=e("button","btn alt kv55-model-ask","Bu 3D model nedir? KimyaBot'a sor");
 b.type="button";b.id="kv55ModelAsk";
 b.onclick=()=>{
  const selected=models.querySelector("#modelTabs .sel,#modelTabs .active,#modelTabs [aria-selected=true]");
  const label=(selected?.textContent||models.querySelector("h1")?.textContent||"3D molekül modeli").trim().slice(0,90);
  if(typeof window.go==="function")window.go("bot");
  const field=$("mainAsk");if(field){field.value="Şu 3D modeli açıklayabilir misin: "+label+"? Yapısını, kullanım alanını ve önemli özelliklerini anlat.";field.focus();}
 };
 const tabs=$("modelTabs");if(tabs)tabs.after(b);else models.querySelector(".sectionhead")?.after(b);
}
function init(){
 receiveHomework();settings();teacher();modelAsk();
 const home=$("home");
 if(home&&!$("kv55WelcomePersonal")){
  let msg=e("p","kv55-home-note");msg.id="kv55WelcomePersonal";
  const hero=home.querySelector(".herotext");if(hero)hero.append(msg);
 }
 document.addEventListener("click",event=>{if(event.target.closest("nav [data-page],.kv15-profile-menu button"))setTimeout(filterChoices,80);});
 document.addEventListener("change",event=>{
  if(event.target?.id==="profileGrade"&&prefs&&[9,10,11,12].includes(Number(event.target.value)))focusGrade(event.target.value);
 });
 if(prefs)apply(prefs);
 else if(!localStorage.getItem("kv55_intro_skipped"))intro(false);
 if(!window.kv55DynamicWatch){
  window.kv55DynamicWatch=true;
  const tabs=$("gradeTabs");if(tabs)new MutationObserver(filterChoices).observe(tabs,{childList:true});
  const game=$("gameCards");if(game)new MutationObserver(()=>{if(prefs)filterChoices();}).observe(game,{childList:true});
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(init,250),{once:true});else setTimeout(init,250);
})();