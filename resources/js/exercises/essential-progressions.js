var simileMark = "<span class='simile'>&#119054;</span>";

function progressionItem(changes, name) {
  return '<span class="prog-changes">' + changes.split("%").join(simileMark) + '</span><span class="prog-name">' + name + "</span>";
}

function progressionBars(a, b, c, d) {
  return "| " + a + " | " + b + " | " + c + " | " + d + " |";
}

registerExercise({
  id: "essentialProgressions",
  label: "Essential Progressions",
  bars: 4,
  inMenu: true,
  items: [
    progressionItem(progressionBars("IV&#916;", "IV&#916;", "I&#916;", "I&#916;"), "Amen"),
    progressionItem(progressionBars("II- (V7)", "VII&#248; III7", "VIm&#916;", "%"), "Autumnal"),
    progressionItem(progressionBars("II- VI7", "II- V7", "I&#916;", "%"), "Body & Soul"),
    progressionItem(progressionBars("&#9837;VI-", "&#9837;II7", "I&#916;", "%"), "Dizzy"),
    progressionItem(progressionBars("VI- II7", "II- V7", "I&#916;", "%"), "Dogleg"),
    progressionItem(progressionBars("II- V7", "I&#916; VI7", "II- V7", "I&#916;"), "7-chord Dropback"),
    progressionItem(progressionBars("VI-", "II-", "V7", "I&#916;"), "Extended"),
    progressionItem(progressionBars("&#9839;IV-", "VII7", "I&#916;", "%"), "Happenstance"),
    progressionItem(progressionBars("III- VI7", "II- V7", "I&#916;", "%"), "Long"),
    progressionItem(progressionBars("II-", "V7", "I&#916;", "IV&#916;"), "Overrun"),
    progressionItem(progressionBars("&#9839;I- &#9839;IV7", "II- V7", "I&#916;", "%"), "Moment's"),
    progressionItem(progressionBars("&#9837;VI&#916;", "V7", "I&#916;", "%"), "Night & Day"),
    progressionItem(progressionBars("I&#916;", "III7", "VIm&#916;", "%"), "Nobody's"),
    progressionItem(progressionBars("&#9837;VI7", "V7", "I&#916;", "%"), "Nowhere"),
    progressionItem(progressionBars("II- V7", "III- VI7", "II- V7", "I&#916;"), "Pullback"),
    progressionItem(progressionBars("I&#916;", "III7", "IV&#916;", "%"), "Rainbow"),
    progressionItem(progressionBars("III- &#9837;IIIo", "II- V7", "I&#916;", "%"), "Rainy"),
    progressionItem(progressionBars("VI- II7", "&#9837;VI- &#9837;II7", "I&#916;", "%"), "Satin"),
    progressionItem(progressionBars("VII&#248; III7", "II- V7", "I&#916;", "%"), "Spring"),
    progressionItem(progressionBars("&#9837;III- &#9837;VI7", "II- V7", "I&#916;", "%"), "Stablemates"),
    progressionItem(progressionBars("&#9839;IV&#248; VII7", "III- VI7", "II- V7", "I&#916;"), "Starlight"),
    progressionItem(progressionBars("&#9839;IV&#248; IV-", "III- &#9837;IIIo", "II- V7", "I&#916;"), "Starlight N&D"),
    progressionItem(progressionBars("II-", "V7", "I&#916;", "%"), "Regular"),
    progressionItem(progressionBars("II&#248;", "V7+9", "I&#916;", "%"), "Regular (minor)"),
    progressionItem(progressionBars("II-", "V7", "I7", "%"), "Tension Ending"),
    progressionItem(progressionBars("II-", "&#9837;II7", "I&#916;", "%"), "Tritone Substitution"),
    progressionItem(progressionBars("II- V7", "II- V7", "I&#916;", "I&#916;"), "Two-Goes"),
    progressionItem(progressionBars("IV-", "&#9837;VII7", "I&#916;", "%"), "Yardbird"),

    progressionItem(progressionBars("I&#916;", "&#9837;III7", "II-", "V7"), "Foggy"),
    progressionItem(progressionBars("II-", "II-", "&#9839;IIo (III-)", "&#9839;IIo (III-)"), "II 'n' Back"),
    progressionItem(progressionBars("I&#916;", "&#9837;III7", "&#9837;VI&#916;", "&#9837;II7"), "Ladybird"),
    progressionItem(progressionBars("I&#916;", "VI7", "&#9837;VI7", "V7"), "Nowhere Turnaround"),
    progressionItem(progressionBars("I&#916;", "II-", "III- &#9837;IIIo", "II- V7"), "Pennies"),
    progressionItem(progressionBars("I&#916;", "VI7", "II-", "V7"), "POT"),
    progressionItem(progressionBars("Im&#916;", "VI&#248;", "II&#248;", "V7+9"), "POT (minor)"),
    progressionItem(progressionBars("I&#916;", "&#9837;IIo", "II-", "&#9837;IIIo"), "Rhythm"),
    progressionItem(progressionBars("III-", "VI7", "II-", "V7"), "SPOT"),
    progressionItem(progressionBars("I&#916; I7", "IV&#916; &#9839;IVo", "I&#916;", "I&#916;"), "To IV 'n' Back"),
    progressionItem(progressionBars("I&#916; I7", "IV&#916; VII7", "I&#916;", "I&#916;"), "To IV 'n' Hack"),
    progressionItem(progressionBars("I&#916; I7", "IV&#916; IVm&#916;", "I&#916;", "I&#916;"), "To IV 'n' Mack"),
    progressionItem(progressionBars("I&#916; I7", "IV&#916; &#9837;VII7", "I&#916;", "I&#916;"), "To IV 'n' Yak"),
    progressionItem(progressionBars("I&#916;", "&#9837;IIo", "II-", "V7"), "Whoopee"),

    progressionItem(progressionBars("II-", "V7", "I&#916;", "IV&#916;"), "Autumn Leaves"),
    progressionItem(progressionBars("VII&#248;", "III7", "VIm&#916; (VI7)", "%"), "Autumn Leaves (2)"),
    progressionItem(progressionBars("IV&#916;", "&#9839;IV-", "VII7", "III- VI7"), "Four-Star Ending"),
    progressionItem(progressionBars("(V-)", "I7", "IV&#916;", "%"), "Honeysuckle Bridge"),
    progressionItem(progressionBars("(VI-)", "II7", "(II-)", "V7"), "Honeysuckle Bridge (2)"),
    progressionItem(progressionBars("I&#916;", "III- VI7", "II-", "&#9839;IV- VII7"), "ITCHY Opening"),
    progressionItem(progressionBars("I&#916;", "Any dom 7", "I&#916;", "VI7"), "On-Off-On"),
    progressionItem(progressionBars("IV&#916;", "&#9839;IVo", "I&#916;", "(III-) VI7"), "Pennies Ending"),
    progressionItem(progressionBars("(VII-)", "III7", "(III-)", "VI7"), "Rhythm Bridge"),
    progressionItem(progressionBars("(VI-)", "II7", "(II-)", "V7"), "Rhythm Bridge (2)"),
    progressionItem(progressionBars("&#9839;IV&#248; IV-", "&#9837;VII7 I&#916;", "(III-) VI7", "%"), "Sharp Fourpenny"),
    progressionItem(progressionBars("VI- IV-", "&#9837;VII7 I&#916;", "(III-) VI7", "%"), "Sixpenny Ending"),
    progressionItem(progressionBars("II- IV-", "&#9837;VII7 I&#916;", "(III-) VI7", "%"), "Twopenny Ending"),
    progressionItem(progressionBars("I&#916; I7", "IV&#916; &#9837;VII7", "III- VI7", "II- V7"), "To IV 'n' Bird"),

    progressionItem(progressionBars("I&#916;", "VII7", "&#9837;VII7", "VI7 (II-)"), "Chromatic Dropback"),
    progressionItem(progressionBars("II- V7", "V- I7", "I-", "I-"), "Dogleg etc"),
    progressionItem(progressionBars("I&#916;", "I&#916;", "VI7 (II-)", "VI7 (II-)"), "Dropback"),
    progressionItem(progressionBars("III-", "III-", "&#9837;IIIo (II-)", "&#9837;IIIo (II-)"), "Raindrop"),
    progressionItem(progressionBars("&#9839;IV-", "VII7", "III-", "VI7 (II-)"), "Starlight Dropback"),
    progressionItem(progressionBars("I&#916;", "IV7", "&#9837;VII7", "VI7 (II-)"), "TINGLe Dropback"),
    progressionItem(progressionBars("I&#916;", "IV7", "III-", "VI7 (II-)"), "TTFA Dropback"),

    progressionItem(progressionBars("II&#248;", "V7(&#9837;9)", "I-", "%"), "Sad Cadence"),
    progressionItem(progressionBars("II7", "%", "V7", "%"), "Slow Launcher"),
    progressionItem(progressionBars("III- VI7", "&#9837;III- &#9837;VI7", "II- V7", "I&#916; %"), "Backslider"),
    progressionItem(progressionBars("I&#916;", "VII&#248; III7", "VI- II7", "V- I7"), "Bird Blues Opening"),
    progressionItem(progressionBars("III7", "VI7", "II7", "V7"), "Rhythm Changes Bridge"),
    progressionItem(progressionBars("Im", "Im&#916;", "I-", "Im6"), "Minor Line Cliché"),
    progressionItem(progressionBars("Im", "&#9837;VII", "&#9837;VI", "V7"), "Andalusian Cadence"),
    progressionItem(progressionBars("I&#916;", "VI7", "II7", "%"), "Donna Lee Opening"),
    progressionItem(progressionBars("I&#916; &#9837;III7", "&#9837;VI&#916; VII7", "III&#916; V7", "I&#916; %"), "Coltrane Turnaround"),
    progressionItem(progressionBars("II-11", "%", "%", "%"), "Modal Vamp"),
    progressionItem(progressionBars("I&#916;", "VI7", "II7", "V7"), "Rhythm Turnaround"),
    progressionItem(progressionBars("I&#916;", "&#9837;III&#916;", "&#9837;VI&#916;", "&#9837;II&#916;"), "Tadd Dameron")
  ]
});
