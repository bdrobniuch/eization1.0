function dynamicItem(notation, name) {
  return notation + " \u00B7 " + name;
}

registerExercise({
  id: "dynamics",
  label: "Dynamics",
  bars: 1,
  inMenu: false,
  items: [
    dynamicItem("pp /q /q /q /q", "pianissimo"),
    dynamicItem("p /q /q /q /q", "piano"),
    dynamicItem("mp /q /q /q /q", "mezzo-piano"),
    dynamicItem("mf /q /q /q /q", "mezzo-forte"),
    dynamicItem("f /q /q /q /q", "forte"),
    dynamicItem("ff /q /q /q /q", "fortissimo"),
    dynamicItem("sfz /q /q /q /q", "sforzando"),
    dynamicItem("pp /q cresc /q /q f /q", "crescendo"),
    dynamicItem("f /q dim /q /q pp /q", "diminuendo"),
    dynamicItem("/q' /q' /q' /q'", "staccato"),
    dynamicItem("/q> /q /q> /q", "accent on 1 and 3"),
    dynamicItem("/q /q> /q /q>", "accent on 2 and 4"),
    dynamicItem("/q- /q- /q- /q-", "tenuto")
  ]
});
