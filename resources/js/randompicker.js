
//var audio = new Audio('./resources/wav/click.flac');

var interval = 1000;
var countnotes = 0;
var myVar = setInterval(myTimer, 1000);

var chromaticScale = [
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