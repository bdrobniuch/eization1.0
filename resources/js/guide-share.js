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

  function exerciseId(href) {
    try {
      return new URL(href).searchParams.get("exercise") || "";
    } catch (err) {
      return "";
    }
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
    var button = share || embed;
    var link;
    var url;
    var id;
    var snippet;
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
    snippet = '<iframe title="' + titleFor(button) + '" src="' + embedUrl(url).replace(/"/g, "&quot;") + '" width="100%" height="720" style="max-width:100%;border:0"></iframe>';
    copyText(snippet).then(function () {
      flash(button, button.getAttribute("data-code") || "Code copied");
    }, function () {
      flash(button, button.getAttribute("data-fail") || "Could not copy");
    });
  });
}());
