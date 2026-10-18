function dynamicItem(notation, name) {
  return notation + " \u00B7 " + name;
}

var dynamicCell = "/ / / / | / / / / | / / / / | / / / /";

registerExercise({
  id: "dynamics",
  label: "Dynamics",
  bars: 4,
  inMenu: false,
  items: [
    dynamicItem("pp " + dynamicCell, "pianissimo"),
    dynamicItem("p " + dynamicCell, "piano"),
    dynamicItem("mp " + dynamicCell, "mezzo-piano"),
    dynamicItem("mf " + dynamicCell, "mezzo-forte"),
    dynamicItem("f " + dynamicCell, "forte"),
    dynamicItem("ff " + dynamicCell, "fortissimo"),
    dynamicItem("sfz " + dynamicCell, "sforzando"),
    dynamicItem("pp / cresc / / / | / / / / | / / / / | f / / / /", "crescendo"),
    dynamicItem("f / dim / / / | / / / / | / / / / | pp / / / /", "diminuendo")
  ]
});
