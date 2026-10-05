# Reads tools/more-exercises.json, writes more.html and es/more.html with #s= share links.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$dataPath = Join-Path $PSScriptRoot 'more-exercises.json'
$exercises = Get-Content -LiteralPath $dataPath -Encoding UTF8 -Raw | ConvertFrom-Json

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
  $hash = Share-Hash $ex.id $ex.nameEn ([int]$ex.bars) $ex.lines
  $ex | Add-Member -NotePropertyName hash -NotePropertyValue $hash -Force
  $len = ('https://eization.com/' + $hash).Length
  if ($len -gt 8000) { throw "URL too long for $($ex.id): $len" }
  Write-Host ("{0} {1} chars" -f $ex.id, $len)
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
  $css = if ($isEs) { '../resources/css/guide.css' } else { './resources/css/guide.css' }
  $icons = if ($isEs) { '../resources/icons/' } else { './resources/icons/' }
  $js = if ($isEs) { '../resources/js/lang-link.js' } else { './resources/js/lang-link.js' }
  $canon = if ($isEs) { 'https://eization.com/es/more.html' } else { 'https://eization.com/more.html' }
  $chA = [char]0x00E1; $chE = [char]0x00E9; $chI = [char]0x00ED; $chO = [char]0x00F3; $chU = [char]0x00FA; $chN = [char]0x00F1
  if ($isEs) {
    $title = "M${chA}s ejercicios para problemas habituales. eization."
    $desc = "Treinta y un ejercicios extra para problemas habituales de estudiantes. Abre uno en eization. A${chN}adir o Vista previa lo deja en este dispositivo."
    $h1 = "M${chA}s ejercicios"
    $lead1 = "Lo que ya sabes es lo que m${chA}s suena. El resto espera. Estos ejercicios extra no est${chA}n en el men${chU} por defecto. Abre uno: eization pregunta A${chN}adir o Vista previa."
    $lead2 = "Cada ejemplo sale una vez, con el metr${chO}nomo. Luego cambia el orden. Los libros de abajo siguen siendo los libros: practican una l${chI}nea que ya tienes, no la reimprimen."
    $openLabel = 'Abrir en eization'
    $navLabel = "En esta p${chA}gina"
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
    $foot = @"
        <div class="opens">
            <a class="open" href="./practice.html">C${chO}mo practicar</a>
            <a class="open" href="./books.html">Libros que ya tienes</a>
            <a class="open" href="./">Abrir eization</a>
        </div>
"@
  } else {
    $title = 'More exercises for common practice problems. eization.'
    $desc = 'Thirty-one extra exercises for common student practice problems. Open one in eization. Add or Preview keeps it on this device.'
    $h1 = 'More exercises'
    $lead1 = 'What you already know gets played the most. The rest waits. These extra exercises are not in the default menu. Open one: eization asks Add or Preview.'
    $lead2 = 'Each example comes up once, with the metronome. Then the order changes. The books linked below stay the books: practice a line you already have; they do not reprint it.'
    $openLabel = 'Open in eization'
    $navLabel = 'On this page'
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
  [void]$navSb.AppendLine('            <ul class="exercises">')
  foreach ($ex in $exercises) {
    $name = if ($isEs) { $ex.nameEs } else { $ex.nameEn }
    [void]$navSb.AppendLine('                <li><a href="#' + (Html-Escape $ex.slug) + '">' + (Html-Escape $name) + '</a></li>')
  }
  [void]$navSb.AppendLine('            </ul>')
  [void]$navSb.AppendLine('        </nav>')

  $bodySb = New-Object System.Text.StringBuilder
  $schemaItems = New-Object System.Collections.Generic.List[object]
  $pos = 0
  foreach ($ex in $exercises) {
    $pos++
    $name = if ($isEs) { $ex.nameEs } else { $ex.nameEn }
    $d = if ($isEs) { $ex.descEs } else { $ex.descEn }
    $href = './' + $ex.hash
    [void]$bodySb.AppendLine('        <article id="' + (Html-Escape $ex.slug) + '">')
    [void]$bodySb.AppendLine('            <h2>' + (Html-Escape $name) + '</h2>')
    [void]$bodySb.AppendLine('            <p>' + (Html-Escape $d) + '</p>')
    [void]$bodySb.AppendLine('            <p>' + (Html-Escape $barsLabel) + ': ' + $ex.bars + '. ' + (Html-Escape $related) + ': ' + (Book-Links $ex.books $lang) + '.</p>')
    [void]$bodySb.AppendLine('            <p><a class="open" href="' + (Html-Escape $href) + '">' + (Html-Escape $openLabel) + '</a></p>')
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
  [void]$sb.Append($navSb.ToString())
  [void]$sb.Append($bodySb.ToString())
  [void]$sb.AppendLine($foot.TrimEnd())
  [void]$sb.AppendLine('    </main>')
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
