# Continuation of tools/staff-more.ps1. Dot-sourced from staff-more-b.ps1.

function New-Rests([int]$n) {
  $s = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $n; $i++) { [void]$s.Add('re') }
  return ,$s
}

function Place-Notes($slots, [int]$at, [string[]]$notes) {
  for ($k = 0; $k -lt $notes.Count; $k++) {
    $i = $at + $k
    if ($i -lt 0 -or $i -ge $slots.Count) { throw "place $i of $($slots.Count)" }
    $slots[$i] = $notes[$k]
  }
}

# --- where a phrase starts and ends ---
$placeEighth = @{
  'beat 1' = 0; 'beat 2' = 2; 'beat 3' = 4; 'beat 4' = 6
  'and of 1' = 1; 'and of 2' = 3; 'and of 4' = 7
  'anywhere' = 2
}
$phraseLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0033'].lines)) {
  $parts = Split-Caption $ln
  $startName = $parts.body -replace '^Start on ', '' -replace '^Start ', ''
  $endName = $parts.cap -replace '^end on ', ''
  if ($endName -match '^\d$') { $endName = "beat $endName" }
  if ($startName -match '^\d$') { $startName = "beat $startName" }
  if (-not $placeEighth.ContainsKey($startName)) { throw "start $startName" }
  if (-not $placeEighth.ContainsKey($endName)) { throw "end $endName" }
  $startAt = 8 + $placeEighth[$startName]
  $endAt = 16 + $placeEighth[$endName]
  if ($endAt -lt $startAt + 4) { $endAt += 8 }
  $slots = New-Rests 32
  $slots[$startAt] = 'C4e'
  foreach ($pre in @(
      @{ at = ($endAt - 3); note = 'D4e' },
      @{ at = ($endAt - 2); note = 'E4e' },
      @{ at = ($endAt - 1); note = 'G4e' }
    )) {
    $at = [int]$pre.at
    if ($at -gt $startAt -and $at -lt $endAt -and $slots[$at] -eq 're') { $slots[$at] = [string]$pre.note }
  }
  $slots[$endAt] = 'C5e'
  [void]$phraseLines.Add((Ev-Line $slots.ToArray() 4 $ln))
}
Add-Staff 'more0033' 'phrase-start-end-staff' 'rhythm' 4 `
  'Phrase start and end on the staff' 'Inicio y final de frase en el pentagrama' `
  'One written phrase per cue. C-D-E-G leads to C5. The first note is on the start beat and C5 is on the end beat, inside four bars.' `
  "Una frase escrita por consigna. C-D-E-G llega a C5. La primera nota cae en el tiempo de entrada y C5 en el tiempo de llegada, dentro de cuatro compases." `
  $phraseLines.ToArray()

# --- four-note cells, forward and back ---
$cellLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0035'].lines)) {
  $parts = Split-Caption $ln
  $degs = @($parts.body.Trim() -split '\s+')
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($d in $degs) {
    if (-not $cNote.ContainsKey($d)) { throw "cell degree $d" }
    [void]$ev.Add($cNote[$d] + 'q')
  }
  for ($k = $degs.Count - 1; $k -ge 0; $k--) { [void]$ev.Add($cNote[$degs[$k]] + 'q') }
  [void]$cellLines.Add((Ev-Line $ev.ToArray() 2 $parts.cap))
}
Add-Staff 'more0035' 'alt-four-note-cells-staff' 'pitch' 2 `
  'Four-note cells on the staff' "C${e}lulas de cuatro notas en el pentagrama" `
  'Each cell written in C. Bar 1 is the cell. Bar 2 is the cell backwards.' `
  "Cada c${e}lula escrita en C. El comp${a}s 1 es la c${e}lula. El comp${a}s 2 es la c${e}lula al rev${e}s." `
  $cellLines.ToArray()

# --- dominant pentatonic grid ---
$pentRoot = @{
  '1' = 'C'; '2' = 'D'; 'b3' = 'Eb'; '3' = 'E'; '4' = 'F'; 'b5' = 'Gb'
  '5' = 'G'; 'b6' = 'Ab'; '6' = 'A'; 'b7' = 'Bb'; '7' = 'B'; 'b2' = 'Db'
}
$domPent = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0036'].lines)) {
  $deg = (Split-Caption $ln).body -replace '^Maj pent on ', ''
  if (-not $pentRoot.ContainsKey($deg)) { throw "pent deg $deg" }
  $bar = New-Object System.Collections.Generic.List[string]
  foreach ($chunk in @(Pent-BarNotes $pentRoot[$deg])) {
    foreach ($noteTok in @($chunk)) { [void]$bar.Add([string]$noteTok) }
  }
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add('^C7')
  foreach ($rep in 1..2) { foreach ($noteTok in $bar) { [void]$ev.Add($noteTok) } }
  [void]$domPent.Add((Ev-Line $ev.ToArray() 2 "Maj pent on $deg"))
}
Add-Staff 'more0036' 'dom-pentatonic-grid-staff' 'pitch' 2 `
  'Dominant pentatonic grid on the staff' "Rejilla de pentat${o}nicas dominantes en el pentagrama" `
  'The major pentatonic from each degree, written over C7. One bar of the scale, then the same bar again.' `
  "La pentat${o}nica mayor desde cada grado, escrita sobre C7. Un comp${a}s de la escala, y el mismo comp${a}s otra vez." `
  $domPent.ToArray()

# --- three-note pentatonic cells ---
$pentPitch = @{ '1' = 'C4'; '2' = 'D4'; '3' = 'E4'; '5' = 'G4'; '6' = 'A4' }
$pentDown = @{
  '3 2 1' = @('E4', 'D4', 'C4')
  '5 3 2' = @('G4', 'E4', 'D4')
  '6 5 3' = @('A4', 'G4', 'E4')
  '1 6 5' = @('C5', 'A4', 'G4')
  '2 1 6' = @('D5', 'C5', 'A4')
}
$pentUp = @{
  '5 6 1' = @('G4', 'A4', 'C5')
  '6 1 2' = @('A4', 'C5', 'D5')
  '3 6 1' = @('E4', 'A4', 'C5')
  '5 1 2' = @('G4', 'C5', 'D5')
  '6 2 3' = @('A4', 'D5', 'E5')
}
$pent3 = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0037'].lines)) {
  $formula = (Split-Caption $ln).body.Trim()
  if ($pentDown.ContainsKey($formula)) { $notes = $pentDown[$formula] }
  elseif ($pentUp.ContainsKey($formula)) { $notes = $pentUp[$formula] }
  else {
    $notes = @()
    foreach ($d in ($formula -split '\s+')) { $notes += $pentPitch[$d] }
  }
  $ev = New-Object System.Collections.Generic.List[string]
  while ($ev.Count -lt 16) {
    foreach ($noteTok in $notes) {
      if ($ev.Count -ge 16) { break }
      [void]$ev.Add($noteTok + 'e')
    }
  }
  [void]$pent3.Add((Ev-Line $ev.ToArray() 2 $formula))
}
Add-Staff 'more0037' 'pentatonic-three-note-staff' 'pitch' 2 `
  'Pentatonic three-note cells on the staff' "C${e}lulas pentat${o}nicas de tres notas en el pentagrama" `
  'Each three-note cell of the C major pentatonic, written and repeated through two bars. Downward cells descend.' `
  "Cada c${e}lula de tres notas de la pentat${o}nica mayor de C, escrita y repetida en dos compases. Las c${e}lulas descendentes bajan." `
  $pent3.ToArray()

# --- chromatic approaches ---
function Below-Note([string]$pitch) {
  $map = @{
    'C4' = 'B3'; 'E4' = 'D#4'; 'G4' = 'F#4'; 'B4' = 'A#4'
    'D4' = 'C#4'; 'F4' = 'E4'; 'A4' = 'G#4'; 'C5' = 'B4'
    'D5' = 'C#5'; 'F5' = 'E5'
  }
  if (-not $map.ContainsKey($pitch)) { throw "below $pitch" }
  return $map[$pitch]
}
function Approach-Beats([string]$chord, [string]$target, [string]$cap, [string]$where) {
  $below = Below-Note $target
  $ev = New-Object System.Collections.Generic.List[string]
  if ($where -eq 'both') {
    foreach ($rep in 1..2) {
      [void]$ev.Add($below + 'e')
      [void]$ev.Add("^$chord")
      [void]$ev.Add($target + 'q')
      [void]$ev.Add('re')
      [void]$ev.Add($below + 'e')
      [void]$ev.Add($target + 'q')
      [void]$ev.Add('re')
    }
  }
  elseif ($where -eq 'beat1') {
    foreach ($tok in @('rq', 'rq', 'rq', 're')) { [void]$ev.Add($tok) }
    [void]$ev.Add($below + 'e')
    [void]$ev.Add("^$chord")
    [void]$ev.Add($target + 'q')
    foreach ($tok in @('rq', 'rq', 'rq')) { [void]$ev.Add($tok) }
  }
  else {
    foreach ($rep in 1..2) {
      [void]$ev.Add('rq')
      [void]$ev.Add('re')
      [void]$ev.Add($below + 'e')
      [void]$ev.Add("^$chord")
      [void]$ev.Add($target + 'q')
      [void]$ev.Add('rq')
    }
  }
  return Ev-Line $ev.ToArray() 2 $cap
}
$toneOf = @{
  'Cmaj7' = @{ '1' = 'C4'; '3' = 'E4'; '5' = 'G4'; '7' = 'B4' }
  'Dm7' = @{ '1' = 'D4'; '3' = 'F4'; '5' = 'A4'; '7' = 'C5' }
  'G7' = @{ '1' = 'G4'; '3' = 'B4'; '5' = 'D5'; 'b7' = 'F5' }
}
$chromLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0038'].lines)) {
  $parts = Split-Caption $ln
  $cue = $parts.body
  $chord = $parts.cap
  if ($chord -eq 'any chord') { $chord = 'Cmaj7'; $cap = $ln }
  else { $cap = $ln }
  if ($cue -match '^to (b?7|[1357]) from below$') {
    $deg = $Matches[1]
    [void]$chromLines.Add((Approach-Beats $chord $toneOf[$chord][$deg] $cap 'both'))
  }
  elseif ($cue -match '^to ([37]) on beat ([13])$') {
    $deg = $Matches[1]
    $where = if ($Matches[2] -eq '1') { 'beat1' } else { 'beat3' }
    [void]$chromLines.Add((Approach-Beats 'Cmaj7' $toneOf['Cmaj7'][$deg] $cap $where))
  }
  else { throw "approach $ln" }
}
Add-Staff 'more0038' 'chromatic-lower-approach-staff' 'changes' 2 `
  'Chromatic approach from below on the staff' "Aproximaci${o}n crom${a}tica desde abajo en el pentagrama" `
  'The note a half step under the chord tone is written on the eighth before it. Targets on beats 1 and 3, or on the single beat the cue names. Lines marked for any chord are written on Cmaj7.' `
  "La nota un semitono bajo la nota del acorde est${a} escrita en la corchea anterior. Los objetivos caen en los tiempos 1 y 3, o en el tiempo que nombra la consigna. Las l${i}neas para cualquier acorde est${a}n escritas sobre Cmaj7." `
  $chromLines.ToArray()

function Double-Into([string]$first, [string]$second, [string]$target, [string]$chord, [string]$cap) {
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($tok in @('rh', 'rq', ($first + 'e'), ($second + 'e'), "^$chord", ($target + 'q'), 'rq', 'rq', 'rq')) {
    [void]$ev.Add([string]$tok)
  }
  return Ev-Line $ev.ToArray() 2 $cap
}
$dbl = New-Object System.Collections.Generic.List[string]
$dblMap = @{
  'from below into 1' = @('Bb3', 'B3', 'C4', 'Cmaj7')
  'from below into 3' = @('D4', 'D#4', 'E4', 'Cmaj7')
  'from below into 5' = @('F4', 'F#4', 'G4', 'Cmaj7')
  'from below into 7' = @('A4', 'A#4', 'B4', 'Cmaj7')
  'from above into 1' = @('D4', 'Db4', 'C4', 'Cmaj7')
  'from above into 3' = @('F#4', 'F4', 'E4', 'Cmaj7')
  'from above into 5' = @('A4', 'Ab4', 'G4', 'Cmaj7')
  'from above into 7' = @('C#5', 'C5', 'B4', 'Cmaj7')
  'below into 3 of Dom7' = @('A4', 'A#4', 'B4', 'G7')
  'above into 3 of Dom7' = @('C#5', 'C5', 'B4', 'G7')
  'below into b7 of Dom7' = @('Eb4', 'E4', 'F4', 'G7')
  'above into b7 of Dom7' = @('G4', 'Gb4', 'F4', 'G7')
  'below into 3 of Min7' = @('Eb4', 'E4', 'F4', 'Dm7')
  'above into 3 of Min7' = @('G4', 'Gb4', 'F4', 'Dm7')
  'mix above then below into 1' = @('D4', 'B3', 'C4', 'Cmaj7')
  'mix below then above into 1' = @('B3', 'D4', 'C4', 'Cmaj7')
}
foreach ($ln in @($byId['more0039'].lines)) {
  $key = $ln.Trim()
  if (-not $dblMap.ContainsKey($key)) { throw "double $key" }
  $row = $dblMap[$key]
  [void]$dbl.Add((Double-Into $row[0] $row[1] $row[2] $row[3] $key))
}
Add-Staff 'more0039' 'double-chromatic-approach-staff' 'changes' 2 `
  'Double chromatic approach on the staff' "Aproximaci${o}n crom${a}tica doble en el pentagrama" `
  'Two chromatic notes, then the chord tone on the next downbeat. The mix lines put one note from above and one from below before C.' `
  "Dos notas crom${a}ticas, y luego la nota del acorde en el siguiente tiempo fuerte. Las l${i}neas mixtas ponen una nota desde arriba y una desde abajo antes de C." `
  $dbl.ToArray()

# --- line deflection ---
$defl = @(
  (Ev-Line @('C4e', 'D4e', 'E4e', 'F4e', 'G4e', 'A4e', 'E4q', '^Cmaj7', 'C5q', 'rq', 'rq', 'rq') 2 'Aim at 1'),
  (Ev-Line @('D4e', 'E4e', 'F4e', 'G4e', 'A4e', 'B4e', 'F#4q', '^Cmaj7', 'E5q', 'rq', 'rq', 'rq') 2 'Aim at 3'),
  (Ev-Line @('E4e', 'F4e', 'G4e', 'A4e', 'B4e', 'C5e', 'G4q', '^Cmaj7', 'G5q', 'rq', 'rq', 'rq') 2 'Aim at 5'),
  (Ev-Line @('F4e', 'G4e', 'A4e', 'B4e', 'C5e', 'D5e', 'A4q', '^Cmaj7', 'B4q', 'rq', 'rq', 'rq') 2 'Aim at 7'),
  (Ev-Line @('C4e', 'D4e', 'E4e', 'F4e', 'G4e', 'A4e', 'B4e', 'G4e', '^Cmaj7', 'E5q', 'rq', 'rq', 'rq') 2 'Scale up into 3'),
  (Ev-Line @('C5e', 'B4e', 'A4e', 'G4e', 'F4e', 'E4e', 'D4e', 'B4e', '^Cmaj7', 'C5q', 'rq', 'rq', 'rq') 2 'Scale down into 1'),
  (Ev-Line @('D#4e', 'E4e', 'F4e', 'F#4e', 'G4e', 'G#4e', 'A4e', 'C4e', '^Cmaj7', 'G4q', 'rq', 'rq', 'rq') 2 'Chromatic into 5'),
  (Ev-Line @('C4e', 'E4e', 'G4e', 'C5e', 'E5e', 'G5e', 'C6e', 'G4e', '^Cmaj7', 'B4q', 'rq', 'rq', 'rq') 2 'Arpeggio into 7'),
  (Ev-Line @('C4e', 'D4e', 'E4e', 'F4e', 'G4e', 'A4e', 'F4q', '^Cmaj7', 'C5q', 'rq', 'rq', 'rq') 2 'Deflect by a 3rd'),
  (Ev-Line @('C4e', 'D4e', 'E4e', 'F4e', 'G4e', 'A4e', 'D4q', '^Cmaj7', 'C5q', 'rq', 'rq', 'rq') 2 'Deflect by a 5th'),
  (Ev-Line @('C4e', 'D4e', 'E4e', 'F4e', 'G4e', 'A4e', 'A3q', '^Cmaj7', 'C5q', 'rq', 'rq', 'rq') 2 'Deflect by an octave')
)
Add-Staff 'more0040' 'line-deflection-staff' 'changes' 2 `
  'Line deflection on the staff' "Desv${i}o de la l${i}nea en el pentagrama" `
  'A scale or arpeggio aims at a chord tone of Cmaj7, then the last beat leaps away and the next bar resolves. Leap sizes are a 3rd, a 5th, and an octave. The 4th leap is the line that aims at 1.' `
  "Una escala o un arpegio apunta a una nota de Cmaj7, el ${u}ltimo tiempo salta y el comp${a}s siguiente resuelve. Los saltos son de 3a, de 5a y de octava. El salto de 4a es la l${i}nea que apunta al 1." `
  $defl

# --- rhythmic displacement ---
$dispCell = @('C4e', 'D4e', 'E4e', 'G4e')
function Shift-Line([int]$shift, [string[]]$cell, [string]$cap) {
  $slots = New-Rests 32
  Place-Notes $slots $shift $cell
  Place-Notes $slots ($shift + 16) $cell
  return Ev-Line $slots.ToArray() 4 $cap
}
$disp = New-Object System.Collections.Generic.List[string]
[void]$disp.Add((Shift-Line 0 $dispCell 'Start on beat 1'))
[void]$disp.Add((Shift-Line 1 $dispCell 'Shift +1 eighth'))
[void]$disp.Add((Shift-Line 2 $dispCell 'Shift +2 eighths'))
[void]$disp.Add((Shift-Line 3 $dispCell 'Shift +3 eighths'))
[void]$disp.Add((Shift-Line 4 $dispCell 'Shift +4 eighths'))
[void]$disp.Add((Shift-Line 5 $dispCell 'Shift +5 eighths'))
[void]$disp.Add((Shift-Line 6 $dispCell 'Shift +6 eighths'))
[void]$disp.Add((Shift-Line 7 $dispCell 'Shift +7 eighths'))
[void]$disp.Add((Shift-Line 1 @('C4e', 'D4e') 'Displace a 2-note cell'))
[void]$disp.Add((Shift-Line 1 @('C4e', 'D4e', 'E4e') 'Displace a 3-note cell'))
$both = New-Rests 32
Place-Notes $both 0 $dispCell
Place-Notes $both 18 $dispCell
[void]$disp.Add((Ev-Line $both.ToArray() 4 'Displace a 4-note cell'))
[void]$disp.Add((Ev-Line @('rq', 'rq', 'rq', 'C4q', 'D4q', 'E4q', 'G4q', 'rq', 'rq', 'rq', 'rq', 'C4q', 'D4q', 'E4q', 'G4q', 'rq') 4 'Displace across the barline'))
$back = New-Rests 32
Place-Notes $back 0 $dispCell
Place-Notes $back 15 $dispCell
[void]$disp.Add((Ev-Line $back.ToArray() 4 'Backwards shift one eighth'))
$held = New-Rests 32
Place-Notes $held 0 @('C4e', 'C4e', 'C4e', 'C4e')
Place-Notes $held 17 @('C4e', 'C4e', 'C4e', 'C4e')
[void]$disp.Add((Ev-Line $held.ToArray() 4 'Hold pitch, move only the rhythm'))
Add-Staff 'more0041' 'rhythmic-displacement-staff' 'rhythm' 4 `
  'Rhythmic displacement on the staff' "Desplazamiento r${i}tmico en el pentagrama" `
  'The cell C-D-E-G written on each eighth-note shift, then a 2-note cell, a 3-note cell, the cell moved from beat 1 to the and of 1 in the next half, quarters across the barline, a pull onto the and of 4, and the same rhythm on one pitch.' `
  "La c${e}lula C-D-E-G escrita en cada desplazamiento de corchea, luego una c${e}lula de 2 notas, una de 3, la c${e}lula movida del tiempo 1 a la parte d${e}bil del 1 en la mitad siguiente, negras a trav${e}s de la barra, un tir${o}n a la parte d${e}bil del 4, y el mismo ritmo en un solo sonido." `
  $disp.ToArray()

# --- quartal lines ---
$quart = @(
  (Ev-Line @('C4q', 'F4q', 'Bb4q', 'Eb5q', 'Ab5q', 'Db6q', 'Gb6q', 'Cb7q') 2 'Stacked 4ths ascending'),
  (Ev-Line @('Cb7q', 'Gb6q', 'Db6q', 'Ab5q', 'Eb5q', 'Bb4q', 'F4q', 'C4q') 2 'Stacked 4ths descending'),
  (Ev-Line @('C4q', 'F4q', 'Ab4q', 'Db5q', 'E5q', 'A5q', 'C6q', 'F6q') 2 '4th then 3rd'),
  (Ev-Line @('C4q', 'E4q', 'A4q', 'Db5q', 'F#5q', 'Bb5q', 'D6q', 'G6q') 2 '3rd then 4th'),
  (Ev-Line @('^C7', 'C4q', 'F4q', 'Bb4q', 'Eb5q', 'Ab5q', 'Db6q', 'Gb6q', 'Cb7q') 2 '4ths only on Dom7'),
  (Ev-Line @('^Cmaj7', 'E4q', 'A4q', 'D5q', 'G5q', 'C6q', 'F6q', 'Bb6q', 'Eb7q') 2 '4ths only on Maj7'),
  (Ev-Line @('^Cm7', 'Bb3q', 'Eb4q', 'Ab4q', 'Db5q', 'Gb5q', 'Cb6q', 'Fb6q', 'A6q') 2 '4ths only on Min7'),
  (Ev-Line @('^Cm7b5', 'Gb3q', 'Cb4q', 'Fb4q', 'A4q', 'D5q', 'G5q', 'C6q', 'F6q') 2 '4ths only on Min7b5'),
  (Ev-Line @('C4q', 'F4q', 'C4q', 'F4q', 'D4q', 'G4q', 'D4q', 'G4q') 2 'Alternate 4th up / 4th down'),
  (Ev-Line @('C4q', 'F4q', 'Bb4q', 'C5q', 'F4q', 'Bb4q', 'Eb5q', 'F5q') 2 'Two 4ths then a step'),
  (Ev-Line @('C4e', 'F4e', 'Bb4e', 'F4e', 'Bb4e', 'Eb5e', 'Bb4e', 'Eb5e', 'Ab4e', 'Db5e', 'Gb5e', 'Db5e', 'Gb5e', 'Cb6e', 'Gb5e', 'Cb6e') 2 'Quartal triad shapes'),
  (Ev-Line @('C4q', 'F4q', 'Bb4q', 'Eb5q', '^Cmaj7', 'E4q', 'rq', 'rq', 'rq') 2 'Quartal into a chord tone')
)
Add-Staff 'more0042' 'quartal-lines-staff' 'pitch' 2 `
  'Quartal lines on the staff' "L${i}neas por cuartas en el pentagrama" `
  'Fourths written out: up, down, fourth then third, third then fourth, from the root of C7, from E of Cmaj7, from Bb of Cm7, and from Gb of Cm7b5. Each pair that alternates is up a fourth and back. The last line resolves to E.' `
  "Cuartas escritas: hacia arriba, hacia abajo, cuarta y luego tercera, tercera y luego cuarta, desde la fundamental de C7, desde el E de Cmaj7, desde el Bb de Cm7 y desde el Gb de Cm7b5. Cada par que alterna sube una cuarta y vuelve. La ${u}ltima l${i}nea resuelve al E." `
  $quart

# --- inverted interval motifs ---
function Midi-E([int]$midi) {
  $pc = (($midi % 12) + 12) % 12
  $names = @('C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B')
  $oct = [int][math]::Floor($midi / 12) - 1
  if ($oct -lt 3 -or $oct -gt 6) { throw "midi $midi oct $oct" }
  return "$($names[$pc])${oct}e"
}
function Delta-Line([int]$start, [int]$up, [int]$down, [string]$cap) {
  $ev = New-Object System.Collections.Generic.List[string]
  $m = $start
  [void]$ev.Add((Midi-E $m))
  for ($i = 0; $i -lt 15; $i++) {
    if ($i % 2 -eq 0) { $m += $up } else { $m += $down }
    [void]$ev.Add((Midi-E $m))
  }
  return Ev-Line $ev.ToArray() 2 $cap
}
$inv = @(
  (Ev-Line @('C4e', 'E4e', 'G4e', 'B4e', 'D5e', 'F5e', 'A5e', 'C6e', 'C6e', 'A5e', 'F5e', 'D5e', 'B4e', 'G4e', 'E4e', 'C4e') 2 'Up 3rd / down 3rd'),
  (Ev-Line @('C6e', 'A5e', 'F5e', 'D5e', 'B4e', 'G4e', 'E4e', 'C4e', 'C4e', 'E4e', 'G4e', 'B4e', 'D5e', 'F5e', 'A5e', 'C6e') 2 'Down 3rd / up 3rd'),
  (Ev-Line @('C4e', 'F4e', 'Bb4e', 'Eb5e', 'Ab5e', 'Db6e', 'Gb6e', 'Cb7e', 'Cb7e', 'Gb6e', 'Db6e', 'Ab5e', 'Eb5e', 'Bb4e', 'F4e', 'C4e') 2 'Up 4th / down 4th'),
  (Ev-Line @('Cb7e', 'Gb6e', 'Db6e', 'Ab5e', 'Eb5e', 'Bb4e', 'F4e', 'C4e', 'C4e', 'F4e', 'Bb4e', 'Eb5e', 'Ab5e', 'Db6e', 'Gb6e', 'Cb7e') 2 'Down 4th / up 4th'),
  (Delta-Line 60 7 -3 'Up 5th / down 3rd'),
  (Delta-Line 84 -7 3 'Down 5th / up 3rd'),
  (Ev-Line @('C4e', 'G4e', 'C4e', 'G4e', 'C4e', 'G4e', 'C4e', 'G4e', 'D4e', 'A4e', 'D4e', 'A4e', 'D4e', 'A4e', 'D4e', 'A4e') 2 'Up 5th / down 5th'),
  (Ev-Line @('G4e', 'C4e', 'G4e', 'C4e', 'G4e', 'C4e', 'G4e', 'C4e', 'A4e', 'D4e', 'A4e', 'D4e', 'A4e', 'D4e', 'A4e', 'D4e') 2 'Down 5th / up 5th'),
  (Ev-Line @('C4e', 'A4e', 'D4e', 'B4e', 'E4e', 'C5e', 'F4e', 'D5e', 'C5e', 'B4e', 'A4e', 'G4e', 'F4e', 'E4e', 'D4e', 'C4e') 2 'Up 6th / down 2nd'),
  (Ev-Line @('A4e', 'C4e', 'B4e', 'D4e', 'C5e', 'Eb4e', 'D5e', 'F4e', 'F4e', 'G4e', 'A4e', 'B4e', 'C5e', 'D5e', 'E5e', 'F5e') 2 'Down 6th / up 2nd'),
  (Ev-Line @('C4e', 'C5e', 'D4e', 'D5e', 'E4e', 'E5e', 'F4e', 'F5e', 'E5e', 'D5e', 'C5e', 'B4e', 'A4e', 'G4e', 'F4e', 'E4e') 2 'Up octave / down step'),
  (Ev-Line @('C5e', 'C4e', 'D5e', 'D4e', 'E5e', 'E4e', 'F5e', 'F4e', 'G4e', 'A4e', 'B4e', 'C5e', 'D5e', 'E5e', 'F5e', 'G5e') 2 'Down octave / up step')
)
Add-Staff 'more0043' 'inverted-interval-motifs-staff' 'pitch' 2 `
  'Inverted interval motifs on the staff' 'Motivos de intervalos invertidos en el pentagrama' `
  'Each pair written in one direction and then the other: 3rds, 4ths, 5ths against 3rds, 5ths, 6ths against 2nds, and octaves against steps.' `
  "Cada par escrito en una direcci${o}n y luego en la otra: 3as, 4as, 5as contra 3as, 5as, 6as contra 2as, y octavas contra grados conjuntos." `
  $inv

# --- altered hexatonic pairs ---
function Triad-Quarters([string]$root, [string]$qual) {
  $oct = Start-Oct $root
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($d in (Triad-Degrees $qual)) { [void]$list.Add((Tone $root $d $oct 'q')) }
  [void]$list.Add((Spell-At $root 7 12 $oct) + 'q')
  return ,$list
}
function Add-Triad($list, [string]$root, [string]$qual) {
  foreach ($chunk in @(Triad-Quarters $root $qual)) {
    foreach ($n in @($chunk)) { [void]$list.Add([string]$n) }
  }
}
function Pair-Line([string]$left, [string]$right, [string]$chord, [string]$cap) {
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add("^$chord")
  Add-Triad $ev $left 'M'
  Add-Triad $ev $right 'M'
  return Ev-Line $ev.ToArray() 2 $cap
}
$hex = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0044'].lines)) {
  $parts = Split-Caption $ln
  $names = @($parts.body -split '/')
  [void]$hex.Add((Pair-Line $names[0].Trim() $names[1].Trim() 'C7' $parts.body))
}
Add-Staff 'more0044' 'altered-hexatonic-pairs-staff' 'pitch' 2 `
  'Altered hexatonic pairs on the staff' "Pares hexat${o}nicos alterados en el pentagrama" `
  'Both major triads of the pair, one bar each, over C7.' `
  "Las dos tr${i}ades mayores del par, un comp${a}s cada una, sobre C7." `
  $hex.ToArray()

# --- keep the rhythm or keep the pitches ---
$vocab = @(
  (Ev-Line @('C4q.', 'E4e', 'G4q', 'A4q', 'G4e', 'E4e', 'D4q', 'C4h', 'C4q.', 'E4e', 'G4q', 'A4q', 'G4e', 'E4e', 'D4q', 'C4h') 4 'Same pitches, new rhythm'),
  (Ev-Line @('F4q', 'A4q', 'C5e', 'D5e', 'C5q', 'A4q', 'G4q', 'F4h', 'F4q', 'A4q', 'C5e', 'D5e', 'C5q', 'A4q', 'G4q', 'F4h') 4 'Same rhythm, new pitches'),
  (Ev-Line @('C4h', 'E4h', 'G4q', 'A4q', 'G4h', 'E4h', 'D4h', 'C4w') 4 'Half-time rhythm'),
  (Ev-Line (@('C4e', 'E4e', 'G4e', 'A4e', 'G4e', 'E4e', 'D4e', 'C4e') * 4) 4 'Double-time rhythm'),
  (Ev-Line @('D4q', 'F#4q', 'A4e', 'B4e', 'A4q', 'F#4q', 'E4q', 'D4h', 'D4q', 'F#4q', 'A4e', 'B4e', 'A4q', 'F#4q', 'E4q', 'D4h') 4 'Sequence up a step'),
  (Ev-Line @('Bb3q', 'D4q', 'F4e', 'G4e', 'F4q', 'D4q', 'C4q', 'Bb3h', 'Bb3q', 'D4q', 'F4e', 'G4e', 'F4q', 'D4q', 'C4q', 'Bb3h') 4 'Sequence down a step'),
  (Ev-Line @('rq', 'C4q', 'E4q', 'G4e', 'A4e', 'G4q', 'E4q', 'D4q', 'C4q', 'rq', 'C4q', 'E4q', 'G4e', 'A4e', 'G4q', 'E4q', 'D4q', 'C4q') 4 'Start on beat 2'),
  (Ev-Line @('rq', 'rq', 'rq', 're', 'C4e', 'E4q', 'G4e', 'A4e', 'G4q', 'E4q', 'D4q', 'C4h', 'rq', 'rq', 'rq', 'rq') 4 'Start on the and of 4'),
  (Ev-Line @('C5q', 'Ab4q', 'F4e', 'Eb4e', 'F4q', 'Ab4q', 'Bb4q', 'C5h', 'C5q', 'Ab4q', 'F4e', 'Eb4e', 'F4q', 'Ab4q', 'Bb4q', 'C5h') 4 'Opposite contour'),
  (Ev-Line @("C4q'", "E4q'", "G4e'", "A4e'", "G4q'", "E4q'", "D4q'", "C4h'", "C4q'", "E4q'", "G4e'", "A4e'", "G4q'", "E4q'", "D4q'", "C4h'") 4 'Staccato'),
  (Ev-Line @('F4q', 'C5q', 'B4e', 'F4e', 'B4q', 'E4q', 'B4q', 'E4h', 'F4q', 'C5q', 'B4e', 'F4e', 'B4q', 'E4q', 'B4q', 'E4h') 4 'Guide tones'),
  (Ev-Line @('C4q', 'E4q', 'G4e', 'A4e', 'G4q', 'E4q', 'D4q', 'C4h', 'C4q', 'C4q', 'C4e', 'C4e', 'C4q', 'C4q', 'C4q', 'C4h') 4 'Trade pitches then rhythm')
)
Add-Staff 'more0045' 'vocab-rhythm-or-pitch-staff' 'language' 4 `
  'Rhythm or pitch on the staff' 'Ritmo o altura en el pentagrama' `
  'The melody C-E-G-A-G-E-D-C is the source. Each line changes one thing: the rhythm, the pitches, the speed, the key step, the entrance, the contour, the articulation, or the guide tones. The trade plays the melody, then the rhythm on C.' `
  "La melod${i}a C-E-G-A-G-E-D-C es la fuente. Cada l${i}nea cambia una cosa: el ritmo, las alturas, la velocidad, el grado de transposici${o}n, la entrada, el contorno, la articulaci${o}n o las gu${i}as. El intercambio toca la melod${i}a y luego el ritmo sobre C." `
  $vocab

# --- twelve keys ---
function Motif-Notes([string]$root, [int]$times) {
  $oct = Start-Oct $root
  $degs = @('1', '3', '5', '6', '5', '3', '2', '1')
  $durs = @('q', 'q', 'e', 'e', 'q', 'q', 'q', 'h')
  $ev = New-Object System.Collections.Generic.List[string]
  for ($rep = 0; $rep -lt $times; $rep++) {
    for ($i = 0; $i -lt 8; $i++) { [void]$ev.Add((Tone $root $degs[$i] $oct $durs[$i])) }
  }
  return ,$ev
}
function Add-Motif($list, [string]$root, [int]$times) {
  foreach ($chunk in @(Motif-Notes $root $times)) {
    foreach ($n in @($chunk)) { [void]$list.Add([string]$n) }
  }
}
$keys12 = @('C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'B', 'E', 'A', 'D', 'G')
$keyLines = New-Object System.Collections.Generic.List[string]
foreach ($k in $keys12) {
  $motif = New-Object System.Collections.Generic.List[string]
  Add-Motif $motif $k 2
  [void]$keyLines.Add((Build-Line $motif.ToArray() 4 "in $k" "@key=$k"))
}
function Motif-Pair([string]$a, [string]$b, [string]$cap) {
  $ev = New-Object System.Collections.Generic.List[string]
  Add-Motif $ev $a 1
  Add-Motif $ev $b 1
  return Ev-Line $ev.ToArray() 4 $cap
}
[void]$keyLines.Add((Motif-Pair 'C' 'D' 'Whole steps up from C'))
[void]$keyLines.Add((Motif-Pair 'Db' 'Eb' 'Whole steps up from Db'))
[void]$keyLines.Add((Motif-Pair 'C' 'Eb' 'Minor 3rds up from C'))
[void]$keyLines.Add((Motif-Pair 'Db' 'E' 'Minor 3rds up from Db'))
Add-Staff 'more0046' 'twelve-key-transpose-staff' 'pitch' 4 `
  'Twelve-key transposition on the staff' "Transposici${o}n a doce tonalidades en el pentagrama" `
  'The motif 1-3-5-6-5-3-2-1 written in each key, twice. The sequence lines pair the key with its transposition: up a whole step, or up a minor 3rd.' `
  "El motivo 1-3-5-6-5-3-2-1 escrito en cada tonalidad, dos veces. Las l${i}neas de secuencia emparejan la tonalidad con su transposici${o}n: un tono arriba, o una 3a menor arriba." `
  $keyLines.ToArray()

# --- rhythmic density ---
function Add-Scale($list, [string]$dur, [int]$count) {
  $cycle = @('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5')
  for ($i = 0; $i -lt $count; $i++) { [void]$list.Add($cycle[$i % 8] + $dur) }
}
function Triplet-Bars([int]$bars) {
  $cycle = @('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5')
  $chunks = New-Object System.Collections.Generic.List[string]
  $i = 0
  $groups = $bars * 4
  for ($g = 0; $g -lt $groups; $g++) {
    $a = $cycle[$i % 8]; $i++
    $b = $cycle[$i % 8]; $i++
    $c = $cycle[$i % 8]; $i++
    [void]$chunks.Add("(3 ${a}e ${b}e ${c}e)")
  }
  $barTexts = New-Object System.Collections.Generic.List[string]
  for ($b = 0; $b -lt $bars; $b++) {
    $slice = @()
    for ($g = 0; $g -lt 4; $g++) { $slice += $chunks[($b * 4) + $g] }
    [void]$barTexts.Add(($slice -join ' '))
  }
  return ($barTexts -join ' | ')
}
function Music-Only([string]$line) {
  $sep = " $dot "
  $at = $line.IndexOf($sep)
  if ($at -ge 0) { return $line.Substring(0, $at) }
  return $line
}
$quarters = New-Object System.Collections.Generic.List[string]
Add-Scale $quarters 'q' 16
$eighths = New-Object System.Collections.Generic.List[string]
Add-Scale $eighths 'e' 32
$sixteenths = New-Object System.Collections.Generic.List[string]
Add-Scale $sixteenths 's' 64
$qThenE = New-Object System.Collections.Generic.List[string]
Add-Scale $qThenE 'q' 8
Add-Scale $qThenE 'e' 16
$eighths2 = New-Object System.Collections.Generic.List[string]
Add-Scale $eighths2 'e' 16
$halfThen16 = New-Object System.Collections.Generic.List[string]
foreach ($noteTok in @('C4h', 'D4h', 'E4h', 'F4h')) { [void]$halfThen16.Add($noteTok) }
Add-Scale $halfThen16 's' 32
$qThen16 = New-Object System.Collections.Generic.List[string]
Add-Scale $qThen16 'q' 8
Add-Scale $qThen16 's' 32
$dense = @(
  (Ev-Line @('C4w', 'D4w', 'E4w', 'F4w') 4 'Whole notes'),
  (Ev-Line @('C4h', 'D4h', 'E4h', 'F4h', 'G4h', 'A4h', 'B4h', 'C5h') 4 'Half notes'),
  (Ev-Line $quarters.ToArray() 4 'Quarter notes'),
  (Ev-Line $eighths.ToArray() 4 'Eighth notes'),
  (Join-Raw ((Triplet-Bars 4) + " $dot Triplets") 4),
  (Ev-Line $sixteenths.ToArray() 4 'Sixteenth notes'),
  (Ev-Line @('C4q.', 'D4q.', 'rq', 'E4q.', 'F4q.', 'rq', 'G4q.', 'A4q.', 'rq', 'B4q.', 'C5q.', 'rq') 4 'Dotted quarters'),
  (Ev-Line $qThenE.ToArray() 4 'Quarters then eighths'),
  (Join-Raw ((Music-Only (Ev-Line $eighths2.ToArray() 2 'x')) + ' | ' + (Triplet-Bars 2) + " $dot Eighths then triplets") 4),
  (Ev-Line @('D4e', 'C4h', 'E4q.', 'F4h', 'G4h', 'A4h', 'B4h', 'C5h', 'B4h') 4 'Half notes with one pickup'),
  (Ev-Line $halfThen16.ToArray() 4 'One value per phrase'),
  (Ev-Line $qThen16.ToArray() 4 'Change value at bar 3')
)
Add-Staff 'more0047' 'rhythmic-density-staff' 'rhythm' 4 `
  'Rhythmic density on the staff' "Densidad r${i}tmica en el pentagrama" `
  'The C major scale written in one note value at a time, then two values in one four-bar line. The last line changes at bar 3, which is the turn inside this four-bar form.' `
  "La escala mayor de C escrita en un valor por vez, y luego dos valores en una l${i}nea de cuatro compases. La ${u}ltima l${i}nea cambia en el comp${a}s 3, el giro dentro de esta forma de cuatro compases." `
  $dense

. (Join-Path $PSScriptRoot 'staff-more-d.ps1')
