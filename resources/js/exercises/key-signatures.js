function keySignatureItem(key, caption) {
  return "@key=" + key + " \u00B7 " + caption;
}

/* Empty staff with every major and minor signature (sharps, then flats). */
registerExercise({
  id: "keySignatures",
  label: "Key Signatures",
  bars: 1,
  staff: true,
  inMenu: false,
  items: [
    keySignatureItem("C", "C major"),
    keySignatureItem("G", "G major"),
    keySignatureItem("D", "D major"),
    keySignatureItem("A", "A major"),
    keySignatureItem("E", "E major"),
    keySignatureItem("B", "B major"),
    keySignatureItem("F#", "F\u266F major"),
    keySignatureItem("C#", "C\u266F major"),
    keySignatureItem("F", "F major"),
    keySignatureItem("Bb", "B\u266D major"),
    keySignatureItem("Eb", "E\u266D major"),
    keySignatureItem("Ab", "A\u266D major"),
    keySignatureItem("Db", "D\u266D major"),
    keySignatureItem("Gb", "G\u266D major"),
    keySignatureItem("Cb", "C\u266D major"),
    keySignatureItem("Am", "A minor"),
    keySignatureItem("Em", "E minor"),
    keySignatureItem("Bm", "B minor"),
    keySignatureItem("F#m", "F\u266F minor"),
    keySignatureItem("C#m", "C\u266F minor"),
    keySignatureItem("G#m", "G\u266F minor"),
    keySignatureItem("D#m", "D\u266F minor"),
    keySignatureItem("A#m", "A\u266F minor"),
    keySignatureItem("Dm", "D minor"),
    keySignatureItem("Gm", "G minor"),
    keySignatureItem("Cm", "C minor"),
    keySignatureItem("Fm", "F minor"),
    keySignatureItem("Bbm", "B\u266D minor"),
    keySignatureItem("Ebm", "E\u266D minor"),
    keySignatureItem("Abm", "A\u266D minor")
  ]
});
