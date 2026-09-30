function limbGrid(cells) {
  var hit = "&#9746;";
  var rest = "&#9744;";
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
    }
  }
  return face + bar;
}

function limbTwice(bar) {
  return limbGrid(bar + "|" + bar);
}

registerExercise({
  id: "limbs",
  label: "Rhythms",
  bars: 2,
  inMenu: true,
  items: [
    limbTwice("..x...x."),
    limbTwice("x...x..."),
    limbTwice(".x.x.x.x"),
    limbTwice("...x...x"),
    limbTwice("x..x...."),
    limbGrid("x..x..x.|..x.x..."),
    limbGrid("..x.x...|x..x..x."),
    limbGrid("x..x...x|..x.x..."),
    limbGrid("..x.x...|x..x...x")
  ]
});
