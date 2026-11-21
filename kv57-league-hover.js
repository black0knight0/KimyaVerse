/* KimyaVerse 57: accessible public league hover card; never publish private onboarding answers */
(function(){
"use strict";
if(window.KV57HoverInstalled)return;
window.KV57HoverInstalled=true;
const cache=new Map();
let popup=null,active=null,epoch=0;
function elem(tag,cls,content){const x=document.createElement(tag);if(cls)x.className=cls;if(content!=null)x.textContent=content;return x;}
function dismiss(){epoch++;active=null;if(popup)popup.hidden=true;}
function position(target){if(!popup||!target)return;const rect=target.getBoundingClientRect();const width=Math.min(315,innerWidth-24);popup.style.width=width+"px";const left=Math.max(12,Math.min(innerWidth-width-12,rect.left+rect.width/2-width/2));popup.style.left=left+"px";const height=popup.offsetHeight||170;popup.style.top=(rect.bottom+height+12>innerHeight?Math.max(12,rect.top-height-10):rect.bottom+10)+"px";}
function showData(target,userId){
 if(!popup){popup=elem("aside","kv57-player-tooltip");popup.id="kv57PlayerTooltip";popup.setAttribute("role","tooltip");document.body.append(popup);}
 popup.replaceChildren();
 const alias=(target.textContent||"Oyuncu").split(" · ")[0].trim();
 popup.append(elem("strong","kv57-player-name",alias));
 const info=elem("div","kv57-player-fields");info.append(elem("span","","Oyuncu bilgileri yükleniyor…"));popup.append(info);
 popup.hidden=false;position(target);
 const token=++epoch;active=target;
 if(!userId){info.replaceChildren(elem("span","","Bu oyuncunun herkese açık profili bulunamadı."));position(target);return;}
 function fill(p){
  if(token!==epoch||active!==target)return;
  info.replaceChildren();
  function line(label,value){const row=elem("p","kv57-player-field");row.append(elem("span","",label),elem("b","",String(value)));info.append(row);}
  const slot=target.closest(".kv23-podium-slot");
  const row=target.closest(".kv22-online-row");
  const rank=slot?.querySelector(".kv23-rank")?.textContent||row?.querySelector(".kv22-rank-medal")?.textContent;
  const xp=slot?.querySelector(".kv23-points")?.textContent||row?.querySelector("strong")?.textContent;
  if(rank)line("Bu haftaki sıra",String(rank).includes("sıra")?rank:rank+". sıra");
  if(xp)line("Bu haftaki XP",xp);
  line("Toplam kupa",Number(p.trophies||0));
  line("Kupa dağılımı",Number(p.gold||0)+" altın · "+Number(p.silver||0)+" gümüş · "+Number(p.bronze||0)+" bronz");
  if(p.reward_stars!=null)line("Ödül yıldızı",Number(p.reward_stars||0));
  const badge=p.badges;
  line("Rozet",badge!=null&&Number.isInteger(Number(badge))?Number(badge):"Henüz eşitlenmedi");
  const history=Array.isArray(p.history)?p.history:[];
  if(history.length){
   const latest=history[0];
   line("Kupa geçmişi",history.length+" sezon");
   if(latest?.week&&latest?.place)line("Son derece",String(latest.week).slice(0,10)+" · "+latest.place+". sıra");
  }
  // Gelecek meslek bilgisi sadece acik paylasim izniyle gosterilir.
  const career=p.show_career===true&&typeof p.career==="string"&&p.career.trim()?p.career.trim():"Paylaşılmadı";
  line("Meslek hedefi",career.slice(0,80));
  position(target);
 }
 if(cache.has(userId)){fill(cache.get(userId));return;}
 const api=(()=>{try{return typeof kv17AuthClient!=="undefined"?kv17AuthClient:null}catch(_){return null}})();
 if(!api){info.replaceChildren(elem("span","","Profil bilgisi alınamadı."));position(target);return;}
 api.rpc("kv22_league_public_profile",{p_user_id:userId}).then(({data,error})=>{
  if(error)throw error;
  const d=data||{};cache.set(userId,d);fill(d);
 }).catch(()=>{if(token!==epoch)return;info.replaceChildren(elem("span","","Profil şu anda yüklenemiyor."));position(target)});
}
function getTarget(e){return e.target?.closest?.(".kv23-podium-slot .kv23-playername, #kv22OnlineBoard .kv22-player-link")||null;}
function resolveId(target){
 const source=target.closest(".kv22-online-row")?.querySelector(".kv22-player-link")||target;
 if(source.dataset.kv57UserId)return source.dataset.kv57UserId;
 const board=document.getElementById("kv22OnlineBoard");
 const name=target.textContent?.trim();
 const row=[...(board?.querySelectorAll(".kv22-online-row")||[])].find(x=>x.querySelector(".kv22-player-link")?.textContent?.includes(name));
 return row?.querySelector(".kv22-player-link")?.dataset.kv57UserId||"";
}
document.addEventListener("pointerover",e=>{
 const target=getTarget(e);if(!target||target===active||target.disabled)return;
 showData(target,resolveId(target));
});
document.addEventListener("pointerout",e=>{
 const target=getTarget(e);if(!target)return;
 if(e.relatedTarget&&target.contains(e.relatedTarget))return;
 dismiss();
});
document.addEventListener("focusin",e=>{const target=getTarget(e);if(target&&!target.disabled)showData(target,resolveId(target));});
document.addEventListener("focusout",e=>{if(getTarget(e))dismiss();});
window.addEventListener("scroll",()=>{if(active)position(active)},{passive:true});
window.addEventListener("resize",()=>{if(active)position(active)});
})();