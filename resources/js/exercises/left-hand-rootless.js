(function () {
  var DELTA = "\u2206";
  var OSLASH = "\u00F8";

  /*
   * Hand-spelled stacks (no automated transposition). Spellings prefer what
   * pianists sight-read under the parent key signature — e.g. F not E# under
   * F#, Ab not G# under Db — even when that breaks strict chord-tone letters.
   * Order: each quality Form A (12 keys, circle of fifths), then Form B.
   */
  var items = [
    /* Maj7 Form A — 3–5–7–9 */
    "@key=C [E3 G3 B3 D4]h^C" + DELTA + "7",
    "@key=G [B2 D3 F#3 A3]h^G" + DELTA + "7",
    "@key=D [F#3 A3 C#4 E4]h^D" + DELTA + "7",
    "@key=A [C#3 E3 G#3 B3]h^A" + DELTA + "7",
    "@key=E [G#3 B3 D#4 F#4]h^E" + DELTA + "7",
    "@key=B [D#3 F#3 A#3 C#4]h^B" + DELTA + "7",
    "@key=F# [A#3 C#4 F4 G#4]h^F#" + DELTA + "7",
    "@key=Db [F3 Ab3 C4 Eb4]h^Db" + DELTA + "7",
    "@key=Ab [C3 Eb3 G3 Bb3]h^Ab" + DELTA + "7",
    "@key=Eb [G3 Bb3 D4 F4]h^Eb" + DELTA + "7",
    "@key=Bb [D3 F3 A3 C4]h^Bb" + DELTA + "7",
    "@key=F [A3 C4 E4 G4]h^F" + DELTA + "7",
    /* Maj7 Form B — 7–9–3–5 */
    "@key=C [B2 D3 E3 G3]h^C" + DELTA + "7",
    "@key=G [F#3 A3 B3 D4]h^G" + DELTA + "7",
    "@key=D [C#3 E3 F#3 A3]h^D" + DELTA + "7",
    "@key=A [G#3 B3 C#4 E4]h^A" + DELTA + "7",
    "@key=E [D#3 F#3 G#3 B3]h^E" + DELTA + "7",
    "@key=B [A#3 C#4 D#4 F#4]h^B" + DELTA + "7",
    "@key=F# [F3 G#3 A#3 C#4]h^F#" + DELTA + "7",
    "@key=Db [C3 Eb3 F3 Ab3]h^Db" + DELTA + "7",
    "@key=Ab [G3 Bb3 C4 Eb4]h^Ab" + DELTA + "7",
    "@key=Eb [D3 F3 G3 Bb3]h^Eb" + DELTA + "7",
    "@key=Bb [A3 C4 D4 F4]h^Bb" + DELTA + "7",
    "@key=F [E3 G3 A3 C4]h^F" + DELTA + "7",
    /* m7 Form A — b3–5–b7–9 */
    "@key=Bb [Eb3 G3 Bb3 D4]h^Cm7",
    "@key=F [Bb3 D4 F4 A4]h^Gm7",
    "@key=C [F3 A3 C4 E4]h^Dm7",
    "@key=G [C3 E3 G3 B3]h^Am7",
    "@key=D [G3 B3 D4 F#4]h^Em7",
    "@key=A [D3 F#3 A3 C#4]h^Bm7",
    "@key=E [A3 C#4 E4 G#4]h^F#m7",
    "@key=B [E3 Ab3 B3 Eb4]h^Dbm7",
    "@key=F# [B3 Eb4 Gb4 Bb4]h^Abm7",
    "@key=Db [Gb3 Bb3 Db4 F4]h^Ebm7",
    "@key=Ab [Db3 F3 Ab3 C4]h^Bbm7",
    "@key=Eb [Ab3 C4 Eb4 G4]h^Fm7",
    /* m7 Form B — b7–9–b3–5 */
    "@key=Bb [Bb3 D4 Eb4 G4]h^Cm7",
    "@key=F [F3 A3 Bb3 D4]h^Gm7",
    "@key=C [C3 E3 F3 A3]h^Dm7",
    "@key=G [G3 B3 C4 E4]h^Am7",
    "@key=D [D3 F#3 G3 B3]h^Em7",
    "@key=A [A3 C#4 D4 F#4]h^Bm7",
    "@key=E [E3 G#3 A3 C#4]h^F#m7",
    "@key=B [B3 Eb4 E4 Ab4]h^Dbm7",
    "@key=F# [Gb3 Bb3 B3 Eb4]h^Abm7",
    "@key=Db [Db3 F3 Gb3 Bb3]h^Ebm7",
    "@key=Ab [Ab3 C4 Db4 F4]h^Bbm7",
    "@key=Eb [Eb3 G3 Ab3 C4]h^Fm7",
    /* Dom7 Form A — 3–5–b7–9 */
    "@key=F [E3 G3 Bb3 D4]h^C7",
    "@key=C [B2 D3 F3 A3]h^G7",
    "@key=G [F#3 A3 C4 E4]h^D7",
    "@key=D [C#3 E3 G3 B3]h^A7",
    "@key=A [G#3 B3 D4 F#4]h^E7",
    "@key=E [D#3 F#3 A3 C#4]h^B7",
    "@key=B [A#3 C#4 E4 G#4]h^F#7",
    "@key=F# [F3 Ab3 B3 Eb4]h^Db7",
    "@key=Db [C3 Eb3 Gb3 Bb3]h^Ab7",
    "@key=Ab [G3 Bb3 Db4 F4]h^Eb7",
    "@key=Eb [D3 F3 Ab3 C4]h^Bb7",
    "@key=Bb [A3 C4 Eb4 G4]h^F7",
    /* Dom7 Form B — b7–9–3–5 */
    "@key=F [Bb3 D4 E4 G4]h^C7",
    "@key=C [F3 A3 B3 D4]h^G7",
    "@key=G [C3 E3 F#3 A3]h^D7",
    "@key=D [G3 B3 C#4 E4]h^A7",
    "@key=A [D3 F#3 G#3 B3]h^E7",
    "@key=E [A3 C#4 D#4 F#4]h^B7",
    "@key=B [E3 G#3 Bb3 C#4]h^F#7",
    "@key=F# [B3 Eb4 F4 Ab4]h^Db7",
    "@key=Db [Gb3 Bb3 C4 Eb4]h^Ab7",
    "@key=Ab [Db3 F3 G3 Bb3]h^Eb7",
    "@key=Eb [Ab3 C4 D4 F4]h^Bb7",
    "@key=Bb [Eb3 G3 A3 C4]h^F7",
    /* Alt7 Form A — 3–b13–b7–#9 */
    "@key=Fm [E3 Ab3 Bb3 Eb4]h^Calt7",
    "@key=Cm [B2 Eb3 F3 Bb3]h^Galt7",
    "@key=Gm [F#3 Bb3 C4 F4]h^Dalt7",
    "@key=Dm [C#3 F3 G3 C4]h^Aalt7",
    "@key=Am [G#3 C4 D4 G4]h^Ealt7",
    "@key=Em [D#3 G3 A3 D4]h^Balt7",
    "@key=Bm [A#3 D4 E4 A4]h^F#alt7",
    "@key=F#m [F3 A3 B3 E4]h^Dbalt7",
    "@key=C#m [C3 E3 F#3 B3]h^Abalt7",
    "@key=Abm [G3 B3 C#4 F#4]h^Ebalt7",
    "@key=Ebm [D3 F#3 G#3 C#4]h^Bbalt7",
    "@key=Bbm [A3 C#4 D#4 G#4]h^Falt7",
    /* Alt7 Form B — b7–#9–3–b13 */
    "@key=Fm [Bb3 Eb4 E4 Ab4]h^Calt7",
    "@key=Cm [F3 Bb3 B3 Eb4]h^Galt7",
    "@key=Gm [C3 F3 F#3 Bb3]h^Dalt7",
    "@key=Dm [G3 C4 C#4 F4]h^Aalt7",
    "@key=Am [D3 G3 G#3 C4]h^Ealt7",
    "@key=Em [A3 D4 D#4 G4]h^Balt7",
    "@key=Bm [E3 A3 A#3 D4]h^F#alt7",
    "@key=F#m [B3 E4 F4 A4]h^Dbalt7",
    "@key=C#m [F#3 B3 C4 E4]h^Abalt7",
    "@key=Abm [C#3 F#3 G3 B3]h^Ebalt7",
    "@key=Ebm [G#3 C#4 D4 F#4]h^Bbalt7",
    "@key=Bbm [Eb3 G#3 A3 Db4]h^Falt7",
    /* ø7 Form A — b3–b5–b7–9 */
    "@key=Bbm [Eb3 Gb3 Bb3 D4]h^C" + OSLASH + "7",
    "@key=Fm [Bb3 Db4 F4 A4]h^G" + OSLASH + "7",
    "@key=Cm [F3 Ab3 C4 E4]h^D" + OSLASH + "7",
    "@key=Gm [C3 Eb3 G3 B3]h^A" + OSLASH + "7",
    "@key=Dm [G3 Bb3 D4 F#4]h^E" + OSLASH + "7",
    "@key=Am [D3 F3 A3 C#4]h^B" + OSLASH + "7",
    "@key=Em [A3 C4 E4 G#4]h^F#" + OSLASH + "7",
    "@key=Bm [E3 G3 B3 Eb4]h^Db" + OSLASH + "7",
    "@key=F#m [B3 D4 Gb4 Bb4]h^Ab" + OSLASH + "7",
    "@key=C#m [Gb3 A3 Db4 F4]h^Eb" + OSLASH + "7",
    "@key=Abm [Db3 E3 Ab3 C4]h^Bb" + OSLASH + "7",
    "@key=Ebm [Ab3 B3 Eb4 G4]h^F" + OSLASH + "7",
    /* ø7 Form B — b7–9–b3–b5 */
    "@key=Bbm [Bb3 D4 Eb4 Gb4]h^C" + OSLASH + "7",
    "@key=Fm [F3 A3 Bb3 Db4]h^G" + OSLASH + "7",
    "@key=Cm [C3 E3 F3 Ab3]h^D" + OSLASH + "7",
    "@key=Gm [G3 B3 C4 Eb4]h^A" + OSLASH + "7",
    "@key=Dm [D3 F#3 G3 Bb3]h^E" + OSLASH + "7",
    "@key=Am [A3 C#4 D4 F4]h^B" + OSLASH + "7",
    "@key=Em [E3 G#3 A3 C4]h^F#" + OSLASH + "7",
    "@key=Bm [B3 Eb4 E4 G4]h^Db" + OSLASH + "7",
    "@key=F#m [Gb3 Bb3 B3 D4]h^Ab" + OSLASH + "7",
    "@key=C#m [Db3 F3 Gb3 A3]h^Eb" + OSLASH + "7",
    "@key=Abm [Ab3 C4 Db4 E4]h^Bb" + OSLASH + "7",
    "@key=Ebm [Eb3 G3 Ab3 B3]h^F" + OSLASH + "7"
  ];

  registerExercise({
    id: "leftHandRootless",
    label: "Left Hand Rootless Voicings",
    staff: true,
    clef: "bass",
    inMenu: true,
    /* 2026-10-17: each tone uses the root's letter, so F# is not written Gb beside G.
       2026-10-17: chord name is ^ above the stack. _ under a stack is text, not the name.
       2026-10-23: exercise default clef is bass; lines no longer repeat @bass.
       2026-10-23: hand-spelled catalog (no auto-transpose); readable accidentals under parent key.
       2026-10-28: the chord's length is written once after ]. */
    rev: 6,
    items: items
  });
})();
