function ToggleEdit() {
    var x = document.getElementById("textdiv");
    var allEdit = document.getElementById("allEdit");
    if (x.style.display === "block") {
      newExercise(allEdit.value.split("\n"));
    } else {
      x.style.display = "block";
      allEdit.value = chromaticScale.join("\n");
    }
  }