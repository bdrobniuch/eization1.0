(function () {
  function rowOf(button) {
    return button.closest(".opens") || button.parentNode;
  }

  function openLink(button) {
    var row = rowOf(button);
    return row ? row.querySelector("a.open") : null;
  }

  function practiceUrl(link) {
    return new URL(link.getAttribute("href"), window.location.href).href;
  }

  function embedUrl(href) {
    var url = new URL(href);
    url.searchParams.set("embed", "1");
    return url.href;
  }

  function embedSnippet(href, title) {
    var url;
    var name;
    if (typeof practiceEmbedCode === "function") {
      return practiceEmbedCode(href, title);
    }
    url = embedUrl(href);
    name = String(title || "eization").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").replace(/"/g, "");
    return '<iframe title="' + name + '" src="' + url.replace(/"/g, "&quot;") + '" width="100%" height="720" style="max-width:100%;border:0"></iframe>';
  }

  function exerciseId(href) {
    try {
      return new URL(href).searchParams.get("exercise") || "";
    } catch (err) {
      return "";
    }
  }

  function ctaParams(href) {
    var url;
    var id;
    var params = {};
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return params;
    }
    id = url.searchParams.get("exercise") || "";
    if (id) {
      params.exercise_id = id;
    }
    if (url.searchParams.get("today") === "1") {
      params.today = "1";
    }
    if (url.hash && url.hash.indexOf("s") === 1) {
      params.share = "1";
    }
    return params;
  }

  function isPracticeOpen(link) {
    var href;
    var url;
    if (!link || link.tagName !== "A") {
      return false;
    }
    href = link.getAttribute("href") || "";
    if (!href || href.charAt(0) === "#" || /practice\.html(?:$|[?#])/i.test(href)) {
      return false;
    }
    try {
      url = new URL(href, window.location.href);
    } catch (err) {
      return false;
    }
    if (url.searchParams.get("exercise") || url.searchParams.get("today") === "1") {
      return true;
    }
    if (url.hash && /^#(s2?=|s=)/.test(url.hash)) {
      return true;
    }
    return false;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject();
  }

  function flash(button, message) {
    var original = button.getAttribute("data-label") || button.textContent;
    button.setAttribute("data-label", original);
    button.textContent = message;
    window.setTimeout(function () {
      button.textContent = button.getAttribute("data-label") || original;
    }, 1600);
  }

  function titleFor(button) {
    var article = button.closest("article");
    var heading = article ? article.querySelector("h1, h2") : document.querySelector("h1");
    var text = heading ? heading.textContent : "eization";
    return String(text || "eization").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "").replace(/"/g, "");
  }

  document.addEventListener("click", function (event) {
    var share = event.target.closest("[data-share]");
    var embed = event.target.closest("[data-embed]");
    var openCta = event.target.closest("a.open");
    var button = share || embed;
    var link;
    var url;
    var id;
    var snippet;
    var params;
    if (openCta && isPracticeOpen(openCta) && !share && !embed) {
      params = ctaParams(openCta.getAttribute("href") || "");
      if (openCta.closest(".more-exercise")) {
        params.source = "more";
      } else {
        params.source = "guide";
      }
      if (typeof gtag === "function") {
        gtag("event", "guide_cta", params);
      }
    }
    if (!button) {
      return;
    }
    link = openLink(button);
    if (!link) {
      return;
    }
    event.preventDefault();
    url = practiceUrl(link);
    id = exerciseId(url);
    if (typeof gtag === "function") {
      gtag("event", share ? "guide_share" : "guide_embed", id ? { exercise_id: id } : {});
    }
    if (share) {
      if (navigator.share) {
        navigator.share({
          title: "eization",
          text: button.getAttribute("data-blurb") || "",
          url: url
        }).catch(function () {});
      }
      copyText(url).then(function () {
        flash(button, button.getAttribute("data-copied") || "Link copied");
      }, function () {
        flash(button, button.getAttribute("data-fail") || "Could not copy");
      });
      return;
    }
    snippet = embedSnippet(url, titleFor(button));
    copyText(snippet).then(function () {
      flash(button, button.getAttribute("data-code") || "Code copied");
    }, function () {
      flash(button, button.getAttribute("data-fail") || "Could not copy");
    });
  });
}());
