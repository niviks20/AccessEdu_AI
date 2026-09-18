(function () {
  "use strict";

  var findBtn = document.getElementById("find-route-btn");
  var resultBox = document.getElementById("route-result");
  var errorBox = document.getElementById("route-error");

  function buildStepText(step, index, total) {
    return "Step " + (index + 1) + " of " + total + ": From " + step.from_name + ", walk " +
      step.distance + " metres to " + step.to_name + " via " + step.path_type + ".";
  }

  findBtn.addEventListener("click", function () {
    var from = document.getElementById("from-select").value;
    var to = document.getElementById("to-select").value;
    var accessibleOnly = document.getElementById("accessible-only").checked;

    errorBox.hidden = true;
    resultBox.hidden = true;

    if (from === to) {
      errorBox.hidden = false;
      errorBox.textContent = "Starting point and destination are the same.";
      return;
    }

    var url = "/api/accesspath/route?from=" + encodeURIComponent(from) +
      "&to=" + encodeURIComponent(to) + "&accessible_only=" + (accessibleOnly ? "1" : "0");

    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      if (!data.success) {
        errorBox.hidden = false;
        errorBox.textContent = data.message || "No route could be found between these points.";
        window.AccessEdu.announce(errorBox.textContent);
        return;
      }
      var route = data.route;
      document.getElementById("route-title").textContent =
        route.start + " to " + route.end + " — about " + route.total_distance + " metres";

      var list = document.getElementById("route-steps");
      list.innerHTML = "";
      var fullText = "Route from " + route.start + " to " + route.end + ". ";
      route.steps.forEach(function (step, i) {
        var text = buildStepText(step, i, route.steps.length);
        fullText += text + " ";
        var li = document.createElement("li");
        li.innerHTML = "<strong>" + (i + 1) + ".</strong> " + text.replace("Step " + (i + 1) + " of " + route.steps.length + ": ", "") +
          ' <button type="button" class="speak-btn needs-tts" data-text="' + text.replace(/"/g, "&quot;") + '">🔊</button>';
        list.appendChild(li);
      });
      list.querySelectorAll("[data-text]").forEach(function (btn) {
        btn.addEventListener("click", function () { window.AccessEdu.speak(btn.getAttribute("data-text")); });
      });

      resultBox.hidden = false;
      resultBox.setAttribute("tabindex", "-1");
      resultBox.focus();
      window.AccessEdu.announce("Route found: " + document.getElementById("route-title").textContent);

      document.getElementById("route-speak-all").onclick = function () { window.AccessEdu.speak(fullText); };
    });
  });
})();
