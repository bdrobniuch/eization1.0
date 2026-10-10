function limbItem(notation, name) {
  return notation + " \u00B7 " + name;
}

function limbTwice(bar, name) {
  return limbItem(bar + " | " + bar, name);
}

registerExercise({
  id: "limbs",
  label: "Rhythms",
  bars: 2,
  inMenu: true,
  items: [
    limbTwice("rq /q rq /q", "Backbeat"),
    limbTwice("/q rq /q rq", "Downbeats"),
    limbTwice("re /e re /e re /e re /e", "Upbeats"),
    limbTwice("rq re /e rq re /e", "Offbeat 2 & 4"),
    limbTwice("/q. /e rh", "Charleston"),
    limbItem("/q. /q. /q | rq /q /q rq", "Son clave"),
    limbItem("rq /q /q rq | /q. /q. /q", "Son clave (2-3)"),
    limbItem("/q. /e rq re /e | rq /q /q rq", "Rumba clave"),
    limbItem("rq /q /q rq | /q. /e rq re /e", "Rumba clave (2-3)"),
    limbTwice("/q /q /q /q", "Four on the floor"),
    limbTwice("/q. /q. /q", "Tresillo"),
    limbTwice("/q. /e /e re /q", "Habanera"),
    limbTwice("/e /e re /e /e re /e re", "Cinquillo"),
    limbTwice("rh /q rq", "One drop"),
    limbItem("/q. /q. /q | rq /q. /e /q", "Bossa nova"),
    limbItem("rq /q. /e /q | /q. /q. /q", "Bossa nova (2-3)"),
    limbItem("/q {/e /e /e} re /q | /q /q rh", "Shave and a haircut"),
    limbTwice("{/e_R /e_L /e_R /e_L /e_R /e_L /e_R /e_L}", "Singles"),
    limbTwice("{/e_R /e_R /e_L /e_L /e_R /e_R /e_L /e_L}", "Doubles"),
    limbTwice("{/e_R /e_L /e_R /e_R /e_L /e_R /e_L /e_L}", "Paradiddle"),
    limbTwice("{/e_L /e_R /e_L /e_L /e_R /e_L /e_R /e_R}", "Paradiddle (left)"),
    limbTwice("{/e_R /e_L /e_L /e_R /e_L /e_R /e_R /e_L}", "Inverted paradiddle")
  ]
});
