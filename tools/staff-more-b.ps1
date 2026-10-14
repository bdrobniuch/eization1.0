# Continuation of tools/staff-more.ps1. Dot-sourced, so the helpers stay in scope.

function Ev-Line($events, [int]$bars, [string]$cap) {
  return Build-Line $events $bars $cap ''
}

function Split-Caption([string]$text) {
  $sep = " $dot "
  $at = $text.IndexOf($sep)
  if ($at -lt 0) { return @{ body = $text.Trim(); cap = '' } }
  return @{ body = $text.Substring(0, $at).Trim(); cap = $text.Substring($at + $sep.Length).Trim() }
}

# --- into the next bar ---
$into = @(
  (Ev-Line (@('^Dm7', 'D4e', 'F4e', 'A4e', 'C5e', 'E4e', 'G4e', 'B4e', 'D5e', '^G7', 'B4q')) 4 'Aim at beat 1 of bar 2'),
  (Ev-Line (@('^Dm7', 'D4q', 'F4q', 'A4q', 'C5q', '^G7', 'B4q', 'D5q', 'F5q', 'D5q', '^Cmaj7', 'E4w')) 4 'Aim at the V7'),
  (Ev-Line (@('^Dm7', 'D4q', 'F4q', 'A4q', 'C5q', '^G7', 'B4q', 'A4q', 'G4q', 'F4q', '^Cmaj7', 'E4q', 'rq', 'rq', 'rq')) 4 'Aim at the I'),
  (Ev-Line (@('^Cmaj7', 'C4q', 'rq', 'rq', 'rq', 'E4q', 'rq', 'rq', 'rq', 'G4q', 'rq', 'rq', 'rq', 'C5q', 'rq', 'rq', 'rq')) 4 'Resolve on beat 1 only'),
  (Ev-Line (@('^Dm7', 'D4q', 'F4q', 'A4q', 're', 'B4e', '^G7', 'D5q', 'rq', 'rq', 're', 'E4e', '^Cmaj7', 'G4q', 'rq', 'rq', 'rq')) 4 'Anticipate the next chord'),
  (Ev-Line (@('^Dm7', 'D4q', 'E4q', 'F4q', 'G4q', '^G7', 'B4q_3', 'rq', 'rq', 'rq', '^Cmaj7', 'E4q_3', 'rq', 'rq', 'rq')) 4 'Land on the 3rd of the next chord'),
  (Ev-Line (@('^Dm7', 'D4q', 'E4q', 'F4q', 'G4q', '^G7', 'F4q_b7', 'rq', 'rq', 'rq', '^Cmaj7', 'B4q_7', 'rq', 'rq', 'rq')) 4 'Land on the 7th of the next chord'),
  (Ev-Line (@('^Dm7', 'D4q', 'F4q', 'A4q', 'C5q~', '^G7', 'C5q', 'B4q', 'rq', 'rq', '^Cmaj7', 'E4w')) 4 'Phrase across the barline'),
  (Ev-Line (@('^Dm7', 'rq', 'rq', 'rq', 'D4q', '^G7', 'B4q', 'D5q', 'F5q', 'D5q', '^Cmaj7', 'E4w')) 4 'Start on beat 4'),
  (Ev-Line (@('^Dm7', 'rq', 'rq', 'rq', 're', 'D4e', '^G7', 'B4q', 'rq', 'rq', 'rq', '^Cmaj7', 'E4w')) 4 'Start on the and of 4')
)
Add-Staff 'more0014' 'into-the-bar-staff' 'rhythm' 4 `
  'Into the next bar on the staff' "Hacia el siguiente comp${a}s en el pentagrama" `
  'Ten written lines over Dm7-G7-Cmaj7. Each one does the cue: arrive on a downbeat, aim at V or I, anticipate, land on the 3rd or the 7th, tie across the bar, or start late.' `
  "Diez l${i}neas escritas sobre Dm7-G7-Cmaj7. Cada una cumple la consigna: llegar a un tiempo fuerte, apuntar al V o al I, anticipar, caer en la 3a o la 7a, ligar el comp${a}s, o entrar tarde." `
  $into

# --- leave space ---
function Ratio-Bars([int]$play, [int]$rest, [int]$total) {
  $cycle = @()
  for ($k = 0; $k -lt $play; $k++) { $cycle += '/w' }
  for ($k = 0; $k -lt $rest; $k++) { $cycle += 'rw' }
  $out = New-Object System.Collections.Generic.List[string]
  $i = 0
  while ($out.Count -lt $total) {
    [void]$out.Add($cycle[$i % $cycle.Count])
    $i++
  }
  return ($out -join ' | ')
}
$space = New-Object System.Collections.Generic.List[string]
foreach ($pair in @(
    @(1, 1, 'Play 1, rest 1'), @(1, 2, 'Play 1, rest 2'), @(1, 3, 'Play 1, rest 3'),
    @(2, 1, 'Play 2, rest 1'), @(2, 2, 'Play 2, rest 2'), @(2, 3, 'Play 2, rest 3'),
    @(3, 1, 'Play 3, rest 1'), @(3, 2, 'Play 3, rest 2'), @(3, 3, 'Play 3, rest 3'),
    @(4, 1, 'Play 4, rest 1'), @(4, 2, 'Play 4, rest 2'), @(4, 4, 'Play 4, rest 4')
  )) {
  $music = Ratio-Bars $pair[0] $pair[1] 8
  [void]$space.Add((Join-Raw ($music + ' ' + $dot + ' ' + $pair[2]) 8))
}
$restFirst = ((@('rw') + @('/w') * 7) -join ' | ') + " $dot Rest first bar"
$restLast = ((@('/w') * 7 + @('rw')) -join ' | ') + " $dot Rest last bar"
$tradeFours = ((@('/w') * 4 + @('rw') * 4) -join ' | ') + " $dot Trade fours with silence"
[void]$space.Add((Join-Raw $restFirst 8))
[void]$space.Add((Join-Raw $restLast 8))
[void]$space.Add((Join-Raw $tradeFours 8))
Add-Staff 'more0015' 'leave-space-staff' 'rhythm' 8 `
  'Leave space on the staff' 'Dejar espacio en el pentagrama' `
  'Each play/rest ratio written in an eight-bar form. A slash bar is play, a rest bar is silence. Where the ratio does not divide eight, it keeps going until the form ends.' `
  "Cada ratio de tocar y callar, escrito en una forma de ocho compases. Un comp${a}s con slash se toca, un silencio se calla. Si el ratio no cabe exacto, sigue hasta el final de la forma." `
  $space.ToArray()

# --- one octave, in C ---
function Ping-Eighths($steps, [switch]$WithOctave) {
  $asc = Scale-Notes 'C' $steps 4 'e' -WithOctave:$WithOctave
  $cycle = New-Object System.Collections.Generic.List[string]
  foreach ($n in $asc) { [void]$cycle.Add($n) }
  for ($k = $asc.Count - 2; $k -ge 0; $k--) { [void]$cycle.Add($asc[$k]) }
  $out = New-Object System.Collections.Generic.List[string]
  $i = 0
  while ($out.Count -lt 16) {
    [void]$out.Add($cycle[$i % $cycle.Count])
    $i++
  }
  return ,$out.ToArray()
}
$oneOct = @(
  (Ev-Line (Ping-Eighths $MajSteps -WithOctave) 2 'Major scale'),
  (Ev-Line (Ping-Eighths $MixSteps -WithOctave) 2 'Mixolydian'),
  (Ev-Line (Ping-Eighths $DorSteps -WithOctave) 2 'Dorian'),
  (Ev-Line (Ping-Eighths $MinPentSteps -WithOctave) 2 'Minor pentatonic'),
  (Ev-Line @('C4q', 'E4q', 'G4q', 'C5q', 'C5q', 'G4q', 'E4q', 'C4q') 2 'Major arpeggio'),
  (Ev-Line @('C4q', 'E4q', 'G4q', 'Bb4q', 'Bb4q', 'G4q', 'E4q', 'C4q') 2 'Dominant 7 arpeggio'),
  (Ev-Line @('C4q', 'Eb4q', 'G4q', 'Bb4q', 'Bb4q', 'G4q', 'Eb4q', 'C4q') 2 'Minor 7 arpeggio'),
  (Ev-Line @('C4e', 'C#4e', 'D4e', 'D#4e', 'E4e', 'F4e', 'F#4e', 'G4e', 'G#4e', 'A4e', 'A#4e', 'B4e', 'C5e', 'rq.') 2 'Chromatic'),
  (Ev-Line @('C4q', 'D4q', 'E4q', 'G4q', 'G4q', 'E4q', 'D4q', 'C4q') 2 '1 2 3 5'),
  (Ev-Line @('C4q', 'E4q', 'G4q', 'B4q', 'B4q', 'G4q', 'E4q', 'C4q') 2 '1 3 5 7')
)
Add-Staff 'more0016' 'one-octave-staff' 'pitch' 2 `
  'One octave on the staff' "Solo una octava en el pentagrama" `
  'Scales, arpeggios, and two cells written inside C4 to C5. The major scale here walks that one octave. The all-key majors and minors are in Sticky keys on the staff.' `
  "Escalas, arpegios y dos c${e}lulas escritas entre C4 y C5. La escala mayor recorre esa octava. Las mayores y menores en todas las tonalidades est${a}n en Tonalidades dif${i}ciles en el pentagrama." `
  $oneOct

# --- goal notes ---
$goals = @(
  (Ev-Line @('C4q', 'D4q', 'E4q', 'F4q', '^Cmaj7', 'E4q_3', 'rq', 'rq', 'rq') 4 '3 of Cmaj7 on beat 1'),
  (Ev-Line @('D4q', 'E4q', 'F#4q', 'G4q', '^G7', 'F5q_b7', 'rq', 'rq', 'rq') 4 'b7 of G7 on beat 1'),
  (Ev-Line @('A4q', 'G4q', 'E4q', 'D4q', '^Dm7', 'F4q_b3', 'rq', 'rq', 'rq') 4 'b3 of Dm7 on beat 1'),
  (Ev-Line @('C4q', 'D4q', 'E4q', 'F4q', '^Cmaj7', 'E4q', 'F4q', 'G4q_5', 'rq') 4 '5 of Cmaj7 on beat 3'),
  (Ev-Line @('F4q', 'G4q', 'A4q', 'B4q', '^G7', 'Ab4q_b9', 'rq', 'rq', 'rq') 4 'b9 of G7 on beat 1'),
  (Ev-Line @('D4q', 'F4q', 'A4q', 'C5q', '^Dm7', 'E5q_9', 'rq', 'rq', 'rq') 4 '9 of Dm7 on beat 1'),
  (Ev-Line @('F4q', 'G4q', 'Bb4q', 'C5q', '^Fmaj7', 'A4q_3', 'rq', 'rq', 'rq') 4 '3 of Fmaj7 on beat 1'),
  (Ev-Line @('G4q', 'A4q', 'B4q', 'C5q', '^C7', 'Bb4q_b7', 'rq', 'rq', 'rq') 4 'b7 of C7 on beat 1'),
  (Ev-Line @('E4q', 'G4q', 'B4q', 'C5q', '^Am7', 'A4q_1', 'rq', 'rq', 'rq') 4 'Root of Am7 on beat 1'),
  (Ev-Line @('E4q', 'F#4q', 'G#4q', 'A4q', '^E7', 'E4q', 'F#4q', 'G#4q_3', 'rq') 4 '3 of E7 on beat 3')
)
Add-Staff 'more0020' 'goal-notes-staff' 'changes' 4 `
  'Goal notes on the staff' 'Notas objetivo en el pentagrama' `
  'One written path per goal. The labeled note is the chord tone, on the beat the cue names. The bars before it are a way in.' `
  "Un camino escrito por objetivo. La nota con cifra es la nota del acorde, en el tiempo que pide la consigna. Los compases de antes son una entrada." `
  $goals

# --- blues in every key, chord tones ---
function Chart-Line([string]$text) {
  $parts = Split-Caption $text
  $body = $parts.body
  $cap = $parts.cap
  $chords = @($body -split '\|' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($c in $chords) { foreach ($t in (Chord-Bar $c)) { [void]$ev.Add($t) } }
  return Build-Line $ev.ToArray() $chords.Count $cap ''
}
$basic = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0021'].lines)) { [void]$basic.Add((Chart-Line $ln)) }
Add-Staff 'more0021' 'basic-major-blues-staff' 'changes' 12 `
  'Basic major blues on the staff' "Blues mayor b${a}sico en el pentagrama" `
  'The plain twelve-bar major blues in every key, each chord written 1-3-5-b7. One chorus, then the next key.' `
  "El blues mayor de doce compases en cada tonalidad, cada acorde escrito 1-3-5-b7. Un chorus, luego la tonalidad siguiente." `
  $basic.ToArray()
$jazz = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0022'].lines)) { [void]$jazz.Add((Chart-Line $ln)) }
Add-Staff 'more0022' 'jazz-major-blues-staff' 'changes' 12 `
  'Jazz major blues on the staff' 'Blues mayor jazz en el pentagrama' `
  'The jazz blues in every key, written out: dominant arpeggios, the sharp-IV diminished seventh, and the II-V.' `
  "El blues de jazz en cada tonalidad, escrito: arpegios dominantes, la s${e}ptima disminuida del IV sostenido, y el II-V." `
  $jazz.ToArray()
$minorBlues = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0023'].lines)) { [void]$minorBlues.Add((Chart-Line $ln)) }
Add-Staff 'more0023' 'minor-blues-staff' 'changes' 12 `
  'Minor blues on the staff' 'Blues menor en el pentagrama' `
  'The minor twelve-bar blues in every key. Im7 and IVm7 are 1-b3-5-b7. bVI7 and V7 are 1-3-5-b7, spelled from the chord in the chart.' `
  "El blues menor de doce compases en cada tonalidad. Im7 y IVm7 son 1-b3-5-b7. bVI7 y V7 son 1-3-5-b7, escritos desde el acorde de la tabla." `
  $minorBlues.ToArray()

# --- scale patterns and 1-2-3-5 perms, in C ---
$cNote = @{
  '1' = 'C4'; '2' = 'D4'; '3' = 'E4'; '4' = 'F4'; '5' = 'G4'; '6' = 'A4'; '7' = 'B4'
  'b2' = 'Db4'; 'b3' = 'Eb4'; 'b5' = 'Gb4'; '#4' = 'F#4'; 'b7' = 'Bb4'
}
function Degrees-Bar([string]$formula, [string]$cap) {
  $degs = @($formula.Trim() -split '\s+')
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($d in $degs) {
    if (-not $cNote.ContainsKey($d)) { throw "degree $d" }
    [void]$ev.Add($cNote[$d] + 'q_' + $d)
  }
  return Ev-Line $ev.ToArray() 1 $cap
}
$patLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0024'].lines)) {
  $parts = Split-Caption $ln
  [void]$patLines.Add((Degrees-Bar $parts.body $parts.cap))
}
Add-Staff 'more0024' 'scale-patterns-staff' 'pitch' 1 `
  'Scale patterns on the staff' 'Patrones de escala en el pentagrama' `
  'All forty-eight cells written in C. The number under the note is the scale degree. One shape, one bar, then the next shape.' `
  "Las cuarenta y ocho c${e}lulas escritas en C. El n${u}mero bajo la nota es el grado. Una forma, un comp${a}s, luego la siguiente." `
  $patLines.ToArray()

$perm2 = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0032'].lines)) {
  $formula = (Split-Caption $ln).body
  $degs = @($formula -split '\s+')
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($d in $degs) { [void]$ev.Add($cNote[$d] + 'q_' + $d) }
  for ($k = $degs.Count - 1; $k -ge 0; $k--) { [void]$ev.Add($cNote[$degs[$k]] + 'q_' + $degs[$k]) }
  [void]$perm2.Add((Ev-Line $ev.ToArray() 2 $formula))
}
Add-Staff 'more0032' 'one-two-three-five-staff' 'pitch' 2 `
  '1-2-3-5 permutations on the staff' 'Permutaciones 1-2-3-5 en el pentagrama' `
  'All twenty-four orders written in C. Bar 1 is the order. Bar 2 is that order backwards, so the next shape can begin near the last note.' `
  "Los veinticuatro ${o}rdenes escritos en C. El comp${a}s 1 es el orden. El comp${a}s 2 es ese orden al rev${e}s, para que la forma siguiente empiece cerca de la ${u}ltima nota." `
  $perm2.ToArray()

# --- lower structure triads ---
$low = @(
  (Ev-Line @('^Cmaj7', 'C4q', 'E4q', 'G4q', 'C5q', 'E4q', 'G4q', 'B4q', 'E5q') 2 'Major 7 · I and III-'),
  (Ev-Line @('^C6', 'C4q', 'E4q', 'G4q', 'C5q', 'A4q', 'C5q', 'E5q', 'A5q') 2 'Major 6 · I and VI-'),
  (Ev-Line @('^C7', 'C4q', 'E4q', 'G4q', 'C5q', 'E4q', 'G4q', 'Bb4q', 'E5q') 2 'Dominant 7 · I and IIIdim'),
  (Ev-Line @('^C7sus', 'Bb4q', 'D5q', 'F5q', 'Bb4q', 'C4q', 'F4q', 'G4q', 'C5q') 2 '7sus4 · bVII and I'),
  (Ev-Line @('^C7#5', 'C4q', 'E4q', 'G#4q', 'C5q', 'C5q', 'G#4q', 'E4q', 'C4q') 2 'Augmented dominant · I+'),
  (Ev-Line @('^CmMaj7', 'C4q', 'Eb4q', 'G4q', 'C5q', 'Eb4q', 'G4q', 'B4q', 'Eb5q') 2 'Minor-major 7 · I- and bIII+'),
  (Ev-Line @('^Cm6', 'C4q', 'Eb4q', 'G4q', 'C5q', 'A4q', 'C5q', 'Eb5q', 'A4q') 2 'Minor 6 · I- and VIdim'),
  (Ev-Line @('^Cm7', 'C4q', 'Eb4q', 'G4q', 'C5q', 'Eb4q', 'G4q', 'Bb4q', 'Eb5q') 2 'Minor 7 · I- and bIII'),
  (Ev-Line @('^Cm7b5', 'C4q', 'Eb4q', 'Gb4q', 'C5q', 'Eb4q', 'Gb4q', 'Bb4q', 'Eb5q') 2 'Minor 7b5 · Idim and bIII-'),
  (Ev-Line @('^Cdim7', 'C4e', 'Eb4e', 'Gb4e', 'Eb4e', 'Gb4e', 'A4e', 'Gb4e', 'A4e', 'C5e', 'A4e', 'C5e', 'Eb5e', 'rq', 'rq') 2 'Diminished 7 · Idim bIIIdim bVdim VIdim'),
  (Ev-Line @('^Cmaj7#5', 'C4q', 'E4q', 'G#4q', 'C5q', 'E4q', 'G#4q', 'B4q', 'E5q') 2 'Augmented major 7 · I+ and III')
)
Add-Staff 'more0025' 'lower-structure-triads-staff' 'pitch' 2 `
  'Lower structure triads on the staff' "Tr${i}ades de estructura inferior en el pentagrama" `
  'Each chord type on C, with the lower triads written out. 7sus4 uses the bVII and the sus triad the text points to. The diminished seventh walks its four triads.' `
  "Cada tipo de acorde sobre C, con las tr${i}ades inferiores escritas. El 7sus4 usa el bVII y la tr${i}ada sus. La s${e}ptima disminuida recorre sus cuatro tr${i}ades." `
  $low

# --- upper structures, pentatonics on chords, families ---
function Family-Chord([string]$scaleName) {
  switch -Regex ($scaleName.Trim()) {
    '^Ionian$' { return 'Cmaj7' }
    '^Lydian$' { return 'Cmaj7' }
    '^Mixolydian sus 4$' { return 'C7sus' }
    '^Mixolydian$' { return 'C7' }
    '^Lydian b7$' { return 'C7' }
    '^Altered$' { return 'C7alt' }
    '^Half-whole$' { return 'C7' }
    '^Whole tone$' { return 'C7' }
    '^Mixolydian b9 b13$' { return 'C7' }
    '^Melodic minor$' { return 'Cm6' }
    '^Harmonic minor$' { return 'CmMaj7' }
    '^Dorian$' { return 'Cm7' }
    '^Aeolian$' { return 'Cm7' }
    '^Phrygian$' { return 'Cm7' }
    '^Locrian$' { return 'Cm7b5' }
    'Locrian' { return 'Cm7b5' }
    '^Whole-half$' { return 'Cdim7' }
    '^Lydian augmented$' { return 'Cmaj7#5' }
    '^Ionian augmented$' { return 'Cmaj7#5' }
    default { throw "scale [$scaleName]" }
  }
}
function Roman-List([string]$text) {
  $text = Clean-Degree $text
  $romanRx = '\(?(?:bb|b|#)?(?:VII|VI|IV|V|III|II|I)(?:Maj|sus4|-|\+|' + $degSign + ')?\)?'
  $found = [regex]::Matches($text, $romanRx)
  $out = @()
  foreach ($m in $found) {
    $tok = $m.Value.Trim('(', ')')
    $out += Roman-Root $tok
  }
  if ($out.Count -eq 0) { throw "no romans in $text" }
  return ,$out
}
function Pack-Triads($triads) {
  $cell = New-Object System.Collections.Generic.List[string]
  foreach ($tr in @($triads)) {
    foreach ($n in (Triad-Tokens $tr.root $tr.qual 'e')) { [void]$cell.Add($n) }
  }
  $out = New-Object System.Collections.Generic.List[string]
  if ($cell.Count -eq 0) { throw 'empty triads' }
  while ($out.Count + $cell.Count -le 16) {
    foreach ($n in $cell) { [void]$out.Add($n) }
  }
  if ($out.Count -eq 0) {
    foreach ($n in $cell) { if ($out.Count -lt 16) { [void]$out.Add($n) } }
  }
  return ,$out.ToArray()
}
$ustLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0026'].lines)) {
  $parts = Split-Caption $ln
  $scale = $parts.body
  $chord = Family-Chord $scale
  $after = $parts.cap
  $dash = $after.IndexOf($em)
  $romanText = if ($dash -ge 0) { $after.Substring($dash + 1) } else { $after }
  $triads = Roman-List $romanText
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add("^$chord")
  foreach ($noteTok in (Pack-Triads $triads)) { [void]$ev.Add($noteTok) }
  $cap = ($romanText.Trim())
  [void]$ustLines.Add((Ev-Line $ev.ToArray() 2 "$scale · $cap"))
}
Add-Staff 'more0026' 'upper-structure-triads-staff' 'pitch' 2 `
  'Upper structure triads on the staff' "Tr${i}ades de estructura superior en el pentagrama" `
  'Each upper structure from the list, spelled on a C chord of that scale. The triads repeat until the two bars are full.' `
  "Cada estructura superior de la lista, escrita sobre un acorde de C de esa escala. Las tr${i}ades se repiten hasta llenar los dos compases." `
  $ustLines.ToArray()

function Pent-BarNotes([string]$root) {
  $oct = 4
  if ((Parse-Root $root).pc -ge 8) { $oct = 3 }
  $up = Scale-Notes $root $MajPentSteps $oct 'e' -WithOctave
  $sixth = (Spell-At $root $MajPentSteps[4][1] $MajPentSteps[4][0] $oct) + 'e'
  $fifth = (Spell-At $root $MajPentSteps[3][1] $MajPentSteps[3][0] $oct) + 'e'
  return @($up + @($sixth, $fifth))
}
$pentOn = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0027'].lines)) {
  if ($ln -match 'none') { continue }
  $parts = Split-Caption $ln
  $scale = $parts.body
  $chord = Family-Chord $scale
  $romanText = ($parts.cap -split $em)[-1]
  $roots = @()
  foreach ($tr in (Roman-List $romanText)) { $roots += $tr.root }
  $bars = New-Object System.Collections.Generic.List[string]
  foreach ($r in $roots) { foreach ($noteTok in (Pent-BarNotes $r)) { [void]$bars.Add($noteTok) } }
  while ((($bars.Count) % 32) -ne 0) {
    foreach ($noteTok in (Pent-BarNotes $roots[0])) {
      if ((($bars.Count) % 32) -eq 0) { break }
      [void]$bars.Add($noteTok)
    }
  }
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add("^$chord")
  foreach ($noteTok in $bars) { [void]$ev.Add($noteTok) }
  [void]$pentOn.Add((Ev-Line $ev.ToArray() 4 $scale))
}
Add-Staff 'more0027' 'major-pentatonics-on-chords-staff' 'pitch' 4 `
  'Major pentatonics on chords on the staff' "Pentat${o}nicas mayores sobre acordes en el pentagrama" `
  'Every major pentatonic the text names, written on a C chord of that scale. A row marked none has no pentatonic to write, so it stays in the text exercise.' `
  "Cada pentat${o}nica mayor que el texto nombra, escrita sobre un acorde de C de esa escala. Una fila con none no tiene pentat${o}nica que escribir, y se queda en el ejercicio de texto." `
  $pentOn.ToArray()

# --- structures: tritonic, 7sus4, pentatonic, add2, add4, madd4 ---
function Structure-Events([string]$kind, [string]$root, [string]$chord, [string]$chord2) {
  $oct = Start-Oct $root
  $ev = New-Object System.Collections.Generic.List[string]
  if ($kind -eq 'Pent') {
    $degs = @('1', 'b3', '4', '5', 'b7')
    $letters = @(0, 2, 3, 4, 6)
    $semis = @(0, 3, 5, 7, 10)
    $asc = @()
    for ($k = 0; $k -lt 5; $k++) { $asc += (Spell-At $root $letters[$k] $semis[$k] $oct) + 'e' }
    $asc += (Spell-At $root 7 12 $oct) + 'e'
    $seq = @($asc)
    for ($k = 4; $k -ge 0; $k--) { $seq += (Spell-At $root $letters[$k] $semis[$k] $oct) + 'e' }
    $notes = @()
    $i = 0
    while ($notes.Count -lt 16) { $notes += $seq[$i % $seq.Count]; $i++ }
    [void]$ev.Add("^$chord")
    if ($chord2) {
      foreach ($n in $notes[0..7]) { [void]$ev.Add($n) }
      [void]$ev.Add("^$chord2")
      foreach ($n in $notes[8..15]) { [void]$ev.Add($n) }
    }
    else { foreach ($n in $notes) { [void]$ev.Add($n) } }
    return ,$ev.ToArray()
  }
  $degs = switch ($kind) {
    'Tritonic' { @('1', '4', '5', '1') }
    '7sus4' { @('1', '4', '5', 'b7') }
    'add2' { @('1', '2', '3', '5') }
    'add4' { @('1', '3', '4', '5') }
    'madd4' { @('1', 'b3', '4', '5') }
    default { throw $kind }
  }
  $fwd = @()
  foreach ($d in $degs) {
    if ($d -eq '1' -and $fwd.Count -eq 3 -and $kind -eq 'Tritonic') {
      $fwd += (Spell-At $root 7 12 $oct) + 'q'
    }
    else { $fwd += (Tone $root $d $oct 'q') }
  }
  [void]$ev.Add("^$chord")
  foreach ($n in $fwd) { [void]$ev.Add($n) }
  $backChord = if ($chord2) { $chord2 } else { $chord }
  [void]$ev.Add("^$backChord")
  for ($k = $fwd.Count - 1; $k -ge 0; $k--) { [void]$ev.Add($fwd[$k]) }
  return ,$ev.ToArray()
}
function Add-Structure-Set([string]$id, [string]$slug, [string]$nameEn, [string]$nameEs, [string]$descEn, [string]$descEs) {
  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($ln in @($byId[$id].lines)) {
    $parts = Split-Caption $ln
    $leftBits = @($parts.body -split '\s+')
    $kind = $leftBits[0]
    $roman = $leftBits[1]
    $family = ($parts.cap -split $em)[0].Trim()
    $info = Roman-Root $roman
    $chord = 'Cmaj7'
    $chord2 = ''
    if ($family -eq 'Maj7 Ionian' -or $family -eq 'Maj7 Lydian') { $chord = 'Cmaj7' }
    elseif ($family -eq 'Min7 Dorian / Dom7 Mixolydian') { $chord = 'Cm7'; $chord2 = 'C7' }
    elseif ($family -eq 'Half-dim Locrian') { $chord = 'Cm7b5' }
    elseif ($family -eq 'Altered') { $chord = 'C7alt' }
    elseif ($family -eq 'Min7 Dorian') { $chord = 'Cm7' }
    elseif ($family -eq 'Dom7 Mixolydian') { $chord = 'C7' }
    else { throw "family $family" }
    $cap = "$kind $($info.root) · $family"
    [void]$lines.Add((Ev-Line (Structure-Events $kind $info.root $chord $chord2) 2 $cap))
  }
  Add-Staff $id $slug 'pitch' 2 $nameEn $nameEs $descEn $descEs $lines.ToArray()
}
Add-Structure-Set 'more0030' 'tritonic-structures-staff' `
  'Tritonic, 7sus4, pentatonic on the staff' "Trit${o}nico, 7sus4, pentat${o}nica en el pentagrama" `
  'Each named structure spelled from its degree on a C chord. Tritonic is 1-4-5, 7sus4 adds the flat 7, and pentatonic is the minor pentatonic. Where the text pairs Dorian and Mixolydian, bar 1 is Cm7 and bar 2 is C7.' `
  "Cada estructura nombrada, escrita desde su grado sobre un acorde de C. Trit${o}nico es 1-4-5, 7sus4 suma la 7a bemol, y pentat${o}nica es la pentat${o}nica menor. Donde el texto junta d${o}rico y mixolidio, el comp${a}s 1 es Cm7 y el 2 es C7."

Add-Structure-Set 'more0031' 'add-colors-staff' `
  'add2, add4, madd4 on the staff' 'add2, add4, madd4 en el pentagrama' `
  'add2 is 1-2-3-5, add4 is 1-3-4-5, and madd4 is 1-b3-4-5, each spelled from the named degree on a C chord.' `
  "add2 es 1-2-3-5, add4 es 1-3-4-5, y madd4 es 1-b3-4-5, cada una escrita desde el grado nombrado sobre un acorde de C."

. (Join-Path $PSScriptRoot 'staff-more-c.ps1')
