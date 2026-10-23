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
    "@key=C [E3h G3h B3h D4h]^C" + DELTA + "7",
    "@key=G [B2h D3h F#3h A3h]^G" + DELTA + "7",
    "@key=D [F#3h A3h C#4h E4h]^D" + DELTA + "7",
    "@key=A [C#3h E3h G#3h B3h]^A" + DELTA + "7",
    "@key=E [G#3h B3h D#4h F#4h]^E" + DELTA + "7",
    "@key=B [D#3h F#3h A#3h C#4h]^B" + DELTA + "7",
    "@key=F# [A#3h C#4h F4h G#4h]^F#" + DELTA + "7",
    "@key=Db [F3h Ab3h C4h Eb4h]^Db" + DELTA + "7",
    "@key=Ab [C3h Eb3h G3h Bb3h]^Ab" + DELTA + "7",
    "@key=Eb [G3h Bb3h D4h F4h]^Eb" + DELTA + "7",
    "@key=Bb [D3h F3h A3h C4h]^Bb" + DELTA + "7",
    "@key=F [A3h C4h E4h G4h]^F" + DELTA + "7",
    /* Maj7 Form B — 7–9–3–5 */
    "@key=C [B2h D3h E3h G3h]^C" + DELTA + "7",
    "@key=G [F#3h A3h B3h D4h]^G" + DELTA + "7",
    "@key=D [C#3h E3h F#3h A3h]^D" + DELTA + "7",
    "@key=A [G#3h B3h C#4h E4h]^A" + DELTA + "7",
    "@key=E [D#3h F#3h G#3h B3h]^E" + DELTA + "7",
    "@key=B [A#3h C#4h D#4h F#4h]^B" + DELTA + "7",
    "@key=F# [F3h G#3h A#3h C#4h]^F#" + DELTA + "7",
    "@key=Db [C3h Eb3h F3h Ab3h]^Db" + DELTA + "7",
    "@key=Ab [G3h Bb3h C4h Eb4h]^Ab" + DELTA + "7",
    "@key=Eb [D3h F3h G3h Bb3h]^Eb" + DELTA + "7",
    "@key=Bb [A3h C4h D4h F4h]^Bb" + DELTA + "7",
    "@key=F [E3h G3h A3h C4h]^F" + DELTA + "7",
    /* m7 Form A — b3–5–b7–9 */
    "@key=Bb [Eb3h G3h Bb3h D4h]^Cm7",
    "@key=F [Bb3h D4h F4h A4h]^Gm7",
    "@key=C [F3h A3h C4h E4h]^Dm7",
    "@key=G [C3h E3h G3h B3h]^Am7",
    "@key=D [G3h B3h D4h F#4h]^Em7",
    "@key=A [D3h F#3h A3h C#4h]^Bm7",
    "@key=E [A3h C#4h E4h G#4h]^F#m7",
    "@key=B [E3h Ab3h B3h Eb4h]^Dbm7",
    "@key=F# [B3h Eb4h Gb4h Bb4h]^Abm7",
    "@key=Db [Gb3h Bb3h Db4h F4h]^Ebm7",
    "@key=Ab [Db3h F3h Ab3h C4h]^Bbm7",
    "@key=Eb [Ab3h C4h Eb4h G4h]^Fm7",
    /* m7 Form B — b7–9–b3–5 */
    "@key=Bb [Bb3h D4h Eb4h G4h]^Cm7",
    "@key=F [F3h A3h Bb3h D4h]^Gm7",
    "@key=C [C3h E3h F3h A3h]^Dm7",
    "@key=G [G3h B3h C4h E4h]^Am7",
    "@key=D [D3h F#3h G3h B3h]^Em7",
    "@key=A [A3h C#4h D4h F#4h]^Bm7",
    "@key=E [E3h G#3h A3h C#4h]^F#m7",
    "@key=B [B3h Eb4h E4h Ab4h]^Dbm7",
    "@key=F# [Gb3h Bb3h B3h Eb4h]^Abm7",
    "@key=Db [Db3h F3h Gb3h Bb3h]^Ebm7",
    "@key=Ab [Ab3h C4h Db4h F4h]^Bbm7",
    "@key=Eb [Eb3h G3h Ab3h C4h]^Fm7",
    /* Dom7 Form A — 3–5–b7–9 */
    "@key=F [E3h G3h Bb3h D4h]^C7",
    "@key=C [B2h D3h F3h A3h]^G7",
    "@key=G [F#3h A3h C4h E4h]^D7",
    "@key=D [C#3h E3h G3h B3h]^A7",
    "@key=A [G#3h B3h D4h F#4h]^E7",
    "@key=E [D#3h F#3h A3h C#4h]^B7",
    "@key=B [A#3h C#4h E4h G#4h]^F#7",
    "@key=F# [F3h Ab3h B3h Eb4h]^Db7",
    "@key=Db [C3h Eb3h Gb3h Bb3h]^Ab7",
    "@key=Ab [G3h Bb3h Db4h F4h]^Eb7",
    "@key=Eb [D3h F3h Ab3h C4h]^Bb7",
    "@key=Bb [A3h C4h Eb4h G4h]^F7",
    /* Dom7 Form B — b7–9–3–5 */
    "@key=F [Bb3h D4h E4h G4h]^C7",
    "@key=C [F3h A3h B3h D4h]^G7",
    "@key=G [C3h E3h F#3h A3h]^D7",
    "@key=D [G3h B3h C#4h E4h]^A7",
    "@key=A [D3h F#3h G#3h B3h]^E7",
    "@key=E [A3h C#4h D#4h F#4h]^B7",
    "@key=B [E3h G#3h Bb3h C#4h]^F#7",
    "@key=F# [B3h Eb4h F4h Ab4h]^Db7",
    "@key=Db [Gb3h Bb3h C4h Eb4h]^Ab7",
    "@key=Ab [Db3h F3h G3h Bb3h]^Eb7",
    "@key=Eb [Ab3h C4h D4h F4h]^Bb7",
    "@key=Bb [Eb3h G3h A3h C4h]^F7",
    /* Alt7 Form A — 3–b13–b7–#9 */
    "@key=Fm [E3h Ab3h Bb3h Eb4h]^Calt7",
    "@key=Cm [B2h Eb3h F3h Bb3h]^Galt7",
    "@key=Gm [F#3h Bb3h C4h F4h]^Dalt7",
    "@key=Dm [C#3h F3h G3h C4h]^Aalt7",
    "@key=Am [G#3h C4h D4h G4h]^Ealt7",
    "@key=Em [D#3h G3h A3h D4h]^Balt7",
    "@key=Bm [A#3h D4h E4h A4h]^F#alt7",
    "@key=F#m [F3h A3h B3h E4h]^Dbalt7",
    "@key=C#m [C3h E3h F#3h B3h]^Abalt7",
    "@key=Abm [G3h B3h C#4h F#4h]^Ebalt7",
    "@key=Ebm [D3h F#3h G#3h C#4h]^Bbalt7",
    "@key=Bbm [A3h C#4h D#4h G#4h]^Falt7",
    /* Alt7 Form B — b7–#9–3–b13 */
    "@key=Fm [Bb3h Eb4h E4h Ab4h]^Calt7",
    "@key=Cm [F3h Bb3h B3h Eb4h]^Galt7",
    "@key=Gm [C3h F3h F#3h Bb3h]^Dalt7",
    "@key=Dm [G3h C4h C#4h F4h]^Aalt7",
    "@key=Am [D3h G3h G#3h C4h]^Ealt7",
    "@key=Em [A3h D4h D#4h G4h]^Balt7",
    "@key=Bm [E3h A3h A#3h D4h]^F#alt7",
    "@key=F#m [B3h E4h F4h A4h]^Dbalt7",
    "@key=C#m [F#3h B3h C4h E4h]^Abalt7",
    "@key=Abm [C#3h F#3h G3h B3h]^Ebalt7",
    "@key=Ebm [G#3h C#4h D4h F#4h]^Bbalt7",
    "@key=Bbm [Eb3h G#3h A3h Db4h]^Falt7",
    /* ø7 Form A — b3–b5–b7–9 */
    "@key=Bbm [Eb3h Gb3h Bb3h D4h]^C" + OSLASH + "7",
    "@key=Fm [Bb3h Db4h F4h A4h]^G" + OSLASH + "7",
    "@key=Cm [F3h Ab3h C4h E4h]^D" + OSLASH + "7",
    "@key=Gm [C3h Eb3h G3h B3h]^A" + OSLASH + "7",
    "@key=Dm [G3h Bb3h D4h F#4h]^E" + OSLASH + "7",
    "@key=Am [D3h F3h A3h C#4h]^B" + OSLASH + "7",
    "@key=Em [A3h C4h E4h G#4h]^F#" + OSLASH + "7",
    "@key=Bm [E3h G3h B3h Eb4h]^Db" + OSLASH + "7",
    "@key=F#m [B3h D4h Gb4h Bb4h]^Ab" + OSLASH + "7",
    "@key=C#m [Gb3h A3h Db4h F4h]^Eb" + OSLASH + "7",
    "@key=Abm [Db3h E3h Ab3h C4h]^Bb" + OSLASH + "7",
    "@key=Ebm [Ab3h B3h Eb4h G4h]^F" + OSLASH + "7",
    /* ø7 Form B — b7–9–b3–b5 */
    "@key=Bbm [Bb3h D4h Eb4h Gb4h]^C" + OSLASH + "7",
    "@key=Fm [F3h A3h Bb3h Db4h]^G" + OSLASH + "7",
    "@key=Cm [C3h E3h F3h Ab3h]^D" + OSLASH + "7",
    "@key=Gm [G3h B3h C4h Eb4h]^A" + OSLASH + "7",
    "@key=Dm [D3h F#3h G3h Bb3h]^E" + OSLASH + "7",
    "@key=Am [A3h C#4h D4h F4h]^B" + OSLASH + "7",
    "@key=Em [E3h G#3h A3h C4h]^F#" + OSLASH + "7",
    "@key=Bm [B3h Eb4h E4h G4h]^Db" + OSLASH + "7",
    "@key=F#m [Gb3h Bb3h B3h D4h]^Ab" + OSLASH + "7",
    "@key=C#m [Db3h F3h Gb3h A3h]^Eb" + OSLASH + "7",
    "@key=Abm [Ab3h C4h Db4h E4h]^Bb" + OSLASH + "7",
    "@key=Ebm [Eb3h G3h Ab3h B3h]^F" + OSLASH + "7"
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
       2026-10-23: hand-spelled catalog (no auto-transpose); readable accidentals under parent key. */
    rev: 5,
    items: items
  });
})();
