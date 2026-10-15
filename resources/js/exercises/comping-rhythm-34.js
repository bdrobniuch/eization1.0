function comping34Item(notation, name) {
  return notation + " \u00B7 " + name;
}

registerExercise({
  id: "compingRhythm34",
  label: "Comping Rhythm Motifs 3/4",
  bars: 2,
  inMenu: false,
  items: [
    comping34Item("/q re /e rq | rh.", "57 short"),
    comping34Item("/q. /q. | rh.", "57 sustained"),
    comping34Item("{/e /e} re /e rq | rh.", "58 short"),
    comping34Item("{/e /e}~ {/e /e}~/q | rh.", "58 sustained"),
    comping34Item("rq {/e /e} rq | rh.", "59 short"),
    comping34Item("rq {/e /e}~/q | rh.", "59 sustained"),
    comping34Item("re /e rq /q | rh.", "60 short"),
    comping34Item("re /q. /q | rh.", "60 sustained"),
    comping34Item("{/e /e} rq rq | rh.", "61 short"),
    comping34Item("{/e /e}~/h | rh.", "61 sustained"),
    comping34Item("rh {/e /e} | rh.", "62 short"),
    comping34Item("rh {/e /e}~ | /h.", "62 sustained"),
    comping34Item("re /e re /e rq | rh.", "63 short"),
    comping34Item("re /e~ {/e /e}~/q | rh.", "63 sustained"),
    comping34Item("rq re /e re /e | rh.", "64 short"),
    comping34Item("rq re /e~ {/e /e}~ | /h.", "64 sustained"),
    comping34Item("re /e rq {/e /e} | rh.", "65 short"),
    comping34Item("re /q. {/e /e}~ | /h.", "65 sustained"),
    comping34Item("rq re /e rq | {/e /e} rh", "66 short"),
    comping34Item("rq re /q. | {/e /e}~/h", "66 sustained"),
    comping34Item("rh re /e | rq {/e /e} rq", "67 short"),
    comping34Item("rh re /e~ | /q {/e /e}~/q", "67 sustained"),
    comping34Item("re /e rh | rh.", "68 short"),
    comping34Item("re /e~/h | rh.", "68 sustained"),
    comping34Item("rq re /e rq | rh.", "69 short"),
    comping34Item("rq re /q. | rh.", "69 sustained"),
    comping34Item("rh re /e | rh.", "70 short"),
    comping34Item("rh re /e~ | /h.", "70 sustained")
  ]
});
