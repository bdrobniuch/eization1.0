var SEALED = {
  mail: [56, 11, 21, 251, 235, 241, 134, 62, 21, 27, 227, 224, 242, 221, 57, 15, 52, 230, 227, 250, 193, 54, 73, 23, 238, 227],
  site: [50, 19, 0, 241, 253, 161, 135, 117, 16, 3, 246, 160, 249, 196, 59, 29, 17, 235, 234, 233, 199, 56, 9, 29, 244, 237, 243, 217, 47, 6, 6, 245, 235, 239, 134, 42, 11],
  linkedin: [50, 19, 0, 241, 253, 161, 135, 117, 2, 7, 175, 226, 242, 198, 49, 2, 16, 232, 224, 181, 203, 53, 10, 91, 232, 224, 180, 202, 62, 21, 27, 227, 224, 242, 221, 57, 15],
  instagram: [50, 19, 0, 241, 253, 161, 135, 117, 16, 3, 246, 160, 242, 198, 41, 19, 21, 230, 252, 250, 197, 116, 4, 27, 236, 161, 249, 204, 40, 8, 22, 239, 231, 238, 203, 50, 72],
  github: [50, 19, 0, 241, 253, 161, 135, 117, 0, 29, 245, 230, 238, 202, 116, 4, 27, 236, 161, 249, 204, 40, 8, 22, 239, 231, 238, 203, 50],
  coffee: [50, 19, 0, 241, 253, 161, 135, 117, 21, 17, 247, 225, 247, 221, 46, 73, 25, 228, 161, 249, 204, 40, 8, 22, 239, 231, 238, 203, 50]
};

function openSeal(codes) {
  var text = "";
  for (var i = 0; i < codes.length; i++) {
    text += String.fromCharCode(codes[i] ^ (90 + (i % 7) * 13));
  }
  return text;
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

var ABOUT_PAGES = {
  home: { titleKey: "about.title", id: "aboutHome" },
  how: { titleKey: "about.howTitle", id: "aboutHow", from: "aboutGoHow" },
  author: { titleKey: "about.authorTitle", id: "aboutAuthor", from: "aboutGoAuthor" },
  device: { titleKey: "about.deviceTitle", id: "aboutDevice", from: "aboutGoDevice" },
  contribute: { titleKey: "about.contributeTitle", id: "aboutContribute" }
};

var aboutPage = "home";

function setAboutPage(page) {
  var name;
  var sheet;
  if (!ABOUT_PAGES[page]) {
    page = "home";
  }
  if (page !== "device") {
    if (typeof disarmRestoreDefaults === "function") {
      disarmRestoreDefaults();
    }
    disarmUploadAll();
  }
  aboutPage = page;
  for (name in ABOUT_PAGES) {
    if (Object.prototype.hasOwnProperty.call(ABOUT_PAGES, name)) {
      document.getElementById(ABOUT_PAGES[name].id).hidden = name !== page;
    }
  }
  document.getElementById("aboutTitle").textContent = t(ABOUT_PAGES[page].titleKey);
  document.getElementById("aboutBack").hidden = page === "home";
  sheet = document.getElementById("about");
  if (sheet) {
    sheet.scrollTop = 0;
  }
}

function openAboutPage(page) {
  if (!ABOUT_PAGES[page] || page === "home") {
    return;
  }
  setAboutPage(page);
  document.getElementById("aboutBack").focus();
}

function backAbout() {
  var from = ABOUT_PAGES[aboutPage] && ABOUT_PAGES[aboutPage].from;
  setAboutPage("home");
  if (from) {
    var backTo = document.getElementById(from);
    if (backTo) {
      backTo.focus();
    }
  }
}

function openCoffeePay() {
  if (typeof track === "function") {
    track("about_coffee");
  }
  window.open(openSeal(SEALED.coffee), "_blank", "noopener,noreferrer");
}

function openAbout() {
  if (typeof closeGroovePanel === "function") {
    closeGroovePanel();
  }
  if (typeof closeExercisePanel === "function") {
    closeExercisePanel();
  }
  var sheet = document.getElementById("about");
  setAboutPage("home");
  sheet.classList.add("is-open");
  document.body.classList.add("is-about");
  document.getElementById("brand").setAttribute("aria-expanded", "true");
  placeAbout();
  document.getElementById("aboutClose").focus();
}

var uploadAllTimer = null;

function disarmUploadAll() {
  var button = document.getElementById("uploadAllExercises");
  if (uploadAllTimer) {
    clearTimeout(uploadAllTimer);
    uploadAllTimer = null;
  }
  if (!button) {
    return;
  }
  button.classList.remove("is-armed");
  button.textContent = t("device.upload");
}

function closeAbout() {
  if (typeof disarmRestoreDefaults === "function") {
    disarmRestoreDefaults();
  }
  disarmUploadAll();
  var sheet = document.getElementById("about");
  if (!sheet || !sheet.classList.contains("is-open")) {
    return;
  }
  sheet.classList.remove("is-open");
  document.body.classList.remove("is-about");
  document.getElementById("brand").setAttribute("aria-expanded", "false");
  setAboutPage("home");
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
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

function aboutApplyLanguage() {
  var title = document.getElementById("aboutTitle");
  var upload = document.getElementById("uploadAllExercises");
  var emailCopy = document.querySelector("#emailLine .support-copy");
  if (title && ABOUT_PAGES[aboutPage]) {
    title.textContent = t(ABOUT_PAGES[aboutPage].titleKey);
  }
  if (upload && upload.classList.contains("is-armed")) {
    upload.textContent = t("device.uploadAsk");
  }
  if (emailCopy && !emailCopy._copyTimer) {
    emailCopy.textContent = t("support.copy");
  }
}

function markCopied(button) {
  var text = button.getAttribute("data-copy") || "";
  copySupportText(text).then(function () {
    if (button._copyTimer) {
      window.clearTimeout(button._copyTimer);
    }
    button.textContent = t("support.copied");
    button._copyTimer = window.setTimeout(function () {
      button.textContent = t("support.copy");
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
  copy.textContent = t("support.copy");
  copy.setAttribute("data-copy", address);
  line.appendChild(text);
  line.appendChild(copy);
  line.hidden = false;
  button.setAttribute("aria-expanded", "true");
}

function aboutSharePayload() {
  var link = document.querySelector("link[rel='canonical']");
  var url = link && link.href ? link.href : window.location.href;
  return {
    title: "eization",
    text: t("share.text"),
    url: url
  };
}

function copyAboutLink(url) {
  copySupportText(url).then(function () {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.copied"));
    }
  }, function () {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("share.fail"));
    }
  });
}

function shareAbout() {
  var payload = aboutSharePayload();
  if (navigator.share) {
    navigator.share(payload).catch(function (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      copyAboutLink(payload.url);
    });
    return;
  }
  copyAboutLink(payload.url);
}

function openMailDraft(subject, body) {
  var address = openSeal(SEALED.mail);
  var link = document.createElement("a");
  link.href = "mailto:" + address + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function practiceBackupFile() {
  if (typeof packDeskExercises !== "function" || typeof File !== "function") {
    return null;
  }
  var payload = packDeskExercises();
  if (!payload || !payload.exercises || !payload.exercises.length) {
    return null;
  }
  return new File(
    [JSON.stringify(payload, null, 2) + "\n"],
    "eization-exercises.json",
    { type: "application/json" }
  );
}

function sendPracticeByMail() {
  if (typeof downloadAllDeskExercises !== "function" || !downloadAllDeskExercises()) {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("mail.none"));
    }
    return;
  }
  openMailDraft(
    t("mail.practiceSubject"),
    t("mail.practiceBody")
  );
  if (typeof showDeskNote === "function") {
      showDeskNote(t("mail.sent"));
  }
}

function trySharePractice(file) {
  var payload = {
    files: [file],
    text: t("mail.practiceShare")
  };
  if (!navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    if (!navigator.canShare(payload)) {
      return false;
    }
    navigator.share(payload).catch(function (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      sendPracticeByMail();
    });
    return true;
  } catch (error) {
    return false;
  }
}

function sendPractice() {
  var file = practiceBackupFile();
  if (!file) {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("mail.none"));
    }
    return;
  }
  if (trySharePractice(file)) {
    return;
  }
  sendPracticeByMail();
}

var studioOfferOpen = false;

function armStudioOffer() {
  var button = document.getElementById("shareFeedback");
  studioOfferOpen = true;
  if (!button) {
    return;
  }
  button.setAttribute("data-i18n", "offer.write");
  button.setAttribute("data-i18n-title", "offer.writeTitle");
  button.textContent = t("offer.write");
  button.setAttribute("title", t("offer.writeTitle"));
}

function writeFeedback() {
  var button;
  if (studioOfferOpen) {
    studioOfferOpen = false;
    openMailDraft(t("offer.subject"), t("offer.body"));
    if (typeof clearExerciseQuery === "function") {
      clearExerciseQuery();
    }
    button = document.getElementById("shareFeedback");
    if (button) {
      button.setAttribute("data-i18n", "author.feedback");
      button.setAttribute("data-i18n-title", "author.feedbackTitle");
      button.textContent = t("author.feedback");
      button.setAttribute("title", t("author.feedbackTitle"));
    }
    return;
  }
  openMailDraft("eization", t("mail.feedbackBody"));
}

function currentDeskRow() {
  if (typeof getDeskExercise !== "function" || typeof currentExerciseId === "undefined") {
    return null;
  }
  return getDeskExercise(currentExerciseId);
}

function sendThisExercise() {
  var row = currentDeskRow();
  var url;
  var body;
  if (!row) {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("contribute.none"));
    }
    return;
  }
  url = typeof exerciseShareUrl === "function" ? exerciseShareUrl(row) : "";
  if (url) {
    body = tr("mail.exerciseBody", { url: url });
  } else if (typeof downloadExerciseFile === "function" && downloadExerciseFile(row)) {
    body = t("mail.exerciseFile");
    if (typeof showDeskNote === "function") {
      showDeskNote(t("mail.exerciseSaved"));
    }
  } else {
    if (typeof showDeskNote === "function") {
      showDeskNote(t("contribute.none"));
    }
    return;
  }
  openMailDraft(t("mail.exerciseSubject"), body);
  if (typeof track === "function") {
    track("contribute_send", { exercise_id: row.seedId || "custom" });
  }
}

function reportCorrection() {
  var row = currentDeskRow();
  var name = row && typeof exerciseDisplayName === "function" ? exerciseDisplayName(row) : "";
  var url = row && typeof exerciseShareUrl === "function" ? exerciseShareUrl(row) : "";
  var body = url
    ? tr("mail.correctionBody", { name: name, url: url })
    : tr("mail.correctionPlain", { name: name });
  openMailDraft(t("mail.correctionSubject"), body);
  if (typeof track === "function") {
    track("contribute_correction", { exercise_id: row && row.seedId ? row.seedId : "custom" });
  }
}

function initAbout() {
  var brand = document.getElementById("brand");
  brand.addEventListener("click", function () {
    if (typeof editorLeaveIfClean === "function" && !editorLeaveIfClean()) {
      return;
    }
    if (aboutIsOpen()) {
      closeAbout();
    } else {
      openAbout();
    }
  });
  document.getElementById("aboutClose").addEventListener("click", closeAbout);
  document.getElementById("aboutBack").addEventListener("click", backAbout);
  document.getElementById("aboutNav").addEventListener("click", function (event) {
    var button = event.target.closest("[data-about]");
    if (!button) {
      return;
    }
    openAboutPage(button.getAttribute("data-about"));
  });
  document.getElementById("aboutShare").addEventListener("click", shareAbout);
  var aboutToday = document.getElementById("aboutToday");
  if (aboutToday) {
    aboutToday.addEventListener("click", function () {
      if (typeof openTodayExercise === "function") {
        openTodayExercise();
      }
    });
  }
  var sendExercise = document.getElementById("sendExercise");
  if (sendExercise) {
    sendExercise.addEventListener("click", sendThisExercise);
  }
  var reportFix = document.getElementById("reportCorrection");
  if (reportFix) {
    reportFix.addEventListener("click", reportCorrection);
  }
  document.getElementById("aboutHow").addEventListener("click", function (event) {
    var button = event.target.closest("[data-hello]");
    if (!button || typeof showHelloPart !== "function") {
      return;
    }
    var topic = button.getAttribute("data-hello");
    if (topic !== "exercise" && topic !== "edit" && topic !== "metronome") {
      return;
    }
    showHelloPart(topic);
    if (typeof track === "function") {
      track("hello_show", { topic: topic });
    }
  });
  document.getElementById("aboutLinks").addEventListener("click", function (event) {
    var link = event.target.closest("[data-link]");
    if (!link) {
      return;
    }
    var kind = link.getAttribute("data-link");
    if (kind === "site" || kind === "linkedin" || kind === "instagram" || kind === "github") {
      if (typeof track === "function") {
        track("about_outbound", { link: kind });
      }
    }
    window.open(openSeal(SEALED[link.getAttribute("data-link")]), "_blank", "noopener,noreferrer");
  });
  document.getElementById("aboutEmail").addEventListener("click", revealEmail);
  document.getElementById("sendPractice").addEventListener("click", function () {
    if (typeof track === "function") {
      track("about_send");
    }
    sendPractice();
  });
  document.getElementById("shareFeedback").addEventListener("click", function () {
    if (typeof track === "function") {
      track("about_feedback");
    }
    writeFeedback();
  });
  document.getElementById("emailLine").addEventListener("click", function (event) {
    var button = event.target.closest(".support-copy");
    if (!button) {
      return;
    }
    markCopied(button);
  });
  document.getElementById("aboutCoffee").addEventListener("click", openCoffeePay);
  document.getElementById("supportReveal").addEventListener("click", openCoffeePay);
  document.getElementById("downloadAllExercises").addEventListener("click", function () {
    if (typeof downloadAllDeskExercises === "function" && downloadAllDeskExercises()) {
      if (typeof track === "function") {
        track("backup_download");
      }
      if (typeof showDeskNote === "function") {
        showDeskNote(t("mail.downloaded"));
      }
    }
  });
  document.getElementById("uploadAllExercises").addEventListener("click", function () {
    if (!this.classList.contains("is-armed")) {
      this.classList.add("is-armed");
      this.textContent = t("device.uploadAsk");
      if (uploadAllTimer) {
        clearTimeout(uploadAllTimer);
      }
      uploadAllTimer = setTimeout(disarmUploadAll, 4000);
      return;
    }
    disarmUploadAll();
    document.getElementById("uploadAllFile").click();
  });
  document.getElementById("uploadAllFile").addEventListener("change", function () {
    var input = this;
    var file = input.files && input.files[0];
    input.value = "";
    if (!file || typeof parseDeskExercisesBackup !== "function") {
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var parsed = parseDeskExercisesBackup(String(reader.result || ""));
      if (parsed.error) {
        if (typeof showDeskNote === "function") {
          showDeskNote(parsed.error);
        }
        return;
      }
      if (typeof replaceDeskExercises === "function" && replaceDeskExercises(parsed.exercises)) {
        if (typeof track === "function") {
          track("backup_upload");
        }
        if (typeof showDeskNote === "function") {
          if (parsed.truncated) {
            showDeskNote(tr("desk.backupTrim", { n: parsed.exercises.length }));
          } else if (parsed.skipped) {
            showDeskNote(t("desk.backupSkip"));
          } else {
            showDeskNote(t("mail.replaced"));
          }
        }
        if (typeof layoutFrame === "function") {
          layoutFrame();
        }
      }
    };
    reader.onerror = function () {
      if (typeof showDeskNote === "function") {
        showDeskNote(t("edit.badFile"));
      }
    };
    reader.readAsText(file);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && aboutIsOpen()) {
      closeAbout();
    }
  });
}

initAbout();
