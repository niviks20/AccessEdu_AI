window.Toolkit = (function () {
  "use strict";

  function postJSON(url, body) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); });
  }

  function getJSON(url) {
    return fetch(url).then(function (r) { return r.json(); });
  }

  function formToObject(form) {
    var obj = {};
    new FormData(form).forEach(function (value, key) { obj[key] = value; });
    return obj;
  }

  function setStatus(el, text, isError) {
    el.textContent = text;
    el.className = "live-region" + (isError ? " " : "");
    if (window.AccessEdu) window.AccessEdu.announce(text);
  }

  function initForm(opts) {
    // opts: { formId, statusId, postUrl, onSuccess(data), extra: {} }
    var form = document.getElementById(opts.formId);
    var status = document.getElementById(opts.statusId);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var payload = formToObject(form);
      if (opts.extra) Object.assign(payload, opts.extra(form));
      setStatus(status, "Submitting…", false);
      postJSON(opts.postUrl, payload).then(function (res) {
        if (!res.ok) { setStatus(status, res.data.message || "Something went wrong.", true); return; }
        setStatus(status, "Done.", false);
        if (opts.onSuccess) opts.onSuccess(res.data, form);
      });
    });
  }

  function refreshList(url, containerId, renderRow, emptyText) {
    var container = document.getElementById(containerId);
    getJSON(url).then(function (res) {
      var rows = (res.data || []);
      if (!rows.length) {
        container.innerHTML = '<li>' + (emptyText || "Nothing here yet.") + '</li>';
        return;
      }
      container.innerHTML = rows.map(renderRow).join("");
    });
  }

  return { postJSON: postJSON, getJSON: getJSON, formToObject: formToObject, setStatus: setStatus, initForm: initForm, refreshList: refreshList };
})();
