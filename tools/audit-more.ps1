# Fill incomplete more-exercises + add practice-idea exercises.
# Run from repo: powershell -NoProfile -File tools/audit-more.ps1
$ErrorActionPreference = 'Stop'
$path = Join-Path $PSScriptRoot 'more-exercises.json'
$raw = Get-Content -LiteralPath $path -Encoding UTF8 -Raw | ConvertFrom-Json
$list = [System.Collections.Generic.List[object]]::new()
foreach ($ex in $raw) { [void]$list.Add($ex) }

function Get-Ex([string]$id) {
  $ex = $list | Where-Object { $_.id -eq $id } | Select-Object -First 1
  if (-not $ex) { throw "missing $id" }
  return $ex
}

function Set-Props($ex, [hashtable]$props) {
  foreach ($k in $props.Keys) {
    $ex | Add-Member -NotePropertyName $k -NotePropertyValue $props[$k] -Force
  }
}

function Add-Ex([hashtable]$obj) {
  if ($list | Where-Object { $_.id -eq $obj.id }) { throw "dup $($obj.id)" }
  [void]$list.Add([pscustomobject]$obj)
}

function Get-Permutations([string[]]$arr) {
  if ($arr.Count -le 1) { return ,@(,$arr) }
  $results = @()
  for ($i = 0; $i -lt $arr.Count; $i++) {
    $head = $arr[$i]
    $rest = [System.Collections.Generic.List[string]]::new()
    for ($j = 0; $j -lt $arr.Count; $j++) {
      if ($j -ne $i) { [void]$rest.Add($arr[$j]) }
    }
    foreach ($tail in (Get-Permutations $rest.ToArray())) {
      $combo = [System.Collections.Generic.List[string]]::new()
      [void]$combo.Add($head)
      foreach ($t in $tail) { [void]$combo.Add($t) }
      $results += ,($combo.ToArray())
    }
  }
  return $results
}

$dot = [string][char]0x00B7

# Major II-V-I in circle-of-fifths order (matches more0002 spirit)
$maj251 = @(
  @{k='C';  ii='Dm7';  v='G7';  i='Cmaj7';  g3='F-B-E-E';     g7='C-F-B-B'},
  @{k='F';  ii='Gm7';  v='C7';  i='Fmaj7';  g3='Bb-E-A-A';    g7='F-Bb-E-E'},
  @{k='Bb'; ii='Cm7';  v='F7';  i='Bbmaj7'; g3='Eb-A-D-D';    g7='Bb-Eb-A-A'},
  @{k='Eb'; ii='Fm7';  v='Bb7'; i='Ebmaj7'; g3='Ab-D-G-G';    g7='Eb-Ab-D-D'},
  @{k='Ab'; ii='Bbm7'; v='Eb7'; i='Abmaj7'; g3='Db-G-C-C';    g7='Ab-Db-G-G'},
  @{k='Db'; ii='Ebm7'; v='Ab7'; i='Dbmaj7'; g3='Gb-C-F-F';    g7='Db-Gb-C-C'},
  @{k='Gb'; ii='Abm7'; v='Db7'; i='Gbmaj7'; g3='Cb-F-Bb-Bb';  g7='Gb-Cb-F-F'},
  @{k='B';  ii='C#m7'; v='F#7'; i='Bmaj7';  g3='E-A#-D#-D#';  g7='B-E-A#-A#'},
  @{k='E';  ii='F#m7'; v='B7';  i='Emaj7';  g3='A-D#-G#-G#';  g7='E-A-D#-D#'},
  @{k='A';  ii='Bm7';  v='E7';  i='Amaj7';  g3='D-G#-C#-C#';  g7='A-D-G#-G#'},
  @{k='D';  ii='Em7';  v='A7';  i='Dmaj7';  g3='G-C#-F#-F#';  g7='D-G-C#-C#'},
  @{k='G';  ii='Am7';  v='D7';  i='Gmaj7';  g3='C-F#-B-B';    g7='G-C-F#-F#'}
)

# --- more0001: all majors + all natural minors (equal turns) ---
$majors = @('C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B')
$minors = @('C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B')
$sticky = [System.Collections.Generic.List[string]]::new()
foreach ($k in $majors) { [void]$sticky.Add("$k major") }
foreach ($k in $minors) { [void]$sticky.Add("$k minor") }
Set-Props (Get-Ex 'more0001') @{
  nameEn = 'Sticky keys'
  nameEs = 'Tonalidades dificiles'
  descEn = 'Students park in C, F, and Bb. Every major and every natural minor gets one turn so the easy keys cannot take the whole pass.'
  descEs = 'Los estudiantes se quedan en C, F y Bb. Cada mayor y cada menor natural tiene un turno para que las faciles no ocupen todo el pase.'
  lines = $sticky.ToArray()
}
# Fix Spanish accents via unicode escapes in strings below after write - use proper chars:
Set-Props (Get-Ex 'more0001') @{
  nameEs = "Tonalidades dif$([char]0x00ED)ciles"
  descEs = "Los estudiantes se quedan en C, F y Bb. Cada mayor y cada menor natural tiene un turno para que las f$([char]0x00E1)ciles no ocupen todo el pase."
}

# --- more0003 guide tones: 12 keys x 3rds, then 12 x 7ths ---
$gt = [System.Collections.Generic.List[string]]::new()
foreach ($r in $maj251) { [void]$gt.Add("$($r.g3) $dot $($r.ii) $($r.v) $($r.i)") }
foreach ($r in $maj251) { [void]$gt.Add("$($r.g7) $dot $($r.ii) $($r.v) $($r.i)") }
Set-Props (Get-Ex 'more0003') @{
  descEn = 'Lines stall when the ear loses the 3rd and 7th. All twelve II-V-I keys: first a 3rds path, then a 7ths path. Sing it, then play it in time.'
  descEs = "Las l$([char]0x00ED)neas se estancan cuando el o$([char]0x00ED)do pierde la 3a y la 7a. Las doce tonalidades de II-V-I: primero camino de 3as, luego de 7as. C$([char]0x00E1)ntalo y luego t$([char]0x00F3)calo a tempo."
  lines = $gt.ToArray()
}

# --- more0004 outline: 12 keys x three shapes ---
$outl = [System.Collections.Generic.List[string]]::new()
foreach ($r in $maj251) { [void]$outl.Add("1 3 5 7 $dot $($r.ii) $($r.v) $($r.i)") }
foreach ($r in $maj251) { [void]$outl.Add("7 5 3 1 $dot $($r.ii) $($r.v) $($r.i)") }
foreach ($r in $maj251) { [void]$outl.Add("3 5 7 9 $dot $($r.ii) $($r.v) $($r.i)") }
Set-Props (Get-Ex 'more0004') @{
  descEn = 'Before fancy lines, hear the skeleton. All twelve II-V-I keys in three shapes: 1-3-5-7, 7-5-3-1, and 3-5-7-9.'
  descEs = "Antes de l$([char]0x00ED)neas rebuscadas, oye el esqueleto. Las doce tonalidades de II-V-I en tres formas: 1-3-5-7, 7-5-3-1 y 3-5-7-9."
  lines = $outl.ToArray()
}

# --- more0005 enclosures: 4 shapes x 4 C7 chord tones + 4 Dm chord tones ---
# Shapes: above-below, below-above, double-above, double-below
$enc = @(
  "D B C $dot above below -> C",
  "B D C $dot below above -> C",
  "Eb D Db C $dot double above -> C",
  "A Bb B C $dot double below -> C",
  "F D# E $dot above below -> E",
  "D# F E $dot below above -> E",
  "G F# F E $dot double above -> E",
  "C# D D# E $dot double below -> E",
  "A F# G $dot above below -> G",
  "F# A G $dot below above -> G",
  "Bb A Ab G $dot double above -> G",
  "E F F# G $dot double below -> G",
  "C A Bb $dot above below -> Bb",
  "A C Bb $dot below above -> Bb",
  "Db C B Bb $dot double above -> Bb",
  "G Ab A Bb $dot double below -> Bb",
  "E C# D $dot above below -> D",
  "C# E D $dot below above -> D",
  "F E Eb D $dot double above -> D",
  "B C C# D $dot double below -> D",
  "G E F $dot above below -> F",
  "E G F $dot below above -> F",
  "Ab G Gb F $dot double above -> F",
  "D Eb E F $dot double below -> F"
)
Set-Props (Get-Ex 'more0005') @{
  descEn = 'Four enclosure shapes into chord-tone targets on C7 (C E G Bb) and Dm (D F). Above-below, below-above, double above, double below. Each target gets every shape.'
  descEs = "Cuatro formas de envolvente hacia objetivos en C7 (C E G Bb) y Dm (D F). Arriba-abajo, abajo-arriba, doble arriba, doble abajo. Cada objetivo recibe cada forma."
  lines = $enc
}

# --- more0007 interval families (complete) ---
Set-Props (Get-Ex 'more0007') @{
  nameEn = 'Interval families'
  nameEs = 'Familias de intervalos'
  descEn = 'Every interval family from minor 2nd through octave, plus a few mixed drills. One family per turn so stepwise comfort cannot hide the leaps.'
  descEs = "Cada familia de intervalo desde 2a menor hasta octava, m$([char]0x00E1)s algunos mixtos. Una familia por turno para que el paso a paso no esconda los saltos."
  lines = @(
    'Minor 2nds', 'Major 2nds', 'Minor 3rds', 'Major 3rds',
    'Perfect 4ths', 'Tritones', 'Perfect 5ths',
    'Minor 6ths', 'Major 6ths', 'Minor 7ths', 'Major 7ths', 'Octaves',
    '4ths then 5ths', '6ths then 3rds', '2nds then 7ths'
  )
}

# --- more0008 minor II-V-I all 12 ---
Set-Props (Get-Ex 'more0008') @{
  descEn = 'Major cadences get the hours. Minor II-V-I in all twelve keys: one key per example, b9 dominant into minor.'
  descEs = "Las cadencias mayores se llevan las horas. II-V-I menor en las doce tonalidades: una tonalidad por ejemplo, dominante b9 hacia menor."
  lines = @(
    'Dm7b5 G7b9 Cm', 'Em7b5 A7b9 Dm', 'F#m7b5 B7b9 Em', 'Gm7b5 C7b9 Fm',
    'Am7b5 D7b9 Gm', 'Bm7b5 E7b9 Am', 'C#m7b5 F#7b9 Bm', 'Ebm7b5 Ab7b9 Dbm',
    'Fm7b5 Bb7b9 Ebm', 'G#m7b5 C#7b9 F#m', 'Bbm7b5 Eb7b9 Abm', 'Cm7b5 F7b9 Bbm'
  )
}

# --- more0011 rhythm bridge all 12 starts ---
Set-Props (Get-Ex 'more0011') @{
  descEn = 'The Rhythm Changes bridge is a wall of dominants. All twelve starts: III7-VI7-II7-V7 from each key center.'
  descEs = "El puente de Rhythm Changes es un muro de dominantes. Los doce comienzos: III7-VI7-II7-V7 desde cada centro."
  lines = @(
    "E7 A7 D7 G7 $dot from C",
    "F#7 B7 E7 A7 $dot from D",
    "Ab7 Db7 Gb7 B7 $dot from E",
    "G7 C7 F7 Bb7 $dot from F",
    "A7 D7 G7 C7 $dot from G",
    "B7 E7 A7 D7 $dot from A",
    "C7 F7 Bb7 Eb7 $dot from Bb",
    "D7 G7 C7 F7 $dot from C up",
    "Bb7 Eb7 Ab7 Db7 $dot from Eb",
    "C#7 F#7 B7 E7 $dot from F#",
    "Eb7 Ab7 Db7 Gb7 $dot from Ab",
    "F7 Bb7 Eb7 Ab7 $dot from B"
  )
}
# Fix "from B" - III7 of B is D#7. Correct last two:
# from Ab: C7 F7 Bb7 Eb7 wait - III of Ab is C7? Ab major: C is 3rd degree = C7 yes for rhythm bridge from Ab: C7 F7 Bb7 Eb7
# Actually Ab: III=C, VI=F, II=Bb, V=Eb -> C7 F7 Bb7 Eb7
# from B: D#7 G#7 C#7 F#7
# from Gb/F#: A#7 D#7 G#7 C#7 or Bb7 Eb7 Ab7 Db7 is from Eb
# Missing from my list: from Ab and from B
# Current has from Ab as Eb7 Ab7 Db7 Gb7 - WRONG. III of Ab is C7.
# Recalculate all rhythm bridges carefully:
# Key center tonic: bridge is III7 VI7 II7 V7
# C: E7 A7 D7 G7
# Db: F7 Bb7 Eb7 Ab7
# D: F#7 B7 E7 A7
# Eb: G7 C7 F7 Bb7
# E: G#7/Ab7 C#7/Db7 F#7/Gb7 B7
# F: A7 D7 G7 C7
# F#: A#7/Bb7 D#7/Eb7 G#7/Ab7 C#7/Db7
# G: B7 E7 A7 D7
# Ab: C7 F7 Bb7 Eb7
# A: C#7 F#7 B7 E7
# Bb: D7 G7 C7 F7
# B: D#7 G#7 C#7 F#7

Set-Props (Get-Ex 'more0011') @{
  lines = @(
    "E7 A7 D7 G7 $dot from C",
    "F7 Bb7 Eb7 Ab7 $dot from Db",
    "F#7 B7 E7 A7 $dot from D",
    "G7 C7 F7 Bb7 $dot from Eb",
    "Ab7 Db7 Gb7 B7 $dot from E",
    "A7 D7 G7 C7 $dot from F",
    "Bb7 Eb7 Ab7 Db7 $dot from F#",
    "B7 E7 A7 D7 $dot from G",
    "C7 F7 Bb7 Eb7 $dot from Ab",
    "C#7 F#7 B7 E7 $dot from A",
    "D7 G7 C7 F7 $dot from Bb",
    "D#7 G#7 C#7 F#7 $dot from B"
  )
}

# --- more0012 tritone II-bII7-I all 12 ---
Set-Props (Get-Ex 'more0012') @{
  descEn = 'Substitutions feel abstract until they are under the fingers. II-bII7-I in all twelve keys, one cadence per turn.'
  descEs = "Las sustituciones se sienten abstractas hasta que est$([char]0x00E1)n bajo los dedos. II-bII7-I en las doce tonalidades, una cadencia por turno."
  lines = @(
    'Dm7 Db7 Cmaj7', 'Ebm7 D7 Dbmaj7', 'Em7 Eb7 Dmaj7', 'Fm7 E7 Ebmaj7',
    'F#m7 F7 Emaj7', 'Gm7 Gb7 Fmaj7', 'Abm7 G7 Gbmaj7', 'Am7 Ab7 Gmaj7',
    'Bbm7 A7 Abmaj7', 'Bm7 Bb7 Amaj7', 'Cm7 B7 Bbmaj7', 'C#m7 C7 Bmaj7'
  )
}

# --- more0015 leave space: fuller play/rest grid ---
Set-Props (Get-Ex 'more0015') @{
  descEn = 'Overplaying fills every bar. Every common play/rest ratio gets a turn so the comfortable 2+2 does not hide the rest.'
  descEs = "Tocar de m$([char]0x00E1)s llena todos los compases. Cada ratio habitual de tocar/silencio tiene turno para que el c$([char]0x00F3)modo 2+2 no esconda el resto."
  lines = @(
    'Play 1, rest 1', 'Play 1, rest 2', 'Play 1, rest 3',
    'Play 2, rest 1', 'Play 2, rest 2', 'Play 2, rest 3',
    'Play 3, rest 1', 'Play 3, rest 2', 'Play 3, rest 3',
    'Play 4, rest 1', 'Play 4, rest 2', 'Play 4, rest 4',
    'Rest first bar', 'Rest last bar', 'Trade fours with silence'
  )
}

# ========== NEW EXERCISES ==========

$perms = [System.Collections.Generic.List[string]]::new()
foreach ($p in (Get-Permutations @('1','2','3','5'))) {
  [void]$perms.Add((($p -join ' ') + " $dot 1-2-3-5 cell"))
}
Add-Ex @{
  id='more0032'; slug='one-two-three-five-perms'; bars=2
  nameEn='1-2-3-5 permutations'; nameEs="Permutaciones 1-2-3-5"
  descEn='All twenty-four orders of the 1-2-3-5 cell. One shape per turn over every chord. Connect each bar with the closest voice leading.'
  descEs="Los veinticuatro $([char]0x00F3)rdenes de la c$([char]0x00E9)lula 1-2-3-5. Una forma por turno sobre cada acorde. Une cada comp$([char]0x00E1)s con el enlace m$([char]0x00E1)s cercano."
  books=@(
    @{href='./scales.html'; en='Scales'; es='Escalas'},
    @{href='./more.html#scale-patterns'; en='Scale patterns'; es='Patrones de escala'},
    @{href='./melodic-lines.html#coker-patterns'; en='Patterns for Jazz'; es='Patterns for Jazz'}
  )
  lines=$perms.ToArray()
}

Add-Ex @{
  id='more0033'; slug='phrase-start-end'; bars=4
  nameEn='Phrase starts and ends'; nameEs='Inicios y finales de frase'
  descEn='Force where the phrase begins and where it lands. Every common start and end beat gets a turn so beat 1 does not own every entrance.'
  descEs="Fuerza d$([char]0x00F3)nde empieza la frase y d$([char]0x00F3)nde aterriza. Cada inicio y final habitual tiene turno para que el tiempo 1 no sea la $([char]0x00FA)nica entrada."
  books=@(
    @{href='./more.html#into-the-bar'; en='Into the next bar'; es='Hacia el siguiente compas'},
    @{href='./time.html'; en='Time'; es='Tiempo'},
    @{href='./melodic-lines.html#galper-forward-motion'; en='Forward Motion'; es='Forward Motion'}
  )
  lines=@(
    "Start on beat 1 $dot end on 1", "Start on beat 1 $dot end on 3", "Start on beat 1 $dot end on and of 4",
    "Start on beat 2 $dot end on 1", "Start on beat 2 $dot end on 3", "Start on beat 2 $dot end on 4",
    "Start on beat 3 $dot end on 1", "Start on beat 3 $dot end on 3", "Start on beat 4 $dot end on 1",
    "Start on and of 1 $dot end on 1", "Start on and of 2 $dot end on 1", "Start on and of 4 $dot end on 1",
    "Start on and of 4 $dot end on 3", "Start on beat 4 $dot end on and of 2", "Start anywhere $dot end on and of 4"
  )
}
# fix Spanish accent in book link label path - use proper into-the-bar es from existing
$ex33 = Get-Ex 'more0033'
$ex33.books[0].es = "Hacia el siguiente comp$([char]0x00E1)s"

Add-Ex @{
  id='more0034'; slug='time-feel'; bars=8
  nameEn='Time feel'; nameEs="Colocaci$([char]0x00F3)n del tiempo"
  descEn='Place the whole line behind, center, or ahead of the click. Each feel gets a full turn so laid-back does not hide on-top and dead-center.'
  descEs="Coloca toda la l$([char]0x00ED)nea detr$([char]0x00E1)s, al centro o delante del clic. Cada colocaci$([char]0x00F3)n tiene un turno completo."
  books=@(
    @{href='./sonic-nuances.html'; en='Sonic Nuances'; es='Matices sonoros'},
    @{href='./time.html'; en='Time'; es='Tiempo'},
    @{href='./time.html#erskine-time'; en='Time Awareness'; es='Time Awareness'}
  )
  lines=@(
    'Behind the beat', 'Dead center on the beat', 'Ahead of the beat',
    'Behind on ballads', 'Center at medium swing', 'Ahead at up-tempo',
    'Behind for one chorus, center for one', 'Center then push the last two bars',
    'Leave the & late', 'Leave the & early', 'Quarters center, 8ths behind', 'Quarters center, 8ths ahead'
  )
}

Add-Ex @{
  id='more0035'; slug='alt-four-note-cells'; bars=2
  nameEn='Four-note cell formulae'; nameEs="F$([char]0x00F3)rmulas de c$([char]0x00E9)lulas de cuatro notas"
  descEn='Replace stock 1-2-3-5 with other four-note shapes by chord quality. One formula per turn so the familiar cell does not take every chorus.'
  descEs="Sustituye el 1-2-3-5 habitual por otras formas de cuatro notas seg$([char]0x00FA)n el acorde. Una f$([char]0x00F3)rmula por turno."
  books=@(
    @{href='./more.html#one-two-three-five-perms'; en='1-2-3-5 permutations'; es='Permutaciones 1-2-3-5'},
    @{href='./more.html#scale-patterns'; en='Scale patterns'; es='Patrones de escala'},
    @{href='./chord-tones.html'; en='Chord Tones'; es='Notas del acorde'}
  )
  lines=@(
    "1 2 3 5 $dot major / dominant", "1 3 4 5 $dot major add4 color", "1 2 b3 5 $dot minor",
    "1 b2 3 5 $dot phrygian / susb9", "1 2 3 b5 $dot half-diminished color", "1 3 5 b7 $dot dominant outline",
    "1 2 4 5 $dot sus color", "1 b3 4 5 $dot dorian cell", "1 2 b3 4 $dot minor cluster",
    "1 3 #4 5 $dot lydian", "1 b2 b3 5 $dot altered minor", "1 2 3 7 $dot major leading"
  )
}

Add-Ex @{
  id='more0036'; slug='dom-pentatonic-grid'; bars=4
  nameEn='Dominant pentatonic grid'; nameEs="Rejilla pentat$([char]0x00F3)nica dominante"
  descEn='Over one dominant chord, every common major-pentatonic root from the scale and its tensions. One root per turn so I-pentatonic does not hide b2, b3, and b7 colors.'
  descEs="Sobre un dominante, cada ra$([char]0x00ED)z pentat$([char]0x00F3)nica mayor habitual de la escala y sus tensiones. Una ra$([char]0x00ED)z por turno."
  books=@(
    @{href='./more.html#major-pentatonics-on-chords'; en='Major pentatonics on chords'; es="Pentat$([char]0x00F3)nicas mayores sobre acordes"},
    @{href='./scales-and-sets.html#bergonzi-pentatonics'; en='Pentatonics'; es='Pentatonics'},
    @{href='./scales-and-sets.html#ricker-pentatonic'; en='Pentatonic Scales for Jazz'; es='Pentatonic Scales for Jazz'}
  )
  lines=@(
    "Maj pent on 1 $dot over Dom7", "Maj pent on 2 $dot over Dom7", "Maj pent on b3 $dot over Dom7",
    "Maj pent on 3 $dot over Dom7", "Maj pent on 4 $dot over Dom7", "Maj pent on b5 $dot over Dom7",
    "Maj pent on 5 $dot over Dom7", "Maj pent on b6 $dot over Dom7", "Maj pent on 6 $dot over Dom7",
    "Maj pent on b7 $dot over Dom7", "Maj pent on 7 $dot over Dom7", "Maj pent on b2 $dot over Dom7"
  )
}

Add-Ex @{
  id='more0037'; slug='pentatonic-three-note'; bars=2
  nameEn='Pentatonic 3-note cells'; nameEs="C$([char]0x00E9)lulas pentat$([char]0x00F3)nicas de 3 notas"
  descEn='Split a pentatonic into consecutive 3-note cells and cycle them. Every rotation gets a turn for angular triad-like texture without full five-note runs.'
  descEs="Parte una pentat$([char]0x00F3)nica en c$([char]0x00E9)lulas de 3 notas seguidas y c$([char]0x00ED)clalas. Cada rotaci$([char]0x00F3)n tiene turno."
  books=@(
    @{href='./scales-and-sets.html#bergonzi-pentatonics'; en='Pentatonics'; es='Pentatonics'},
    @{href='./more.html#dom-pentatonic-grid'; en='Dominant pentatonic grid'; es="Rejilla pentat$([char]0x00F3)nica dominante"},
    @{href='./scales.html'; en='Scales'; es='Escalas'}
  )
  lines=@(
    "1 2 3 $dot pent cell", "2 3 5 $dot pent cell", "3 5 6 $dot pent cell", "5 6 1 $dot pent cell", "6 1 2 $dot pent cell",
    "1 3 5 $dot pent triad", "2 5 6 $dot pent triad", "3 6 1 $dot pent triad", "5 1 2 $dot pent triad", "6 2 3 $dot pent triad",
    "3 2 1 $dot pent down", "5 3 2 $dot pent down", "6 5 3 $dot pent down", "1 6 5 $dot pent down", "2 1 6 $dot pent down"
  )
}

Add-Ex @{
  id='more0038'; slug='chromatic-lower-approach'; bars=2
  nameEn='Chromatic lower approach'; nameEs="Aproximaci$([char]0x00F3)n crom$([char]0x00E1)tica inferior"
  descEn='Land chord tones on beats 1 and 3. The upbeat before each target is always a half-step from below. Targets rotate so 1, 3, 5, and 7 each get turns.'
  descEs="Aterriza notas del acorde en 1 y 3. El contratiempo antes de cada objetivo es siempre medio tono desde abajo. Rotan 1, 3, 5 y 7."
  books=@(
    @{href='./approach-notes.html'; en='Approach Notes'; es="Notas de aproximaci$([char]0x00F3)n"},
    @{href='./more.html#enclosures'; en='Enclosures'; es='Envolventes'},
    @{href='./melodic-lines.html#baker-bebop'; en='How to Play Bebop'; es='How to Play Bebop'}
  )
  lines=@(
    "to 1 from below $dot Cmaj7", "to 3 from below $dot Cmaj7", "to 5 from below $dot Cmaj7", "to 7 from below $dot Cmaj7",
    "to 1 from below $dot Dm7", "to 3 from below $dot Dm7", "to 5 from below $dot Dm7", "to 7 from below $dot Dm7",
    "to 1 from below $dot G7", "to 3 from below $dot G7", "to 5 from below $dot G7", "to b7 from below $dot G7",
    "to 3 on beat 1 $dot any chord", "to 7 on beat 1 $dot any chord", "to 3 on beat 3 $dot any chord", "to 7 on beat 3 $dot any chord"
  )
}

Add-Ex @{
  id='more0039'; slug='double-chromatic-approach'; bars=2
  nameEn='Double chromatic approach'; nameEs="Aproximaci$([char]0x00F3)n crom$([char]0x00E1)tica doble"
  descEn='Two consecutive chromatic notes into the target from above or from below. Every direction and chord-tone target gets a turn.'
  descEs="Dos notas crom$([char]0x00E1)ticas seguidas hacia el objetivo desde arriba o desde abajo. Cada direcci$([char]0x00F3)n y objetivo tiene turno."
  books=@(
    @{href='./approach-notes.html'; en='Approach Notes'; es="Notas de aproximaci$([char]0x00F3)n"},
    @{href='./more.html#chromatic-lower-approach'; en='Chromatic lower approach'; es="Aproximaci$([char]0x00F3)n crom$([char]0x00E1)tica inferior"},
    @{href='./melodic-lines.html#baker-bebop'; en='How to Play Bebop'; es='How to Play Bebop'}
  )
  lines=@(
    'from below into 1', 'from below into 3', 'from below into 5', 'from below into 7',
    'from above into 1', 'from above into 3', 'from above into 5', 'from above into 7',
    'below into 3 of Dom7', 'above into 3 of Dom7', 'below into b7 of Dom7', 'above into b7 of Dom7',
    'below into 3 of Min7', 'above into 3 of Min7', 'mix above then below into 1', 'mix below then above into 1'
  )
}

Add-Ex @{
  id='more0040'; slug='line-deflection'; bars=2
  nameEn='Line deflection'; nameEs="Desv$([char]0x00ED)o de l$([char]0x00ED)nea"
  descEn='Drive toward a target, then leap the other way on the last beat before you resolve. Breaks predictable scalar runs. Every target degree gets a turn.'
  descEs="Apunta a un objetivo y en el $([char]0x00FA)ltimo tiempo salta al otro lado antes de resolver. Rompe las escalas predecibles."
  books=@(
    @{href='./melodic-lines.html#bergonzi-jazz-line'; en='Jazz Line'; es='Jazz Line'},
    @{href='./more.html#goal-notes'; en='Goal notes'; es='Notas objetivo'},
    @{href='./more.html#into-the-bar'; en='Into the next bar'; es="Hacia el siguiente comp$([char]0x00E1)s"}
  )
  lines=@(
    "Aim at 1 $dot deflect then resolve", "Aim at 3 $dot deflect then resolve", "Aim at 5 $dot deflect then resolve", "Aim at 7 $dot deflect then resolve",
    "Scale up into 3 $dot leap down then 3", "Scale down into 1 $dot leap up then 1",
    "Chromatic into 5 $dot leap opposite then 5", "Arpeggio into 7 $dot leap opposite then 7",
    'Deflect by a 3rd', 'Deflect by a 4th', 'Deflect by a 5th', 'Deflect by an octave'
  )
}

Add-Ex @{
  id='more0041'; slug='rhythmic-displacement'; bars=4
  nameEn='Rhythmic displacement'; nameEs="Desplazamiento r$([char]0x00ED)tmico"
  descEn='One short phrase, repeated while its start point shifts forward by an eighth each time. Every shift amount gets a turn so the original downbeat does not own the motif.'
  descEs="Una frase corta, repetida mientras su inicio avanza un corchea cada vez. Cada desplazamiento tiene turno."
  books=@(
    @{href='./time.html'; en='Time'; es='Tiempo'},
    @{href='./rhythmic-devices.html'; en='Rhythmic Devices'; es='Recursos ritmicos'},
    @{href='./motivic-development.html'; en='Motivic Development'; es="Desarrollo mot$([char]0x00ED)vico"}
  )
  lines=@(
    'Start on beat 1', 'Shift +1 eighth', 'Shift +2 eighths', 'Shift +3 eighths',
    "Shift +4 eighths $dot beat 3", 'Shift +5 eighths', 'Shift +6 eighths', 'Shift +7 eighths',
    'Displace a 2-note cell', 'Displace a 3-note cell', 'Displace a 4-note cell',
    'Displace across the barline', 'Backwards shift one eighth', 'Hold pitch, move only the rhythm'
  )
}
$ex41 = Get-Ex 'more0041'
$ex41.books[1].es = "Recursos r$([char]0x00ED)tmicos"

Add-Ex @{
  id='more0042'; slug='quartal-lines'; bars=4
  nameEn='Quartal lines'; nameEs="L$([char]0x00ED)neas por cuartas"
  descEn='Build the line from stacked 4ths or 4ths mixed with 3rds. Every stacking pattern gets a turn so stepwise scales do not take the whole session.'
  descEs="Construye la l$([char]0x00ED)nea con 4as apiladas o 4as mezcladas con 3as. Cada patr$([char]0x00F3)n tiene turno."
  books=@(
    @{href='./intervals.html'; en='All Intervals'; es='Todos los intervalos'},
    @{href='./scales-and-sets.html#ricker-fourths'; en='Technique Development in Fourths'; es='Technique Development in Fourths'},
    @{href='./more.html#wide-intervals'; en='Interval families'; es='Familias de intervalos'}
  )
  lines=@(
    'Stacked 4ths ascending', 'Stacked 4ths descending', '4th then 3rd', '3rd then 4th',
    '4ths only on Dom7', '4ths only on Maj7', '4ths only on Min7', '4ths only on Min7b5',
    'Alternate 4th up / 4th down', 'Two 4ths then a step', 'Quartal triad shapes', 'Quartal into a chord tone'
  )
}

Add-Ex @{
  id='more0043'; slug='inverted-interval-motifs'; bars=2
  nameEn='Inverted interval motifs'; nameEs='Motivos de intervalo invertidos'
  descEn='Fix an interval shape, then flip its direction every bar. Up/down and down/up both get turns for each interval size.'
  descEs="Fija una forma de intervalo y voltea su direcci$([char]0x00F3)n cada comp$([char]0x00E1)s. Sube/baja y baja/sube tienen turno."
  books=@(
    @{href='./motivic-development.html'; en='Motivic Development'; es="Desarrollo mot$([char]0x00ED)vico"},
    @{href='./more.html#wide-intervals'; en='Interval families'; es='Familias de intervalos'},
    @{href='./intervals.html'; en='All Intervals'; es='Todos los intervalos'}
  )
  lines=@(
    'Up 3rd / down 3rd', 'Down 3rd / up 3rd', 'Up 4th / down 4th', 'Down 4th / up 4th',
    'Up 5th / down 3rd', 'Down 5th / up 3rd', 'Up 5th / down 5th', 'Down 5th / up 5th',
    'Up 6th / down 2nd', 'Down 6th / up 2nd', 'Up octave / down step', 'Down octave / up step'
  )
}

Add-Ex @{
  id='more0044'; slug='altered-hexatonic-pairs'; bars=4
  nameEn='Altered hexatonic triad pairs'; nameEs='Pares hexatonicos alterados'
  descEn='Two major triads on tension degrees of one dominant (six-note color, no full scale). Every common pair over C7-type sound gets a turn.'
  descEs="Dos tr$([char]0x00ED)adas mayores en grados de tensi$([char]0x00F3)n de un dominante (color de seis notas). Cada par habitual sobre sonido tipo C7 tiene turno."
  books=@(
    @{href='./more.html#triad-coupling-relationships'; en='Triad coupling relationships'; es='Relaciones de acoplamiento'},
    @{href='./scales-and-sets.html#bergonzi-hexatonics'; en='Hexatonics'; es='Hexatonics'},
    @{href='./scales-and-sets.html#campbell-triad-pairs'; en='Triad Pairs for Jazz'; es='Triad Pairs for Jazz'}
  )
  lines=@(
    "Db/Eb $dot over C7", "Db/E $dot over C7", "Db/F# $dot over C7", "Eb/E $dot over C7",
    "Eb/F# $dot over C7", "Eb/Ab $dot over C7", "E/F# $dot over C7", "E/Ab $dot over C7",
    "F#/Ab $dot over C7", "F#/Bb $dot over C7", "Ab/Bb $dot over C7", "Db/Bb $dot over C7"
  )
}
$ex44 = Get-Ex 'more0044'
$ex44.nameEs = "Pares hexat$([char]0x00F3)nicos alterados"

Add-Ex @{
  id='more0045'; slug='vocab-rhythm-or-pitch'; bars=4
  nameEn='Keep rhythm or keep pitches'; nameEs='Conserva el ritmo o las alturas'
  descEn='One short phrase you already know. Alternate: same pitches new rhythm, then same rhythm new pitches. Both operations get equal turns.'
  descEs='Una frase corta que ya sabes. Alterna: mismas alturas ritmo nuevo, luego mismo ritmo alturas nuevas.'
  books=@(
    @{href='./motivic-development.html'; en='Motivic Development'; es="Desarrollo mot$([char]0x00ED)vico"},
    @{href='./rhythmic-devices.html'; en='Rhythmic Devices'; es="Recursos r$([char]0x00ED)tmicos"},
    @{href='./melodic-lines.html#riposo-vocabulary'; en='Developing a Jazz Vocabulary'; es='Developing a Jazz Vocabulary'}
  )
  lines=@(
    "Same pitches $dot new rhythm", "Same rhythm $dot new pitches",
    "Same pitches $dot half-time rhythm", "Same pitches $dot double-time rhythm",
    "Same rhythm $dot sequence up a step", "Same rhythm $dot sequence down a step",
    "Same pitches $dot start on beat 2", "Same pitches $dot start on and of 4",
    "Same rhythm $dot opposite contour", "Same pitches $dot only staccato",
    "Same rhythm $dot only through guide tones", "Trade: pitches chorus / rhythm chorus"
  )
}

Add-Ex @{
  id='more0046'; slug='twelve-key-transpose'; bars=2
  nameEn='Twelve-key transposition'; nameEs="Transposici$([char]0x00F3)n en doce tonalidades"
  descEn='One short line you can sing. Move it through all twelve keys by the cycle of fifths, then by whole steps and minor thirds. Every key gets a turn.'
  descEs="Una l$([char]0x00ED)nea corta que puedas cantar. Mu$([char]0x00E9)vela por las doce tonalidades en ciclo de quintas y luego por tonos enteros y terceras menores. Cada tonalidad tiene turno."
  books=@(
    @{href='./melodic-lines.html#coker-patterns'; en='Patterns for Jazz'; es='Patterns for Jazz'},
    @{href='./more.html#sticky-keys'; en='Sticky keys'; es="Tonalidades dif$([char]0x00ED)ciles"},
    @{href='./scales-and-sets.html#weiskopf-around-the-horn'; en='Around the Horn'; es='Around the Horn'}
  )
  lines=@(
    "in C $dot cycle of fifths", 'in F', 'in Bb', 'in Eb', 'in Ab', 'in Db',
    'in Gb', 'in B', 'in E', 'in A', 'in D', 'in G',
    'Whole steps up from C', 'Whole steps up from Db', 'Minor 3rds up from C', 'Minor 3rds up from Db'
  )
}

Add-Ex @{
  id='more0047'; slug='rhythmic-density'; bars=4
  nameEn='Rhythmic density'; nameEs="Densidad r$([char]0x00ED)tmica"
  descEn='Restrict the solo to one note value for a full turn. Half notes, quarters, eighths, and triplets each get equal time so the comfortable eighth-note default does not hide the rest.'
  descEs="Restringe el solo a un valor de nota por turno. Blancas, negras, corcheas y tresillos tienen el mismo tiempo."
  books=@(
    @{href='./rhythmic-devices.html'; en='Rhythmic Devices'; es="Recursos r$([char]0x00ED)tmicos"},
    @{href='./more.html#leave-space'; en='Leave space'; es='Deja espacio'},
    @{href='./time.html'; en='Time'; es='Tiempo'}
  )
  lines=@(
    'Only whole notes', 'Only half notes', 'Only quarter notes', 'Only eighth notes',
    'Only triplets', 'Only sixteenth notes', 'Only dotted quarters',
    'Quarters then eighths', 'Eighths then triplets', 'Half notes with one pickup',
    'One value per phrase', 'Change value every 4 bars'
  )
}

Add-Ex @{
  id='more0048'; slug='dynamics-articulation'; bars=8
  nameEn='Dynamics and articulation'; nameEs='Dinamica y articulacion'
  descEn='One dynamic or one articulation for the whole turn. Soft, loud, staccato, legato, and accent placement each get equal time.'
  descEs="Una din$([char]0x00E1)mica o una articulaci$([char]0x00F3)n por turno. Suave, fuerte, staccato, legato y acentos tienen el mismo tiempo."
  books=@(
    @{href='./sonic-nuances.html'; en='Sonic Nuances'; es='Matices sonoros'},
    @{href='./time.html'; en='Time'; es='Tiempo'},
    @{href='./free-play.html'; en='Free Play'; es='Free Play'}
  )
  lines=@(
    'Only pianissimo', 'Only mezzo-forte', 'Only fortissimo',
    'Only staccato', 'Only legato', 'Only tenuto',
    'Accent every downbeat', 'Accent every off-beat', 'Accent and of 2 and and of 4',
    'Crescendo through the phrase', 'Decrescendo through the phrase',
    'Soft attack, loud sustain', 'Loud attack, soft release'
  )
}
$ex48 = Get-Ex 'more0048'
$ex48.nameEs = "Din$([char]0x00E1)mica y articulaci$([char]0x00F3)n"

Add-Ex @{
  id='more0049'; slug='ornament-the-melody'; bars=8
  nameEn='Ornament the melody'; nameEs='Ornamenta la melodia'
  descEn='Start from a plain melody. Add grace notes, turns, and neighbor ornaments step by step without losing the original pitches.'
  descEs="Parte de una melod$([char]0x00ED)a simple. A$([char]0x00F1)ade apoyaturas, grupetos y vecinos paso a paso sin perder las alturas originales."
  books=@(
    @{href='./sonic-nuances.html'; en='Sonic Nuances'; es='Matices sonoros'},
    @{href='./approach-notes.html'; en='Approach Notes'; es="Notas de aproximaci$([char]0x00F3)n"},
    @{href='./motivic-development.html'; en='Motivic Development'; es="Desarrollo mot$([char]0x00ED)vico"}
  )
  lines=@(
    'Melody only, no ornaments', 'Add one grace note before each long note',
    'Add upper neighbor turns', 'Add lower neighbor turns',
    'Add mordents on downbeats', 'Add trills on held notes',
    'Ornament phrase starts only', 'Ornament phrase ends only',
    'Double the ornaments', 'Strip back to plain melody again',
    'Same melody, jazz ornaments', 'Same melody, classical ornaments'
  )
}
$ex49 = Get-Ex 'more0049'
$ex49.nameEs = "Ornamenta la melod$([char]0x00ED)a"

# Write JSON
$utf8 = New-Object System.Text.UTF8Encoding $false
$json = ($list.ToArray() | ConvertTo-Json -Depth 8)
[System.IO.File]::WriteAllText($path, $json, $utf8)
Write-Host ("exercises: {0}" -f $list.Count)
foreach ($ex in $list) {
  Write-Host ("{0} {1} lines={2}" -f $ex.id, $ex.slug, @($ex.lines).Count)
}
