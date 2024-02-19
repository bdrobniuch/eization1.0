function SelectExercise() {

    chromaticScale= window[document.getElementById("exerciseSelect").value];
    var chromaticScaleFontSize= window[document.getElementById("exerciseSelect").value+"FontSize"];
    document.getElementById("note").style.fontSize=chromaticScaleFontSize+"vmin";
    notePool = [];
    document.getElementById("textdiv").style.display = "none";
  }