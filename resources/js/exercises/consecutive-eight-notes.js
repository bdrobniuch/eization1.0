function consecEightRightRotate(str, steps) {
  var len = str.length;
  var n = ((steps % len) + len) % len;
  if (n === 0) {
    return str;
  }
  return str.slice(len - n) + str.slice(0, len - n);
}

function consecEightEncode(pattern) {
  var tokens = [];
  var i = 0;
  while (i < pattern.length) {
    if (pattern.charAt(i) === "P") {
      var j = i;
      while (j < pattern.length && pattern.charAt(j) === "P") {
        j++;
      }
      var plays = [];
      var k;
      for (k = i; k < j; k++) {
        plays.push("/e");
      }
      tokens.push(plays.length === 1 ? "/e" : "{" + plays.join(" ") + "}");
      i = j;
    } else {
      var r = i;
      while (r < pattern.length && pattern.charAt(r) === "R") {
        r++;
      }
      var count = r - i;
      while (count >= 4) {
        tokens.push("rh");
        count -= 4;
      }
      while (count >= 2) {
        tokens.push("rq");
        count -= 2;
      }
      while (count >= 1) {
        tokens.push("re");
        count -= 1;
      }
      i = r;
    }
  }
  return tokens.join(" ");
}

function consecEightItems() {
  var items = [];
  var n;
  var rot;
  for (n = 2; n <= 7; n++) {
    var seed = "";
    var i;
    for (i = 0; i < n; i++) {
      seed += "P";
    }
    for (i = n; i < 8; i++) {
      seed += "R";
    }
    for (rot = 0; rot < 8; rot++) {
      var pattern = consecEightRightRotate(seed, rot);
      items.push(consecEightEncode(pattern) + " \u00B7 " + n + " eighths");
    }
  }
  return items;
}

registerExercise({
  id: "consecutiveEightNotes",
  label: "Consecutive Eight Notes",
  bars: 1,
  inMenu: false,
  items: consecEightItems()
});
