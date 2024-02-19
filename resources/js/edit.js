function ToggleEdit() {
    var x = document.getElementById("textdiv");
    var allEdit = document.getElementById("allEdit");
    if (x.style.display === "block") {
      x.style.display = "none";
      chromaticScale= allEdit.value.split("\n");
      notePool = [];
    } else {
      x.style.display = "block";
      allEdit.value = chromaticScale.join("\n");
    }
  }