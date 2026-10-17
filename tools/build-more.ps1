# Reads tools/more-exercises.json, writes more.html and es/more.html.
# Packed hashes come from node tools/share-url.js when node is available,
# otherwise from tools/share-hashes.json. Without either, the page keeps #s=.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataPath = Join-Path $PSScriptRoot 'more-exercises.json'
$exercises = Get-Content -LiteralPath $dataPath -Encoding UTF8 -Raw | ConvertFrom-Json

$hashMap = $null
$hashFile = Join-Path $PSScriptRoot 'share-hashes.json'
$nodeExe = $null
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) { $nodeExe = $nodeCmd.Source }
if (-not $nodeExe) {
  $helper = Join-Path $env:LOCALAPPDATA 'Programs\cursor\resources\app\resources\helpers\node.exe'
  if (Test-Path -LiteralPath $helper) { $nodeExe = $helper }
}
if ($nodeExe) {
  $hashOut = Join-Path $PSScriptRoot '_hashes.json'
  $hashErr = Join-Path $PSScriptRoot '_hashes.err'
  $proc = Start-Process -FilePath $nodeExe -ArgumentList @((Join-Path $PSScriptRoot 'share-url.js')) -Wait -PassThru -NoNewWindow -RedirectStandardOutput $hashOut -RedirectStandardError $hashErr
  if ($proc.ExitCode -ne 0) { throw 'share pack failed' }
  $hashMap = Get-Content -LiteralPath $hashOut -Encoding UTF8 -Raw | ConvertFrom-Json
  Remove-Item -LiteralPath $hashOut, $hashErr -ErrorAction SilentlyContinue
} elseif (Test-Path -LiteralPath $hashFile) {
  $hashMap = Get-Content -LiteralPath $hashFile -Encoding UTF8 -Raw | ConvertFrom-Json
}

function Share-Encode([string]$text) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
  $b64 = [Convert]::ToBase64String($bytes)
  return ($b64 -replace '\+', '-' -replace '/', '_' -replace '=+$', '')
}

function Json-Escape([string]$s) {
  $sb = New-Object System.Text.StringBuilder
  foreach ($ch in $s.ToCharArray()) {
    $code = [int]$ch
    if ($ch -eq [char]0x5C) { [void]$sb.Append([char]0x5C); [void]$sb.Append([char]0x5C) }
    elseif ($ch -eq '"') { [void]$sb.Append('\') ; [void]$sb.Append('"') }
    elseif ($code -lt 0x20) { [void]$sb.AppendFormat('\u{0:x4}', $code) }
    else { [void]$sb.Append($ch) }
  }
  return $sb.ToString()
}

function Share-Hash($id, $name, $bars, $lines) {
  $parts = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    [void]$parts.Add('"' + (Json-Escape ([string]$line)) + '"')
  }
  $json = '{"v":1,"id":"' + (Json-Escape $id) + '","name":"' + (Json-Escape $name) + '","bars":' + $bars + ',"lines":[' + ($parts -join ',') + ']}'
  return '#s=' + (Share-Encode $json)
}

function Html-Escape([string]$s) {
  if ($null -eq $s) { return '' }
  return ($s.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;').Replace('"', '&quot;'))
}

foreach ($ex in $exercises) {
  $names = @($ex.PSObject.Properties.Name)
  if ($names -contains 'exercise' -and $ex.exercise) {
    $hash = '?exercise=' + [string]$ex.exercise
    $ex | Add-Member -NotePropertyName hash -NotePropertyValue $hash -Force
    Write-Host ("{0} catalog {1}" -f $ex.id, $ex.exercise)
    continue
  }
  if ($hashMap) {
    $packed = $hashMap.PSObject.Properties[$ex.id]
    if (-not $packed) { throw "missing packed hash for $($ex.id)" }
    $hash = [string]$packed.Value
  } else {
    $hash = Share-Hash $ex.id $ex.nameEn ([int]$ex.bars) $ex.lines
  }
  $ex | Add-Member -NotePropertyName hash -NotePropertyValue $hash -Force
  $len = ('https://eization.com/' + $hash).Length
  if ($len -gt 8000) { throw "URL too long for $($ex.id): $len" }
  Write-Host ("{0} {1} chars" -f $ex.id, $len)
}

$groupOf = @{
  'sticky-keys' = 'pitch'
  'wide-intervals' = 'pitch'
  'pentatonic-colors' = 'pitch'
  'one-octave' = 'pitch'
  'scale-patterns' = 'pitch'
  'lower-structure-triads' = 'pitch'
  'upper-structure-triads' = 'pitch'
  'major-pentatonics-on-chords' = 'pitch'
  'triad-coupling-relationships' = 'pitch'
  'major-2nd-triad-couplings' = 'pitch'
  'one-two-three-five-perms' = 'pitch'
  'alt-four-note-cells' = 'pitch'
  'dom-pentatonic-grid' = 'pitch'
  'pentatonic-three-note' = 'pitch'
  'quartal-lines' = 'pitch'
  'inverted-interval-motifs' = 'pitch'
  'altered-hexatonic-pairs' = 'pitch'
  'twelve-key-transpose' = 'pitch'
  'three-note-contours' = 'pitch'
  'whole-step-triad-pairs' = 'pitch'
  'half-step-triad-pairs' = 'pitch'
  'augmented-triad-pairs' = 'pitch'
  'mixed-triad-pairs' = 'pitch'
  'two-chord-tones-combinations' = 'pitch'
  'two-five-one-clock' = 'changes'
  'guide-tones' = 'changes'
  'outline-changes' = 'changes'
  'enclosures' = 'changes'
  'minor-two-five' = 'changes'
  'turnarounds' = 'changes'
  'blues-forms' = 'changes'
  'rhythm-bridge' = 'changes'
  'tritone-road' = 'changes'
  'dominant-cycle' = 'changes'
  'goal-notes' = 'changes'
  'basic-major-blues' = 'changes'
  'jazz-major-blues' = 'changes'
  'minor-blues' = 'changes'
  'chromatic-lower-approach' = 'changes'
  'double-chromatic-approach' = 'changes'
  'line-deflection' = 'changes'
  'slow-time' = 'rhythm'
  'into-the-bar' = 'rhythm'
  'leave-space' = 'rhythm'
  'odd-bars' = 'rhythm'
  'phrase-start-end' = 'rhythm'
  'time-feel' = 'rhythm'
  'rhythmic-displacement' = 'rhythm'
  'rhythmic-density' = 'rhythm'
  'held-rhythm' = 'rhythm'
  'sing-first' = 'sound'
  'dynamics-articulation' = 'sound'
  'ornament-the-melody' = 'sound'
  'vocab-rhythm-or-pitch' = 'language'
}
$groupOrder = @('pitch', 'changes', 'rhythm', 'sound', 'language')

function Group-Of($ex) {
  $names = @($ex.PSObject.Properties.Name)
  if ($names -contains 'group' -and $ex.group) { return [string]$ex.group }
  if ($groupOf.ContainsKey([string]$ex.slug)) { return $groupOf[[string]$ex.slug] }
  return 'language'
}

function Is-Staff($ex) {
  $names = @($ex.PSObject.Properties.Name)
  if ($names -contains 'staff') { return [bool]$ex.staff }
  return ([string]$ex.slug) -eq 'held-rhythm'
}

function Sample-Meter($ex) {
  $names = @($ex.PSObject.Properties.Name)
  if ($names -contains 'meter' -and $ex.meter) { return [string]$ex.meter }
  if ([string]$ex.slug -eq 'comping-rhythm-motifs-34') { return '3/4' }
  return ''
}

function Book-Links($books, $lang) {
  $dot = ' ' + [string][char]0x00B7 + ' '
  $parts = @()
  foreach ($b in $books) {
    $label = if ($lang -eq 'es') { $b.es } else { $b.en }
    $parts += ('<a href="' + (Html-Escape $b.href) + '">' + (Html-Escape $label) + '</a>')
  }
  return ($parts -join $dot)
}

function Build-Page([string]$lang) {
  $isEs = $lang -eq 'es'
  $n = $exercises.Count
  $css = if ($isEs) { '../resources/css/guide.css' } else { './resources/css/guide.css' }
  $icons = if ($isEs) { '../resources/icons/' } else { './resources/icons/' }
  $jsDir = if ($isEs) { '../resources/js/' } else { './resources/js/' }
  $js = $jsDir + 'lang-link.js'
  $canon = if ($isEs) { 'https://eization.com/es/more.html' } else { 'https://eization.com/more.html' }
  $chA = [char]0x00E1; $chE = [char]0x00E9; $chI = [char]0x00ED; $chO = [char]0x00F3; $chU = [char]0x00FA; $chN = [char]0x00F1
  if ($isEs) {
    $title = "M${chA}s ejercicios para problemas habituales. eization."
    $desc = "$n ejercicios extra para problemas habituales de estudiantes. Abre uno en eization. A${chN}adir o Editar lo deja en este dispositivo."
    $h1 = "M${chA}s ejercicios"
    $lead1 = "Lo que ya sabes es lo que m${chA}s suena. El resto espera. Estos ejercicios extra no est${chA}n en el men${chU} por defecto. Abre uno: eization pregunta A${chN}adir o Editar."
    $lead2 = "Cada ejemplo sale una vez, con el metr${chO}nomo. Luego cambia el orden. Los libros de abajo siguen siendo los libros: practican una l${chI}nea que ya tienes, no la reimprimen."
    $lead3 = "Si armaste un ejercicio, o encontraste una l${chI}nea para corregir,"
    $lead4 = 'Los fuertes pueden entrar en esta lista.'
    $todayLabel = 'El ejercicio de hoy'
    $sendLabel = "env${chI}a un ejercicio o una correcci${chO}n"
    $openLabel = 'Abrir en eization'
    $navLabel = "En esta p${chA}gina"
    $groupLabels = @{ pitch = 'Alturas'; changes = 'Cambios'; rhythm = 'Ritmo'; sound = 'Sonido'; language = 'Lenguaje' }
    $staffLabel = 'Pentagrama'
    $textLabel = 'Texto'
    $related = 'Relacionado'
    $barsLabel = 'Compases'
    $langAria = 'Idioma'
    $ogLocale = 'es_419'
    $ogAlt = 'en_US'
    $ogImgAlt = "Marca de eization: una negra blanca recortada en un hex${chA}gono verde y azul"
    $enHref = '../more.html'
    $esHref = './more.html'
    $enOn = ''
    $esOn = ' class="is-on" aria-current="page"'
    $homeHref = './'
    $foot = @"
        <div class="opens">
            <a class="open" href="./practice.html">C${chO}mo practicar</a>
            <a class="open" href="./books.html">Libros que ya tienes</a>
            <a class="open" href="./">Abrir eization</a>
        </div>
"@
  } else {
    $title = 'More exercises for common practice problems. eization.'
    $desc = "$n extra exercises for common student practice problems. Open one in eization. Add or Edit keeps it on this device."
    $h1 = 'More exercises'
    $lead1 = 'What you already know gets played the most. The rest waits. These extra exercises are not in the default menu. Open one: eization asks Add or Edit.'
    $lead2 = 'Each example comes up once, with the metronome. Then the order changes. The books linked below stay the books: practice a line you already have; they do not reprint it.'
    $lead3 = 'Built an exercise, or found a line to correct?'
    $lead4 = 'Strong ones can join this list.'
    $todayLabel = "Today's exercise"
    $sendLabel = 'Send an exercise or a correction'
    $openLabel = 'Open in eization'
    $navLabel = 'On this page'
    $groupLabels = @{ pitch = 'Pitch'; changes = 'Changes'; rhythm = 'Rhythm'; sound = 'Sound'; language = 'Language' }
    $staffLabel = 'Staff'
    $textLabel = 'Text'
    $related = 'Related'
    $barsLabel = 'Bars'
    $langAria = 'Language'
    $ogLocale = 'en_US'
    $ogAlt = 'es_419'
    $ogImgAlt = 'eization mark: a white quarter note cut out of a green and blue hexagon'
    $enHref = './more.html'
    $esHref = './es/more.html'
    $enOn = ' class="is-on" aria-current="page"'
    $esOn = ''
    $homeHref = './'
    $foot = @'
        <div class="opens">
            <a class="open" href="./practice.html">How to practice</a>
            <a class="open" href="./books.html">Books you own</a>
            <a class="open" href="./">Open eization</a>
        </div>
'@
  }

  $navSb = New-Object System.Text.StringBuilder
  [void]$navSb.AppendLine('        <nav aria-labelledby="more-toc">')
  [void]$navSb.AppendLine('            <h2 id="more-toc">' + (Html-Escape $navLabel) + '</h2>')
  foreach ($g in $groupOrder) {
    $inGroup = @($exercises | Where-Object { (Group-Of $_) -eq $g })
    if ($inGroup.Count -eq 0) { continue }
    [void]$navSb.AppendLine('            <h3 class="toc-group">' + (Html-Escape $groupLabels[$g]) + '</h3>')
    [void]$navSb.AppendLine('            <ul class="exercises">')
    foreach ($ex in $inGroup) {
      $name = if ($isEs) { $ex.nameEs } else { $ex.nameEn }
      $kind = if (Is-Staff $ex) { $staffLabel } else { $textLabel }
      [void]$navSb.AppendLine('                <li><a href="#' + (Html-Escape $ex.slug) + '">' + (Html-Escape $name) + ' <span class="kind">' + (Html-Escape $kind) + '</span></a></li>')
    }
    [void]$navSb.AppendLine('            </ul>')
  }
  [void]$navSb.AppendLine('        </nav>')

  $bodySb = New-Object System.Text.StringBuilder
  $schemaItems = New-Object System.Collections.Generic.List[object]
  $pos = 0
  foreach ($ex in $exercises) {
    $pos++
    $name = if ($isEs) { $ex.nameEs } else { $ex.nameEn }
    $d = if ($isEs) { $ex.descEs } else { $ex.descEn }
    $href = './' + $ex.hash
    $kind = if (Is-Staff $ex) { $staffLabel } else { $textLabel }
    [void]$bodySb.AppendLine('        <article class="more-exercise" id="' + (Html-Escape $ex.slug) + '">')
    [void]$bodySb.AppendLine('            <h2>' + (Html-Escape $name) + ' <span class="kind">' + (Html-Escape $kind) + '</span></h2>')
    [void]$bodySb.AppendLine('            <p>' + (Html-Escape $d) + '</p>')
    $sampleLines = @($ex.lines)
    if ($sampleLines.Count -gt 0 -and [string]$sampleLines[0]) {
      $sample = Html-Escape ([string]$sampleLines[0])
      if (Is-Staff $ex) {
        $meterAttr = ''
        $meter = Sample-Meter $ex
        if ($meter) { $meterAttr = ' data-meter="' + $meter + '"' }
        [void]$bodySb.AppendLine('            <figure class="notation-sample more-example"' + $meterAttr + '>')
        [void]$bodySb.AppendLine('                <pre>' + $sample + '</pre>')
        [void]$bodySb.AppendLine('                <div class="notation-staff"></div>')
        [void]$bodySb.AppendLine('            </figure>')
      } else {
        [void]$bodySb.AppendLine('            <figure class="notation-sample more-example more-example-text">')
        [void]$bodySb.AppendLine('                <p>' + $sample + '</p>')
        [void]$bodySb.AppendLine('            </figure>')
      }
    }
    [void]$bodySb.AppendLine('            <p>' + (Html-Escape $barsLabel) + ': ' + $ex.bars + '. ' + (Html-Escape $related) + ': ' + (Book-Links $ex.books $lang) + '.</p>')
    $shareLabel = if ($isEs) { 'Compartir' } else { 'Share' }
    $embedLabel = if ($isEs) { 'Insertar' } else { 'Embed' }
    $copiedLabel = if ($isEs) { 'Enlace copiado' } else { 'Link copied' }
    $codeLabel = if ($isEs) { 'C' + [char]0x00F3 + 'digo copiado' } else { 'Code copied' }
    $failLabel = if ($isEs) { 'No se pudo copiar' } else { 'Could not copy' }
    $blurb = if ($isEs) { 'Saca un ejemplo cada vez de tu biblioteca, a tiempo con el metr' + [char]0x00F3 + 'nomo.' } else { 'Draw one example at a time from your library, in time with the metronome.' }
    [void]$bodySb.AppendLine('            <p class="opens"><a class="open" href="' + (Html-Escape $href) + '">' + (Html-Escape $openLabel) + '</a> <button type="button" class="open" data-share data-copied="' + (Html-Escape $copiedLabel) + '" data-fail="' + (Html-Escape $failLabel) + '" data-blurb="' + (Html-Escape $blurb) + '">' + (Html-Escape $shareLabel) + '</button> <button type="button" class="open" data-embed data-code="' + (Html-Escape $codeLabel) + '" data-fail="' + (Html-Escape $failLabel) + '">' + (Html-Escape $embedLabel) + '</button></p>')
    [void]$bodySb.AppendLine('        </article>')
    [void]$schemaItems.Add([ordered]@{
      '@type' = 'ListItem'
      position = $pos
      name = $name
      url = ($canon + '#' + $ex.slug)
      description = $d
    })
  }

  $schemaObj = [ordered]@{
    '@context' = 'https://schema.org'
    '@type' = 'CollectionPage'
    name = $title
    description = $desc
    url = $canon
    inLanguage = $(if ($isEs) { 'es' } else { 'en' })
    isPartOf = [ordered]@{ '@type' = 'WebSite'; name = 'eization'; url = 'https://eization.com/' }
    mainEntity = [ordered]@{
      '@type' = 'ItemList'
      numberOfItems = $exercises.Count
      itemListElement = $schemaItems
    }
  }
  $schemaJson = ($schemaObj | ConvertTo-Json -Depth 8 -Compress)

  $langAttr = if ($isEs) { 'es' } else { 'en' }
  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('<!DOCTYPE html>')
  [void]$sb.AppendLine('<html lang="' + $langAttr + '">')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('<head>')
  [void]$sb.AppendLine('    <meta charset="UTF-8">')
  [void]$sb.AppendLine('    <meta name="viewport" content="width=device-width, initial-scale=1.0">')
  [void]$sb.AppendLine('    <title>' + (Html-Escape $title) + '</title>')
  [void]$sb.AppendLine('    <meta name="description" content="' + (Html-Escape $desc) + '">')
  [void]$sb.AppendLine('    <meta name="robots" content="index, follow">')
  [void]$sb.AppendLine('    <meta name="theme-color" content="#0C8A50">')
  [void]$sb.AppendLine('    <link rel="canonical" href="' + $canon + '">')
  [void]$sb.AppendLine('    <link rel="alternate" hreflang="en" href="https://eization.com/more.html">')
  [void]$sb.AppendLine('    <link rel="alternate" hreflang="es" href="https://eization.com/es/more.html">')
  [void]$sb.AppendLine('    <link rel="alternate" hreflang="x-default" href="https://eization.com/more.html">')
  [void]$sb.AppendLine('    <meta property="og:type" content="website">')
  [void]$sb.AppendLine('    <meta property="og:site_name" content="eization">')
  [void]$sb.AppendLine('    <meta property="og:locale" content="' + $ogLocale + '">')
  [void]$sb.AppendLine('    <meta property="og:locale:alternate" content="' + $ogAlt + '">')
  [void]$sb.AppendLine('    <meta property="og:title" content="' + (Html-Escape $title) + '">')
  [void]$sb.AppendLine('    <meta property="og:description" content="' + (Html-Escape $desc) + '">')
  [void]$sb.AppendLine('    <meta property="og:url" content="' + $canon + '">')
  [void]$sb.AppendLine('    <meta property="og:image" content="https://eization.com/resources/icons/og.png">')
  [void]$sb.AppendLine('    <meta property="og:image:width" content="1200">')
  [void]$sb.AppendLine('    <meta property="og:image:height" content="630">')
  [void]$sb.AppendLine('    <meta property="og:image:alt" content="' + (Html-Escape $ogImgAlt) + '">')
  [void]$sb.AppendLine('    <meta name="twitter:card" content="summary_large_image">')
  [void]$sb.AppendLine('    <meta name="twitter:title" content="' + (Html-Escape $title) + '">')
  [void]$sb.AppendLine('    <meta name="twitter:description" content="' + (Html-Escape $desc) + '">')
  [void]$sb.AppendLine('    <meta name="twitter:image" content="https://eization.com/resources/icons/og.png">')
  [void]$sb.AppendLine('    <link rel="icon" href="' + $icons + 'favicon.svg" type="image/svg+xml">')
  [void]$sb.AppendLine('    <link rel="icon" href="' + $icons + 'favicon-32.png" sizes="32x32" type="image/png">')
  [void]$sb.AppendLine('    <link rel="apple-touch-icon" href="' + $icons + 'apple-touch-icon.png">')
  [void]$sb.AppendLine('    <link rel="stylesheet" href="' + $css + '">')
  [void]$sb.AppendLine('    <!-- Google tag (gtag.js) -->')
  [void]$sb.AppendLine('    <script async src="https://www.googletagmanager.com/gtag/js?id=G-3PBLPVWLKW"></script>')
  [void]$sb.AppendLine('    <script>')
  [void]$sb.AppendLine('      window.dataLayer = window.dataLayer || [];')
  [void]$sb.AppendLine('      function gtag(){dataLayer.push(arguments);}')
  [void]$sb.AppendLine("      gtag('js', new Date());")
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine("      gtag('config', 'G-3PBLPVWLKW');")
  [void]$sb.AppendLine('    </script>')
  [void]$sb.AppendLine('    <script type="application/ld+json">')
  [void]$sb.AppendLine('    ' + $schemaJson)
  [void]$sb.AppendLine('    </script>')
  [void]$sb.AppendLine('</head>')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('<body>')
  [void]$sb.AppendLine('    <main class="sheet">')
  [void]$sb.AppendLine('        <a class="home" href="./"><svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M29.9 3.21A4.2 4.2 0 0 1 34.1 3.21L55.88 15.79A4.2 4.2 0 0 1 57.98 19.42L57.98 44.58A4.2 4.2 0 0 1 55.88 48.21L34.1 60.79A4.2 4.2 0 0 1 29.9 60.79L8.12 48.21A4.2 4.2 0 0 1 6.02 44.58L6.02 19.42A4.2 4.2 0 0 1 8.12 15.79Z M37.6 11H43.5V40A14.5 14.5 0 1 1 37.6 28.33Z M37.6 40A8.6 8.6 0 1 1 20.4 40A8.6 8.6 0 1 1 37.6 40Z"/></svg><span>eization</span></a>')
  [void]$sb.AppendLine('        <div class="lang-switch" role="group" aria-label="' + (Html-Escape $langAria) + '">')
  [void]$sb.AppendLine('            <a href="' + $enHref + '" data-set-lang="en"' + $enOn + '>English</a>')
  [void]$sb.AppendLine('            <a href="' + $esHref + '" data-set-lang="es"' + $esOn + '>Espa' + [char]0x00F1 + 'ol</a>')
  [void]$sb.AppendLine('        </div>')
  [void]$sb.AppendLine('        <h1>' + (Html-Escape $h1) + '</h1>')
  [void]$sb.AppendLine('        <p>' + (Html-Escape $lead1) + '</p>')
  [void]$sb.AppendLine('        <p>' + (Html-Escape $lead2) + '</p>')
  [void]$sb.AppendLine('        <p><a class="open" href="' + $homeHref + '?today=1">' + (Html-Escape $todayLabel) + '</a></p>')
  [void]$sb.AppendLine('        <p>' + (Html-Escape $lead3) + ' <a href="' + $homeHref + '?contribute=1">' + (Html-Escape $sendLabel) + '</a>. ' + (Html-Escape $lead4) + '</p>')
  [void]$sb.Append($navSb.ToString())
  [void]$sb.Append($bodySb.ToString())
  [void]$sb.AppendLine($foot.TrimEnd())
  [void]$sb.AppendLine('    </main>')
  [void]$sb.AppendLine('    <script src="' + $jsDir + 'staff-glyphs.js"></script>')
  [void]$sb.AppendLine('    <script src="' + $jsDir + 'staff.js"></script>')
  [void]$sb.AppendLine('    <script src="' + $jsDir + 'notation-page.js"></script>')
  [void]$sb.AppendLine('    <script src="' + $jsDir + 'guide-share.js"></script>')
  [void]$sb.AppendLine('    <script src="' + $js + '"></script>')
  [void]$sb.AppendLine('</body>')
  [void]$sb.AppendLine('')
  [void]$sb.AppendLine('</html>')
  return $sb.ToString()
}

$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Join-Path $root 'more.html'), (Build-Page 'en'), $utf8)
[System.IO.File]::WriteAllText((Join-Path $root 'es\more.html'), (Build-Page 'es'), $utf8)
Write-Host 'Wrote more.html and es/more.html'
