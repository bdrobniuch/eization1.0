var SEALED = {
  name: [24, 293, 21, 509, 235, 241, 136, 30, 21, 27, 227, 224, 242, 221, 57, 15],
  iban: [22, 51, 66, 179, 189, 169, 157, 106, 87, 77, 176, 189, 175, 145, 106, 84, 69, 181, 186, 175],
  bic: [8, 34, 34, 206, 194, 207, 154, 107],
  bank: [8, 2, 2, 238, 226, 238, 220, 122, 37, 21, 239, 229, 187, 253, 27, 37, 88, 161, 197, 244, 198, 41, 19, 29, 245, 251, 248, 193, 48, 8, 7, 161, 254, 233, 134, 122, 85, 69, 195, 162, 187, 152, 98, 86, 71, 177, 174, 205, 193, 54, 9, 29, 244, 253, 183, 136, 22, 14, 0, 233, 251, 250, 198, 51, 6],
  corr: [25, 47, 53, 210, 202, 222, 238, 2],
  title: [30, 6, 6, 238, 249, 242, 210, 52, 6, 84, 239, 239, 187, 218, 53, 29, 3, 114, 228, 187, 201, 42, 11, 29, 234, 239, 248, 194, 51],
  mail: [56, 11, 21, 251, 235, 241, 134, 62, 21, 27, 227, 224, 242, 221, 57, 15, 52, 230, 227, 250, 193, 54, 73, 23, 238, 227],
  site: [50, 19, 0, 241, 253, 161, 135, 117, 16, 3, 246, 160, 249, 196, 59, 29, 17, 235, 234, 233, 199, 56, 9, 29, 244, 237, 243, 217, 47, 6, 6, 245, 235, 239, 134, 42, 11],
  linkedin: [50, 19, 0, 241, 253, 161, 135, 117, 2, 7, 175, 226, 242, 198, 49, 2, 16, 232, 224, 181, 203, 53, 10, 91, 232, 224, 180, 202, 62, 21, 27, 227, 224, 242, 221, 57, 15],
  instagram: [50, 19, 0, 241, 253, 161, 135, 117, 16, 3, 246, 160, 242, 198, 41, 19, 21, 230, 252, 250, 197, 116, 4, 27, 236, 161, 249, 204, 40, 8, 22, 239, 231, 238, 203, 50, 72],
  github: [50, 19, 0, 241, 253, 161, 135, 117, 0, 29, 245, 230, 238, 202, 116, 4, 27, 236, 161, 249, 204, 40, 8, 22, 239, 231, 238, 203, 50]
};

function openSeal(codes) {
  var text = "";
  for (var i = 0; i < codes.length; i++) {
    text += String.fromCharCode(codes[i] ^ (90 + (i % 7) * 13));
  }
  return text;
}

function groupIban(iban) {
  var text = "";
  for (var i = 0; i < iban.length; i++) {
    if (i > 0 && i % 4 === 0) {
      text += " ";
    }
    text += iban.charAt(i);
  }
  return text;
}

function paymentFields(world) {
  var name = openSeal(SEALED.name);
  var iban = openSeal(SEALED.iban);
  var bic = openSeal(SEALED.bic);
  var title = openSeal(SEALED.title);
  var fields = [
    { label: "Recipient", value: name, copy: name },
    { label: "IBAN", value: groupIban(iban), copy: iban },
    { label: world ? "BIC / SWIFT" : "BIC", value: bic, copy: bic }
  ];
  if (world) {
    var bank = openSeal(SEALED.bank);
    var corr = openSeal(SEALED.corr);
    fields.push({ label: "Bank", value: bank, copy: bank });
    fields.push({ label: "Correspondent BIC", value: corr, copy: corr });
  }
  fields.push({ label: "Reference", value: title, copy: title });
  return fields;
}


function aboutIsOpen() {
  var sheet = document.getElementById("about");
  return !!(sheet && sheet.classList.contains("is-open"));
}

function placeAbout() {
  var sheet = document.getElementById("about");
  if (!sheet || !sheet.classList.contains("is-open")) {
    return;
  }
  var bar = document.getElementById("topBar");
  var footer = document.querySelector("footer");
  var top = bar ? bar.getBoundingClientRect().bottom : 0;
  var limit = footer ? footer.getBoundingClientRect().top : window.innerHeight;
  var viewport = window.visualViewport;
  if (viewport) {
    var visibleBottom = viewport.offsetTop + viewport.height;
    if (visibleBottom < limit) {
      limit = visibleBottom;
    }
  }
  sheet.style.top = Math.max(0, top) + "px";
  sheet.style.height = Math.max(120, limit - top) + "px";
}

function openAbout() {
  if (typeof closeGroovePanel === "function") {
    closeGroovePanel();
  }
  if (typeof closeExercisePanel === "function") {
    closeExercisePanel();
  }
  var sheet = document.getElementById("about");
  sheet.classList.add("is-open");
  document.body.classList.add("is-about");
  document.getElementById("brand").setAttribute("aria-expanded", "true");
  placeAbout();
  document.getElementById("aboutClose").focus();
}

function closeAbout() {
  var sheet = document.getElementById("about");
  if (!sheet || !sheet.classList.contains("is-open")) {
    return;
  }
  sheet.classList.remove("is-open");
  document.body.classList.remove("is-about");
  document.getElementById("brand").setAttribute("aria-expanded", "false");
}

function fallbackCopy(text) {
  var area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-999px";
  document.body.appendChild(area);
  area.select();
  var ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (error) {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

function copySupportText(text) {
  var legacy = false;
  try {
    legacy = fallbackCopy(text);
  } catch (error) {
    legacy = false;
  }
  if (legacy) {
    return Promise.resolve();
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.reject(new Error("copy"));
}

function supportFields(fields) {
  var box = document.createElement("div");
  for (var i = 0; i < fields.length; i++) {
    var field = fields[i];
    var row = document.createElement("div");
    row.className = "support-row";
    var text = document.createElement("div");
    var name = document.createElement("p");
    name.className = "support-label";
    name.textContent = field.label;
    var value = document.createElement("p");
    value.className = "support-value";
    value.textContent = field.value;
    text.appendChild(name);
    text.appendChild(value);
    row.appendChild(text);
    var copy = document.createElement("button");
    copy.type = "button";
    copy.className = "support-copy";
    copy.textContent = "Copy";
    copy.setAttribute("data-copy", field.copy);
    row.appendChild(copy);
    box.appendChild(row);
  }
  return box;
}

function showSupportPath(path) {
  var europe = path === "europe";
  document.getElementById("supportEurope").hidden = !europe;
  document.getElementById("supportWorld").hidden = europe;
  document.getElementById("pathEurope").classList.toggle("is-on", europe);
  document.getElementById("pathWorld").classList.toggle("is-on", !europe);
  document.getElementById("pathEurope").setAttribute("aria-pressed", europe ? "true" : "false");
  document.getElementById("pathWorld").setAttribute("aria-pressed", europe ? "false" : "true");
}

function revealSupport() {
  var card = document.getElementById("supportCard");
  var button = document.getElementById("supportReveal");
  if (!card || card.childNodes.length) {
    card.hidden = false;
    button.hidden = true;
    return;
  }
  var paths = document.createElement("div");
  paths.className = "support-paths";
  paths.innerHTML = '<button type="button" id="pathEurope" class="support-path is-on" data-path="europe" aria-pressed="true">Europe</button><button type="button" id="pathWorld" class="support-path" data-path="world" aria-pressed="false">Anywhere else</button>';
  card.appendChild(paths);
  var europe = document.createElement("div");
  europe.id = "supportEurope";
  var europeNote = document.createElement("p");
  europeNote.className = "support-note";
  europeNote.textContent = "Send euros. Copy each line into your bank app. You choose the amount.";
  europe.appendChild(europeNote);
  europe.appendChild(supportFields(paymentFields(false)));
  card.appendChild(europe);
  var world = document.createElement("div");
  world.id = "supportWorld";
  world.hidden = true;
  var worldNote = document.createElement("p");
  worldNote.className = "support-note";
  worldNote.textContent = "Send euros by SWIFT. Copy each line. You choose the amount. It can take a few days.";
  world.appendChild(worldNote);
  world.appendChild(supportFields(paymentFields(true)));
  card.appendChild(world);
  card.hidden = false;
  card.classList.add("is-shown");
  button.hidden = true;
  var sheet = document.getElementById("about");
  var top = card.getBoundingClientRect().top - sheet.getBoundingClientRect().top + sheet.scrollTop;
  sheet.scrollTop = Math.max(0, top - 8);
}

function markCopied(button) {
  var text = button.getAttribute("data-copy") || "";
  copySupportText(text).then(function () {
    if (button._copyTimer) {
      window.clearTimeout(button._copyTimer);
    }
    button.textContent = "Copied!";
    button._copyTimer = window.setTimeout(function () {
      button.textContent = "Copy";
      button._copyTimer = 0;
    }, 2000);
  });
}

function revealEmail() {
  var line = document.getElementById("emailLine");
  var button = document.getElementById("aboutEmail");
  if (line.childNodes.length) {
    line.hidden = false;
    button.setAttribute("aria-expanded", "true");
    return;
  }
  var address = openSeal(SEALED.mail);
  var text = document.createElement("span");
  text.textContent = address;
  var copy = document.createElement("button");
  copy.type = "button";
  copy.className = "support-copy";
  copy.textContent = "Copy";
  copy.setAttribute("data-copy", address);
  line.appendChild(text);
  line.appendChild(copy);
  line.hidden = false;
  button.setAttribute("aria-expanded", "true");
}

function initAbout() {
  var brand = document.getElementById("brand");
  brand.addEventListener("click", function () {
    if (typeof editorIsOpen === "function" && editorIsOpen()) {
      if (typeof editorNotice === "function") {
        editorNotice("Finish or cancel editing first.");
      }
      return;
    }
    if (aboutIsOpen()) {
      closeAbout();
    } else {
      openAbout();
    }
  });
  document.getElementById("aboutClose").addEventListener("click", closeAbout);
  document.getElementById("aboutLinks").addEventListener("click", function (event) {
    var link = event.target.closest("[data-link]");
    if (!link) {
      return;
    }
    window.open(openSeal(SEALED[link.getAttribute("data-link")]), "_blank", "noopener,noreferrer");
  });
  document.getElementById("aboutEmail").addEventListener("click", revealEmail);
  document.getElementById("emailLine").addEventListener("click", function (event) {
    var button = event.target.closest(".support-copy");
    if (!button) {
      return;
    }
    markCopied(button);
  });
  document.getElementById("supportReveal").addEventListener("click", revealSupport);
  document.getElementById("supportCard").addEventListener("click", function (event) {
    var path = event.target.closest("[data-path]");
    if (path) {
      showSupportPath(path.getAttribute("data-path"));
      return;
    }
    var button = event.target.closest(".support-copy");
    if (!button) {
      return;
    }
    markCopied(button);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && aboutIsOpen()) {
      closeAbout();
    }
  });
}

initAbout();
