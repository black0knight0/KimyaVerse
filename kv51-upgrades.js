/* KimyaVerse 51 – sozlu sohbet, tek mesaj kutusu, oyun birlestirme */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var voiceOpen = false, voiceMuted = false, recognizer = null, dictateRecognizer = null, speaking = false, currentImage = null;
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var commitClick = false, selectedAnswer = null;
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function status(t) { if ($("kv51ComposerStatus")) $("kv51ComposerStatus").textContent = t || ""; }
  function lastBotReply() {
    var replies = Array.from(document.querySelectorAll("#mainChat .bubble:not(.user)"));
    var last = replies[replies.length - 1];
    return last ? (last.innerText || last.textContent || "").trim() : "";
  }
  function isReply(s) { return s && s !== "Yanıt hazırlanıyor…" && !s.startsWith("AI yanıtı alınamadı:"); }
  function initComposer() {
    var field = $("mainAsk"), bot = $("bot"), main = $("mainChat");
    if (!field || !bot || !main || $("kv51ComposerStatus")) return;
    var original = field.closest(".chatinput");
    if (!original) return;
    if ($("kv50BotVoice")) {
      var heading = $("kv50BotVoice").querySelector("h3");
      if (heading) heading.textContent = "KimyaBot · Kimya düzeyini seç";
    }
    original.classList.add("kv51-composer");
    var submit = original.querySelector("button");
    var line = el("div", "kv51-input-line");
    original.insertBefore(line, field);
    line.appendChild(field);
    field.placeholder = "Soru sorun";
    field.setAttribute("aria-label", "KimyaBot mesajın");
    var tray = el("div", "kv51-image-tray");
    tray.hidden = true;
    original.insertBefore(tray, line);
    var controls = el("div", "kv51-controls");
    var plus = el("button", "kv51-icon kv51-plus", "+");
    plus.type = "button"; plus.title = "Görsel ekle"; plus.setAttribute("aria-label", "Görsel ekle");
    var mic = el("button", "kv51-icon kv51-mic", "♩");
    mic.type = "button"; mic.title = "Konuştuğumu yaz (gönderme)"; mic.setAttribute("aria-label", "Mikrofonla dikte");
    mic.innerHTML = '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10a7 7 0 0014 0M12 17v5m-4 0h8"/></svg>';
    var wave = el("button", "kv51-icon kv51-wave", "◉");
    wave.type = "button"; wave.title = "Sesli sohbeti aç"; wave.setAttribute("aria-label", "Sesli sohbeti aç");
    wave.innerHTML = '<svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 10v4M6 6v12M10 3v18M14 7v10M18 4v16M22 10v4"/></svg>';
    var upload = el("input");
    upload.type = "file"; upload.accept = "image/jpeg,image/png,image/webp"; upload.hidden = true;
    if (submit) {
      submit.classList.add("kv51-send");
      submit.textContent = "↑";
      submit.title = "Mesajı gönder";
      submit.setAttribute("aria-label", "Mesajı gönder");
    }
    controls.append(plus, mic, wave);
    if (submit) controls.append(submit);
    original.append(controls, upload);
    original.append(el("small", "kv51-status", ""));
    original.lastChild.id = "kv51ComposerStatus";
    plus.onclick = function () { upload.click(); };
    upload.onchange = function () {
      var file = upload.files && upload.files[0];
      if (!file) return;
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 4 * 1024 * 1024) {
        status("PNG, JPG veya WebP görseli seç (en fazla 4 MB)."); upload.value = ""; return;
      }
      if (currentImage && currentImage.url) URL.revokeObjectURL(currentImage.url);
      currentImage = { name: file.name, file: file, url: URL.createObjectURL(file) };
      tray.replaceChildren();
      var img = el("img"); img.src = currentImage.url; img.alt = "Seçilen görsel";
      var text = el("span", "", file.name);
      var clear = el("button", "", "Kaldır"); clear.type = "button";
      clear.onclick = function () {
        if (currentImage && currentImage.url) URL.revokeObjectURL(currentImage.url);
        currentImage = null; tray.hidden = true; upload.value = ""; tray.replaceChildren();
        status("");
      };
      tray.append(img, text, clear); tray.hidden = false;
      status("Görsel eklendi. Görseli yorumlama, KimyaBot sunucusunun görsel desteği açılınca çalışacak.");
    };
    mic.onclick = startDictation;
    wave.onclick = openVoice;
    var tellImageLimit = function (e) {
      if (!currentImage) return;
      e.preventDefault(); e.stopImmediatePropagation();
      status("Görselin önizlemesi hazır, ancak mevcut KimyaBot yalnızca metin işliyor. Görseli analiz etmek için sunucu desteği gerekli.");
    };
    if (submit) submit.addEventListener("click", tellImageLimit, true);
    field.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && currentImage) {
        e.preventDefault(); e.stopImmediatePropagation(); tellImageLimit(e);
      }
    }, true);
  }
  function stopDictation() {
    if (dictateRecognizer) { try { dictateRecognizer.abort(); } catch (_) {} dictateRecognizer = null; }
    var mic = document.querySelector("#bot .kv51-mic");
    if (mic) mic.classList.remove("kv51-recording");
  }
  function startDictation() {
    var field = $("mainAsk"), mic = document.querySelector("#bot .kv51-mic");
    if (!field) return;
    if (dictateRecognizer) { stopDictation(); status("Dikte durduruldu."); return; }
    if (!Recognition) { status("Bu tarayıcı dikteyi desteklemiyor. Klavyenin mikrofonunu kullanabilirsin."); return; }
    try {
      dictateRecognizer = new Recognition();
      dictateRecognizer.lang = "tr-TR";
      dictateRecognizer.interimResults = false;
      dictateRecognizer.continuous = false;
      dictateRecognizer.onresult = function (e) {
        var transcript = Array.from(e.results).map(function (r) { return r[0] ? r[0].transcript : ""; }).join(" ").trim();
        if (transcript) { field.value = (field.value.trim() ? field.value.trim() + " " : "") + transcript; field.focus(); status("Metin yazıldı. Göndermek için mavi oka bas."); }
      };
      dictateRecognizer.onerror = function (e) { status("Mikrofon hatası: " + (e.error || "izin reddedildi")); };
      dictateRecognizer.onend = function () { dictateRecognizer = null; if (mic) mic.classList.remove("kv51-recording"); };
      if (mic) mic.classList.add("kv51-recording");
      status("Dinliyorum… Konuşman yalnızca kutuya yazılacak.");
      dictateRecognizer.start();
    } catch (e) { stopDictation(); status("Mikrofon başlatılamadı: " + (e.message || e)); }
  }
  function createVoiceModal() {
    if ($("kv51VoiceModal")) return;
    var modal = el("section", "kv51-voice-modal");
    modal.id = "kv51VoiceModal"; modal.hidden = true;
    modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "KimyaBot sesli sohbet");
    modal.innerHTML = '<div class="kv51-voice-top"><span class="kv51-voice-pill">KimyaBot · Sesli sohbet</span><span>Türkçe</span></div><div class="kv51-voice-mid"><div class="kv51-orb" aria-hidden="true"></div><div class="kv51-voice-state" id="kv51VoiceState" role="status">Başlamak için mikrofon izni ver.</div></div><div class="kv51-voice-bottom"><button class="kv51-mute" type="button" aria-label="Mikrofonu aç veya kapat">♩</button><button class="kv51-close" type="button" aria-label="Sesli sohbetten çık">✕</button></div>';
    document.body.append(modal);
    modal.querySelector(".kv51-close").onclick = closeVoice;
    modal.querySelector(".kv51-mute").onclick = function () {
      if (!voiceOpen) return;
      voiceMuted = !voiceMuted;
      if (voiceMuted) { abortVoiceRecognition(); stopVoiceAudio(); voiceState("Mikrofon kapalı. Tekrar açabilirsin."); }
      else { stopVoiceAudio(); listenVoice(); }
      this.textContent = voiceMuted ? "×" : "♩";
      this.setAttribute("aria-label", voiceMuted ? "Mikrofonu aç" : "Mikrofonu kapat");
    };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && voiceOpen) closeVoice(); });
  }
  function voiceState(t) { if ($("kv51VoiceState")) $("kv51VoiceState").textContent = t; }
  function abortVoiceRecognition() {
    var x = recognizer; recognizer = null;
    if (x) { x.onend = null; try { x.abort(); } catch (_) {} }
  }
  function stopVoiceAudio() { if ("speechSynthesis" in window) speechSynthesis.cancel(); speaking = false; }
  function openVoice() {
    createVoiceModal(); stopDictation(); voiceOpen = true; voiceMuted = false;
    $("kv51VoiceModal").hidden = false;
    var mute = $("kv51VoiceModal").querySelector(".kv51-mute");
    if (mute) mute.textContent = "♩";
    if (!Recognition) voiceState("Tarayıcın ses tanımayı desteklemiyor. Chrome veya desteklenen mobil tarayıcıyla dene.");
    else listenVoice();
  }
  function closeVoice() {
    voiceOpen = false; voiceMuted = false;
    abortVoiceRecognition(); stopVoiceAudio();
    if ($("kv51VoiceModal")) $("kv51VoiceModal").hidden = true;
  }
  function listenVoice() {
    if (!voiceOpen || voiceMuted || speaking || recognizer) return;
    if (!Recognition) return;
    try {
      var r = new Recognition(); recognizer = r;
      r.lang = "tr-TR"; r.continuous = false; r.interimResults = false; r.maxAlternatives = 1;
      voiceState("Dinliyorum… Kimya sorunu söyle.");
      r.onresult = function (e) {
        var transcript = Array.from(e.results).map(function (x) { return x[0] ? x[0].transcript : ""; }).join(" ").trim();
        if (!transcript || !voiceOpen || voiceMuted) return;
        voiceState("Sen: " + transcript);
        var field = $("mainAsk");
        if (!field) return;
        field.value = transcript;
        recognizer = null;
        try { r.onend = null; r.stop(); } catch (_) {}
        askVoice();
      };
      r.onerror = function (e) {
        recognizer = null;
        voiceState("Mikrofon: " + (e.error || "dinleme hatası") + ". Tekrar denemek için mikrofonu kapatıp aç.");
      };
      r.onend = function () {
        if (recognizer === r) {
          recognizer = null;
          if (voiceOpen && !voiceMuted) voiceState("Ses duyulmadı. Tekrar başlamak için mikrofonu kapatıp aç.");
        }
      };
      r.start();
    } catch (e) { recognizer = null; voiceState("Mikrofon başlatılamadı: " + (e.message || e)); }
  }
  async function askVoice() {
    if (!voiceOpen || voiceMuted) return;
    voiceState("KimyaBot düşünüyor…");
    try {
      var task = window.askBot && window.askBot("main");
      await Promise.resolve(task);
      if (!voiceOpen || voiceMuted) return;
      var answer = lastBotReply();
      if (!isReply(answer)) { voiceState(answer || "KimyaBot yanıt veremedi."); return; }
      if (!("speechSynthesis" in window)) { voiceState("Yanıt metin olarak geldi. Bu tarayıcı sesli okumayı desteklemiyor."); return; }
      var utterance = new SpeechSynthesisUtterance(answer.slice(0,3500));
      utterance.lang = "tr-TR"; utterance.rate = 0.98; utterance.pitch = 1;
      var voices = speechSynthesis.getVoices();
      utterance.voice = voices.find(function (v) { return String(v.lang).toLowerCase() === "tr-tr"; }) ||
                        voices.find(function (v) { return String(v.lang).toLowerCase().startsWith("tr"); }) || null;
      speaking = true;
      voiceState("KimyaBot konuşuyor…");
      utterance.onend = function () {
        speaking = false;
        if (voiceOpen && !voiceMuted) listenVoice();
      };
      utterance.onerror = function () { speaking = false; voiceState("Sesli yanıt oynatılamadı. Mesajı yazılı okuyabilirsin."); };
      speechSynthesis.cancel(); speechSynthesis.speak(utterance);
    } catch (e) { speaking = false; voiceState("Sesli sohbet hatası: " + (e.message || e)); }
  }
  function initGames() {
    var oldGrid = $("gameCards"), holder = $("kv47Games"), extraGrid = $("kv47GameGrid");
    if (!oldGrid || !holder || !extraGrid || oldGrid.contains(holder)) return;
    var top = holder.querySelector(".kv47-games-top");
    var selector = $("kv47GameGrade");
    if (selector) {
      var bar = el("div", "kv51-class-filter");
      var lab = el("label", "", "Yeni oyunları sınıfa göre süz:");
      lab.appendChild(selector);
      bar.appendChild(lab); oldGrid.before(bar);
    }
    oldGrid.append(holder);
    ["stoich", "acids", "periodic"].forEach(function (id) {
      var card = extraGrid.querySelector('[data-kv47-game="' + id + '"]');
      if (card) card.remove();
    });
    Array.from(extraGrid.querySelectorAll(".kv47-game-card")).forEach(function (card, i) {
      if (card.querySelector(".kv51-cover")) return;
      var cover = el("div", "kv51-cover");
      var graphic = card.querySelector(".kv47-glyph");
      var tag = el("span", "", graphic ? graphic.textContent : "⚛");
      cover.style.background = "radial-gradient(circle at 70% 30%,hsla(" + (195 + i * 17 % 110) + ",83%,58%,.5),transparent 45%),radial-gradient(circle at 20% 85%,#5c46b75f,transparent 46%),linear-gradient(145deg,#19365e,#0a1433)";
      cover.append(tag); card.prepend(cover);
    });
    buildClassGames(oldGrid);
    function refreshCards() {
      ["stoich", "acids", "periodic"].forEach(function (id) {
        var duplicate = extraGrid.querySelector('[data-kv47-game="' + id + '"]');
        if (duplicate) duplicate.remove();
      });
      Array.from(extraGrid.querySelectorAll(".kv47-game-card")).forEach(function (card, i) {
        if (card.querySelector(".kv51-cover")) return;
        var art = el("div", "kv51-cover");
        var glyph = card.querySelector(".kv47-glyph");
        art.style.background = "radial-gradient(circle at 70% 30%,hsla(" + (195 + i * 17 % 110) + ",83%,58%,.5),transparent 45%),radial-gradient(circle at 20% 85%,#5c46b75f,transparent 46%),linear-gradient(145deg,#19365e,#0a1433)";
        art.append(el("span", "", glyph ? glyph.textContent : "⚛"));
        card.prepend(art);
      });
    }
    new MutationObserver(refreshCards).observe(extraGrid, { childList: true });
    var classCards = $("kv51ClassGames");
    new MutationObserver(function () {
      if (!oldGrid.contains(holder)) oldGrid.append(holder);
      if (classCards && !oldGrid.contains(classCards)) oldGrid.append(classCards);
    }).observe(oldGrid, { childList: true });
  }
  var classroomGames = [
    { id:"class-bingo", title:"Periyodik Bingo", desc:"Akıllı tahtada elementleri söyle, öğrenciler bingo kartını işaretlesin.", grade:9, glyph:"BİNGO" },
    { id:"class-tabu", title:"Kimya Tabu", desc:"Yasak kelimeleri kullanmadan kimya kavramını takımına anlat.", grade:10, glyph:"TABU" },
    { id:"class-relay", title:"Takım Rölesi", desc:"Sınıf takımları açık uçlu sorularla tahtada puan toplasın.", grade:11, glyph:"VS" }
  ];
  function buildClassGames(grid) {
    if ($("kv51ClassGames")) return;
    var box = el("div"); box.id = "kv51ClassGames"; box.style.display = "contents"; grid.append(box);
    classroomGames.forEach(function (g, i) {
      var card = el("button", "kv47-game-card");
      card.type = "button"; card.setAttribute("data-kv51-class", g.id);
      var cover = el("div", "kv51-cover");
      cover.style.background = "radial-gradient(circle at 70% 30%,#517fe285,transparent 47%),radial-gradient(circle at 15% 80%,#b166ca65,transparent 48%),linear-gradient(140deg,#153960,#0b1331)";
      cover.append(el("span", "", g.glyph)); card.append(cover);
      card.append(el("small", "", "SINIF İÇİ · TAKIM OYUNU"), el("strong", "", g.title), el("p", "", g.desc), el("span", "kv47-launch", "Oyunu aç →"));
      card.onclick = function () { launchClassGame(g.id); };
      box.append(card);
    });
  }
  var bingoPool = ["H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Fe","Cu","Zn","Ag","Au","Br","I","Ni","Co","Ti","Cr","Mn","Pb"];
  var tabuDeck = [
    ["Atom","Proton","Nötron","Elektron"],["Molekül","Atom","Bağ","Oksijen"],["Periyot","Tablo","Yatay","Grup"],["İyon","Elektron","Yük","Katyon"],
    ["Asit","pH","Ekşi","Hidrojen"],["Baz","pH","Sabun","Hidroksit"],["İzotop","Nötron","Proton","Kütle"],["Katalizör","Hız","Tepkime","Enzim"],
    ["Elektron","Negatif","Proton","Kabuk"],["Metal","İletken","Parlak","Elektron"],["Çözelti","Çözücü","Çözünen","Su"],["Mol","Avogadro","Tanecik","6,02"]
  ];
  var relayDeck = [
    ["Na simgesi hangi elementindir?","Sodyum."],["Aynı elementin izotoplarında hangi parçacığın sayısı aynıdır?","Proton sayısı."],
    ["Periyodik tablonun yatay satırına ne denir?","Periyot."],["Suyun molekül formülü nedir?","H₂O."],
    ["Nötr bir atomda proton ve elektron sayıları nasıldır?","Eşittir."],["Asitlerin 25 °C'de yaklaşık pH aralığı nedir?","7'den küçüktür."],
    ["Fe hangi elementtir?","Demir."],["Bir kimyasal tepkimede atom sayısı korunur mu?","Evet; atom türleri ve sayıları korunur."],
    ["CO₂ içindeki karbon sayısı kaçtır?","1."],["Elektrolit ne sağlar?","Çözeltide iyon hareketiyle elektrik iletimini sağlar."],
    ["NaCl hangi iyonlardan oluşur?","Na⁺ ve Cl⁻."],["İndirgenme elektron alımı mıdır?","Evet."]
  ];
  function shuffled(a) {
    var arr = a.slice(); for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    } return arr;
  }
  function classShell(title, desc) {
    if (typeof window.go === "function") window.go("play");
    $("playTitle").textContent = title; $("playSubtitle").textContent = desc;
    var root = $("playContent"); root.className = "gameboard kv50-arcade";
    root.replaceChildren();
    var panel = el("article", "kv50-stage");
    var heading = el("h2", "", title), sub = el("p", "", desc), area = el("div");
    area.id = "kv51ClassArea";
    panel.append(heading, sub, area);
    root.append(panel); return area;
  }
  function launchClassGame(id) {
    if (id === "class-bingo") return bingo();
    if (id === "class-tabu") return tabu();
    if (id === "class-relay") return relay();
  }
  function bingo() {
    var area = classShell("Periyodik Bingo", "Öğretmen elementin adını söyler; kartında simgesini bulup işaretle.");
    var card = el("div"); card.style.cssText = "display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:20px 0";
    var symbols = shuffled(bingoPool).slice(0,25);
    var marked = new Set(), buttons = [];
    symbols.forEach(function (s, i) {
      var b = el("button", "", s);
      b.type = "button"; b.style.cssText = "min-height:58px;border-radius:10px;border:1px solid #5074b2;background:#19345e;color:white;font-weight:800;font-size:18px";
      b.onclick = function () {
        if (marked.has(i)) { marked.delete(i); b.style.background = "#19345e"; }
        else { marked.add(i); b.style.background = "#2d806c"; }
        var lines = [];
        for (var r = 0; r < 5; r++) { lines.push([0,1,2,3,4].map(function (c) { return r*5+c; })); lines.push([0,1,2,3,4].map(function (c) { return c*5+r; })); }
        lines.push([0,6,12,18,24],[4,8,12,16,20]);
        result.textContent = lines.some(function (line) { return line.every(function (x) { return marked.has(x); }); }) ? "BİNGO! Bir satır, sütun veya çapraz tamamlandı." : marked.size + " / 25 işaretli";
      }; card.append(b); buttons.push(b);
    });
    var result = el("p", "kv47-feedback", "Sınıf içinde oynanır; otomatik lig XP vermez.");
    var again = el("button", "btn alt", "Yeni bingo kartı"); again.onclick = bingo;
    area.append(card,result,again);
  }
  function tabu() {
    var area = classShell("Kimya Tabu", "Takım arkadaşına kelimeyi anlat, yasaklı sözcükleri kullanma.");
    var deck = shuffled(tabuDeck), index = 0, points = 0, time = 60, clock = null;
    var panel = el("div", "kv47-feedback");
    var word = el("h2"), forbidden = el("p"), indicator = el("p", "", "60 saniye · 0 puan");
    function show() { var item = deck[index % deck.length]; word.textContent = item[0]; forbidden.textContent = "YASAK: " + item.slice(1).join(" · "); indicator.textContent = time + " saniye · " + points + " puan"; }
    function end() { clearInterval(clock); clock=null; word.textContent="Süre bitti!"; forbidden.textContent="Puan: "+points; }
    var start = el("button", "btn", "60 saniyeyi başlat");
    start.onclick = function () {
      if (clock) return; start.disabled = true;
      clock = setInterval(function () { time--; indicator.textContent=time+" saniye · "+points+" puan"; if (time <= 0) end(); },1000);
    };
    var correct = el("button", "btn alt", "Bildik +1");
    correct.onclick = function () { if (time <= 0) return; points++; index++; show(); };
    var pass = el("button", "btn ghost", "Pas");
    pass.onclick = function () { if (time <= 0) return; index++; show(); };
    var again = el("button", "btn ghost", "Yeniden başla");
    again.onclick = function () { clearInterval(clock); tabu(); };
    var actions = el("div", "actionrow"); actions.append(start, correct, pass, again);
    panel.append(word,forbidden,indicator); area.append(panel,actions); show();
    window.addEventListener("hashchange", function cleanup() { if (location.hash !== "#play") { clearInterval(clock); window.removeEventListener("hashchange",cleanup); } });
  }
  function relay() {
    var area = classShell("Takım Rölesi", "Öğretmen soruyu okur, takımlar cevap verir; puanları birlikte kaydedin.");
    var questions = shuffled(relayDeck), step = 0, scores = [0,0,0,0], teamCount = 2;
    var teams = el("div", "actionrow");
    var ask = el("h2"), answer = el("p","kv47-feedback"); answer.hidden = true;
    var scoreRow = el("div", "actionrow");
    var countLabel = el("label", "", "Takım sayısı: ");
    var count = el("select"); [2,3,4].forEach(function (n) { var opt=el("option","",n+" takım"); opt.value=n;count.append(opt); });
    count.onchange = function () { teamCount=Number(count.value); drawScores(); };
    countLabel.append(count); teams.append(countLabel);
    var reveal = el("button","btn alt","Cevabı göster"); reveal.onclick = function () { answer.hidden=false; };
    var next = el("button","btn","Sıradaki soru"); next.onclick = function () { step=(step+1)%questions.length; renderQ(); };
    function renderQ() { ask.textContent="Soru "+(step+1)+": "+questions[step][0]; answer.textContent="Örnek cevap: "+questions[step][1];answer.hidden=true; }
    function drawScores() { scoreRow.replaceChildren();for(var i=0;i<teamCount;i++){(function(i){var box=el("div","kv47-feedback");var label=el("strong","", "Takım "+(i+1)+" · "+scores[i]+" puan");var yes=el("button","btn small","+10");var no=el("button","btn ghost small","−5");yes.onclick=function(){scores[i]+=10;drawScores()};no.onclick=function(){scores[i]-=5;drawScores()};box.append(label,el("br"),yes,no);scoreRow.append(box);})(i);} }
    var actions = el("div","actionrow");actions.append(reveal,next);
    area.append(teams,ask,answer,scoreRow,actions);drawScores();renderQ();
    area.append(el("p","kv47-mini-note","Takım puanları bu oyun içinde tutulur; Supabase lig XP değildir."));
  }
  function initChooseThenCheck() {
    var root = $("playContent");
    if (!root || root.dataset.kv51Observer) return;
    root.dataset.kv51Observer = "yes";
    function prepare() {
      var verify = $("kv50Verify");
      var tiles = $("kv50HuntTiles"), bins = $("kv50SortBins");
      if (verify && (tiles || bins) && !verify.dataset.kv51Check) {
        verify.hidden = false; verify.disabled = true; verify.dataset.kv51Check="yes";
        verify.addEventListener("click", function () {
          if (!selectedAnswer) return;
          commitClick=true;
          try { selectedAnswer.click(); } finally { commitClick=false; selectedAnswer=null; }
        });
      }
      var choices = root.querySelector("#kv47QuestionZone .kv47-options");
      if (choices && !choices.dataset.kv51Check) {
        choices.dataset.kv51Check = "yes";
        var button = el("button", "btn", "Kontrol et"); button.type = "button"; button.disabled = true;
        button.onclick = function () {
          if (!selectedAnswer) return;
          var chosen=selectedAnswer; selectedAnswer=null; commitClick=true;
          try { chosen.click(); } finally { commitClick=false; button.disabled=true; }
        };
        choices.after(button);
      }
      if (verify && !root.querySelector(".kv51-hint")) {
        var hint=el("button","kv51-hint","İpucu"); hint.type="button";
        hint.onclick=function () {
          var msg=$("kv50GameMessage");if (!msg) return;
          var clue = tiles ? "Elementin simgesini ve Türkçe adını eşleştir. Benzer harflere dikkat et." :
                     bins ? "Önce kartın türünü belirle, sonra uygun kategoriye yerleştir." :
                     "Verilen hedef ile mevcut değerleri karşılaştır. Birimleri de kontrol et.";
          msg.textContent = "İpucu: " + clue;
        };
        verify.before(hint);
      }
      if (choices && !root.querySelector(".kv51-choicehint")) {
        var h=el("button","kv51-hint kv51-choicehint","İpucu");
        h.type="button";
        h.onclick=function () { var f=$("kv47Feedback");if (f){f.hidden=false;f.textContent="İpucu: Önce soru kökündeki kavramı bul; diğer seçenekleri onunla karşılaştır."; } };
        var check=choices.nextElementSibling;if(check)check.after(h);
      }
    }
    var observer=new MutationObserver(prepare);
    observer.observe(root,{childList:true,subtree:true});
    document.addEventListener("click",function (e) {
      if (commitClick) return;
      var option=e.target.closest("#kv50HuntTiles .kv50-tile,#kv50SortBins button,#kv47QuestionZone .kv47-options button");
      if (!option || !root.contains(option)) return;
      e.preventDefault();e.stopImmediatePropagation();
      var container=option.parentElement;
      if (container) Array.from(container.querySelectorAll("button")).forEach(function (b) { b.classList.remove("selected"); });
      option.classList.add("selected");selectedAnswer=option;
      var check=$("kv50Verify");
      if (check && root.querySelector("#kv50HuntTiles,#kv50SortBins")) check.disabled=false;
      else {var other=root.querySelector("#kv47QuestionZone .kv47-options + button");if(other)other.disabled=false;}
    },true);
    prepare();
  }
  function initPeriodic() {
    var popup=document.querySelector(".kv50-info-popup");
    if (!popup || popup.dataset.kv51Extra) return;
    popup.dataset.kv51Extra="yes";
    var examples={
      H:["Renksiz, hafif gazdır.","Örnek: su (H₂O) molekülünde bulunur."],
      He:["Soy gazdır, kolay tepkimeye girmez.","Örnek: helyum balonları ve düşük sıcaklık soğutması."],
      Li:["Çok hafif bir alkali metaldir.","Örnek: şarj edilebilir pillerde lityum bileşikleri."],
      C:["Elmas ve grafit farklı biçimleridir.","Örnek: kurşun kalemde grafit, canlılarda organik moleküller."],
      N:["Atmosferin büyük kısmını oluşturur.","Örnek: bitki gübrelerinde azotlu bileşikler."],
      O:["Solunumda ve yanmada rol oynar.","Örnek: hastanelerde oksijen gazı."],
      Na:["Alkali metaldir, saf hâli suyla şiddetli tepkime verir.","Örnek: sofra tuzunda Na⁺ iyonu."],
      Mg:["Hafif, gümüş renkli metaldir.","Örnek: alaşımlar ve klorofilin merkezindeki Mg."],
      Al:["Hafif ve korozyona dayanıklı metaldir.","Örnek: içecek kutuları, uçak gövdeleri."],
      Si:["Yarı iletken özelliği önemlidir.","Örnek: bilgisayar çipleri ve güneş panelleri."],
      S:["Sarı renkli bir ametaldir.","Örnek: kauçuğun vulkanizasyonu."],
      Cl:["Halojendir; element hâli zehirlidir.","Örnek: su arıtmada klor içeren bileşikler."],
      Ca:["Toprak alkali metaldir.","Örnek: kemikteki kalsiyum içeren mineraller."],
      Fe:["Manyetik özellik gösterebilir; çeliğin ana bileşenidir.","Örnek: inşaat demiri, köprüler ve otomobil parçaları."],
      Cu:["Isı ve elektriği çok iyi iletir.","Örnek: elektrik kabloları, bakır borular."],
      Zn:["Çeliği paslanmaya karşı korumada kullanılır.","Örnek: galvaniz kaplama."],
      Ag:["Çok iyi elektrik iletkenidir.","Örnek: takılar ve bazı elektrik bağlantıları."],
      Au:["Kolay oksitlenmez, iyi iletkendir.","Örnek: takılar ve elektronik bağlantı uçları."],
      Ne:["Soy gazdır; ışık tüplerinde parlar.","Örnek: neon tabelaları."],
      Ar:["Kimyasal olarak oldukça kararlıdır.","Örnek: kaynak sırasında koruyucu gaz."],
      I:["Halojen sınıfındadır.","Örnek: iyotlu tuzda iyodür/iyodat bileşikleri."],
      Pb:["Yoğun ve toksik bir metaldir.","Örnek: kurşun-asit aküler."]
    };
    var observer=new MutationObserver(function () {
      if (!popup.classList.contains("visible") || popup.querySelector(".kv51-morefacts")) return;
      var sym=popup.querySelector(".kv50-info-symbol");
      var facts=sym && examples[sym.textContent.trim()];
      if (!facts) return;
      var extra=el("div","kv51-morefacts");
      facts.forEach(function (f,i) {
        var p=el("p","kv51-fact");
        var b=el("b","",i===0?"Önemli özellik: ":"Günlük örnek: ");
        p.append(b,document.createTextNode(f)); extra.append(p);
      });
      popup.append(extra);
    });
    observer.observe(popup,{childList:true});
  }
  function init() {
    initComposer(); createVoiceModal(); initGames(); initChooseThenCheck(); initPeriodic();
    var periodic=$("periodic");if(periodic)periodic.style.minHeight="calc(100vh - 240px)";
    window.addEventListener("pagehide",function(){closeVoice();stopDictation();if(currentImage&&currentImage.url)URL.revokeObjectURL(currentImage.url);});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0);},{once:true});
  else setTimeout(init,0);
})();
