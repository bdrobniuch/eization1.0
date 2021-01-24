
var interval = 1000;
var myVar = setInterval(myTimer, 1000);
var chromaticScale = [
    "C<sup><small> </small></sup>",
    "C<sup><small> </small></sup>",

    "C<sup><small>♯</small></sup>",
    "D<sup><small>♭</small></sup>",

    "D<sup><small> </small></sup>",
    "D<sup><small> </small></sup>",

    "D<sup><small>♯</small></sup>",
    "E<sup><small>♭</small></sup>",

    "E<sup><small> </small></sup>",
    "E<sup><small> </small></sup>",

    "F<sup><small> </small></sup>",
    "F<sup><small> </small></sup>",

    "F<sup><small>♯</small></sup>",
    "G<sup><small>♭</small></sup>",

    "G<sup><small> </small></sup>",
    "G<sup><small> </small></sup>",

    "G<sup><small>♯</small></sup>",
    "A<sup><small>♭</small></sup>",

    "A<sup><small> </small></sup>",
    "A<sup><small> </small></sup>",

    "A<sup><small>♯</small></sup>",
    "B<sup><small>♭</small></sup>",

    "B<sup><small> </small></sup>",
    "B<sup><small> </small></sup>"
]

var notePool = [];
var beat = 4;

function myTimer() {
  if (beat==0) {
    document.getElementById("note").innerHTML  = pickANote();
    beat = 4;
  }
  beat--;
  document.getElementById("bar").value = beat;  
  ClickSound("click1");
  updateInterval();

}

function updateInterval()
{
    var newInterval = Math.round(1000*60/document.getElementById("bpm").value);
    if (newInterval != interval) {
        interval = newInterval;
        clearInterval(myVar);
        myVar = setInterval(myTimer, interval);
      }
}

function pickANote () {
  
    if (notePool.length ==0) {
        notePool = [...chromaticScale];
        shuffleArray(notePool);
    }
    return notePool.pop();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function ClickSound(soundObj) {
    //var sound = document.getElementById(soundObj);
    //sound.Play();

    //var audio = new Audio('./resources/wav/metronome.wav');
    //audio.play();
    window.sounds['metronome.wav'].play();
}

function Unmute() {
    window.sounds = new Object();
    var sound = new Audio('./resources/wav/metronome.wav');
    sound.load();
    window.sounds['metronome.wav'] = sound;
    console.log("unmuted");
}

