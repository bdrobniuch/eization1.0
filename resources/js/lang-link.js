document.addEventListener("click", function (event) {
  var link = event.target.closest("[data-set-lang]");
  if (!link) {
    return;
  }
  try {
    localStorage.setItem("eization-lang", link.getAttribute("data-set-lang"));
  } catch (err) {}
});
