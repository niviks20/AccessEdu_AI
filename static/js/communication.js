(function () {
  "use strict";

  var tabs = [
    { btn: "tab-caption", panel: "panel-caption" },
    { btn: "tab-speak", panel: "panel-speak" },
    { btn: "tab-phrases", panel: "panel-phrases" }
  ];
  tabs.forEach(function (t) {
    document.getElementById(t.btn).addEventListener("click", function () {
      tabs.forEach(function (o) {
        var isActive = o.btn === t.btn;
        document.getElementById(o.btn).setAttribute("aria-selected", isActive ? "true" : "false");
        document.getElementById(o.panel).hidden = !isActive;
      });
    });
  });

  // ---------------- Live captions ----------------
  var recognition = window.AccessEdu.getRecognition();
  var micBtn = document.getElementById("caption-mic");
  var transcriptBox = document.getElementById("caption-transcript");
  var hint = document.getElementById("caption-hint");
  var finalText = "";
  var listening = false;

  if (recognition) {
    recognition.onresult = function (event) {
      var interim = "";
      for (var i = event.resultIndex; i < event.results.length; i++) {
        var chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk + " ";
        else interim += chunk;
      }
      transcriptBox.textContent = finalText + interim;
    };
    recognition.onend = function () {
      listening = false;
      micBtn.setAttribute("aria-pressed", "false");
      hint.textContent = "Stopped. Tap the microphone to resume.";
    };
    micBtn.addEventListener("click", function () {
      if (listening) { recognition.stop(); return; }
      listening = true;
      micBtn.setAttribute("aria-pressed", "true");
      hint.textContent = "Listening…";
      recognition.start();
    });
    document.getElementById("caption-clear").addEventListener("click", function () {
      finalText = "";
      transcriptBox.textContent = "";
    });
  } else {
    hint.textContent = "Live captions need Chrome or another browser that supports the Web Speech API.";
  }

  // ---------------- Type to speak ----------------
  var speakInput = document.getElementById("speak-input");
  var speakBtn = document.getElementById("speak-btn");
  var rateInput = document.getElementById("speak-rate");
  speakBtn.addEventListener("click", function () {
    var text = speakInput.value.trim();
    if (!text) return;
    window.AccessEdu.speak(text, { rate: parseFloat(rateInput.value) });
  });
  speakInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) speakBtn.click();
  });

  // ---------------- Quick phrases ----------------
  document.querySelectorAll("#phrase-board .phrase-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      window.AccessEdu.speak(btn.textContent.trim());
    });
  });
})();
