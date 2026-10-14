function held(bar) {
  return bar + " | " + bar;
}

registerExercise({
  id: "ties",
  label: "Held rhythm",
  bars: 2,
  inMenu: false,
  items: [
    held("re /e~/q~/q rq"),
    held("re /e~/q rq /q"),
    held("/q.~/e re /e re /e"),
    held("{/e~/e} re /e re /q."),
    held("{/e~/e} rq re /e~/q"),
    held("rq {/e /e}~{/e /e}~/q"),
    held("{/e~/e /e~/e} re /e~/q"),
    held("rq {/e~/e}~/q~{/e /e}"),
    held("re /e /q~/q~/q"),
    held("re {/e /e~/e} rq /q"),
    held("re /e~{/e /e /e /e}~/q"),
    held("re /e~/q re {/e~/e /e}"),
    held("rq {/e~/e} re {/e /e~/e}"),
    held("{/e~/e}~{/e /e}~{/e /e}~/q"),
    held("re /e~/q~{/e /e}~/q"),
    held("/q.~/e~{/e /e~/e /e}"),
    held("re /e /q~{/e~/e}~/q"),
    held("{/e~/e} re /e~{/e /e /e /e}"),
    held("rq /e~/e /q~/q"),
    held("/q.~/e~{/e /e}~/q"),
    held("re {/e~/e} re /e~/q."),
    held("re {/e /e~/e} re /q."),
    held("C4q~ C4q D4q~ D4q"),
    held("E4q~ E4q F4q G4q"),
    held("C4h~ C4h"),
    held("G4q~ G4q A4q~ A4q"),
    "rq rq rq C4q~ | C4q rq rq rq"
  ]
});
