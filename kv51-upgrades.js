/* KimyaVerse 51 – sozlu sohbet, tek mesaj kutusu, oyun birlestirme */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var voiceOpen = false, voiceMuted = false, voiceAudioEnabled = false, recognizer = null, dictateRecognizer = null, speaking = false, currentImage = null;
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var commitClick = false, selectedAnswer = null, voiceUtterance = null;
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
      var legacyAuto = $("kv50AutoVoice");
      if (legacyAuto) { legacyAuto.checked = false; legacyAuto.disabled = true; }
    }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
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
    // Chat audio: a visible toggle and a user-gesture playback button, including on iOS.
    var soundToggle = el("button", "kv51-icon kv51-audio-switch", "Sesi aç");
    soundToggle.type = "button";
    soundToggle.style.cssText = "font-size:12px;padding:5px 7px;width:auto;min-width:56px;border-radius:10px";
    soundToggle.onclick = function () {
      voiceAudioEnabled = !voiceAudioEnabled;
      try { localStorage.setItem("kv_voice_audio_enabled", voiceAudioEnabled ? "1" : "0"); } catch (_) {}
      if (!voiceAudioEnabled) stopVoiceAudio();
      updateComposerSound();
      status(voiceAudioEnabled ? "Ses açık. KimyaBot cevapları sesli okuyacak." : "Ses kapalı.");
      if (voiceAudioEnabled) speakBotAnswer("Merhaba, ben KimyaBot. Artık sesimi duyabiliyor musun?", false);
    };
    var readLast = el("button", "kv51-icon kv51-read-last", "Dinle");
    readLast.type = "button"; readLast.title = "Son KimyaBot yanıtını dinle";
    readLast.setAttribute("aria-label", "Son KimyaBot yanıtını dinle");
    readLast.style.cssText = "font-size:12px;padding:5px 7px;width:auto;min-width:46px;border-radius:10px";
    readLast.onclick = function () {
      var answer = lastBotReply();
      if (!isReply(answer)) answer = "Merhaba, ben KimyaBot. Bu bir ses denemesidir.";
      voiceAudioEnabled = true;
      try { localStorage.setItem("kv_voice_audio_enabled", "1"); } catch (_) {}
      updateComposerSound();
      speakBotAnswer(answer, false);
    };
    controls.append(plus, mic, wave, soundToggle, readLast);
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
    modal.innerHTML = '<div class="kv51-voice-top"><span class="kv51-voice-pill">KimyaBot · Sesli sohbet</span><span>Türkçe</span></div><div class="kv51-voice-mid"><div class="kv51-orb" aria-hidden="true"></div><div class="kv51-voice-state" id="kv51VoiceState" role="status">Konuşabilirsin, yanıtlar başlangıçta sessizdir.</div><div class="kv51-voice-preferences"><label><input type="checkbox" id="kv51VoiceAudioOptIn"> Yanıtları sesli oku (isteğe bağlı)</label><small>Ses kapalı başlar. Açarsan tarayıcının yapay sesi kullanılır; ChatGPT Sol sesi değildir.</small></div></div><div class="kv51-voice-bottom"><button class="kv51-mute" type="button" aria-label="Mikrofonu aç veya kapat">♩</button><button class="kv51-close" type="button" aria-label="Sesli sohbetten çık">✕</button></div>';
    document.body.append(modal);
    modal.querySelector(".kv51-close").onclick = closeVoice;
    var audioSwitch = $("kv51VoiceAudioOptIn");
    audioSwitch.onchange = function () {
      voiceAudioEnabled = Boolean(this.checked);
      try { localStorage.setItem("kv_voice_audio_enabled", voiceAudioEnabled ? "1" : "0"); } catch (_) {}
      updateComposerSound();
      if (!voiceAudioEnabled) stopVoiceAudio();
      voiceState(voiceAudioEnabled ? "Sesli yanıt açık. Tarayıcı sesi Sol değildir; istediğin zaman kapatabilirsin." : "Sesli yanıt kapalı. Yazılı devam edebilirsin.");
    };
    var speaker = el("button", "kv51-speaker", "Ses kapalı");
    speaker.type = "button"; speaker.title = "KimyaBot sesini aç/kapat";
    speaker.style.cssText = "padding:10px 14px;border-radius:18px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;font:inherit";
    modal.querySelector(".kv51-voice-bottom").prepend(speaker);
    speaker.onclick = function () { audioSwitch.checked = !audioSwitch.checked; audioSwitch.dispatchEvent(new Event("change", { bubbles: true })); };
    var testSpeaker = el("button", "kv51-speaker-test", "Sesi dene");
    testSpeaker.type = "button"; testSpeaker.title = "Ses çıkışını test et";
    testSpeaker.style.cssText = speaker.style.cssText;
    modal.querySelector(".kv51-voice-bottom").prepend(testSpeaker);
    testSpeaker.onclick = function () {
      audioSwitch.checked = true;
      audioSwitch.dispatchEvent(new Event("change", { bubbles: true }));
      speakBotAnswer("Merhaba! Ben KimyaBot. Artık sesimi duyabiliyor musun?", false);
    };
    syncVoiceSoundButton();
    modal.querySelector(".kv51-mute").onclick = function () {
      if (!voiceOpen) return;
      voiceMuted = !voiceMuted;
      if (voiceMuted) { abortVoiceRecognition(); voiceState(speaking ? "Mikrofon kapalı; KimyaBot konuşmaya devam ediyor." : "Mikrofon kapalı. KimyaBotun sesi kesilmez."); }
      else { if (!speaking) listenVoice(); }
      this.textContent = voiceMuted ? "×" : "♩";
      this.setAttribute("aria-label", voiceMuted ? "Mikrofonu aç" : "Mikrofonu kapat");
    };
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && voiceOpen) closeVoice(); });
  }
  function syncVoiceSoundButton() {
    var btn = document.querySelector("#kv51VoiceModal .kv51-speaker");
    if (!btn) return;
    btn.textContent = voiceAudioEnabled ? "Sesi kapat" : "Sesi aç";
    btn.setAttribute("aria-label", voiceAudioEnabled ? "KimyaBot sesini kapat" : "KimyaBot sesini aç");
    btn.setAttribute("aria-pressed", voiceAudioEnabled ? "true" : "false");
  }
  function updateComposerSound() {
    var btn = document.querySelector("#bot .kv51-audio-switch");
    if (btn) {
      btn.textContent = voiceAudioEnabled ? "Sesi kapat" : "Sesi aç";
      btn.setAttribute("aria-label", voiceAudioEnabled ? "KimyaBot sesini kapat" : "KimyaBot sesini aç");
      btn.setAttribute("aria-pressed", voiceAudioEnabled ? "true" : "false");
    }
    syncVoiceSoundButton();
  }
  function voiceState(t) { if ($("kv51VoiceState")) $("kv51VoiceState").textContent = t; }
  function abortVoiceRecognition() {
    var x = recognizer; recognizer = null;
    if (x) { x.onend = null; try { x.abort(); } catch (_) {} }
  }
  function stopVoiceAudio() {
    voiceUtterance = null;
    if ("speechSynthesis" in window && (speaking || speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
    speaking = false;
  }
  function speakBotAnswer(answer, resumeListening) {
    if (!voiceAudioEnabled) return;
    if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      voiceState("Tarayıcı sesli okumayı desteklemiyor."); status("Bu tarayıcı sesli okumayı desteklemiyor.");
      return;
    }
    var readable = String(answer || "").replace(/[*#_`]/g, "").trim();
    if (!readable) return;
    abortVoiceRecognition();
    stopVoiceAudio();
    var utterance = new SpeechSynthesisUtterance(readable.slice(0, 3500));
    voiceUtterance = utterance;
    utterance.lang = "tr-TR";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    var voices = speechSynthesis.getVoices();
    utterance.voice = voices.find(function(v) { return v.lang.toLowerCase() === "tr-tr"; }) ||
      voices.find(function(v) { return v.lang.toLowerCase().startsWith("tr"); }) || null;
    utterance.onstart = function() { if (voiceUtterance === utterance) { voiceState("KimyaBot konuşuyor…"); status("KimyaBot konuşuyor…"); } };
    utterance.onend = function() {
      if (voiceUtterance !== utterance) return;
      speaking = false; voiceUtterance = null;
      if (resumeListening && voiceOpen && !voiceMuted) listenVoice();
    };
    utterance.onerror = function(event) {
      if (voiceUtterance !== utterance) return;
      speaking = false; voiceUtterance = null;
      voiceState("Ses oynatılamadı (" + (event.error || "bilinmeyen hata") + "). Sesi dene tuşuna bas."); status("Ses oynatılamadı: " + (event.error || "bilinmeyen hata") + ". Dinle tuşunu tekrar dene.");
    };
    speaking = true;
    try { speechSynthesis.resume(); speechSynthesis.speak(utterance); }
    catch(e) { speaking = false; voiceState("Ses başlatılamadı: " + e.message); status("Ses başlatılamadı: " + e.message); }
  }
  function waitForBotReply(previous) {
    return new Promise(function(resolve) {
      var main = $("mainChat");
      if (!main) { resolve(""); return; }
      var settled = null, deadline = null;
      function finish() {
        clearTimeout(settled); clearTimeout(deadline);
        observer.disconnect();
        resolve(lastBotReply());
      }
      function check() {
        var reply = lastBotReply();
        if (!isReply(reply) || reply === previous) return;
        clearTimeout(settled);
        settled = setTimeout(finish, 650);
      }
      var observer = new MutationObserver(check);
      observer.observe(main, {childList:true, subtree:true, characterData:true});
      deadline = setTimeout(finish, 18000);
      check();
    });
  }
  function openVoice() {
    createVoiceModal(); stopDictation(); voiceOpen = true; voiceMuted = false;
    try { voiceAudioEnabled = localStorage.getItem("kv_voice_audio_enabled") !== "0"; } catch (_) { voiceAudioEnabled = true; }
    stopVoiceAudio();
    var preference = $("kv51VoiceAudioOptIn"); if (preference) preference.checked = voiceAudioEnabled;
    updateComposerSound();
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
    if (!voiceOpen) return;
    voiceState("KimyaBot düşünüyor…");
    try {
      var beforeReply = lastBotReply();
      if (typeof window.askBot !== "function") { voiceState("KimyaBot bağlantısı bulunamadı."); return; }
      var pendingReply = waitForBotReply(beforeReply);
      var task = window.askBot("main");
      await Promise.resolve(task);
      if (!voiceOpen) return;
      var answer = lastBotReply();
      if (!isReply(answer) || answer === beforeReply) answer = await pendingReply;
      if (!isReply(answer) || answer === beforeReply) { voiceState("KimyaBot yanıtı alınamadı."); return; }
      if (!voiceAudioEnabled) { voiceState("KimyaBot yazılı yanıt verdi. Sesli yanıt kapalı."); listenVoice(); return; }
      speakBotAnswer(answer, true);
    } catch (e) { speaking = false; voiceState("Sesli sohbet hatası: " + (e.message || e)); }
  }
  function initChatAutoSpeech() {
    var main = $("mainChat"), field = $("mainAsk"), bot = $("bot");
    if (!main || !field || !bot || main.dataset.kvVoiceObserver) return;
    main.dataset.kvVoiceObserver = "1";
    var pending = false, timer = null, lastRead = "";
    bot.addEventListener("click", function (event) {
      if (event.target.closest(".kv51-send, [onclick*='quickAsk']")) pending = true;
    }, true);
    field.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) pending = true;
    }, true);
    var observer = new MutationObserver(function () {
      if (!pending || voiceOpen) return;
      var reply = lastBotReply();
      if (!isReply(reply) || reply === lastRead) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var latest = lastBotReply();
        if (!pending || voiceOpen || !isReply(latest) || latest !== reply) return;
        pending = false;
        lastRead = latest;
        if (voiceAudioEnabled) speakBotAnswer(latest, false);
      }, 400);
    });
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    window.addEventListener("pagehide", function () { clearTimeout(timer); observer.disconnect(); });
  }
  function initGames() {
    var oldGrid = $("gameCards"), holder = $("kv47Games"), extraGrid = $("kv47GameGrid");
    if (!oldGrid || !holder || !extraGrid || oldGrid.contains(holder)) return;
    var top = holder.querySelector(".kv47-games-top");
    var selector = $("kv47GameGrade");
    if (selector) {
      var bar = el("div", "kv51-class-filter");
      var lab = el("label", "", "Oyunları sınıfa göre filtrele:");
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
    var area = classShell("Kimya Tabu", "Kelimeyi takım arkadaşına yasak sözcükleri kullanmadan anlat. Akıllı tahta için gizleme ve grup puanları.");
    var deck = shuffled(tabuDeck), index = 0, time = 60, clock = null, revealed = false, running = false;
    var teams = [{name:"Grup 1",score:0},{name:"Grup 2",score:0}], active = 0;
    if (typeof window.kv53TabuCleanup === "function") window.kv53TabuCleanup();
    var heading = el("div","kv53-tabu-header");
    var current = el("strong","kv53-tabu-current");
    var addTeam = el("button","btn ghost kv53-tabu-add","＋ Grup ekle"); addTeam.type="button";
    heading.append(current,addTeam);
    var groups = el("div","kv53-tabu-groups"); groups.setAttribute("aria-label","Oynayan gruplar");
    var panel = el("div","kv47-feedback kv53-tabu-panel");
    var word = el("h2","kv53-tabu-word");
    var forbidden = el("p","kv53-tabu-forbidden");
    var indicator = el("p","kv53-tabu-timer");
    var coverTip = el("p","kv53-tabu-tip","Kelime gizli başlar. Anlatacak kişi hazır olunca “Göster”e basıp sonra tekrar gizleyebilir.");
    var info = el("p","kv53-tabu-info");
    panel.append(word,forbidden,indicator,coverTip);
    var start = el("button","btn","60 saniyeyi başlat"); start.type="button";
    var toggle = el("button","btn alt kv53-tabu-toggle","Kelimeyi göster");toggle.type="button";
    var correct = el("button","btn alt","Bildik +1");correct.type="button";
    var pass = el("button","btn ghost","Pas");pass.type="button";
    var nextTeam = el("button","btn ghost","Sıradaki gruba geç");nextTeam.type="button";
    var again = el("button","btn ghost","Yeniden başla");again.type="button";
    var actions = el("div","actionrow kv53-tabu-actions");actions.append(start,toggle,correct,pass,nextTeam,again);
    area.append(heading,groups,panel,actions,info);
    function clearClock(){if(clock!==null){clearInterval(clock);clock=null;}}
    function renderGroups(){
      groups.replaceChildren();
      teams.forEach(function(team,i){
        var b=el("button","kv53-tabu-group"+(i===active?" is-active":""),team.name+" · "+team.score+" puan");
        b.type="button"; b.disabled=running;b.setAttribute("aria-pressed",String(i===active));
        b.onclick=function(){if(running)return;active=i;info.textContent=team.name+" seçildi.";render();};
        groups.append(b);
      });
    }
    function render(){
      var item=deck[index % deck.length];
      word.textContent = revealed ? item[0] : "Kelime gizli";
      forbidden.textContent = revealed ? "YASAK: "+item.slice(1).join(" · ") : "Yasaklı kelimeler gizlendi";
      toggle.textContent = revealed ? "Kelimeyi gizle" : "Kelimeyi göster";
      toggle.setAttribute("aria-pressed",String(revealed));
      current.textContent="Sıra: "+teams[active].name;
      indicator.textContent=time+" saniye · "+teams[active].name+": "+teams[active].score+" puan"+(running?" · Süre işliyor":"");
      start.disabled=running; correct.disabled=!running; pass.disabled=!running;
      nextTeam.disabled=running; addTeam.disabled=running || teams.length>=6;
      renderGroups();
    }
    function advance(){
      index++;
      if(index>=deck.length){deck=shuffled(tabuDeck);index=0;}
      revealed=false;render();
    }
    function finishTurn(){
      if(!running)return;
      clearClock();running=false;revealed=false;
      var finished=teams[active].name;
      active=(active+1)%teams.length;
      time=60;
      info.textContent=finished+" turu bitti. Sıradaki "+teams[active].name+".";
      render();
    }
    start.onclick=function(){
      if(running)return;
      running=true;time=60;revealed=false;info.textContent=teams[active].name+" için süre başladı.";
      clock=setInterval(function(){time=Math.max(0,time-1);if(time===0)finishTurn();else indicator.textContent=time+" saniye · "+teams[active].name+": "+teams[active].score+" puan · Süre işliyor";},1000);
      render();
    };
    toggle.onclick=function(){revealed=!revealed;render();};
    correct.onclick=function(){
      if(!running)return;
      teams[active].score++;info.textContent=teams[active].name+" +1 puan kazandı.";advance();
    };
    pass.onclick=function(){if(!running)return;info.textContent="Pas geçildi. Sıradaki kelime gizlendi.";advance();};
    nextTeam.onclick=function(){
      if(running)return;active=(active+1)%teams.length;time=60;revealed=false;
      info.textContent="Sıra "+teams[active].name+" grubuna geçti.";render();
    };
    addTeam.onclick=function(){
      if(running||teams.length>=6)return;
      teams.push({name:"Grup "+(teams.length+1),score:0});
      info.textContent="Grup "+teams.length+" eklendi.";render();
    };
    again.onclick=function(){
      clearClock();running=false;revealed=false;deck=shuffled(tabuDeck);index=0;time=60;active=0;
      teams.forEach(function(t){t.score=0;});
      info.textContent="Oyun sıfırlandı.";render();
    };
    window.kv53TabuCleanup=function(){clearClock();running=false;};
    window.addEventListener("hashchange",function cleanup(){
      if(location.hash!=="#play"){clearClock();window.removeEventListener("hashchange",cleanup);}
    });
    info.textContent="Önce grup seç, ardından süreyi başlat. Yeni kelimeler gizli gelir.";
    render();
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

  function initFooter() {
    var footer = document.querySelector("footer.footer");
    if (!footer) return;
    if (!footer.querySelector(".kv51-footer-credit")) {
      var links = footer.querySelector(".kv15-site-links");
      footer.replaceChildren();
      if (links) footer.append(links);
      footer.append(
        el("p", "kv51-footer-main", "⚛ KimyaVerse · Kimya öğrenmenin etkileşimli yolu"),
        el("p", "kv51-footer-note", "Deneyler ve dersler eğitim amaçlıdır. Gerçek kimyasallarla yalnızca uygun güvenlik önlemleri ve öğretmen gözetiminde çalış."),
        el("p", "kv51-footer-credit", "Designed & Developed by Miray Aygün · 2026")
      );
    }
    // Periyodik tablo ve sonraki sayfalar dinamik ekleniyor: footer daima en sonda.
    var wrapper = footer.parentElement;
    if (!wrapper || wrapper.dataset.kv51FooterOrder) return;
    wrapper.dataset.kv51FooterOrder = "yes";
    function keepFooterLast() {
      if (footer.parentElement === wrapper && wrapper.lastElementChild !== footer) wrapper.appendChild(footer);
    }
    keepFooterLast();
    new MutationObserver(keepFooterLast).observe(wrapper, { childList: true });
  }
  function initSitePolish() {
    // Replace the invalid favicon without requiring a page rebuild.
    var ico = document.querySelector('link[rel="icon"]') || document.createElement("link");
    ico.rel = "icon"; ico.type = "image/svg+xml";
    ico.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#143a79"/><text x="32" y="45" font-size="45" text-anchor="middle" fill="white">⚛</text></svg>');
    if (!ico.parentNode) document.head.appendChild(ico);
    // Actual sidebar links are BUTTONS with data-side-page, not #hash anchors.
    // Close the active PhET experiment through its own working Back handler.
    document.addEventListener("click", function (event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var button = target.closest("button[data-side-page],nav button[data-page],[data-feature]");
      if (!button) return;
      var id = button.dataset.sidePage || button.dataset.page || button.dataset.feature;
      if (id === "lab") {
        var back = $("kv43SimBack");
        if (back) back.click();
      }
    }, true);
  }
  function init() {
    try { voiceAudioEnabled = localStorage.getItem("kv_voice_audio_enabled") !== "0"; }
    catch (_) { voiceAudioEnabled = true; }
    initSitePolish();
    initComposer(); createVoiceModal(); updateComposerSound(); initChatAutoSpeech();
    initGames(); initChooseThenCheck(); initPeriodic(); initFooter();
    if (!document.querySelector("script[data-kv53-game-art]")) { var artScript=document.createElement("script"); artScript.src="kv53-game-art.js"; artScript.dataset.kv53GameArt="true"; document.body.appendChild(artScript); }
    if (!document.querySelector("script[data-kv54-grade-games]")) { var gradeScript=document.createElement("script"); gradeScript.src="kv54-grade-games.js"; gradeScript.dataset.kv54GradeGames="true"; document.body.appendChild(gradeScript); }
    if (!document.querySelector("script[data-kv55-onboarding]")) { var onboardingScript=document.createElement("script"); onboardingScript.src="kv55-onboarding.js"; onboardingScript.dataset.kv55Onboarding="true"; document.body.appendChild(onboardingScript); }
    if (!document.querySelector("script[data-kv57-hover]")) { var tooltipScript=document.createElement("script"); tooltipScript.src="kv57-league-hover.js?v=58"; tooltipScript.dataset.kv57Hover="true"; document.body.appendChild(tooltipScript); }
    var periodic=$("periodic");if(periodic)periodic.style.minHeight="calc(100vh - 240px)";
    window.addEventListener("pagehide",function(){closeVoice();stopDictation();if(currentImage&&currentImage.url)URL.revokeObjectURL(currentImage.url);});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",function(){setTimeout(init,0);},{once:true});
  else setTimeout(init,0);
})();
