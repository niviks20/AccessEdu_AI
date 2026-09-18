/* ============================================================
   Global accessibility toolbar + shared speech helpers.
   Used by every page via base.html.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORE_THEME = "accessedu_theme";
  var STORE_STEP = "accessedu_step";
  var synth = window.speechSynthesis || null;
  var reading = false;
  var voiceListening = false;
  var voiceRecognition = null;
  var silenceTimer = null;
  var transcriptBuffer = "";
  var SILENCE_TIMEOUT = 1700;
  var currentLang = "en";

  try {
    currentLang = localStorage.getItem("accessedu_lang") || "en";
  } catch (e) {}

  var AUTO_VOICE_ENABLED = false;

  var translations = {
    en: {
      languageLabel: "EN",
      highContrast: "High contrast",
      readPage: "Read page",
      voiceAssist: "Voice assist",
      logout: "Log out",
      dashboard: "Dashboard",
      communication: "Communication",
      toolkit: "Campus Toolkit",
      emergency: "Emergency SOS",
      admin: "Admin", assistantTitle: "Tell me what you need", assistantText: "Speak a command or type it below. I can open learning tools, move around the page, and read content aloud.", commandLabel: "Your command", commandPlaceholder: "Try: open academic", sendCommand: "Go", commandHelp: "Try go to academic, show me communication, go back, or scroll down.", speakCommand: "Speak command", readyStatus: "Ready to help"
    },
    es: {
      languageLabel: "ES", highContrast: "Alto contraste", readPage: "Leer página", voiceAssist: "Asistencia de voz", logout: "Cerrar sesión", dashboard: "Panel", communication: "Comunicación", toolkit: "Herramientas del campus", emergency: "Emergencia SOS", admin: "Admin", assistantTitle: "Dime qué necesitas", assistantText: "Habla o escribe un comando para abrir herramientas y moverte por la página.", commandLabel: "Tu comando", commandPlaceholder: "Prueba: abrir académico", sendCommand: "Ir", commandHelp: "Prueba ir a académico, mostrar comunicación, volver o bajar.", speakCommand: "Hablar comando", readyStatus: "Listo para ayudar"
    },
    fr: {
      languageLabel: "FR", highContrast: "Contraste élevé", readPage: "Lire la page", voiceAssist: "Assistant vocal", logout: "Se déconnecter", dashboard: "Tableau de bord", communication: "Communication", toolkit: "Outils du campus", emergency: "Urgence SOS", admin: "Admin", assistantTitle: "Dites-moi ce dont vous avez besoin", assistantText: "Parlez ou écrivez une commande pour ouvrir les outils et parcourir la page.", commandLabel: "Votre commande", commandPlaceholder: "Essayez : ouvrir académique", sendCommand: "Aller", commandHelp: "Essayez aller à académique, afficher communication, revenir ou descendre.", speakCommand: "Parler", readyStatus: "Prêt à aider"
    },
    de: {
      languageLabel: "DE", highContrast: "Hoher Kontrast", readPage: "Seite vorlesen", voiceAssist: "Sprachhilfe", logout: "Abmelden", dashboard: "Dashboard", communication: "Kommunikation", toolkit: "Campus-Werkzeuge", emergency: "Notfall SOS", admin: "Admin", assistantTitle: "Sagen Sie mir, was Sie brauchen", assistantText: "Sprechen oder schreiben Sie einen Befehl, um Werkzeuge zu öffnen und zu navigieren.", commandLabel: "Ihr Befehl", commandPlaceholder: "Versuch: Akademik öffnen", sendCommand: "Los", commandHelp: "Versuchen Sie Akademik öffnen, Kommunikation anzeigen, zurück oder nach unten.", speakCommand: "Befehl sprechen", readyStatus: "Bereit zu helfen"
    },
    zh: {
      languageLabel: "中文", highContrast: "高对比度", readPage: "朗读页面", voiceAssist: "语音助手", logout: "退出", dashboard: "控制面板", communication: "交流", toolkit: "校园工具", emergency: "紧急 SOS", admin: "管理员", assistantTitle: "告诉我您需要什么", assistantText: "说出或输入命令来打开工具和浏览页面。", commandLabel: "您的命令", commandPlaceholder: "例如：打开学术助手", sendCommand: "前往", commandHelp: "可以说打开学术助手、显示交流、返回或向下滚动。", speakCommand: "说出命令", readyStatus: "准备帮助您"
    },
    hi: {
      languageLabel: "हिं",
      highContrast: "उच्च कंट्रास्ट",
      readPage: "पेज पढ़ें",
      voiceAssist: "वॉइस असिस्ट",
      logout: "लॉग आउट",
      dashboard: "डैशबोर्ड",
      communication: "संचार",
      toolkit: "कैम्पस टूलकिट",
      emergency: "आपातकाल SOS",
      admin: "एडमिन", assistantTitle: "बताइए आपको क्या चाहिए", assistantText: "कमांड बोलें या नीचे लिखें। मैं शैक्षणिक टूल खोल सकता हूँ और पेज पढ़ सकता हूँ।", commandLabel: "आपकी कमांड", commandPlaceholder: "जैसे: अकादमिक खोलें", sendCommand: "जाएँ", commandHelp: "अकादमिक खोलें, संचार दिखाएँ, वापस जाएँ या नीचे स्क्रॉल करें कहें।", speakCommand: "कमांड बोलें", readyStatus: "मदद के लिए तैयार"
    },
    ml: {
      languageLabel: "മല",
      highContrast: "ഉയർന്ന കോൺട്രാസ്റ്റ്",
      readPage: "പേജ് വായിക്കുക",
      voiceAssist: "വോയ്സ് സഹായം",
      logout: "പുറത്തുകടക്കുക",
      dashboard: "ഡാഷ്ബോർഡ്",
      communication: "ആശയവിനിമയം",
      toolkit: "ക്യാമ്പസ് ടൂൾകിറ്റ്",
      emergency: "അടിയന്തര SOS",
      admin: "അഡ്മിൻ",
      assistantTitle: "നിങ്ങൾക്ക് എന്താണ് വേണ്ടതെന്ന് പറയൂ",
      assistantText: "ഒരു കമാൻഡ് പറയുകയോ ടൈപ്പ് ചെയ്യുകയോ ചെയ്യൂ. ഉപകരണങ്ങൾ തുറക്കാനും പേജിൽ സഞ്ചരിക്കാനും കഴിയും.",
      commandLabel: "നിങ്ങളുടെ കമാൻഡ്",
      commandPlaceholder: "ഉദാഹരണം: അക്കാദമിക് തുറക്കുക",
      sendCommand: "പോകുക",
      commandHelp: "അക്കാദമിക് തുറക്കുക, ആശയവിനിമയം കാണിക്കുക, പിന്നിലേക്ക് പോകുക, താഴേക്ക് സ്ക്രോൾ ചെയ്യുക എന്ന് പറയൂ.",
      speakCommand: "കമാൻഡ് പറയുക",
      readyStatus: "സഹായിക്കാൻ തയ്യാറാണ്"
    },
    ar: {
      languageLabel: "AR", highContrast: "تباين عالٍ", readPage: "قراءة الصفحة", voiceAssist: "المساعد الصوتي", logout: "تسجيل الخروج", dashboard: "لوحة التحكم", communication: "التواصل", toolkit: "أدوات الحرم", emergency: "طوارئ SOS", admin: "المشرف", assistantTitle: "أخبرني بما تحتاج", assistantText: "تحدث أو اكتب أمراً لفتح الأدوات والتنقل في الصفحة.", commandLabel: "أمرك", commandPlaceholder: "مثال: افتح الأكاديمي", sendCommand: "اذهب", commandHelp: "قل افتح الأكاديمي أو اعرض التواصل أو ارجع أو مرر للأسفل.", speakCommand: "تحدث بالأمر", readyStatus: "جاهز للمساعدة"
    },
    pt: {
      languageLabel: "PT", highContrast: "Alto contraste", readPage: "Ler página", voiceAssist: "Assistente de voz", logout: "Sair", dashboard: "Painel", communication: "Comunicação", toolkit: "Ferramentas do campus", emergency: "Emergência SOS", admin: "Admin", assistantTitle: "Diga o que você precisa", assistantText: "Fale ou digite um comando para abrir ferramentas e navegar pela página.", commandLabel: "Seu comando", commandPlaceholder: "Tente: abrir acadêmico", sendCommand: "Ir", commandHelp: "Tente abrir acadêmico, mostrar comunicação, voltar ou rolar para baixo.", speakCommand: "Falar comando", readyStatus: "Pronto para ajudar"
    },
    ru: {
      languageLabel: "RU", highContrast: "Высокий контраст", readPage: "Читать страницу", voiceAssist: "Голосовой помощник", logout: "Выйти", dashboard: "Панель", communication: "Связь", toolkit: "Инструменты кампуса", emergency: "Экстренная SOS", admin: "Админ", assistantTitle: "Скажите, что вам нужно", assistantText: "Произнесите или введите команду, чтобы открыть инструменты и перейти по странице.", commandLabel: "Ваша команда", commandPlaceholder: "Например: открыть академический раздел", sendCommand: "Перейти", commandHelp: "Скажите открыть академический раздел, показать связь, назад или вниз.", speakCommand: "Произнести команду", readyStatus: "Готов помочь"
    },
    ja: {
      languageLabel: "JA", highContrast: "高コントラスト", readPage: "ページを読む", voiceAssist: "音声アシスト", logout: "ログアウト", dashboard: "ダッシュボード", communication: "コミュニケーション", toolkit: "キャンパスツール", emergency: "緊急 SOS", admin: "管理者", assistantTitle: "必要なことを教えてください", assistantText: "コマンドを話すか入力して、ツールを開いたりページを移動したりできます。", commandLabel: "コマンド", commandPlaceholder: "例：アカデミックを開く", sendCommand: "移動", commandHelp: "アカデミックを開く、戻る、下へスクロールなどと言ってください。", speakCommand: "コマンドを話す", readyStatus: "準備完了"
    },
    ko: {
      languageLabel: "KO", highContrast: "고대비", readPage: "페이지 읽기", voiceAssist: "음성 지원", logout: "로그아웃", dashboard: "대시보드", communication: "커뮤니케이션", toolkit: "캠퍼스 도구", emergency: "긴급 SOS", admin: "관리자", assistantTitle: "무엇이 필요한지 말씀해 주세요", assistantText: "명령을 말하거나 입력하여 도구를 열고 페이지를 이동할 수 있습니다.", commandLabel: "명령", commandPlaceholder: "예: 학습 도우미 열기", sendCommand: "이동", commandHelp: "학습 도우미 열기, 뒤로 가기, 아래로 스크롤 등을 말해 보세요.", speakCommand: "명령 말하기", readyStatus: "도움 준비 완료"
    },
    ta: {
      languageLabel: "த",
      highContrast: "உயர் மாறுபாடு",
      readPage: "பக்கத்தை படியுங்கள்",
      voiceAssist: "குரல் உதவி",
      logout: "வெளியேறு",
      dashboard: "டாஷ்போர்டு",
      communication: "தொடர்பு",
      toolkit: "கேம்பஸ் கருவிப்பெட்டி",
      emergency: "அவசர SOS",
      admin: "நிர்வாகம்", assistantTitle: "உங்களுக்கு என்ன வேண்டும் என்று சொல்லுங்கள்", assistantText: "கட்டளையைப் பேசுங்கள் அல்லது உள்ளிடுங்கள். கருவிகளைத் திறந்து பக்கத்தில் செல்லலாம்.", commandLabel: "உங்கள் கட்டளை", commandPlaceholder: "எடுத்துக்காட்டு: கல்வியைத் திற", sendCommand: "செல்", commandHelp: "கல்வியைத் திற, தொடர்பைக் காட்டு, பின்செல் அல்லது கீழே உருட்டு என்று சொல்லுங்கள்.", speakCommand: "கட்டளையைப் பேசு", readyStatus: "உதவத் தயார்"
    }
  };

  function getLangCode(lang) {
    var map = { en: "en-IN", ta: "ta-IN", hi: "hi-IN", ml: "ml-IN", es: "es-ES", fr: "fr-FR", de: "de-DE", zh: "zh-CN", ar: "ar-SA", pt: "pt-BR", ru: "ru-RU", ja: "ja-JP", ko: "ko-KR" };
    return map[lang] || "en-IN";
  }

  function getVoiceRecognitionLang(lang) {
    return getLangCode(lang || currentLang);
  }

  function announce(msg) {
    var region = document.getElementById("a11y-announcer");
    if (region) {
      region.textContent = "";
      window.setTimeout(function () {
        region.textContent = msg;
      }, 30);
    }
  }

  function chooseVoice(lang) {
    if (!synth || !synth.getVoices) return null;
    var voices = synth.getVoices();
    var wanted = String(lang || getLangCode(currentLang)).toLowerCase();
    var exact = voices.filter(function (voice) {
      return String(voice.lang || "").toLowerCase() === wanted;
    });
    var regional = voices.filter(function (voice) {
      return String(voice.lang || "").toLowerCase().indexOf(wanted.split("-")[0]) === 0;
    });
    return exact[0] || regional[0] || voices[0] || null;
  }

  function speak(text, opts) {
    if (!synth || !text) { return; }
    opts = opts || {};
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = opts.rate || 1;
    utter.lang = opts.lang || getLangCode(currentLang);
    var selectedVoice = chooseVoice(utter.lang);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onstart = function () { setVoiceStatus("speaking", "Speaking..."); };
    utter.onend = function () {
      setVoiceStatus("ready", "Ready to help");
      if (opts.onend) opts.onend();
    };
    synth.cancel();
    synth.speak(utter);
  }

  function readPage() {
    if (!synth) {
      announce("Sorry, this browser does not support read aloud.");
      return;
    }

    var btn = document.getElementById("read-toggle");
    if (reading) {
      synth.cancel();
      reading = false;
      if (btn) btn.setAttribute("aria-pressed", "false");
      announce("Reading stopped.");
      return;
    }

    var main = document.getElementById("main-content");
    var text = main ? main.innerText : document.body.innerText;
    text = (text || "").replace(/\s+/g, " ").trim();
    if (!text) return;

    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
    utter.lang = getLangCode(currentLang);
    var selectedVoice = chooseVoice(utter.lang);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend = function () {
      reading = false;
      if (btn) btn.setAttribute("aria-pressed", "false");
    };

    synth.cancel();
    synth.speak(utter);
    reading = true;
    if (btn) btn.setAttribute("aria-pressed", "true");
    announce("Reading the page aloud.");
  }

  function applyLanguage(lang) {
    currentLang = translations[lang] ? lang : "en";
    var data = translations[currentLang];
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (data[key]) {
        el.textContent = data[key];
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var placeholderKey = el.getAttribute("data-i18n-placeholder");
      if (data[placeholderKey]) el.setAttribute("placeholder", data[placeholderKey]);
    });

    var languageSelect = document.getElementById("language-select");
    if (languageSelect) languageSelect.value = currentLang;
    if (voiceRecognition) voiceRecognition.lang = getVoiceRecognitionLang(currentLang);

    try {
      localStorage.setItem("accessedu_lang", currentLang);
    } catch (e) {}

    announce("Language set to " + currentLang.toUpperCase() + ".");
    if (synth) {
      speak("Language set to " + currentLang.toUpperCase() + ".", { lang: getLangCode(currentLang) });
    }
  }

  function applyTheme(theme) {
    if (theme === "hc") {
      root.setAttribute("data-theme", "hc");
    } else {
      root.removeAttribute("data-theme");
    }
    var btn = document.getElementById("hc-toggle");
    if (btn) btn.setAttribute("aria-pressed", theme === "hc" ? "true" : "false");
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_THEME); } catch (e) {}
    applyTheme(saved === "hc" ? "hc" : "normal");
  }

  function toggleTheme() {
    var isHc = root.getAttribute("data-theme") === "hc";
    var next = isHc ? "normal" : "hc";
    applyTheme(next);
    try { localStorage.setItem(STORE_THEME, next); } catch (e) {}
    announce(next === "hc" ? "High contrast enabled." : "High contrast disabled.");
    if (synth) {
      speak(next === "hc" ? "High contrast enabled." : "High contrast disabled.");
    }
  }

  function applyStep(step) {
    step = Math.max(0.85, Math.min(1.6, step));
    root.style.setProperty("--step", step);
    try { localStorage.setItem(STORE_STEP, String(step)); } catch (e) {}
  }

  function initStep() {
    var saved = 1;
    try { saved = parseFloat(localStorage.getItem(STORE_STEP)) || 1; } catch (e) {}
    applyStep(saved);
  }

  function bumpStep(delta) {
    var current = parseFloat(getComputedStyle(root).getPropertyValue("--step")) || 1;
    var next = Math.round((current + delta) * 100) / 100;
    applyStep(next);
    announce("Text size changed to " + next.toFixed(2) + ".");
  }

  function normalizeCommand(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\s\u00A0]+/g, " ")
      .trim();
  }

  function setVoiceStatus(state, message) {
    var badge = document.getElementById("voice-status-badge");
    var live = document.getElementById("voice-live-status");
    if (badge) {
      badge.dataset.state = state;
      badge.textContent = state.charAt(0).toUpperCase() + state.slice(1);
    }
    if (live && message) live.textContent = message;
  }

  function executeScroll(direction) {
    window.scrollBy({ top: direction === "down" ? window.innerHeight * 0.75 : -window.innerHeight * 0.75, behavior: "smooth" });
    announce(direction === "down" ? "Scrolled down." : "Scrolled up.");
  }

  function matchCommand(rawText) {
    var command = normalizeCommand(rawText);
    if (!command) return null;

    var patterns = [
      { action: "open", target: "home", match: ["go home", "open home", "home", "dashboard", "go to dashboard", "open dashboard", "मुखपृष्ठ", "होम", "முகப்பு", "டாஷ்போர்டு"] },
      { action: "open", target: "academic", match: ["open academic", "go to academic", "academic", "academic bot", "अकादमिक", "अकादमिक खोलें", "கல்வி", "கல்வி பக்கம்", "അക്കാദമിക്", "അക്കാദമിക് തുറക്കുക"] },
      { action: "open", target: "accesspath", match: ["open access path", "go to access path", "access path", "accesspath", "एक्सेसपाथ", "அணுகல் பாதை"] },
      { action: "open", target: "communication", match: ["open communication", "go to communication", "communication", "संचार", "संचार खोलें", "தொடர்பு", "தொடர்பை திற", "ആശയവിനിമയം", "ആശയവിനിമയം തുറക്കുക"] },
      { action: "open", target: "toolkit", match: ["open campus toolkit", "go to toolkit", "toolkit", "campus toolkit", "टूलकिट", "टूलकिट खोलें", "கருவிப்பெட்டி", "கேம்பஸ் கருவிகள்", "ക്യാമ്പസ് ടൂൾകിറ്റ്", "ടൂൾകിറ്റ് തുറക്കുക"] },
      { action: "open", target: "sos", match: ["open emergency", "go to emergency", "emergency", "emergency sos", "sos", "आपातकाल", "आपातकालीन", "அவசரம்", "சோஸ்", "അടിയന്തരാവസ്ഥ", "അടിയന്തര SOS"] },
      { action: "logout", target: "logout", match: ["logout", "log out", "लॉग आउट", "வெளியேறு"] },
      { action: "read", target: "page", match: ["read page", "read the page", "read", "पेज पढ़ें", "पढ़ें", "பக்கத்தை படியுங்கள்", "படிக்கவும்"] },
      { action: "stop", target: "reading", match: ["stop reading", "stop", "रोकें", "நிறுத்து"] },
      { action: "zoom", target: "in", match: ["increase text", "bigger text", "zoom in", "text bigger", "टेक्स्ट बड़ा करें", "உரை பெரிதாக்கு"] },
      { action: "zoom", target: "out", match: ["decrease text", "smaller text", "zoom out", "text smaller", "टेक्स्ट छोटा करें", "உரை சிறிதாக்கு"] },
      { action: "theme", target: "contrast", match: ["high contrast", "dark theme", "contrast", "उच्च कंट्रास्ट", "கான்ட्रாஸ்ட்", "மாறுபாடு"] },
      { action: "back", target: "back", match: ["go back", "back", "return", "volver", "retour", "zurück", "назад", "戻る", "뒤로", "पीछे जाएँ", "பின்செல்", "പിന്നിലേക്ക് പോകുക"] },
      { action: "scroll", target: "down", match: ["scroll down", "go down", "down", "bajar", "descendre", "nach unten", "向下滚动", "नीचे स्क्रॉल करें", "rolar para baixo", "вниз", "下へスクロール", "아래로 스크롤"] },
      { action: "scroll", target: "up", match: ["scroll up", "go up", "up", "subir", "monter", "nach oben", "向上滚动", "ऊपर स्क्रॉल करें", "rolar para cima", "вверх", "上へスクロール", "위로 스크롤"] },
      { action: "help", target: "voice", match: ["help", "voice help", "what can you do", "ayuda", "aide", "hilfe", "帮助", "मदद", "مساعدة", "ajuda", "помощь", "ヘルプ", "도움", "உதவி"] }
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      var pattern = patterns[i];
      for (var j = 0; j < pattern.match.length; j += 1) {
        if (command === pattern.match[j] || command.indexOf(pattern.match[j]) !== -1) {
          return { action: pattern.action, target: pattern.target, command: pattern.match[j] };
        }
      }
    }

    return { action: "unknown", target: command, command: command };
  }

  function routeTo(path) {
    if (!path) return;
    if (path.charAt(0) === "/") {
      window.location.assign(path);
      return;
    }
    var link = document.querySelector("a[href='" + path + "']");
    if (link) {
      link.click();
    }
  }

  function handleVoiceCommand(text) {
    var cmd = normalizeCommand(text);
    if (!cmd) return;

    var matched = matchCommand(cmd);
    if (!matched || matched.action === "unknown") {
      setVoiceStatus("ready", "I did not understand that. Say help for examples.");
      announce("Voice command not recognised. Say help for commands.");
      speak("Voice command not recognised. Say help for commands.", { lang: getVoiceRecognitionLang(currentLang) });
      return;
    }

    var routeMap = {
      home: "/",
      academic: "/academic",
      accesspath: "/accesspath",
      communication: "/communication",
      toolkit: "/toolkit",
      sos: "/sos",
      logout: "/logout"
    };

    if (matched.action === "open" && routeMap[matched.target]) {
      routeTo(routeMap[matched.target]);
      var opened = "Opening " + matched.target + ".";
      announce(opened);
      speak(opened, { lang: getVoiceRecognitionLang(currentLang) });
      return;
    }

    if (matched.action === "back") {
      window.history.back();
      announce("Going back.");
      return;
    }

    if (matched.action === "scroll") {
      executeScroll(matched.target);
      return;
    }

    if (matched.action === "read") {
      setVoiceStatus("speaking", "Reading the page");
      readPage();
      return;
    }

    if (matched.action === "stop") {
      if (synth) {
        synth.cancel();
        reading = false;
        announce("Reading stopped.");
      }
      return;
    }

    if (matched.action === "zoom" && matched.target === "in") {
      bumpStep(0.1);
      return;
    }

    if (matched.action === "zoom" && matched.target === "out") {
      bumpStep(-0.1);
      return;
    }

    if (matched.action === "theme") {
      toggleTheme();
      return;
    }

    if (matched.action === "help") {
      var helpText = "Say open dashboard, open academic, open communication, open toolkit, open emergency, read page, increase text, decrease text, or high contrast.";
      speak(helpText, { lang: getVoiceRecognitionLang(currentLang) });
      announce(helpText);
      return;
    }

    if (matched.action === "logout") {
      routeTo("/logout");
      return;
    }

    announce("Voice command not recognised. Say help for commands.");
    speak("Voice command not recognised. Say help for commands.", { lang: getVoiceRecognitionLang(currentLang) });
  }

  function getRecognition() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;
    var rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = getVoiceRecognitionLang(currentLang);
    return rec;
  }

  function ensureVoiceRecognition() {
    if (voiceRecognition) return voiceRecognition;
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;

    voiceRecognition = new Ctor();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = getVoiceRecognitionLang(currentLang);

    voiceRecognition.onresult = function (event) {
      for (var i = event.resultIndex; i < event.results.length; i += 1) {
        var result = event.results[i];
        transcriptBuffer += " " + result[0].transcript;
        transcriptBuffer = transcriptBuffer.replace(/\s+/g, " ").trim();
        var transcript = document.getElementById("voice-transcript");
        if (transcript) transcript.textContent = transcriptBuffer;
        setVoiceStatus("listening", "Listening...");
        if (silenceTimer) window.clearTimeout(silenceTimer);
        silenceTimer = window.setTimeout(processVoiceTranscript, SILENCE_TIMEOUT);
      }
    };

    voiceRecognition.onerror = function (event) {
      voiceListening = false;
      var btn = document.getElementById("voice-assist-toggle");
      if (btn) btn.setAttribute("aria-pressed", "false");
      var mic = document.getElementById("voice-command-mic");
      if (mic) mic.setAttribute("aria-pressed", "false");
      setVoiceStatus("error", event.error === "not-allowed" ? "Microphone permission is required" : "Voice input is unavailable");
      announce(event.error === "not-allowed" ? "Please allow microphone access for voice commands." : "Voice assistant is unavailable.");
    };

    voiceRecognition.onend = function () {
      if (voiceListening) {
        try {
          voiceRecognition.lang = getVoiceRecognitionLang(currentLang);
          voiceRecognition.start();
        } catch (e) {}
      }
    };

    return voiceRecognition;
  }

  function processVoiceTranscript() {
    var transcript = transcriptBuffer.trim();
    transcriptBuffer = "";
    if (!transcript) return;
    setVoiceStatus("processing", "Processing your request...");
    announce("Processing: " + transcript);
    handleVoiceCommand(transcript);
    var field = document.getElementById("voice-command-input");
    if (field) field.value = transcript;
  }

  function toggleVoiceAssistant(autoStart) {
    var btn = document.getElementById("voice-assist-toggle");
    if (!voiceRecognition) {
      voiceRecognition = ensureVoiceRecognition();
    }

    if (!voiceRecognition) {
      setVoiceStatus("error", "Voice input is not supported here");
      announce("Voice commands are not supported in this browser. Please use Chrome or Edge.");
      speak("Voice commands are not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (voiceListening) {
      if (!autoStart) {
        voiceListening = false;
        if (btn) btn.setAttribute("aria-pressed", "false");
        voiceRecognition.stop();
        setVoiceStatus("ready", "Ready to help");
        announce("Voice assistant turned off.");
      }
      return;
    }

    voiceListening = true;
    setVoiceStatus("listening", "Listening...");
    if (btn) btn.setAttribute("aria-pressed", "true");

    var welcome = "Hi, how can I help you?";
    announce(welcome);
    speak(welcome, { lang: getVoiceRecognitionLang(currentLang) });

    try {
      voiceRecognition.lang = getVoiceRecognitionLang(currentLang);
      voiceRecognition.start();
    } catch (e) {
      try { voiceRecognition.start(); } catch (err) {}
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initTheme();
    initStep();

    var hc = document.getElementById("hc-toggle");
    if (hc) hc.addEventListener("click", toggleTheme);

    var bigger = document.getElementById("text-bigger");
    if (bigger) bigger.addEventListener("click", function () { bumpStep(0.1); });

    var smaller = document.getElementById("text-smaller");
    if (smaller) smaller.addEventListener("click", function () { bumpStep(-0.1); });

    var readBtn = document.getElementById("read-toggle");
    if (readBtn) readBtn.addEventListener("click", readPage);

    var voiceBtn = document.getElementById("voice-assist-toggle");
    if (voiceBtn) voiceBtn.addEventListener("click", toggleVoiceAssistant);

    var languageSelect = document.getElementById("language-select");
    if (languageSelect) languageSelect.addEventListener("change", function () { applyLanguage(languageSelect.value); });

    var commandInput = document.getElementById("voice-command-input");
    var commandSubmit = document.getElementById("voice-command-submit");
    if (commandSubmit) commandSubmit.addEventListener("click", function () {
      var command = commandInput ? commandInput.value.trim() : "";
      if (!command) return;
      setVoiceStatus("processing", "Processing your request...");
      handleVoiceCommand(command);
    });
    if (commandInput) commandInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        if (commandSubmit) commandSubmit.click();
      }
    });

    var centralMic = document.getElementById("voice-command-mic");
    if (centralMic) centralMic.addEventListener("click", function () { toggleVoiceAssistant(false); });

    try {
      var saved = localStorage.getItem("accessedu_lang") || "en";
      applyLanguage(saved);
    } catch (e) {
      applyLanguage("en");
    }

    if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) {
      document.querySelectorAll(".needs-stt").forEach(function (el) {
        el.setAttribute("disabled", "disabled");
        el.title = "Voice input is not supported in this browser. Try Chrome.";
      });
      if (voiceBtn) {
        voiceBtn.setAttribute("disabled", "disabled");
        voiceBtn.title = "Voice commands are not supported in this browser. Use Chrome or Edge.";
      }
    }

    if (document.getElementById("voice-command-input")) {
      setVoiceStatus("ready", "Ready to help");
      if (synth) speak("Hi, how can I help you?", { lang: getLangCode(currentLang) });
    }

    if (!synth) {
      document.querySelectorAll(".needs-tts").forEach(function (el) {
        el.setAttribute("disabled", "disabled");
      });
    }
  });

  if (window.navigator && "serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/service-worker.js").catch(function () {});
    });
  }

  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    window.setTimeout(function () {
      if (!voiceListening && AUTO_VOICE_ENABLED) {
        try {
          var autoBtn = document.getElementById("voice-assist-toggle");
          if (autoBtn && !autoBtn.disabled) {
            autoBtn.setAttribute("aria-pressed", "true");
            toggleVoiceAssistant(true);
          }
        } catch (e) {}
      }
    }, 1800);
  }

  window.AccessEdu = {
    normalizeCommand: normalizeCommand,
    matchCommand: matchCommand,
    speak: speak,
    getRecognition: getRecognition,
    announce: announce,
    handleVoiceCommand: handleVoiceCommand,
    startVoiceAssistant: toggleVoiceAssistant,
    setLanguage: applyLanguage
  };
})();
