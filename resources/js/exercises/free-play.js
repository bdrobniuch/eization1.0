function freePlayItem(picture, caption) {
  return '<span class="prog-changes">' + picture + '</span><span class="prog-name">' + caption + "</span>";
}

registerExercise({
  id: "freePlay",
  label: "Free Play",
  bars: 8,
  inMenu: true,
  items: [
    freePlayItem("🫧", "one note, then space"),
    freePlayItem("🌬️", "breathe, then play"),
    freePlayItem("🤫", "softer than you think"),
    freePlayItem("☀️", "bright and open"),
    freePlayItem("🌧️", "steady, even notes"),
    freePlayItem("⛈️", "sudden, then quiet"),
    freePlayItem("🌫️", "long tones, no pulse"),
    freePlayItem("❄️", "sparse and clear"),
    freePlayItem("🌊", "swell, then fade"),
    freePlayItem("⚡", "one burst, then space"),
    freePlayItem("🌱 → 🌳", "let it grow"),
    freePlayItem("🔥", "heat, then release"),
    freePlayItem("😂", "play the joke"),
    freePlayItem("😢", "the long goodbye"),
    freePlayItem("🎲", "keep the accident"),
    freePlayItem("🎭", "tell a short story"),
    freePlayItem("🪞", "answer what you played"),
    freePlayItem("🚪", "leave, then return")
  ]
});
