var INSTALL_KEY = "eization-install";
var INSTALL_SEEN_KEY = "eization-install-seen";
var INSTALL_DELAY_MS = 20000;
var INSTALL_SHOWS = 3;
var installPrompt = null;
var installAccepted = false;
var installFromMenu = false;
var installVisitOff = false;
var installNoted = false;
var installDue = false;
var installTimer = null;
var installKind = "other";
var installShowTracked = false;
var installRunningTracked = false;
var installAcceptTracked = false;

function installTrack(name, params) {
  if (typeof track === "function") {
    track(name, params);
    return;
  }
  try {
    if (String(window.location.search || "").indexOf("smoke=1") !== -1) {
      return;
    }
  } catch (err) {
    return;
  }
  if (typeof gtag === "function") {
    gtag("event", name, params || {});
  }
}

function installTrackAccept(source) {
  if (installAcceptTracked) {
    return;
  }
  installAcceptTracked = true;
  installTrack("install_accept", { kind: installKind, source: source });
}

var INSTALL_STEP = {
  ios: "install.ios",
  android: "install.android",
  "mac-safari": "install.mac",
  chrome: "install.chrome",
  edge: "install.edge",
  other: "install.other"
};

var INSTALL_ICON = {
  share: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V10c0-1.1.9-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .9 2 2z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="4.2" y="4.2" width="15.6" height="15.6" rx="3.2"/><path d="M12 8v8M8 12h8"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>',
  install: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M2.2 4.2h12.4A1.6 1.6 0 0 1 16.2 5.8v7.2a1.6 1.6 0 0 1-1.6 1.6H2.2a1.6 1.6 0 0 1-1.6-1.6V5.8a1.6 1.6 0 0 1 1.6-1.6zm1.5 1.7v5.4h9.4V5.9H3.7zM5.4 16.2h6.2v1.5H5.4z"/><path fill="currentColor" d="M16.6 2.6h2.2v6.6l1.55-1.55 1.55 1.55-4.2 4.2-4.2-4.2 1.55-1.55 1.55 1.55V2.6z"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M8 1.6h8A2.2 2.2 0 0 1 18.2 3.8v16.4a2.2 2.2 0 0 1-2.2 2.2H8a2.2 2.2 0 0 1-2.2-2.2V3.8A2.2 2.2 0 0 1 8 1.6zm.4 2.2v12.4h7.2V3.8H8.4z"/><path fill="currentColor" d="M11 6h2v3.7l1.15-1.15 1.4 1.4L12 13.5 8.45 9.95l1.4-1.4L11 9.7V6z"/><rect x="10.3" y="18.3" width="3.4" height="1.2" rx="0.6" fill="currentColor"/></svg>',
  addhome: '<svg viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" d="M9 1.6h8A2.2 2.2 0 0 1 19.2 3.8v16.4a2.2 2.2 0 0 1-2.2 2.2H9a2.2 2.2 0 0 1-2.2-2.2V3.8A2.2 2.2 0 0 1 9 1.6zm.5 2.2v14.2h7V3.8h-7z"/><path fill="currentColor" d="M3.2 10.2h1.8v1.8h1.8v1.8H5v1.8H3.2V13.8H1.4v-1.8h1.8v-1.8z"/><rect x="11.2" y="18.5" width="3.6" height="1.15" rx="0.5" fill="currentColor"/></svg>',
  apps: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7.2" height="7.2" rx="1.6" fill="currentColor"/><rect x="13.8" y="3" width="7.2" height="7.2" rx="1.6" fill="currentColor"/><rect x="3" y="13.8" width="7.2" height="7.2" rx="1.6" fill="currentColor"/><rect x="13.8" y="13.8" width="7.2" height="7.2" rx="1.6" fill="currentColor"/></svg>',
  chrome: '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 6.5a17.5 17.5 0 0 1 15.2 8.8H24l-4.6 8L9.2 15.2A17.5 17.5 0 0 1 24 6.5z"/><path fill="#FBBC04" d="M39.2 15.3A17.5 17.5 0 0 1 24 41.5c-3.2 0-6.2-.9-8.8-2.4l8.2-14.2 6.6-3.6 9.2-6z"/><path fill="#34A853" d="M15.2 39.1A17.5 17.5 0 0 1 6.5 24c0-2.2.4-4.3 1.2-6.2l10.7 6.2 5.6 9.7-8.8 5.4z"/><circle cx="24" cy="24" r="8.2" fill="#fff"/><circle cx="24" cy="24" r="6" fill="#4285F4"/></svg>',
  edge: '<svg viewBox="0 0 48 48"><path fill="#0C59A4" d="M24 6c8.4 0 16 6.2 17.6 14.4-2.2-3.4-6.8-6-12.2-6-8.2 0-14.2 5.6-14.2 12.2 0 2.2.7 4.3 1.9 6.1C10.6 30.2 6 25.2 6 18.8 6 11.2 13.6 6 24 6z"/><path fill="#1B9DE2" d="M15.2 32.7C17.6 36.8 22.4 40 28.2 40c7.2 0 13.2-4.6 15.2-11-1.6 5.6-7.4 9.2-14.6 8.2-5.2-.8-9.4-4.2-11.2-8.6-.6 1.4-1.4 2.8-2.4 4.1z"/><path fill="#36C752" d="M18.4 20.6c2.6-2.2 6.6-2.4 9.6-.6 2.2 1.4 3.4 3.6 3.2 6-2.2-1.6-5.4-2-8.2-.8-2.6 1.1-4.2 3.4-4.6 6-1.8-2.6-1.8-6.6 0-10.6z"/></svg>',
  safari: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#1AA6F0"/><circle cx="24" cy="24" r="16.5" fill="#fff"/><path fill="#F04E45" d="M24 8.5l3.2 14.2L24 25.2 16.2 14.2z"/><path fill="#C5CDD4" d="M24 39.5l-3.2-14.2L24 22.8l7.8 11z"/></svg>'
};

function installPaintStep(el, key) {
  var text = t(key);
  var parts = String(text).split(/\{([a-z]+)\}/);
  var i;
  var mark;
  var icon;
  el.textContent = "";
  for (i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      icon = INSTALL_ICON[parts[i]];
      if (!icon) {
        el.appendChild(document.createTextNode("{" + parts[i] + "}"));
        continue;
      }
      mark = document.createElement("span");
      mark.className = "installIcon";
      mark.setAttribute("aria-hidden", "true");
      mark.innerHTML = icon;
      el.appendChild(mark);
    } else if (parts[i]) {
      el.appendChild(document.createTextNode(parts[i]));
    }
  }
}

function installLiveSignals() {
  var data = navigator.userAgentData;
  var brands = "";
  if (data && data.brands && data.brands.length) {
    brands = data.brands.map(function (brand) {
      return brand && brand.brand ? brand.brand : "";
    }).join(" ");
  }
  return {
    ua: navigator.userAgent || "",
    platform: (data && data.platform) || navigator.platform || "",
    brands: brands,
    touch: navigator.maxTouchPoints || 0
  };
}

function installProfile(signals) {
  var s = signals || installLiveSignals();
  var ua = String(s.ua || "");
  var platform = String(s.platform || "");
  var brands = String(s.brands || "");
  var touch = s.touch || 0;
  var mac = /Macintosh|Mac OS X/.test(ua) || platform === "macOS" || platform === "MacIntel";
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|Twitter|Snapchat|TikTok|Musical_ly|MicroMessenger/i.test(ua)) {
    return "other";
  }
  if (/iPad|iPhone|iPod/.test(ua) || platform === "iOS" || (touch > 1 && (platform === "MacIntel" || /Macintosh/.test(ua)))) {
    return "ios";
  }
  if (/Android/i.test(ua) || platform === "Android") {
    return "android";
  }
  if (/Edg\//.test(ua) || /Microsoft Edge/.test(brands)) {
    return "edge";
  }
  if (/Firefox\//.test(ua) || /\bFirefox\b/.test(brands)) {
    return "other";
  }
  if (/Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg\/|OPR\/|FxiOS/.test(ua) && mac) {
    return "mac-safari";
  }
  if (/Chrome\/|CriOS|Chromium/.test(ua) || /Google Chrome|Chromium/.test(brands)) {
    return "chrome";
  }
  return "other";
}

function installRunning() {
  var modes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];
  var i;
  if (installAccepted) {
    return true;
  }
  if (window.navigator && window.navigator.standalone === true) {
    return true;
  }
  for (i = 0; i < modes.length; i++) {
    if (window.matchMedia("(display-mode: " + modes[i] + ")").matches) {
      return true;
    }
  }
  return false;
}

function installQuiet() {
  var search = String(window.location.search || "");
  if (/[?&](?:embed|look|smoke)=1(?:&|$)/.test(search)) {
    return true;
  }
  if (document.documentElement.classList.contains("is-look")) {
    return true;
  }
  try {
    if (window.top !== window.self) {
      return true;
    }
  } catch (err) {
    return true;
  }
  return false;
}

function installRead() {
  try {
    return localStorage.getItem(INSTALL_KEY) || "";
  } catch (err) {
    return "";
  }
}

function installAutoDone(raw) {
  var text = raw == null ? "" : String(raw);
  var match;
  if (text === "1") {
    return true;
  }
  match = /^shown:(\d+)$/.exec(text);
  if (!match) {
    return false;
  }
  return parseInt(match[1], 10) >= INSTALL_SHOWS;
}

function installShowCount(raw) {
  var match = /^shown:(\d+)$/.exec(raw == null ? "" : String(raw));
  if (!match) {
    return 0;
  }
  return parseInt(match[1], 10) || 0;
}

function installSeenSession() {
  try {
    return sessionStorage.getItem(INSTALL_SEEN_KEY) === "1";
  } catch (err) {
    return false;
  }
}

function forgetInstall() {
  if (installTimer) {
    clearTimeout(installTimer);
    installTimer = null;
  }
  installDue = false;
  installNoted = false;
  installVisitOff = true;
  try {
    localStorage.removeItem(INSTALL_KEY);
  } catch (err) {}
  try {
    sessionStorage.removeItem(INSTALL_SEEN_KEY);
  } catch (err) {}
  installSync();
}

function installHelp() {
  var es = typeof eizationLang !== "undefined" && eizationLang === "es";
  if (installKind === "ios") {
    return {
      href: es
        ? "https://support.apple.com/es-lamr/guide/iphone/iph42ab2f3a7/ios"
        : "https://support.apple.com/guide/iphone/iph42ab2f3a7/ios",
      key: "install.helpApple"
    };
  }
  if (installKind === "mac-safari") {
    return {
      href: es ? "https://support.apple.com/es-lamr/104996" : "https://support.apple.com/en-us/104996",
      key: "install.helpApple"
    };
  }
  if (installKind === "android") {
    return {
      href: "https://support.google.com/chrome/answer/9658361?hl=" + (es ? "es" : "en") + "&co=GENIE.Platform%3DAndroid",
      key: "install.helpChrome"
    };
  }
  if (installKind === "chrome") {
    return {
      href: "https://support.google.com/chrome/answer/9658361?hl=" + (es ? "es" : "en"),
      key: "install.helpChrome"
    };
  }
  return null;
}

function installApplyLanguage() {
  var chip = document.getElementById("installAsk");
  var lead = document.getElementById("installLead");
  var go = document.getElementById("installGo");
  var notNow = document.getElementById("installNotNow");
  var step = document.getElementById("installStep");
  var help = document.getElementById("installHelp");
  var link = document.getElementById("installHelpLink");
  var info;
  if (typeof t !== "function") {
    return;
  }
  if (chip) {
    chip.setAttribute("aria-label", t("install.action"));
  }
  if (lead) {
    lead.textContent = t("install.lead");
  }
  if (go) {
    go.textContent = t("install.action");
  }
  if (notNow) {
    notNow.textContent = t("install.notNow");
  }
  if (step) {
    installPaintStep(step, INSTALL_STEP[installKind] || INSTALL_STEP.other);
  }
  info = installHelp();
  if (help && link) {
    if (!info) {
      help.hidden = true;
      link.removeAttribute("href");
      link.textContent = "";
    } else {
      help.hidden = false;
      link.href = info.href;
      link.textContent = t(info.key);
    }
  }
}

function installPlace() {
  var chip = document.getElementById("installAsk");
  var bar = document.getElementById("topBar");
  var bottom;
  if (!chip || !bar) {
    return;
  }
  bottom = bar.getBoundingClientRect().bottom;
  chip.style.top = Math.max(0, Math.round(bottom + 8)) + "px";
  if (document.body.classList.contains("is-hello") && typeof placeHelloCaption === "function") {
    placeHelloCaption();
  }
}

function installHello() {
  return document.body.classList.contains("is-hello");
}

function installShareOpen() {
  var share = document.getElementById("shareAsk");
  return !!(share && !share.hidden);
}

function installNoteShow() {
  var next;
  if (installNoted) {
    return;
  }
  installNoted = true;
  try {
    sessionStorage.setItem(INSTALL_SEEN_KEY, "1");
  } catch (err) {}
  next = installShowCount(installRead()) + 1;
  if (next > INSTALL_SHOWS) {
    next = INSTALL_SHOWS;
  }
  try {
    localStorage.setItem(INSTALL_KEY, "shown:" + next);
  } catch (err) {}
}

function installSync() {
  var chip = document.getElementById("installAsk");
  var menu = document.getElementById("aboutInstall");
  var installed = installRunning();
  var quiet = installQuiet();
  var shareOpen = installShareOpen();
  var hello = installHello();
  var autoShow = false;
  var show;
  if (menu) {
    menu.hidden = installed || quiet;
  }
  if (!installed && !quiet && !shareOpen && !hello && !installVisitOff && !installFromMenu && installDue && !installNoted && !installSeenSession() && !installAutoDone(installRead())) {
    installNoteShow();
  }
  autoShow = installNoted && !installVisitOff && !hello && !shareOpen;
  show = !installed && !quiet && !shareOpen && (installFromMenu || autoShow);
  if (chip) {
    chip.hidden = !show;
  }
  if (show) {
    if (!installShowTracked) {
      installShowTracked = true;
      installTrack("install_prompt_show", {
        kind: installKind,
        source: installFromMenu ? "menu" : "auto"
      });
    }
  } else {
    installShowTracked = false;
  }
  installPlace();
  if (hello && typeof placeHelloCaption === "function") {
    placeHelloCaption();
  }
}

function installStopTimer() {
  if (installTimer) {
    clearTimeout(installTimer);
    installTimer = null;
  }
}

function installSchedule() {
  var waiting = installHello() || installShareOpen() || installFromMenu;
  var finished = installQuiet() || installRunning() || installVisitOff || installNoted || installSeenSession() || installAutoDone(installRead());
  if (finished) {
    installStopTimer();
    installSync();
    return;
  }
  if (waiting) {
    installStopTimer();
    installDue = false;
    installSync();
    return;
  }
  if (installDue) {
    installSync();
    return;
  }
  if (installTimer) {
    installSync();
    return;
  }
  installTimer = setTimeout(function () {
    installTimer = null;
    if (installHello() || installShareOpen() || installFromMenu || installQuiet() || installRunning()) {
      installSchedule();
      return;
    }
    installDue = true;
    installSync();
  }, INSTALL_DELAY_MS);
  installSync();
}

function installShowSteps() {
  var steps = document.getElementById("installSteps");
  if (steps) {
    steps.hidden = false;
  }
  installApplyLanguage();
  installSync();
}

function installActivate() {
  var pending = installPrompt;
  if (!pending) {
    installShowSteps();
    return;
  }
  installPrompt = null;
  try {
    pending.prompt();
  } catch (err) {
    installShowSteps();
    return;
  }
  if (!pending.userChoice || typeof pending.userChoice.then !== "function") {
    installShowSteps();
    return;
  }
  pending.userChoice.then(function (choice) {
    if (choice && choice.outcome === "accepted") {
      installAccepted = true;
      installFromMenu = false;
      installTrackAccept("prompt");
      installSync();
      return;
    }
    installTrack("install_dismiss", { kind: installKind, source: "prompt" });
    installShowSteps();
  }, function () {
    installShowSteps();
  });
}

function installDismiss() {
  var menuOnly = installFromMenu && !installNoted;
  var steps = document.getElementById("installSteps");
  installTrack("install_dismiss", {
    kind: installKind,
    source: menuOnly ? "menu" : "chip"
  });
  installFromMenu = false;
  if (!menuOnly) {
    installVisitOff = true;
  }
  if (steps) {
    steps.hidden = true;
  }
  if (menuOnly) {
    installSchedule();
    return;
  }
  installSync();
}

function installBuild() {
  var chip;
  var menu;
  if (document.getElementById("installAsk")) {
    return;
  }
  chip = document.createElement("div");
  chip.id = "installAsk";
  chip.hidden = true;
  chip.setAttribute("role", "region");
  chip.innerHTML = '<p id="installLead"></p><div id="installActions"><button type="button" id="installGo"></button><button type="button" id="installNotNow"></button></div><div id="installSteps" hidden><p id="installStep"></p><p id="installHelp" hidden><a id="installHelpLink" target="_blank" rel="noopener noreferrer"></a></p></div>';
  document.body.appendChild(chip);
  document.getElementById("installGo").addEventListener("click", installActivate);
  document.getElementById("installNotNow").addEventListener("click", installDismiss);
  menu = document.getElementById("aboutInstall");
  if (menu) {
    menu.addEventListener("click", function () {
      installTrack("install_menu", { kind: installKind });
      if (typeof closeAbout === "function") {
        closeAbout();
      }
      installFromMenu = true;
      installSchedule();
      installActivate();
    });
  }
}

function installWatch() {
  var modes = ["standalone", "minimal-ui", "fullscreen", "window-controls-overlay"];
  var share = document.getElementById("shareAsk");
  var i;
  for (i = 0; i < modes.length; i++) {
    var mq = window.matchMedia("(display-mode: " + modes[i] + ")");
    if (mq.addEventListener) {
      mq.addEventListener("change", installSchedule);
    } else if (mq.addListener) {
      mq.addListener(installSchedule);
    }
  }
  if (window.MutationObserver) {
    new MutationObserver(installSchedule).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    if (share) {
      new MutationObserver(installSchedule).observe(share, { attributes: true, attributeFilter: ["hidden"] });
    }
  }
  var bar = document.getElementById("topBar");
  if (bar && window.ResizeObserver) {
    new ResizeObserver(installPlace).observe(bar);
  }
  window.addEventListener("resize", installPlace);
}

window.addEventListener("beforeinstallprompt", function (event) {
  event.preventDefault();
  installPrompt = event;
});

window.addEventListener("appinstalled", function () {
  installAccepted = true;
  installFromMenu = false;
  installTrackAccept("appinstalled");
  installSync();
});

installKind = installProfile();
installBuild();
installApplyLanguage();
installWatch();
installSchedule();
window.setTimeout(function () {
  if (installRunningTracked || !installRunning() || installQuiet()) {
    return;
  }
  installRunningTracked = true;
  installTrack("install_running", { kind: installKind });
}, 0);
