(function () {
  "use strict";

  var subjectSel = document.getElementById("subject-select");
  var unitSel = document.getElementById("unit-select");
  var topicSel = document.getElementById("topic-select");

  function selection() {
    return { subject: subjectSel.value, unit: unitSel.value, topic: topicSel.value };
  }

  function haveTopic() {
    var s = selection();
    return !!(s.subject && s.unit && s.topic);
  }

  function refreshButtons() {
    var ok = haveTopic();
    ["learn-btn", "notes-btn", "practice-start-btn"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.disabled = !ok;
    });
  }

  function loadJSON(url) {
    return fetch(url).then(function (r) { return r.json(); });
  }

  function populate(select, items, placeholder) {
    select.innerHTML = "";
    if (!items.length) {
      var opt = document.createElement("option");
      opt.value = "";
      opt.textContent = placeholder;
      select.appendChild(opt);
      return;
    }
    items.forEach(function (item) {
      var opt = document.createElement("option");
      opt.value = item.value;
      opt.textContent = item.label;
      select.appendChild(opt);
    });
  }

  function loadSubjects() {
    loadJSON("/api/academic/subjects").then(function (data) {
      populate(subjectSel, data.subjects.map(function (s) { return { value: s, label: s }; }), "No subjects found");
      if (data.subjects.length) loadUnits();
    });
  }

  function loadUnits() {
    var subject = subjectSel.value;
    if (!subject) { populate(unitSel, [], "Select subject first"); populate(topicSel, [], "Select unit first"); refreshButtons(); return; }
    loadJSON("/api/academic/units?subject=" + encodeURIComponent(subject)).then(function (data) {
      populate(unitSel, data.units.map(function (u) { return { value: u, label: "Unit " + u }; }), "No units indexed yet");
      if (data.units.length) loadTopics();
      else { populate(topicSel, [], "Select unit first"); refreshButtons(); }
    });
  }

  function loadTopics() {
    var s = selection();
    if (!s.subject || !s.unit) { populate(topicSel, [], "Select unit first"); refreshButtons(); return; }
    loadJSON("/api/academic/topics?subject=" + encodeURIComponent(s.subject) + "&unit=" + encodeURIComponent(s.unit)).then(function (data) {
      populate(topicSel, data.topics.map(function (t) { return { value: t.code, label: t.code + " — " + t.name }; }), "No topics found");
      refreshButtons();
    });
  }

  subjectSel.addEventListener("change", loadUnits);
  unitSel.addEventListener("change", loadTopics);
  topicSel.addEventListener("change", refreshButtons);

  // ---------------- Tabs ----------------
  var tabs = [
    { btn: "tab-learn", panel: "panel-learn" },
    { btn: "tab-notes", panel: "panel-notes" },
    { btn: "tab-practice", panel: "panel-practice" }
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

  // ---------------- Simple, safe markdown-ish renderer ----------------
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function renderText(md) {
    var lines = escapeHtml(md).split("\n");
    var html = "";
    var inList = false;
    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (/^#{1,3}\s+/.test(trimmed)) {
        if (inList) { html += "</ul>"; inList = false; }
        var level = trimmed.match(/^#+/)[0].length;
        var text = trimmed.replace(/^#{1,3}\s+/, "");
        html += "<h" + Math.min(level + 1, 4) + ">" + text + "</h" + Math.min(level + 1, 4) + ">";
      } else if (/^[-*]\s+/.test(trimmed)) {
        if (!inList) { html += "<ul>"; inList = true; }
        html += "<li>" + trimmed.replace(/^[-*]\s+/, "") + "</li>";
      } else if (trimmed === "") {
        if (inList) { html += "</ul>"; inList = false; }
      } else {
        if (inList) { html += "</ul>"; inList = false; }
        html += "<p>" + trimmed + "</p>";
      }
    });
    if (inList) html += "</ul>";
    return html;
  }

  function outputBlock(id, text) {
    var el = document.getElementById(id);
    el.innerHTML = renderText(text);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "speak-btn needs-tts";
    btn.textContent = "🔊 Read this aloud";
    btn.addEventListener("click", function () { window.AccessEdu.speak(text); });
    el.prepend(btn);
  }

  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); });
  }

  // ---------------- Learn ----------------
  document.getElementById("learn-btn").addEventListener("click", function () {
    var status = document.getElementById("learn-status");
    status.textContent = "Generating your lesson…";
    postJSON("/api/academic/learn", selection()).then(function (res) {
      if (!res.ok) { status.textContent = res.data.message || "Something went wrong."; return; }
      status.textContent = "Lesson ready.";
      outputBlock("learn-output", res.data.content);
    });
  });

  // ---------------- Notes ----------------
  document.getElementById("notes-btn").addEventListener("click", function () {
    var status = document.getElementById("notes-status");
    status.textContent = "Generating your exam answer…";
    postJSON("/api/academic/notes", selection()).then(function (res) {
      if (!res.ok) { status.textContent = res.data.message || "Something went wrong."; return; }
      status.textContent = "Notes ready.";
      outputBlock("notes-output", res.data.content);
    });
  });

  // ---------------- Practice ----------------
  var practiceState = { number: 1, total: 5, question: "" };

  function showQuestion(q, number) {
    practiceState.question = q;
    practiceState.number = number;
    document.getElementById("practice-progress").textContent = "Question " + number + " of " + practiceState.total;
    document.getElementById("practice-question").textContent = q;
    document.getElementById("practice-answer").value = "";
    document.getElementById("practice-feedback").innerHTML = "";
    document.getElementById("practice-next").hidden = true;
    window.AccessEdu.speak(q);
  }

  document.getElementById("practice-start-btn").addEventListener("click", function () {
    var status = document.getElementById("practice-status");
    status.textContent = "Preparing your first question…";
    postJSON("/api/academic/practice/start", selection()).then(function (res) {
      if (!res.ok) { status.textContent = res.data.message || "Something went wrong."; return; }
      status.textContent = "";
      document.getElementById("practice-area").hidden = false;
      showQuestion(res.data.question, res.data.question_number);
    });
  });

  document.querySelector('[data-speak-target="practice-question"]').addEventListener("click", function () {
    window.AccessEdu.speak(practiceState.question);
  });

  // Mic button -> speech to text into the answer box
  var recognizing = false;
  var recognition = window.AccessEdu.getRecognition();
  var micBtn = document.getElementById("practice-mic");
  if (recognition) {
    recognition.onresult = function (event) {
      var text = "";
      for (var i = 0; i < event.results.length; i++) text += event.results[i][0].transcript;
      document.getElementById("practice-answer").value = text;
    };
    recognition.onend = function () {
      recognizing = false;
      micBtn.setAttribute("aria-pressed", "false");
    };
    micBtn.addEventListener("click", function () {
      if (recognizing) { recognition.stop(); return; }
      recognizing = true;
      micBtn.setAttribute("aria-pressed", "true");
      recognition.start();
    });
  }

  document.getElementById("practice-submit").addEventListener("click", function () {
    var answer = document.getElementById("practice-answer").value.trim();
    var status = document.getElementById("practice-status");
    if (!answer) { status.textContent = "Please speak or type an answer first."; return; }
    status.textContent = "Evaluating your answer…";
    var payload = selection();
    payload.question = practiceState.question;
    payload.answer = answer;
    postJSON("/api/academic/practice/evaluate", payload).then(function (res) {
      if (!res.ok) { status.textContent = res.data.message || "Something went wrong."; return; }
      status.textContent = "";
      var d = res.data;
      var box = document.getElementById("practice-feedback");
      var chipClass = d.result === "correct" ? "positive" : (d.result === "weak" ? "danger" : "");
      box.innerHTML =
        '<p class="chip ' + chipClass + '">Score: ' + d.score + ' / 10 — ' + d.result + '</p>' +
        '<div id="eval-text"></div>';
      outputBlock("eval-text", d.evaluation);

      var nextBtn = document.getElementById("practice-next");
      nextBtn.hidden = false;
      nextBtn.textContent = d.retry_required ? "Try this question again" : "Next question";
      nextBtn.onclick = function () {
        if (d.retry_required) {
          showQuestion(practiceState.question, practiceState.number);
          return;
        }
        var nextPayload = selection();
        nextPayload.question_number = practiceState.number + 1;
        postJSON("/api/academic/practice/next", nextPayload).then(function (res2) {
          if (!res2.ok) { status.textContent = res2.data.message || "Something went wrong."; return; }
          if (res2.data.finished) {
            document.getElementById("practice-area").hidden = true;
            document.getElementById("practice-done").hidden = false;
            document.getElementById("practice-summary").textContent = "You answered all " + practiceState.total + " questions.";
            window.AccessEdu.speak("Practice session complete.");
            return;
          }
          showQuestion(res2.data.question, res2.data.question_number);
        });
      };
    });
  });

  loadSubjects();
})();
