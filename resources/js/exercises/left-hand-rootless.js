(function () {
  var DELTA = "\u2206";
  var OSLASH = "\u00F8";

  /* Circle of fifths (not chromatic). */
  var ROOTS = [
    { name: "C", pc: 0, flat: false },
    { name: "G", pc: 7, flat: false },
    { name: "D", pc: 2, flat: false },
    { name: "A", pc: 9, flat: false },
    { name: "E", pc: 4, flat: false },
    { name: "B", pc: 11, flat: false },
    { name: "F#", pc: 6, flat: false },
    { name: "Db", pc: 1, flat: true },
    { name: "Ab", pc: 8, flat: true },
    { name: "Eb", pc: 3, flat: true },
    { name: "Bb", pc: 10, flat: true },
    { name: "F", pc: 5, flat: true }
  ];

  var PC_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  var PC_FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

  /* Semitone offsets from the chord root (Form A from 3rd; Form B from 7th up). */
  var QUALITIES = [
    {
      id: "maj7",
      formA: [4, 7, 11, 14],
      formB: [11, 14, 16, 19],
      symbol: function (root) {
        return root.name + DELTA + "7";
      },
      parent: function (root) {
        return parentKeyName(root.pc, false);
      }
    },
    {
      id: "m7",
      formA: [3, 7, 10, 14],
      formB: [10, 14, 15, 19],
      symbol: function (root) {
        return root.name + "m7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 2, false);
      }
    },
    {
      id: "dom7",
      formA: [4, 7, 10, 14],
      formB: [10, 14, 16, 19],
      symbol: function (root) {
        return root.name + "7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 7, false);
      }
    },
    {
      id: "alt7",
      formA: [4, 8, 10, 15],
      formB: [10, 15, 16, 20],
      symbol: function (root) {
        return root.name + "alt7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 7, true);
      },
      /* #9 vs 3rd share a staff degree if #9 is spelled flat (Bb vs B); use A#. */
      sharpNine: true
    },
    {
      id: "hdim",
      formA: [3, 6, 10, 14],
      formB: [10, 14, 15, 18],
      symbol: function (root) {
        return root.name + OSLASH + "7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 2, true);
      }
    }
  ];

  function normPc(n) {
    return ((n % 12) + 12) % 12;
  }

  function pcName(pc, flat) {
    return flat ? PC_FLAT[pc] : PC_SHARP[pc];
  }

  function rootByPc(pc) {
    var n = normPc(pc);
    var i;
    for (i = 0; i < ROOTS.length; i++) {
      if (ROOTS[i].pc === n) {
        return ROOTS[i];
      }
    }
    return ROOTS[0];
  }

  function parentKeyName(pc, minor) {
    var name = rootByPc(pc).name;
    return minor ? name + "m" : name;
  }

  /* @key= for the staff; Dbm → C#m (same signature, supported alias). */
  function normalizeKeyName(parentKey) {
    return parentKey === "Dbm" ? "C#m" : parentKey;
  }

  function keyDirective(parentKey) {
    return "@key=" + normalizeKeyName(parentKey);
  }

  /* Spell accidentals like the written key signature (relative major for minor). */
  function spellingUsesFlat(parentKey) {
    var k = normalizeKeyName(parentKey);
    var major = k;
    if (k.charAt(k.length - 1) === "m") {
      var aliases = {
        Am: "C",
        Em: "G",
        Bm: "D",
        "F#m": "A",
        "C#m": "E",
        "G#m": "B",
        "D#m": "F#",
        "A#m": "C#",
        Dm: "F",
        Gm: "Bb",
        Cm: "Eb",
        Fm: "Ab",
        Bbm: "Db",
        Ebm: "Gb",
        Abm: "Cb"
      };
      major = aliases[k] || k.slice(0, -1);
    }
    var i;
    for (i = 0; i < ROOTS.length; i++) {
      if (ROOTS[i].name === major) {
        return ROOTS[i].flat;
      }
    }
    return /b|Cb|Gb|Db|Ab|Eb|Bb|F$/.test(major);
  }

  /* MIDI: C4 = 60. Center the closed shape near C3–C4 (allow B2–D4). */
  function placeRegister(midis) {
    var notes = midis.slice().sort(function (a, b) {
      return a - b;
    });
    var i;
    var center = 54;
    var mid = (notes[0] + notes[notes.length - 1]) / 2;
    var octaves = Math.round((center - mid) / 12);
    for (i = 0; i < notes.length; i++) {
      notes[i] += octaves * 12;
    }
    if (notes[0] < 47) {
      for (i = 0; i < notes.length; i++) {
        notes[i] += 12;
      }
    }
    /* Prefer top ≤ E4 (64); allow that stretch for closed 3–9 shapes. */
    if (notes[notes.length - 1] > 64 && notes[0] - 12 >= 47) {
      for (i = 0; i < notes.length; i++) {
        notes[i] -= 12;
      }
    }
    return notes;
  }

  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var LETTERS = "CDEFGAB";

  function midiToToken(midi, flat) {
    var pc = normPc(midi);
    var oct = Math.floor(midi / 12) - 1;
    return pcName(pc, flat) + oct + "h";
  }

  /* Spell pitch-class on a chosen letter (for alt #9: letter below the 3rd). */
  function spellLetterAtPc(letter, targetPc) {
    var natural = LETTER_PC[letter];
    var delta = normPc(targetPc - natural);
    if (delta === 0) {
      return letter;
    }
    if (delta === 1) {
      return letter + "#";
    }
    if (delta === 2) {
      return letter + "##";
    }
    if (delta === 11) {
      return letter + "b";
    }
    if (delta === 10) {
      return letter + "bb";
    }
    return pcName(targetPc, false);
  }

  function accidentalSemis(name) {
    if (name.indexOf("##") >= 0 || name.indexOf("x") >= 0) {
      return 2;
    }
    if (name.indexOf("bb") >= 0) {
      return -2;
    }
    if (name.indexOf("#") >= 0) {
      return 1;
    }
    if (name.indexOf("b") >= 0) {
      return -1;
    }
    return 0;
  }

  /* Octave so letter+accidental sounds at midi (B#3 = C4, not B#4). */
  function octaveForSpell(midi, letter, name) {
    return (
      Math.floor((midi - LETTER_PC[letter] - accidentalSemis(name)) / 12) - 1
    );
  }

  /*
   * Alt #9: letter below the written 3rd (A# vs B, F vs Gb, F## vs G#) so the
   * staff shows a second, not a unison.
   */
  function sharpNineToken(midi, thirdLetter) {
    var nineLetter = LETTERS[(LETTERS.indexOf(thirdLetter) + 6) % 7];
    var name = spellLetterAtPc(nineLetter, normPc(midi));
    return name + octaveForSpell(midi, nineLetter, name) + "h";
  }

  function voicingLine(root, intervals, symbol, parentKey, sharpNine) {
    var rootMidi = 48 + root.pc;
    var raw = [];
    var i;
    var useFlat = spellingUsesFlat(parentKey);
    var thirdPc = normPc(root.pc + 4);
    var sharpNinePc = sharpNine ? normPc(root.pc + 3) : -1;
    for (i = 0; i < intervals.length; i++) {
      raw.push(rootMidi + intervals[i]);
    }
    var placed = placeRegister(raw);
    var thirdLetter = pcName(thirdPc, useFlat).charAt(0);
    for (i = 0; i < placed.length; i++) {
      if (normPc(placed[i]) === thirdPc) {
        thirdLetter = pcName(thirdPc, useFlat).charAt(0);
        break;
      }
    }
    var parts = [];
    for (i = 0; i < placed.length; i++) {
      if (sharpNinePc >= 0 && normPc(placed[i]) === sharpNinePc) {
        parts.push(sharpNineToken(placed[i], thirdLetter));
      } else {
        parts.push(midiToToken(placed[i], useFlat));
      }
    }
    return (
      "@bass " + keyDirective(parentKey) + " [" + parts.join(" ") + "]_" + symbol
    );
  }

  var items = [];
  var q;
  var r;
  for (q = 0; q < QUALITIES.length; q++) {
    var qual = QUALITIES[q];
    for (r = 0; r < ROOTS.length; r++) {
      items.push(
        voicingLine(
          ROOTS[r],
          qual.formA,
          qual.symbol(ROOTS[r]),
          qual.parent(ROOTS[r]),
          qual.sharpNine
        )
      );
    }
    for (r = 0; r < ROOTS.length; r++) {
      items.push(
        voicingLine(
          ROOTS[r],
          qual.formB,
          qual.symbol(ROOTS[r]),
          qual.parent(ROOTS[r]),
          qual.sharpNine
        )
      );
    }
  }

  registerExercise({
    id: "leftHandRootless",
    label: "Left Hand Rootless Voicings",
    inMenu: true,
    items: items
  });
})();
