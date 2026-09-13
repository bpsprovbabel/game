const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Serve folder public dengan anti-cache headers agar browser HP selalu memuat update terbaru
app.use(express.static(path.join(__dirname, 'public'), {
    etag: false,
    maxAge: 0,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
app.use(express.json({ limit: '10mb' }));

// Helper untuk deteksi IP Lokal (untuk koneksi smartphone via Wi-Fi)
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return 'localhost';
}

// Endpoint info jaringan
app.get('/api/network-info', (req, res) => {
    const localIp = getLocalIP();
    res.json({
        ip: localIp,
        port: PORT,
        url: `http://${localIp}:${PORT}`
    });
});

// Endpoint untuk generate QR Code
app.get('/api/qr', async (req, res) => {
    try {
        const text = req.query.text || `http://${getLocalIP()}:${PORT}`;
        const qrImage = await QRCode.toDataURL(text, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        res.json({ qr: qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Gagal membuat QR Code' });
    }
});

/* =========================================================
   BANK SOAL & SISTEM GENERATOR TARIK TAMBANG OTAK
========================================================= */

const CUSTOM_BANK_FILE = path.join(__dirname, 'questions', 'custom_bank.json');

// Memuat bank soal kustom dari file jika ada
function loadCustomBank() {
    try {
        if (fs.existsSync(CUSTOM_BANK_FILE)) {
            const data = fs.readFileSync(CUSTOM_BANK_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) {
        console.error('Error loading custom_bank.json:', err);
    }
    return {};
}

// Menyimpan bank soal kustom ke file
function saveCustomBank(bank) {
    try {
        const dir = path.dirname(CUSTOM_BANK_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CUSTOM_BANK_FILE, JSON.stringify(bank, null, 2), 'utf8');
    } catch (err) {
        console.error('Error saving custom_bank.json:', err);
    }
}

let customBank = loadCustomBank();

// Helper generate SVG diagram batang sederhana untuk soal statistik
function generateBarChartSvg(labels, values, title) {
    const maxVal = Math.max(...values, 10);
    const chartHeight = 90;
    const chartWidth = 260;
    const barWidth = 32;
    const gap = 20;
    const startX = 35;
    const bottomY = 75;

    let barsSvg = '';
    labels.forEach((lbl, idx) => {
        const x = startX + idx * (barWidth + gap);
        const val = values[idx];
        const h = Math.round((val / maxVal) * 55);
        const y = bottomY - h;
        barsSvg += `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="4" fill="#3498db" stroke="#2980b9" stroke-width="2"/>
            <text x="${x + barWidth / 2}" y="${y - 4}" text-anchor="middle" font-size="11" font-weight="bold" fill="#2c3e50">${val}</text>
            <text x="${x + barWidth / 2}" y="${bottomY + 14}" text-anchor="middle" font-size="11" font-weight="bold" fill="#555">${lbl}</text>
        `;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${chartWidth} ${chartHeight}" class="stat-chart-svg">
        <rect width="100%" height="100%" fill="#f8fafc" rx="8" />
        <line x1="25" y1="${bottomY}" x2="${chartWidth - 15}" y2="${bottomY}" stroke="#94a3b8" stroke-width="2"/>
        ${barsSvg}
    </svg>`;
}

// Helper fungsi FPB (Greatest Common Divisor) dan KPK (Least Common Multiple)
function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

function lcm(a, b) {
    if (a === 0 || b === 0) return 0;
    return Math.abs(a * b) / gcd(a, b);
}

// Fisher-Yates shuffle array helper
function shuffleArray(array) {
    if (!array || !Array.isArray(array)) return array;
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Nama-nama acak untuk variasi soal cerita
const STUDENT_NAMES = ["Budi", "Siti", "Andi", "Rina", "Doni", "Rani", "Eko", "Dewi", "Fajar", "Maya", "Rizky", "Putri", "Bayu", "Tiara", "Agus", "Wati"];
const FRUIT_ITEMS = ["apel", "jeruk", "mangga", "pisang", "salak", "kelengkeng", "rambutan", "strawberry"];
const SCHOOL_ITEMS = ["buku tulis", "pensil", "penghapus", "penggaris", "pulpen", "buku gambar"];

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// 1. GENERATOR MATEMATIKA SD (Kelas 1 - 6) - Ribuan Kombinasi Algoritmik
function generateMathSD(grade = 1) {
    grade = parseInt(grade) || 1;
    let text = "";
    let answer = 0;

    if (grade === 1) {
        // SD Kelas 1: Penjumlahan, Pengurangan 1-20, Pola Bilangan, & Soal Cerita Dasar
        const subType = Math.floor(Math.random() * 5);
        if (subType === 0) {
            const a = Math.floor(Math.random() * 10) + 1;
            const b = Math.floor(Math.random() * 10) + 1;
            text = `${a} + ${b}`;
            answer = a + b;
        } else if (subType === 1) {
            const b = Math.floor(Math.random() * 9) + 1;
            const diff = Math.floor(Math.random() * 10) + 1;
            const a = b + diff;
            text = `${a} - ${b}`;
            answer = diff;
        } else if (subType === 2) {
            // Nilai yang hilang
            const a = Math.floor(Math.random() * 8) + 1;
            const ans = Math.floor(Math.random() * 8) + 1;
            const total = a + ans;
            text = `${a} + ... = ${total}`;
            answer = ans;
        } else if (subType === 3) {
            // Pola urutan bilangan
            const step = Math.random() > 0.5 ? 2 : 1;
            const start = Math.floor(Math.random() * 6) + 1;
            const seq = [start, start + step, start + 2 * step];
            text = `Lanjutan pola bilangan: ${seq.join(', ')}, ...`;
            answer = start + 3 * step;
        } else {
            const name = pickRandom(STUDENT_NAMES);
            const item = pickRandom(FRUIT_ITEMS);
            const a = Math.floor(Math.random() * 6) + 3;
            const b = Math.floor(Math.random() * 5) + 2;
            text = `${name} punya ${a} ${item}, diberi lagi ${b} ${item}. Total ${item}`;
            answer = a + b;
        }
    } else if (grade === 2) {
        // SD Kelas 2: Penjumlahan & Pengurangan 10-100, Perkalian dasar 2, 3, 4, 5, 10
        const subType = Math.floor(Math.random() * 5);
        if (subType === 0) {
            const a = Math.floor(Math.random() * 45) + 10;
            const b = Math.floor(Math.random() * 45) + 10;
            text = `${a} + ${b}`;
            answer = a + b;
        } else if (subType === 1) {
            const b = Math.floor(Math.random() * 35) + 10;
            const diff = Math.floor(Math.random() * 40) + 10;
            const a = b + diff;
            text = `${a} - ${b}`;
            answer = diff;
        } else if (subType === 2) {
            const factors = [2, 3, 4, 5, 10];
            const f1 = pickRandom(factors);
            const f2 = Math.floor(Math.random() * 9) + 2;
            text = `${f1} × ${f2}`;
            answer = f1 * f2;
        } else if (subType === 3) {
            // Pembagian dasar
            const div = pickRandom([2, 3, 4, 5]);
            const ans = Math.floor(Math.random() * 8) + 2;
            const num = div * ans;
            text = `${num} ÷ ${div}`;
            answer = ans;
        } else {
            const name = pickRandom(STUDENT_NAMES);
            const item = pickRandom(SCHOOL_ITEMS);
            const pack = pickRandom([2, 3, 4, 5]);
            const perPack = Math.floor(Math.random() * 5) + 2;
            text = `${name} membeli ${pack} kotak ${item}, tiap kotak isi ${perPack}. Banyak ${item}`;
            answer = pack * perPack;
        }
    } else if (grade === 3) {
        // SD Kelas 3: Perkalian tabel 1-100, Pembagian tanpa sisa, Operasi campuran, Konversi waktu
        const subType = Math.floor(Math.random() * 5);
        if (subType === 0) {
            const a = Math.floor(Math.random() * 8) + 4;
            const b = Math.floor(Math.random() * 8) + 4;
            text = `${a} × ${b}`;
            answer = a * b;
        } else if (subType === 1) {
            const b = Math.floor(Math.random() * 8) + 3;
            const ans = Math.floor(Math.random() * 12) + 2;
            const a = b * ans;
            text = `${a} ÷ ${b}`;
            answer = ans;
        } else if (subType === 2) {
            const a = Math.floor(Math.random() * 30) + 15;
            const b = Math.floor(Math.random() * 6) + 2;
            const c = Math.floor(Math.random() * 5) + 2;
            text = `${a} + ${b} × ${c}`;
            answer = a + (b * c);
        } else if (subType === 3) {
            const jam = Math.floor(Math.random() * 4) + 2;
            text = `${jam} jam = ... menit`;
            answer = jam * 60;
        } else {
            const a = Math.floor(Math.random() * 8) + 3;
            const b = Math.floor(Math.random() * 6) + 2;
            const c = Math.floor(Math.random() * 10) + 5;
            text = `${a} × ${b} - ${c}`;
            answer = a * b - c;
        }
    } else if (grade === 4) {
        // SD Kelas 4: FPB & KPK dinamis, Keliling & Luas persegi/panjang, Operasi ribuan
        const subType = Math.floor(Math.random() * 5);
        if (subType === 0) {
            // FPB dinamis
            const baseGcd = pickRandom([2, 3, 4, 5, 6]);
            const m1 = pickRandom([2, 3, 4, 5]);
            const m2 = m1 === 2 ? 3 : (m1 === 3 ? 4 : 5);
            const a = baseGcd * m1;
            const b = baseGcd * m2;
            text = `FPB dari ${a} dan ${b}`;
            answer = gcd(a, b);
        } else if (subType === 1) {
            // KPK dinamis
            const a = pickRandom([4, 6, 8, 9, 10, 12]);
            const b = pickRandom([3, 5, 6, 8, 15]);
            text = `KPK dari ${a} dan ${b}`;
            answer = lcm(a, b);
        } else if (subType === 2) {
            const s = Math.floor(Math.random() * 15) + 5;
            text = `Keliling persegi dengan sisi ${s} cm`;
            answer = 4 * s;
        } else if (subType === 3) {
            const p = Math.floor(Math.random() * 15) + 6;
            const l = Math.floor(Math.random() * 6) + 3;
            text = `Luas persegi panjang (${p} cm × ${l} cm)`;
            answer = p * l;
        } else {
            const a = Math.floor(Math.random() * 3000) + 2000;
            const b = Math.floor(Math.random() * 2000) + 500;
            text = `${a} - ${b}`;
            answer = a - b;
        }
    } else if (grade === 5) {
        // SD Kelas 5: Persentase, Volume Kubus & Balok, Luas Segitiga, Kecepatan
        const subType = Math.floor(Math.random() * 5);
        if (subType === 0) {
            const p = pickRandom([10, 20, 25, 50, 75]);
            const base = (Math.floor(Math.random() * 8) + 2) * (100 / (p === 75 ? 25 : p)) * 5;
            text = `${p}% dari ${base}`;
            answer = Math.round((p * base) / 100);
        } else if (subType === 1) {
            const s = Math.floor(Math.random() * 6) + 2;
            text = `Volume kubus rusuk ${s} cm`;
            answer = s * s * s;
        } else if (subType === 2) {
            const a = (Math.floor(Math.random() * 8) + 3) * 2; // genap
            const t = Math.floor(Math.random() * 8) + 3;
            text = `Luas segitiga (alas ${a} cm, tinggi ${t} cm)`;
            answer = Math.round((a * t) / 2);
        } else if (subType === 3) {
            const p = Math.floor(Math.random() * 5) + 4;
            const l = Math.floor(Math.random() * 4) + 2;
            const t = Math.floor(Math.random() * 3) + 2;
            text = `Volume balok (${p} × ${l} × ${t} cm)`;
            answer = p * l * t;
        } else {
            const v = pickRandom([30, 40, 50, 60]);
            const t = Math.floor(Math.random() * 3) + 2;
            text = `Kecepatan ${v} km/jam selama ${t} jam. Jarak (... km)`;
            answer = v * t;
        }
    } else {
        // SD Kelas 6: Statistika Rata-rata Dasar, Skala, Bilangan Negatif, Lingkaran
        const subType = Math.floor(Math.random() * 5);
        if (subType === 0) {
            const mid = Math.floor(Math.random() * 15) + 10;
            const d1 = Math.floor(Math.random() * 4) + 1;
            const d2 = Math.floor(Math.random() * 4) + 1;
            const set = [mid - d1, mid, mid + d2, mid + d1 - d2];
            const sum = set.reduce((acc, v) => acc + v, 0);
            text = `Rata-rata dari: ${set.join(', ')}`;
            answer = Math.round(sum / set.length);
        } else if (subType === 1) {
            const scaleFactor = pickRandom([2, 5, 10, 20]);
            const cm = Math.floor(Math.random() * 5) + 2;
            text = `Skala 1:${scaleFactor}00, jarak peta ${cm} cm. Jarak asli (... meter)`;
            answer = cm * scaleFactor;
        } else if (subType === 2) {
            const a = Math.floor(Math.random() * 25) + 10;
            const b = Math.floor(Math.random() * 20) + 5;
            text = `(-${a}) + ${b}`;
            answer = -a + b;
        } else if (subType === 3) {
            const r = pickRandom([7, 14, 21]);
            text = `Keliling lingkaran dengan jari-jari ${r} cm (π = 22/7)`;
            answer = Math.round(2 * (22 / 7) * r);
        } else {
            const pct = pickRandom([10, 15, 20, 25, 50]);
            const harga = pickRandom([20000, 40000, 50000, 80000, 100000]);
            text = `Diskon ${pct}% dari Rp${harga.toLocaleString('id-ID')}. Potongan harga (ribu Rp)`;
            answer = Math.round((pct * harga) / 100000);
        }
    }

    return {
        id: 'sd_' + Date.now() + Math.random().toString(36).substring(2, 6),
        type: 'numeric',
        text: text,
        answer: answer
    };
}

// 2. GENERATOR MATEMATIKA SMP (Kelas 7 - 9) Termasuk STATISTIKA & GRAFIK
function generateMathSMP(grade = 8) {
    grade = parseInt(grade) || 8;
    const isStat = Math.random() > 0.45; // 55% peluang statistika
    let text = "";
    let answer = 0;
    let chartSvg = null;

    if (isStat) {
        const statType = Math.floor(Math.random() * 5);
        if (statType === 0) {
            // Diagram Batang SVG Dinamis dengan beragam tema
            const topics = [
                { title: "Nilai Ulangan Matematika", labels: ["Nilai 6", "Nilai 7", "Nilai 8", "Nilai 9"], base: [6, 7, 8, 9] },
                { title: "Buku Terjual (Minggu)", labels: ["Sen", "Sel", "Rab", "Kam"], base: ["Sen", "Sel", "Rab", "Kam"] },
                { title: "Peminjam Perpustakaan", labels: ["Kelas 7", "Kelas 8", "Kelas 9", "Guru"], base: [7, 8, 9, 10] },
                { title: "Hasil Panen Buah (Kuintal)", labels: ["Apel", "Jeruk", "Mangga", "Salak"], base: ["Apel", "Jeruk", "Mangga", "Salak"] }
            ];
            const topic = pickRandom(topics);
            const freqs = [
                Math.floor(Math.random() * 8) + 5,
                Math.floor(Math.random() * 8) + 5,
                Math.floor(Math.random() * 8) + 5,
                Math.floor(Math.random() * 8) + 5
            ];
            const maxIdx = Math.floor(Math.random() * 4);
            freqs[maxIdx] = Math.max(...freqs) + Math.floor(Math.random() * 4) + 4; // Pastikan modus unik tertinggi

            chartSvg = generateBarChartSvg(topic.labels, freqs, topic.title);
            const askMode = Math.random() > 0.4;
            if (askMode) {
                text = `Tentukan data frekuensi tertinggi (MODUS) dari grafik [${topic.labels[maxIdx]}]? (Jawab angka frekuensi: ${freqs[maxIdx]})`;
                answer = freqs[maxIdx];
            } else {
                const targetIdx = (maxIdx + 1) % 4;
                text = `Berapa frekuensi data "${topic.labels[targetIdx]}" pada grafik batang tersebut?`;
                answer = freqs[targetIdx];
            }
        } else if (statType === 1) {
            // Nilai Tengah (Median)
            const isOdd = Math.random() > 0.5;
            if (isOdd) {
                const base = Math.floor(Math.random() * 25) + 12;
                const d1 = Math.floor(Math.random() * 3) + 1;
                const d2 = Math.floor(Math.random() * 3) + 4;
                const d3 = Math.floor(Math.random() * 3) + 1;
                const d4 = Math.floor(Math.random() * 3) + 4;
                const sorted = [base - d2, base - d1, base, base + d3, base + d4];
                const shuffled = shuffleArray(sorted);
                text = `Nilai tengah (Median) dari data: ${shuffled.join(', ')}`;
                answer = base;
            } else {
                const m1 = (Math.floor(Math.random() * 10) + 6) * 2;
                const m2 = m1 + 2;
                const sorted = [m1 - 4, m1, m2, m2 + 4];
                const shuffled = shuffleArray(sorted);
                text = `Nilai tengah (Median) dari data: ${shuffled.join(', ')}`;
                answer = (m1 + m2) / 2;
            }
        } else if (statType === 2) {
            // Modus data tunggal
            const modusVal = Math.floor(Math.random() * 9) + 5;
            const others = [modusVal + 1, modusVal - 1, modusVal + 2];
            const dataList = [modusVal, others[0], modusVal, others[1], modusVal, others[2]];
            const shuffled = shuffleArray(dataList);
            text = `Modus dari kumpulan data: ${shuffled.join(', ')}`;
            answer = modusVal;
        } else if (statType === 3) {
            // Rata-rata (Mean) bilangan bulat
            const targetMean = Math.floor(Math.random() * 15) + 10;
            const diff1 = Math.floor(Math.random() * 4) + 1;
            const diff2 = Math.floor(Math.random() * 4) + 1;
            const dataset = [targetMean - diff1, targetMean + diff1, targetMean - diff2, targetMean + diff2];
            const shuffled = shuffleArray(dataset);
            text = `Rata-rata (Mean) dari data: ${shuffled.join(', ')}`;
            answer = targetMean;
        } else {
            // Jangkauan (Range = Maks - Min)
            const min = Math.floor(Math.random() * 15) + 5;
            const range = Math.floor(Math.random() * 20) + 10;
            const max = min + range;
            const dataset = [min, min + 3, min + 7, max - 4, max];
            const shuffled = shuffleArray(dataset);
            text = `Jangkauan (Range = Maks - Min) dari data: ${shuffled.join(', ')}`;
            answer = range;
        }
    } else {
        // === MATEMATIKA UMUM SMP BERDASARKAN KELAS ===
        if (grade === 7) {
            const sub = Math.floor(Math.random() * 4);
            if (sub === 0) {
                // Aljabar linear: ax + b = c
                const a = Math.floor(Math.random() * 6) + 2;
                const x = Math.floor(Math.random() * 9) + 2;
                const b = Math.floor(Math.random() * 15) + 3;
                const c = a * x + b;
                text = `${a}x + ${b} = ${c}, nilai x`;
                answer = x;
            } else if (sub === 1) {
                // Sudut berpenyiku / berpelurus
                const isPelurus = Math.random() > 0.5;
                if (isPelurus) {
                    const angle = Math.floor(Math.random() * 60) + 40;
                    text = `Sudut berpelurus dari ${angle}°`;
                    answer = 180 - angle;
                } else {
                    const angle = Math.floor(Math.random() * 45) + 20;
                    text = `Sudut berpenyiku dari ${angle}°`;
                    answer = 90 - angle;
                }
            } else if (sub === 2) {
                const a = Math.floor(Math.random() * 8) + 2;
                const b = Math.floor(Math.random() * 8) + 2;
                text = `(-${a}) × (-${b})`;
                answer = a * b;
            } else {
                const a = Math.floor(Math.random() * 20) + 10;
                const b = Math.floor(Math.random() * 20) + 10;
                text = `(-${a}) + (-${b})`;
                answer = -(a + b);
            }
        } else if (grade === 8) {
            const sub = Math.floor(Math.random() * 3);
            if (sub === 0) {
                // Tripel Pythagoras berulang
                const k = Math.floor(Math.random() * 4) + 1;
                const baseTriples = [
                    { a: 3, b: 4, c: 5 },
                    { a: 5, b: 12, c: 13 },
                    { a: 8, b: 15, c: 17 },
                    { a: 7, b: 24, c: 25 }
                ];
                const tr = pickRandom(baseTriples);
                const a = tr.a * k;
                const b = tr.b * k;
                const c = tr.c * k;
                if (Math.random() > 0.5) {
                    text = `Segitiga siku-siku alas ${a} & tinggi ${b}, sisi miring`;
                    answer = c;
                } else {
                    text = `Segitiga siku-siku sisi miring ${c} & alas ${a}, tinggi`;
                    answer = b;
                }
            } else if (sub === 1) {
                const a = Math.floor(Math.random() * 4) + 2;
                const b = Math.floor(Math.random() * 6) + 1;
                const x = Math.floor(Math.random() * 5) + 2;
                text = `Jika f(x) = ${a}x + ${b}, nilai f(${x})`;
                answer = a * x + b;
            } else {
                const r = pickRandom([7, 14, 21]);
                text = `Luas lingkaran jari-jari ${r} cm (π = 22/7)`;
                answer = Math.round((22 / 7) * r * r);
            }
        } else {
            // Kelas 9: Pangkat, Bentuk Akar, & Peluang
            const sub = Math.floor(Math.random() * 4);
            if (sub === 0) {
                const squares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225];
                const a2 = pickRandom(squares);
                const b2 = pickRandom(squares);
                text = `√${a2} + √${b2}`;
                answer = Math.round(Math.sqrt(a2) + Math.sqrt(b2));
            } else if (sub === 1) {
                const a = pickRandom([2, 3, 4, 5]);
                const p = pickRandom([2, 3]);
                const b = Math.floor(Math.random() * 15) + 5;
                text = `${a}³ - ${b}`;
                answer = Math.pow(a, 3) - b;
            } else if (sub === 2) {
                const r1 = Math.floor(Math.random() * 5) + 2;
                const r2 = Math.floor(Math.random() * 5) + 2;
                text = `Persamaan (x - ${r1})(x - ${r2}) = 0, nilai x₁ + x₂`;
                answer = r1 + r2;
            } else {
                text = "Peluang munculnya mata dadu ganjil pada 1 dadu 6 sisi (dalam persen: ...%)";
                answer = 50;
            }
        }
    }

    return {
        id: 'smp_' + Date.now() + Math.random().toString(36).substring(2, 6),
        type: 'numeric',
        text: text,
        answer: answer,
        chartSvg: chartSvg
    };
}

// 3. GENERATOR MATEMATIKA SMA (Kelas 10 - 12) Termasuk STATISTIKA LANJUTAN
function generateMathSMA(grade = 11) {
    grade = parseInt(grade) || 11;
    const isStat = Math.random() > 0.45; // 55% peluang statistik
    let text = "";
    let answer = 0;
    let chartSvg = null;

    if (isStat) {
        const sub = Math.floor(Math.random() * 4);
        if (sub === 0) {
            // Rata-rata Gabungan 2 kelompok
            const n1 = pickRandom([10, 15, 20]);
            const m1 = pickRandom([60, 70, 75]);
            const n2 = pickRandom([10, 15, 20]);
            const m2 = pickRandom([80, 85, 90]);
            const totalScore = n1 * m1 + n2 * m2;
            const totalN = n1 + n2;
            text = `Rata-rata ${n1} siswa = ${m1}, dan ${n2} siswa = ${m2}. Rata-rata gabungan`;
            answer = Math.round(totalScore / totalN);
        } else if (sub === 1) {
            // Kuartil Bawah / Atas dari data 7 bilangan
            const base = Math.floor(Math.random() * 10) + 10;
            const data = [base, base + 2, base + 4, base + 8, base + 10, base + 14, base + 18];
            const isQ1 = Math.random() > 0.5;
            if (isQ1) {
                text = `Kuartil Bawah (Q1) dari data: ${data.join(', ')}`;
                answer = data[1];
            } else {
                text = `Kuartil Atas (Q3) dari data: ${data.join(', ')}`;
                answer = data[5];
            }
        } else if (sub === 2) {
            // Jangkauan Interkuartil (Q3 - Q1)
            const q1 = Math.floor(Math.random() * 15) + 10;
            const diff = Math.floor(Math.random() * 15) + 6;
            const q3 = q1 + diff;
            text = `Diketahui Q₁ = ${q1} dan Q₃ = ${q3}. Jangkauan Interkuartil (Q₃ - Q₁)`;
            answer = diff;
        } else {
            // Histogram / Interval Frekuensi SVG
            const freqs = [
                Math.floor(Math.random() * 6) + 4,
                Math.floor(Math.random() * 8) + 12,
                Math.floor(Math.random() * 8) + 20,
                Math.floor(Math.random() * 6) + 6
            ];
            const labels = ["50-59", "60-69", "70-79", "80-89"];
            chartSvg = generateBarChartSvg(labels, freqs, "Distribusi Nilai Siswa");
            text = "Dari histogram distribusi nilai berikut, berapa frekuensi pada kelas interval 70-79?";
            answer = freqs[2];
        }
    } else {
        if (grade === 10) {
            // Logaritma & Trigonometri
            const sub = Math.floor(Math.random() * 4);
            if (sub === 0) {
                const base = pickRandom([2, 3, 5]);
                const p1 = Math.floor(Math.random() * 3) + 2;
                const p2 = Math.floor(Math.random() * 3) + 1;
                const v1 = Math.pow(base, p1);
                const v2 = Math.pow(base, p2);
                text = `^${base}log(${v1}) + ^${base}log(${v2})`;
                answer = p1 + p2;
            } else if (sub === 1) {
                const k = Math.floor(Math.random() * 10) + 10;
                text = `sin(30°) × ${k * 2}`;
                answer = k;
            } else if (sub === 2) {
                const k = Math.floor(Math.random() * 10) + 10;
                text = `cos(60°) × ${k * 2}`;
                answer = k;
            } else {
                const k = Math.floor(Math.random() * 15) + 10;
                text = `tan(45°) × ${k}`;
                answer = k;
            }
        } else if (grade === 11) {
            // Barisan Aritmetika & Geometri
            const sub = Math.floor(Math.random() * 3);
            if (sub === 0) {
                const a = Math.floor(Math.random() * 6) + 2;
                const b = Math.floor(Math.random() * 5) + 2;
                const n = Math.floor(Math.random() * 5) + 5;
                text = `Suku ke-${n} barisan aritmetika (${a}, ${a + b}, ${a + 2 * b}...)`;
                answer = a + (n - 1) * b;
            } else if (sub === 1) {
                const a = pickRandom([2, 3, 5]);
                const r = pickRandom([2, 3]);
                const n = pickRandom([3, 4]);
                text = `Suku ke-${n} barisan geometri (${a}, ${a * r}, ${a * r * r}...)`;
                answer = a * Math.pow(r, n - 1);
            } else {
                // Turunan f'(x)
                const a = Math.floor(Math.random() * 4) + 2;
                const b = Math.floor(Math.random() * 5) + 1;
                const x = Math.floor(Math.random() * 4) + 1;
                text = `Turunan f(x) = ${a}x² + ${b}x pada x = ${x} (f'(${x}))`;
                answer = 2 * a * x + b;
            }
        } else {
            // Kombinatorika & Peluang SMA
            const sub = Math.floor(Math.random() * 4);
            if (sub === 0) {
                // P(5,2) = 20, P(6,2) = 30, P(7,2) = 42, P(4,2) = 12
                const n = pickRandom([4, 5, 6, 7]);
                text = `Nilai permutasi P(${n}, 2)`;
                answer = n * (n - 1);
            } else if (sub === 1) {
                // C(n, 2)
                const n = pickRandom([4, 5, 6, 7, 8]);
                text = `Nilai kombinasi C(${n}, 2)`;
                answer = (n * (n - 1)) / 2;
            } else if (sub === 2) {
                const words = [
                    { word: "BPS", ans: 6 },
                    { word: "DATA", ans: 12 },
                    { word: "OTAK", ans: 24 },
                    { word: "ILMU", ans: 24 }
                ];
                const w = pickRandom(words);
                text = `Banyak susunan huruf berbeda dari kata "${w.word}"`;
                answer = w.ans;
            } else {
                const n = pickRandom([5, 6, 7]);
                text = `Nilai kombinasi C(${n}, 1)`;
                answer = n;
            }
        }
    }

    return {
        id: 'sma_' + Date.now() + Math.random().toString(36).substring(2, 6),
        type: 'numeric',
        text: text,
        answer: answer,
        chartSvg: chartSvg
    };
}

// 4. BANK DATA & GENERATOR ALGORITMIK BPS (BADAN PUSAT STATISTIK)
// Menghasilkan puluhan ribu variasi soal statistik dan pengetahuan sensus

const INDONESIA_PROVINCES = [
    { name: "Aceh", code: "11", capital: "Banda Aceh", island: "Sumatera" },
    { name: "Sumatera Utara", code: "12", capital: "Medan", island: "Sumatera" },
    { name: "Sumatera Barat", code: "13", capital: "Padang", island: "Sumatera" },
    { name: "Riau", code: "14", capital: "Pekanbaru", island: "Sumatera" },
    { name: "Jambi", code: "15", capital: "Jambi", island: "Sumatera" },
    { name: "Sumatera Selatan", code: "16", capital: "Palembang", island: "Sumatera" },
    { name: "Bengkulu", code: "17", capital: "Bengkulu", island: "Sumatera" },
    { name: "Lampung", code: "18", capital: "Bandar Lampung", island: "Sumatera" },
    { name: "Kep. Bangka Belitung", code: "19", capital: "Pangkalpinang", island: "Sumatera" },
    { name: "Kepulauan Riau", code: "21", capital: "Tanjungpinang", island: "Sumatera" },
    { name: "DKI Jakarta", code: "31", capital: "Jakarta", island: "Jawa" },
    { name: "Jawa Barat", code: "32", capital: "Bandung", island: "Jawa" },
    { name: "Jawa Tengah", code: "33", capital: "Semarang", island: "Jawa" },
    { name: "DI Yogyakarta", code: "34", capital: "Yogyakarta", island: "Jawa" },
    { name: "Jawa Timur", code: "35", capital: "Surabaya", island: "Jawa" },
    { name: "Banten", code: "36", capital: "Serang", island: "Jawa" },
    { name: "Bali", code: "51", capital: "Denpasar", island: "Bali" },
    { name: "Nusa Tenggara Barat", code: "52", capital: "Mataram", island: "Nusa Tenggara" },
    { name: "Nusa Tenggara Timur", code: "53", capital: "Kupang", island: "Nusa Tenggara" },
    { name: "Kalimantan Barat", code: "61", capital: "Pontianak", island: "Kalimantan" },
    { name: "Kalimantan Tengah", code: "62", capital: "Palangka Raya", island: "Kalimantan" },
    { name: "Kalimantan Selatan", code: "63", capital: "Banjarbaru", island: "Kalimantan" },
    { name: "Kalimantan Timur", code: "64", capital: "Samarinda", island: "Kalimantan" },
    { name: "Kalimantan Utara", code: "65", capital: "Tanjung Selor", island: "Kalimantan" },
    { name: "Sulawesi Utara", code: "71", capital: "Manado", island: "Sulawesi" },
    { name: "Sulawesi Tengah", code: "72", capital: "Palu", island: "Sulawesi" },
    { name: "Sulawesi Selatan", code: "73", capital: "Makassar", island: "Sulawesi" },
    { name: "Sulawesi Tenggara", code: "74", capital: "Kendari", island: "Sulawesi" },
    { name: "Gorontalo", code: "75", capital: "Gorontalo", island: "Sulawesi" },
    { name: "Sulawesi Barat", code: "76", capital: "Mamuju", island: "Sulawesi" },
    { name: "Maluku", code: "81", capital: "Ambon", island: "Maluku" },
    { name: "Maluku Utara", code: "82", capital: "Sofifi", island: "Maluku" },
    { name: "Papua", code: "91", capital: "Jayapura", island: "Papua" },
    { name: "Papua Barat", code: "92", capital: "Manokwari", island: "Papua" },
    { name: "Papua Selatan", code: "93", capital: "Merauke", island: "Papua" },
    { name: "Papua Tengah", code: "94", capital: "Nabire", island: "Papua" },
    { name: "Papua Pegunungan", code: "95", capital: "Wamena", island: "Papua" },
    { name: "Papua Barat Daya", code: "96", capital: "Sorong", island: "Papua" }
];

const BPS_CORE_KNOWLEDGE = [
    {
        q: "Indikator utama yang digunakan BPS untuk mengukur laju perubahan harga barang dan jasa konsumen adalah...",
        options: ["Inflasi (IHK)", "PDRB", "Garis Kemiskinan", "Rasio Gini"],
        ans: "Inflasi (IHK)"
    },
    {
        q: "Koefisien atau ukuran yang digunakan BPS untuk mengukur tingkat ketimpangan pendapatan penduduk adalah...",
        options: ["Rasio Gini", "Indeks Williamson", "Indeks Theil", "TPT"],
        ans: "Rasio Gini"
    },
    {
        q: "Survei BPS yang rutin dilaksanakan untuk menghitung tingkat kemiskinan dan pengeluaran konsumsi rumah tangga adalah...",
        options: ["Susenas", "Sakernas", "SBH", "Sensus Penduduk"],
        ans: "Susenas"
    },
    {
        q: "Survei berkala BPS yang khusus digunakan untuk mengukur indikator ketenagakerjaan dan pengangguran adalah...",
        options: ["Sakernas", "Susenas", "Podes", "Survei Biaya Hidup"],
        ans: "Sakernas"
    },
    {
        q: "Dalam penyelenggaraan Satu Data Indonesia (Perpres 39/2019), BPS bertindak sebagai...",
        options: ["Pembina Data Statistik", "Walidata Utama", "Produsen Tunggal", "Pengawas Anggaran"],
        ans: "Pembina Data Statistik"
    },
    {
        q: "Tiga dimensi utama pembentuk Indeks Pembangunan Manusia (IPM) adalah kesehatan, pendidikan, dan...",
        options: ["Standar hidup layak", "Jumlah kendaraan", "Luas perumahan", "Kepemilikan aset"],
        ans: "Standar hidup layak"
    },
    {
        q: "Singkatan dari TPT dalam indikator ketenagakerjaan BPS adalah...",
        options: ["Tingkat Pengangguran Terbuka", "Tingkat Pekerja Terampil", "Total Pekerja Terdaftar", "Taraf Pendapatan Tahunan"],
        ans: "Tingkat Pengangguran Terbuka"
    },
    {
        q: "Sensus Pertanian terbaru yang diselenggarakan oleh BPS di Indonesia adalah...",
        options: ["ST2023", "ST2020", "ST2016", "ST2010"],
        ans: "ST2023"
    },
    {
        q: "Sensus Ekonomi yang diselenggarakan setiap tahun berakhiran angka 6 terakhir kali dilaksanakan tahun...",
        options: ["2016", "2020", "2010", "2013"],
        ans: "2016"
    },
    {
        q: "Sensus Penduduk di Indonesia yang pertama kali menyediakan metode sensus mandiri online diselenggarakan tahun...",
        options: ["2020", "2010", "2000", "2015"],
        ans: "2020"
    },
    {
        q: "Batas kecukupan kalori harian per kapita yang dijadikan acuan dalam menghitung Garis Kemiskinan Makanan oleh BPS adalah...",
        options: ["2100 kkal", "2000 kkal", "2500 kkal", "1800 kkal"],
        ans: "2100 kkal"
    },
    {
        q: "Singkatan dari KBLI yang digunakan BPS untuk mengelompokkan aktivitas ekonomi di Indonesia adalah...",
        options: ["Klasifikasi Baku Lapangan Usaha Indonesia", "Kamus Baku Layanan Usaha Indonesia", "Kategori Bisnis Luar Negeri Indonesia", "Kriteria Baku Lembaga Usaha Indonesia"],
        ans: "Klasifikasi Baku Lapangan Usaha Indonesia"
    },
    {
        q: "Nilai Tukar Petani (NTP) yang menunjukkan bahwa petani mengalami surplus kesejahteraan memiliki nilai...",
        options: ["NTP > 100", "NTP = 100", "NTP < 100", "NTP = 0"],
        ans: "NTP > 100"
    },
    {
        q: "Survei yang mendata potensi, infrastruktur, dan fasilitas seluruh desa/kelurahan di Indonesia disebut...",
        options: ["Podes (Potensi Desa)", "Susenas", "Sakernas", "Varia Statistik"],
        ans: "Podes (Potensi Desa)"
    },
    {
        q: "Metode pemantauan pertanian modern berbasis citra satelit dan amatan lapangan yang diterapkan BPS untuk estimasi luas panen padi adalah...",
        options: ["KSA (Kerangka Sampel Area)", "Sensus Ubinan", "Podes", "Sakernas"],
        ans: "KSA (Kerangka Sampel Area)"
    },
    {
        q: "Undang-Undang Republik Indonesia tentang Statistik adalah...",
        options: ["UU Nomor 16 Tahun 1997", "UU Nomor 25 Tahun 2004", "UU Nomor 14 Tahun 2008", "UU Nomor 23 Tahun 2014"],
        ans: "UU Nomor 16 Tahun 1997"
    }
];

function generateBPSQuestion() {
    const isAlgorithmicNumeric = Math.random() > 0.45; // 55% perhitungan statistik numerik

    if (isAlgorithmicNumeric) {
        const type = Math.floor(Math.random() * 8);

        if (type === 0) {
            // Rasio Beban Ketergantungan (Dependency Ratio)
            // (Non-Produktif / Produktif) * 100
            const nonProd = pickRandom([30, 40, 50, 60]);
            const prod = 100;
            text = `Jumlah penduduk non-produktif ${nonProd} jiwa dan usia produktif ${prod} jiwa. Rasio Beban Ketergantungan`;
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: nonProd
            };
        } else if (type === 1) {
            // Sex Ratio (Rasio Jenis Kelamin)
            // (Laki-laki / Perempuan) * 100
            const ratio = pickRandom([101, 102, 103, 104, 105, 106, 98, 95]);
            const female = 1000;
            const male = ratio * 10;
            text = `Wilayah memiliki ${male} laki-laki dan ${female} perempuan. Rasio jenis kelamin (Sex Ratio)`;
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: ratio
            };
        } else if (type === 2) {
            // Tingkat Pengangguran Terbuka (TPT)
            const tptPercent = pickRandom([4, 5, 6, 7, 8]);
            const angkatanKerja = 100; // juta atau ribu
            const penganggur = tptPercent;
            text = `Angkatan kerja 100 ribu orang, jumlah penganggur ${penganggur} ribu orang. Berapa % TPT?`;
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: tptPercent
            };
        } else if (type === 3) {
            // Laju Inflasi IHK sederhana
            const ihk1 = 100;
            const inflasi = pickRandom([2, 3, 4, 5, 6]);
            const ihk2 = ihk1 + inflasi;
            text = `IHK bulan lalu 100 dan bulan ini ${ihk2}. Berapa persen (%) laju inflasi?`;
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: inflasi
            };
        } else if (type === 4) {
            // Garis Kemiskinan Makro (Total = Makanan + Bukan Makanan)
            const gkm = pickRandom([380, 400, 420, 450]);
            const gknm = pickRandom([120, 150, 180, 200]);
            const total = gkm + gknm;
            text = `Garis Kemiskinan Makanan Rp${gkm} ribu & Non-Makanan Rp${gknm} ribu. Total Garis Kemiskinan (... ribu Rp)`;
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: total
            };
        } else if (type === 5) {
            // Peringatan Hari Statistik Nasional (HSN)
            text = "Tanggal berapakah di bulan September diperingati sebagai Hari Statistik Nasional (HSN)?";
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: 26
            };
        } else if (type === 6) {
            // Sensus interval & tahun
            const sensusTypes = [
                { name: "Sensus Penduduk", ending: 0 },
                { name: "Sensus Pertanian", ending: 3 },
                { name: "Sensus Ekonomi", ending: 6 }
            ];
            const item = pickRandom(sensusTypes);
            text = `${item.name} di Indonesia rutin diadakan pada tahun yang berakhiran angka berapa?`;
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: item.ending
            };
        } else {
            // Dimensi IPM
            text = "Berapa pilar dimensi utama penyusun Indeks Pembangunan Manusia (IPM)?";
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'numeric',
                text: text,
                answer: 3
            };
        }
    } else {
        // Mode Soal Pilihan Ganda (Choice)
        const choiceCategory = Math.floor(Math.random() * 3);

        if (choiceCategory === 0) {
            // Soal 38 Provinsi & Kode Wilayah BPS (ribuan kombinasi)
            const prov = pickRandom(INDONESIA_PROVINCES);
            const subProv = Math.floor(Math.random() * 3);

            if (subProv === 0) {
                // Tanya Ibu Kota
                const wrongCaps = INDONESIA_PROVINCES
                    .filter(p => p.name !== prov.name)
                    .map(p => p.capital);
                const shuffledWrongs = shuffleArray(wrongCaps).slice(0, 3);
                const options = shuffleArray([prov.capital, ...shuffledWrongs]);

                return {
                    id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                    type: 'choice',
                    text: `Ibu kota dari Provinsi ${prov.name} adalah...`,
                    options: options,
                    answer: prov.capital
                };
            } else if (subProv === 1) {
                // Tanya Kode Wilayah 2 Digit BPS
                const wrongCodes = INDONESIA_PROVINCES
                    .filter(p => p.code !== prov.code)
                    .map(p => p.code);
                const shuffledCodes = shuffleArray(wrongCodes).slice(0, 3);
                const options = shuffleArray([prov.code, ...shuffledCodes]);

                return {
                    id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                    type: 'choice',
                    text: `Kode wilayah 2-digit resmi BPS untuk Provinsi ${prov.name} adalah...`,
                    options: options,
                    answer: prov.code
                };
            } else {
                // Tanya Gugus Pulau
                const islands = ["Sumatera", "Jawa", "Kalimantan", "Sulawesi", "Papua", "Bali & Nusa Tenggara", "Maluku"];
                const correctIsland = prov.island.includes("Nusa") || prov.island === "Bali" ? "Bali & Nusa Tenggara" : prov.island;
                const wrongIslands = islands.filter(i => i !== correctIsland);
                const options = shuffleArray([correctIsland, ...shuffleArray(wrongIslands).slice(0, 3)]);

                return {
                    id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                    type: 'choice',
                    text: `Provinsi ${prov.name} terletak di gugus kepulauan/pulau...`,
                    options: options,
                    answer: correctIsland
                };
            }
        } else {
            // Soal Pengetahuan Inti BPS
            const item = pickRandom(BPS_CORE_KNOWLEDGE);
            const options = shuffleArray([...item.options]);
            return {
                id: 'bps_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'choice',
                text: item.q,
                options: options,
                answer: item.ans
            };
        }
    }
}

// =========================================================
// 5. GENERATOR SUBJEK: PENGETAHUAN UMUM (100% PILIHAN GANDA)
// Tebak Tokoh, Tebak Gambar Visual SVG, Tebak Lucu & Populer
// Memiliki lebih dari 10.000 kombinasi unik & seru
// =========================================================

// Helper generate SVG Rebus Kata Bergambar
function generateRebusSvg(icon1, label1, icon2, label2) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 85" class="stat-chart-svg">
        <rect width="100%" height="100%" fill="#f1f5f9" rx="12" />
        <rect x="18" y="10" width="82" height="65" rx="10" fill="#ffffff" stroke="#3b82f6" stroke-width="2.5"/>
        <text x="59" y="46" font-size="28" text-anchor="middle">${icon1}</text>
        <text x="59" y="66" font-size="10" font-weight="800" fill="#475569" text-anchor="middle">${label1}</text>
        <text x="120" y="49" font-size="22" font-weight="900" fill="#f59e0b" text-anchor="middle">➕</text>
        <rect x="140" y="10" width="82" height="65" rx="10" fill="#ffffff" stroke="#ef4444" stroke-width="2.5"/>
        <text x="181" y="46" font-size="28" text-anchor="middle">${icon2}</text>
        <text x="181" y="66" font-size="10" font-weight="800" fill="#475569" text-anchor="middle">${label2}</text>
        <text x="246" y="49" font-size="24" font-weight="900" fill="#10b981" text-anchor="middle">❓</text>
    </svg>`;
}

// Helper generate SVG Ikon / Landmark Dunia
function generateLandmarkSvg(emoji, label) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 85" class="stat-chart-svg">
        <rect width="100%" height="100%" fill="#f8fafc" rx="12" />
        <rect x="35" y="10" width="170" height="65" rx="12" fill="#ffffff" stroke="#6366f1" stroke-width="2.5" />
        <text x="120" y="48" font-size="34" text-anchor="middle">${emoji}</text>
        <text x="120" y="67" font-size="11" font-weight="800" fill="#334155" text-anchor="middle">${label}</text>
    </svg>`;
}

// Database 1: Tebak Tokoh (Pahlawan, Penemu, Tokoh Dunia, Atlet, Karakter Populer)
const PU_TOKOH = [
    { name: "Ir. Soekarno", category: "pahlawan", role: "Presiden pertama RI dan Proklamator Kemerdekaan Indonesia", clue: "Bapak Proklamator Indonesia bersama Bung Hatta" },
    { name: "Drs. Mohammad Hatta", category: "pahlawan", role: "Wakil Presiden pertama RI dan Bapak Koperasi Indonesia", clue: "Tokoh pejuang dan Bapak Koperasi Indonesia" },
    { name: "R.A. Kartini", category: "pahlawan", role: "Pahlawan emansipasi wanita dengan buku 'Habis Gelap Terbitlah Terang'", clue: "Pahlawan yang diperingati setiap tanggal 21 April" },
    { name: "Ki Hajar Dewantara", category: "pahlawan", role: "Bapak Pendidikan Nasional dan pendiri Taman Siswa", clue: "Pencetus semboyan 'Tut Wuri Handayani'" },
    { name: "Pangeran Diponegoro", category: "pahlawan", role: "Pemimpin Perang Jawa melawan penjajah Belanda (1825-1830)", clue: "Pahlawan berkuda dari Yogyakarta dalam Perang Jawa" },
    { name: "Jenderal Soedirman", category: "pahlawan", role: "Panglima Besar TNI pertama yang memimpin perang gerilya dari atas tandu", clue: "Panglima TNI yang memimpin perang gerilya saat sakit" },
    { name: "B.J. Habibie", category: "tokoh", role: "Presiden ke-3 RI dan ahli dirgantara pencipta pesawat N250 Gatotkaca", clue: "Bapak Teknologi Indonesia dan ahli pesawat terbang" },
    { name: "Cut Nyak Dien", category: "pahlawan", role: "Pahlawan wanita pemberani dari Aceh yang memimpin perang gerilya", clue: "Pahlawan wanita gigih dari tanah Rencong Aceh" },
    { name: "Kapitan Pattimura", category: "pahlawan", role: "Pahlawan asal Maluku yang memimpin perlawanan di benteng Duurstede", clue: "Pahlawan asal Maluku yang wajahnya ada di uang Rp1.000 lama" },
    { name: "Bung Tomo", category: "pahlawan", role: "Tokoh pengobar semangat pemuda dalam pertempuran 10 November di Surabaya", clue: "Tokoh orasi pembakar semangat 'Merdeka atau Mati' di Surabaya" },
    { name: "Sultan Hasanuddin", category: "pahlawan", role: "Raja Gowa ke-16 yang dijuluki 'Ayam Jantan dari Timur'", clue: "Pahlawan dari Makassar berjuluk 'Ayam Jantan dari Timur'" },
    { name: "W.R. Supratman", category: "pahlawan", role: "Pencipta lagu kebangsaan 'Indonesia Raya' dengan biola bersejarah", clue: "Pencipta lagu Indonesia Raya yang pertama diperdengarkan 1928" },
    { name: "Albert Einstein", category: "penemu", role: "Fisikawan jenius penemu Teori Relativitas (E = mc²)", clue: "Ilmuwan berambut putih acak-acakan penemu teori relativitas" },
    { name: "Isaac Newton", category: "penemu", role: "Penemu hukum gravitasi bumi saat melihat buah apel jatuh dari pohon", clue: "Ilmuwan yang menemukan hukum gravitasi dari apel jatuh" },
    { name: "Thomas Alva Edison", category: "penemu", role: "Penemu lampu pijar listrik praktis dan pemegang ribuan paten", clue: "Penemu lampu pijar listrik yang pantang menyerah" },
    { name: "Alexander Graham Bell", category: "penemu", role: "Penemu perangkat komunikasi telepon pertama di dunia", clue: "Penemu pesawat telepon pertama yang menghubungkan suara jarak jauh" },
    { name: "Wright Bersaudara", category: "penemu", role: "Perancang dan penerbang pesawat terbang bermotor pertama di dunia", clue: "Dua bersaudara (Orville & Wilbur) penerbang pesawat pertama" },
    { name: "Leonardo da Vinci", category: "tokoh", role: "Pelukis mahakarya 'Mona Lisa' dan penemu serbabisa zaman Renaisans", clue: "Pelukis lukisan legendaris senyum misterius 'Mona Lisa'" },
    { name: "Neil Armstrong", category: "tokoh", role: "Manusia pertama yang mendarat dan berjalan di permukaan Bulan (Apollo 11)", clue: "Astronot pertama yang menjejakkan kaki di Bulan tahun 1969" },
    { name: "Lionel Messi", category: "atlet", role: "Kapten legendaris timnas sepak bola Argentina juara Piala Dunia 2022", clue: "Bintang sepak bola berjuluk 'La Pulga' peraih 8 Ballon d'Or" },
    { name: "Cristiano Ronaldo", category: "atlet", role: "Bintang sepak bola dunia asal Portugal berjuluk 'CR7'", clue: "Megabintang sepak bola Portugal dengan selebrasi khas 'Siuuu'" },
    { name: "Taufik Hidayat", category: "atlet", role: "Legenda bulu tangkis tunggal putra Indonesia peraih medali emas Olimpiade Athena 2004", clue: "Pebulu tangkis Indonesia dengan pukulan 'backhand smash' mematikan" },
    { name: "Greysia Polii & Apriyani Rahayu", category: "atlet", role: "Ganda putri bulu tangkis Indonesia peraih medali emas Olimpiade Tokyo 2020", clue: "Ganda putri Indonesia peraih medali emas Olimpiade Tokyo" },
    { name: "Usain Bolt", category: "atlet", role: "Pelari tercepat di dunia asal Jamaika pemegang rekor lari 100 meter (9,58 detik)", clue: "Manusia tercepat di bumi dengan julukan 'Lightning Bolt'" },
    { name: "Muhammad Ali", category: "atlet", role: "Petinju kelas berat legendaris berjuluk 'The Greatest' dengan gaya melayang bagai kupu-kupu", clue: "Petinju legendaris dengan motto 'Melayang seperti kupu-kupu, menyengat seperti lebah'" },
    { name: "Sherlock Holmes", category: "fiksi", role: "Detektif fiksi jenius ciptaan Arthur Conan Doyle yang tinggal di 221B Baker Street", clue: "Detektif fiksi paling terkenal di dunia dengan sahabat setianya Dr. Watson" },
    { name: "Harry Potter", category: "fiksi", role: "Penyihir muda berkacamata bulat dengan bekas luka petir di dahinya", clue: "Karakter penyihir muda dari sekolah sihir Hogwarts" },
    { name: "Tony Stark (Iron Man)", category: "fiksi", role: "Pahlawan super miliarder genius pemilik baju zirah berteknologi tinggi Arc Reactor", clue: "Superhero berbaju besi merah-emas dari Marvel Avengers" },
    { name: "Bruce Wayne (Batman)", category: "fiksi", role: "Ksatria kegelapan bertopeng kelelawar pelindung kota Gotham", clue: "Superhero kaya raya bertopeng kelelawar dari DC Comics" },
    { name: "Peter Parker (Spider-Man)", category: "fiksi", role: "Superhero remaja yang memiliki kemampuan merayap dan jaring laba-laba", clue: "Superhero dengan motto 'Kekuatan besar membawa tanggung jawab besar'" },
    { name: "Doraemon", category: "fiksi", role: "Robot kucing dari abad ke-22 yang memiliki kantong ajaib dan suka makan dorayaki", clue: "Robot kucing biru berkantong ajaib sahabat setia Nobita" },
    { name: "SpongeBob SquarePants", category: "fiksi", role: "Spons kuning ceria yang tinggal di rumah nanas di Bikini Bottom dan koki Krabby Patty", clue: "Karakter spons kuning koki burger di bawah laut" }
];

// Database 2: Tebak Gambar Rebus Puzzle
const PU_REBUS = [
    { icon1: "👁️", lbl1: "MATA", icon2: "☀️", lbl2: "HARI", ans: "Matahari", dist: ["Air Mata", "Mata Kaki", "Kacamata"] },
    { icon1: "☕", lbl1: "KOPI", icon2: "🥛", lbl2: "SUSU", ans: "Kopi Susu", dist: ["Kopi Hitam", "Susu Sapi", "Teh Manis"] },
    { icon1: "🚗", lbl1: "MOBIL", icon2: "🏎️", lbl2: "BALAP", ans: "Mobil Balap", dist: ["Mobil Truk", "Sepeda Balap", "Kereta Cepat"] },
    { icon1: "🛏️", lbl1: "KASUR", icon2: "👑", lbl2: "RAJA", ans: "Kasur Raja", dist: ["Kamar Tidur", "Bantal Guling", "Ranjang Besi"] },
    { icon1: "🌙", lbl1: "BULAN", icon2: "⭐️", lbl2: "BINTANG", ans: "Bulan Bintang", dist: ["Langit Malam", "Tata Surya", "Matahari Pagi"] },
    { icon1: "🐟", lbl1: "IKAN", icon2: "🦈", lbl2: "HIU", ans: "Ikan Hiu", dist: ["Ikan Paus", "Ikan Lumba-lumba", "Ikan Salmon"] },
    { icon1: "🍎", lbl1: "APEL", icon2: "🥧", lbl2: "PAI", ans: "Pai Apel", dist: ["Kue Bolu", "Jus Apel", "Roti Tawar"] },
    { icon1: "👟", lbl1: "SEPATU", icon2: "⚽", lbl2: "BOLA", ans: "Sepatu Bola", dist: ["Sarung Tinju", "Baju Olahraga", "Bola Kaki"] },
    { icon1: "🏠", lbl1: "RUMAH", icon2: "🩹", lbl2: "SAKIT", ans: "Rumah Sakit", dist: ["Puskesmas", "Apotek Sehat", "Ruang Dokter"] },
    { icon1: "📚", lbl1: "BUKU", icon2: "🐛", lbl2: "KUTU", ans: "Kutu Buku", dist: ["Ulat Daun", "Toko Buku", "Kutu Kasur"] },
    { icon1: "💧", lbl1: "AIR", icon2: "👁️", lbl2: "MATA", ans: "Air Mata", dist: ["Mata Air", "Tetes Embun", "Air Minum"] },
    { icon1: "🪑", lbl1: "KURSI", icon2: "💼", lbl2: "KANTOR", ans: "Kursi Kantor", dist: ["Meja Kerja", "Gedung Kantor", "Tas Laptop"] },
    { icon1: "🍞", lbl1: "ROTI", icon2: "🧀", lbl2: "KEJU", ans: "Roti Keju", dist: ["Roti Cokelat", "Keju Lumer", "Kue Tart"] },
    { icon1: "🌧️", lbl1: "HUJAN", icon2: "🌈", lbl2: "PELANGI", ans: "Pelangi", dist: ["Awan Mendung", "Hujan Es", "Kilat Petir"] },
    { icon1: "🍌", lbl1: "PISANG", icon2: "🍳", lbl2: "GORENG", ans: "Pisang Goreng", dist: ["Pisang Bakar", "Nasi Goreng", "Singkong Keju"] },
    { icon1: "⏰", lbl1: "JAM", icon2: "✋", lbl2: "TANGAN", ans: "Jam Tangan", dist: ["Jam Dinding", "Gelang Emas", "Stopwatch"] },
    { icon1: "🚢", lbl1: "KAPAL", icon2: "🌊", lbl2: "LAUT", ans: "Kapal Laut", dist: ["Perahu Karet", "Kapal Selam", "Mercusuar"] },
    { icon1: "🕶️", lbl1: "KACAMATA", icon2: "☀️", lbl2: "HITAM", ans: "Kacamata Hitam", dist: ["Lensa Kontak", "Topi Pantai", "Kacamata Renang"] },
    { icon1: "🚲", lbl1: "SEPEDA", icon2: "⛰️", lbl2: "GUNUNG", ans: "Sepeda Gunung", dist: ["Sepeda Ontel", "Sepeda Listrik", "Pendaki Gunung"] },
    { icon1: "🍚", lbl1: "NASI", icon2: "🍳", lbl2: "GORENG", ans: "Nasi Goreng", dist: ["Nasi Uduk", "Mie Goreng", "Ayam Goreng"] },
    { icon1: "🕯️", lbl1: "LILIN", icon2: "🎂", lbl2: "KUE", ans: "Kue Ulang Tahun", dist: ["Pesta Lilin", "Kue Bolu", "Toko Roti"] },
    { icon1: "✈️", lbl1: "PESAWAT", icon2: "🛩️", lbl2: "TEMPUR", ans: "Pesawat Tempur", dist: ["Helikopter", "Pesawat Komersial", "Piring Terbang"] },
    { icon1: "🌲", lbl1: "POHON", icon2: "🌴", lbl2: "KELAPA", ans: "Pohon Kelapa", dist: ["Hutan Lindung", "Pohon Cemara", "Taman Kota"] },
    { icon1: "🐅", lbl1: "HARIMAU", icon2: "🐆", lbl2: "SUMATERA", ans: "Harimau Sumatera", dist: ["Singa Afrika", "Macan Tutul", "Kucing Hutan"] },
    { icon1: "🎸", lbl1: "GITAR", icon2: "⚡", lbl2: "LISTRIK", ans: "Gitar Listrik", dist: ["Gitar Akustik", "Gitar Bass", "Panggung Musik"] },
    { icon1: "🍔", lbl1: "BURGER", icon2: "🍟", lbl2: "KENTANG", ans: "Kentang Goreng", dist: ["Nugget Ayam", "Sandwich Keju", "Restoran Cepat Saji"] },
    { icon1: "🦁", lbl1: "SINGA", icon2: "👑", lbl2: "RAJA", ans: "Raja Hutan", dist: ["Penguasa Rimba", "Mahkota Singa", "Kebun Binatang"] },
    { icon1: "🍯", lbl1: "MADU", icon2: "🐝", lbl2: "LEBAH", ans: "Madu Lebah", dist: ["Sarang Tawon", "Bunga Mekar", "Sirup Manis"] },
    { icon1: "🧊", lbl1: "ES", icon2: "🍧", lbl2: "CAMPUR", ans: "Es Campur", dist: ["Es Cendol", "Es Kelapa", "Es Teh Manis"] },
    { icon1: "🥊", lbl1: "SARUNG", icon2: "🥋", lbl2: "TINJU", ans: "Sarung Tinju", dist: ["Sabuk Hitam", "Baju Karate", "Ring Tinju"] }
];

// Database 3: Landmark & Monumen Terkenal
const PU_LANDMARKS = [
    { emoji: "🗼", label: "Menara Besi Ikonik", name: "Menara Eiffel", loc: "Paris, Prancis", dist: ["Menara Pisa", "Big Ben", "Empire State"] },
    { emoji: "🗽", label: "Patung Pembawa Obor Kemerdekaan", name: "Patung Liberty", loc: "New York, Amerika Serikat", dist: ["Patung Sphinx", "Patung Yesus Penebus", "Patung Merlion"] },
    { emoji: "🏛️", label: "Candi Buddha Terbesar di Dunia", name: "Candi Borobudur", loc: "Magelang, Jawa Tengah", dist: ["Candi Prambanan", "Candi Mendut", "Angkor Wat"] },
    { emoji: "🛕", label: "Makam Megah Marmer Putih", name: "Taj Mahal", loc: "Agra, India", dist: ["Piramida Giza", "Colosseum", "Petra Yordania"] },
    { emoji: "🏟️", label: "Amfiteater Kuno Gladiator", name: "Colosseum", loc: "Roma, Italia", dist: ["Parthenon Yunani", "Stadion Wembley", "Chichen Itza"] },
    { emoji: "🔺", label: "Monumen Makam Kuno Firaun", name: "Piramida Giza", loc: "Kairo, Mesir", dist: ["Machu Picchu", "Stonehenge", "Menara Eiffel"] },
    { emoji: "🧱", label: "Tembok Pertahanan Terpanjang", name: "Tembok Besar China", loc: "Tiongkok / China", dist: ["Tembok Berlin", "Kastil Himeji", "Benteng Vredeburg"] },
    { emoji: "🏙️", label: "Tugu Nasional Berpuncak Emas", name: "Monas", loc: "DKI Jakarta", dist: ["Tugu Pahlawan", "Tugu Muda", "Jam Gadang"] },
    { emoji: "🕰️", label: "Menara Jam Bersejarah", name: "Jam Gadang", loc: "Bukittinggi, Sumatera Barat", dist: ["Monas", "Big Ben", "Tugu Jogja"] },
    { emoji: "🌉", label: "Jembatan Merah Ikonik Sungai Musi", name: "Jembatan Ampera", loc: "Palembang, Sumatera Selatan", dist: ["Jembatan Suramadu", "Jembatan Barelang", "Golden Gate"] }
];

// Database 4: Teka-Teki Lucu & Tebak-Tebakan Logika Kocak
const PU_TEBAKAN_LUCU = [
    { q: "Pintu apa yang didorong oleh 10 orang pria perkasa tetap tidak mau terbuka?", ans: "Pintu yang ada tulisan TARIK", opts: ["Pintu yang ada tulisan TARIK", "Pintu gerbang istana", "Pintu lemari besi", "Pintu darurat rahasia"] },
    { q: "Benda apa yang kalau dipotong malah jadi semakin panjang?", ans: "Celana panjang", opts: ["Celana panjang", "Tali tambang", "Kabel listrik", "Rambut gimbal"] },
    { q: "Hewan apa yang semua saudaranya saling kenal dan bersaudara?", ans: "Katak beradik", opts: ["Katak beradik", "Bebek berenang", "Ayam berkokok", "Semut bergotong royong"] },
    { q: "Kera apa yang ada di atas pohon dan bikin orang panik / masuk rumah sakit?", ans: "Keracunan", opts: ["Keracunan", "Kera liar", "Kera sakti", "Kera hutan"] },
    { q: "Ban apa yang bisa makan rumput, minum air, dan bisa bernapas?", ans: "Banteng", opts: ["Banteng", "Bandeng", "Bangau", "Banci"] },
    { q: "Hewan apa yang paling banyak warnanya dan suka bikin bingung musuh?", ans: "Bunglon", opts: ["Bunglon", "Zebra", "Kuda nil", "Trenggiling"] },
    { q: "Benda apa yang selalu berputar dan berjalan tapi kakinya tidak pernah melangkah?", ans: "Jam dinding", opts: ["Jam dinding", "Komidi putar", "Kipas angin", "Roda sepeda"] },
    { q: "Apa yang punya leher panjang tapi sama sekali tidak memiliki kepala?", ans: "Botol / Baju", opts: ["Botol / Baju", "Jerapah", "Gitar akustik", "Termos air"] },
    { q: "Kutu apa yang paling ditakuti dan membuat bulu kuduk semua orang merinding?", ans: "Kutukan", opts: ["Kutukan", "Kutu kasur", "Kutu rambut", "Kutu beras"] },
    { q: "Ikan apa yang paling cerewet dan suka mengomel?", ans: "Ikan bawel (bawal)", opts: ["Ikan bawel (bawal)", "Ikan tongkol", "Ikan paus", "Ikan lele"] },
    { q: "Gajah apa yang belalainya sangat pendek dan tidak bisa melilit pohon?", ans: "Gajah pesek", opts: ["Gajah pesek", "Gajah Sumatera", "Gajah Afrika", "Gajah sirkus"] },
    { q: "Lemari apa yang bisa dimasukkan ke dalam kantong saku celana?", ans: "Lemari-buan (Lima ribuan)", opts: ["Lemari-buan (Lima ribuan)", "Lemari es mini", "Lemari pakaian boneka", "Kotak pensil"] },
    { q: "Rambut putih uban, rambut merah pirang, kalau rambut hijau namanya apa?", ans: "Rambutan belum matang", opts: ["Rambutan belum matang", "Rambut alien", "Rambut lumut", "Rambut palsu"] },
    { q: "Pocong apa yang paling disenangi oleh ibu-ibu saat belanja di pasar atau mall?", ans: "Pocongan harga (Potongan)", opts: ["Pocongan harga (Potongan)", "Pocong lucu", "Pocong ramah", "Pocong putih"] },
    { q: "Bebek apa yang kalau jalan suka muter-muter ke arah kiri terus?", ans: "Bebek dikunci stang", opts: ["Bebek dikunci stang", "Bebek pusing", "Bebek mabuk", "Bebek balap"] },
    { q: "Kecil, hitam, kalau dipukul malah yang mukul yang menangis dan kesakitan?", ans: "Nyamuk nempel di hidung", opts: ["Nyamuk nempel di hidung", "Semut api", "Kutu beras", "Lalat buah"] },
    { q: "Kenapa nyamuk suka menghisap darah manusia?", ans: "Karena tidak punya uang buat beli kopi", opts: ["Karena tidak punya uang buat beli kopi", "Karena haus", "Karena disuruh ratunya", "Karena suka rasa manis"] },
    { q: "Sayur apa yang jago menyanyi dan bersuara merdu?", ans: "Kol-play (Coldplay)", opts: ["Kol-play (Coldplay)", "Kangkung", "Bayam", "Wortel manis"] },
    { q: "Jus apa yang kalau diminum rasanya tidak enak dan bikin sakit hati?", ans: "Just a friend (Hanya teman)", opts: ["Just a friend (Hanya teman)", "Jus pare", "Jus mengkudu", "Jus cabe rawit"] },
    { q: "Sepatu apa yang tidak bisa dipakai untuk berjalan?", ans: "Sepatula (Spatula)", opts: ["Sepatula (Spatula)", "Sepatu roda rusak", "Sepatu kaca", "Sepatu badut"] },
    { q: "Tentara apa yang ukurannya paling kecil di dunia?", ans: "Tentara sekutu (kutu)", opts: ["Tentara sekutu (kutu)", "Tentara liliput", "Tentara semut", "Tentara mainan"] },
    { q: "Ayam apa yang paling dicari-cari oleh banyak orang saat lapar di malam hari?", ans: "Ayam geprek / goreng", opts: ["Ayam geprek / goreng", "Ayam berkokok", "Ayam jago", "Ayam cemani"] },
    { q: "Ular apa yang paling disukai oleh anak-anak sekolah saat jam istirahat?", ans: "Ular tangga", opts: ["Ular tangga", "Ular kobra", "Ular piton", "Ular sawah"] },
    { q: "Bumi itu bulat, kalau telur itu...", ans: "Pecah kalau jatuh", opts: ["Pecah kalau jatuh", "Kotak", "Segitiga", "Lonjong"] },
    { q: "Mata apa yang ukurannya paling besar di alam semesta?", ans: "Matahari", opts: ["Matahari", "Mata elang", "Mata sapi", "Mata ikan"] }
];

// Database 5: Kuliner Khas Nusantara & Tradisi
const PU_KULINER = [
    { food: "Rendang", prov: "Sumatera Barat" },
    { food: "Gudeg", prov: "D.I. Yogyakarta" },
    { food: "Pempek", prov: "Sumatera Selatan" },
    { food: "Coto Makassar", prov: "Sulawesi Selatan" },
    { food: "Bika Ambon", prov: "Sumatera Utara" },
    { food: "Ayam Betutu", prov: "Bali" },
    { food: "Papeda", prov: "Papua" },
    { food: "Kerak Telor", prov: "DKI Jakarta" },
    { food: "Mie Aceh", prov: "Aceh" },
    { food: "Soto Banjar", prov: "Kalimantan Selatan" },
    { food: "Lumpia", prov: "Jawa Tengah" },
    { food: "Rawon", prov: "Jawa Timur" },
    { food: "Peuyeum / Surabi", prov: "Jawa Barat" },
    { food: "Ayam Taliwang", prov: "Nusa Tenggara Barat" },
    { food: "Sei Sapi", prov: "Nusa Tenggara Timur" },
    { food: "Bubur Manado (Tinutuan)", prov: "Sulawesi Utara" },
    { food: "Kaledo", prov: "Sulawesi Tengah" },
    { food: "Otak-Otak", prov: "Kepulauan Riau" },
    { food: "Lempah Kuning", prov: "Kepulauan Bangka Belitung" },
    { food: "Sate Padang", prov: "Sumatera Barat" },
    { food: "Gado-Gado", prov: "DKI Jakarta" },
    { food: "Soto Lamongan", prov: "Jawa Timur" },
    { food: "Serabi Solo", prov: "Jawa Tengah" }
];

// Database 6: Sains Santai, Hewan & Fakta Populer Unik
const PU_SAINS_POPULER = [
    { q: "Hewan darat apa yang dinobatkan sebagai pelari tercepat di dunia?", ans: "Cheetah", dist: ["Singa", "Kuda", "Kancil"] },
    { q: "Mamalia terbesar di bumi yang hidup di seluruh samudra lautan adalah...", ans: "Paus Biru", dist: ["Hiu Megalodon", "Ikan Pari Manta", "Gajah Afrika"] },
    { q: "Burung terbesar di dunia yang tidak dapat terbang namun memiliki lari sangat kencang adalah...", ans: "Burung Unta", dist: ["Burung Hantu", "Burung Elang", "Burung Penguin"] },
    { q: "Planet terbesar dalam sistem Tata Surya kita adalah...", ans: "Jupiter", dist: ["Saturnus", "Bumi", "Mars"] },
    { q: "Planet yang sering dijuluki sebagai 'Planet Merah' adalah...", ans: "Mars", dist: ["Venus", "Merkurius", "Jupiter"] },
    { q: "Planet yang paling dekat jaraknya dengan Matahari adalah...", ans: "Merkurius", dist: ["Venus", "Bumi", "Mars"] },
    { q: "Satu-satunya satelit alami yang mengelilingi planet Bumi adalah...", ans: "Bulan", dist: ["Titan", "Europa", "Matahari"] },
    { q: "Gas utama di udara yang dihirup manusia dan hewan untuk bernapas adalah...", ans: "Oksigen (O₂)", dist: ["Karbondioksida", "Nitrogen", "Helium"] },
    { q: "Proses tumbuhan hijau mengolah makanan menggunakan bantuan sinar matahari disebut...", ans: "Fotosintesis", dist: ["Metamorfosis", "Respirasi", "Osmosis"] },
    { q: "Alat untuk mengukur gempa bumi disebut...", ans: "Seismograf", dist: ["Termometer", "Barometer", "Anemometer"] },
    { q: "Benua terluas di dunia baik berdasarkan luas wilayah maupun populasi adalah...", ans: "Benua Asia", dist: ["Benua Afrika", "Benua Amerika", "Benua Eropa"] },
    { q: "Samudra terluas dan terdalam di permukaan bumi adalah...", ans: "Samudra Pasifik", dist: ["Samudra Atlantik", "Samudra Hindia", "Samudra Arktik"] },
    { q: "Gunung tertinggi di dunia yang berada di pegunungan Himalaya adalah...", ans: "Gunung Everest", dist: ["Gunung Kilimanjaro", "Gunung Fuji", "Gunung Jayawijaya"] },
    { q: "Ibu kota negara Jepang yang terkenal dengan persimpangan Shibuya adalah...", ans: "Tokyo", dist: ["Kyoto", "Osaka", "Hiroshima"] },
    { q: "Mata uang resmi yang digunakan di negara Malaysia adalah...", ans: "Ringgit", dist: ["Baht", "Peso", "Dolar"] }
];

// Generator Utama Pengetahuan Umum (100% Pilihan Ganda)
function generatePengetahuanUmumQuestion() {
    const category = Math.floor(Math.random() * 5);

    if (category === 0) {
        // --- 1. TEBAK TOKOH (Pilihan Ganda A, B, C, D) ---
        const figure = pickRandom(PU_TOKOH);
        const subType = Math.floor(Math.random() * 3);
        let qText = "";

        if (subType === 0) {
            qText = `Siapakah tokoh yang terkenal karena: ${figure.role}?`;
        } else if (subType === 1) {
            qText = `Tebak Tokoh: "${figure.clue}". Siapakah beliau?`;
        } else {
            qText = `Tokoh ternama "${figure.name}" dikenal luas sebagai...`;
            // Alternatif tebak peran tokoh
            const wrongRoles = PU_TOKOH.filter(f => f.name !== figure.name).map(f => f.role);
            const dist = shuffleArray(wrongRoles).slice(0, 3);
            const options = shuffleArray([figure.role, ...dist]);
            return {
                id: 'pu_t_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'choice',
                text: qText,
                options: options,
                answer: figure.role
            };
        }

        const wrongFigures = PU_TOKOH.filter(f => f.name !== figure.name).map(f => f.name);
        const dist = shuffleArray(wrongFigures).slice(0, 3);
        const options = shuffleArray([figure.name, ...dist]);

        return {
            id: 'pu_t_' + Date.now() + Math.random().toString(36).substring(2, 6),
            type: 'choice',
            text: qText,
            options: options,
            answer: figure.name
        };

    } else if (category === 1) {
        // --- 2. TEBAK GAMBAR VISUAL SVG (Rebus Kata Bergambar & Landmark) ---
        const isRebus = Math.random() > 0.35;

        if (isRebus) {
            const item = pickRandom(PU_REBUS);
            const svg = generateRebusSvg(item.icon1, item.lbl1, item.icon2, item.lbl2);
            const options = shuffleArray([item.ans, ...item.dist]);

            return {
                id: 'pu_r_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'choice',
                text: "Tebak gabungan kata dari gambar visual berikut:",
                chartSvg: svg,
                options: options,
                answer: item.ans
            };
        } else {
            const lm = pickRandom(PU_LANDMARKS);
            const svg = generateLandmarkSvg(lm.emoji, lm.label);
            const options = shuffleArray([lm.name, ...lm.dist]);

            return {
                id: 'pu_lm_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'choice',
                text: `Perhatikan gambar! Bangunan/monumen yang terletak di ${lm.loc} ini bernama...`,
                chartSvg: svg,
                options: options,
                answer: lm.name
            };
        }

    } else if (category === 2) {
        // --- 3. TEKA-TEKI LUCU & LOGIKA KOCAK ---
        const item = pickRandom(PU_TEBAKAN_LUCU);
        const options = shuffleArray([...item.opts]);

        return {
            id: 'pu_l_' + Date.now() + Math.random().toString(36).substring(2, 6),
            type: 'choice',
            text: `[Tebak Lucu] ${item.q}`,
            options: options,
            answer: item.ans
        };

    } else if (category === 3) {
        // --- 4. KULINER KHAS NUSANTARA ---
        const item = pickRandom(PU_KULINER);
        const isAskProv = Math.random() > 0.5;

        if (isAskProv) {
            const wrongProvs = PU_KULINER.filter(k => k.prov !== item.prov).map(k => k.prov);
            const dist = shuffleArray(Array.from(new Set(wrongProvs))).slice(0, 3);
            const options = shuffleArray([item.prov, ...dist]);

            return {
                id: 'pu_k_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'choice',
                text: `Makanan tradisional "${item.food}" merupakan kuliner legendaris khas dari provinsi...`,
                options: options,
                answer: item.prov
            };
        } else {
            const wrongFoods = PU_KULINER.filter(k => k.food !== item.food).map(k => k.food);
            const dist = shuffleArray(Array.from(new Set(wrongFoods))).slice(0, 3);
            const options = shuffleArray([item.food, ...dist]);

            return {
                id: 'pu_k_' + Date.now() + Math.random().toString(36).substring(2, 6),
                type: 'choice',
                text: `Provinsi ${item.prov} sangat terkenal dengan makanan tradisional khasnya yaitu...`,
                options: options,
                answer: item.food
            };
        }

    } else {
        // --- 5. SAINS SANTAI & FAKTA POPULER UNIK ---
        const item = pickRandom(PU_SAINS_POPULER);
        const options = shuffleArray([item.ans, ...item.dist]);

        return {
            id: 'pu_s_' + Date.now() + Math.random().toString(36).substring(2, 6),
            type: 'choice',
            text: item.q,
            options: options,
            answer: item.ans
        };
    }
}

// 6. GENERATOR DARI BANK SOAL KUSTOM (PENGETAHUAN CUSTOM)
function generateCustomQuestion(subjectName) {
    if (!customBank[subjectName] || customBank[subjectName].length === 0) {
        return generatePengetahuanUmumQuestion();
    }
    const list = customBank[subjectName];
    const item = pickRandom(list);
    return {
        id: 'custom_' + Date.now() + Math.random().toString(36).substring(2, 6),
        type: item.type || (item.options && item.options.length > 0 ? 'choice' : 'numeric'),
        text: item.text,
        options: item.options ? shuffleArray([...item.options]) : undefined,
        answer: item.answer
    };
}

// Master Generator Soal untuk Room Tertentu
function generateQuestionForRoom(room) {
    const subject = room.selectedSubject || 'matematika';
    const level = room.selectedLevel || 'smp';
    const grade = room.selectedGrade || 8;

    if (subject === 'matematika') {
        if (level === 'sd') {
            return generateMathSD(grade);
        } else if (level === 'sma') {
            return generateMathSMA(grade);
        } else {
            return generateMathSMP(grade);
        }
    } else if (subject === 'bps') {
        return generateBPSQuestion();
    } else if (subject === 'umum') {
        return generatePengetahuanUmumQuestion();
    } else {
        return generateCustomQuestion(subject);
    }
}

// Generator Anti-Contek & Anti-Collision Antar Tim
// Menjamin Tim 1 dan Tim 2 tidak menerima soal yang sama secara bersamaan atau berurutan dekat
function generateQuestionForTeam(room, teamNum) {
    const otherTeam = teamNum === 1 ? 2 : 1;
    const otherCurrentQ = room.currentQuestions ? room.currentQuestions[otherTeam] : null;
    const otherRecent = (room.recentQuestions && room.recentQuestions[otherTeam]) || [];
    const myRecent = (room.recentQuestions && room.recentQuestions[teamNum]) || [];

    let q = null;
    let attempts = 0;

    while (attempts < 30) {
        attempts++;
        q = generateQuestionForRoom(room);
        const qText = q.text ? q.text.trim() : '';

        const isCollidingWithOther = otherCurrentQ && otherCurrentQ.text && otherCurrentQ.text.trim() === qText;
        const isUsedRecentlyByOther = otherRecent.includes(qText);
        const isUsedRecentlyByMe = myRecent.includes(qText);

        if (!isCollidingWithOther && !isUsedRecentlyByOther && !isUsedRecentlyByMe) {
            break;
        }
    }

    if (!room.recentQuestions) room.recentQuestions = { 1: [], 2: [] };
    if (!room.recentQuestions[teamNum]) room.recentQuestions[teamNum] = [];
    room.recentQuestions[teamNum].push(q.text ? q.text.trim() : '');
    if (room.recentQuestions[teamNum].length > 35) {
        room.recentQuestions[teamNum].shift();
    }

    // Acak posisi pilihan ganda agar opsi jawaban benar tidak selalu di 'A'
    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
        q.options = shuffleArray(q.options);
    }

    return q;
}

// Generate kode PIN 6 digit unik
const rooms = {};

function generateUniquePIN() {
    let pin;
    do {
        pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (rooms[pin]);
    return pin;
}

// Buat Room baru dengan konfigurasi subjek
function createRoom(pin) {
    return {
        pin: pin,
        hostSocketId: null,
        teamNames: {
            1: "TIM MERAH",
            2: "TIM BIRU"
        },
        players: [], // array of { id, name, team, score: 0 }
        maxPerTeam: 20,
        isGameRunning: false,
        isCountingDown: false,
        gameDuration: 180, // Detik (default 3 menit)
        timerInterval: null,
        startTime: null,
        remainingTime: 180,
        scores: { 1: 0, 2: 0 },
        scoreDiff: 0, // Posisi tali: score[1] - score[2]
        turns: { 1: 0, 2: 0 },
        currentQuestions: {
            1: null,
            2: null
        },
        recentQuestions: {
            1: [],
            2: []
        },
        // Konfigurasi Subjek & Level Soal
        selectedSubject: 'matematika', // 'matematika', 'bps', atau nama subjek kustom
        selectedLevel: 'smp',          // 'sd', 'smp', 'sma'
        selectedGrade: '8',            // kelas (misal 1-6 SD, 7-9 SMP, 10-12 SMA)
        subjectTitle: 'Matematika - SMP Kelas 8 (Statistika & Aljabar)'
    };
}

// Dapatkan daftar pemain per tim
function getTeamPlayers(room, teamNum) {
    return room.players.filter(p => p.team === teamNum);
}

// Dapatkan pemain aktif saat ini untuk tim tertentu
function getActivePlayer(room, teamNum) {
    const teamPlayers = getTeamPlayers(room, teamNum);
    if (teamPlayers.length === 0) return null;
    const index = room.turns[teamNum] % teamPlayers.length;
    return teamPlayers[index];
}

// Pindahkan giliran ke pemain berikutnya dalam tim
function advanceTeamTurn(room, teamNum) {
    const teamPlayers = getTeamPlayers(room, teamNum);
    if (teamPlayers.length === 0) {
        room.turns[teamNum] = 0;
        room.currentQuestions[teamNum] = null;
        return null;
    }
    room.turns[teamNum] = (room.turns[teamNum] + 1) % teamPlayers.length;
    const nextPlayer = teamPlayers[room.turns[teamNum]];
    room.currentQuestions[teamNum] = generateQuestionForTeam(room, teamNum);
    return nextPlayer;
}

// Broadcast status room ke Host / Monitor
function broadcastRoomToMonitor(room) {
    if (!room || !room.hostSocketId) return;

    const team1Players = getTeamPlayers(room, 1);
    const team2Players = getTeamPlayers(room, 2);
    const activeP1 = getActivePlayer(room, 1);
    const activeP2 = getActivePlayer(room, 2);

    io.to(room.hostSocketId).emit('update_monitor', {
        pin: room.pin,
        teamNames: room.teamNames,
        team1Players: team1Players.map(p => ({ id: p.id, name: p.name })),
        team2Players: team2Players.map(p => ({ id: p.id, name: p.name })),
        activeP1: activeP1 ? activeP1.name : null,
        activeP2: activeP2 ? activeP2.name : null,
        scores: room.scores,
        scoreDiff: room.scoreDiff,
        isGameRunning: room.isGameRunning,
        isCountingDown: room.isCountingDown,
        remainingTime: room.remainingTime,
        canStart: team1Players.length >= 1 && team2Players.length >= 1 && !room.isGameRunning && !room.isCountingDown,
        subjectConfig: {
            subject: room.selectedSubject,
            level: room.selectedLevel,
            grade: room.selectedGrade,
            title: room.subjectTitle
        }
    });
}

// Broadcast update ke seluruh pemain dalam tim tertentu
function updateTeamPlayersUI(room, teamNum) {
    const teamPlayers = getTeamPlayers(room, teamNum);
    const activePlayer = getActivePlayer(room, teamNum);
    const currentQ = room.currentQuestions[teamNum];

    teamPlayers.forEach((player) => {
        const isMyTurn = activePlayer && player.id === activePlayer.id;

        io.to(player.id).emit('player_game_state', {
            isGameRunning: room.isGameRunning,
            isMyTurn: isMyTurn,
            activePlayerName: activePlayer ? activePlayer.name : '-',
            myTeam: teamNum,
            teamName: room.teamNames[teamNum],
            scores: room.scores,
            scoreDiff: room.scoreDiff,
            remainingTime: room.remainingTime,
            turnOrder: teamPlayers.map((p) => ({
                name: p.name,
                isCurrent: activePlayer && p.id === activePlayer.id,
                isMe: p.id === player.id
            })),
            question: isMyTurn && currentQ ? {
                id: currentQ.id,
                type: currentQ.type || 'numeric',
                text: currentQ.text,
                options: currentQ.options,
                chartSvg: currentQ.chartSvg
            } : null
        });
    });
}

// Akhiri Permainan
function endGame(room, winnerTeam, reason) {
    if (!room.isGameRunning && !room.isCountingDown) return;

    room.isGameRunning = false;
    room.isCountingDown = false;
    if (room.timerInterval) {
        clearInterval(room.timerInterval);
        room.timerInterval = null;
    }

    let winnerName = "";
    let isDraw = false;

    if (winnerTeam === 1) {
        winnerName = room.teamNames[1];
    } else if (winnerTeam === 2) {
        winnerName = room.teamNames[2];
    } else {
        if (room.scoreDiff > 0) {
            winnerTeam = 1;
            winnerName = room.teamNames[1];
        } else if (room.scoreDiff < 0) {
            winnerTeam = 2;
            winnerName = room.teamNames[2];
        } else {
            isDraw = true;
            winnerName = "HASIL SERI";
        }
    }

    const winningMembers = (!isDraw && winnerTeam)
        ? (winnerTeam === 1 ? getTeamPlayers(room, 1).map(p => p.name) : getTeamPlayers(room, 2).map(p => p.name))
        : [];

    const payload = {
        winnerTeam: winnerTeam,
        winnerName: winnerName,
        isDraw: isDraw,
        reason: reason,
        finalScores: room.scores,
        finalDiff: room.scoreDiff,
        teamNames: room.teamNames,
        team1Players: getTeamPlayers(room, 1).map(p => p.name),
        team2Players: getTeamPlayers(room, 2).map(p => p.name),
        winnerMembers: winningMembers
    };

    if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('game_over', payload);
    }
    room.players.forEach(p => {
        io.to(p.id).emit('game_over', payload);
    });

    broadcastRoomToMonitor(room);
}

// Mulai Permainan setelah Countdown
function startGame(room) {
    room.isGameRunning = true;
    room.isCountingDown = false;
    room.scores = { 1: 0, 2: 0 };
    room.scoreDiff = 0;
    room.turns = { 1: 0, 2: 0 };
    room.remainingTime = room.gameDuration;
    room.startTime = Date.now();

    // Buat soal awal untuk kedua tim dengan jaminan anti-contek
    room.currentQuestions[1] = generateQuestionForTeam(room, 1);
    room.currentQuestions[2] = generateQuestionForTeam(room, 2);

    if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('game_start_monitor', {
            startTime: room.startTime,
            duration: room.gameDuration
        });
    }

    // Update UI kedua tim
    updateTeamPlayersUI(room, 1);
    updateTeamPlayersUI(room, 2);
    broadcastRoomToMonitor(room);

    // Kirim bubble pertanyaan awal ke monitor
    if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('update_question_bubbles', {
            p1: room.currentQuestions[1],
            p2: room.currentQuestions[2]
        });
    }

    // Jalankan timer server 1 detik
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = setInterval(() => {
        room.remainingTime--;

        // PERBAIKAN: Broadcast timer_tick ke Monitor DAN ke SELURUH PEMAIN di HP!
        if (room.hostSocketId) {
            io.to(room.hostSocketId).emit('timer_tick', { remainingTime: room.remainingTime });
        }
        room.players.forEach(p => {
            io.to(p.id).emit('timer_tick', { remainingTime: room.remainingTime });
        });

        if (room.remainingTime <= 0) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
            endGame(room, null, 'time_up');
        }
    }, 1000);
}

/* =========================================================
   SOCKET.IO EVENT HANDLER
========================================================= */

io.on('connection', (socket) => {

    function findRoomBySocket() {
        for (const pin in rooms) {
            const r = rooms[pin];
            if (r.hostSocketId === socket.id) return { room: r, isHost: true };
            const p = r.players.find(pl => pl.id === socket.id);
            if (p) return { room: r, player: p, isHost: false };
        }
        return null;
    }

    /* ---------------- HOST / MONITOR EVENTS ---------------- */

    socket.on('join_monitor', async (data) => {
        let pin = typeof data === 'string' ? data : (data && data.pin ? data.pin : null);
        if (!pin || !rooms[pin]) {
            pin = generateUniquePIN();
            rooms[pin] = createRoom(pin);
        }

        const room = rooms[pin];
        room.hostSocketId = socket.id;

        // Tentukan Base URL untuk QR Code & Tautan Join:
        // 1. Jika di-deploy di Cloud / Render.com (domain publik selain localhost)
        // 2. Jika ada variabel RENDER_EXTERNAL_URL dari Render
        // 3. Fallback: IP Lokal Wi-Fi (untuk pengujian offline/lokal)
        const clientOrigin = (data && typeof data === 'object' && data.origin) ? data.origin : '';
        const isClientPublic = clientOrigin && !clientOrigin.includes('localhost') && !clientOrigin.includes('127.0.0.1');

        let baseUrl = '';
        if (isClientPublic) {
            baseUrl = clientOrigin;
        } else if (process.env.RENDER_EXTERNAL_URL) {
            baseUrl = process.env.RENDER_EXTERNAL_URL;
        } else if (process.env.PUBLIC_URL) {
            baseUrl = process.env.PUBLIC_URL;
        } else {
            const localIp = getLocalIP();
            baseUrl = `http://${localIp}:${PORT}`;
        }

        const joinUrl = `${baseUrl.replace(/\/$/, '')}?pin=${pin}`;

        let qrDataUrl = '';
        try {
            qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 260, margin: 2 });
        } catch (e) {
            console.error("QR Error:", e);
        }

        // Ambil daftar subjek kustom yang tersedia
        const customSubjects = Object.keys(customBank);

        socket.emit('monitor_joined_success', {
            pin: pin,
            joinUrl: joinUrl,
            qr: qrDataUrl,
            teamNames: room.teamNames,
            isGameRunning: room.isGameRunning,
            remainingTime: room.remainingTime,
            subjectConfig: {
                subject: room.selectedSubject,
                level: room.selectedLevel,
                grade: room.selectedGrade,
                title: room.subjectTitle
            },
            availableCustomSubjects: customSubjects
        });

        broadcastRoomToMonitor(room);
        console.log(`[HOST CONNECTED] Room PIN: ${pin} | Host ID: ${socket.id}`);
    });

    // Host update konfigurasi subjek soal & tingkat kelas
    socket.on('host_update_settings', (config) => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        if (room.isGameRunning) return;

        if (config.subject) room.selectedSubject = config.subject;
        if (config.level) room.selectedLevel = config.level;
        if (config.grade) room.selectedGrade = config.grade;
        if (config.duration) {
            const dur = parseInt(config.duration);
            if (!isNaN(dur) && dur >= 30) {
                room.gameDuration = dur;
                room.remainingTime = dur;
            }
        }
        if (config.title) room.subjectTitle = config.title;

        console.log(`[CONFIG UPDATED] Room ${room.pin} -> ${room.subjectTitle} (${room.gameDuration}s)`);
        broadcastRoomToMonitor(room);
    });

    // Host mengimpor soal dari Excel / CSV / Google Sheets
    socket.on('host_import_questions', (payload) => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;

        const { subjectName, questions } = payload;
        if (!subjectName || !Array.isArray(questions) || questions.length === 0) {
            socket.emit('error_msg', 'Format bank soal tidak valid atau kosong!');
            return;
        }

        const cleanSubject = subjectName.trim();
        customBank[cleanSubject] = questions.map((q, idx) => ({
            id: `custom_${cleanSubject}_${idx}_${Date.now()}`,
            type: q.type || (q.options && q.options.length > 0 ? 'choice' : 'numeric'),
            text: q.text,
            options: q.options || undefined,
            answer: q.answer
        }));

        saveCustomBank(customBank);

        const customSubjects = Object.keys(customBank);
        io.emit('custom_subjects_updated', {
            availableCustomSubjects: customSubjects,
            importedSubject: cleanSubject,
            count: questions.length
        });

        socket.emit('import_success', {
            subject: cleanSubject,
            count: questions.length
        });

        console.log(`[SOAL DIIMPOR] Subjek "${cleanSubject}" berhasil ditambahkan (${questions.length} soal).`);
    });

    // Host update nama tim
    socket.on('host_update_team_names', (data) => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        if (room.isGameRunning) return;

        if (data.team1Name && data.team1Name.trim()) {
            room.teamNames[1] = data.team1Name.trim().substring(0, 30);
        }
        if (data.team2Name && data.team2Name.trim()) {
            room.teamNames[2] = data.team2Name.trim().substring(0, 30);
        }

        broadcastRoomToMonitor(room);
        updateTeamPlayersUI(room, 1);
        updateTeamPlayersUI(room, 2);
    });

    // Host kick player
    socket.on('host_kick_player', (playerId) => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        const playerIdx = room.players.findIndex(p => p.id === playerId);
        if (playerIdx !== -1) {
            const p = room.players[playerIdx];
            const teamNum = p.team;

            io.to(p.id).emit('you_are_kicked');
            room.players.splice(playerIdx, 1);

            if (room.isGameRunning) {
                const teamPlayers = getTeamPlayers(room, teamNum);
                if (teamPlayers.length === 0) {
                    const winTeam = teamNum === 1 ? 2 : 1;
                    endGame(room, winTeam, 'player_empty');
                    return;
                } else {
                    advanceTeamTurn(room, teamNum);
                }
                updateTeamPlayersUI(room, teamNum);
            }

            broadcastRoomToMonitor(room);
        }
    });

    // Host inisialisasi mulai pertandingan (Countdown 5 detik)
    socket.on('host_init_start', () => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        const t1 = getTeamPlayers(room, 1);
        const t2 = getTeamPlayers(room, 2);

        if (t1.length < 1 || t2.length < 1) {
            socket.emit('error_msg', 'Kedua tim harus memiliki minimal 1 pemain!');
            return;
        }

        if (room.isGameRunning || room.isCountingDown) return;

        room.isCountingDown = true;

        const countdownSeconds = 5;
        io.to(room.hostSocketId).emit('start_countdown', countdownSeconds);
        room.players.forEach(p => {
            io.to(p.id).emit('start_countdown', countdownSeconds);
        });

        setTimeout(() => {
            if (room.isCountingDown) {
                startGame(room);
            }
        }, countdownSeconds * 1000);
    });

    // Host Reset Game kembali ke Lobby
    socket.on('host_reset_game', () => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        if (room.timerInterval) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
        }

        room.isGameRunning = false;
        room.isCountingDown = false;
        room.scores = { 1: 0, 2: 0 };
        room.scoreDiff = 0;
        room.turns = { 1: 0, 2: 0 };
        room.currentQuestions = { 1: null, 2: null };
        room.recentQuestions = { 1: [], 2: [] };
        room.remainingTime = room.gameDuration;

        io.to(room.hostSocketId).emit('reset_game_monitor');
        room.players.forEach(p => {
            io.to(p.id).emit('reset_to_lobby', {
                teamName: room.teamNames[p.team],
                team: p.team
            });
        });

        broadcastRoomToMonitor(room);
        updateTeamPlayersUI(room, 1);
        updateTeamPlayersUI(room, 2);
    });

    // Host Keluar Game (Keluarkan semua ke menu utama)
    socket.on('host_quit_game', () => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        if (room.timerInterval) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
        }

        io.to(room.hostSocketId).emit('force_reload_page');
        room.players.forEach(p => {
            io.to(p.id).emit('force_reload_page');
        });

        delete rooms[room.pin];
    });

    // Host kembali ke Menu Utama / Lobi Awal (Keluarkan semua ke menu utama)
    socket.on('host_return_to_main_menu', () => {
        const found = findRoomBySocket();
        if (!found || !found.isHost) return;
        const room = found.room;

        if (room.timerInterval) {
            clearInterval(room.timerInterval);
            room.timerInterval = null;
        }

        io.to(room.hostSocketId).emit('all_return_to_main_menu');
        room.players.forEach(p => {
            io.to(p.id).emit('all_return_to_main_menu');
        });

        delete rooms[room.pin];
        console.log(`[ROOM CLOSED] Room PIN ${room.pin} ditutup. Seluruh peserta kembali ke Menu Utama.`);
    });

    /* ---------------- PLAYER EVENTS ---------------- */

    // Validasi PIN sebelum join
    socket.on('check_pin', (pin) => {
        const room = rooms[pin];
        if (!room) {
            socket.emit('check_pin_result', { success: false, msg: 'Kode Game (PIN) tidak ditemukan!' });
            return;
        }
        if (room.isGameRunning) {
            socket.emit('check_pin_result', { success: false, msg: 'Game sedang berlangsung! Tunggu putaran selesai.' });
            return;
        }

        const t1Count = getTeamPlayers(room, 1).length;
        const t2Count = getTeamPlayers(room, 2).length;

        socket.emit('check_pin_result', {
            success: true,
            pin: pin,
            teamNames: room.teamNames,
            team1Count: t1Count,
            team2Count: t2Count,
            maxPerTeam: room.maxPerTeam,
            subjectTitle: room.subjectTitle
        });
    });

    // Player Join Game
    socket.on('join_player', (data) => {
        const { pin, name, team } = data;
        const room = rooms[pin];

        if (!room) {
            socket.emit('error_msg', 'Game Room tidak ditemukan!');
            return;
        }
        if (room.isGameRunning) {
            socket.emit('error_msg', 'Game sedang berlangsung, tidak bisa masuk sekarang.');
            return;
        }

        const teamNum = parseInt(team);
        if (teamNum !== 1 && teamNum !== 2) {
            socket.emit('error_msg', 'Tim yang dipilih tidak valid!');
            return;
        }

        const cleanName = (name || '').trim().substring(0, 25);
        if (!cleanName) {
            socket.emit('error_msg', 'Nama tidak boleh kosong!');
            return;
        }

        const teamPlayers = getTeamPlayers(room, teamNum);
        if (teamPlayers.length >= room.maxPerTeam) {
            socket.emit('error_msg', `Kapasitas ${room.teamNames[teamNum]} sudah penuh (maks ${room.maxPerTeam} orang)!`);
            return;
        }

        const newPlayer = {
            id: socket.id,
            name: cleanName,
            team: teamNum,
            score: 0
        };
        room.players.push(newPlayer);

        socket.emit('player_joined_success', {
            pin: pin,
            name: cleanName,
            team: teamNum,
            teamName: room.teamNames[teamNum],
            subjectTitle: room.subjectTitle
        });

        if (room.hostSocketId) {
            io.to(room.hostSocketId).emit('monitor_player_joined', {
                name: cleanName,
                team: teamNum
            });
        }

        broadcastRoomToMonitor(room);
        updateTeamPlayersUI(room, 1);
        updateTeamPlayersUI(room, 2);

        console.log(`[PLAYER JOINED] ${cleanName} masuk ke ${room.teamNames[teamNum]} (Room ${pin})`);
    });

    // Player Leave Game (Kembali ke Halaman Awal secara sukarela)
    socket.on('player_leave', () => {
        const found = findRoomBySocket();
        if (!found || found.isHost) return;
        const { room, player } = found;

        const teamNum = player.team;
        const wasActive = getActivePlayer(room, teamNum)?.id === player.id;

        room.players = room.players.filter(p => p.id !== socket.id);
        socket.emit('player_left_success');

        if (room.isGameRunning) {
            const remainingInTeam = getTeamPlayers(room, teamNum);
            if (remainingInTeam.length === 0) {
                const winTeam = teamNum === 1 ? 2 : 1;
                endGame(room, winTeam, 'player_empty');
                return;
            } else if (wasActive) {
                advanceTeamTurn(room, teamNum);
                if (room.hostSocketId) {
                    io.to(room.hostSocketId).emit('update_single_bubble', {
                        team: teamNum,
                        question: room.currentQuestions[teamNum]
                    });
                }
            }
            updateTeamPlayersUI(room, teamNum);
        }

        broadcastRoomToMonitor(room);
        console.log(`[PLAYER LEFT] ${player.name} keluar dari Room ${room.pin}`);
    });

    // Player Submit Jawaban (Mendukung tipe angka & pilihan ganda)
    socket.on('submit_answer', (data) => {
        const found = findRoomBySocket();
        if (!found || found.isHost) return;
        const { room, player } = found;

        if (!room.isGameRunning) return;

        const teamNum = player.team;
        const activePlayer = getActivePlayer(room, teamNum);

        if (!activePlayer || activePlayer.id !== player.id) {
            socket.emit('error_msg', 'Bukan giliranmu untuk menjawab!');
            return;
        }

        const currentQ = room.currentQuestions[teamNum];
        if (!currentQ) return;

        let isCorrect = false;
        const rawAns = (data.answer !== undefined && data.answer !== null) ? String(data.answer).trim() : '';

        if (currentQ.type === 'choice') {
            // Evaluasi Pilihan Ganda (case-insensitive)
            isCorrect = rawAns.toLowerCase() === String(currentQ.answer).trim().toLowerCase();
        } else {
            // Evaluasi Numerik
            const playerAns = parseInt(rawAns, 10);
            const targetAns = parseInt(currentQ.answer, 10);
            isCorrect = !isNaN(playerAns) && playerAns === targetAns;
        }

        if (isCorrect) {
            room.scores[teamNum]++;
            room.scoreDiff = room.scores[1] - room.scores[2];
        }

        // Kirim feedback ke player
        socket.emit('player_feedback', {
            isCorrect: isCorrect,
            answerVal: rawAns,
            correctAnswer: currentQ.answer
        });

        // Kirim feedback ke monitor
        if (room.hostSocketId) {
            io.to(room.hostSocketId).emit('monitor_feedback_popup', {
                team: teamNum,
                player: player.name,
                isCorrect: isCorrect,
                answerVal: rawAns,
                scoreDiff: room.scoreDiff,
                scores: room.scores
            });
        }

        // Cek Kondisi Kemenangan Selisih 3 Poin
        if (room.scoreDiff >= 3) {
            endGame(room, 1, 'score_diff');
            return;
        } else if (room.scoreDiff <= -3) {
            endGame(room, 2, 'score_diff');
            return;
        }

        // Oper giliran ke rekan berikutnya
        advanceTeamTurn(room, teamNum);

        // Update bubble soal baru di monitor
        if (room.hostSocketId) {
            io.to(room.hostSocketId).emit('update_single_bubble', {
                team: teamNum,
                question: room.currentQuestions[teamNum]
            });
        }

        updateTeamPlayersUI(room, teamNum);
        broadcastRoomToMonitor(room);
    });

    /* ---------------- DISCONNECT ---------------- */
    socket.on('disconnect', () => {
        const found = findRoomBySocket();
        if (!found) return;

        const { room, isHost, player } = found;

        if (isHost) {
            console.log(`[HOST DISCONNECTED] Room PIN: ${room.pin}`);
            room.hostSocketId = null;
        } else if (player) {
            console.log(`[PLAYER DISCONNECTED] ${player.name} (${player.id}) terputus dari Room ${room.pin}`);
            const teamNum = player.team;
            const wasActive = getActivePlayer(room, teamNum)?.id === player.id;

            room.players = room.players.filter(p => p.id !== socket.id);

            if (room.isGameRunning) {
                const remainingInTeam = getTeamPlayers(room, teamNum);
                if (remainingInTeam.length === 0) {
                    const winTeam = teamNum === 1 ? 2 : 1;
                    endGame(room, winTeam, 'player_empty');
                    return;
                } else if (wasActive) {
                    advanceTeamTurn(room, teamNum);
                    if (room.hostSocketId) {
                        io.to(room.hostSocketId).emit('update_single_bubble', {
                            team: teamNum,
                            question: room.currentQuestions[teamNum]
                        });
                    }
                }
                updateTeamPlayersUI(room, teamNum);
            }

            broadcastRoomToMonitor(room);
        }
    });

});

// Jalankan Server
server.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalIP();
    console.log('\n========================================================');
    console.log('🎉 GAME TARIK TAMBANG OTAK (BATTLE OF BRAINS) ONLINE SIAP!');
    console.log(`💻 Monitor / Laptop (Host) : http://localhost:${PORT}`);
    console.log(`📱 Smartphone (Pemain)     : http://${localIp}:${PORT}`);
    console.log('========================================================\n');
});
