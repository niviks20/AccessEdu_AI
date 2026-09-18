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
  var currentLang = "en";

  try {
    currentLang = localStorage.getItem("accessedu_lang") || "en";
  } catch (e) {}

  var AUTO_VOICE_ENABLED = true;

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
      admin: "Admin"
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
      admin: "एडमिन"
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
      admin: "நிர்வாகம்"
    }
  };

  function getLangCode(lang) {
    var map = { en: "en-IN", hi: "hi-IN", ta: "ta-IN" };
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

  function speak(text, opts) {
    if (!synth || !text) { return; }
    opts = opts || {};
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = opts.rate || 1;
    utter.lang = opts.lang || getLangCode(currentLang);
    if (opts.onend) utter.onend = opts.onend;
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

    var langBtn = document.getElementById("lc-toggle");
    if (langBtn) langBtn.textContent = data.languageLabel;

    try {
      localStorage.setItem("accessedu_lang", currentLang);
    } catch (e) {}

    announce("Language set to " + currentLang.toUpperCase() + ".");
    if (synth) {
      speak("Language set to " + currentLang.toUpperCase() + ".", { lang: getLangCode(currentLang) });
    }
  }

  function toggleLanguage() {
    var order = ["en", "hi", "ta"];
    var idx = order.indexOf(currentLang);
    var next = order[(idx + 1) % order.length];
    applyLanguage(next);
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

  function matchCommand(rawText) {
    var command = normalizeCommand(rawText);
    if (!command) return null;

    var patterns = [
      { action: "open", target: "home", match: ["go home", "open home", "home", "dashboard", "go to dashboard", "open dashboard", "मुखपृष्ठ", "होम", "முகப்பு", "டாஷ்போர்டு"] },
      { action: "open", target: "academic", match: ["open academic", "go to academic", "academic", "academic bot", "अकादमिक", "अकादमिक खोलें", "கல்வி", "கல்வி பக்கம்"] },
      { action: "open", target: "accesspath", match: ["open access path", "go to access path", "access path", "accesspath", "एक्सेसपाथ", "அணுகல் பாதை"] },
      { action: "open", target: "communication", match: ["open communication", "go to communication", "communication", "संचार", "संचार खोलें", "தொடர்பு", "தொடர்பை திற"] },
      { action: "open", target: "toolkit", match: ["open campus toolkit", "go to toolkit", "toolkit", "campus toolkit", "टूलकिट", "टूलकिट खोलें", "கருவிப்பெட்டி", "கேம்பஸ் கருவிகள்"] },
      { action: "open", target: "sos", match: ["open emergency", "go to emergency", "emergency", "emergency sos", "sos", "आपातकाल", "आपातकालीन", "அவசரம்", "சோஸ்"] },
      { action: "logout", target: "logout", match: ["logout", "log out", "लॉग आउट", "வெளியேறு"] },
      { action: "read", target: "page", match: ["read page", "read the page", "read", "पेज पढ़ें", "पढ़ें", "பக்கத்தை படியுங்கள்", "படிக்கவும்"] },
      { action: "stop", target: "reading", match: ["stop reading", "stop", "रोकें", "நிறுத்து"] },
      { action: "zoom", target: "in", match: ["increase text", "bigger text", "zoom in", "text bigger", "टेक्स्ट बड़ा करें", "உரை பெரிதாக்கு"] },
      { action: "zoom", target: "out", match: ["decrease text", "smaller text", "zoom out", "text smaller", "टेक्स्ट छोटा करें", "உரை சிறிதாக்கு"] },
      { action: "theme", target: "contrast", match: ["high contrast", "dark theme", "contrast", "उच्च कंट्रास्ट", "கான்ட्रாஸ்ட்", "மாறுபாடு"] },
      { action: "help", target: "voice", match: ["help", "voice help", "what can you do", "मदद", "सहायता", "உதவி"] }
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
      announce("Opening " + matched.target + ".");
      return;
    }

    if (matched.action === "read") {
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
        if (result.isFinal) {
          var transcript = result[0].transcript;
          var cleaned = normalizeCommand(transcript);
          if (cleaned) {
            announce("Listening for command: " + transcript);
            handleVoiceCommand(transcript);
          }
        }
      }
    };

    voiceRecognition.onerror = function () {
      voiceListening = false;
      var btn = document.getElementById("voice-assist-toggle");
      if (btn) btn.setAttribute("aria-pressed", "false");
      announce("Voice assistant is unavailable. Please allow microphone access.");
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

  function toggleVoiceAssistant(autoStart) {
    var btn = document.getElementById("voice-assist-toggle");
    if (!voiceRecognition) {
      voiceRecognition = ensureVoiceRecognition();
    }

    if (!voiceRecognition) {
      announce("Voice commands are not supported in this browser. Please use Chrome or Edge.");
      speak("Voice commands are not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (voiceListening) {
      if (!autoStart) {
        voiceListening = false;
        if (btn) btn.setAttribute("aria-pressed", "false");
        voiceRecognition.stop();
        announce("Voice assistant turned off.");
      }
      return;
    }

    voiceListening = true;
    if (btn) btn.setAttribute("aria-pressed", "true");

    var welcome = "Voice assistant is ready. Say a command like open academic or read page.";
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

    var langBtn = document.getElementById("lc-toggle");
    if (langBtn) langBtn.addEventListener("click", toggleLanguage);

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
            announce("Voice assistant ready. Say help for commands.");
            if (synth) {
              speak("Voice assistant ready. Say help for commands.", { lang: getLangCode(currentLang) });
            }
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
