function drumChartItem(mark, feet, name) {
  var hands = "hhe hhe [hh sd]e> hhe hhe hhe [hh sd]e> hhe";
  return mark + " " + hands + " | % feet " + feet + " | % \u00B7 " + name;
}

registerExercise({
  id: "drumChartMarks",
  label: "Chart marks",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumChartItem("^Intro", "bdq rq bdq rq", "Intro"),
    drumChartItem("^Head", "bdq rq bdq rq", "Head"),
    drumChartItem("^Verse", "bdq rq rq rq", "Verse"),
    drumChartItem("^Chorus", "bdq bdq bdq bdq", "Chorus"),
    drumChartItem("^Bridge", "rq rq re bde rq", "Bridge"),
    drumChartItem("^Solo", "bdq rq re bde rq", "Solo"),
    drumChartItem("^Tag", "rq bdq rq bdq", "Tag"),
    drumChartItem("^Out", "bdq rq rq rq", "Out"),
    drumChartItem("^Vamp", "bdq bdq bdq bdq", "Vamp"),
    drumChartItem("^Break", "bdq rq rq rq", "Break"),
    drumChartItem("^Shout", "bdq bdq bdq bdq", "Shout"),
    drumChartItem("^t=96", "bdq rq bdq rq", "Tempo")
  ]
});
