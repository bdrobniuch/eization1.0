function limbGrid(cells) {
  var hit = "&#9746;";
  var rest = "&#9744;";
  var right = "&#127361;";
  var left = "&#127291;";
  var bar = "&#119040;";
  var face = bar;
  for (var i = 0; i < cells.length; i++) {
    var c = cells.charAt(i);
    if (c === "|") {
      face += bar;
    } else if (c === "x") {
      face += hit;
    } else if (c === ".") {
      face += rest;
    } else if (c === "R") {
      face += right;
    } else if (c === "L") {
      face += left;
    }
  }
  return face + bar;
}

function limbItem(cells, name) {
  return '<span class="prog-changes">' + limbGrid(cells) + '</span><span class="prog-name">' + name + "</span>";
}

function limbTwice(bar, name) {
  return limbItem(bar + "|" + bar, name);
}

registerExercise({
  id: "limbs",
  label: "Rhythms",
  bars: 2,
  inMenu: true,
  items: [
    limbTwice("..x...x.", "Backbeat"),
    limbTwice("x...x...", "Downbeats"),
    limbTwice(".x.x.x.x", "Upbeats"),
    limbTwice("...x...x", "Offbeat 2 &amp; 4"),
    limbTwice("x..x....", "Charleston"),
    limbItem("x..x..x.|..x.x...", "Son clave"),
    limbItem("..x.x...|x..x..x.", "Son clave (2-3)"),
    limbItem("x..x...x|..x.x...", "Rumba clave"),
    limbItem("..x.x...|x..x...x", "Rumba clave (2-3)"),
    limbTwice("x.x.x.x.", "Four on the floor"),
    limbTwice("x..x..x.", "Tresillo"),
    limbTwice("x..xx.x.", "Habanera"),
    limbTwice("xx.xx.x.", "Cinquillo"),
    limbTwice("....x...", "One drop"),
    limbItem("x..x..x.|..x..x..", "Bossa nova"),
    limbItem("..x..x..|x..x..x.", "Bossa nova (2-3)"),
    limbItem("x.xxx.x.|x.x.....", "Shave and a haircut"),
    limbTwice("RLRLRLRL", "Singles"),
    limbTwice("RRLLRRLL", "Doubles"),
    limbTwice("RLRRLRLL", "Paradiddle"),
    limbTwice("LRLLRLRR", "Paradiddle (left)"),
    limbTwice("RLLRLRRL", "Inverted paradiddle")
  ]
});
