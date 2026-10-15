/* cscript //nologo //E:JScript tools\dump-rhythm-motifs.js */
var FS = new ActiveXObject("Scripting.FileSystemObject");
var root = FS.GetParentFolderName(WScript.ScriptFullName);
var path = FS.BuildPath(FS.GetParentFolderName(root), "resources\\js\\exercises\\rhythm-motifs.js");
var text = FS.OpenTextFile(path, 1).ReadAll();

/* Stub registerExercise and capture items. */
var captured = null;
function registerExercise(def) {
  captured = def;
}
var window = {};
if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, "");
  };
}
if (!Array.prototype.map) {
  Array.prototype.map = function (fn) {
    var out = [];
    var i;
    for (i = 0; i < this.length; i++) {
      out.push(fn(this[i], i, this));
    }
    return out;
  };
}
eval(text);

var items = captured.items;
var outPath = FS.BuildPath(root, "_rm_lines.txt");
var stream = new ActiveXObject("ADODB.Stream");
stream.Type = 2;
stream.Charset = "UTF-8";
stream.Open();
stream.WriteText("COUNT=" + items.length + "\r\n");
var i;
for (i = 0; i < items.length; i++) {
  stream.WriteText(items[i] + "\r\n");
}
stream.WriteText("---CHECKS---\r\n");
stream.WriteText("early1#1=" + window.rhythmMotifsShift(window.rhythmMotifsBases[0], -1) + "\r\n");
stream.WriteText("delay1#1=" + window.rhythmMotifsShift(window.rhythmMotifsBases[0], 1) + "\r\n");
stream.WriteText("early0.5#1=" + window.rhythmMotifsShift(window.rhythmMotifsBases[0], -0.5) + "\r\n");
stream.WriteText("delay0.5#1=" + window.rhythmMotifsShift(window.rhythmMotifsBases[0], 0.5) + "\r\n");
stream.SaveToFile(outPath, 2);
stream.Close();
WScript.Echo("wrote " + outPath + " count=" + items.length);
