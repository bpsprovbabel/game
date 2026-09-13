========================================================================
         PANDUAN LENGKAP MENAMBAHKAN AUDIO & MUSIK SENDIRI
                 GAME TARIK TAMBANG OTAK ONLINE
========================================================================

Folder ini khusus disediakan bagi Anda untuk memasukkan file musik dan efek 
suara (SFX) pilihan Anda sendiri ke dalam game!

------------------------------------------------------------------------
1. DAFTAR FILE AUDIO YANG DIDUKUNG:
------------------------------------------------------------------------

A. MUSIK LATAR (BACKGROUND MUSIC / BGM):
   1. lobby.mp3
      -> Musik santai saat pemain di Lobby / Menu Utama atau memilih tim.
   2. match.mp3
      -> Musik tegang, bersemangat, dan seru saat pertandingan berlangsung.

B. EFEK SUARA (SOUND EFFECTS / SFX):
   3. correct.mp3
      -> Efek suara ceria saat pemain menjawab soal dengan BENAR.
   4. wrong.mp3
      -> Efek suara buzzer saat pemain menjawab SALAH.
   5. join.mp3
      -> Efek suara notifikasi saat ada pemain baru BERGABUNG ke tim.
   6. win.mp3
      -> Musik/fanfare perayaan saat ada tim yang KELUAR SEBAGAI JUARA.

------------------------------------------------------------------------
2. CARA MEMASANG:
------------------------------------------------------------------------
1. Siapkan file audio berformat MP3 (.mp3).
2. Beri nama file persis seperti daftar di atas (huruf kecil semua):
   - lobby.mp3
   - match.mp3
   - correct.mp3
   - wrong.mp3
   - join.mp3
   - win.mp3
3. Simpan / Paste file-file tersebut langsung ke dalam folder ini (`public/audio/`).
4. Refresh browser game (F5).
5. Selesai! Game akan langsung otomatis mengenali dan memutar audio pilihan Anda!

------------------------------------------------------------------------
3. FITUR CERDAS (AUTO-FALLBACK & AUTO-LOOP):
------------------------------------------------------------------------
- Auto-Loop:
  File `lobby.mp3` dan `match.mp3` akan berputar secara berulang (looping)
  tanpa jeda selama fase permainan berlangsung.
- Fallback Cerdas (Tidak Akan Error/Hening):
  Jika salah satu atau semua file di atas belum Anda masukkan, game 
  secara otomatis akan memutar efek suara dan synthesizer bawaan.

Selamat bermain dan menikmati pertandingan Tarik Tambang Otak! 🎮🧠🚩
========================================================================
