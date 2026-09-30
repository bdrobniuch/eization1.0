function motiveItem(mark, name) {
  return '<span class="prog-changes">' + mark + '</span><span class="prog-name">' + name + "</span>";
}

registerExercise({
  id: "motive",
  label: "Motivic Development",
  bars: 8,
  inMenu: true,
  items: [
    motiveItem("Repeat", "say it again"),
    motiveItem("Sequence", "same shape, new pitch"),
    motiveItem("Rhythm", "same notes, new rhythm"),
    motiveItem("Same rhythm", "new notes, same rhythm"),
    motiveItem("Fragment", "keep a piece of it"),
    motiveItem("Stretch", "same idea, longer notes"),
    motiveItem("Shrink", "same idea, shorter notes")
  ]
});
