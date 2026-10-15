var LANG_KEY = "eization-lang";
var eizationLang = "en";

var I18N = {
  en: {
    "doc.title": "eization. Start every session differently.",
    "meta.description": "Stuck in the same practice routine? You get exhausted before covering everything. eization draws one example at a time from your library, as text or on a staff, and shuffles in time with the metronome.",
    "lang.group": "Language",
    "brand.kicker": "Menu",
    "brand.aria": "Open eization menu",
    "brand.title": "Menu",
    "menu.kicker": "Exercise",
    "menu.exerciseAria": "Exercise: {name}",
    "menu.choose": "Choose an exercise",
    "menu.new": "New exercise",
    "menu.newTitle": "Start a blank exercise on this device",
    "menu.more": "More exercises",
    "menu.moreTitle": "Open extra exercises for common practice problems",
    "menu.resetTitle": "Start this exercise again",
    "menu.resetAria": "Reset exercise",
    "count.title": "How many are left before this exercise starts over",
    "count.one": "{n} left",
    "count.many": "{n} left",
    "about.back": "Back",
    "about.close": "Close",
    "about.title": "Menu",
    "about.howTitle": "How it works",
    "about.authorTitle": "About the author",
    "about.deviceTitle": "This device",
    "about.lead1": "Stuck in the same practice routine? You get exhausted before covering everything, guess what's left, and waste time trying to recall your favorite exercises.",
    "about.lead2": "Imagine breaking your habits and starting every session differently. You cover every example with 100% confidence, miss nothing, and keep your entire exercise library right at your fingertips.",
    "about.lead3": "Try eization. Draw one example at a time from one of the exercises in your library, as text or on a staff, and shuffle seamlessly in time with an advanced metronome. Create custom exercises, share across devices, and easily prepare lessons for yourself or your students.",
    "about.share": "Share",
    "about.nav": "Menu",
    "about.how": "How it works",
    "about.practice": "How to practice",
    "about.books": "Books you own",
    "about.more": "More exercises",
    "about.author": "About the author",
    "about.device": "This device",
    "about.show": "Show me",
    "how.ex1": "Choose an exercise at the top. The large text is the example. ",
    "how.ex2": " Next moves to the next one. The number under the exercise shows how many are left before the exercise starts over. ",
    "how.ex3": " Reset starts that exercise again.",
    "how.staffTitle": "Staff",
    "how.staff": "Scales, Left Hand Rootless Voicings, Essential Progressions, Play/Rest, and Rhythms are written on a staff. The line in Edit is the music on screen. The time signature follows Setup.",
    "how.staffLink": "How to write on the staff",
    "how.editTitle": "Edit",
    "how.edit": " Edit changes any exercise on this device. Update and Save as new keep exercises on this device. Download and Upload copy the open exercise to an .eiz file and back. This device can Download backup or Upload backup for every exercise. Share copies a link. Someone can open this exercise in eization. Ask AI opens this exercise in ChatGPT, Claude, or Gemini. Paste the reply into the box, then Update.",
    "how.metroTitle": "Metronome",
    "how.metro1": "BPM sets the tempo. ",
    "how.metro2": " Play starts and stops the click, and keeps time on the example that is showing. The bar above the metronome fills, then the next example comes up. ",
    "how.metro3": " Setup changes the meter, Play and Rest bars and their clicks, swing, repeats, and the count-in. Some exercises are rhythms you can tap with your hands and feet.",
    "author.bio": "I’m Błażej Drobniuch. I play jazz piano and guitar. I studied at the Cracow School of Jazz and Contemporary Music, then at Taller de Músics in Barcelona. I play with my quartet, and I make electronic music as Zero Volume.",
    "author.why": "I made eization because I was stuck in the same practice routine, and I wanted every example in my library at my fingertips—not a guess at what was left.",
    "author.site": "Site",
    "author.email": "Reveal email",
    "author.yours": "Your exercises",
    "author.sendBody": "Send the backup if you want me to see the exercises you kept and the ones you wrote.",
    "author.moreInvite": "If you built something that fills a gap—more keys, a missing cell, a pacing idea—send the backup below. Strong exercises can join More exercises for everyone.",
    "author.send": "Send my exercises",
    "author.sendTitle": "Download your exercises and open a mail draft. Attach the file.",
    "author.note": "A note",
    "author.noteBody": "If something helps, or gets in the way, write to me.",
    "author.feedback": "Share feedback",
    "author.feedbackTitle": "Open a mail draft",
    "author.support": "Support",
    "author.free": "eization is free. If it helps you practice, you can buy me a coffee.",
    "author.coffee": "Buy me a coffee",
    "device.body": "Download backup copies every exercise on this device to a JSON file. Upload backup replaces the exercises from that kind of backup (tempo and meter stay). Restore defaults resets tempo and meter, brings back the stock exercises, and clears exercises you saved on this device. The intro may play the next time you open eization.",
    "device.download": "Download backup",
    "device.downloadTitle": "Download every exercise on this device as a JSON file",
    "device.upload": "Upload backup",
    "device.uploadTitle": "Replace exercises on this device from a JSON backup",
    "device.uploadAsk": "Replace exercises on this device?",
    "device.restore": "Restore defaults",
    "device.restoreTitle": "Reset tempo, meter, and exercises on this device. Stock exercises return. Intro may play next launch.",
    "device.introAgain": "Play the intro again",
    "device.introAgainTitle": "Play the intro the next time you open eization. Exercises on this device stay.",
    "device.lang": "Language",
    "device.langNote": "This choice stays on this device.",
    "device.clearAsk": "Clear saved setup?",
    "device.restored": "Defaults restored. Intro will play next time you open eization.",
    "device.introQueued": "The intro will play the next time you open eization.",
    "support.europeBtn": "Europe",
    "support.worldBtn": "Anywhere else",
    "support.europe": "Send euros. Copy each line into your bank app. You choose the amount.",
    "support.world": "Send euros by SWIFT. Copy each line. You choose the amount. It can take a few days.",
    "support.copy": "Copy",
    "support.copied": "Copied!",
    "support.recipient": "Recipient",
    "support.bank": "Bank",
    "support.corr": "Correspondent BIC",
    "support.reference": "Reference",
    "share.text": "Draw one example at a time from your library, in time with the metronome.",
    "share.copied": "Link copied.",
    "share.fail": "Could not copy that link.",
    "share.add": "Add",
    "share.addNew": "Add as new",
    "share.addNewTitle": "Keep this exercise and add the one from the link",
    "share.update": "Update",
    "share.updateTitle": "Replace this exercise on this device",
    "share.preview": "Preview",
    "share.previewTitle": "Look at this exercise in Edit before keeping it",
    "share.differ": "This exercise differs from the one on this device.",
    "share.updated": "Updated on this device.",
    "share.notNow": "Not now",
    "share.bad": "That link could not be opened.",
    "mail.practiceSubject": "How I practice",
    "mail.practiceBody": "Hi Błażej,\n\nHere is how I practice.\n\nAttach eization-exercises.json from your downloads.\n",
    "mail.practiceShare": "Hi Błażej, here is how I practice.",
    "mail.feedbackBody": "Hi Błażej,\n\n",
    "mail.sent": "Backup downloaded. Attach it to the draft.",
    "mail.none": "No exercises to send.",
    "mail.downloaded": "Downloaded eization-exercises.json",
    "mail.replaced": "Exercises replaced from file",
    "edit.cancel": "Cancel",
    "edit.hintUpdate": "Update saves this exercise on this device.",
    "edit.hintDirty": "Update replaces this exercise. Save as new keeps the old one too.",
    "edit.hintCreate": "Create keeps this exercise on this device.",
    "edit.hintShare": "Update replaces this exercise on this device. Save as new keeps that exercise and adds this one.",
    "edit.saveAs": "Save as new",
    "edit.saveAsTitle": "Keep a new copy on this device",
    "edit.update": "Update",
    "edit.updateTitle": "Update this exercise on this device",
    "edit.staleAsk": "This exercise changed in another window.",
    "edit.create": "Create",
    "edit.createTitle": "Keep this exercise on this device",
    "edit.createAria": "Create exercise",
    "edit.updateAria": "Update exercise",
    "edit.name": "Name",
    "edit.defaultName": "New Custom Exercise",
    "edit.namedDefault": "Named New Custom Exercise",
    "edit.bars": "Bars",
    "edit.fewerBars": "Fewer bars",
    "edit.moreBars": "More bars",
    "edit.barsAria": "Bars on each example",
    "edit.barsTitle": "How many bars each example lasts",
    "edit.exercise": "Exercise",
    "edit.more": "More",
    "edit.moreTitle": "More exercise actions",
    "edit.clear": "Clear",
    "edit.clearTitle": "Clear all examples in this exercise",
    "edit.download": "Download",
    "edit.downloadTitle": "Download this exercise as an .eiz file",
    "edit.share": "Share",
    "edit.shareTitle": "Copy a link to this exercise",
    "edit.shareLong": "This exercise is too long to share as a link.",
    "edit.ask": "Ask AI",
    "edit.askTitle": "Open this exercise in ChatGPT, Claude, or Gemini",
    "edit.askChatgpt": "ChatGPT",
    "edit.askClaude": "Claude",
    "edit.askGemini": "Gemini",
    "edit.askHint": "Paste the reply into the box, then Update.",
    "edit.askCopied": "Prompt copied. Paste it into the chat.",
    "edit.askCopyFail": "Could not copy that prompt.",
    "edit.upload": "Upload",
    "edit.uploadTitle": "Upload an .eiz file into the box",
    "edit.areaAria": "Examples, one per line",
    "edit.placeholder": "C♯\nD♭\n| iim7 | V7 | Imaj7 | \uD834\uDD0E | · Straight Cadence",
    "edit.delete": "Delete",
    "edit.deleteTitle": "Delete this exercise from this device",
    "edit.deleteAsk": "Delete from this device?",
    "edit.examplesOne": "1 example",
    "edit.examplesMany": "{n} examples",
    "edit.open": "Edit exercise",
    "edit.openCreate": "Create exercise",
    "edit.openUpdate": "Update this exercise",
    "edit.oneLine": "Add at least one line.",
    "edit.tooMany": "Keep it to 500 lines.",
    "edit.downloaded": "Downloaded eization.eiz.",
    "edit.noLines": "That file has no lines.",
    "edit.uploadReplaced": "Upload replaced the lines in the box. Update or Save as new to keep them on this device.",
    "edit.uploadWill": "Upload replaces the lines in the box. Update or Save as new to keep them on this device.",
    "edit.badFile": "Could not read that file.",
    "edit.noUpdate": "Could not update this exercise.",
    "edit.added": "Added to this device",
    "edit.nothingDelete": "Nothing to delete yet.",
    "edit.keepOne": "Keep at least one exercise.",
    "edit.removed": "Removed from this device.",
    "edit.removeFirst": "Remove an exercise first.",
    "edit.finish": "Finish or cancel editing first.",
    "edit.cancelFirst": "Cancel editing before choosing another exercise.",
    "edit.staffHelp": "How to write on the staff",
    "edit.staffHelpLabel": "Staff",
    "edit.staffHelpClose": "Close",
    "edit.staffHelpTitle": "How to write on the staff",
    "edit.staffHelpLead": "One example per line. The preview under the box draws the line at the caret. Opening this does not change your examples. Symbols inserts a pitch, a slash, a rest, a bar, a tie, or a beam. The time signature follows Setup. Use the full guide to try lines without saving.",
    "edit.staffHelpSamples": "Tap an example to add it.",
    "edit.staffSampleAdd": "Add this example",
    "edit.staffHelpPitch": "Pitch: letter, accidental, octave — C4, C#4, Db4, Cn4. Each note is its own word.",
    "edit.staffHelpDuration": "Duration after the octave: w h q e s, then an optional dot — C4, C4h, C4e, C4q.",
    "edit.staffHelpClef": "Clef and key: @treble or @bass, and @key=Eb. Default is treble, key of C.",
    "edit.staffHelpChord": "Chord: [E3h G3h B3h D4h]_C∆7. Same duration on every pitch.",
    "edit.staffHelpBeam": "Beams: braces force one group — {C4e D4e E4e F4e}. In 4/4, short notes also beam with the beat.",
    "edit.staffHelpRhythm": "Play anything is /. A rhythm slash is /q /e. Rests: r rq rh rw re rs. A rest can take a dot: re.",
    "edit.staffHelpTie": "Tie: ~ between two notes of the same pitch — /q~/q or C4q~ | C4q. Play the first and hold it.",
    "edit.staffHelpTuplet": "Tuplet: (3 C4e D4e E4e). (5:4 …) sets the ratio. No barline inside; at least two notes.",
    "edit.staffHelpCaption": "Caption: space, middle dot, space — /q · Charleston.",
    "edit.staffHelpOpen": "Full guide with samples",
    "edit.staffWarn": "This line won't draw as a staff. It will stay text.",
    "edit.preview": "One example per line. A staff line draws here.",
    "edit.symbols": "Symbols",
    "edit.symbolsTitle": "Insert notes and music symbols",
    "edit.noteInsert": "Insert {token}",
    "edit.noteOctave": "Octave {n}",
    "edit.noteQuarter": "Quarter",
    "edit.noteEighth": "Eighth",
    "edit.noteDotted": "Dotted eighth",
    "edit.noteSlash": "Slash",
    "edit.noteRest": "Rest",
    "edit.noteBar": "Bar line",
    "edit.noteTie": "Tie",
    "edit.noteBeam": "Beam",
    "edit.noteDynamic": "Dynamic",
    "edit.noteCresc": "Crescendo",
    "edit.noteDim": "Diminuendo",
    "edit.noteStaccato": "Staccato",
    "edit.noteAccent": "Accent",
    "edit.noteTenuto": "Tenuto",
    "edit.noteChord": "Chord symbol",
    "edit.notePlay": "Play anything",
    "edit.noteSimile": "Simile bar",
    "edit.focusPrev": "Previous example",
    "edit.focusNext": "Next example",
    "edit.focusAdd": "Add",
    "edit.focusAddTitle": "Add an example after this one",
    "edit.focusRemove": "Remove",
    "edit.focusRemoveTitle": "Remove this example",
    "edit.focusIndex": "{n} / {total}",
    "edit.focusLineAria": "Current example",
    "edit.focusPlaceholder": "One example",
    "edit.allExamples": "All examples",
    "edit.oneExample": "One example",
    "groove.meter": "Meter",
    "groove.meterTitle": "Top number: how many units in a bar. Bottom number: 1 whole, 2 half, 4 quarter, 8 eighth, 16 sixteenth. BPM is the speed of that note.",
    "groove.fewerUnits": "Fewer units in a bar",
    "groove.moreUnits": "More units in a bar",
    "groove.unitsAria": "Units in a bar",
    "groove.unitsTitle": "How many units in a bar",
    "groove.longer": "Longer note",
    "groove.shorter": "Shorter note",
    "groove.click": "Click",
    "groove.playZone": "White is a click. Brighter is an accent. Tap a pad to change it.",
    "groove.restZone": "Clicks used on rest bars. Tap a pad to change it.",
    "groove.play": "Play",
    "groove.rest": "Rest",
    "groove.bars": "Bars",
    "groove.barsTitle": "How many play bars, then how many rest bars. Each uses its own clicks.",
    "groove.fewerPlay": "Fewer play bars",
    "groove.morePlay": "More play bars",
    "groove.playAria": "Play bars",
    "groove.fewerRest": "Fewer rest bars",
    "groove.moreRest": "More rest bars",
    "groove.restAria": "Rest bars",
    "groove.repeat": "Repeat",
    "groove.repeatTitle": "How many times to play the current example before the next one. A 4-bar exercise at 2 plays 8 bars. Play and rest keep counting through those bars.",
    "groove.fewerRepeat": "Repeat fewer times",
    "groove.moreRepeat": "Repeat more times",
    "groove.repeatAria": "Repeat count",
    "groove.repeatCountTitle": "How many times to play the current example",
    "groove.countIn": "Count in",
    "groove.oneBar": "One bar",
    "groove.oneBarTitle": "Counts one bar before you start, and again before the next example.",
    "groove.nearby": "Nearby",
    "groove.showNearby": "Show nearby",
    "groove.nearbyTitle": "Shows the next example above and the previous one below.",
    "groove.page": "Paper",
    "groove.onPage": "On paper",
    "groove.pageTitle": "Examples sit on a sheet of paper. The sheet moves down. The next example comes in from the top.",
    "groove.swing": "Swing",
    "groove.off": "Off",
    "groove.offTitle": "Straight. The & sits halfway between the beats.",
    "groove.triplet": "Triplet",
    "groove.tripletTitle": "The & lands on the last third of the beat.",
    "groove.swingMode": "Swing",
    "groove.swingTitle": "The & follows the tempo. Numbered beats stay on the grid.",
    "groove.neo": "Neo",
    "groove.neoTitle": "Beats 2 and 4 sit a little late. The & stays straight. In 6/8 the second group sits late.",
    "groove.sliderTitle": "Left is straight. Right is heavier.",
    "groove.follow": "Follow the recommended swing",
    "groove.followTitle": "Recommended for this tempo. Tap to follow it.",
    "groove.amount": "Swing amount",
    "groove.auto": "Auto",
    "groove.set": "Set",
    "groove.setupTitle": "Meter, clicks, bars, swing, and count-in",
    "groove.setupAria": "Setup",
    "note.whole": "whole note",
    "note.half": "half note",
    "note.quarter": "quarter note",
    "note.eighth": "eighth note",
    "note.sixteenth": "sixteenth note",
    "click.accent": "Accent. Tap to turn it off.",
    "click.on": "Click. Tap for an accent.",
    "click.off": "Off. Tap for a click.",
    "tempo.slower": "Slower",
    "tempo.faster": "Faster",
    "tempo.aria": "Tempo",
    "tempo.title": "Tempo in BPM. This is the speed of the bottom number.",
    "tempo.start": "Start tempo",
    "tempo.pause": "Pause tempo",
    "tempo.sound": "Metronome sound on/off",
    "next.title": "Next example",
    "next.aria": "Next",
    "repeat.mark": "{n} of {total}",
    "desk.notHere": "That exercise is not on this device.",
    "desk.otherWindow": "That exercise was removed in another window.",
    "desk.badJson": "That file is not valid JSON.",
    "desk.noExercises": "That file has no exercises.",
    "desk.newer": "This file needs a newer eization.",
    "desk.keepFail": "Could not keep this on this device.",
    "desk.unreadable": "Could not read the exercises on this device. The stock list is back.",
    "desk.backupTrim": "Kept {n} exercises. The rest did not fit on this device.",
    "desk.backupSkip": "Some exercises in that file had no examples.",
    "desk.updated": "{name} has new examples.",
    "hello.skip": "Skip intro",
    "hello.exercise": "Choose an exercise here.",
    "hello.staffScale": "Scales are written on a staff.",
    "hello.staffChord": "Chords can be written on a staff too.",
    "hello.example": "One example at a time.",
    "hello.next": "Next brings the next example.",
    "hello.setup": "Setup changes the metronome.",
    "hello.play": "Play runs the metronome. The next example comes up in time.",
    "hello.edit": "Edit builds your own exercise.",
    "hello.left": "This number is how many are left.",
    "hello.reset": "Reset starts this exercise again.",
    "hello.bpm": "BPM sets the tempo.",
    "sym.sharp": "Sharp",
    "sym.flat": "Flat",
    "sym.natural": "Natural",
    "sym.maj7": "Major seventh",
    "sym.dim": "Diminished",
    "sym.half": "Half-diminished",
    "sym.aug": "Augmented",
    "sym.down": "Down",
    "sym.up": "Up",
    "sym.arrow": "Arrow",
    "sym.bar": "Bar line",
    "sym.tie": "Tie",
    "sym.simile": "Repeat the bar",
    "sym.caption": "Caption",
    "sym.played": "Played",
    "sym.open": "Open",
    "sym.staff": "Staff barline",
    "seed.allNotes": "All Notes",
    "seed.scales": "Scales",
    "seed.allChords": "All Chords",
    "seed.chordTones": "Chord Tones",
    "seed.leftHandRootless": "Left Hand Rootless Voicings",
    "seed.essentialProgressions": "Essential Progressions",
    "seed.intervals": "All Intervals",
    "seed.approachNotes": "Approach Notes",
    "seed.playRest": "Play/Rest",
    "seed.fingers": "Finger Patterns",
    "seed.sonicDevices": "Sonic Nuances",
    "seed.texture": "Rhythmic Devices",
    "seed.motive": "Motivic Development",
    "seed.limbs": "Rhythms",
    "seed.tuplets": "Tuplets",
    "seed.ties": "Held rhythm",
    "seed.rhythmMotifs": "22 Rhythm Motifs",
    "seed.compingRhythm": "Comping Rhythm Motifs",
    "seed.compingRhythm34": "Comping Rhythm Motifs 3/4",
    "seed.dynamics": "Dynamics",
    "seed.freePlay": "Free Play",
    "practice.title": "Stuck in the same practice routine? eization.",
    "practice.description": "Stuck in the same practice routine? You get exhausted before covering everything. Draw one example at a time from your library, as text or on a staff, and shuffle in time with the metronome.",
    "practice.h1": "Stuck in the same practice routine?",
    "practice.lead1": "Stuck in the same practice routine? You get exhausted before covering everything, guess what's left, and waste time trying to recall your favorite exercises.",
    "practice.lead2": "Imagine breaking your habits and starting every session differently. You cover every example with 100% confidence, miss nothing, and keep your entire exercise library right at your fingertips.",
    "practice.lead3": "Try eization. Draw one example at a time from one of the exercises in your library, as text or on a staff, and shuffle seamlessly in time with an advanced metronome. Create custom exercises, share across devices, and easily prepare lessons for yourself or your students.",
    "practice.open": "Open eization",
    "practice.bookTitle": "From a book you already own",
    "practice.book": "Type each line you are working on, one example per line. Play the exercise with the metronome. Next brings the next line. The exercises on this site are eization’s own exercises.",
    "practice.books": "Books you own",
    "practice.lessonTitle": "From a lesson you watched",
    "practice.lesson": "Pause after each example. Put that example on its own line. Practice the exercise with the metronome before you watch the next lesson.",
    "practice.ownTitle": "Your own exercise",
    "practice.own": "Edit changes any exercise on this device. Update and Save as new keep exercises on this device. Share copies a link. Download and Upload copy the open exercise to an .eiz file and back.",
    "practice.listTitle": "Exercises",
    "practice.onStaff": "On a staff",
    "practice.asText": "As text",
    "practice.libraryTitle": "Also on the site",
    "practice.library": "These stay off the first-run menu. Open one and eization adds it on this device.",
    "practice.moreTitle": "More exercises",
    "practice.more": "Extra exercises for common student problems. They are not in the default menu. Open one in eization: Add or Preview keeps it on this device.",
    "practice.moreOpen": "More exercises",
    "practice.staffTitle": "Written on a staff",
    "practice.staff": "Scales, Left Hand Rootless Voicings, Essential Progressions, Play/Rest, and Rhythms are written on a staff. All Notes, All Chords, Chord Tones, Rhythmic Devices, Motivic Development, and Free Play are text. The line in Edit is the music on screen.",
    "practice.staffOpen": "How to write on the staff",
    "practice.teachersTitle": "For teachers",
    "practice.teachers": "Stories, lesson plans, and honest tool talk for the studio. Prepare lessons for yourself or your students. Share across devices. One example at a time, with the metronome.",
    "practice.teachersOpen": "For teachers",
    "practice.qScales": "How do I practice scales with a metronome?",
    "practice.aScales": "Open Scales. You see one scale. Play starts the click and keeps time on that scale. When the bar fills, the next scale comes up. Each scale comes up once. Then the order changes.",
    "practice.openScales": "Open Scales",
    "practice.qBook": "How do I practice one line from a book I already own?",
    "practice.aBook": "Type each line you are working on, one example per line. Edit keeps the exercise on this device. Play keeps time. Next brings the next line.",
    "practice.qLesson": "How do I practice examples from a lesson I watched?",
    "practice.qAgain": "Does an example come up again before the others?",
    "practice.aAgain": "Each example in the exercise comes up once. Then the order changes.",
    "practice.qKeep": "Can I keep my own exercise?"
  },
  es: {
    "doc.title": "eization. Empieza cada sesión de otra manera.",
    "meta.description": "¿Atascado en la misma rutina de práctica? Te agotas antes de cubrirlo todo. eization saca un ejemplo cada vez de tu biblioteca, en texto o en el pentagrama, y baraja a tiempo con el metrónomo.",
    "lang.group": "Idioma",
    "brand.kicker": "Menú",
    "brand.aria": "Abrir el menú de eization",
    "brand.title": "Menú",
    "menu.kicker": "Ejercicio",
    "menu.exerciseAria": "Ejercicio: {name}",
    "menu.choose": "Elige un ejercicio",
    "menu.new": "Nuevo ejercicio",
    "menu.newTitle": "Empieza un ejercicio en blanco en este dispositivo",
    "menu.more": "Más ejercicios",
    "menu.moreTitle": "Abre ejercicios extra para problemas habituales de práctica",
    "menu.resetTitle": "Vuelve a empezar este ejercicio",
    "menu.resetAria": "Reiniciar ejercicio",
    "count.title": "Cuántos quedan antes de que este ejercicio vuelva a empezar",
    "count.one": "queda {n}",
    "count.many": "quedan {n}",
    "about.back": "Atrás",
    "about.close": "Cerrar",
    "about.title": "Menú",
    "about.howTitle": "Cómo funciona",
    "about.authorTitle": "Sobre el autor",
    "about.deviceTitle": "Este dispositivo",
    "about.lead1": "¿Atascado en la misma rutina de práctica? Te agotas antes de cubrirlo todo, adivinas qué queda y pierdes tiempo intentando recordar tus ejercicios favoritos.",
    "about.lead2": "Imagina romper esos hábitos y empezar cada sesión de otra manera. Cubres cada ejemplo con un 100% de confianza, no te dejas nada y tienes toda tu biblioteca de ejercicios a mano.",
    "about.lead3": "Prueba eization. Saca un ejemplo cada vez de uno de los ejercicios de tu biblioteca, en texto o en el pentagrama, y baraja sin cortes a tiempo con un metrónomo avanzado. Crea ejercicios a medida, comparte entre dispositivos, y prepara con facilidad lecciones para ti o para tus alumnos.",
    "about.share": "Compartir",
    "about.nav": "Menú",
    "about.how": "Cómo funciona",
    "about.practice": "Cómo practicar",
    "about.books": "Libros que ya tienes",
    "about.more": "Más ejercicios",
    "about.author": "Sobre el autor",
    "about.device": "Este dispositivo",
    "about.show": "Muéstrame",
    "how.ex1": "Elige un ejercicio arriba. El texto grande es el ejemplo. ",
    "how.ex2": " Siguiente pasa al siguiente. El número bajo el ejercicio dice cuántos quedan antes de que el ejercicio vuelva a empezar. ",
    "how.ex3": " Reiniciar vuelve a empezar ese ejercicio.",
    "how.staffTitle": "Pentagrama",
    "how.staff": "Escalas, Voicings rootless de mano izquierda, Progresiones esenciales, Tocar/Silencio y Ritmos se escriben en el pentagrama. La línea en Editar es la música en pantalla. El compás sigue a Ajustes.",
    "how.staffLink": "Cómo escribir en el pentagrama",
    "how.editTitle": "Editar",
    "how.edit": " Editar cambia cualquier ejercicio en este dispositivo. Actualizar y Guardar como nuevo dejan los ejercicios en este dispositivo. Descargar y Cargar copian el ejercicio abierto a un archivo .eiz y de vuelta. En este dispositivo puedes Descargar copia o Cargar copia de todos los ejercicios. Compartir copia un enlace. Alguien puede abrir este ejercicio en eization. Preguntar a la IA abre este ejercicio en ChatGPT, Claude o Gemini. Pega la respuesta en el recuadro y luego Actualizar.",
    "how.metroTitle": "Metrónomo",
    "how.metro1": "BPM marca el tempo. ",
    "how.metro2": " Play arranca y para el clic, y lleva el tiempo del ejemplo que se ve. La barra sobre el metrónomo se llena y entra el siguiente ejemplo. ",
    "how.metro3": " Ajustes cambia el compás, los compases de Tocar y Silencio y sus clics, el swing, las repeticiones y la entrada. Algunos ejercicios son ritmos que puedes marcar con las manos y los pies.",
    "author.bio": "Soy Błażej Drobniuch. Toco piano y guitarra de jazz. Estudié en la Cracow School of Jazz and Contemporary Music y después en Taller de Músics, en Barcelona. Toco con mi cuarteto y hago música electrónica como Zero Volume.",
    "author.why": "Hice eization porque estaba atascado en la misma rutina de práctica, y quería tener cada ejemplo de mi biblioteca a mano—no adivinar qué quedaba.",
    "author.site": "Sitio",
    "author.email": "Mostrar el correo",
    "author.yours": "Tus ejercicios",
    "author.sendBody": "Manda la copia si quieres que vea los ejercicios que guardaste y los que escribiste.",
    "author.moreInvite": "Si armaste algo que cubre un hueco—más tonalidades, una célula que faltaba, una idea de pacing—manda la copia abajo. Los ejercicios fuertes pueden entrar en Más ejercicios para todos.",
    "author.send": "Enviar mis ejercicios",
    "author.sendTitle": "Descarga tus ejercicios y abre un borrador. Adjunta el archivo.",
    "author.note": "Una nota",
    "author.noteBody": "Si algo te ayuda, o te estorba, escríbeme.",
    "author.feedback": "Escribir",
    "author.feedbackTitle": "Abre un borrador",
    "author.support": "Apoyo",
    "author.free": "eization es gratis. Si te ayuda a practicar, puedes invitarme a un café.",
    "author.coffee": "Invítame a un café",
    "device.body": "Descargar copia guarda todos los ejercicios de este dispositivo en un archivo JSON. Cargar copia sustituye los ejercicios desde una copia de ese tipo (el tempo y el compás se quedan). Restaurar valores reinicia el tempo y el compás, devuelve los ejercicios de serie y borra los ejercicios guardados en este dispositivo. La intro puede sonar la próxima vez que abras eization.",
    "device.download": "Descargar copia",
    "device.downloadTitle": "Descarga todos los ejercicios de este dispositivo en un archivo JSON",
    "device.upload": "Cargar copia",
    "device.uploadTitle": "Sustituye los ejercicios de este dispositivo desde una copia JSON",
    "device.uploadAsk": "¿Sustituir los ejercicios de este dispositivo?",
    "device.restore": "Restaurar valores",
    "device.restoreTitle": "Reinicia tempo, compás y ejercicios en este dispositivo. Vuelven los ejercicios de serie. La intro puede sonar la próxima vez.",
    "device.introAgain": "Ver la intro otra vez",
    "device.introAgainTitle": "La intro suena la próxima vez que abras eization. Los ejercicios de este dispositivo se quedan.",
    "device.lang": "Idioma",
    "device.langNote": "Esta elección se queda en este dispositivo.",
    "device.clearAsk": "¿Borrar lo guardado?",
    "device.restored": "Valores restaurados. La intro sonará la próxima vez que abras eization.",
    "device.introQueued": "La intro sonará la próxima vez que abras eization.",
    "support.europeBtn": "Europa",
    "support.worldBtn": "En otro sitio",
    "support.europe": "Manda euros. Copia cada línea en la app del banco. Tú eliges la cantidad.",
    "support.world": "Manda euros por SWIFT. Copia cada línea. Tú eliges la cantidad. Puede tardar unos días.",
    "support.copy": "Copiar",
    "support.copied": "¡Copiado!",
    "support.recipient": "Titular",
    "support.bank": "Banco",
    "support.corr": "BIC del corresponsal",
    "support.reference": "Concepto",
    "share.text": "Saca un ejemplo cada vez de tu biblioteca, a tiempo con el metrónomo.",
    "share.copied": "Enlace copiado.",
    "share.fail": "No se pudo copiar el enlace.",
    "share.add": "Añadir",
    "share.addNew": "Añadir como nuevo",
    "share.addNewTitle": "Conserva este ejercicio y añade el del enlace",
    "share.update": "Actualizar",
    "share.updateTitle": "Sustituye este ejercicio en este dispositivo",
    "share.preview": "Vista previa",
    "share.previewTitle": "Mira este ejercicio en Editar antes de guardarlo",
    "share.differ": "Este ejercicio es distinto del que hay en este dispositivo.",
    "share.updated": "Actualizado en este dispositivo.",
    "share.notNow": "Ahora no",
    "share.bad": "No se pudo abrir ese enlace.",
    "mail.practiceSubject": "Cómo practico",
    "mail.practiceBody": "Hola Błażej,\n\nAsí practico.\n\nAdjunta eization-exercises.json desde tus descargas.\n",
    "mail.practiceShare": "Hola Błażej, así practico.",
    "mail.feedbackBody": "Hola Błażej,\n\n",
    "mail.sent": "Copia descargada. Adjúntala al borrador.",
    "mail.none": "No hay ejercicios para enviar.",
    "mail.downloaded": "Descargado eization-exercises.json",
    "mail.replaced": "Ejercicios sustituidos desde el archivo",
    "edit.cancel": "Cancelar",
    "edit.hintUpdate": "Actualizar guarda este ejercicio en este dispositivo.",
    "edit.hintDirty": "Actualizar sustituye este ejercicio. Guardar como nuevo conserva también el anterior.",
    "edit.hintCreate": "Crear deja este ejercicio en este dispositivo.",
    "edit.hintShare": "Actualizar sustituye este ejercicio en este dispositivo. Guardar como nuevo conserva ese ejercicio y añade este.",
    "edit.saveAs": "Guardar como nuevo",
    "edit.saveAsTitle": "Deja una copia nueva en este dispositivo",
    "edit.update": "Actualizar",
    "edit.updateTitle": "Actualiza este ejercicio en este dispositivo",
    "edit.staleAsk": "Este ejercicio cambió en otra ventana.",
    "edit.create": "Crear",
    "edit.createTitle": "Deja este ejercicio en este dispositivo",
    "edit.createAria": "Crear ejercicio",
    "edit.updateAria": "Actualizar ejercicio",
    "edit.name": "Nombre",
    "edit.defaultName": "Nuevo ejercicio propio",
    "edit.namedDefault": "Se llama Nuevo ejercicio propio",
    "edit.bars": "Compases",
    "edit.fewerBars": "Menos compases",
    "edit.moreBars": "Más compases",
    "edit.barsAria": "Compases de cada ejemplo",
    "edit.barsTitle": "Cuántos compases dura cada ejemplo",
    "edit.exercise": "Ejercicio",
    "edit.more": "Más",
    "edit.moreTitle": "Más acciones del ejercicio",
    "edit.clear": "Vaciar",
    "edit.clearTitle": "Borra todos los ejemplos de este ejercicio",
    "edit.download": "Descargar",
    "edit.downloadTitle": "Descarga este ejercicio como archivo .eiz",
    "edit.share": "Compartir",
    "edit.shareTitle": "Copia un enlace a este ejercicio",
    "edit.shareLong": "Este ejercicio es demasiado largo para compartirlo como enlace.",
    "edit.ask": "Preguntar a la IA",
    "edit.askTitle": "Abre este ejercicio en ChatGPT, Claude o Gemini",
    "edit.askChatgpt": "ChatGPT",
    "edit.askClaude": "Claude",
    "edit.askGemini": "Gemini",
    "edit.askHint": "Pega la respuesta en el recuadro y luego Actualizar.",
    "edit.askCopied": "Pregunta copiada. Pégala en el chat.",
    "edit.askCopyFail": "No se pudo copiar la pregunta.",
    "edit.upload": "Cargar",
    "edit.uploadTitle": "Carga un archivo .eiz en el recuadro",
    "edit.areaAria": "Ejemplos, uno por línea",
    "edit.placeholder": "C♯\nD♭\n| iim7 | V7 | Imaj7 | \uD834\uDD0E | · Cadencia directa",
    "edit.delete": "Borrar",
    "edit.deleteTitle": "Borra este ejercicio de este dispositivo",
    "edit.deleteAsk": "¿Borrarlo de este dispositivo?",
    "edit.examplesOne": "1 ejemplo",
    "edit.examplesMany": "{n} ejemplos",
    "edit.open": "Editar ejercicio",
    "edit.openCreate": "Crear ejercicio",
    "edit.openUpdate": "Actualizar este ejercicio",
    "edit.oneLine": "Añade al menos una línea.",
    "edit.tooMany": "Como máximo, 500 líneas.",
    "edit.downloaded": "Descargado eization.eiz.",
    "edit.noLines": "Ese archivo no tiene líneas.",
    "edit.uploadReplaced": "La carga sustituyó las líneas del recuadro. Actualizar o Guardar como nuevo las deja en este dispositivo.",
    "edit.uploadWill": "La carga sustituye las líneas del recuadro. Actualizar o Guardar como nuevo las deja en este dispositivo.",
    "edit.badFile": "No se pudo leer ese archivo.",
    "edit.noUpdate": "No se pudo actualizar este ejercicio.",
    "edit.added": "Añadido a este dispositivo",
    "edit.nothingDelete": "Todavía no hay nada que borrar.",
    "edit.keepOne": "Deja al menos un ejercicio.",
    "edit.removed": "Borrado de este dispositivo.",
    "edit.removeFirst": "Quita un ejercicio primero.",
    "edit.finish": "Termina o cancela la edición primero.",
    "edit.cancelFirst": "Cancela la edición antes de elegir otro ejercicio.",
    "edit.staffHelp": "Cómo escribir en el pentagrama",
    "edit.staffHelpLabel": "Pentagrama",
    "edit.staffHelpClose": "Cerrar",
    "edit.staffHelpTitle": "Cómo escribir en el pentagrama",
    "edit.staffHelpLead": "Un ejemplo por línea. La vista previa bajo el recuadro dibuja la línea del cursor. Abrir esto no cambia tus ejemplos. Símbolos inserta una altura, un slash, un silencio, una barra, una ligadura o un barrado. El compás sigue a Ajustes. Usa la guía completa para probar líneas sin guardar.",
    "edit.staffHelpSamples": "Toca un ejemplo para añadirlo.",
    "edit.staffSampleAdd": "Añadir este ejemplo",
    "edit.staffHelpPitch": "Altura: letra, alteración, octava — C4, C#4, Db4, Cn4. Cada nota es su propia palabra.",
    "edit.staffHelpDuration": "Duración después de la octava: w h q e s, y un puntillo opcional — C4, C4h, C4e, C4q.",
    "edit.staffHelpClef": "Clave y armadura: @treble o @bass, y @key=Eb. Por defecto es clave de sol, tonalidad de do.",
    "edit.staffHelpChord": "Acorde: [E3h G3h B3h D4h]_C∆7. La misma duración en cada nota.",
    "edit.staffHelpBeam": "Barrados: las llaves fuerzan un grupo — {C4e D4e E4e F4e}. En 4/4, las notas cortas también se barran con el pulso.",
    "edit.staffHelpRhythm": "Tocar cualquier cosa es /. Un slash de ritmo es /q /e. Silencios: r rq rh rw re rs. Un silencio puede llevar puntillo: re.",
    "edit.staffHelpTie": "Ligadura: ~ entre dos notas de la misma altura — /q~/q o C4q~ | C4q. Toca la primera y sostenla.",
    "edit.staffHelpTuplet": "Grupo irregular: (3 C4e D4e E4e). (5:4 …) fija la proporción. Sin barra de compás dentro; al menos dos notas.",
    "edit.staffHelpCaption": "Texto bajo el pentagrama: espacio, punto medio, espacio — /q · Charleston.",
    "edit.staffHelpOpen": "Guía completa con ejemplos",
    "edit.staffWarn": "Esta línea no se dibujará como pentagrama. Se quedará en texto.",
    "edit.preview": "Un ejemplo por línea. El pentagrama se dibuja aquí.",
    "edit.symbols": "Símbolos",
    "edit.symbolsTitle": "Insertar notas y símbolos",
    "edit.noteInsert": "Insertar {token}",
    "edit.noteOctave": "Octava {n}",
    "edit.noteQuarter": "Negra",
    "edit.noteEighth": "Corchea",
    "edit.noteDotted": "Corchea con puntillo",
    "edit.noteSlash": "Slash",
    "edit.noteRest": "Silencio",
    "edit.noteBar": "Barra de compás",
    "edit.noteTie": "Ligadura",
    "edit.noteBeam": "Barrado",
    "edit.noteDynamic": "Matiz",
    "edit.noteCresc": "Crescendo",
    "edit.noteDim": "Diminuendo",
    "edit.noteStaccato": "Staccato",
    "edit.noteAccent": "Acento",
    "edit.noteTenuto": "Tenuto",
    "edit.noteChord": "Cifrado",
    "edit.notePlay": "Tocar cualquier cosa",
    "edit.noteSimile": "Compás simile",
    "edit.focusPrev": "Ejemplo anterior",
    "edit.focusNext": "Ejemplo siguiente",
    "edit.focusAdd": "Añadir",
    "edit.focusAddTitle": "Añadir un ejemplo después de este",
    "edit.focusRemove": "Quitar",
    "edit.focusRemoveTitle": "Quitar este ejemplo",
    "edit.focusIndex": "{n} / {total}",
    "edit.focusLineAria": "Ejemplo actual",
    "edit.focusPlaceholder": "Un ejemplo",
    "edit.allExamples": "Todos los ejemplos",
    "edit.oneExample": "Un ejemplo",
    "groove.meter": "Compás",
    "groove.meterTitle": "Número de arriba: cuántas unidades tiene el compás. Número de abajo: 1 redonda, 2 blanca, 4 negra, 8 corchea, 16 semicorchea. El BPM es la velocidad de esa nota.",
    "groove.fewerUnits": "Menos unidades en el compás",
    "groove.moreUnits": "Más unidades en el compás",
    "groove.unitsAria": "Unidades del compás",
    "groove.unitsTitle": "Cuántas unidades tiene el compás",
    "groove.longer": "Nota más larga",
    "groove.shorter": "Nota más corta",
    "groove.click": "Clic",
    "groove.playZone": "Blanco es un clic. Más brillante es un acento. Toca un cuadro para cambiarlo.",
    "groove.restZone": "Clics de los compases de silencio. Toca un cuadro para cambiarlo.",
    "groove.play": "Tocar",
    "groove.rest": "Silencio",
    "groove.bars": "Compases",
    "groove.barsTitle": "Cuántos compases de toque y luego cuántos de silencio. Cada uno usa sus clics.",
    "groove.fewerPlay": "Menos compases de toque",
    "groove.morePlay": "Más compases de toque",
    "groove.playAria": "Compases de toque",
    "groove.fewerRest": "Menos compases de silencio",
    "groove.moreRest": "Más compases de silencio",
    "groove.restAria": "Compases de silencio",
    "groove.repeat": "Repetir",
    "groove.repeatTitle": "Cuántas veces suena el ejemplo actual antes del siguiente. Un ejercicio de 4 compases a 2 suena 8 compases. Tocar y silencio siguen contando en esos compases.",
    "groove.fewerRepeat": "Repetir menos veces",
    "groove.moreRepeat": "Repetir más veces",
    "groove.repeatAria": "Veces que se repite",
    "groove.repeatCountTitle": "Cuántas veces suena el ejemplo actual",
    "groove.countIn": "Entrada",
    "groove.oneBar": "Un compás",
    "groove.oneBarTitle": "Cuenta un compás antes de empezar, y otra vez antes del siguiente ejemplo.",
    "groove.nearby": "Cerca",
    "groove.showNearby": "Ver cerca",
    "groove.nearbyTitle": "Muestra el ejemplo siguiente arriba y el anterior abajo.",
    "groove.page": "Papel",
    "groove.onPage": "En papel",
    "groove.pageTitle": "Los ejemplos quedan en una hoja. La hoja baja y el siguiente entra por arriba.",
    "groove.swing": "Swing",
    "groove.off": "No",
    "groove.offTitle": "Recto. El & cae a la mitad entre los pulsos.",
    "groove.triplet": "Tresillo",
    "groove.tripletTitle": "El & cae en el último tercio del pulso.",
    "groove.swingMode": "Swing",
    "groove.swingTitle": "El & sigue el tempo. Los pulsos numerados se quedan en la rejilla.",
    "groove.neo": "Neo",
    "groove.neoTitle": "Los pulsos 2 y 4 caen un poco tarde. El & se queda recto. En 6/8 el segundo grupo cae tarde.",
    "groove.sliderTitle": "A la izquierda, recto. A la derecha, más pesado.",
    "groove.follow": "Seguir el swing recomendado",
    "groove.followTitle": "Recomendado para este tempo. Toca para seguirlo.",
    "groove.amount": "Cantidad de swing",
    "groove.auto": "Auto",
    "groove.set": "Fijo",
    "groove.setupTitle": "Compás, clics, compases, swing y entrada",
    "groove.setupAria": "Ajustes",
    "note.whole": "redonda",
    "note.half": "blanca",
    "note.quarter": "negra",
    "note.eighth": "corchea",
    "note.sixteenth": "semicorchea",
    "click.accent": "Acento. Toca para quitarlo.",
    "click.on": "Clic. Toca para un acento.",
    "click.off": "Apagado. Toca para un clic.",
    "tempo.slower": "Más lento",
    "tempo.faster": "Más rápido",
    "tempo.aria": "Tempo",
    "tempo.title": "Tempo en BPM. Es la velocidad del número de abajo.",
    "tempo.start": "Empezar el tempo",
    "tempo.pause": "Pausar el tempo",
    "tempo.sound": "Sonido del metrónomo sí/no",
    "next.title": "Siguiente ejemplo",
    "next.aria": "Siguiente",
    "repeat.mark": "{n} de {total}",
    "desk.notHere": "Ese ejercicio no está en este dispositivo.",
    "desk.otherWindow": "Ese ejercicio se quitó en otra ventana.",
    "desk.badJson": "Ese archivo no es un JSON válido.",
    "desk.noExercises": "Ese archivo no tiene ejercicios.",
    "desk.newer": "Este archivo necesita una eization más nueva.",
    "desk.keepFail": "No se pudo guardar esto en este dispositivo.",
    "desk.unreadable": "No se pudieron leer los ejercicios de este dispositivo. Volvió la lista de serie.",
    "desk.backupTrim": "Se guardaron {n} ejercicios. El resto no cabía en este dispositivo.",
    "desk.backupSkip": "Algunos ejercicios de ese archivo no tenían ejemplos.",
    "desk.updated": "{name} tiene ejemplos nuevos.",
    "hello.skip": "Saltar intro",
    "hello.exercise": "Elige un ejercicio aquí.",
    "hello.staffScale": "Las escalas se escriben en el pentagrama.",
    "hello.staffChord": "Los acordes también se escriben en el pentagrama.",
    "hello.example": "Un ejemplo cada vez.",
    "hello.next": "Siguiente trae el siguiente ejemplo.",
    "hello.setup": "Ajustes cambia el metrónomo.",
    "hello.play": "Play pone el metrónomo. El siguiente ejemplo entra a tiempo.",
    "hello.edit": "Editar arma tu propio ejercicio.",
    "hello.left": "Este número es cuántos quedan.",
    "hello.reset": "Reiniciar vuelve a empezar este ejercicio.",
    "hello.bpm": "BPM marca el tempo.",
    "sym.sharp": "Sostenido",
    "sym.flat": "Bemol",
    "sym.natural": "Becuadro",
    "sym.maj7": "Séptima mayor",
    "sym.dim": "Disminuido",
    "sym.half": "Semidisminuido",
    "sym.aug": "Aumentado",
    "sym.down": "Abajo",
    "sym.up": "Arriba",
    "sym.arrow": "Flecha",
    "sym.bar": "Barra de compás",
    "sym.tie": "Ligadura",
    "sym.simile": "Repite el compás",
    "sym.caption": "Texto",
    "sym.played": "Tocado",
    "sym.open": "Libre",
    "sym.staff": "Barra de pentagrama",
    "seed.allNotes": "Todas las notas",
    "seed.scales": "Escalas",
    "seed.allChords": "Todos los acordes",
    "seed.chordTones": "Notas del acorde",
    "seed.leftHandRootless": "Voicings rootless de mano izquierda",
    "seed.essentialProgressions": "Progresiones esenciales",
    "seed.intervals": "Todos los intervalos",
    "seed.approachNotes": "Notas de aproximación",
    "seed.playRest": "Tocar/Silencio",
    "seed.fingers": "Digitaciones",
    "seed.sonicDevices": "Matices sonoros",
    "seed.texture": "Recursos rítmicos",
    "seed.motive": "Desarrollo motívico",
    "seed.limbs": "Ritmos",
    "seed.tuplets": "Grupos irregulares",
    "seed.ties": "Ritmo sostenido",
    "seed.rhythmMotifs": "22 motivos rítmicos",
    "seed.compingRhythm": "Motivos rítmicos de acompañamiento",
    "seed.compingRhythm34": "Motivos rítmicos de acompañamiento 3/4",
    "seed.dynamics": "Matices",
    "seed.freePlay": "Juego libre",
    "practice.title": "¿Atascado en la misma rutina de práctica? eization.",
    "practice.description": "¿Atascado en la misma rutina de práctica? Te agotas antes de cubrirlo todo. Saca un ejemplo cada vez de tu biblioteca, en texto o en el pentagrama, y baraja a tiempo con el metrónomo.",
    "practice.h1": "¿Atascado en la misma rutina de práctica?",
    "practice.lead1": "¿Atascado en la misma rutina de práctica? Te agotas antes de cubrirlo todo, adivinas qué queda y pierdes tiempo intentando recordar tus ejercicios favoritos.",
    "practice.lead2": "Imagina romper esos hábitos y empezar cada sesión de otra manera. Cubres cada ejemplo con un 100% de confianza, no te dejas nada y tienes toda tu biblioteca de ejercicios a mano.",
    "practice.lead3": "Prueba eization. Saca un ejemplo cada vez de uno de los ejercicios de tu biblioteca, en texto o en el pentagrama, y baraja sin cortes a tiempo con un metrónomo avanzado. Crea ejercicios a medida, comparte entre dispositivos, y prepara con facilidad lecciones para ti o para tus alumnos.",
    "practice.open": "Abrir eization",
    "practice.bookTitle": "Desde un libro que ya tienes",
    "practice.book": "Escribe cada línea en la que trabajas, un ejemplo por línea. Toca el ejercicio con el metrónomo. Siguiente trae la línea siguiente. Los ejercicios de este sitio son los propios de eization.",
    "practice.books": "Libros que ya tienes",
    "practice.lessonTitle": "Desde una lección que viste",
    "practice.lesson": "Pausa después de cada ejemplo. Pon ese ejemplo en su propia línea. Practica el ejercicio con el metrónomo antes de ver la lección siguiente.",
    "practice.ownTitle": "Tu propio ejercicio",
    "practice.own": "Editar cambia cualquier ejercicio en este dispositivo. Actualizar y Guardar como nuevo dejan los ejercicios en este dispositivo. Compartir copia un enlace. Descargar y Cargar copian el ejercicio abierto a un archivo .eiz y de vuelta.",
    "practice.listTitle": "Ejercicios",
    "practice.onStaff": "En el pentagrama",
    "practice.asText": "En texto",
    "practice.libraryTitle": "También en el sitio",
    "practice.library": "Estos no entran en el menú de la primera visita. Abre uno y eization lo añade en este dispositivo.",
    "practice.moreTitle": "Más ejercicios",
    "practice.more": "Ejercicios extra para problemas habituales de estudiantes. No están en el menú por defecto. Abre uno en eization: Añadir o Vista previa lo deja en este dispositivo.",
    "practice.moreOpen": "Más ejercicios",
    "practice.staffTitle": "Escrito en el pentagrama",
    "practice.staff": "Escalas, Voicings rootless de mano izquierda, Progresiones esenciales, Tocar/Silencio y Ritmos se escriben en el pentagrama. Todas las notas, Todos los acordes, Notas del acorde, Recursos rítmicos, Desarrollo motívico y Juego libre son texto. La línea en Editar es la música en pantalla.",
    "practice.staffOpen": "Cómo escribir en el pentagrama",
    "practice.teachersTitle": "Para profesores",
    "practice.teachers": "Historias, planes de clase y comparación honesta de herramientas para el estudio. Prepara lecciones para ti o para tus alumnos. Comparte entre dispositivos. Un ejemplo cada vez, con el metrónomo.",
    "practice.teachersOpen": "Para profesores",
    "practice.qScales": "¿Cómo practico escalas con un metrónomo?",
    "practice.aScales": "Abre Escalas. Ves una escala. Play arranca el clic y lleva el tiempo de esa escala. Cuando la barra se llena, entra la escala siguiente. Cada escala sale una vez. Luego cambia el orden.",
    "practice.openScales": "Abrir Escalas",
    "practice.qBook": "¿Cómo practico una línea de un libro que ya tengo?",
    "practice.aBook": "Escribe cada línea en la que trabajas, un ejemplo por línea. Editar deja el ejercicio en este dispositivo. Play lleva el tiempo. Siguiente trae la línea siguiente.",
    "practice.qLesson": "¿Cómo practico ejemplos de una lección que vi?",
    "practice.qAgain": "¿Un ejemplo vuelve a salir antes que los demás?",
    "practice.aAgain": "Cada ejemplo del ejercicio sale una vez. Luego cambia el orden.",
    "practice.qKeep": "¿Puedo quedarme con mi propio ejercicio?"
  }
};

function t(key) {
  var pack = I18N[eizationLang] || I18N.en;
  if (pack[key] != null) {
    return pack[key];
  }
  if (I18N.en[key] != null) {
    return I18N.en[key];
  }
  return key;
}

function tr(key, map) {
  var text = t(key);
  var name;
  if (!map) {
    return text;
  }
  for (name in map) {
    if (Object.prototype.hasOwnProperty.call(map, name)) {
      text = text.split("{" + name + "}").join(String(map[name]));
    }
  }
  return text;
}

function readStoredLang() {
  try {
    return localStorage.getItem(LANG_KEY) || "";
  } catch (err) {
    return "";
  }
}

function preferredLang() {
  var stored = readStoredLang();
  var page;
  var list;
  var i;
  var code;
  if (stored === "es" || stored === "en") {
    return stored;
  }
  page = document.documentElement.getAttribute("data-page-lang");
  if (page === "es" || page === "en") {
    return page;
  }
  list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
  for (i = 0; i < list.length; i++) {
    code = String(list[i] || "").toLowerCase();
    if (code.indexOf("es") === 0) {
      return "es";
    }
    if (code.indexOf("en") === 0) {
      return "en";
    }
  }
  return "en";
}

function exerciseDisplayName(row) {
  if (!row) {
    return "";
  }
  if (row.seedId && typeof exercises !== "undefined" && exercises[row.seedId] && row.name === exercises[row.seedId].label) {
    return t("seed." + row.seedId);
  }
  return row.name || "";
}

function canonicalExerciseName(seedId, typed) {
  var english;
  var langs;
  var i;
  if (!seedId || typeof exercises === "undefined" || !exercises[seedId]) {
    return typed;
  }
  english = exercises[seedId].label;
  if (typed === english) {
    return english;
  }
  langs = ["en", "es"];
  for (i = 0; i < langs.length; i++) {
    if (I18N[langs[i]]["seed." + seedId] === typed) {
      return english;
    }
  }
  return typed;
}

function isStockCustomName(name) {
  var trimmed = String(name || "").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  return trimmed === I18N.en["edit.defaultName"] || trimmed === I18N.es["edit.defaultName"];
}

function applyStaticCopy() {
  var nodes;
  var i;
  var el;
  var key;
  document.documentElement.lang = eizationLang === "es" ? "es" : "en";
  nodes = document.querySelectorAll("[data-i18n]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    key = el.getAttribute("data-i18n");
    if (el.getAttribute("data-i18n-html") === "1") {
      el.innerHTML = t(key);
    } else {
      el.textContent = t(key);
    }
  }
  nodes = document.querySelectorAll("[data-i18n-title]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
  }
  nodes = document.querySelectorAll("[data-i18n-aria]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria")));
  }
  nodes = document.querySelectorAll("[data-i18n-placeholder]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  }
  nodes = document.querySelectorAll("[data-i18n-content]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    el.setAttribute("content", t(el.getAttribute("data-i18n-content")));
  }
  nodes = document.querySelectorAll("[data-i18n-empty]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    el.setAttribute("data-empty", t(el.getAttribute("data-i18n-empty")));
  }
  nodes = document.querySelectorAll("[data-set-lang]");
  for (i = 0; i < nodes.length; i++) {
    el = nodes[i];
    var on = el.getAttribute("data-set-lang") === eizationLang;
    el.classList.toggle("is-on", on);
    el.setAttribute("aria-pressed", on ? "true" : "false");
  }
}

function refreshLocalizedUi() {
  applyStaticCopy();
  if (typeof buildExerciseMenu === "function") {
    buildExerciseMenu();
  }
  if (typeof renderMeterSignature === "function") {
    renderMeterSignature();
  }
  if (typeof renderGroove === "function") {
    renderGroove();
  }
  if (typeof renderSwing === "function") {
    renderSwing();
  }
  if (typeof renderTempoToggle === "function") {
    renderTempoToggle();
  }
  if (typeof updateRemaining === "function") {
    updateRemaining();
  }
  if (typeof editorApplyLanguage === "function") {
    editorApplyLanguage();
  }
  if (typeof aboutApplyLanguage === "function") {
    aboutApplyLanguage();
  }
  if (typeof restoreApplyLanguage === "function") {
    restoreApplyLanguage();
  }
  if (typeof placeHelloCaption === "function") {
    placeHelloCaption();
  }
  if (typeof layoutFrame === "function") {
    layoutFrame();
  }
}

function setEizationLang(lang) {
  eizationLang = lang === "es" ? "es" : "en";
  try {
    localStorage.setItem(LANG_KEY, eizationLang);
  } catch (err) {}
  refreshLocalizedUi();
}

function prepareLanguage() {
  eizationLang = preferredLang();
  applyStaticCopy();
}

document.addEventListener("click", function (event) {
  var button = event.target.closest("[data-set-lang]");
  var lang;
  var href;
  if (!button) {
    return;
  }
  lang = button.getAttribute("data-set-lang");
  href = button.getAttribute("data-lang-href");
  setEizationLang(lang);
  if (typeof track === "function") {
    track("set_language", {
      lang: lang === "es" ? "es" : "en",
      transport_type: "beacon"
    });
  }
  if (href && button.tagName !== "A") {
    window.location.href = href;
  }
});

prepareLanguage();
