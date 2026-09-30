function progressionItem(changes, name) {
  return '<span class="prog-changes">' + changes + '</span><span class="prog-name">' + name + '</span>';
}

registerExercise({
  id: "essentialProgressions",
  label: "Essential Progressions",
  bars: 4,
  inMenu: true,
  items: [
    progressionItem("| iim7 | V7 | Imaj7 | <span class='simile'>&#119054;</span> |", "Straight Cadence"),
    progressionItem("| ii&#248;7 | V7(&#9837;9) | im7 | <span class='simile'>&#119054;</span> |", "Sad Cadence"),
    progressionItem("| iim7 | V7 | Imaj7 | IVmaj7 |", "Overrun Cadence"),
    progressionItem("| Imaj7 | vim7 | iim7 | V7 |", "POT"),
    progressionItem("| Imaj7 | VI7 | iim7 | V7 |", "Jazz Turnaround"),
    progressionItem("| Imaj7 | VI7 | II7 | V7 |", "Rhythm Turnaround"),
    progressionItem("| Imaj7 | &#9837;III7 | II7 | &#9837;II7 |", "SPOT"),
    progressionItem("| Imaj7 | &#9837;IIImaj7 | &#9837;VImaj7 | &#9837;IImaj7 |", "Tadd Dameron Turnaround"),
    progressionItem("| iiim7 vim7 | iim7 V7 | Imaj7 | <span class='simile'>&#119054;</span> |", "Long Cadence"),
    progressionItem("| iiim7 | VI7 | iim7 | V7 |", "Turnaround from III"),
    progressionItem("| II7 | <span class='simile'>&#119054;</span> | V7 | <span class='simile'>&#119054;</span> |", "Slow Launcher"),
    progressionItem("| IVmaj7 ivm7 | iiim7 VI7 | iim7 V7 | Imaj7 <span class='simile'>&#119054;</span> |", "Pennies Ending"),
    progressionItem("| vm7 | I7 | IVmaj7 | <span class='simile'>&#119054;</span> |", "Modulation to IV"),
    progressionItem("| iiim7 VI7 | &#9837;iiim7 &#9837;VI7 | iim7 V7 | Imaj7 <span class='simile'>&#119054;</span> |", "Backslider"),
    progressionItem("| Imaj7 | viim7&#9837;5 III7 | vim7 II7 | vm7 I7 |", "Bird Blues Opening"),
    progressionItem("| III7 | VI7 | II7 | V7 |", "Rhythm Changes Bridge"),
    progressionItem("| ii&#248;7 | <span class='simile'>&#119054;</span> | V7 | <span class='simile'>&#119054;</span> |", "Starlight Cadence"),
    progressionItem("| Imaj7 | <span class='simile'>&#119054;</span> | &#9837;VI7 | <span class='simile'>&#119054;</span> |", "Nowhere Cadence"),
    progressionItem("| Imaj7 | <span class='simile'>&#119054;</span> | &#9837;IIImaj7 | <span class='simile'>&#119054;</span> |", "Rainy Modulation"),
    progressionItem("| im | im(maj7) | im7 | im6 |", "Minor Line Cliché"),
    progressionItem("| im | &#9837;VII | &#9837;VI | V7 |", "Andalusian Cadence"),
    progressionItem("| Imaj7 | VI7 | II7 | <span class='simile'>&#119054;</span> |", "Donna Lee Opening"),
    progressionItem("| Imaj7 &#9837;III7 | &#9837;VImaj7 VII7 | IIImaj7 V7 | Imaj7 <span class='simile'>&#119054;</span> |", "Coltrane Turnaround"),
    progressionItem("| iim11 | <span class='simile'>&#119054;</span> | <span class='simile'>&#119054;</span> | <span class='simile'>&#119054;</span> |", "Modal Vamp")
  ]
});
