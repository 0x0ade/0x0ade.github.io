Audio = {
    context: AWPF.context,
    generator: null,

    initialized: false,

    init() {
        if (Audio.initialized)
            return;
        Audio.initialized = true;

        console.log('init audio');
        console.log('AWPF.isAudioWorkletPolyfilled: ', AWPF.isAudioWorkletPolyfilled ? "true" : "false");

        Audio.masterCompressor = Audio.context.createDynamicsCompressor();
        Audio.masterCompressor.connect(Audio.context.destination);

        Audio.masterGain = Audio.context.createGain();
        Audio.masterGain.connect(Audio.masterCompressor);

        Audio.master = Audio.masterGain;

        console.log('fetching BGMGenerator');
        Audio.context.audioWorklet.addModule('/js/bgm-worklet.js').then(() => {
            console.log('connecting BGMGenerator');
            Audio.generator = new AudioWorkletNode(Audio.context, 'BGMGenerator');
            Audio.generator.connect(Audio.master);
        });

    },

};

Audio.init();
