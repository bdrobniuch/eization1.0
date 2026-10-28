function drumRideItem(hands, feet, name) {
  return hands + " feet " + feet + " \u00B7 " + name;
}

registerExercise({
  id: "drumJazzRide",
  label: "Jazz ride",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumRideItem("rdq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e rde rdq [rd sd]e rde", "rq hfq rq hfq | rq hfq rq hfq", "Spang-a-lang"),
    drumRideItem("rdq [rd sd]e> rde rdq [rd sd]e> rde | rdq [rd sd]e> rde rdq [rd sd]e> rde", "rq hfq rq hfq | rq hfq rq hfq", "Accent the snare"),
    drumRideItem("crq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e rde rdq [rd sd]e rde", "rq hfq rq hfq | rq hfq rq hfq", "Crash on one"),
    drumRideItem("rdq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e rde rdq [rd sd]e rde", "bdq hfq bdq hfq | bdq hfq bdq hfq", "Kick and hat"),
    drumRideItem("rdq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e rde rdq [rd sd]e rde", "rq rq rq hfq | rq rq rq hfq", "Hat on 4"),
    drumRideItem("rdq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e rde rdq [rd sd]e rde", "pp bdq hfq pp bdq hfq | pp bdq hfq pp bdq hfq", "Feather"),
    drumRideItem("rbq [rb sd]e rde rbq [rb sd]e rde | rbq [rb sd]e rde rbq [rb sd]e rde", "rq hfq rq hfq | rq hfq rq hfq", "Bell"),
    drumRideItem("rbq [rb sd]e> rde rbq [rb sd]e> rde | rbq [rb sd]e> rde rbq [rb sd]e> rde", "rq hfq rq hfq | rq hfq rq hfq", "Bell accent"),
    drumRideItem("rdq [rd sd]e> rde rdq [rd sd]e> rde | rdq [rd sd]e rde rdq [rd sd]e rde", "rq hfq rq hfq | rq hfq rq hfq", "Then plain"),
    drumRideItem("crq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e> rde rdq [rd sd]e> rde", "bdq hfq bdq hfq | bdq hfq bdq hfq", "Crash, then accent"),
    drumRideItem("rdq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e rde rdq [rd sd]e rde", "rq hfq rq rq | rq hfq rq rq", "Hat on 2"),
    drumRideItem("rdq [rd sd]e rde rdq [rd sd]e rde | rdq [rd sd]e> rde rdq [rd sd]e> rde", "rq hfq rq hfq | rq hfq rq hfq", "Then the accent")
  ]
});
