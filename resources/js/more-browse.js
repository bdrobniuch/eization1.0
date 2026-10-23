(function () {
  var root = document.getElementById("more-browse");
  var tools = document.getElementById("more-tools");
  var search = document.getElementById("more-search");
  var countEl = document.getElementById("more-count");
  var emptyEl = document.getElementById("more-empty");
  var cards;
  var group = "all";
  var kind = "all";
  var struggle = "";
  var query = "";

  if (!root) {
    return;
  }

  cards = Array.prototype.slice.call(root.querySelectorAll(".more-exercise"));

  function norm(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
  }

  function setPressed(selector, value) {
    var nodes = document.querySelectorAll(selector);
    var i;
    for (i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle("is-on", nodes[i].getAttribute("data-value") === value);
      nodes[i].setAttribute("aria-pressed", nodes[i].getAttribute("data-value") === value ? "true" : "false");
    }
  }

  function matches(card) {
    var hay;
    if (group !== "all" && card.getAttribute("data-group") !== group) {
      return false;
    }
    if (kind !== "all" && card.getAttribute("data-kind") !== kind) {
      return false;
    }
    if (struggle && (card.getAttribute("data-tags") || "").indexOf(struggle) < 0) {
      return false;
    }
    if (query) {
      hay = card.getAttribute("data-search") || "";
      if (hay.indexOf(query) < 0) {
        return false;
      }
    }
    return true;
  }

  function apply() {
    var shown = 0;
    var i;
    var card;
    var on;
    for (i = 0; i < cards.length; i++) {
      card = cards[i];
      on = matches(card);
      card.hidden = !on;
      if (on) {
        shown++;
      }
    }
    if (countEl) {
      countEl.textContent = countEl.getAttribute(shown === 1 ? "data-one" : "data-many").replace("%n", String(shown));
    }
    if (emptyEl) {
      emptyEl.hidden = shown > 0;
    }
  }

  function pickRandom() {
    var visible = [];
    var i;
    var card;
    var link;
    for (i = 0; i < cards.length; i++) {
      card = cards[i];
      if (!card.hidden) {
        visible.push(card);
      }
    }
    if (!visible.length) {
      return;
    }
    card = visible[Math.floor(Math.random() * visible.length)];
    link = card.querySelector(".opens a.open");
    if (link) {
      window.location.href = link.href;
    }
  }

  function markOwned() {
    var raw;
    var desk;
    var list;
    var owned = {};
    var i;
    var row;
    var id;
    var badge;
    try {
      raw = window.localStorage.getItem("eization-desk");
      desk = raw ? JSON.parse(raw) : null;
      list = desk && desk.exercises ? desk.exercises : [];
      for (i = 0; i < list.length; i++) {
        row = list[i];
        if (row && row.shareId) {
          owned[row.shareId] = true;
        }
        if (row && row.seedId) {
          owned["seed:" + row.seedId] = true;
        }
      }
    } catch (err) {
      return;
    }
    for (i = 0; i < cards.length; i++) {
      id = cards[i].getAttribute("data-share-id") || "";
      if (!id || !owned[id]) {
        continue;
      }
      if (cards[i].querySelector(".more-owned")) {
        continue;
      }
      badge = document.createElement("span");
      badge.className = "more-owned";
      badge.textContent = cards[i].getAttribute("data-owned-label") || "On this device";
      cards[i].querySelector("h2").appendChild(badge);
    }
  }

  function revealHash() {
    var id;
    var target;
    if (!window.location.hash || window.location.hash.length < 2) {
      return;
    }
    id = window.location.hash.slice(1);
    target = document.getElementById(id);
    if (!target || !target.classList.contains("more-exercise")) {
      return;
    }
    group = "all";
    kind = "all";
    struggle = "";
    query = "";
    if (search) {
      search.value = "";
    }
    setPressed("[data-more-group]", "all");
    setPressed("[data-more-kind]", "all");
    setPressed("[data-more-struggle]", "");
    apply();
    target.hidden = false;
    if (typeof target.scrollIntoView === "function") {
      window.setTimeout(function () {
        target.scrollIntoView({ block: "start" });
      }, 0);
    }
  }

  document.addEventListener("click", function (event) {
    var groupBtn = event.target.closest("[data-more-group]");
    var kindBtn = event.target.closest("[data-more-kind]");
    var struggleBtn = event.target.closest("[data-more-struggle]");
    var randomBtn = event.target.closest("[data-more-random]");
    var clearBtn = event.target.closest("[data-more-clear]");
    if (groupBtn) {
      group = groupBtn.getAttribute("data-value") || "all";
      struggle = "";
      setPressed("[data-more-group]", group);
      setPressed("[data-more-struggle]", "");
      apply();
      if (tools) {
        tools.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    if (kindBtn) {
      kind = kindBtn.getAttribute("data-value") || "all";
      setPressed("[data-more-kind]", kind);
      apply();
      return;
    }
    if (struggleBtn) {
      struggle = struggleBtn.getAttribute("data-value") || "";
      if (struggleBtn.classList.contains("is-on")) {
        struggle = "";
      }
      group = "all";
      setPressed("[data-more-struggle]", struggle);
      setPressed("[data-more-group]", "all");
      apply();
      if (tools) {
        tools.scrollIntoView({ block: "nearest" });
      }
      return;
    }
    if (randomBtn) {
      event.preventDefault();
      pickRandom();
      return;
    }
    if (clearBtn) {
      event.preventDefault();
      group = "all";
      kind = "all";
      struggle = "";
      query = "";
      if (search) {
        search.value = "";
      }
      setPressed("[data-more-group]", "all");
      setPressed("[data-more-kind]", "all");
      setPressed("[data-more-struggle]", "");
      apply();
    }
  });

  if (search) {
    search.addEventListener("input", function () {
      query = norm(search.value);
      apply();
    });
  }

  window.addEventListener("hashchange", revealHash);
  markOwned();
  apply();
  revealHash();
})();
