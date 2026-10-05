var awakeLock = null;
var awakeClip = null;
var awakeHadGesture = false;
var awakeLockDenied = false;
var awakeAsking = false;
var awakeReleasedAt = 0;
var awakeNextTry = 0;
var awakeWatch = 0;
var awakeLastTime = -1;
var awakeStuck = 0;

function awakeClipUrl() {
  var scripts = document.getElementsByTagName("script");
  var i;
  var src;
  for (i = 0; i < scripts.length; i++) {
    src = scripts[i].getAttribute("src") || "";
    if (src.indexOf("js/awake.js") !== -1) {
      return src.replace("js/awake.js", "media/awake.mp4");
    }
  }
  return "";
}

function pauseAwakeClip() {
  if (!awakeClip) {
    return;
  }
  awakeClip.pause();
  awakeLastTime = -1;
  awakeStuck = 0;
}

function ensureAwakeClip() {
  var url;
  var clip;
  if (awakeClip) {
    return awakeClip;
  }
  url = awakeClipUrl();
  if (!url || !document.body) {
    return null;
  }
  clip = document.createElement("video");
  clip.setAttribute("playsinline", "");
  clip.setAttribute("webkit-playsinline", "");
  clip.setAttribute("muted", "");
  clip.setAttribute("loop", "");
  clip.setAttribute("aria-hidden", "true");
  clip.setAttribute("disableRemotePlayback", "");
  clip.playsInline = true;
  clip.muted = true;
  clip.defaultMuted = true;
  clip.volume = 0;
  clip.loop = true;
  clip.controls = false;
  clip.preload = "auto";
  clip.tabIndex = -1;
  if ("disablePictureInPicture" in clip) {
    clip.disablePictureInPicture = true;
  }
  if ("disableRemotePlayback" in clip) {
    clip.disableRemotePlayback = true;
  }
  clip.src = url;
  // Keep a real on-screen pixel; some iOS builds ignore fully invisible media.
  clip.style.cssText = "position:fixed;left:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1";
  clip.addEventListener("timeupdate", function () {
    if (awakeLock && !awakeLock.released) {
      return;
    }
    if (clip.currentTime > 0.5) {
      try {
        clip.currentTime = Math.random() * 0.4;
      } catch (err) {}
    }
  });
  clip.addEventListener("ended", function () {
    if (awakeLock && !awakeLock.released) {
      return;
    }
    playAwakeClip();
  });
  clip.addEventListener("pause", function () {
    if (awakeLock && !awakeLock.released) {
      return;
    }
    if (document.visibilityState !== "visible" || !awakeHadGesture) {
      return;
    }
    window.setTimeout(function () {
      playAwakeClip();
    }, 0);
  });
  document.body.appendChild(clip);
  awakeClip = clip;
  return clip;
}

function nudgeAwakeClip() {
  var clip = awakeClip;
  var now;
  if (!clip || !awakeHadGesture) {
    return;
  }
  if (awakeLock && !awakeLock.released) {
    return;
  }
  if (document.visibilityState !== "visible") {
    return;
  }
  if (clip.paused || clip.ended) {
    playAwakeClip();
    return;
  }
  now = clip.currentTime;
  if (now === awakeLastTime) {
    awakeStuck += 1;
    if (awakeStuck >= 2) {
      try {
        clip.currentTime = Math.min(now + 0.05, Math.max(0.1, (clip.duration || 1) - 0.05));
      } catch (err) {}
      playAwakeClip();
      awakeStuck = 0;
    }
  } else {
    awakeStuck = 0;
  }
  awakeLastTime = now;
}

function playAwakeClip() {
  var clip;
  var pending;
  if (!awakeHadGesture) {
    return;
  }
  if (awakeLock && !awakeLock.released) {
    return;
  }
  clip = ensureAwakeClip();
  if (!clip) {
    return;
  }
  if (!clip.paused && !clip.ended) {
    return;
  }
  clip.muted = true;
  clip.volume = 0;
  pending = clip.play();
  if (pending && typeof pending.catch === "function") {
    pending.catch(function () {});
  }
}

function adoptAwakeLock(sentinel) {
  awakeLock = sentinel;
  awakeLockDenied = false;
  pauseAwakeClip();
  sentinel.addEventListener("release", function () {
    var now;
    if (awakeLock !== sentinel) {
      return;
    }
    awakeLock = null;
    if (document.visibilityState !== "visible") {
      return;
    }
    now = Date.now();
    if (now - awakeReleasedAt < 1000) {
      awakeNextTry = now + 1500;
    }
    awakeReleasedAt = now;
    window.setTimeout(function () {
      keepPracticeAwake(false);
    }, 400);
  });
}

function keepPracticeAwake(force) {
  var pending;
  if (document.visibilityState === "hidden") {
    return;
  }
  if (awakeLock && !awakeLock.released) {
    pauseAwakeClip();
    return;
  }
  if (awakeAsking) {
    return;
  }
  if (!force && Date.now() < awakeNextTry) {
    playAwakeClip();
    return;
  }
  if (!window.isSecureContext || !navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
    playAwakeClip();
    return;
  }
  try {
    pending = navigator.wakeLock.request("screen");
  } catch (err) {
    awakeNextTry = Date.now() + 1500;
    playAwakeClip();
    return;
  }
  awakeAsking = true;
  pending.then(function (sentinel) {
    awakeAsking = false;
    if (document.visibilityState === "hidden") {
      sentinel.release().catch(function () {});
      return;
    }
    if (awakeLock && !awakeLock.released && awakeLock !== sentinel) {
      sentinel.release().catch(function () {});
      return;
    }
    adoptAwakeLock(sentinel);
  }).catch(function () {
    awakeAsking = false;
    awakeNextTry = Date.now() + 1500;
    if (!awakeHadGesture) {
      return;
    }
    awakeLockDenied = true;
    playAwakeClip();
  });
}

function practiceScreenAwake() {
  if (awakeLock && !awakeLock.released) {
    return true;
  }
  return !!(awakeClip && !awakeClip.paused && !awakeClip.ended);
}

function onAwakeGesture(event) {
  if (event && event.repeat) {
    return;
  }
  awakeHadGesture = true;
  if (awakeLock && !awakeLock.released) {
    return;
  }
  if (awakeLockDenied) {
    playAwakeClip();
  }
  keepPracticeAwake(true);
}

function onAwakeClick() {
  if (!awakeLockDenied || (awakeLock && !awakeLock.released)) {
    return;
  }
  awakeHadGesture = true;
  playAwakeClip();
}

function wakePracticeAgain() {
  if (document.visibilityState === "hidden") {
    return;
  }
  awakeNextTry = 0;
  keepPracticeAwake(true);
  playAwakeClip();
}

document.addEventListener("pointerdown", onAwakeGesture, true);
document.addEventListener("touchstart", onAwakeGesture, true);
document.addEventListener("keydown", onAwakeGesture, true);
document.addEventListener("click", onAwakeClick);
document.addEventListener("visibilitychange", wakePracticeAgain);
document.addEventListener("resume", wakePracticeAgain);
window.addEventListener("pageshow", wakePracticeAgain);
window.addEventListener("focus", wakePracticeAgain);
awakeWatch = window.setInterval(function () {
  if (document.visibilityState !== "visible") {
    return;
  }
  if (awakeLock && !awakeLock.released) {
    return;
  }
  keepPracticeAwake(false);
  nudgeAwakeClip();
  playAwakeClip();
}, 12000);
keepPracticeAwake(true);
