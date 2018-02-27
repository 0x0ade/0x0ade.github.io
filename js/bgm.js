Main.Audio = {
    context: AWPF.context,
    generator: null,

    initialized: false,

    muted: false,
    mutedPreBlur: false,

    mute(auto) {
        if (Main.Audio.muted)
            return;
        if (!auto)
            document.body.setAttribute('data-bgm', 'off');
        Main.Audio.muted = true;        
        Main.Audio.masterGain.gain.setTargetAtTime(0, Main.Audio.context.currentTime, 0.2);
    },

    unmute(auto, value) {
        if (Main.Audio.mutedPreBlur || !Main.Audio.muted)
            return;
        if (!auto)
            document.body.setAttribute('data-bgm', 'on');
        Main.Audio.muted = false;        
        Main.Audio.masterGain.gain.setTargetAtTime(1, Main.Audio.context.currentTime, 0.2);
    },

    init() {
        if (Main.Audio.initialized)
            return;
        Main.Audio.initialized = true;

        window.addEventListener('focus', e => {
            Main.Audio.unmute(true);
            Main.Audio.mutedPreBlur = false;
        }, false);
        window.addEventListener('blur', e => {
            Main.Audio.mutedPreBlur = Main.Audio.muted;
            Main.Audio.mute(true);
        }, false);

        Main.Audio.toggleElem = document.getElementById('audio-toggle');
        Main.Audio.toggleElem.addEventListener('click', e => {
            if (Main.Audio.muted)
                Main.Audio.unmute();
            else
                Main.Audio.mute();            
        }, false);
        Main.Audio.toggleElem.addEventListener('mousedown', e => e.preventDefault(), false);

        console.log('init audio');
        console.log('AWPF.isAudioWorkletPolyfilled: ', AWPF.isAudioWorkletPolyfilled ? "true" : "false");

        Main.Audio.masterCompressor = Main.Audio.context.createDynamicsCompressor();
        Main.Audio.masterCompressor.connect(Main.Audio.context.destination);

        Main.Audio.masterGain = Main.Audio.context.createGain();
        Main.Audio.masterGain.connect(Main.Audio.masterCompressor);

        Main.Audio.master = Main.Audio.masterGain;

        Main.Audio.mute();
        Main.Audio.masterGain.gain.setTargetAtTime(0, Main.Audio.context.currentTime, 0);

        console.log('fetching BGMGenerator');
        Main.Audio.context.audioWorklet.addModule('/js/bgm-worklet.js').then(() => {
            document.body.setAttribute('data-bgm', 'off');
            console.log('connecting BGMGenerator');
            Main.Audio.generator = new AudioWorkletNode(Main.Audio.context, 'BGMGenerator');
            Main.Audio.generator.connect(Main.Audio.master);
        });

    },

};

Main.Audio.init();
