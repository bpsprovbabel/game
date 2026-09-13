// Sound Controller dengan Web Audio API: Procedural Synth, Relaxing BGM & Sound FX
const Sound = (() => {
    let ctx = null;
    let bgmGain = null;
    let sfxGain = null;
    let isBgmPlaying = false;
    let bgmTimer = null;
    let currentStep = 0;
    let customAudioLobby = null;
    let customAudioMatch = null;
    let usingCustomAudio = false;
    let currentWinAudio = null;

    function getAudioContext() {
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                ctx = new AudioCtx();
                
                // Master SFX Gain
                sfxGain = ctx.createGain();
                sfxGain.gain.setValueAtTime(0.6, ctx.currentTime);
                sfxGain.connect(ctx.destination);

                // Master BGM Gain
                bgmGain = ctx.createGain();
                bgmGain.gain.setValueAtTime(0.22, ctx.currentTime); // Volume santai & tidak bising
                bgmGain.connect(ctx.destination);
            }
        }
        if (ctx && ctx.state === 'suspended') {
            ctx.resume();
        }
        return ctx;
    }

    // ==========================================
    // PROCEDURAL AUDIO: LOBBY & MATCH BGM MODES
    // ==========================================
    let bgmMode = 'lobby'; // 'lobby' atau 'match'
    let isUserMusicMuted = false;

    // 1. Akord Lobby (Santai, Hangat, Lo-Fi Chill: Cmaj7 - Am7 - Fmaj7 - G7) ~67 BPM
    const lobbyChords = [
        { bass: 130.81, notes: [261.63, 329.63, 392.00, 493.88], mel: [523.25, 659.25, 493.88, 392.00] },
        { bass: 110.00, notes: [220.00, 261.63, 329.63, 392.00], mel: [440.00, 523.25, 659.25, 523.25] },
        { bass: 87.31,  notes: [174.61, 220.00, 261.63, 329.63], mel: [349.23, 440.00, 523.25, 440.00] },
        { bass: 98.00,  notes: [196.00, 246.94, 293.66, 349.23], mel: [392.00, 493.88, 587.33, 493.88] }
    ];

    // 2. Akord Match / Pertandingan (Tegang, Cepat, Menghentak: Dm - Bb - Gm - A7) ~130 BPM
    const matchChords = [
        { bass: 73.42,  notes: [146.83, 174.61, 220.00], arp: [293.66, 349.23, 440.00, 587.33] },
        { bass: 58.27,  notes: [116.54, 146.83, 174.61], arp: [233.08, 293.66, 349.23, 466.16] },
        { bass: 49.00,  notes: [98.00, 116.54, 146.83],  arp: [196.00, 233.08, 293.66, 392.00] },
        { bass: 55.00,  notes: [110.00, 138.59, 164.81], arp: [220.00, 277.18, 329.63, 440.00] }
    ];

    // Mainkan not melodi lembut (Lobby)
    function playPluck(ac, freq, time, vol = 0.12, decay = 0.6) {
        if (!bgmGain) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + decay);

        osc.connect(gain);
        gain.connect(bgmGain);

        osc.start(time);
        osc.stop(time + decay);
    }

    // Mainkan nada bass hangat (Lobby)
    function playBass(ac, freq, time) {
        if (!bgmGain) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.8);

        osc.connect(gain);
        gain.connect(bgmGain);

        osc.start(time);
        osc.stop(time + 0.8);
    }

    // Mainkan bass menghentak dan bertenaga (Match BGM)
    function playBattleBass(ac, freq, time) {
        if (!bgmGain) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        const filter = ac.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, time);
        filter.frequency.exponentialRampToValueAtTime(150, time + 0.2);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.24, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(bgmGain);

        osc.start(time);
        osc.stop(time + 0.22);
    }

    // Mainkan synth arpeggio cepat dan menegangkan (Match BGM)
    function playBattleSynth(ac, freq, time) {
        if (!bgmGain) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.065, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);

        osc.connect(gain);
        gain.connect(bgmGain);

        osc.start(time);
        osc.stop(time + 0.16);
    }

    // Shaker / Hi-hat ritmik
    function playShaker(ac, time, vol = 0.025) {
        if (!bgmGain) return;
        const bufferSize = ac.sampleRate * 0.035;
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ac.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = ac.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6000, time);

        const gain = ac.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(bgmGain);

        whiteNoise.start(time);
    }

    // Beat scheduler untuk Lobby BGM (~67 BPM)
    function scheduleLobbyBeat() {
        if (!isBgmPlaying || bgmMode !== 'lobby') return;
        const ac = getAudioContext();
        if (!ac) return;

        const now = ac.currentTime;
        const chordIdx = Math.floor(currentStep / 4) % lobbyChords.length;
        const beatInChord = currentStep % 4;
        const currentChord = lobbyChords[chordIdx];

        if (beatInChord === 0) {
            playBass(ac, currentChord.bass, now);
        }

        playShaker(ac, now, 0.025);
        if (beatInChord % 2 === 1) {
            playShaker(ac, now + 0.22, 0.018);
        }

        const melNote = currentChord.mel[beatInChord];
        playPluck(ac, melNote, now, 0.08, 0.5);

        if (beatInChord === 2) {
            playPluck(ac, currentChord.notes[1] * 2, now + 0.22, 0.06, 0.4);
        }

        currentStep++;
    }

    // Beat scheduler untuk Match BGM (~130 BPM, Tegang & Cepat)
    function scheduleMatchBeat() {
        if (!isBgmPlaying || bgmMode !== 'match') return;
        const ac = getAudioContext();
        if (!ac) return;

        const now = ac.currentTime;
        const chordIdx = Math.floor(currentStep / 8) % matchChords.length;
        const stepInChord = currentStep % 8;
        const currentChord = matchChords[chordIdx];

        // Bass menghentak di ketukan 0, 2, 4, 6
        if (stepInChord % 2 === 0) {
            const bassPitch = stepInChord === 4 ? currentChord.bass * 1.5 : currentChord.bass;
            playBattleBass(ac, bassPitch, now);
        }

        // Hi-hat cepat di setiap ketukan (energi tinggi)
        playShaker(ac, now, stepInChord % 2 === 0 ? 0.045 : 0.025);

        // Arpeggio synth menegangkan
        const arpIdx = stepInChord % currentChord.arp.length;
        const arpFreq = currentChord.arp[arpIdx];
        playBattleSynth(ac, arpFreq, now);

        currentStep++;
    }

    // ==========================================
    // SOUND EFFECTS (SFX)
    // ==========================================

    return {
        init() {
            getAudioContext();
        },

        isMusicPlaying() {
            return isBgmPlaying && !isUserMusicMuted;
        },

        getBgmMode() {
            return bgmMode;
        },

        // Toggle BGM (Play / Pause user manual)
        toggleBGM() {
            if (isBgmPlaying && !isUserMusicMuted) {
                isUserMusicMuted = true;
                this.stopBGM(false);
                return false;
            } else {
                isUserMusicMuted = false;
                if (bgmMode === 'match') {
                    this.playMatchBGM();
                } else {
                    this.playLobbyBGM();
                }
                return true;
            }
        },

        // ==========================================
        // CUSTOM AUDIO LOADER (FOLDER /audio/)
        // ==========================================
        initCustomAudio() {
            if (typeof Audio === 'undefined') return;
            if (!customAudioLobby) {
                customAudioLobby = new Audio('/audio/lobby.mp3');
                customAudioLobby.loop = true;
                customAudioLobby.volume = 0.55;
            }
            if (!customAudioMatch) {
                customAudioMatch = new Audio('/audio/match.mp3');
                customAudioMatch.loop = true;
                customAudioMatch.volume = 0.65;
            }
        },

        // Putar musik santai di Lobby (~67 BPM)
        playLobbyBGM() {
            bgmMode = 'lobby';
            if (isUserMusicMuted) return;

            this.initCustomAudio();

            // Coba putar custom lobby.mp3 dari folder /audio/ jika ada
            if (customAudioLobby) {
                if (customAudioMatch) {
                    customAudioMatch.pause();
                    customAudioMatch.currentTime = 0;
                }

                const playPromise = customAudioLobby.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // File custom audio lobby.mp3 ditemukan dan diputar!
                        usingCustomAudio = true;
                        isBgmPlaying = true;
                        if (bgmTimer) {
                            clearInterval(bgmTimer);
                            bgmTimer = null;
                        }
                    }).catch(() => {
                        // File custom tidak ada / 404 / format belum didukung
                        // Fallback mulus ke synthesizer prosedural Web Audio API
                        usingCustomAudio = false;
                        this.startProceduralLobbySynth();
                    });
                    return;
                }
            }
            this.startProceduralLobbySynth();
        },

        startProceduralLobbySynth() {
            const ac = getAudioContext();
            if (!ac) return;

            if (bgmTimer) {
                clearInterval(bgmTimer);
                bgmTimer = null;
            }

            isBgmPlaying = true;
            currentStep = 0;

            if (bgmGain) {
                bgmGain.gain.setValueAtTime(0, ac.currentTime);
                bgmGain.gain.linearRampToValueAtTime(0.22, ac.currentTime + 0.8);
            }

            scheduleLobbyBeat();
            bgmTimer = setInterval(() => {
                scheduleLobbyBeat();
            }, 450);
        },

        // Putar musik tegang & cepat saat Pertandingan Dimulai (~130 BPM)
        playMatchBGM() {
            bgmMode = 'match';
            if (isUserMusicMuted) return;

            this.initCustomAudio();

            // Coba putar custom match.mp3 dari folder /audio/ jika ada
            if (customAudioMatch) {
                if (customAudioLobby) {
                    customAudioLobby.pause();
                    customAudioLobby.currentTime = 0;
                }

                const playPromise = customAudioMatch.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        // File custom audio match.mp3 ditemukan dan diputar!
                        usingCustomAudio = true;
                        isBgmPlaying = true;
                        if (bgmTimer) {
                            clearInterval(bgmTimer);
                            bgmTimer = null;
                        }
                    }).catch(() => {
                        // Fallback mulus ke synthesizer prosedural
                        usingCustomAudio = false;
                        this.startProceduralMatchSynth();
                    });
                    return;
                }
            }
            this.startProceduralMatchSynth();
        },

        startProceduralMatchSynth() {
            const ac = getAudioContext();
            if (!ac) return;

            if (bgmTimer) {
                clearInterval(bgmTimer);
                bgmTimer = null;
            }

            isBgmPlaying = true;
            currentStep = 0;

            if (bgmGain) {
                bgmGain.gain.setValueAtTime(0, ac.currentTime);
                bgmGain.gain.linearRampToValueAtTime(0.24, ac.currentTime + 0.5);
            }

            scheduleMatchBeat();
            bgmTimer = setInterval(() => {
                scheduleMatchBeat();
            }, 230); // ~130 BPM
        },

        // Ganti mode musik secara dinamis ('lobby' | 'match' | 'stop')
        switchBGM(mode) {
            this.stopWin();
            if (mode === 'stop') {
                this.stopBGM(false);
            } else if (mode === 'match') {
                this.playMatchBGM();
            } else {
                this.playLobbyBGM();
            }
        },

        // Kompatibilitas mundur
        playBGM(mode = 'lobby') {
            if (mode === 'stop') {
                this.stopBGM(false);
            } else if (mode === 'game' || mode === 'match') {
                this.playMatchBGM();
            } else {
                this.playLobbyBGM();
            }
        },

        // Hentikan BGM
        stopBGM(resetMute = false) {
            isBgmPlaying = false;
            if (resetMute) isUserMusicMuted = false;

            // Pause audio kustom jika ada
            if (customAudioLobby) {
                try {
                    customAudioLobby.pause();
                    customAudioLobby.currentTime = 0;
                } catch (e) {}
            }
            if (customAudioMatch) {
                try {
                    customAudioMatch.pause();
                    customAudioMatch.currentTime = 0;
                } catch (e) {}
            }
            usingCustomAudio = false;

            // Hentikan synthesizer prosedural
            if (bgmTimer) {
                clearInterval(bgmTimer);
                bgmTimer = null;
            }
            if (ctx && bgmGain) {
                bgmGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
            }
        },

        // Suara Peluit Pertandingan Mulai
        playWhistle() {
            const ac = getAudioContext();
            if (!ac) return;
            const now = ac.currentTime;

            const osc = ac.createOscillator();
            const gain = ac.createGain();
            const lfo = ac.createOscillator();
            const lfoGain = ac.createGain();

            lfo.frequency.setValueAtTime(32, now);
            lfoGain.gain.setValueAtTime(250, now);
            lfo.connect(osc.frequency);

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(2500, now);
            osc.frequency.exponentialRampToValueAtTime(2800, now + 0.1);

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.04);
            gain.gain.setValueAtTime(0.35, now + 0.6);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc.connect(gain);
            gain.connect(sfxGain || ac.destination);

            lfo.start(now);
            osc.start(now);
            osc.stop(now + 0.8);
            lfo.stop(now + 0.8);
        },

        // Helper memutar SFX Custom MP3 (/audio/xxx.mp3) dengan fallback sintetis
        playCustomOrSynthSFX(name, vol, fallbackSynthFn) {
            if (typeof Audio !== 'undefined') {
                try {
                    const audio = new Audio(`/audio/${name}.mp3`);
                    audio.volume = vol;
                    const p = audio.play();
                    if (p !== undefined) {
                        p.catch(() => {
                            fallbackSynthFn();
                        });
                        return;
                    }
                } catch (e) {
                    fallbackSynthFn();
                    return;
                }
            }
            fallbackSynthFn();
        },

        // Suara Jawaban Benar (Audio MP3 atau Chime Arpeggio Ceria)
        playCorrect() {
            this.playCustomOrSynthSFX('correct', 0.7, () => {
                const ac = getAudioContext();
                if (!ac) return;
                const now = ac.currentTime;

                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const osc = ac.createOscillator();
                    const gain = ac.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

                    gain.gain.setValueAtTime(0, now + idx * 0.08);
                    gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

                    osc.connect(gain);
                    gain.connect(sfxGain || ac.destination);

                    osc.start(now + idx * 0.08);
                    osc.stop(now + idx * 0.08 + 0.35);
                });
            });
        },

        // Suara Jawaban Salah (Audio MP3 atau Buzzer Disonan)
        playWrong() {
            this.playCustomOrSynthSFX('wrong', 0.7, () => {
                const ac = getAudioContext();
                if (!ac) return;
                const now = ac.currentTime;

                [160, 150].forEach(freq => {
                    const osc = ac.createOscillator();
                    const gain = ac.createGain();

                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(freq, now);
                    osc.frequency.linearRampToValueAtTime(freq * 0.8, now + 0.35);

                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

                    osc.connect(gain);
                    gain.connect(sfxGain || ac.destination);

                    osc.start(now);
                    osc.stop(now + 0.35);
                });
            });
        },

        // Suara Beep Countdown
        playCountdown(isFinal) {
            const ac = getAudioContext();
            if (!ac) return;
            const now = ac.currentTime;

            const osc = ac.createOscillator();
            const gain = ac.createGain();

            osc.type = 'sine';
            const freq = isFinal ? 1200 : 750;
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.6 : 0.2));

            osc.connect(gain);
            gain.connect(sfxGain || ac.destination);

            osc.start(now);
            osc.stop(now + (isFinal ? 0.6 : 0.2));
        },

        // Suara Pemain Join (Audio MP3 atau Nada Ceria)
        playJoin() {
            this.playCustomOrSynthSFX('join', 0.65, () => {
                const ac = getAudioContext();
                if (!ac) return;
                const now = ac.currentTime;

                const osc = ac.createOscillator();
                const gain = ac.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

                osc.connect(gain);
                gain.connect(sfxGain || ac.destination);

                osc.start(now);
                osc.stop(now + 0.2);
            });
        },

        // Suara Kemenangan (Audio MP3 atau Fanfare)
        playWin() {
            this.stopWin();
            if (typeof Audio !== 'undefined') {
                try {
                    const audio = new Audio('/audio/win.mp3');
                    currentWinAudio = audio;
                    audio.volume = 0.8;
                    const p = audio.play();
                    if (p !== undefined) {
                        p.catch(() => {
                            currentWinAudio = null;
                            playSynthWinMelody();
                        });
                        return;
                    }
                } catch (e) {
                    currentWinAudio = null;
                }
            }
            playSynthWinMelody();

            function playSynthWinMelody() {
                const ac = getAudioContext();
                if (!ac) return;
                const now = ac.currentTime;

                const melody = [
                    { f: 523.25, d: 0.15 },
                    { f: 659.25, d: 0.15 },
                    { f: 783.99, d: 0.15 },
                    { f: 1046.50, d: 0.45 }
                ];

                let offset = 0;
                melody.forEach(item => {
                    const osc = ac.createOscillator();
                    const gain = ac.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(item.f, now + offset);

                    gain.gain.setValueAtTime(0.28, now + offset);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + item.d);

                    osc.connect(gain);
                    gain.connect(sfxGain || ac.destination);

                    osc.start(now + offset);
                    osc.stop(now + offset + item.d);

                    offset += item.d * 0.9;
                });
            }
        },

        // Hentikan suara kemenangan jika sedang berputar
        stopWin() {
            if (currentWinAudio) {
                try {
                    currentWinAudio.pause();
                    currentWinAudio.currentTime = 0;
                } catch (e) {}
                currentWinAudio = null;
            }
        }
    };
})();
