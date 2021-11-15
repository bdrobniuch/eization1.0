
//var audio = new Audio('./resources/wav/click.flac');

var interval = 1000;
var countnotes = 0;
var myVar = setInterval(myTimer, 1000);

var allNotes = [
    "C<sup><small> </small></sup>",
    "C<sup><small> </small></sup>",

    "C<sup><small>&#9839</small></sup>",
    "D<sup><small>&#9837</small></sup>",

    "D<sup><small> </small></sup>",
    "D<sup><small> </small></sup>",

    "D<sup><small>&#9839</small></sup>",
    "E<sup><small>&#9837</small></sup>",

    "E<sup><small> </small></sup>",
    "E<sup><small> </small></sup>",

    "F<sup><small> </small></sup>",
    "F<sup><small> </small></sup>",

    "F<sup><small>&#9839</small></sup>",
    "G<sup><small>&#9837</small></sup>",

    "G<sup><small> </small></sup>",
    "G<sup><small> </small></sup>",

    "G<sup><small>&#9839</small></sup>",
    "A<sup><small>&#9837</small></sup>",

    "A<sup><small> </small></sup>",
    "A<sup><small> </small></sup>",

    "A<sup><small>&#9839</small></sup>",
    "B<sup><small>&#9837</small></sup>",

    "B<sup><small> </small></sup>",
    "B<sup><small> </small></sup>"
]

var augmented = [
    "C&#129041E&#129041A<sup><small>&#9837</small></sup>",
    "C&#129043E&#129043A<sup><small>&#9837</small></sup>",
    "C&#129041E&#129043A<sup><small>&#9837</small></sup>",
    "C&#129043E&#129041A<sup><small>&#9837</small></sup>",
    "C&#129041A<sup><small>&#9837</small></sup>&#129041E",
    "C&#129043A<sup><small>&#9837</small></sup>&#129043E",
    "C&#129041A<sup><small>&#9837</small></sup>&#129043E",
    "C&#129043A<sup><small>&#9837</small></sup>&#129041E",
    "A<sup><small>&#9837</small></sup>&#129041C&#129041E",
    "A<sup><small>&#9837</small></sup>&#129043C&#129043E",
    "A<sup><small>&#9837</small></sup>&#129041C&#129043E",
    "A<sup><small>&#9837</small></sup>&#129043C&#129041E",
    "A<sup><small>&#9837</small></sup>&#129041E&#129041C",
    "A<sup><small>&#9837</small></sup>&#129043E&#129043C",
    "A<sup><small>&#9837</small></sup>&#129041E&#129043C",
    "A<sup><small>&#9837</small></sup>&#129043E&#129041C",
    "E&#129041C&#129041A<sup><small>&#9837</small></sup>",
    "E&#129043C&#129043A<sup><small>&#9837</small></sup>",
    "E&#129041C&#129043A<sup><small>&#9837</small></sup>",
    "E&#129043C&#129041A<sup><small>&#9837</small></sup>",
    "E&#129041A<sup><small>&#9837</small></sup>&#129041C",
    "E&#129043A<sup><small>&#9837</small></sup>&#129043C",
    "E&#129041A<sup><small>&#9837</small></sup>&#129043C",
    "E&#129043A<sup><small>&#9837</small></sup>&#129041C",
    "D<sup><small>&#9837</small></sup>&#129041F&#129041A",
    "D<sup><small>&#9837</small></sup>&#129043F&#129043A",
    "D<sup><small>&#9837</small></sup>&#129041F&#129043A",
    "D<sup><small>&#9837</small></sup>&#129043F&#129041A",
    "D<sup><small>&#9837</small></sup>&#129041A&#129041F",
    "D<sup><small>&#9837</small></sup>&#129043A&#129043F",
    "D<sup><small>&#9837</small></sup>&#129041A&#129043F",
    "D<sup><small>&#9837</small></sup>&#129043A&#129041F",
    "F&#129041D<sup><small>&#9837</small></sup>&#129041A",
    "F&#129043D<sup><small>&#9837</small></sup>&#129043A",
    "F&#129041D<sup><small>&#9837</small></sup>&#129043A",
    "F&#129043D<sup><small>&#9837</small></sup>&#129041A",
    "F&#129041A&#129041D<sup><small>&#9837</small></sup>",
    "F&#129043A&#129043D<sup><small>&#9837</small></sup>",
    "F&#129041A&#129043D<sup><small>&#9837</small></sup>",
    "F&#129043A&#129041D<sup><small>&#9837</small></sup>",
    "A&#129041D<sup><small>&#9837</small></sup>&#129041F",
    "A&#129043D<sup><small>&#9837</small></sup>&#129043F",
    "A&#129041D<sup><small>&#9837</small></sup>&#129043F",
    "A&#129043D<sup><small>&#9837</small></sup>&#129041F",
    "A&#129041F&#129041D<sup><small>&#9837</small></sup>",
    "A&#129043F&#129043D<sup><small>&#9837</small></sup>",
    "A&#129041F&#129043D<sup><small>&#9837</small></sup>",
    "A&#129043F&#129041D<sup><small>&#9837</small></sup>",
    "D&#129041F<sup><small>&#9839</small></sup>&#129041B<sup><small>&#9837</small></sup>",
    "D&#129043F<sup><small>&#9839</small></sup>&#129043B<sup><small>&#9837</small></sup>",
    "D&#129041F<sup><small>&#9839</small></sup>&#129043B<sup><small>&#9837</small></sup>",
    "D&#129043F<sup><small>&#9839</small></sup>&#129041B<sup><small>&#9837</small></sup>",
    "D&#129041B<sup><small>&#9837</small></sup>&#129041F<sup><small>&#9839</small></sup>",
    "D&#129043B<sup><small>&#9837</small></sup>&#129043F<sup><small>&#9839</small></sup>",
    "D&#129041B<sup><small>&#9837</small></sup>&#129043F<sup><small>&#9839</small></sup>",
    "D&#129043B<sup><small>&#9837</small></sup>&#129041F<sup><small>&#9839</small></sup>",
    "F<sup><small>&#9839</small></sup>&#129041D&#129041B<sup><small>&#9837</small></sup>",
    "F<sup><small>&#9839</small></sup>&#129043D&#129043B<sup><small>&#9837</small></sup>",
    "F<sup><small>&#9839</small></sup>&#129041D&#129043B<sup><small>&#9837</small></sup>",
    "F<sup><small>&#9839</small></sup>&#129043D&#129041B<sup><small>&#9837</small></sup>",
    "F<sup><small>&#9839</small></sup>&#129041B<sup><small>&#9837</small></sup>&#129041D",
    "F<sup><small>&#9839</small></sup>&#129043B<sup><small>&#9837</small></sup>&#129043D",
    "F<sup><small>&#9839</small></sup>&#129041B<sup><small>&#9837</small></sup>&#129043D",
    "F<sup><small>&#9839</small></sup>&#129043B<sup><small>&#9837</small></sup>&#129041D",
    "B<sup><small>&#9837</small></sup>&#129041D&#129041F<sup><small>&#9839</small></sup>",
    "B<sup><small>&#9837</small></sup>&#129043D&#129043F<sup><small>&#9839</small></sup>",
    "B<sup><small>&#9837</small></sup>&#129041D&#129043F<sup><small>&#9839</small></sup>",
    "B<sup><small>&#9837</small></sup>&#129043D&#129041F<sup><small>&#9839</small></sup>",
    "B<sup><small>&#9837</small></sup>&#129041F<sup><small>&#9839</small></sup>&#129041D",
    "B<sup><small>&#9837</small></sup>&#129043F<sup><small>&#9839</small></sup>&#129043D",
    "B<sup><small>&#9837</small></sup>&#129041F<sup><small>&#9839</small></sup>&#129043D",
    "B<sup><small>&#9837</small></sup>&#129043F<sup><small>&#9839</small></sup>&#129041D",
    "E<sup><small>&#9837</small></sup>&#129041G&#129041B",
    "E<sup><small>&#9837</small></sup>&#129043G&#129043B",
    "E<sup><small>&#9837</small></sup>&#129041G&#129043B",
    "E<sup><small>&#9837</small></sup>&#129043G&#129041B",
    "E<sup><small>&#9837</small></sup>&#129041B&#129041G",
    "E<sup><small>&#9837</small></sup>&#129043B&#129043G",
    "E<sup><small>&#9837</small></sup>&#129041B&#129043G",
    "E<sup><small>&#9837</small></sup>&#129043B&#129041G",
    "G&#129041E<sup><small>&#9837</small></sup>&#129041B",
    "G&#129043E<sup><small>&#9837</small></sup>&#129043B",
    "G&#129041E<sup><small>&#9837</small></sup>&#129043B",
    "G&#129043E<sup><small>&#9837</small></sup>&#129041B",
    "G&#129041B&#129041E<sup><small>&#9837</small></sup>",
    "G&#129043B&#129043E<sup><small>&#9837</small></sup>",
    "G&#129041B&#129043E<sup><small>&#9837</small></sup>",
    "G&#129043B&#129041E<sup><small>&#9837</small></sup>",
    "B&#129041E<sup><small>&#9837</small></sup>&#129041G",
    "B&#129043E<sup><small>&#9837</small></sup>&#129043G",
    "B&#129041E<sup><small>&#9837</small></sup>&#129043G",
    "B&#129043E<sup><small>&#9837</small></sup>&#129041G",
    "B&#129041G&#129041E<sup><small>&#9837</small></sup>",
    "B&#129043G&#129043E<sup><small>&#9837</small></sup>",
    "B&#129041G&#129043E<sup><small>&#9837</small></sup>",
    "B&#129043G&#129041E<sup><small>&#9837</small></sup>"
    ]

var augmented2 = [
    "C E A<sup><small>&#9837</small></sup>",
    "C A<sup><small>&#9837</small></sup> E",
    "A<sup><small>&#9837</small></sup> C E",
    "A<sup><small>&#9837</small></sup> E C",
    "E C A<sup><small>&#9837</small></sup>",
    "E A<sup><small>&#9837</small></sup> C",
    "D<sup><small>&#9837</small></sup> F A",
    "D<sup><small>&#9837</small></sup> A F",
    "F D<sup><small>&#9837</small></sup> A",
    "F A D<sup><small>&#9837</small></sup>",
    "A D<sup><small>&#9837</small></sup> F",
    "A F D<sup><small>&#9837</small></sup>",
    "D F<sup><small>&#9839</small></sup> B<sup><small>&#9837</small></sup>",
    "D B<sup><small>&#9837</small></sup> F<sup><small>&#9839</small></sup>",
    "F<sup><small>&#9839</small></sup> D B<sup><small>&#9837</small></sup>",
    "F<sup><small>&#9839</small></sup> B<sup><small>&#9837</small></sup> D",
    "B<sup><small>&#9837</small></sup> D F<sup><small>&#9839</small></sup>",
    "B<sup><small>&#9837</small></sup> F<sup><small>&#9839</small></sup> D"    
]

var chromaticScale = allNotes;

var notePool = [];
var beat = 4;

function myTimer() {
  if (beat==0) {
    countnotes++;
    document.getElementById("note").innerHTML  = pickANote();
    document.getElementById("counter").innerHTML  = countnotes;
    beat = 4;
  }
  beat--;
  document.getElementById("bar").value = beat;  
  updateInterval();
  //ClickSound();
}

function updateInterval()
{   
    var bpm = document.getElementById("bpm").value;
    var newInterval = Math.round(1000*60/bpm);
    console.log(bpm);
    if ((bpm >= 10)&&(bpm <= 400)) {      
        console.log("ok", bpm);
        if (newInterval != interval) {
            interval = newInterval;
            clearInterval(myVar);
            myVar = setInterval(myTimer, interval);
        }
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

/*

function ClickSound() {
    //var sound = document.getElementById(soundObj);
    //sound.Play();

    //
    //audio.load();

    if (document.getElementById("mute").checked == true){
        //audio.play();
        //window.sounds['click.flac'].play();
        //console.log("click");

        scheduler();
    } else {
        clearTimeout(timerID);
    }

    //
    if (document.getElementById("mute").checked == true){
        //audio.play();
        //window.sounds['click.flac'].play();
        console.log("click" , timerID);
        if (timerID==undefined) {
            scheduler();
        }
        
    } else {
        console.log("clickoff", timerID);
        if (timerID!=undefined) {
            clearTimeout(timerID);
            timerID = undefined;
        }
        
    }
}


function Unmute() {
    //window.sounds = new Object();
    //var sound = new Audio('./resources/wav/click.flac');
    //sound.load();
    //window.sounds['click.flac'] = sound;
    //console.log("unmuted");
    //audio.load();
    //audioContext = new AudioContext();
    //nextNotetime = audioContext.currentTime;

}


///////////audio context

window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = new AudioContext();
var nextNotetime;
//var clock = document.getElementById("clock");
//var nextNote = document.getElementById("nextNote");
//var startBtn = document.getElementById("startBtn");
//var stopBtn = document.getElementById("stopBtn");
var timerID = undefined;

//setInterval(function(){ clock.innerHTML = audioContext.currentTime; }, 500);

function playSound(time) {
  
  var osc = audioContext.createOscillator();
  osc.connect(audioContext.destination);
  osc.frequency.value = 4000;
  osc.start(time);
  osc.stop(time + 0.05);
};

function scheduler() {

    while(nextNotetime < audioContext.currentTime + 0.1) {
        var bpm = document.getElementById("bpm").value;
        if (bpm <10) {
            bpm =10;
        }
        nextNotetime += 60 /  bpm;
        //nextNote.innerHTML = nextNotetime;
        playSound(nextNotetime);
    }

   timerID = window.setTimeout(scheduler, 50.0);
}


if(audioContext.state === 'suspended'){
  audioContext.resume();
  nextNotetime = audioContext.currentTime;
};
*/