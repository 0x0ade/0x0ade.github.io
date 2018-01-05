function genlow(p, s, t) {
    t *= 0.5;

    t += s * 1000.0;

    t = t % s;
    var vt = t / s;

    var wave = (
        0.7 * Math.sin(2 * Math.PI * p * t) +
        0.4 * Math.sign(Math.sin(0.5 * Math.PI * p * t)) +
    0);

    var vol = Math.sin(Math.PI * vt);

    return wave * vol;
}

function genhigh(p, s, t) {
    s = Math.abs(s * 0.2 - s * (s % 0.1));

    t += s * 1000.0;    

    t = t % s;
    var vt = t / s;

    t *= 2 * Math.pow(0.5, 0.1 * (t % 0.5));

    var wave = (
        Math.sin(8 * 2 * Math.PI * p * t) +
        Math.sign(Math.sin(12 * 2 * Math.PI * p * t)) +
        Math.sign(Math.sin(16 * 2 * Math.PI * p * t)) +
    0);

    var vol = Math.pow(Math.exp(-vt), 16 * s);

    return wave * vol;
}

function generate(t) {
    return 0 +
    (
        genlow(330, 3, t) +
        genlow(330, 3, t + 1) +
        genlow(660, 4, t) +
        0.5 * genlow(495, 5, t) +
        0.2 * genlow(990, 6, t) +
    0) / 20
    +
    (
        genhigh(330, 7, t) +
        genhigh(150, 11, t) +
        genhigh(250, 13, t) +
        genhigh(300, 5, t) +
        genhigh(330, 17, t) +
    0) / 80
    ;
}

function preprocess(t) {
    var to = t;

    to += 0.01 * (t % 0.001) * Math.sin(Math.PI * 2 * (t % 0.1) / 4.123512);

    return to;
}

function postprocess(t, v) {
    var vo = v;

    var crush = 0.1 + 0.3 * Math.sin(Math.PI * 2 * t / 5.123512);
    
    vo = crush * Math.floor(v / crush + 0.5);
    vo = 0.2 * vo + 0.8 * v;

    return vo * 0.05;
}

registerProcessor('BGMGenerator', class BGMGenerator extends AudioWorkletProcessor {
    static get parameterDescriptors() {
        return [

        ];
    }

    constructor(options) {
        super(options);

        this.index = (Date.now() % 1024) * sampleRate;
    }

    process(inputs, outputs, parameters) {
        var output = outputs[0];
        for (var channel = 0; channel < output.length; ++channel) {
            var outputChannel = output[channel];
            for (var i = 0; i < outputChannel.length; ++i) {
                
                var t = (this.index + i) / sampleRate;

                outputChannel[i] = postprocess(t, generate(preprocess(t)));

            }
        }

        this.index += output[0].length;
    
        return true;
    }
});