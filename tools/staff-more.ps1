# Staff-notation variations of text exercises in tools/more-exercises.json.
# Inserts one staff exercise after its text source. Skips a text exercise when a
# staff line would only reprint pitches the text already names, or when the staff
# cannot show the task (meter, behind/ahead of the beat, sing-before-you-play).
# Re-running replaces exercises whose slugs end in -staff.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataPath = Join-Path $PSScriptRoot 'more-exercises.json'
$dot = [string][char]0x00B7
$em = [string][char]0x2014
$degSign = [string][char]0x00B0

$a = [char]0x00E1; $e = [char]0x00E9; $i = [char]0x00ED; $o = [char]0x00F3; $u = [char]0x00FA; $n = [char]0x00F1

function Es([string]$s) { return $s }

# --- pitch spelling ----------------------------------------------------------

$PcOf = @{ C = 0; D = 2; E = 4; F = 5; G = 7; A = 9; B = 11 }
$LetterNames = @('C', 'D', 'E', 'F', 'G', 'A', 'B')

function Parse-Root([string]$name) {
  if ($name -notmatch '^([A-G])(##|bb|#|b)?$') { throw "bad root $name" }
  $letter = $Matches[1]
  $acc = $Matches[2]
  $pc = $PcOf[$letter]
  if ($acc -eq '#') { $pc += 1 }
  elseif ($acc -eq '##') { $pc += 2 }
  elseif ($acc -eq 'b') { $pc -= 1 }
  elseif ($acc -eq 'bb') { $pc -= 2 }
  $pc = ($pc + 12) % 12
  return @{ name = $name; letter = $letter; pc = $pc; li = [array]::IndexOf($LetterNames, $letter) }
}

function Spell-At($rootName, [int]$letterOff, [int]$semiOff, [int]$startOct) {
  $root = Parse-Root $rootName
  $letter = $LetterNames[($root.li + $letterOff) % 7]
  $target = ($root.pc + (($semiOff % 12) + 12) % 12) % 12
  $diff = $target - $PcOf[$letter]
  if ($diff -gt 6) { $diff -= 12 }
  if ($diff -lt -6) { $diff += 12 }
  $acc = switch ($diff) {
    0 { '' }
    1 { '#' }
    2 { '##' }
    -1 { 'b' }
    -2 { 'bb' }
    default { throw "spell $rootName off $letterOff semi $semiOff diff $diff" }
  }
  $oct = $startOct + [int][math]::Floor(($root.li + $letterOff) / 7)
  # Bbb is the letter B plus a double flat, which the staff parser cannot read. Same pitch as A.
  if ($letter -eq 'B' -and $acc -eq 'bb') { return "A$oct" }
  return "$letter$acc$oct"
}

function Start-Oct([string]$rootName) {
  $pc = (Parse-Root $rootName).pc
  if ($pc -ge 8) { return 3 }
  return 4
}

$DegreeMap = @{
  '1' = @(0, 0); 'b2' = @(1, 1); '2' = @(2, 1); '#2' = @(3, 1)
  'b3' = @(3, 2); '3' = @(4, 2); '4' = @(5, 3); '#4' = @(6, 3)
  'b5' = @(6, 4); '5' = @(7, 4); '#5' = @(8, 4)
  'b6' = @(8, 5); '6' = @(9, 5); 'bb7' = @(9, 6); 'b7' = @(10, 6); '7' = @(11, 6)
  'b9' = @(13, 8); '9' = @(14, 8); '#9' = @(15, 8)
  '11' = @(17, 10); '#11' = @(18, 10)
  'b13' = @(20, 12); '13' = @(21, 12)
}

function Tone([string]$root, [string]$deg, [int]$oct, [string]$dur) {
  $spec = $DegreeMap[$deg]
  if ($null -eq $spec) { throw "deg $deg" }
  return (Spell-At $root $spec[1] $spec[0] $oct) + $dur
}

function Assert-Tone([string]$root, [string]$deg, [int]$oct, [string]$want) {
  $got = Tone $root $deg $oct ''
  if ($got -ne $want) { throw "$root $deg @$oct = $got want $want" }
}

Assert-Tone 'D' '1' 4 'D4'
Assert-Tone 'D' 'b3' 4 'F4'
Assert-Tone 'D' '5' 4 'A4'
Assert-Tone 'D' 'b7' 4 'C5'
Assert-Tone 'G' '3' 4 'B4'
Assert-Tone 'G' 'b7' 4 'F5'
Assert-Tone 'C' '7' 4 'B4'
Assert-Tone 'C' 'bb7' 4 'A4'
Assert-Tone 'Db' '3' 4 'F4'
Assert-Tone 'Db' '7' 4 'C5'
Assert-Tone 'Fb' '1' 4 'Fb4'
Assert-Tone 'Fb' '3' 4 'Ab4'
Assert-Tone 'Fb' '5' 4 'Cb5'
Assert-Tone 'Fb' 'b7' 4 'Ebb5'
Assert-Tone 'C#' 'bb7' 4 'Bb4'
Assert-Tone 'B' 'bb7' 3 'Ab4'
Assert-Tone 'E' 'bb7' 4 'Db5'
Assert-Tone 'C#' '3' 4 'E#4'
Assert-Tone 'C#' '#5' 4 'G##4'

function Scale-Steps([int[]]$semis, [int[]]$letters) {
  $steps = @()
  for ($k = 0; $k -lt $semis.Count; $k++) {
    $steps += ,@( $semis[$k], $letters[$k] )
  }
  return ,$steps
}

function Scale-Notes([string]$root, $steps, [int]$oct, [string]$dur, [switch]$WithOctave) {
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($st in $steps) {
    [void]$list.Add((Spell-At $root $st[1] $st[0] $oct) + $dur)
  }
  if ($WithOctave) {
    [void]$list.Add((Spell-At $root 7 12 $oct) + $dur)
  }
  return ,$list.ToArray()
}

$MajSteps = Scale-Steps @(0, 2, 4, 5, 7, 9, 11) @(0, 1, 2, 3, 4, 5, 6)
$NatSteps = Scale-Steps @(0, 2, 3, 5, 7, 8, 10) @(0, 1, 2, 3, 4, 5, 6)
$MixSteps = Scale-Steps @(0, 2, 4, 5, 7, 9, 10) @(0, 1, 2, 3, 4, 5, 6)
$DorSteps = Scale-Steps @(0, 2, 3, 5, 7, 9, 10) @(0, 1, 2, 3, 4, 5, 6)
$MajPentSteps = Scale-Steps @(0, 2, 4, 7, 9) @(0, 1, 2, 4, 5)
$MinPentSteps = Scale-Steps @(0, 3, 5, 7, 10) @(0, 2, 3, 4, 6)

# --- durations and bar filling ----------------------------------------------

function Get-TokenQuarters([string]$tok) {
  if ($tok -match '^\^' -or $tok -like '@*') { return 0 }
  if ($tok -eq '|' -or $tok -eq '~') { return 0 }
  if ($tok -in @('pp', 'p', 'mp', 'mf', 'f', 'ff', 'sfz', 'cresc', 'dim')) { return 0 }
  $core = $tok
  if ($core.StartsWith('[')) {
    $inner = ($core -replace '^\[', '' -replace '\].*$', '')
    $core = ($inner -split '\s+')[0]
  }
  $core = $core.Trim('~')
  if (-not $core) { return 0 }
  $core = $core -replace '_.*$', ''
  $core = $core -replace '[>''\^\-]+$', ''
  $mult = 1.0
  if ($core.EndsWith('.')) { $mult = 1.5; $core = $core.Substring(0, $core.Length - 1) }
  if ($core -match 'w$') { return 4 * $mult }
  if ($core -match 'h$') { return 2 * $mult }
  if ($core -match 'q$') { return 1 * $mult }
  if ($core -match 'e$') { return 0.5 * $mult }
  if ($core -match 's$') { return 0.25 * $mult }
  if ($core -match '^[A-Ga-g]' -or $core -eq '/' -or $core -eq 'r') { return 1 * $mult }
  throw "duration of [$tok]"
}

function Measure-Music([string]$music) {
  $sep = " $dot "
  $at = $music.IndexOf($sep)
  if ($at -ge 0) { $music = $music.Substring(0, $at) }
  $toks = @($music.Split(@(' '), [StringSplitOptions]::RemoveEmptyEntries))
  $i = 0
  $q = 0.0
  while ($i -lt $toks.Count) {
    $t = $toks[$i]
    if ($t.StartsWith('(')) {
      $group = New-Object System.Collections.Generic.List[string]
      [void]$group.Add($t)
      while ($group[$group.Count - 1] -notmatch '\)$') {
        $i++
        if ($i -ge $toks.Count) { throw "open tuplet in $music" }
        [void]$group.Add($toks[$i])
      }
      if ($group[0] -notmatch '^\((\d+)(?::(\d+))?$') { throw "tuplet $($group[0])" }
      $nn = [int]$Matches[1]
      if ($Matches[2]) { $mm = [int]$Matches[2] }
      elseif ($nn -eq 3) { $mm = 2 }
      elseif ($nn -ge 5 -and $nn -le 8) { $mm = 4 }
      else { $mm = 2 }
      $inner = 0.0
      for ($k = 1; $k -lt $group.Count; $k++) {
        $note = $group[$k] -replace '\)$', ''
        if ($note) { $inner += Get-TokenQuarters $note }
      }
      $q += ($inner * $mm / $nn)
      $i++
      continue
    }
    if ($t.StartsWith('[')) {
      $buf = $t
      while ($buf -notmatch '\]') {
        $i++
        if ($i -ge $toks.Count) { throw "open stack in $music" }
        $buf += ' ' + $toks[$i]
      }
      $q += Get-TokenQuarters $buf
      $i++
      continue
    }
    if ($t -eq '|' -or $t -like '^*' -or $t -like '@*' -or $t -eq '~') { $i++; continue }
    if ($t -in @('pp', 'p', 'mp', 'mf', 'f', 'ff', 'sfz', 'cresc', 'dim')) { $i++; continue }
    $q += Get-TokenQuarters ($t -replace '~$', '')
    $i++
  }
  return $q
}

function Rests-For([double]$room) {
  $left = [math]::Round($room, 4)
  $toks = New-Object System.Collections.Generic.List[string]
  while ($left -gt 0.001) {
    if ($left -ge 4 - 0.001) { [void]$toks.Add('rw'); $left -= 4; continue }
    if ($left -ge 3 - 0.001) { [void]$toks.Add('rh.'); $left -= 3; continue }
    if ($left -ge 2 - 0.001) { [void]$toks.Add('rh'); $left -= 2; continue }
    if ($left -ge 1.5 - 0.001) { [void]$toks.Add('rq.'); $left -= 1.5; continue }
    if ($left -ge 1 - 0.001) { [void]$toks.Add('rq'); $left -= 1; continue }
    if ($left -ge 0.75 - 0.001) { [void]$toks.Add('re.'); $left -= 0.75; continue }
    if ($left -ge 0.5 - 0.001) { [void]$toks.Add('re'); $left -= 0.5; continue }
    if ($left -ge 0.25 - 0.001) { [void]$toks.Add('rs'); $left -= 0.25; continue }
    throw "cannot rest $left"
  }
  return ,$toks.ToArray()
}

function Build-Line($events, [int]$bars, [string]$caption, [string]$prefix) {
  $list = New-Object System.Collections.Generic.List[string]
  foreach ($ev in @($events)) {
    if ($null -eq $ev) { continue }
    if ($ev -is [System.Array]) {
      foreach ($inner in $ev) {
        if ($null -eq $inner) { continue }
        if ($inner -is [System.Array]) {
          foreach ($n in $inner) { if ($n) { [void]$list.Add([string]$n) } }
        }
        elseif ($inner) { [void]$list.Add([string]$inner) }
      }
    }
    elseif ($ev) { [void]$list.Add([string]$ev) }
  }
  $sum = 0.0
  foreach ($ev in $list) { $sum += Get-TokenQuarters $ev }
  $target = $bars * 4.0
  if ($sum -gt $target + 0.02) { throw ("overfull {0} > {1}: {2}" -f $sum, $target, ($list -join ' ')) }
  $pos = 0.0
  $barIndex = 0
  $barsOut = New-Object System.Collections.Generic.List[string]
  $bar = New-Object System.Collections.Generic.List[string]
  foreach ($ev in $list) {
    $dq = Get-TokenQuarters $ev
    if ($dq -eq 0) { [void]$bar.Add($ev); continue }
    if ($pos + $dq -gt 4.02) { throw "crosses bar at $pos : $ev" }
    [void]$bar.Add($ev)
    $pos = [math]::Round($pos + $dq, 4)
    if ([math]::Abs($pos - 4) -lt 0.02) {
      [void]$barsOut.Add(($bar -join ' '))
      $bar.Clear()
      $pos = 0
      $barIndex++
    }
  }
  while ($barIndex -lt $bars) {
    $room = [math]::Round(4 - $pos, 4)
    foreach ($r in (Rests-For $room)) { [void]$bar.Add($r) }
    [void]$barsOut.Add(($bar -join ' '))
    $bar.Clear()
    $pos = 0
    $barIndex++
  }
  $music = $barsOut -join ' | '
  if ($prefix) { $music = $prefix + ' ' + $music }
  if ($caption) { $music = $music + ' ' + $dot + ' ' + $caption }
  $got = Measure-Music $music
  if ([math]::Abs($got - $target) -gt 0.02) { throw "measure $got want $target :: $music" }
  return $music
}

function Join-Raw([string]$music, [int]$bars) {
  $got = Measure-Music $music
  $want = $bars * 4.0
  if ([math]::Abs($got - $want) -gt 0.02) { throw "raw $got want $want :: $music" }
  return $music
}

# --- catalog -----------------------------------------------------------------

$rawText = [IO.File]::ReadAllText($dataPath)
$data = $rawText | ConvertFrom-Json
$byId = @{}
foreach ($ex in $data) { $byId[$ex.id] = $ex }

$made = New-Object System.Collections.Generic.List[object]
$seq = 70

function Copy-Books($ex) {
  $books = @()
  foreach ($b in @($ex.books)) {
    $books += [ordered]@{ href = [string]$b.href; en = [string]$b.en; es = [string]$b.es }
  }
  return ,$books
}

function Add-Staff([string]$afterId, [string]$slug, [string]$group, [int]$bars, [string]$nameEn, [string]$nameEs, [string]$descEn, [string]$descEs, [string[]]$lines) {
  if (-not $byId.ContainsKey($afterId)) { throw "missing $afterId" }
  if (-not $slug.EndsWith('-staff')) { throw "slug $slug" }
  foreach ($ln in $lines) {
    if ($ln -match '[<&]') { throw "forbidden char in $slug :: $ln" }
    $m = Measure-Music $ln
    if ([math]::Abs($m - ($bars * 4.0)) -gt 0.02) { throw "$slug bars $bars measured $m :: $ln" }
  }
  $id = 'more{0:d4}' -f $script:seq
  $script:seq++
  $obj = [ordered]@{
    id = $id
    slug = $slug
    group = $group
    staff = $true
    bars = $bars
    nameEn = $nameEn
    nameEs = $nameEs
    descEn = $descEn
    descEs = $descEs
    books = (Copy-Books $byId[$afterId])
    lines = $lines
  }
  [void]$script:made.Add([pscustomobject]@{ after = $afterId; obj = $obj })
}

function Caption([string]$s) { return $s }

function Clean-Degree([string]$s) {
  return $s.Replace(([string][char]0x00C2 + $degSign), $degSign)
}

# Roman numeral -> root name in C, and triad quality.
function Roman-Root([string]$token) {
  $token = Clean-Degree $token
  $romanPattern = '^(bb|b|#)?(VII|VI|IV|V|III|II|I)(Maj|sus4|maj7|-|\+|' + $degSign + ')?$'
  if ($token -notmatch $romanPattern) { throw "roman $token" }
  $acc = $Matches[1]
  $num = $Matches[2]
  $qual = $Matches[3]
  $base = @{ I = @('C', 0); II = @('D', 2); III = @('E', 4); IV = @('F', 5); V = @('G', 7); VI = @('A', 9); VII = @('B', 11) }[$num]
  $letter = $base[0]
  $pc = $base[1]
  if ($acc -eq 'b') { $pc -= 1 }
  elseif ($acc -eq '#') { $pc += 1 }
  elseif ($acc -eq 'bb') { $pc -= 2 }
  $pc = ($pc + 12) % 12
  # Spell with the accidental the roman name asked for.
  $spelled = switch ($acc) {
    'bb' { $letter + 'bb' }
    'b' { if ($PcOf[$letter] - 1 -eq $pc -or (($PcOf[$letter] + 11) % 12) -eq $pc) { $letter + 'b' } else { $letter + 'b' } }
    '#' { $letter + '#' }
    default { $letter }
  }
  if ($spelled -eq 'Bbb') { $spelled = 'A' }
  if (-not $qual -or $qual -eq 'Maj' -or $qual -eq 'maj7') { $q = 'M' }
  elseif ($qual -eq '-') { $q = 'm' }
  elseif ($qual -eq '+') { $q = 'aug' }
  elseif ($qual -eq $degSign) { $q = 'dim' }
  elseif ($qual -eq 'sus4') { $q = 'sus' }
  else { throw "qual $qual" }
  # Check spelled root's pitch class matches.
  $got = (Parse-Root $spelled).pc
  if ($got -ne $pc) { throw "roman $token spelled $spelled pc $got want $pc" }
  return @{ root = $spelled; qual = $q }
}

function Triad-Degrees([string]$qual) {
  switch ($qual) {
    'M' { return @('1', '3', '5') }
    'm' { return @('1', 'b3', '5') }
    'aug' { return @('1', '3', '#5') }
    'dim' { return @('1', 'b3', 'b5') }
    'sus' { return @('1', '4', '5') }
    default { throw $qual }
  }
}

function Triad-Tokens([string]$root, [string]$qual, [string]$dur) {
  $oct = Start-Oct $root
  $toks = New-Object System.Collections.Generic.List[string]
  foreach ($d in (Triad-Degrees $qual)) { [void]$toks.Add((Tone $root $d $oct $dur)) }
  return ,$toks.ToArray()
}

function Arp-Bars([string]$chordSym, [string]$root, [string[]]$degs) {
  $oct = Start-Oct $root
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add("^$chordSym")
  foreach ($d in $degs) { [void]$ev.Add((Tone $root $d $oct 'q')) }
  return ,$ev.ToArray()
}

function Parse-ChordSymbol([string]$sym) {
  if ($sym -notmatch '^([A-G](?:#|b)?)(m7b5|maj7|m7|dim7|7alt|7sus|7b9|m7b5|7|o|m|\+)?$') { throw "chord $sym" }
  $root = $Matches[1]
  $q = $Matches[2]
  if (-not $q) { $q = 'M' }
  $degs = switch ($q) {
    'maj7' { @('1', '3', '5', '7') }
    'm7' { @('1', 'b3', '5', 'b7') }
    'm7b5' { @('1', 'b3', 'b5', 'b7') }
    '7' { @('1', '3', '5', 'b7') }
    '7alt' { @('1', '3', '#5', 'b7') }
    '7b9' { @('1', '3', '5', 'b7') }
    '7sus' { @('1', '4', '5', 'b7') }
    'o' { @('1', 'b3', 'b5', 'bb7') }
    'dim7' { @('1', 'b3', 'b5', 'bb7') }
    'm' { @('1', 'b3', '5', '8') }
    '+' { @('1', '3', '#5', '8') }
    'M' { @('1', '3', '5', '8') }
    default { throw "outline $q" }
  }
  # '8' means octave of the root: letter 7, semi 12. Handle below if present.
  return @{ root = $root; qual = $q; degs = $degs }
}

function Chord-Bar([string]$sym) {
  $info = Parse-ChordSymbol $sym
  $oct = Start-Oct $info.root
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add("^$sym")
  foreach ($d in $info.degs) {
    if ($d -eq '8') { [void]$ev.Add((Spell-At $info.root 7 12 $oct) + 'q') }
    else { [void]$ev.Add((Tone $info.root $d $oct 'q')) }
  }
  return ,$ev.ToArray()
}

function Chord-Pair([string]$symA, [string]$symB) {
  # Two chords share a bar: root and third of each, as quarters.
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($sym in @($symA, $symB)) {
    $info = Parse-ChordSymbol $sym
    $third = if ($info.qual -in @('m7', 'm7b5', 'm', 'o', 'dim7')) { 'b3' } elseif ($info.qual -eq '7sus') { '4' } else { '3' }
    $oct = Start-Oct $info.root
    [void]$ev.Add("^$sym")
    [void]$ev.Add((Tone $info.root '1' $oct 'q'))
    [void]$ev.Add((Tone $info.root $third $oct 'q'))
  }
  return ,$ev.ToArray()
}

# =============================================================================
# Exercises
# =============================================================================

# --- sticky keys: written scales, all 24 keys ---
$scaleLines = New-Object System.Collections.Generic.List[string]
foreach ($pair in @(
    @{ n = 'C'; minor = $false }, @{ n = 'Db'; minor = $false }, @{ n = 'D'; minor = $false },
    @{ n = 'Eb'; minor = $false }, @{ n = 'E'; minor = $false }, @{ n = 'F'; minor = $false },
    @{ n = 'F#'; minor = $false }, @{ n = 'G'; minor = $false }, @{ n = 'Ab'; minor = $false },
    @{ n = 'A'; minor = $false }, @{ n = 'Bb'; minor = $false }, @{ n = 'B'; minor = $false }
  )) {
  $up = Scale-Notes $pair.n $MajSteps 4 'e' -WithOctave
  $downDegs = @(6, 5, 4, 3, 2, 1, 0)
  $down = New-Object System.Collections.Generic.List[string]
  foreach ($di in $downDegs) { [void]$down.Add((Spell-At $pair.n $MajSteps[$di][1] $MajSteps[$di][0] 4) + 'e') }
  [void]$down.Add('re')
  $cap = "$($pair.n) major"
  [void]$scaleLines.Add((Build-Line (@($up) + @($down)) 2 $cap "@key=$($pair.n)"))
}
foreach ($nm in @('C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B')) {
  $oct = 4
  if ((Parse-Root $nm).pc -ge 8) { $oct = 3 }
  # Keep the tonic on the staff: B minor and Bb minor start at 3, others at 4.
  # G# pc 8 would drop to 3; that is fine. C# pc 1 stays at 4.
  $up = Scale-Notes $nm $NatSteps $oct 'e' -WithOctave
  $down = New-Object System.Collections.Generic.List[string]
  foreach ($di in @(6, 5, 4, 3, 2, 1, 0)) { [void]$down.Add((Spell-At $nm $NatSteps[$di][1] $NatSteps[$di][0] $oct) + 'e') }
  [void]$down.Add('re')
  [void]$scaleLines.Add((Build-Line (@($up) + @($down)) 2 "$nm minor" "@key=${nm}m"))
}
Add-Staff 'more0001' 'sticky-keys-staff' 'pitch' 2 `
  'Sticky keys on the staff' "Tonalidades dif${i}ciles en el pentagrama" `
  'Every major and every natural minor, one octave up and down, written in its key. The easy keys and the ones students skip get the same two bars.' `
  "Cada mayor y cada menor natural, una octava de ida y vuelta, escrita en su armadura. Las f${a}ciles y las que se saltan tienen los mismos dos compases." `
  $scaleLines.ToArray()

# --- outline: 1-3-5-7, 7-5-3-1, 3-5-7-9 written ---
$twoFive = @(
  @{ ii = 'Dm7'; v = 'G7'; i = 'Cmaj7' },
  @{ ii = 'Gm7'; v = 'C7'; i = 'Fmaj7' },
  @{ ii = 'Cm7'; v = 'F7'; i = 'Bbmaj7' },
  @{ ii = 'Fm7'; v = 'Bb7'; i = 'Ebmaj7' },
  @{ ii = 'Bbm7'; v = 'Eb7'; i = 'Abmaj7' },
  @{ ii = 'Ebm7'; v = 'Ab7'; i = 'Dbmaj7' },
  @{ ii = 'Abm7'; v = 'Db7'; i = 'Gbmaj7' },
  @{ ii = 'C#m7'; v = 'F#7'; i = 'Bmaj7' },
  @{ ii = 'F#m7'; v = 'B7'; i = 'Emaj7' },
  @{ ii = 'Bm7'; v = 'E7'; i = 'Amaj7' },
  @{ ii = 'Em7'; v = 'A7'; i = 'Dmaj7' },
  @{ ii = 'Am7'; v = 'D7'; i = 'Gmaj7' }
)
function Outline-Bar($sym, $shape) {
  $info = Parse-ChordSymbol $sym
  $map = @{
    'm7' = @{ '1' = '1'; '3' = 'b3'; '5' = '5'; '7' = 'b7'; '9' = '9' }
    '7' = @{ '1' = '1'; '3' = '3'; '5' = '5'; '7' = 'b7'; '9' = '9' }
    'maj7' = @{ '1' = '1'; '3' = '3'; '5' = '5'; '7' = '7'; '9' = '9' }
  }[$info.qual]
  $oct = Start-Oct $info.root
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add("^$sym")
  foreach ($d in $shape) { [void]$ev.Add((Tone $info.root $map[$d] $oct 'q')) }
  return ,$ev.ToArray()
}
$outlineLines = New-Object System.Collections.Generic.List[string]
foreach ($shape in @(
    @{ degs = @('1', '3', '5', '7'); cap = '1 3 5 7' },
    @{ degs = @('7', '5', '3', '1'); cap = '7 5 3 1' },
    @{ degs = @('3', '5', '7', '9'); cap = '3 5 7 9' }
  )) {
  foreach ($row in $twoFive) {
    $ev = New-Object System.Collections.Generic.List[string]
    foreach ($sym in @($row.ii, $row.v, $row.i, $row.i)) {
      foreach ($t in (Outline-Bar $sym $shape.degs)) { [void]$ev.Add($t) }
    }
    [void]$outlineLines.Add((Build-Line $ev.ToArray() 4 "$($shape.cap) $($row.ii) $($row.v) $($row.i)" ''))
  }
}
Add-Staff 'more0004' 'outline-changes-staff' 'changes' 4 `
  'Outline the changes on the staff' 'Dibujar los cambios en el pentagrama' `
  'The three skeletons written out: 1-3-5-7, then 7-5-3-1, then 3-5-7-9, on a II-V-I in all twelve keys. The I chord fills the last two bars.' `
  "Los tres esqueletos escritos: 1-3-5-7, luego 7-5-3-1, luego 3-5-7-9, en un II-V-I de las doce tonalidades. El I ocupa los dos ${u}ltimos compases." `
  $outlineLines.ToArray()

# --- slow time ---
$slow = @(
  (Build-Line @('C4w', 'D4w', 'E4w', 'G4w') 4 'Whole notes' ''),
  (Build-Line @('C4h', 'E4h', 'G4h', 'C5h', 'E4h', 'C4h', 'G4h', 'E4h') 4 'Half notes' ''),
  (Build-Line @('C4q', 'D4q', 'E4q', 'G4q', 'G4q', 'E4q', 'D4q', 'C4q', 'E4q', 'G4q', 'C5q', 'G4q', 'E4q', 'D4q', 'C4q', 'C4q') 4 'Quarters' ''),
  (Build-Line (@('C4e', 'D4e', 'E4e', 'G4e', 'C5e', 'G4e', 'E4e', 'D4e') * 4) 4 'Eighths' ''),
  (Build-Line @('C4q', 'rq', 'E4q', 'rq', 'G4q', 'rq', 'C5q', 'rq', 'E4q', 'rq', 'C4q', 'rq', 'G4q', 'rq', 'E4q', 'rq') 4 'Beats 1 and 3' ''),
  (Build-Line @('rq', 'C4q', 'rq', 'E4q', 'rq', 'G4q', 'rq', 'C5q', 'rq', 'E4q', 'rq', 'C4q', 'rq', 'G4q', 'rq', 'E4q') 4 'Beats 2 and 4' ''),
  (Build-Line (@('re', 'C4e', 're', 'D4e', 're', 'E4e', 're', 'G4e') * 4) 4 'Off the beat' ''),
  (Build-Line @('C4q', 'rq', 'rq', 'rq', 'E4q', 'rq', 'rq', 'rq', 'G4q', 'rq', 'rq', 'rq', 'C5q', 'rq', 'rq', 'rq') 4 'One short note per bar' ''),
  (Build-Line @('C4q', 'E4q', 'rq', 'rq', 'G4q', 'C5q', 'rq', 'rq', 'E4q', 'D4q', 'rq', 'rq', 'C4q', 'G4q', 'rq', 'rq') 4 'Two notes per bar' ''),
  (Build-Line @('C4w', 'rw', 'E4w', 'rw') 4 'Rest bars 2 and 4' '')
)
# fix off the beat - I may have miscounted. Build-Line will throw.
Add-Staff 'more0006' 'slow-time-staff' 'rhythm' 4 `
  'Slow time on the staff' 'Tiempo lento en el pentagrama' `
  'One written rhythm per turn, on C-D-E-G, at a slow click. Wholes, halves, quarters, eighths, then the placements: 1 and 3, 2 and 4, the offbeats, one attack, two attacks, and a rest on bars 2 and 4.' `
  "Un ritmo escrito por turno, sobre C-D-E-G, con el clic lento. Redondas, blancas, negras, corcheas, y luego las colocaciones: 1 y 3, 2 y 4, los contratiempos, un ataque, dos ataques, y silencio en los compases 2 y 4." `
  $slow

# --- interval families: eight leaps, bottoms on C D E F G A B C ---
function Leap-Note([string]$root, [int]$oct, [int]$letterOff, [int]$semi) {
  return (Spell-At $root $letterOff $semi $oct) + 'e'
}
function Pair-Leaps([int]$letterOff, [int]$semi, [string[]]$roots, [int[]]$octs) {
  $ev = New-Object System.Collections.Generic.List[string]
  for ($k = 0; $k -lt $roots.Count; $k++) {
    [void]$ev.Add("$($roots[$k])$($octs[$k])e")
    [void]$ev.Add((Leap-Note $roots[$k] $octs[$k] $letterOff $semi))
  }
  return ,$ev.ToArray()
}
$allRoots = @('C', 'D', 'E', 'F', 'G', 'A', 'B', 'C')
$allOcts = @(4, 4, 4, 4, 4, 4, 4, 5)
$halfRoots = @('C', 'D', 'E', 'F')
$halfOcts = @(4, 4, 4, 4)
$intervals = New-Object System.Collections.Generic.List[string]
function Add-Family([int]$letterOff, [int]$semi, [string]$cap) {
  [void]$script:intervals.Add((Build-Line (Pair-Leaps $letterOff $semi $allRoots $allOcts) 2 $cap ''))
}
Add-Family 1 1 'Minor 2nds'
Add-Family 1 2 'Major 2nds'
Add-Family 2 3 'Minor 3rds'
Add-Family 2 4 'Major 3rds'
Add-Family 3 5 'Perfect 4ths'
Add-Family 4 6 'Tritones'
Add-Family 4 7 'Perfect 5ths'
Add-Family 5 8 'Minor 6ths'
Add-Family 5 9 'Major 6ths'
Add-Family 6 10 'Minor 7ths'
Add-Family 6 11 'Major 7ths'
Add-Family 7 12 'Octaves'
function Mix-Family([int]$la, [int]$sa, [int]$lb, [int]$sb, [string]$cap) {
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($chunk in @(Pair-Leaps $la $sa $halfRoots $halfOcts)) {
    foreach ($n in @($chunk)) { [void]$ev.Add([string]$n) }
  }
  foreach ($chunk in @(Pair-Leaps $lb $sb $halfRoots $halfOcts)) {
    foreach ($n in @($chunk)) { [void]$ev.Add([string]$n) }
  }
  [void]$script:intervals.Add((Build-Line $ev.ToArray() 2 $cap ''))
}
Mix-Family 3 5 4 7 '4ths then 5ths'
Mix-Family 5 9 2 4 '6ths then 3rds'
Mix-Family 1 2 6 10 '2nds then 7ths'
Add-Staff 'more0007' 'interval-families-staff' 'pitch' 2 `
  'Interval families on the staff' 'Familias de intervalos en el pentagrama' `
  'Each family written as eight leaps from C: minor 2nds through the octave, then 4ths into 5ths, 6ths into 3rds, and 2nds into 7ths. One family fills the two bars.' `
  "Cada familia escrita como ocho saltos desde C: de 2as menores hasta la octava, luego 4as hacia 5as, 6as hacia 3as, y 2as hacia 7as. Una familia llena los dos compases." `
  $intervals.ToArray()

# --- turnarounds: chord tones ---
function Chords-Line([string]$text, [string]$cap) {
  $body = ($text -split ' · ')[0].Trim()
  $chords = @($body -split '\s+')
  $ev = New-Object System.Collections.Generic.List[string]
  if ($chords.Count -eq 4) {
    foreach ($c in $chords) { foreach ($t in (Chord-Bar $c)) { [void]$ev.Add($t) } }
  }
  elseif ($chords.Count -eq 5) {
    foreach ($c in $chords[0..2]) { foreach ($t in (Chord-Bar $c)) { [void]$ev.Add($t) } }
    foreach ($t in (Chord-Pair $chords[3] $chords[4])) { [void]$ev.Add($t) }
  }
  else { throw "turnaround $($chords.Count) $text" }
  return Build-Line $ev.ToArray() 4 $cap ''
}
$turnLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0009'].lines)) {
  $cap = if ($ln -match ' · (.+)$') { $Matches[1] } else { '' }
  [void]$turnLines.Add((Chords-Line $ln $cap))
}
Add-Staff 'more0009' 'turnarounds-staff' 'changes' 4 `
  'Turnarounds on the staff' 'Turnarounds en el pentagrama' `
  'Each turnaround spelled as chord tones, one chord to a bar. Starlight puts the last two chords in the fourth bar, root and third of each.' `
  "Cada turnaround escrito con las notas del acorde, un acorde por compás. Starlight pone los dos ${u}ltimos acordes en el cuarto compás, fundamental y tercera de cada uno." `
  $turnLines.ToArray()

# --- blues forms: six shapes in C, chord tones ---
function Form-Line([string]$text) {
  $cap = ''
  $body = $text
  if ($text -match '^(.*) · (.+)$') { $body = $Matches[1]; $cap = $Matches[2] }
  $romans = @($body -split '\|' | ForEach-Object { $_.Trim() })
  if ($romans.Count -ne 12) { throw "form $($romans.Count) $text" }
  $map = @{
    'I7' = 'C7'; 'IV7' = 'F7'; 'V7' = 'G7'; '#IVo' = 'F#o'; 'VI7' = 'A7'; 'IIm7' = 'Dm7'
    'II7' = 'D7'; 'Imaj7' = 'Cmaj7'; 'bVII7' = 'Bb7'
    'Im7' = 'Cm7'; 'IVm7' = 'Fm7'; 'bVI7' = 'Ab7'
  }
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($r in $romans) {
    if (-not $map.ContainsKey($r)) { throw "roman $r" }
    foreach ($t in (Chord-Bar $map[$r])) { [void]$ev.Add($t) }
  }
  return Build-Line $ev.ToArray() 12 $cap ''
}
$bluesFormLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0010'].lines)) { [void]$bluesFormLines.Add((Form-Line $ln)) }
Add-Staff 'more0010' 'blues-forms-staff' 'changes' 12 `
  'Blues forms on the staff' 'Formas de blues en el pentagrama' `
  'Six twelve-bar shapes in C, each chord written 1-3-5-7. Basic, jazz, minor, Bird, major, and the side slip. The all-key charts stay in the text blues exercises.' `
  "Seis formas de doce compases en C, cada acorde escrito 1-3-5-7. B${a}sico, jazz, menor, Bird, mayor y el side slip. Las tablas en todas las tonalidades siguen en los ejercicios de blues en texto." `
  $bluesFormLines.ToArray()

# --- rhythm bridge: arpeggios ---
$bridgeLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0011'].lines)) {
  $cap = ''
  $body = $ln
  if ($ln -match '^(.*) · (.+)$') { $body = $Matches[1]; $cap = $Matches[2] }
  $chords = @($body.Trim() -split '\s+')
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($c in $chords) { foreach ($t in (Chord-Bar $c)) { [void]$ev.Add($t) } }
  [void]$bridgeLines.Add((Build-Line $ev.ToArray() 4 $cap ''))
}
Add-Staff 'more0011' 'rhythm-bridge-staff' 'changes' 4 `
  'Rhythm bridge on the staff' 'Puente de Rhythm Changes en el pentagrama' `
  'III7-VI7-II7-V7 from all twelve centers, each dominant arpeggiated 1-3-5-b7 for a bar.' `
  'III7-VI7-II7-V7 desde los doce centros, cada dominante arpegiado 1-3-5-b7 durante un compás.' `
  $bridgeLines.ToArray()

# --- tritone road ---
$triLines = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0012'].lines)) {
  $chords = @($ln.Trim() -split '\s+')
  if ($chords.Count -ne 3) { throw "tritone $ln" }
  $ev = New-Object System.Collections.Generic.List[string]
  foreach ($t in (Chord-Bar $chords[0])) { [void]$ev.Add($t) }
  foreach ($t in (Chord-Pair $chords[1] $chords[2])) { [void]$ev.Add($t) }
  [void]$triLines.Add((Build-Line $ev.ToArray() 2 ($chords -join ' ') ''))
}
Add-Staff 'more0012' 'tritone-road-staff' 'changes' 2 `
  'Tritone road on the staff' 'Camino del tritono en el pentagrama' `
  'II-bII7-I in all twelve keys. The II chord is a full bar of 1-3-5-7. The next bar is the root and third of bII7, then the root and third of I.' `
  'II-bII7-I en las doce tonalidades. El II es un compás de 1-3-5-7. El compás siguiente es fundamental y tercera de bII7, luego fundamental y tercera de I.' `
  $triLines.ToArray()

# --- pentatonic colors ---
function Pent-KindNotes([string]$name) {
  $m = [regex]::Match($name, '^([A-G](?:#|b)?) (major|minor) pent$')
  if (-not $m.Success) { throw "pent $name" }
  $root = $m.Groups[1].Value
  $steps = if ($m.Groups[2].Value -eq 'major') { $MajPentSteps } else { $MinPentSteps }
  $oct = 4
  if ((Parse-Root $root).pc -ge 8) { $oct = 3 }
  $up = Scale-Notes $root $steps $oct 'e' -WithOctave
  # 6 notes up. Need 32 eighths over 4 bars: ping-pong.
  $asc = @($up)
  $desc = @()
  for ($k = $asc.Count - 2; $k -ge 1; $k--) { $desc += $asc[$k] }
  $cycle = @($asc) + @($desc)
  $out = New-Object System.Collections.Generic.List[string]
  $idx = 0
  while ($out.Count -lt 32) {
    [void]$out.Add($cycle[$idx % $cycle.Count])
    $idx++
  }
  return ,$out.ToArray()
}
$pentColor = New-Object System.Collections.Generic.List[string]
foreach ($ln in @($byId['more0013'].lines)) {
  $parts = $ln -split ' · '
  $ev = New-Object System.Collections.Generic.List[string]
  [void]$ev.Add('^' + $parts[1].Trim())
  foreach ($noteTok in (Pent-KindNotes $parts[0].Trim())) { [void]$ev.Add($noteTok) }
  [void]$pentColor.Add((Build-Line $ev.ToArray() 4 $parts[0].Trim() ''))
}
Add-Staff 'more0013' 'pentatonic-colors-staff' 'pitch' 4 `
  'Pentatonic colors on the staff' "Colores pentat${o}nicos en el pentagrama" `
  'The named major or minor pentatonic, written over its chord and walked up and down for four bars. The color has to keep moving.' `
  "La pentat${o}nica mayor o menor nombrada, escrita sobre su acorde y recorrida de ida y vuelta durante cuatro compases. El color tiene que seguir movi${e}ndose." `
  $pentColor.ToArray()

. (Join-Path $PSScriptRoot 'staff-more-b.ps1')
