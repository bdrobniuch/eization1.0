var INSTALL_KEY = "eization-install";
var installPrompt = null;
var installAccepted = false;
var installFromMenu = false;
var installSessionOff = false;
var installKind = "other";

var INSTALL_STEP = {
  ios: "install.ios",
  android: "install.android",
  "mac-safari": "install.mac",
  chrome: "install.chrome",
  edge: "install.edge",
  other: "install.other"
};

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

function installDismissed() {
  if (installSessionOff) {
    return true;
  }
  try {
    return localStorage.getItem(INSTALL_KEY) === "1";
  } catch (err) {
    return false;
  }
}

function forgetInstall() {
  try {
    localStorage.removeItem(INSTALL_KEY);
  } catch (err) {}
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
    step.textContent = t(INSTALL_STEP[installKind] || INSTALL_STEP.other);
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

function installSync() {
  var chip = document.getElementById("installAsk");
  var menu = document.getElementById("aboutInstall");
  var share = document.getElementById("shareAsk");
  var installed = installRunning();
  var quiet = installQuiet();
  var shareOpen = !!(share && !share.hidden);
  var show = !installed && !quiet && !shareOpen && (installFromMenu || !installDismissed());
  if (menu) {
    menu.hidden = installed || quiet;
  }
  if (chip) {
    chip.hidden = !show;
  }
  installPlace();
  if (document.body.classList.contains("is-hello") && typeof placeHelloCaption === "function") {
    placeHelloCaption();
  }
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
      installSync();
      return;
    }
    installShowSteps();
  }, function () {
    installShowSteps();
  });
}

function installDismiss() {
  installFromMenu = false;
  installSessionOff = true;
  try {
    localStorage.setItem(INSTALL_KEY, "1");
  } catch (err) {}
  var steps = document.getElementById("installSteps");
  if (steps) {
    steps.hidden = true;
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
      if (typeof closeAbout === "function") {
        closeAbout();
      }
      installFromMenu = true;
      installSync();
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
      mq.addEventListener("change", installSync);
    } else if (mq.addListener) {
      mq.addListener(installSync);
    }
  }
  if (share && window.MutationObserver) {
    new MutationObserver(installSync).observe(share, { attributes: true, attributeFilter: ["hidden"] });
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
  installSync();
});

installKind = installProfile();
installBuild();
installApplyLanguage();
installWatch();
installSync();
