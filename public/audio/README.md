# 🎵 Panduan Menambahkan Musik & Efek Suara (Audio Custom)
### Game Tarik Tambang Otak (Battle of Brains Online)

Folder ini khusus disediakan untuk memasukkan file musik latar (BGM) dan efek suara (SFX) pilihan Anda sendiri.

---

## 📁 Daftar Lengkap File Audio yang Didukung

Game ini otomatis mengenali 6 file audio berikut:

### 1. 🎶 Musik Latar (BGM)
| Nama File | Suasana | Kapan Dimainkan? |
| :--- | :--- | :--- |
| **`lobby.mp3`** | **Santai & Rileks** | Saat pemain berada di **Menu Utama / Lobby**, memilih tim, atau menunggu game dimulai. |
| **`match.mp3`** | **Tegang & Memacu Adrenalin** | Saat pertandingan resmi dimulai (**"GO!"**) hingga peluit akhir berbunyi. |

### 2. 🔔 Efek Suara (SFX)
| Nama File | Keterangan | Kapan Dimainkan? |
| :--- | :--- | :--- |
| **`correct.mp3`** | **Jawaban Benar** | Diputar saat seorang pemain berhasil menjawab soal dengan benar. |
| **`wrong.mp3`** | **Jawaban Salah** | Diputar saat jawaban pemain salah / keliru. |
| **`join.mp3`** | **Pemain Masuk** | Diputar di monitor saat ada pemain baru masuk ke tim. |
| **`win.mp3`** | **Kemenangan / Juara** | Diputar saat pertandingan selesai dan tim pemenang diumumkan. |

---

## 🚀 Langkah-Langkah Memasang:
1. Pastikan nama file audio Anda persis seperti tabel di atas (menggunakan huruf kecil semua):
   - `lobby.mp3`
   - `match.mp3`
   - `correct.mp3`
   - `wrong.mp3`
   - `join.mp3`
   - `win.mp3`
2. Pindahkan/Copy file tersebut ke dalam folder:
   ```
   public/audio/
   ```
3. Refresh halaman game di browser (**F5**).
4. Klik sekali pada layar browser atau klik tombol ikon musik (`🎵`) untuk mengaktifkan audio.
5. **Selesai!** Seluruh musik dan efek suara custom Anda akan langsung berputar secara otomatis.

---

## 🛡️ Fitur Cadangan Otomatis (*Smart Fallback*)
Jika ada salah satu file yang belum Anda masukkan, sistem game **tidak akan error atau hening**, melainkan otomatis beralih memutar suara synthesizer bawaan secara mulus.
