function textureItem(mark, name) {
  return '<span class="prog-changes">' + mark + '</span><span class="prog-name">' + name + "</span>";
}

registerExercise({
  id: "texture",
  label: "Rhythmic Devices",
  bars: 8,
  inMenu: true,
  items: [
    textureItem("Short", "about one bar"),
    textureItem("Medium", "two to four bars"),
    textureItem("Long", "more than four bars"),
    textureItem("Sparse", "leave space"),
    textureItem("Dense", "few rests"),
    textureItem("Half notes", "only half notes"),
    textureItem("Quarters", "only quarters"),
    textureItem("8ths", "only eighths"),
    textureItem("16ths", "only sixteenths"),
    textureItem("Triplets", "only triplets"),
    textureItem("Syncopate", "notes sit off the beat"),
    textureItem("On beats", "on 1, 2, 3, 4")
  ]
});
