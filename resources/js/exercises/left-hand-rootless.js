(function () {
  var DELTA = "\u2206";
  var OSLASH = "\u00F8";

  /* Circle of fifths (not chromatic). */
  var ROOTS = [
    { name: "C", pc: 0 },
    { name: "G", pc: 7 },
    { name: "D", pc: 2 },
    { name: "A", pc: 9 },
    { name: "E", pc: 4 },
    { name: "B", pc: 11 },
    { name: "F#", pc: 6 },
    { name: "Db", pc: 1 },
    { name: "Ab", pc: 8 },
    { name: "Eb", pc: 3 },
    { name: "Bb", pc: 10 },
    { name: "F", pc: 5 }
  ];

  /*
   * Semitone offsets from the chord root, each with its scale-degree letter
   * step from the root (9th +1, 3rd +2, 5th +4, b13 +5, 7th +6).
   * Form A from the 3rd; Form B from the 7th. The altered +8 is the b13.
   */
  var QUALITIES = [
    {
      id: "maj7",
      formA: [
        { semi: 4, step: 2 },
        { semi: 7, step: 4 },
        { semi: 11, step: 6 },
        { semi: 14, step: 1 }
      ],
      formB: [
        { semi: 11, step: 6 },
        { semi: 14, step: 1 },
        { semi: 16, step: 2 },
        { semi: 19, step: 4 }
      ],
      symbol: function (root) {
        return root.name + DELTA + "7";
      },
      parent: function (root) {
        return parentKeyName(root.pc, false);
      }
    },
    {
      id: "m7",
      formA: [
        { semi: 3, step: 2 },
        { semi: 7, step: 4 },
        { semi: 10, step: 6 },
        { semi: 14, step: 1 }
      ],
      formB: [
        { semi: 10, step: 6 },
        { semi: 14, step: 1 },
        { semi: 15, step: 2 },
        { semi: 19, step: 4 }
      ],
      symbol: function (root) {
        return root.name + "m7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 2, false);
      }
    },
    {
      id: "dom7",
      formA: [
        { semi: 4, step: 2 },
        { semi: 7, step: 4 },
        { semi: 10, step: 6 },
        { semi: 14, step: 1 }
      ],
      formB: [
        { semi: 10, step: 6 },
        { semi: 14, step: 1 },
        { semi: 16, step: 2 },
        { semi: 19, step: 4 }
      ],
      symbol: function (root) {
        return root.name + "7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 7, false);
      }
    },
    {
      id: "alt7",
      formA: [
        { semi: 4, step: 2 },
        { semi: 8, step: 5 },
        { semi: 10, step: 6 },
        { semi: 15, step: 1 }
      ],
      formB: [
        { semi: 10, step: 6 },
        { semi: 15, step: 1 },
        { semi: 16, step: 2 },
        { semi: 20, step: 5 }
      ],
      symbol: function (root) {
        return root.name + "alt7";
      },
      parent: function (root) {
        return parentKeyName(root.pc - 7, true);
      }
    },
    {
      id: "hdim",
      formA: [
        { semi: 3, step: 2 },
        { semi: 6, step: 4 },
        { semi: 10, step: 6 },
        { semi: 14, step: 1 }
      ],
      formB: [
        { semi: 10, step: 6 },
        { semi: 14, step: 1 },
        { semi: 15, step: 2 },
        { semi: 18, step: 4 }
      ],
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

  /* Letter of this scale degree, counting from the chord root's letter. */
  function degreeLetter(rootName, step) {
    return LETTERS[(LETTERS.indexOf(rootName.charAt(0)) + step) % 7];
  }

  /* Spell pitch-class on a chosen letter (A# vs B, Bb vs Cb, E# vs F). */
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
    return letter;
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

  function degreeToken(midi, letter) {
    var name = spellLetterAtPc(letter, normPc(midi));
    return name + octaveForSpell(midi, letter, name) + "h";
  }

  function voicingLine(root, tones, symbol, parentKey) {
    var rootMidi = 48 + root.pc;
    var raw = [];
    var i;
    var t;
    for (i = 0; i < tones.length; i++) {
      raw.push(rootMidi + tones[i].semi);
    }
    var placed = placeRegister(raw);
    var parts = [];
    for (i = 0; i < placed.length; i++) {
      var pc = normPc(placed[i]);
      var step = tones[0].step;
      for (t = 0; t < tones.length; t++) {
        if (normPc(root.pc + tones[t].semi) === pc) {
          step = tones[t].step;
          break;
        }
      }
      parts.push(degreeToken(placed[i], degreeLetter(root.name, step)));
    }
    return (
      "@bass " + keyDirective(parentKey) + " [" + parts.join(" ") + "]^" + symbol
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
          qual.parent(ROOTS[r])
        )
      );
    }
    for (r = 0; r < ROOTS.length; r++) {
      items.push(
        voicingLine(
          ROOTS[r],
          qual.formB,
          qual.symbol(ROOTS[r]),
          qual.parent(ROOTS[r])
        )
      );
    }
  }

  registerExercise({
    id: "leftHandRootless",
    label: "Left Hand Rootless Voicings",
    inMenu: true,
    /* 2026-10-17: each tone uses the root's letter, so F# is not written Gb beside G.
       2026-10-17: chord name is ^ above the stack. _ under a stack is text, not the name. */
    rev: 3,
    items: items
  });
})();
