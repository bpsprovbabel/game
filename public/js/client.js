// Inisialisasi Socket.io
const socket = io();

// State Klien
let currentRole = null; // 'monitor' atau 'player'
let currentPIN = null;
let myPlayerName = '';
let myTeamNum = 0;
let currentAnswerInput = '';
let isMyTurnActive = false;
let currentQuestionData = null;
let lastMonitorState = null;

// Konfigurasi Soal Aktif
let activeSubjectConfig = {
    subject: 'matematika',
    level: 'smp',
    grade: '8',
    title: 'Matematika - SMP Kelas 8'
};

// Cek parameter URL untuk auto-fill PIN jika pemain scan QR Code
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam) {
        selectRole('player');
        const pinInput = document.getElementById('input-pin');
        if (pinInput) {
            pinInput.value = pinParam;
            submitCheckPIN();
        }
    }
    // Inisialisasi opsi kelas awal
    populateGradeOptions('smp', '8');

    // Auto-play musik santai saat interaksi pertama
    const startAudioOnFirstClick = () => {
        Sound.init();
        if (!Sound.isMusicPlaying()) {
            Sound.playBGM();
            updateMusicUI(true);
        }
        document.removeEventListener('click', startAudioOnFirstClick);
    };
    document.addEventListener('click', startAudioOnFirstClick);
});

/* =========================================================
   KONTROL MUSIK SANTAI (BGM)
========================================================= */

function toggleBGMUI() {
    Sound.init();
    const isPlaying = Sound.toggleBGM();
    updateMusicUI(isPlaying);
}

function updateMusicUI(isPlaying) {
    const homeText = document.getElementById('home-music-text');
    const homeEq = document.getElementById('home-eq');
    const monText = document.getElementById('monitor-music-text');
    const monEq = document.getElementById('monitor-eq');

    if (homeText) homeText.innerText = isPlaying ? 'Musik Santai: ON' : 'Musik: OFF';
    if (homeEq) {
        if (isPlaying) homeEq.classList.add('active');
        else homeEq.classList.remove('active');
    }

    if (monText) monText.innerText = isPlaying ? 'Musik: ON' : 'Musik: OFF';
    if (monEq) {
        if (isPlaying) monEq.classList.add('active');
        else monEq.classList.remove('active');
    }
}

/* =========================================================
   NAVIGASI SCREEN & ROLE SELECTION
========================================================= */

function selectRole(role) {
    currentRole = role;
    Sound.init();

    document.getElementById('role-select-screen').classList.add('hidden');

    if (role === 'monitor') {
        document.getElementById('monitor-view').classList.remove('hidden');
        socket.emit('join_monitor', { origin: window.location.origin });
        Sound.playBGM();
        updateMusicUI(true);
    } else {
        document.getElementById('player-join-screen').classList.remove('hidden');
    }
}

function backToRoleSelect() {
    goToScreen1();
}

function confirmHostExit() {
    if (confirm('Apakah Anda yakin ingin keluar ke Menu Utama? Room game ini akan diakhiri.')) {
        returnToMainMenu();
    }
}

function confirmPlayerLeave() {
    if (confirm('Apakah Anda yakin ingin keluar dari pertandingan dan kembali ke menu awal?')) {
        returnToMainMenu();
    }
}

function returnToMainMenu() {
    // 1. Hentikan musik kemenangan & switch ke musik santai lobby
    if (Sound.stopWin) Sound.stopWin();
    Sound.switchBGM('lobby');
    updateMusicUI(Sound.isMusicPlaying());

    // 2. Bersihkan query params (?pin=...) dari address bar browser agar tidak otomatis auto-join jika refresh
    if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // 3. Beri tahu server sesuai role
    if (currentRole === 'monitor') {
        socket.emit('host_return_to_main_menu');
        socket.emit('host_quit_game'); // Fallback compatibility
    } else {
        socket.emit('player_leave');
    }

    // 4. Navigasi langsung ke Screen 1 (Menu Utama / Role Selection - Gambar 2)
    goToScreen1();
}

function goToScreen1() {
    // Hentikan timer apapun yang sedang berjalan
    if (window.winnerCountdownInterval) {
        clearInterval(window.winnerCountdownInterval);
        window.winnerCountdownInterval = null;
    }

    // Bersihkan URL bar dari ?pin=... agar refresh tidak re-join otomatis
    if (window.history && window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Tutup seluruh modal
    const modalIds = [
        'winner-modal',
        'player-manage-modal',
        'settings-modal',
        'bank-modal',
        'qr-modal',
        'countdown-modal',
        'player-feedback-overlay'
    ];
    modalIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('player-winner-view');
        }
    });

    // Sembunyikan seluruh screen tampilan
    const screenIds = [
        'monitor-view',
        'player-view',
        'player-join-screen'
    ];
    screenIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    // Tampilkan Screen 1 (Role Select Screen - Gambar 2)
    const roleScreen = document.getElementById('role-select-screen');
    if (roleScreen) roleScreen.classList.remove('hidden');

    // Reset input fields
    const pinInput = document.getElementById('input-pin');
    if (pinInput) pinInput.value = '';
    const nameInput = document.getElementById('input-player-name');
    if (nameInput) nameInput.value = '';

    const stepPin = document.getElementById('join-step-pin');
    const stepTeam = document.getElementById('join-step-team');
    if (stepPin) stepPin.classList.remove('hidden');
    if (stepTeam) stepTeam.classList.add('hidden');

    // Reset state variabel klien
    currentRole = null;
    currentPIN = null;
    myPlayerName = '';
    myTeamNum = 0;
    currentAnswerInput = '';
    isMyTurnActive = false;
    currentQuestionData = null;
    lastMonitorState = null;

    // Pastikan musik santai lobby berbunyi jika musik aktif
    if (Sound.stopWin) Sound.stopWin();
    Sound.switchBGM('lobby');
    updateMusicUI(Sound.isMusicPlaying());
}

function resetPlayerToRoleSelect() {
    goToScreen1();
}

function toggleQRModal(show) {
    const modal = document.getElementById('qr-modal');
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

/* =========================================================
   MODAL PENGATURAN SUBJEK & TINGKAT KELAS (HOST)
========================================================= */

function toggleSettingsModal(show) {
    const modal = document.getElementById('settings-modal');
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

function toggleBankModal(show) {
    const modal = document.getElementById('bank-modal');
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
}

function populateGradeOptions(level, selectedGrade = null) {
    const gradeSelect = document.getElementById('select-grade');
    if (!gradeSelect) return;
    gradeSelect.innerHTML = '';

    if (level === 'sd') {
        for (let i = 1; i <= 6; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.innerText = `Kelas ${i} SD`;
            if (String(i) === String(selectedGrade)) opt.selected = true;
            gradeSelect.appendChild(opt);
        }
    } else if (level === 'smp') {
        const smpGrades = [
            { val: 7, label: 'Kelas 1 SMP (Kelas 7)' },
            { val: 8, label: 'Kelas 2 SMP (Kelas 8 - Statistika & Pythagoras)' },
            { val: 9, label: 'Kelas 3 SMP (Kelas 9 - Pangkat & Statistik Gabungan)' }
        ];
        smpGrades.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.val;
            opt.innerText = g.label;
            if (String(g.val) === String(selectedGrade || 8)) opt.selected = true;
            gradeSelect.appendChild(opt);
        });
    } else if (level === 'sma') {
        const smaGrades = [
            { val: 10, label: 'Kelas 1 SMA (Kelas 10 - Kuartil & Eksponen)' },
            { val: 11, label: 'Kelas 2 SMA (Kelas 11 - Simpangan & Deret)' },
            { val: 12, label: 'Kelas 3 SMA (Kelas 12 - Histogram & Peluang)' }
        ];
        smaGrades.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.val;
            opt.innerText = g.label;
            if (String(g.val) === String(selectedGrade || 11)) opt.selected = true;
            gradeSelect.appendChild(opt);
        });
    }
}

function onSubjectChange() {
    const subject = document.getElementById('select-subject').value;
    const mathPanel = document.getElementById('math-options-panel');
    const statBadge = document.getElementById('stat-info-badge');

    if (subject === 'matematika') {
        mathPanel.classList.remove('hidden');
        statBadge.classList.remove('hidden');
        statBadge.innerHTML = '💡 <strong>Statistika & Grafik:</strong> Level ini dilengkapi soal rata-rata (mean), nilai tengah (median), modus, serta grafik diagram batang visual!';
    } else if (subject === 'umum') {
        mathPanel.classList.add('hidden');
        statBadge.classList.remove('hidden');
        statBadge.innerHTML = '🎉 <strong>Pengetahuan Umum (100% Pilihan Ganda):** Menampilkan tebak tokoh legendaris, tebak gambar puzzle visual SVG, teka-teki lucu & logika kocak, serta kuliner dan fakta populer terkini!';
    } else if (subject === 'bps') {
        mathPanel.classList.add('hidden');
        statBadge.classList.remove('hidden');
        statBadge.innerHTML = '📊 <strong>BPS:</strong> Menampilkan materi seputar Sensus (SP, ST, SE), 38 Provinsi Indonesia, dan indikator strategis statistik nasional!';
    } else {
        mathPanel.classList.add('hidden');
        statBadge.classList.remove('hidden');
        statBadge.innerHTML = `📁 <strong>Pengetahuan Custom:</strong> Menggunakan kumpulan soal "${subject}" yang diimpor dari Excel, CSV, atau Google Sheets.`;
    }
}

function onLevelChange() {
    const level = document.getElementById('select-level').value;
    populateGradeOptions(level);
}

function saveSettings() {
    const subject = document.getElementById('select-subject').value;
    const level = document.getElementById('select-level').value;
    const grade = document.getElementById('select-grade').value;
    const duration = document.getElementById('select-duration').value;

    let title = '';
    if (subject === 'matematika') {
        const levelNames = { sd: 'SD', smp: 'SMP', sma: 'SMA' };
        title = `Matematika - ${levelNames[level]} Kelas ${grade}`;
    } else if (subject === 'bps') {
        title = `BPS - Sensus & Data Statistik`;
    } else if (subject === 'umum') {
        title = `Pengetahuan Umum (Tokoh, Gambar & Tebak Lucu)`;
    } else {
        title = `Pengetahuan Custom: ${subject}`;
    }

    activeSubjectConfig = { subject, level, grade, duration, title };

    socket.emit('host_update_settings', {
        subject: subject,
        level: level,
        grade: grade,
        duration: duration,
        title: title
    });

    toggleSettingsModal(false);
}

function updateCustomSubjectsDropdown(subjects) {
    const select = document.getElementById('select-subject');
    if (!select) return;

    // Bersihkan opsi custom sebelumnya (pertahankan matematika, bps, umum)
    for (let i = select.options.length - 1; i >= 0; i--) {
        const val = select.options[i].value;
        if (val !== 'matematika' && val !== 'bps' && val !== 'umum') {
            select.remove(i);
        }
    }

    // Tambahkan subjek kustom yang ada
    subjects.forEach(sub => {
        if (sub !== 'matematika' && sub !== 'bps' && sub !== 'umum') {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.innerText = `📁 Pengetahuan Custom: ${sub}`;
            select.appendChild(opt);
        }
    });

    // Update tags di modal bank soal
    const tagsContainer = document.getElementById('custom-subjects-list');
    if (tagsContainer) {
        tagsContainer.innerHTML = subjects.map(s => `<span class="tag-item">📁 ${s}</span>`).join('');
    }
}

/* =========================================================
   IMPORT SOAL EXCEL, CSV, & GOOGLE SHEETS (SHEETJS)
========================================================= */

function processFileUpload() {
    const fileInput = document.getElementById('file-import-input');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Silakan pilih file Excel (.xlsx / .xls) atau file .csv terlebih dahulu!');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            if (typeof XLSX === 'undefined') {
                alert('Library SheetJS belum selesai dimuat, coba sesaat lagi.');
                return;
            }

            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonRows = XLSX.utils.sheet_to_json(worksheet);

            if (!jsonRows || jsonRows.length === 0) {
                alert('File kosong atau tidak dapat dibaca.');
                return;
            }

            parseAndUploadQuestions(jsonRows, file.name.replace(/\.[^/.]+$/, ""));
        } catch (err) {
            console.error('Gagal memproses file Excel/CSV:', err);
            alert('Format file tidak sesuai: ' + err.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

function processGSheetSync() {
    const urlInput = document.getElementById('input-gsheet-url');
    let url = (urlInput ? urlInput.value : '').trim();

    if (!url) {
        alert('Masukkan link Google Sheets terlebih dahulu!');
        return;
    }

    // Ubah link edit / view menjadi export csv
    let csvUrl = url;
    if (url.includes('/edit')) {
        csvUrl = url.replace(/\/edit.*$/, '/export?format=csv');
    } else if (!url.endsWith('/export?format=csv')) {
        csvUrl = url.replace(/\/$/, '') + '/export?format=csv';
    }

    fetch(csvUrl)
        .then(res => {
            if (!res.ok) throw new Error('Gagal mengambil spreadsheet. Pastikan spreadsheet di-share publik (Anyone with link can view).');
            return res.text();
        })
        .then(csvText => {
            if (typeof XLSX === 'undefined') {
                alert('Library SheetJS belum siap.');
                return;
            }
            const workbook = XLSX.read(csvText, { type: 'string' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonRows = XLSX.utils.sheet_to_json(sheet);

            if (!jsonRows || jsonRows.length === 0) {
                alert('Spreadsheet kosong atau tidak memiliki baris data.');
                return;
            }

            parseAndUploadQuestions(jsonRows, "Google Sheets Soal");
        })
        .catch(err => {
            alert(err.message);
        });
}

function parseAndUploadQuestions(rows, fallbackSubject) {
    let subjectName = fallbackSubject;
    const questions = [];

    rows.forEach((row) => {
        // Ambil nama subjek dari baris jika ada
        const sub = row['Subjek'] || row['subjek'] || row['Subject'] || row['subject'];
        if (sub && sub.trim()) subjectName = sub.trim();

        const qText = row['Pertanyaan'] || row['pertanyaan'] || row['Soal'] || row['soal'] || row['Question'];
        const qAns = row['Jawaban_Benar'] || row['Jawaban'] || row['jawaban'] || row['Answer'] || row['kunci'];
        const qType = (row['Tipe'] || row['tipe'] || '').toLowerCase();

        if (qText && qAns !== undefined) {
            const optA = row['Pilihan_A'] || row['pilihan_a'] || row['A'] || row['a'];
            const optB = row['Pilihan_B'] || row['pilihan_b'] || row['B'] || row['b'];
            const optC = row['Pilihan_C'] || row['pilihan_c'] || row['C'] || row['c'];
            const optD = row['Pilihan_D'] || row['pilihan_d'] || row['D'] || row['d'];

            let options = null;
            if (optA && optB) {
                options = [String(optA), String(optB)];
                if (optC) options.push(String(optC));
                if (optD) options.push(String(optD));
            }

            const type = (options && options.length > 0) ? 'choice' : (qType === 'pilihan' ? 'choice' : 'numeric');

            questions.push({
                text: String(qText).trim(),
                type: type,
                options: options,
                answer: String(qAns).trim()
            });
        }
    });

    if (questions.length === 0) {
        alert('Tidak ditemukan kolom soal yang valid! Pastikan ada kolom "Pertanyaan" dan "Jawaban_Benar".');
        return;
    }

    socket.emit('host_import_questions', {
        subjectName: subjectName,
        questions: questions
    });
}

socket.on('import_success', (data) => {
    alert(`🎉 Berhasil mengimpor ${data.count} soal ke dalam subjek "${data.subject}"! Subjek ini kini tersedia di pilihan Host.`);
    toggleBankModal(false);
});

socket.on('custom_subjects_updated', (data) => {
    updateCustomSubjectsDropdown(data.availableCustomSubjects);
});

/* =========================================================
   HOST / MONITOR VIEW LOGIC
========================================================= */

function saveTeamNames() {
    const t1 = document.getElementById('input-edit-t1').value.trim();
    const t2 = document.getElementById('input-edit-t2').value.trim();
    if (!t1 || !t2) {
        alert('Nama kedua tim tidak boleh kosong!');
        return;
    }
    socket.emit('host_update_team_names', {
        team1Name: t1,
        team2Name: t2
    });
}

function hostStartMatch() {
    const btn = document.getElementById('btn-host-start');
    if (btn) btn.disabled = true;
    socket.emit('host_init_start');
}

function hostResetMatch() {
    returnToMainMenu();
}

function kickPlayer(playerId, playerName) {
    if (confirm(`Apakah Anda yakin ingin mengeluarkan "${playerName}" dari permainan?`)) {
        socket.emit('host_kick_player', playerId);
    }
}

// Modal Kelola Pemain & Kick oleh Host dari Monitor
function togglePlayerManageModal(show, highlightTeam = null) {
    const modal = document.getElementById('player-manage-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        renderPlayerManageRoster();
    } else {
        modal.classList.add('hidden');
    }
}

function renderPlayerManageRoster() {
    if (!lastMonitorState) return;
    const t1Name = (lastMonitorState.teamNames && lastMonitorState.teamNames[1]) || 'TIM MERAH';
    const t2Name = (lastMonitorState.teamNames && lastMonitorState.teamNames[2]) || 'TIM BIRU';
    const t1Players = lastMonitorState.team1Players || [];
    const t2Players = lastMonitorState.team2Players || [];

    const t1NameEl = document.getElementById('manage-t1-name');
    const t2NameEl = document.getElementById('manage-t2-name');
    const t1CountEl = document.getElementById('manage-t1-count');
    const t2CountEl = document.getElementById('manage-t2-count');
    const t1ListEl = document.getElementById('manage-t1-list');
    const t2ListEl = document.getElementById('manage-t2-list');

    if (t1NameEl) t1NameEl.innerText = t1Name;
    if (t2NameEl) t2NameEl.innerText = t2Name;
    if (t1CountEl) t1CountEl.innerText = t1Players.length;
    if (t2CountEl) t2CountEl.innerText = t2Players.length;

    if (t1ListEl) {
        if (t1Players.length === 0) {
            t1ListEl.innerHTML = '<div class="manage-no-player">(Belum ada pemain bergabung di tim ini)</div>';
        } else {
            t1ListEl.innerHTML = t1Players.map((p, idx) => `
                <div class="manage-player-row">
                    <div class="manage-player-info">
                        <span class="manage-num">${idx + 1}.</span>
                        <span class="manage-name">${p.name}</span>
                    </div>
                    <button class="btn-kick-badge" onclick="kickPlayer('${p.id}', '${p.name}')" title="Keluarkan ${p.name}">
                        🚫 Keluarkan (Kick)
                    </button>
                </div>
            `).join('');
        }
    }

    if (t2ListEl) {
        if (t2Players.length === 0) {
            t2ListEl.innerHTML = '<div class="manage-no-player">(Belum ada pemain bergabung di tim ini)</div>';
        } else {
            t2ListEl.innerHTML = t2Players.map((p, idx) => `
                <div class="manage-player-row">
                    <div class="manage-player-info">
                        <span class="manage-num">${idx + 1}.</span>
                        <span class="manage-name">${p.name}</span>
                    </div>
                    <button class="btn-kick-badge" onclick="kickPlayer('${p.id}', '${p.name}')" title="Keluarkan ${p.name}">
                        🚫 Keluarkan (Kick)
                    </button>
                </div>
            `).join('');
        }
    }
}

// Render barisan karakter 3D di monitor
function renderTeamRoster(containerId, players, activePlayerName, isGameRunning, teamNum) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (players.length === 0) {
        container.innerHTML = `
            <div style="background: rgba(0,0,0,0.6); padding: 8px 16px; border-radius: 12px; color: #ced6e0; font-size: 0.9rem; font-weight: bold;">
                Menunggu Pemain...
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    players.forEach(p => {
        const isCurrentTurn = isGameRunning && activePlayerName && p.name === activePlayerName;
        const box = document.createElement('div');
        box.className = `player-character-box ${isCurrentTurn ? 'is-active-turn' : ''} ${isGameRunning ? (teamNum === 1 ? 'pulling-left' : 'pulling-right') : ''}`;

        let crownHtml = isCurrentTurn ? `<div class="turn-crown">👑</div>` : '';
        let kickBtnHtml = `<button class="btn-kick-char" onclick="event.stopPropagation(); kickPlayer('${p.id}', '${p.name}')" title="Keluarkan ${p.name} dari Room">✕</button>`;

        box.innerHTML = `
            ${crownHtml}
            <div class="char-3d">
                <div class="char-head"></div>
                <div class="char-body"></div>
                <div class="char-legs"></div>
            </div>
            <div class="char-name-tag">
                <span>${p.name}</span>
                ${kickBtnHtml}
            </div>
        `;
        container.appendChild(box);
    });
}

// Format detik ke MM:SS
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
}

// Format teks soal
function formatQuestionText(text) {
    if (!text) return '';
    const trimmed = text.trim();
    if (trimmed.endsWith('?') || trimmed.endsWith('...')) return trimmed;
    if (trimmed.endsWith('=')) return `${trimmed} ?`;
    return `${trimmed} = ?`;
}

// Render kartu soal di Monitor (Kiri untuk Tim 1, Kanan untuk Tim 2)
function renderMonitorQuestionCard(teamNum, qData) {
    const cardId = teamNum === 1 ? 't1-q-container' : 't2-q-container';
    const textId = teamNum === 1 ? 't1-q-text' : 't2-q-text';
    const chartId = teamNum === 1 ? 't1-q-chart' : 't2-q-chart';
    const optId = teamNum === 1 ? 't1-q-options' : 't2-q-options';

    const card = document.getElementById(cardId);
    const textEl = document.getElementById(textId);
    const chartEl = document.getElementById(chartId);
    const optEl = document.getElementById(optId);

    if (!card || !qData) {
        if (card) card.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');
    textEl.innerText = formatQuestionText(qData.text);

    if (qData.chartSvg) {
        chartEl.innerHTML = qData.chartSvg;
        chartEl.classList.remove('hidden');
    } else {
        chartEl.innerHTML = '';
        chartEl.classList.add('hidden');
    }

    if (optEl) {
        if (qData.type === 'choice' && qData.options && qData.options.length > 0) {
            const optionLetters = ['A', 'B', 'C', 'D'];
            optEl.innerHTML = qData.options.map((opt, idx) => `
                <div class="q-mon-opt">
                    <span class="q-mon-pill">${optionLetters[idx] || (idx + 1)}</span>
                    <span>${opt}</span>
                </div>
            `).join('');
            optEl.classList.remove('hidden');
        } else {
            optEl.innerHTML = '';
            optEl.classList.add('hidden');
        }
    }
}

/* =========================================================
   PLAYER MOBILE JOIN & GAMEPLAY LOGIC
========================================================= */

function submitCheckPIN() {
    const pin = document.getElementById('input-pin').value.trim();
    if (!pin || pin.length < 6) {
        alert('Masukkan 6 digit Kode Game (PIN) dengan benar!');
        return;
    }
    socket.emit('check_pin', pin);
}

socket.on('check_pin_result', (data) => {
    if (!data.success) {
        alert(data.msg);
        return;
    }

    currentPIN = data.pin;
    document.getElementById('display-pin-verified').innerText = data.pin;
    document.getElementById('display-room-subject').innerText = `📚 Subjek: ${data.subjectTitle || 'Matematika'}`;

    document.getElementById('team-1-btn-label').innerText = `🛡️ ${data.teamNames[1]}`;
    document.getElementById('team-2-btn-label').innerText = `⚔️ ${data.teamNames[2]}`;

    document.getElementById('team-1-count-badge').innerText = `${data.team1Count}/${data.maxPerTeam}`;
    document.getElementById('team-2-count-badge').innerText = `${data.team2Count}/${data.maxPerTeam}`;

    document.getElementById('btn-select-team-1').disabled = data.team1Count >= data.maxPerTeam;
    document.getElementById('btn-select-team-2').disabled = data.team2Count >= data.maxPerTeam;

    document.getElementById('join-step-pin').classList.add('hidden');
    document.getElementById('join-step-team').classList.remove('hidden');
});

function submitJoinGame(teamNum) {
    const nameInput = document.getElementById('input-player-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert('Ketik nama kamu terlebih dahulu!');
        nameInput.focus();
        return;
    }

    myPlayerName = name;
    myTeamNum = teamNum;

    socket.emit('join_player', {
        pin: currentPIN,
        name: name,
        team: teamNum
    });
}

socket.on('player_joined_success', (data) => {
    document.getElementById('player-join-screen').classList.add('hidden');
    document.getElementById('player-view').classList.remove('hidden');

    document.getElementById('player-my-name').innerText = `Halo, ${data.name}!`;
    document.getElementById('player-my-team').innerText = data.teamName;

    const hud = document.getElementById('player-top-hud');
    if (data.team === 1) {
        hud.className = 'player-top-hud team-red-bg';
    } else {
        hud.className = 'player-top-hud team-blue-bg';
    }

    const subInfo = document.getElementById('lobby-subject-info');
    if (subInfo) {
        subInfo.innerText = `📚 Subjek: ${data.subjectTitle || 'Matematika'}`;
    }
});

socket.on('player_left_success', () => {
    resetPlayerToRoleSelect();
});

// Numpad sentuh di HP
function pressNumKey(key) {
    Sound.init();
    if (key === 'DEL') {
        currentAnswerInput = currentAnswerInput.slice(0, -1);
    } else if (key === 'CLR') {
        currentAnswerInput = '';
    } else if (key === '-' || key === '+/-') {
        if (currentAnswerInput.startsWith('-')) {
            currentAnswerInput = currentAnswerInput.substring(1);
        } else {
            currentAnswerInput = '-' + currentAnswerInput;
        }
    } else {
        if (currentAnswerInput.length < 8) {
            currentAnswerInput += key;
        }
    }
    updateAnswerDisplay();
}

function updateAnswerDisplay() {
    const display = document.getElementById('mobile-answer-display');
    if (!display) return;
    if (currentAnswerInput === '' || currentAnswerInput === '-') {
        display.innerHTML = currentAnswerInput === '-' 
            ? `<span style="color:#2f3542">-</span><span class="answer-placeholder">...</span>` 
            : `<span class="answer-placeholder">Ketik jawabanmu...</span>`;
    } else {
        display.innerText = currentAnswerInput;
    }
}

function submitPlayerAnswer() {
    if (!isMyTurnActive) return;
    if (currentAnswerInput === '' || currentAnswerInput === '-') {
        alert('Ketik jawaban terlebih dahulu!');
        return;
    }

    socket.emit('submit_answer', {
        answer: currentAnswerInput
    });
    currentAnswerInput = '';
    updateAnswerDisplay();
}

function submitChoiceAnswer(choiceValue) {
    if (!isMyTurnActive) return;
    Sound.init();
    socket.emit('submit_answer', {
        answer: choiceValue
    });
}

// Input keyboard PC jika dibuka di browser desktop
window.addEventListener('keydown', (e) => {
    if (!isMyTurnActive) return;
    if (currentQuestionData && currentQuestionData.type === 'choice') return;

    if (e.key >= '0' && e.key <= '9') {
        pressNumKey(e.key);
    } else if (e.key === '-' || e.key === '_') {
        pressNumKey('-');
    } else if (e.key === 'Backspace') {
        pressNumKey('DEL');
    } else if (e.key === 'Enter') {
        submitPlayerAnswer();
    }
});

/* =========================================================
   SOCKET.IO EVENT LISTENERS (GLOBAL & SYNC)
========================================================= */

// Update Host Monitor saat bergabung
socket.on('monitor_joined_success', (data) => {
    currentPIN = data.pin;
    document.getElementById('monitor-pin-val').innerText = data.pin;

    if (data.qr) {
        document.getElementById('qr-image').src = data.qr;
        document.getElementById('qr-link-text').innerText = data.joinUrl;
    }

    document.getElementById('input-edit-t1').value = data.teamNames[1];
    document.getElementById('input-edit-t2').value = data.teamNames[2];
    document.getElementById('monitor-t1-name').innerText = data.teamNames[1];
    document.getElementById('monitor-t2-name').innerText = data.teamNames[2];

    if (data.subjectConfig) {
        document.getElementById('monitor-subject-badge').innerText = `📚 ${data.subjectConfig.title}`;
    }

    if (data.availableCustomSubjects) {
        updateCustomSubjectsDropdown(data.availableCustomSubjects);
    }
});

socket.on('update_monitor', (state) => {
    lastMonitorState = state;

    // Jika modal kelola pemain sedang terbuka, perbarui daftarnya
    const pModal = document.getElementById('player-manage-modal');
    if (pModal && !pModal.classList.contains('hidden')) {
        renderPlayerManageRoster();
    }

    document.getElementById('monitor-t1-score').innerText = state.scores[1];
    document.getElementById('monitor-t2-score').innerText = state.scores[2];
    document.getElementById('monitor-t1-name').innerText = state.teamNames[1];
    document.getElementById('monitor-t2-name').innerText = state.teamNames[2];

    // Tampilkan jumlah anggota tim yang sudah join di Layar Monitor
    const t1Count = (state.team1Players && state.team1Players.length) || 0;
    const t2Count = (state.team2Players && state.team2Players.length) || 0;
    const t1Badge = document.getElementById('monitor-t1-count');
    const t2Badge = document.getElementById('monitor-t2-count');
    if (t1Badge) t1Badge.innerText = `👥 ${t1Count} Pemain ⚙️`;
    if (t2Badge) t2Badge.innerText = `👥 ${t2Count} Pemain ⚙️`;

    const t1Header = document.getElementById('t1-q-header-title');
    const t2Header = document.getElementById('t2-q-header-title');
    if (t1Header) t1Header.innerText = `SOAL ${state.teamNames[1]}`;
    if (t2Header) t2Header.innerText = `SOAL ${state.teamNames[2]}`;

    if (state.subjectConfig) {
        document.getElementById('monitor-subject-badge').innerText = `📚 ${state.subjectConfig.title}`;
    }

    // Posisi Tali (scoreDiff: -3 s/d +3)
    // Tim 1 (Merah) di Kiri (0%), Tim 2 (Biru) di Kanan (100%)
    // Jika Tim 1 unggul (scoreDiff positif), bendera ditarik ke KIRI (persentase left mengecil).
    // Jika Tim 2 unggul (scoreDiff negatif), bendera ditarik ke KANAN (persentase left membesar).
    let visualPercent = 50 - (state.scoreDiff * 11.5);
    if (visualPercent < 12) visualPercent = 12;
    if (visualPercent > 88) visualPercent = 88;

    const knot = document.getElementById('rope-knot');
    if (knot) {
        knot.style.left = `${visualPercent}%`;
        // Efek kemiringan bendera saat ditarik
        const flagEl = knot.querySelector('.knot-flag');
        if (flagEl) {
            if (state.scoreDiff > 0) flagEl.style.transform = 'rotate(-15deg)';
            else if (state.scoreDiff < 0) flagEl.style.transform = 'rotate(15deg)';
            else flagEl.style.transform = 'rotate(0deg)';
        }
    }

    // Render Karakter Tim 1 & Tim 2
    renderTeamRoster('team-1-roster', state.team1Players, state.activeP1, state.isGameRunning, 1);
    renderTeamRoster('team-2-roster', state.team2Players, state.activeP2, state.isGameRunning, 2);

    // Kontrol Tombol Start Host
    const startBtn = document.getElementById('btn-host-start');
    const quitBtn = document.getElementById('btn-host-quit');
    const namePanel = document.getElementById('host-team-name-panel');

    if (state.isGameRunning || state.isCountingDown) {
        if (startBtn) startBtn.classList.add('hidden');
        if (quitBtn) quitBtn.classList.remove('hidden');
        if (namePanel) namePanel.classList.add('hidden');
        document.getElementById('monitor-timer').classList.remove('hidden');
    } else {
        if (quitBtn) quitBtn.classList.add('hidden');
        if (namePanel) namePanel.classList.remove('hidden');
        if (startBtn) {
            startBtn.classList.remove('hidden');
            if (state.canStart) {
                startBtn.disabled = false;
                startBtn.classList.add('ready');
                startBtn.innerText = 'MULAI PERTANDINGAN 🚀';
            } else {
                startBtn.disabled = true;
                startBtn.classList.remove('ready');
                startBtn.innerText = 'MENUNGGU PEMAIN (MIN 1 PER TIM)';
            }
        }
    }
});

// Update Kartu Pertanyaan di Monitor
socket.on('update_question_bubbles', (data) => {
    renderMonitorQuestionCard(1, data.p1);
    renderMonitorQuestionCard(2, data.p2);
});

socket.on('update_single_bubble', (data) => {
    renderMonitorQuestionCard(data.team, data.question);
});

// Pop-up Feedback di Monitor saat ada tim menjawab
socket.on('monitor_feedback_popup', (data) => {
    const elId = data.team === 1 ? 't1-feedback-bubble' : 't2-feedback-bubble';
    const el = document.getElementById(elId);
    if (!el) return;

    if (data.isCorrect) {
        el.innerHTML = `✅ <span style="color:#2ecc71">${data.answerVal}</span>`;
        el.style.border = "3px solid #2ecc71";
        Sound.playCorrect();
    } else {
        el.innerHTML = `❌ <span style="color:#e74c3c">${data.answerVal}</span>`;
        el.style.border = "3px solid #e74c3c";
        Sound.playWrong();
    }

    el.classList.remove('hidden');
    el.classList.remove('feedback-bubble-popup');
    void el.offsetWidth;
    el.classList.add('feedback-bubble-popup');
});

socket.on('monitor_player_joined', () => {
    Sound.playJoin();
});

// PERBAIKAN: Timer Permainan berjalan serempak di Monitor & Smartphone Pemain!
socket.on('timer_tick', (data) => {
    const timeFormatted = formatTime(data.remainingTime);
    const mTimer = document.getElementById('monitor-timer');
    const pTimer = document.getElementById('player-timer');

    if (mTimer) {
        mTimer.innerText = timeFormatted;
        if (data.remainingTime <= 30) mTimer.classList.add('warning');
        else mTimer.classList.remove('warning');
    }
    if (pTimer) {
        pTimer.innerText = timeFormatted;
    }
});

// Countdown bersama (5 detik sebelum mulai)
socket.on('start_countdown', (seconds) => {
    Sound.stopBGM();
    const modal = document.getElementById('countdown-modal');
    const numEl = document.getElementById('countdown-num');

    modal.classList.remove('hidden');
    let remaining = seconds;
    numEl.innerText = remaining;
    Sound.playCountdown(false);

    const countInterval = setInterval(() => {
        remaining--;
        if (remaining > 0) {
            numEl.innerText = remaining;
            Sound.playCountdown(false);
        } else {
            clearInterval(countInterval);
            numEl.innerText = 'GO!';
            Sound.playCountdown(true);
            Sound.playWhistle();
            setTimeout(() => {
                modal.classList.add('hidden');
                Sound.switchBGM('match');
            }, 600);
        }
    }, 1000);
});

// Sinkronisasi status giliran & soal untuk Pemain
socket.on('player_game_state', (state) => {
    const stateMyTurn = document.getElementById('state-my-turn');
    const stateWaiting = document.getElementById('state-waiting-turn');
    const stateLobby = document.getElementById('state-lobby-waiting');

    if (!state.isGameRunning) {
        stateLobby.classList.remove('hidden');
        stateMyTurn.classList.add('hidden');
        stateWaiting.classList.add('hidden');

        const lobbyList = document.getElementById('lobby-teammate-list');
        if (lobbyList) {
            lobbyList.innerHTML = state.turnOrder.map((p, idx) => `
                <li class="queue-item ${p.isMe ? 'me' : ''}">
                    <span>${idx + 1}. ${p.name} ${p.isMe ? '(Kamu)' : ''}</span>
                    <span>Siap</span>
                </li>
            `).join('');
        }
        return;
    }

    stateLobby.classList.add('hidden');
    isMyTurnActive = state.isMyTurn;

    if (state.isMyTurn) {
        stateMyTurn.classList.remove('hidden');
        stateWaiting.classList.add('hidden');

        currentAnswerInput = '';
        updateAnswerDisplay();

        if (state.question) {
            currentQuestionData = state.question;
            document.getElementById('mobile-question-formula').innerText = formatQuestionText(state.question.text);

            // Tampilkan grafik statistik jika ada
            const chartContainer = document.getElementById('mobile-question-chart');
            if (state.question.chartSvg) {
                chartContainer.innerHTML = state.question.chartSvg;
                chartContainer.classList.remove('hidden');
            } else {
                chartContainer.innerHTML = '';
                chartContainer.classList.add('hidden');
            }

            // Tentukan apakah tipe Pilihan Ganda atau Numerik
            const numpadPanel = document.getElementById('input-type-numeric');
            const choicePanel = document.getElementById('input-type-choice');
            const choiceContainer = document.getElementById('choice-buttons-container');

            if (state.question.type === 'choice' && state.question.options && state.question.options.length > 0) {
                numpadPanel.classList.add('hidden');
                choicePanel.classList.remove('hidden');

                const optionLetters = ['A', 'B', 'C', 'D'];
                choiceContainer.innerHTML = state.question.options.map((optText, i) => `
                    <button class="choice-btn" onclick="submitChoiceAnswer('${optText.replace(/'/g, "\\'")}')">
                        <span class="choice-pill">${optionLetters[i] || (i + 1)}</span>
                        <span>${optText}</span>
                    </button>
                `).join('');
            } else {
                numpadPanel.classList.remove('hidden');
                choicePanel.classList.add('hidden');
            }
        }
    } else {
        stateMyTurn.classList.add('hidden');
        stateWaiting.classList.remove('hidden');

        document.getElementById('active-teammate-display').innerText = state.activePlayerName;

        const queueList = document.getElementById('team-queue-list');
        if (queueList) {
            queueList.innerHTML = state.turnOrder.map((p, idx) => `
                <li class="queue-item ${p.isCurrent ? 'active' : ''} ${p.isMe ? 'me' : ''}">
                    <span>${idx + 1}. ${p.name} ${p.isMe ? '(Kamu)' : ''}</span>
                    <span>${p.isCurrent ? 'Sedang Menjawab ✍️' : 'Menunggu'}</span>
                </li>
            `).join('');
        }
    }
});

// Feedback Benar / Salah di Layar Pemain
socket.on('player_feedback', (data) => {
    const overlay = document.getElementById('player-feedback-overlay');
    const icon = document.getElementById('fb-icon');
    const title = document.getElementById('fb-title');
    const desc = document.getElementById('fb-desc');

    if (data.isCorrect) {
        overlay.style.background = 'rgba(46, 213, 115, 0.92)';
        icon.innerText = '😎';
        title.innerText = 'BENAR!';
        title.style.color = '#27ae60';
        desc.innerText = 'Tarik terus untuk timmu!';
        Sound.playCorrect();
        if (navigator.vibrate) navigator.vibrate(120);
    } else {
        overlay.style.background = 'rgba(235, 77, 75, 0.92)';
        icon.innerText = '😅';
        title.innerText = 'SALAH!';
        title.style.color = '#c0392b';
        desc.innerText = `Jawaban yang benar: ${data.correctAnswer}`;
        Sound.playWrong();
        if (navigator.vibrate) navigator.vibrate([100, 80, 100]);
    }

    overlay.classList.remove('hidden');
    setTimeout(() => {
        overlay.classList.add('hidden');
    }, 1200);
});

// Game Over (Pemenang Selisih 3 Poin atau Waktu Habis)
socket.on('game_over', (data) => {
    Sound.stopBGM();
    Sound.playWin();

    const modal = document.getElementById('winner-modal');
    const monitorDetails = document.getElementById('winner-monitor-details');
    const returnBtn = document.getElementById('btn-winner-return-lobby');
    const winnerNameEl = document.getElementById('winner-team-name');
    const finalScoreEl = document.getElementById('winner-final-score');
    const reasonEl = document.getElementById('winner-reason');
    const membersList = document.getElementById('winner-members-list');
    const membersPanel = document.getElementById('winner-members-panel');

    const isPlayer = (currentRole === 'player') || (window.innerWidth <= 768 && currentRole !== 'monitor');

    if (modal) {
        modal.classList.remove('hidden');
        if (isPlayer) {
            modal.classList.add('player-winner-view');
        } else {
            modal.classList.remove('player-winner-view');
        }
    }

    // Ambil daftar nama anggota tim pemenang secara aman (mendukung array string maupun array object)
    let rawMembers = [];
    if (Array.isArray(data.winnerMembers) && data.winnerMembers.length > 0) {
        rawMembers = data.winnerMembers;
    } else if (data.winnerTeam === 1 && Array.isArray(data.team1Players) && data.team1Players.length > 0) {
        rawMembers = data.team1Players;
    } else if (data.winnerTeam === 2 && Array.isArray(data.team2Players) && data.team2Players.length > 0) {
        rawMembers = data.team2Players;
    }

    const memberNames = rawMembers.map(m => {
        if (!m) return '';
        if (typeof m === 'object') {
            return (m.name || m.playerName || '').trim();
        }
        return String(m).trim();
    }).filter(n => n && n !== 'undefined' && n !== 'null' && n !== '[object Object]');

    if (data.isDraw) {
        if (winnerNameEl) {
            winnerNameEl.innerText = 'HASIL SERI!';
            winnerNameEl.className = 'winner-team-display draw';
        }
        if (reasonEl) reasonEl.innerText = 'Kedua tim memiliki skor yang seimbang!';
        if (membersPanel) membersPanel.classList.add('hidden');
    } else {
        if (winnerNameEl) {
            winnerNameEl.innerText = data.winnerName || (data.winnerTeam === 1 ? 'TIM MERAH' : 'TIM BIRU');
            winnerNameEl.className = `winner-team-display ${data.winnerTeam === 1 ? 'team-1-won' : 'team-2-won'}`;
        }

        if (reasonEl) {
            if (data.reason === 'score_diff') {
                reasonEl.innerText = '⚡ Menang telak selisih 3 poin!';
            } else {
                reasonEl.innerText = '⏱️ Menang setelah waktu pertandingan berakhir!';
            }
        }

        if (membersPanel && membersList) {
            membersPanel.classList.remove('hidden');
            if (memberNames.length > 0) {
                membersList.innerHTML = memberNames.map(name => `
                    <span class="winner-member-chip ${data.winnerTeam === 1 ? 'team-1-chip' : 'team-2-chip'}">
                        👑 ${escapeHtml(name)}
                    </span>
                `).join('');
            } else {
                const teamTitle = data.winnerTeam === 1 ? (data.teamNames ? data.teamNames[1] : 'Tim Merah') : (data.teamNames ? data.teamNames[2] : 'Tim Biru');
                membersList.innerHTML = `<span class="winner-member-chip ${data.winnerTeam === 1 ? 'team-1-chip' : 'team-2-chip'}">🏆 Seluruh Skuad ${escapeHtml(teamTitle)}</span>`;
            }
        }
    }

    if (finalScoreEl) {
        finalScoreEl.innerText = `Skor Akhir: ${data.finalScores ? `${data.finalScores[1]} - ${data.finalScores[2]}` : ''}`;
    }

    // Di HP: detail skor dan alasan disembunyikan (Hanya tim dan nama pemenang yang tampil)
    // Di Monitor: detail skor dan alasan tetap tampil
    if (monitorDetails) {
        if (isPlayer) {
            monitorDetails.style.display = 'none';
        } else {
            monitorDetails.style.display = 'block';
        }
    }

    // Tombol kembali ke Lobi Utama selalu tampil di KEDUA layar (HP & Monitor)
    if (returnBtn) {
        returnBtn.style.display = 'inline-block';
        returnBtn.innerText = '🏠 Kembali ke Lobi Utama';
    }

    // Pastikan tidak ada countdown timer yang berjalan
    if (window.winnerCountdownInterval) {
        clearInterval(window.winnerCountdownInterval);
        window.winnerCountdownInterval = null;
    }
});

// Helper Escape HTML untuk sanitasi nama pemain
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Event saat Host membubarkan room / menekan Kembali ke Menu Utama:
// Seluruh peserta (Monitor & HP) kembali ke Screen 1 (Gambar 2)
socket.on('all_return_to_main_menu', () => {
    goToScreen1();
});

socket.on('force_reload_page', () => {
    goToScreen1();
});

socket.on('reset_to_lobby', () => {
    goToScreen1();
});

socket.on('reset_game_monitor', () => {
    goToScreen1();
});

socket.on('error_msg', (msg) => {
    alert(msg);
});

socket.on('you_are_kicked', () => {
    alert('Anda telah dikeluarkan dari permainan oleh Host.');
    goToScreen1();
});
