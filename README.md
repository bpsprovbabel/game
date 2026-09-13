# 🎮 Game Tarik Tambang Otak (Battle of Brains Online)
> **Game Edukasi Interaktif Multiplayer Real-Time berbasis Web, Node.js, dan Socket.io**  
> Cocok untuk kuis interaktif kantor, sekolah, pelatihan, lomba Agustusan, maupun acara kebersamaan instansi/perusahaan.

---

## 📑 Daftar Isi
1. [Fitur Utama](#-fitur-utama)
2. [Cara Menjalankan Secara Lokal (Offline / Wi-Fi)](#-cara-menjalankan-secara-lokal-offline--wi-fi)
3. [Cara Memainkan Game](#-cara-memainkan-game)
4. [Cara Hosting Online (Bisa Dimainkan via Internet)](#-cara-hosting-online-bisa-dimainkan-via-internet)
   - [Opsi A: Deploy Gratis di Cloud (Render.com / Railway)](#opsi-a-deploy-gratis-di-cloud-rendercom--railway-sangat-direkomendasikan)
   - [Opsi B: Online Instan dari Laptop (Tanpa Sewa Server)](#opsi-b-online-instan-dari-laptop-sendiri-via-localtunnel--ngrok)
   - [Opsi C: Deploy di VPS Linux / Server Instansi (PM2 & Nginx)](#opsi-c-deploy-di-vps-linux-atau-server-instansi-pm2)
5. [Panduan Kustomisasi](#-panduan-kustomisasi)
   - [Mengganti Musik Custom](#1-mengganti-musik-custom-sendiri)
   - [Mengganti Logo Instansi](#2-mengganti-logo-instansi)
   - [Upload Bank Soal Sendiri (Excel / CSV)](#3-upload-bank-soal-sendiri-excel--csv)
6. [Struktur Folder Proyek](#-struktur-folder-proyek)
7. [Troubleshooting & Tanya Jawab (FAQ)](#-troubleshooting--tanya-jawab-faq)

---

## 🌟 Fitur Utama

- 👥 **Multiplayer Real-Time**: Mendukung hingga **20 vs 20 pemain** (total 40 pemain per ronde).
- 💻📱 **Sistem Dual-Display**: 
  - **Layar Laptop / Proyektor (Host)**: Menampilkan arena tarik tambang, grafik visual SVG, bendera dinamis, timer, dan papan skor.
  - **Smartphone Peserta (Pemain)**: Berfungsi sebagai *controller* interaktif dengan Touch Numpad & tombol Pilihan Ganda (A, B, C, D).
- 🧠 **Bank Soal Sangat Luas (10.000+ Kombinasi Tiap Subjek)**:
  - **Pengetahuan Umum**: 100% Pilihan Ganda (Tebak Tokoh Terkenal, Rebus Gambar Visual SVG, Landmark Dunia, Teka-teki Lucu, Kuliner Nusantara 38 Provinsi, Sains Populer).
  - **Matematika SD (Kelas 1 - 6)**: Operasi dasar, FPB/KPK, bangun datar, pecahan, rata-rata, skala peta.
  - **Matematika SMP (Kelas 7 - 9)**: Aljabar, phytagoras, fungsi, statistika visual diagram batang SVG.
  - **Matematika SMA (Kelas 10 - 12)**: Logaritma, trigonometri, matriks, turunan/integral, kuartil, histogram visual.
  - **BPS (Badan Pusat Statistik)**: Indikator makro (Inflasi, IPM, TPT, Kemiskinan), 38 Provinsi lengkap, Sensus (SP, ST, SE).
  - **Pengetahuan Custom**: Import soal kustom sendiri dari file Excel (`.xlsx`), CSV, atau link Google Sheets.
- 🔀 **Anti-Contek & Anti-Kunci 'A'**: Opsi jawaban diacak otomatis (*Fisher-Yates Shuffle*), dan Tim 1 vs Tim 2 tidak akan mendapatkan soal yang sama secara bersamaan.
- 🏆 **Roster Pemenang & Auto-Return**: Menampilkan daftar nama pemain tim juara dan countdown otomatis kembali ke lobby.
- 🎵 **Dukungan Musik Custom & BGM Khusus**: Suasana musik berbeda antara di Lobby (santai) dan Pertandingan (tegang/seru), mendukung MP3 sendiri.
- 🏛️ **Logo Fleksibel**: Logo resmi BPS Provinsi Kepulauan Bangka Belitung bawaan yang dapat diganti kapan saja tanpa ubah kode.

---

## 💻 Cara Menjalankan Secara Lokal (Offline / Wi-Fi)

Menjalankan game di satu ruangan (misal di aula, kelas, atau ruang rapat) menggunakan satu laptop sebagai Host dan smartphone peserta melalui jaringan Wi-Fi lokal atau Hotspot HP.

### 1. Persyaratan Sistem
Pastikan di laptop Anda sudah terinstal:
- **Node.js** (versi 16.x atau yang lebih baru).  
  *Jika belum punya, unduh gratis di [https://nodejs.org/](https://nodejs.org/) (pilih versi LTS).*

### 2. Langkah Menjalankan:
1. Buka folder proyek ini di komputer Anda.
2. Buka **Command Prompt (CMD)** atau **PowerShell** di folder tersebut (bisa dengan klik kanan > *Open in Terminal*, atau ketik `cmd` di address bar folder Windows).
3. Jika baru pertama kali mengunduh proyek, instal dependensinya terlebih dahulu:
   ```bash
   npm install
   ```
4. Jalankan server game:
   ```bash
   npm start
   ```
   *(atau `node server.js`)*

5. Terminal akan menampilkan tulisan sukses beserta alamat aksesnya:
   ```text
   ========================================================
   🎉 GAME TARIK TAMBANG OTAK (BATTLE OF BRAINS) ONLINE SIAP!
   💻 Monitor / Laptop (Host) : http://localhost:3000
   📱 Smartphone (Pemain)     : http://192.168.100.41:3000
   ========================================================
   ```

### 3. Cara Menghentikan (STOP) Server Game:
- **Di Jendela CMD / PowerShell**:  
  Tekan kombinasi tombol keyboard: **`Ctrl` + `C`**  
  *(Jika muncul pertanyaan `Terminate batch job (Y/N)?`, ketik **`Y`** lalu tekan Enter)*.

- **Jika Muncul Error `listen EADDRINUSE: address already in use 0.0.0.0:3000`**:  
  Error ini terjadi karena server sebelumnya masih aktif berjalan di background atau jendela terminal ditutup paksa tanpa di-stop terlebih dahulu.
  Untuk mematikan proses tersebut dan membebaskan port 3000, ketik perintah ini di PowerShell / CMD:
  ```powershell
  taskkill /F /IM node.exe
  ```
  Setelah itu, Anda bisa mengetik `npm start` kembali dengan normal!

---

## 📱 Cara Memainkan Game

### Langkah 1: Hubungkan ke Jaringan yang Sama
- Pastikan Laptop Host dan Smartphone semua pemain terhubung ke **Wi-Fi yang sama**.
- *Alternatif tanpa Wi-Fi*: Nyalakan **Hotspot Tethering** dari salah satu HP atau dari Laptop, lalu hubungkan semua HP peserta ke hotspot tersebut.

### Langkah 2: Di Laptop / Proyektor (Host)
1. Buka browser (Google Chrome / Edge) dan ketik: `http://localhost:3000`
2. Klik tombol **"LAYAR MONITOR"**.
3. Layar akan menampilkan **PIN Room** dan **QR Code** besar.
4. Host dapat memilih subjek soal via tombol **"⚙️ Ganti Soal"**, mengatur durasi ronde, atau mengubah nama Tim.

### Langkah 3: Di Smartphone Peserta (Pemain)
1. Scan QR Code di layar monitor menggunakan kamera HP, **ATAU** buka browser HP dan ketik alamat IP lokal yang tertera di monitor (contoh: `http://192.168.100.41:3000`).
2. Pilih menu **"PEMAIN / HP"**.
3. Masukkan **Kode PIN**, ketik **Nama Pemain**, dan pilih bergabung ke **Tim Merah** atau **Tim Biru**.

### Langkah 4: Mulai Pertandingan
- Setelah pemain masuk, Host menekan tombol **"MULAI PERTANDINGAN 🚀"**.
- Hitung mundur 3.. 2.. 1.. **GO!**
- Peserta menjawab soal di HP secepat mungkin untuk menarik tambang ke arah tim mereka!

---

## 🌐 Cara Hosting Online (Bisa Dimainkan via Internet)

Jika Anda ingin mengadakan kuis/turnamen di mana peserta berada di rumah masing-masing (jarak jauh via Zoom / Google Meet / YouTube Live):

### OPSI A: Deploy Gratis di Cloud (Render.com / Railway) — *SANGAT DIREKOMENDASIKAN*

Platform cloud modern gratis yang sangat mudah digunakan:

#### Langkah Deploy di Render.com:
1. Buat akun gratis di **[Render.com](https://render.com/)**.
2. Unggah (push) kode proyek game ini ke akun **GitHub** Anda.
3. Di dashboard Render, klik **New +** > pilih **Web Service**.
4. Hubungkan repository GitHub game Anda.
5. Konfigurasi pengaturannya:
   - **Name**: `tarik-tambang-otak` *(atau nama bebas)*
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free`
6. Klik **Create Web Service**.
7. Tunggu sekitar 1-2 menit hingga proses build selesai.
8. Anda akan mendapatkan URL HTTPS publik resmi, misalnya:  
   👉 `https://tarik-tambang-otak.onrender.com`
9. Siap! Buka URL tersebut di laptop Host, dan bagikan URL tersebut ke seluruh pemain di mana saja tanpa perlu satu Wi-Fi!

---

### OPSI B: Online Instan dari Laptop Sendiri (via LocalTunnel / Ngrok)

Jika Anda ingin langsung online **tanpa perlu upload ke GitHub atau sewa server**, Anda bisa menggunakan *tunneling*:

#### Cara Menggunakan LocalTunnel (Gratis & Tanpa Daftar):
1. Pastikan server lokal Anda sudah berjalan (`npm start`).
2. Buka jendela terminal / PowerShell **baru**, lalu jalankan:
   ```bash
   npx localtunnel --port 3000
   ```
3. Anda akan langsung mendapatkan URL publik, contoh:
   `https://curvy-rivers-dance.loca.lt`
4. Bagikan link tersebut ke pemain Anda!

#### Cara Menggunakan Ngrok:
1. Unduh ngrok dari [ngrok.com](https://ngrok.com/).
2. Jalankan:
   ```bash
   ngrok http 3000
   ```
3. Salin URL `Forwarding` (`https://xxxx.ngrok-free.app`) dan bagikan ke pemain.

---

### OPSI C: Deploy di VPS Linux atau Server Instansi (PM2 & Nginx)

Jika Anda memiliki VPS / server sendiri (misal Ubuntu Server di instansi/kantor BPS):

1. **Clone repository dan install dependensi**:
   ```bash
   git clone <repo-url> /var/www/tarik-tambang
   cd /var/www/tarik-tambang
   npm install --production
   ```
2. **Jalankan sebagai service latar belakang menggunakan PM2**:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "tarik-tambang"
   pm2 save
   pm2 startup
   ```
3. **Konfigurasi Reverse Proxy Nginx (Opsional / Rekomendasi)**:
   ```nginx
   server {
       listen 80;
       server_name game.bpsbabel.id;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
4. Pasang SSL gratis via Certbot (`sudo certbot --nginx -d game.bpsbabel.id`).

---

## 🎨 Panduan Kustomisasi

### 1. Mengganti Musik Custom Sendiri
Folder: **`public/audio/`**
- Letakkan file musik Anda di folder `public/audio/` dengan nama:
  - **`lobby.mp3`** : Musik santai untuk di Lobby / Menu Utama.
  - **`match.mp3`** : Musik bersemangat & menegangkan saat pertandingan berlangsung.
- Game otomatis memutar lagu kustom Anda secara berulang (*looping*). Jika file belum ada, game otomatis memakai suara synthesizer bawaan.
- Panduan lengkap tersedia di: [`public/audio/README.txt`](public/audio/README.txt).

### 2. Mengganti Logo Instansi
Folder: **`public/images/`**
- Saat ini menggunakan logo resmi **BPS Provinsi Kepulauan Bangka Belitung** (`logo.svg`).
- Untuk mengganti dengan logo instansi lain kapan saja:
  - Simpan logo baru Anda di folder `public/images/` dengan nama **`logo.png`** atau **`logo.svg`**.
  - Refresh browser (`F5`). Logo akan langsung berganti di Menu Utama dan Monitor!
- Panduan lengkap tersedia di: [`public/images/README.txt`](public/images/README.txt).

### 3. Upload Bank Soal Sendiri (Excel / CSV)
- Buka Monitor Host > klik tombol **"📂 Bank Soal"**.
- Anda dapat mengunduh **Template CSV** yang sudah disediakan, mengisinya dengan soal Anda sendiri, lalu mengunggahnya kembali.
- Mendukung tipe soal Pilihan Ganda (A, B, C, D) maupun Isian Singkat / Angka.
- Soal yang diunggah akan otomatis tersimpan sebagai subjek **"Pengetahuan Custom"**.

---

## 📂 Struktur Folder Proyek

```text
game-tarik-tambang-online/
├── server.js               # Backend Node.js & Socket.io (Logika Game, Generator Soal)
├── package.json            # Daftar dependensi & script npm
├── README.md               # Dokumentasi lengkap proyek
├── public/                 # Frontend (Aset Publik Game)
│   ├── index.html          # Halaman utama game (Lobby, Monitor, Controller HP)
│   ├── css/
│   │   └── style.css       # Desain UI responsif, animasi, & layout smartphone
│   ├── js/
│   │   ├── client.js       # Logika interaksi frontend & komunikasi socket
│   │   └── sound.js        # Pengendali audio (Web Audio Synth & Custom Audio Loader)
│   ├── audio/              # 🎵 Folder Khusus Musik Custom
│   │   ├── README.txt      # Panduan menambahkan musik
│   │   ├── README.md       # Panduan format Markdown
│   │   ├── lobby.mp3       # (Opsional) Musik lobi pilihan Anda
│   │   └── match.mp3       # (Opsional) Musik match pilihan Anda
│   └── images/             # 🏛️ Folder Logo & Gambar
│       ├── README.txt      # Panduan mengganti logo
│       ├── README.md       # Panduan format Markdown
│       └── logo.svg        # Logo resmi BPS Babel (bisa ditimpa logo.png)
└── questions/              # Penyimpanan bank soal kustom (JSON)
```

---

## ❓ Troubleshooting & Tanya Jawab (FAQ)

#### Q1: HP pemain tidak bisa membuka alamat IP laptop di browser?
- **Penyebab 1**: Laptop dan HP tidak berada di Wi-Fi yang sama. Pastikan keduanya terhubung ke Wi-Fi / Hotspot yang sama.
- **Penyebab 2**: Terblokir oleh Windows Firewall.
  - *Solusi*: Buka Windows Defender Firewall > izinkan aplikasi **Node.js** untuk jaringan Private. Atau gunakan Hotspot Tethering dari HP.

#### Q2: Suara musik tidak otomatis bunyi saat game dibuka?
- **Penyebab**: Kebijakan browser modern melarang suara diputar otomatis (*autoplay policy*) sebelum ada interaksi klik dari pengguna.
- *Solusi*: Cukup klik sekali di mana saja pada layar atau klik tombol ikon musik (`🎵`) di pojok atas.

#### Q3: Apakah bisa dimainkan jika pemain berada di kota yang berbeda?
- **Bisa!** Gunakan panduan [Opsi A (Render.com)](#opsi-a-deploy-gratis-di-cloud-rendercom--railway-sangat-direkomendasikan) atau [Opsi B (LocalTunnel)](#opsi-b-online-instan-dari-laptop-sendiri-via-localtunnel--ngrok). Pemain cukup membuka link website dari mana saja tanpa perlu satu jaringan.

#### Q4: Muncul error "Error: listen EADDRINUSE: address already in use 0.0.0.0:3000"?
- **Penyebab**: Server game sebelumnya masih aktif berjalan di background atau jendela terminal sebelumnya ditutup tanpa di-stop terlebih dahulu (`Ctrl + C`), sehingga Port 3000 masih terkunci.
- **Solusi**: Buka CMD / PowerShell dan ketik perintah berikut:
  ```powershell
  taskkill /F /IM node.exe
  ```
  Perintah ini akan langsung mematikan proses Node.js yang tertahan dan membebaskan Port 3000 seketika. Setelah itu ketik `npm start` kembali.

---
Dikembangkan dengan ❤️ untuk edukasi interaktif dan kebersamaan. Selamat bertanding! 🧠🚩

