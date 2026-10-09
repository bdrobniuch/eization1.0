(function () {
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

  var FLAT = "\u266D";
  var NATURAL = "\u266E";

  /*
   * semis: pitch classes from tonic including the octave.
   * degrees: labels under each note (same length as semis).
   * parent: @key= name from the scale root.
   * ^ names are one token (hyphens; no spaces).
   */
  var SCALES = [
    {
      name: "Major",
      semis: [0, 2, 4, 5, 7, 9, 11, 12],
      degrees: ["1", "2", "3", "4", "5", "6", "7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Dorian",
      semis: [0, 2, 3, 5, 7, 9, 10, 12],
      degrees: ["1", "2", "b3", "4", "5", "6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 2);
      }
    },
    {
      name: "Phrygian",
      semis: [0, 1, 3, 5, 7, 8, 10, 12],
      degrees: ["1", "b2", "b3", "4", "5", "b6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 4);
      }
    },
    {
      name: "Lydian",
      semis: [0, 2, 4, 6, 7, 9, 11, 12],
      degrees: ["1", "2", "3", "#4", "5", "6", "7", "1"],
      parent: function (root) {
        return majorParent(root, 5);
      }
    },
    {
      name: "Mixolydian",
      semis: [0, 2, 4, 5, 7, 9, 10, 12],
      degrees: ["1", "2", "3", "4", "5", "6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 7);
      }
    },
    {
      name: "Aeolian",
      semis: [0, 2, 3, 5, 7, 8, 10, 12],
      degrees: ["1", "2", "b3", "4", "5", "b6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 9);
      }
    },
    {
      name: "Locrian",
      semis: [0, 1, 3, 5, 6, 8, 10, 12],
      degrees: ["1", "b2", "b3", "4", "b5", "b6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 11);
      }
    },
    {
      name: "Harmonic-minor",
      semis: [0, 2, 3, 5, 7, 8, 11, 12],
      degrees: ["1", "2", "b3", "4", "5", "b6", "7", "1"],
      parent: function (root) {
        return minorParent(root, 0);
      }
    },
    {
      name: "Melodic-minor",
      semis: [0, 2, 3, 5, 7, 9, 11, 12],
      degrees: ["1", "2", "b3", "4", "5", "6", "7", "1"],
      parent: function (root) {
        return minorParent(root, 0);
      }
    },
    {
      name: "Harmonic-major",
      semis: [0, 2, 4, 5, 7, 8, 11, 12],
      degrees: ["1", "2", "3", "4", "5", "b6", "7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Dorian-" + FLAT + "2",
      semis: [0, 1, 3, 5, 7, 9, 10, 12],
      degrees: ["1", "b2", "b3", "4", "5", "6", "b7", "1"],
      parent: function (root) {
        return minorParent(root, 2);
      }
    },
    {
      name: "Lydian-augmented",
      semis: [0, 2, 4, 6, 8, 9, 11, 12],
      degrees: ["1", "2", "3", "#4", "#5", "6", "7", "1"],
      parent: function (root) {
        return minorParent(root, 4);
      }
    },
    {
      name: "Lydian-dominant",
      semis: [0, 2, 4, 6, 7, 9, 10, 12],
      degrees: ["1", "2", "3", "#4", "5", "6", "b7", "1"],
      parent: function (root) {
        return minorParent(root, 5);
      }
    },
    {
      name: "Mixolydian-" + FLAT + "6",
      semis: [0, 2, 4, 5, 7, 8, 10, 12],
      degrees: ["1", "2", "3", "4", "5", "b6", "b7", "1"],
      parent: function (root) {
        return minorParent(root, 7);
      }
    },
    {
      name: "Locrian-" + NATURAL + "2",
      semis: [0, 2, 3, 5, 6, 8, 10, 12],
      degrees: ["1", "2", "b3", "4", "b5", "b6", "b7", "1"],
      parent: function (root) {
        return minorParent(root, 9);
      }
    },
    {
      name: "Altered",
      semis: [0, 1, 3, 4, 6, 8, 10, 12],
      degrees: ["1", "b9", "#9", "3", "b5", "#5", "b7", "1"],
      parent: function (root) {
        return minorParent(root, 11);
      }
    },
    {
      name: "Phrygian-dominant",
      semis: [0, 1, 4, 5, 7, 8, 10, 12],
      degrees: ["1", "b2", "3", "4", "5", "b6", "b7", "1"],
      parent: function (root) {
        return minorParent(root, 7);
      }
    },
    {
      name: "Whole-tone",
      semis: [0, 2, 4, 6, 8, 10, 12],
      degrees: ["1", "2", "3", "#4", "#5", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Half-whole-diminished",
      semis: [0, 1, 3, 4, 6, 7, 9, 10, 12],
      degrees: ["1", "b2", "#2", "3", "#4", "5", "6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Whole-half-diminished",
      semis: [0, 2, 3, 5, 6, 8, 9, 11, 12],
      degrees: ["1", "2", "b3", "4", "b5", "b6", "bb7", "7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Major-pentatonic",
      semis: [0, 2, 4, 7, 9, 12],
      degrees: ["1", "2", "3", "5", "6", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Minor-pentatonic",
      semis: [0, 3, 5, 7, 10, 12],
      degrees: ["1", "b3", "4", "5", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Blues",
      semis: [0, 3, 5, 6, 7, 10, 12],
      degrees: ["1", "b3", "4", "b5", "5", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Major-blues",
      semis: [0, 2, 3, 4, 7, 9, 12],
      degrees: ["1", "2", "b3", "3", "5", "6", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Bebop-major",
      semis: [0, 2, 4, 5, 7, 8, 9, 11, 12],
      degrees: ["1", "2", "3", "4", "5", "#5", "6", "7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Bebop-dominant",
      semis: [0, 2, 4, 5, 7, 9, 10, 11, 12],
      degrees: ["1", "2", "3", "4", "5", "6", "b7", "7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
      }
    },
    {
      name: "Bebop-minor",
      semis: [0, 2, 3, 4, 5, 7, 9, 10, 12],
      degrees: ["1", "2", "b3", "3", "4", "5", "6", "b7", "1"],
      parent: function (root) {
        return majorParent(root, 0);
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

  /* Major-mode parent: ionian tonic = root − offset. */
  function majorParent(root, offset) {
    return parentKeyName(root.pc - offset, false);
  }

  /* Melodic/harmonic-minor parent: minor tonic = root − offset → @key=Xm. */
  function minorParent(root, offset) {
    return parentKeyName(root.pc - offset, true);
  }

  function normalizeKeyName(parentKey) {
    return parentKey === "Dbm" ? "C#m" : parentKey;
  }

  function keyDirective(parentKey) {
    return "@key=" + normalizeKeyName(parentKey);
  }

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

  function midiToToken(midi, flat, degree) {
    var pc = normPc(midi);
    var oct = Math.floor(midi / 12) - 1;
    return pcName(pc, flat) + oct + "e_" + degree;
  }

  /* Beam in groups of four eighths (last group may be shorter). */
  function beamGroups(tokens) {
    var chunks = [];
    var i;
    for (i = 0; i < tokens.length; i += 4) {
      chunks.push("{" + tokens.slice(i, i + 4).join(" ") + "}");
    }
    return chunks.join(" ");
  }

  function scaleLine(root, scale) {
    var rootMidi = 60 + root.pc;
    var useFlat = spellingUsesFlat(scale.parent(root));
    var parts = [];
    var i;
    for (i = 0; i < scale.semis.length; i++) {
      parts.push(midiToToken(rootMidi + scale.semis[i], useFlat, scale.degrees[i]));
    }
    return (
      "@treble " +
      keyDirective(scale.parent(root)) +
      " ^" +
      scale.name +
      " " +
      beamGroups(parts)
    );
  }

  var items = [];
  var s;
  var r;
  for (s = 0; s < SCALES.length; s++) {
    for (r = 0; r < ROOTS.length; r++) {
      items.push(scaleLine(ROOTS[r], SCALES[s]));
    }
  }

  registerExercise({
    id: "scales",
    label: "Scales",
    inMenu: true,
    items: items
  });
})();
