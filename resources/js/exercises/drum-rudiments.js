function drumRudimentItem(bar, name) {
  return bar + " | " + bar + " \u00B7 " + name;
}

registerExercise({
  id: "drumRudiments",
  label: "Rudiments",
  bars: 2,
  staff: true,
  notation: "drum",
  meter: { beats: 4, unit: 4 },
  inMenu: false,
  rev: 1,
  items: [
    drumRudimentItem("{sde_R sde_L sde_R sde_L} {sde_R sde_L sde_R sde_L}", "Singles"),
    drumRudimentItem("{sds_R sds_L sds_R sds_L} {sds_R sds_L sds_R sds_L} {sds_R sds_L sds_R sds_L} {sds_R sds_L sds_R sds_L}", "Singles, sixteenths"),
    drumRudimentItem("{sde_R sde_R sde_L sde_L} {sde_R sde_R sde_L sde_L}", "Doubles"),
    drumRudimentItem("{sds_R sds_R sds_L sds_L} {sds_R sds_R sds_L sds_L} {sds_R sds_R sds_L sds_L} {sds_R sds_R sds_L sds_L}", "Doubles, sixteenths"),
    drumRudimentItem("{sde_R sde_L sde_R sde_R} {sde_L sde_R sde_L sde_L}", "Paradiddle"),
    drumRudimentItem("{sds_R sds_L sds_R sds_R} {sds_L sds_R sds_L sds_L} {sds_R sds_L sds_R sds_R} {sds_L sds_R sds_L sds_L}", "Paradiddle, sixteenths"),
    drumRudimentItem("{sde_L sde_R sde_L sde_L} {sde_R sde_L sde_R sde_R}", "Paradiddle, left"),
    drumRudimentItem("{sde_R sde_L sde_L sde_R} {sde_L sde_R sde_R sde_L}", "Inverted paradiddle"),
    drumRudimentItem("{flam sde_R sde_L flam sde_R sde_L} {flam sde_R sde_L flam sde_R sde_L}", "Flam taps"),
    drumRudimentItem("{flam sde_L sde_R flam sde_L sde_R} {flam sde_L sde_R flam sde_L sde_R}", "Flam taps, left"),
    drumRudimentItem("{drag sde_R sde_L drag sde_R sde_L} {drag sde_R sde_L drag sde_R sde_L}", "Drags"),
    drumRudimentItem("{flam sde_R sde_L sde_R sde_R} {flam sde_L sde_R sde_L sde_L}", "Flam paradiddle"),
    drumRudimentItem("{drag sde_R sde_L sde_R sde_R} {drag sde_L sde_R sde_L sde_L}", "Drag paradiddle")
  ]
});
