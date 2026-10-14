# Last staff variations, then a surgical insert into tools/more-exercises.json.

# --- ornaments ---
$orn = @(
  (Ev-Line @('C4q', 'E4q', 'G4q', 'E4q', 'D4q', 'F4q', 'E4q', 'C4q') 2 'Melody only'),
  (Ev-Line @('D4e', 'C4e', 'F4e', 'E4e', 'A4e', 'G4e', 'F4e', 'E4e', 'E4e', 'D4e', 'G4e', 'F4e', 'F4e', 'E4e', 'D4e', 'C4e') 2 'Upper neighbor before each note'),
  (Ev-Line @('C4s', 'D4s', 'C4s', 'B3s', 'E4s', 'F4s', 'E4s', 'D4s', 'G4s', 'A4s', 'G4s', 'F4s', 'E4s', 'F4s', 'E4s', 'D4s', 'D4s', 'E4s', 'D4s', 'C4s', 'F4s', 'G4s', 'F4s', 'E4s', 'E4s', 'F4s', 'E4s', 'D4s', 'C4s', 'D4s', 'C4s', 'B3s') 2 'Upper-neighbor turns'),
  (Ev-Line @('C4s', 'B3s', 'C4s', 'D4s', 'E4s', 'D4s', 'E4s', 'F4s', 'G4s', 'F4s', 'G4s', 'A4s', 'E4s', 'D4s', 'E4s', 'F4s', 'D4s', 'C4s', 'D4s', 'E4s', 'F4s', 'E4s', 'F4s', 'G4s', 'E4s', 'D4s', 'E4s', 'F4s', 'C4s', 'B3s', 'C4s', 'D4s') 2 'Lower-neighbor turns'),
  (Ev-Line @('C4s', 'D4s', 'C4e', 'E4s', 'F4s', 'E4e', 'G4s', 'A4s', 'G4e', 'E4s', 'F4s', 'E4e', 'D4s', 'E4s', 'D4e', 'F4s', 'G4s', 'F4e', 'E4s', 'F4s', 'E4e', 'C4s', 'D4s', 'C4e') 2 'Mordents'),
  (Ev-Line @('C4s', 'D4s', 'C4s', 'D4s', 'E4s', 'F4s', 'E4s', 'F4s', 'G4s', 'A4s', 'G4s', 'A4s', 'E4s', 'F4s', 'E4s', 'F4s', 'D4s', 'E4s', 'D4s', 'E4s', 'F4s', 'G4s', 'F4s', 'G4s', 'E4s', 'F4s', 'E4s', 'F4s', 'C4s', 'D4s', 'C4s', 'D4s') 2 'Trills'),
  (Ev-Line @('C4s', 'D4s', 'C4e', 'E4q', 'G4q', 'E4q', 'D4s', 'E4s', 'D4e', 'F4q', 'E4q', 'C4q') 2 'Ornament the start of each bar'),
  (Ev-Line @('C4q', 'E4q', 'G4q', 'E4q', 'D4q', 'F4q', 'E4q', 'B3s', 'C4s', 'B3s', 'C4s') 2 'Ornament the last note'),
  (Ev-Line @('D4s', 'B3s', 'C4e', 'F4s', 'D4s', 'E4e', 'A4s', 'F4s', 'G4e', 'F4s', 'D4s', 'E4e', 'E4s', 'C4s', 'D4e', 'G4s', 'E4s', 'F4e', 'F4s', 'D4s', 'E4e', 'D4s', 'B3s', 'C4e') 2 'Double ornaments'),
  (Ev-Line @('B3e', 'C4e', 'D#4e', 'E4e', 'F#4e', 'G4e', 'D#4e', 'E4e', 'C#4e', 'D4e', 'E4e', 'F4e', 'D#4e', 'E4e', 'B3e', 'C4e') 2 'Jazz lower neighbors'),
  (Ev-Line @('D4s', 'C4s', 'B3s', 'C4s', 'F4s', 'E4s', 'D4s', 'E4s', 'A4s', 'G4s', 'F4s', 'G4s', 'F4s', 'E4s', 'D4s', 'E4s', 'E4s', 'D4s', 'C4s', 'D4s', 'G4s', 'F4s', 'E4s', 'F4s', 'F4s', 'E4s', 'D4s', 'E4s', 'D4s', 'C4s', 'B3s', 'C4s') 2 'Classical turns')
)
Add-Staff 'more0049' 'ornament-the-melody-staff' 'sound' 2 `
  'Ornament the melody on the staff' "Adornar la melod${i}a en el pentagrama" `
  'The melody C-E-G-E-D-F-E-C with each ornament written out: neighbors, turns, mordents, trills, a decorated downbeat, a decorated ending, and jazz and classical versions. The plain melody is the first line.' `
  "La melod${i}a C-E-G-E-D-F-E-C con cada adorno escrito: bordaduras, grupetos, mordentes, trinos, un tiempo fuerte decorado, un final decorado, y las versiones de jazz y cl${a}sica. La melod${i}a sola es la primera l${i}nea." `
  $orn

# --- three-note contours ---
function Contour-Pool([string[]]$degs) {
  $pool = @()
  foreach ($oct in 3..6) {
    foreach ($d in $degs) {
      $spec = $DegreeMap[$d]
      $sp = Spell-At 'C' $spec[1] $spec[0] $oct
      $pc = $spec[0] % 12
      $midi = (($oct + 1) * 12) + $pc
      $pool += [pscustomobject]@{ sp = $sp; midi = $midi; oct = $oct }
    }
  }
  return ,$pool
}
function Closest-Step($from, [string]$dir, $pool) {
  $best = $null
  $bestDist = 99
  foreach ($p in @($pool)) {
    $dist = $p.midi - $from.midi
    if ($dir -eq 'U' -and $dist -le 0) { continue }
    if ($dir -eq 'D' -and $dist -ge 0) { continue }
    $ad = [math]::Abs($dist)
    if ($ad -lt $bestDist) { $best = $p; $bestDist = $ad }
  }
  if (-not $best) { throw "no $dir from $($from.sp)" }
  return $best
}
$contourLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0050'].lines)) {
  $parts = Split-Caption $ln
  $dirs = @()
  foreach ($w in ($parts.body.Trim() -split '\s+')) { $dirs += $w.Substring(0, 1) }
  $degs = @(($parts.cap -replace '^cell ', '').Trim() -split '\s+')
  $pool = Contour-Pool $degs
  $in4 = @($pool | Where-Object { $_.oct -eq 4 })
  if ($dirs[0] -eq 'U') {
    $cur = $in4 | Sort-Object midi | Select-Object -First 1
  }
  else {
    $cur = $in4 | Sort-Object midi -Descending | Select-Object -First 1
  }
  $spells = New-Object System.Collections.Generic.List[string]
  [void]$spells.Add($cur.sp)
  foreach ($dir in $dirs) {
    $cur = Closest-Step $cur $dir $pool
    [void]$spells.Add($cur.sp)
  }
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($rep in 1..2) { foreach ($s in $spells) { [void]$ev.Add($s + 'q') } }
  [void]$contourLines.Add((Ev-Line $ev.ToArray() 2 ($parts.body.Trim() + ' ' + $parts.cap)))
}
Add-Staff 'more0050' 'three-note-contours-staff' 'pitch' 2 `
  'Three-note contours on the staff' 'Contornos de tres notas en el pentagrama' `
  'Four notes, three directions, on the cells 1-3-5, 1-2-3, and 1-4-5. Each step is the nearest chord tone that still goes the named way. The four notes repeat for the second bar.' `
  "Cuatro notas, tres direcciones, sobre las c${e}lulas 1-3-5, 1-2-3 y 1-4-5. Cada paso es la nota del grupo m${a}s cercana que sigue la direcci${o}n. Las cuatro notas se repiten en el segundo comp${a}s." `
  $contourLines.ToArray()

# --- triad pairs ---
function Parse-TriadName([string]$raw) {
  $raw = ($raw.Trim() -replace '\s+triad$', '')
  if ($raw -notmatch '^([A-G](?:#|b)?)(\+|m)?$') { throw "triad [$raw]" }
  $q = 'M'
  if ($Matches[2] -eq 'm') { $q = 'm' }
  elseif ($Matches[2] -eq '+') { $q = 'aug' }
  return @{ root = $Matches[1]; qual = $q }
}
function Triad-Pair-Lines([string]$id) {
  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($ln in @($byId[$id].lines)) {
    $parts = Split-Caption $ln
    $names = @($parts.body -split '/')
    $chord = $parts.cap.Trim()
    $ev = New-Object System.Collections.Generic.List[string]
    if ($chord) { [void]$ev.Add('^' + $chord) }
    $first = Parse-TriadName $names[0]
    Add-Triad $ev $first.root $first.qual
    if ($names.Count -gt 1 -and $names[1].Trim()) {
      $second = Parse-TriadName $names[1]
      Add-Triad $ev $second.root $second.qual
    }
    else {
      Add-Triad $ev $first.root $first.qual
    }
    [void]$lines.Add((Ev-Line $ev.ToArray() 2 $parts.body.Trim()))
  }
  return ,$lines
}
Add-Staff 'more0051' 'whole-step-triad-pairs-staff' 'pitch' 2 `
  'Whole-step triad pairs on the staff' "Pares de tr${i}ades a un tono en el pentagrama" `
  'Each pair written as two bars of chord tones over the chord named in the text. One triad on its own is played twice.' `
  "Cada par escrito en dos compases de notas del acorde, sobre el acorde que nombra el texto. Una tr${i}ada sola se toca dos veces." `
  (Triad-Pair-Lines 'more0051').ToArray()
Add-Staff 'more0052' 'half-step-triad-pairs-staff' 'pitch' 2 `
  'Half-step triad pairs on the staff' "Pares de tr${i}ades a un semitono en el pentagrama" `
  'Each half-step pair written as two bars of chord tones over the chord named in the text.' `
  "Cada par a un semitono escrito en dos compases de notas del acorde, sobre el acorde que nombra el texto." `
  (Triad-Pair-Lines 'more0052').ToArray()
Add-Staff 'more0053' 'augmented-triad-pairs-staff' 'pitch' 2 `
  'Augmented triad pairs on the staff' "Pares de tr${i}ades aumentadas en el pentagrama" `
  'Each augmented pair written as two bars of chord tones over the chord named in the text.' `
  "Cada par aumentado escrito en dos compases de notas del acorde, sobre el acorde que nombra el texto." `
  (Triad-Pair-Lines 'more0053').ToArray()
Add-Staff 'more0054' 'mixed-triad-pairs-staff' 'pitch' 2 `
  'Mixed triad pairs on the staff' "Pares de tr${i}ades mixtas en el pentagrama" `
  'Each mixed pair written as two bars of chord tones over the chord named in the text. A single triad is played twice.' `
  "Cada par mixto escrito en dos compases de notas del acorde, sobre el acorde que nombra el texto. Una tr${i}ada sola se toca dos veces." `
  (Triad-Pair-Lines 'more0054').ToArray()

# --- chord-family triads ---
function Family-Symbol([string]$family) {
  if ($family -like 'Maj7*') { return 'Cmaj7' }
  if ($family -like 'Dom7sus4*') { return 'C7sus' }
  if ($family -like 'Dom7 Altered*') { return 'C7alt' }
  if ($family -like 'Dom7*') { return 'C7' }
  if ($family -like 'Min7b5*') { return 'Cm7b5' }
  if ($family -like 'Min7*') { return 'Cm7' }
  if ($family -like 'Dim7*') { return 'Cdim7' }
  throw "family-symbol $family"
}
function Family-Lines([string]$id) {
  $lines = New-Object System.Collections.Generic.List[string]
  foreach ($ln in @($byId[$id].lines)) {
    $parts = Split-Caption $ln
    $token = ($parts.body.Trim() -split '\s+')[0]
    $info = Roman-Root $token
    $chord = Family-Symbol $parts.cap
    $ev = New-Object System.Collections.Generic.List[string]
    [void]$ev.Add("^$chord")
    Add-Triad $ev $info.root $info.qual
    Add-Triad $ev $info.root $info.qual
    [void]$lines.Add((Ev-Line $ev.ToArray() 2 $token))
  }
  return ,$lines
}
Add-Staff 'more0055' 'ust-chord-families-staff' 'pitch' 2 `
  'Upper structures on the staff' 'Estructuras superiores en el pentagrama' `
  'Each upper-structure triad written twice over a C chord of that family. The degree in the caption is the root.' `
  "Cada tr${i}ada de estructura superior escrita dos veces sobre un acorde de C de esa familia. El grado del t${i}tulo es la fundamental." `
  (Family-Lines 'more0055').ToArray()
Add-Staff 'more0056' 'lst-chord-families-staff' 'pitch' 2 `
  'Lower structures on the staff' 'Estructuras inferiores en el pentagrama' `
  'Each lower-structure triad written twice over a C chord of that family.' `
  "Cada tr${i}ada de estructura inferior escrita dos veces sobre un acorde de C de esa familia." `
  (Family-Lines 'more0056').ToArray()

# --- two chord tones ---
$ext = @{ '1' = 'C4'; '3' = 'E4'; '5' = 'G4'; '7' = 'B4'; '9' = 'D5'; '11' = 'F5'; '13' = 'A5' }
$pairs = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0058'].lines)) {
  $bits = @($ln -split '\s+-\s+')
  $toneA = $ext[$bits[0].Trim()]
  $toneB = $ext[$bits[1].Trim()]
  $da = $bits[0].Trim()
  $db = $bits[1].Trim()
  [void]$pairs.Add((Ev-Line @('^Cmaj13', "$toneA`h_$da", "$toneB`h_$db", "$toneA`h_$da", "$toneB`h_$db") 2 "$da - $db"))
}
Add-Staff 'more0058' 'two-chord-tones-staff' 'pitch' 2 `
  'Two chord tones on the staff' 'Dos notas del acorde en el pentagrama' `
  'Every ordered pair from the Cmaj13 chord, as half notes. The number under the note is the degree. Each pair is played twice.' `
  "Cada par ordenado del acorde Cmaj13, en blancas. El n${u}mero bajo la nota es el grado. Cada par se toca dos veces." `
  $pairs.ToArray()

# --- sonic marks the dynamics page does not already write ---
$sonic = @(
  (Ev-Line @('rq', 'C4q>', 'rq', 'C4q>', 'rq', 'D4q>', 'rq', 'E4q>') 2 'Accent on the and'),
  (Ev-Line @('C4q>', 'E4q', 'G4q>', 'C5q>', 'C5q>', 'G4q', 'E4q', 'C4q>') 2 'Accent the peaks'),
  (Ev-Line @('mf', 'C4q', 'pp', 'E4q', 'mf', 'G4q', 'pp', 'E4q', 'mf', 'D4q', 'pp', 'F4q', 'mf', 'E4q', 'pp', 'C4q') 2 'Ghost notes'),
  (Ev-Line (@('C4s', 'D4s') * 8 + @('E4s', 'F4s') * 8) 2 'Trill'),
  (Ev-Line (@('C4s', 'C5s') * 16) 2 'Tremolo'),
  (Ev-Line @('C4e', 'E4e', 'G4e', 'C5e', 'rq', 'rq', 'E4e', 'G4e', 'B4e', 'E5e', 'rq', 'rq') 2 'Roll'),
  (Ev-Line @('[C4q E5q]~', '[D4q E5q]~', '[E4q E5q]~', '[F4q E5q]~', '[G4q E5q]~', '[E4q E5q]~', '[D4q E5q]~', '[C4q E5q]') 2 'Finger pedal')
)
Add-Staff 'more0066' 'sonic-nuances-staff' 'sound' 2 `
  'Sonic nuances on the staff' 'Matices sonoros en el pentagrama' `
  'The marks that can be written as notes: an accent on the and, accents on the peaks, ghost notes, a trill, a tremolo, a rolled chord, and a finger pedal that holds E while the lower note moves. Loud, soft, staccato, legato, and placement against the beat stay in the text exercise.' `
  "Las marcas que se pueden escribir como notas: un acento en la parte d${e}bil, acentos en los picos, notas fantasma, un trino, un tr${e}molo, un acorde desplegado, y un pedal de dedo que sostiene el E mientras la nota grave se mueve. Fuerte, suave, staccato, legato y el lugar contra el pulso se quedan en el ejercicio de texto." `
  $sonic

# --- approach notes ---
$downA = [string][char]0x2193
$upA = [string][char]0x2191
$toA = [string][char]0x2192
$chromDown = @{ 1 = 'B3'; 2 = 'Bb3'; 3 = 'A3'; 4 = 'Ab3' }
$chromUp = @{ 1 = 'C#4'; 2 = 'D4'; 3 = 'D#4'; 4 = 'E4' }
$diaDown = @{ 1 = 'B3'; 2 = 'A3'; 3 = 'G3'; 4 = 'F3' }
$diaUp = @{ 1 = 'D4'; 2 = 'E4'; 3 = 'F4'; 4 = 'G4' }
$approach = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0068'].lines)) {
  $notes = New-Object System.Collections.Generic.List[string]
  foreach ($t in ($ln -split '\s+')) {
    if ($t -eq $toA -or $t -eq 'T') { continue }
    if ($t -notmatch '^(.)(\d)([CD])$') { throw "approach token $t" }
    $dir = $Matches[1]
    $stepN = [int]$Matches[2]
    $kind = $Matches[3]
    if ($kind -eq 'C') { $pitch = $(if ($dir -eq $upA) { $chromUp[$stepN] } else { $chromDown[$stepN] }) }
    else { $pitch = $(if ($dir -eq $upA) { $diaUp[$stepN] } else { $diaDown[$stepN] }) }
    if (-not $pitch) { throw "approach pitch $t" }
    [void]$notes.Add($pitch + 'e')
  }
  [void]$notes.Add('C4e')
  while ($notes.Count -lt 8) { [void]$notes.Add('re') }
  if ($notes.Count -ne 8) { throw "approach length $($notes.Count) $ln" }
  $both = New-Object System.Collections.Generic.List[string]
  foreach ($rep in 1..2) { foreach ($noteTok in $notes) { [void]$both.Add($noteTok) } }
  [void]$approach.Add((Ev-Line $both.ToArray() 2 $ln))
}
Add-Staff 'more0068' 'approach-notes-staff' 'changes' 2 `
  'Approach notes on the staff' "Notas de aproximaci${o}n en el pentagrama" `
  'Every approach pattern written into C4. C means chromatic steps and D means C-major steps. The arrow before the number is the direction. The bar repeats.' `
  "Cada patr${o}n de aproximaci${o}n escrito hacia C4. C es por semitonos y D es por grados de C mayor. La flecha antes del n${u}mero es la direcci${o}n. El comp${a}s se repite." `
  $approach.ToArray()

# --- finger patterns ---
$playBox = [char]0x2612
$fingerPitches = @('C4', 'D4', 'E4', 'F4', 'G4')
$fingers = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0069'].lines)) {
  $chars = $ln.ToCharArray()
  if ($chars.Count -ne 5) { throw "fingers $ln" }
  $on = New-Object System.Collections.Generic.List[string]
  for ($fingerIndex = 0; $fingerIndex -lt 5; $fingerIndex++) {
    if ($chars[$fingerIndex] -eq $playBox) { [void]$on.Add($fingerPitches[$fingerIndex] + 'q') }
  }
  if ($on.Count -eq 0) { throw "empty fingers $ln" }
  if ($on.Count -eq 1) { $tok = $on[0] }
  else { $tok = '[' + ($on -join ' ') + ']' }
  [void]$fingers.Add((Ev-Line @($tok) 1 $ln))
}
Add-Staff 'more0069' 'finger-patterns-staff' 'pitch' 1 `
  'Finger patterns on the staff' 'Patrones de dedos en el pentagrama' `
  'Each box pattern written as a chord. Finger 1 is C, then D, E, F, and G. A filled box plays. An empty box is silent. The caption keeps the boxes.' `
  "Cada patr${o}n de casillas escrito como acorde. El dedo 1 es C, luego D, E, F y G. Una casilla llena suena. Una casilla vac${i}a calla. El t${i}tulo conserva las casillas." `
  $fingers.ToArray()

# --- URL length, then insert -------------------------------------------------

function Share-Length([string]$id, [string]$name, [int]$bars, $lines) {
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($line in @($lines)) {
    $esc = ([string]$line).Replace('\', '\\').Replace('"', '\"')
    [void]$parts.Add('"' + $esc + '"')
  }
  $json = '{"v":1,"id":"' + $id + '","name":"' + $name + '","bars":' + $bars + ',"lines":[' + ($parts -join ',') + ']}'
  $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)).TrimEnd('=')
  return ('https://eization.com/#s=' + $b64).Length
}

$tooLong = @()
foreach ($item in $made) {
  $exObj = $item.obj
  $len = Share-Length $exObj.id $exObj.nameEn ([int]$exObj.bars) $exObj.lines
  Write-Output ("{0} {1} url {2}" -f $exObj.id, $exObj.slug, $len)
  if ($len -gt 8000) { $tooLong += ("{0} {1}" -f $o.slug, $len) }
}
if ($tooLong.Count) { throw ("URL too long: " + ($tooLong -join '; ')) }

function Find-MatchingBrace([string]$text, [int]$open) {
  $depth = 0
  $inStr = $false
  $esc = $false
  for ($i = $open; $i -lt $text.Length; $i++) {
    $c = $text[$i]
    if ($inStr) {
      if ($esc) { $esc = $false; continue }
      if ($c -eq '\') { $esc = $true; continue }
      if ($c -eq '"') { $inStr = $false }
      continue
    }
    if ($c -eq '"') { $inStr = $true; continue }
    if ($c -eq '{') { $depth++ }
    elseif ($c -eq '}') {
      $depth--
      if ($depth -eq 0) { return $i }
    }
  }
  throw 'unbalanced brace'
}

$text = [IO.File]::ReadAllText($dataPath)
$nl = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
$staffHits = [regex]::Matches($text, '"slug"\s*:\s*"[^"]+-staff"')
for ($m = $staffHits.Count - 1; $m -ge 0; $m--) {
  $idx = $staffHits[$m].Index
  $open = $text.LastIndexOf([char]0x7B, $idx)
  $close = Find-MatchingBrace $text $open
  $after = $close + 1
  while ($after -lt $text.Length -and [char]::IsWhiteSpace($text[$after])) { $after++ }
  if ($after -lt $text.Length -and $text[$after] -eq ',') {
    $text = $text.Remove($open, ($after + 1) - $open)
  }
  else {
    $before = $open - 1
    while ($before -ge 0 -and [char]::IsWhiteSpace($text[$before])) { $before-- }
    if ($before -ge 0 -and $text[$before] -eq ',') {
      $text = $text.Remove($before, ($close + 1) - $before)
    }
    else { $text = $text.Remove($open, ($close + 1) - $open) }
  }
}

$jobs = @()
foreach ($item in $made) {
  $found = [regex]::Match($text, '"id"\s*:\s*"' + [regex]::Escape($item.after) + '"')
  if (-not $found.Success) { throw "missing insert point $($item.after)" }
  $jobs += [pscustomobject]@{ at = $found.Index; item = $item }
}
$jobs = @($jobs | Sort-Object at -Descending)
foreach ($job in $jobs) {
  $found = [regex]::Match($text, '"id"\s*:\s*"' + [regex]::Escape($job.item.after) + '"')
  $open = $text.LastIndexOf([char]0x7B, $found.Index)
  $close = Find-MatchingBrace $text $open
  $json = $job.item.obj | ConvertTo-Json -Depth 6
  $indented = (($json -split "`r?`n") | ForEach-Object { '    ' + $_ }) -join $nl
  $after = $close + 1
  while ($after -lt $text.Length -and [char]::IsWhiteSpace($text[$after])) { $after++ }
  if ($after -lt $text.Length -and $text[$after] -eq ',') {
    $text = $text.Insert($after + 1, $nl + $indented + ',')
  }
  else {
    $text = $text.Insert($close + 1, ',' + $nl + $indented)
  }
}

$check = $text | ConvertFrom-Json
$ids = @{}
foreach ($ex in $check) {
  if ($ids.ContainsKey($ex.id)) { throw "duplicate $($ex.id)" }
  $ids[$ex.id] = $true
}
$expect = @($data).Count + @($made | Where-Object { -not $ids.ContainsKey($_.obj.id) }).Count
# $data was loaded before inserts. After a re-run the file no longer has old -staff ids, and $data might already include them if we loaded a previous insert.
# Validate by slug instead.
$slugs = @{}
foreach ($ex in $check) { $slugs[$ex.slug] = $true }
foreach ($item in $made) {
  if (-not $slugs.ContainsKey($item.obj.slug)) { throw "missing slug $($item.obj.slug)" }
}
Write-Output ("catalog objects " + @($check).Count)

$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($dataPath, $text, $utf8)

Write-Output 'skipped: guide-tones, enclosures, sing-first, odd-bars, time-feel, dynamics-articulation, held-rhythm, all-intervals'
Write-Output 'wrote more-exercises.json'
