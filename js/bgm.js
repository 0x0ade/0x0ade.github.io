(()=>{

var context = new AudioContext();

var samples = {};
var samplemap = {};
var irs = {};
var irmap = {};

var fetching = 0;
function fetchSample(url) {
    fetching++;
    var target = samples;
    if (url.startsWith('assets/irs/'))
        target = irs;
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(data => context.decodeAudioData(data))
        .then(sample => {
            for (var i = 0; i < arguments.length; i++)
                target[arguments[i]] = sample;
            fetching--;
            return sample;
        });
}

var masterCompressor = context.createDynamicsCompressor();
masterCompressor.connect(context.destination);

var masterGain = context.createGain();
masterGain.connect(masterCompressor);

var masterFilter = context.createBiquadFilter();
masterFilter.frequency.value = context.sampleRate * 0.5;
masterFilter.connect(masterGain);

var masterConvolverBypass = context.createGain();
masterConvolverBypass.connect(masterFilter);

var masterConvolver = context.createConvolver();
masterConvolver.connect(masterFilter);

var masterConvolverGain = context.createGain();
masterConvolverGain.connect(masterConvolver);

masterConvolverGain.gain.value = 0.5;
masterConvolverBypass.gain.value = 0.9;

var master = context.createGain();
master.connect(masterConvolverGain);
master.connect(masterConvolverBypass);

function load() {
    fetching++;
    fetch('assets/samplemap.json').then(response => response.json())
    .then(map => {
        samplemap = map;
        map.samples.forEach(full => {
            var short = full.split('/');
            fetchSample(`assets/samples/${full}.ogg`, full, short[short.length - 1]);
        });
        fetching--;
    });

    fetching++;
    fetch('assets/irmap.json').then(response => response.json())
    .then(map => {
        irmap = map;
        map.forEach(full => {
            var short = full.split('/');
            fetchSample(`assets/irs/${full}.wav`, full, short[short.length - 1]);
        });
        fetching--;
    });
}

funciton init

load();

})();