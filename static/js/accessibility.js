/* ============================================================
   Global accessibility toolbar + shared speech helpers.
   Used by every page via base.html.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var STORE_THEME = "accessedu_theme";
  var STORE_STEP = "accessedu_step";
  var synth = window.speechSynthesis;
  var reading = false;
  var voiceListening = false;
  var voiceRecognition = null;

  // ---------- High contrast ----------
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

  // ---------- Text size ----------
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

  // ---------- Read page aloud ----------
  function readPage() {
    if (!synth) {
      announce("Sorry, this browser does not support read-aloud.");
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
    text = text.replace(/\s+/g, " ").trim();
    if (!text) return;
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.98;
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

  // Shared helper other pages can call: window.AccessEdu.speak("text")
  function speak(text, opts) {
    if (!synth || !text) return;
    opts = opts || {};
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = opts.rate || 1;
    if (opts.onend) utter.onend = opts.onend;
    synth.cancel();
    synth.speak(utter);
  }

  function announce(msg) {
    var region = document.getElementById("a11y-announcer");
    if (region) {
      region.textContent = "";
      window.setTimeout(function () { region.textContent = msg; }, 30);
    }
  }

  // Shared speech-to-text helper: window.AccessEdu.listen(onResult, onEnd)
  function getRecognition() {
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;
    var rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-IN";
    return rec;
  }

  function normalizeCommand(text) {
    return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

    var routeMap = {
      "go home": "/",
      "open home": "/",
      "dashboard": "/",
      "go to dashboard": "/",
      "open academic": "/academic",
      "go to academic": "/academic",
      "open access path": "/accesspath",
      "go to access path": "/accesspath",
      "open communication": "/communication",
      "go to communication": "/communication",
      "open campus toolkit": "/toolkit",
      "go to toolkit": "/toolkit",
      "open emergency": "/sos",
      "go to emergency": "/sos",
      "emergency sos": "/sos",
      "logout": "/logout",
      "log out": "/logout"
    };

    if (routeMap[cmd]) {
      routeTo(routeMap[cmd]);
      announce("Opening " + cmd + ".");
      return;
    }

    if (cmd.indexOf("read page") >= 0 || cmd.indexOf("read the page") >= 0) {
      readPage();
      return;
    }
    if (cmd.indexOf("stop reading") >= 0 || cmd.indexOf("stop") >= 0) {
      if (synth) {
        synth.cancel();
        reading = false;
        announce("Reading stopped.");
      }
      return;
    }
    if (cmd.indexOf("increase text") >= 0 || cmd.indexOf("bigger text") >= 0 || cmd.indexOf("zoom in") >= 0) {
      bumpStep(0.1);
      return;
    }
    if (cmd.indexOf("decrease text") >= 0 || cmd.indexOf("smaller text") >= 0 || cmd.indexOf("zoom out") >= 0) {
      bumpStep(-0.1);
      return;
    }
    if (cmd.indexOf("high contrast") >= 0 || cmd.indexOf("dark theme") >= 0 || cmd.indexOf("contrast") >= 0) {
      toggleTheme();
      return;
    }
    if (cmd.indexOf("help") >= 0 || cmd.indexOf("voice help") >= 0) {
      var helpText = "Say open dashboard, open academic, open communication, open toolkit, open emergency, read page, increase text, decrease text, or high contrast.";
      speak(helpText);
      announce(helpText);
      return;
    }
    if (cmd.indexOf("repeat") >= 0 || cmd.indexOf("say again") >= 0) {
      var current = document.getElementById("main-content");
      var content = current ? current.innerText : document.body.innerText;
      if (content) speak(content.replace(/\s+/g, " ").trim().slice(0, 3000));
      return;
    }

    announce("Voice command not recognised. Say help for commands.");
    speak("Voice command not recognised. Say help for commands.");
  }

  function ensureVoiceRecognition() {
    if (voiceRecognition) return voiceRecognition;
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) return null;
    voiceRecognition = new Ctor();
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = true;
    voiceRecognition.lang = "en-IN";

    voiceRecognition.onresult = function (event) {
      var transcript = "";
      for (var i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      var cleaned = transcript.trim();
      if (cleaned) {
        announce("Listening for command: " + cleaned);
        handleVoiceCommand(cleaned);
      }
    };

    voiceRecognition.onerror = function () {
      voiceListening = false;
      var btn = document.getElementById("voice-assist-toggle");
      if (btn) btn.setAttribute("aria-pressed", "false");
      announce("Voice assistant stopped because the microphone was unavailable.");
    };

    voiceRecognition.onend = function () {
      if (voiceListening) {
        try { voiceRecognition.start(); } catch (e) {}
      }
    };

    return voiceRecognition;
  }

  function toggleVoiceAssistant() {
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
      voiceListening = false;
      if (btn) btn.setAttribute("aria-pressed", "false");
      voiceRecognition.stop();
      announce("Voice assistant turned off.");
      return;
    }

    voiceListening = true;
    if (btn) btn.setAttribute("aria-pressed", "true");
    announce("Voice assistant is ready. Say a command like open academic or read page.");
    speak("Voice assistant is ready. Say a command like open academic, read page, or emergency SOS.");

    try {
      voiceRecognition.start();
    } catch (e) {
      try { voiceRecognition.start(); } catch (err) {}
    }
  }

  // ---------- Wire up toolbar ----------
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

  window.AccessEdu = {
    speak: speak,
    getRecognition: getRecognition,
    announce: announce,
    handleVoiceCommand: handleVoiceCommand,
    startVoiceAssistant: toggleVoiceAssistant
  };
})();
