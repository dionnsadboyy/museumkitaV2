# Museum Kita v2

Arsip personal Dion & Chelsea. HTML/CSS/JavaScript statis; tidak memerlukan build untuk hosting. Cerita, foto, video asli, dan urutan galeri berada di `data.js` dan `assets/`.

Jalankan lokal:

```sh
npm install
npm start
```

Buka `http://127.0.0.1:4173`. Pada PowerShell yang memblokir `npm.ps1`, gunakan `npm.cmd`.

Player musik memakai playlist terpusat di `music-playlist.js`: `src`, `title`, `artist`, dan `cover`. Path `window.MuseumMusicCover` mengatur cover sementara bersama: thumbnail foto piknik asli `painting-date2.webp`, dengan crop `50% 72%`. Tidak ada aset foto baru atau kompresi ulang. Lagu awal adalah **Panasea — rumahsakit**, berdasarkan nama file; tidak ada tag judul/artis atau artwork tertanam. Sumber `.mp3` sebenarnya berisi AAC/MP4 terfragmentasi. Runtime memakai `assets/music/panasea-rumahsakit.m4a`, hasil remux ke kontainer M4A standar dengan metadata indeks di awal (fast start). Paket audio disalin memakai `-c:a copy`, tanpa encoding atau kompresi ulang; sumber asli tetap disimpan. Ekstensi M4A membuat server statis biasa dapat memilih MIME audio yang sesuai tanpa aturan khusus untuk MP3 palsu. Server lokal mengirim `audio/mp4` dan mendukung byte range.

`museum-shell.js` mempertahankan satu audio element ketika tautan internal berpindah antara halaman statis yang dikenal. CSS halaman diganti, skrip halaman diinisialisasi ulang, dan URL, query, hash, serta back/forward tetap bekerja. Tautan eksternal, modifier klik, download, dan tab baru mengikuti perilaku browser. Jika navigasi gagal, halaman lama tetap tersedia dengan tautan reload yang menjelaskan bahwa musik akan berhenti. Reload penuh/tab baru tidak menjamin playback tanpa putus: sessionStorage menyimpan lagu, waktu, volume, dan kondisi player, lalu pengguna menekan play untuk melanjutkan. Tidak ada autoplay.

Player memiliki pill, panel, dan cover kecil; tombol serta Escape menyediakan alternatif gesture. Swipe horizontal mengganti lagu, swipe bawah mengecilkan player. Previous/next disembunyikan saat hanya ada satu lagu. Musik dijeda ketika video dimainkan dan hanya dilanjutkan setelah semua video berhenti, jika pengguna belum membatalkan resume dengan menekan jeda. `music-player.css` menyisakan ruang konten, menghitung tinggi navbar dan safe area, serta menjaga player di bawah dialog galeri.

Desain player memakai aubergine/plum, lavender, dan cream: mini 104×54 px, pill maksimal 320×58 px, expanded maksimal 360×248 px (margin viewport minimal 16 px). Satu elemen foto dan satu elemen judul/artis bergerak di antara ketiga state. Transisi bentuk, posisi, skala ukuran cover dan rotasi polaroid −4° berlangsung 400 ms dari jangkar bawah tengah yang sama; CSS transitions meneruskan posisi saat arah dibalik. Kontrol masuk dengan jeda 100 ms. Pergantian lagu memakai pergeseran terarah selama 380 ms, mengganti metadata ketika elemen mencapai titik tak terlihat. Indikator batang hanya animasi dekoratif saat audio benar-benar playing; berhenti saat pause/buffering. Reduced motion mematikan transisi dan animasi dekoratif. Expanded menyediakan chevron collapse; Escape dan swipe bawah juga mengecilkan state.

`npm.cmd run check:music-motion` menguji 320/390/430/1440 px, mengambil ukuran tiap animation frame, memeriksa jangkar dan cover yang sama, membalik transisi di tengah, judul panjang, pointer seek, gesture, keyboard, buffering, dan reduced motion. Rekaman preview berjalan, screenshot ketiga state, serta laporan ada di `.museum-checks/music-motion/`. Perekaman memerlukan FFmpeg Playwright (`npx playwright install ffmpeg`).

Galeri detail memakai grid reguler 2 kolom di bawah 600 px, 3 kolom sampai 1023 px, dan 4 kolom mulai 1024 px. Semua thumbnail 3:4, tanpa featured/span; foto dan poster video memakai WebP kecil, lazy loading, ukuran stabil, placeholder polos, dan fallback. Crop default `50% 40%`; `thumbPosition` opsional pada entri manifest dapat dipakai untuk penyesuaian per media. Viewer tetap menampilkan media utuh.

Jalankan `npm.cmd run check:music` untuk pengujian Chromium pada 320, 390, 430, 768, dan 1440 px, playback audio asli, seek, state player, gesture, konflik audio/video, navigasi/back-forward, pemulihan reload, keyboard, reduced motion, dan fallback. Hasil serta screenshot ada di `.museum-checks/task-1-2/`. Cabang satu lagu diuji dengan fixture; ketujuh lagu produksi diuji oleh check:playlist. Safari/iPhone dan WebKit belum diuji di lingkungan Windows ini.

`npm.cmd run check:audio-hosting` memeriksa play/seek/pause di Google Chrome dan Microsoft Edge yang terpasang, melalui server statis biasa (tanpa deteksi format khusus), MIME generik, serta pembukaan langsung `file://`. Hasil ada di `.museum-checks/audio-hosting/results.json`. Setelah memperbarui playlist, refresh penuh halaman yang sudah terbuka agar audio shell memuat sumber terbaru.

Playlist kini berisi tujuh lagu: Panasea, lalu enam link yang diminta dalam urutan aslinya: Titik Nadir — Kahitna; Jatuh Suka — TULUS; Teh Hijau — TULUS; Kasih Putih — Glenn Fredly; Kita usahakan rumah itu — Sal Priadi; Mesra-mesraannya kecil-kecilan dulu — Sal Priadi. Enam tambahan disimpan di `assets/music/` sebagai M4A AAC-LC (format sumber 140), lalu di-remux dengan `-c:a copy` dan fast start, tanpa encoding ulang. Judul/artis diambil dari judul video, bukan nama channel pengunggah; URL sumber, judul asli, durasi, ukuran file, dan hash stream AAC tercatat di `scripts/music-sources.json`. Hash paket audio sebelum/sesudah remux identik. Seluruh lagu memakai foto piknik yang sama dan baru dimuat saat dibutuhkan.

`npm.cmd run check:playlist` mendekode ketujuh file penuh dan menguji ketujuh lagu asli di Chrome/Edge: play, seek, previous/next, wraparound, pergantian otomatis saat ended, navigasi/back-forward, serta konflik audio-video. Hasil ada di `.museum-checks/playlist/report.json`. Tes `check:music` dan `check:music-motion` memakai fixture satu lagu untuk tetap memeriksa cabang previous/next tersembunyi, lalu entri sementara untuk gesture multi-lagu; playlist produksi diuji terpisah oleh `check:playlist`.

Panel expanded menyediakan tombol **Pilih lagu** di bawah artis. Daftar ringkas dapat di-scroll dan menandai lagu terpilih. Pilihan urutan: **Urutan awal**, **Lagu A–Z**, dan **Album A–Z** (dikelompokkan per album/artis). Pengurutan tidak mengganti atau memulai ulang lagu aktif; previous/next, swipe, dan perpindahan otomatis sesudah ended mengikuti urutan pilihan itu. Memilih lagu ketika musik dijeda tetap mempertahankan jeda, sedangkan ketika sedang playing musik beralih ke pilihan baru. Memilih lagu yang sama mempertahankan posisi waktu. Sort dan lagu tersimpan dalam sesi; daftar ditutup dengan ×, Escape, tap luar, atau saat navigasi, dan tersedia lewat keyboard. Gestur player dinonaktifkan di dalam daftar agar scroll/select native tidak berganti lagu.

Metadata album opsional berada di `album` pada `music-playlist.js`; album kosong ditampilkan sebagai **Tanpa album** dan diletakkan paling akhir dalam urutan album. Label rilisan termasuk single. Sumber verifikasi tercatat di `scripts/music-albums.json`: katalog Apple Music untuk Panasea, Manusia/Jatuh Suka, Teh Hijau dan Kembali/Kasih Putih, serta deskripsi unggahan resmi Sal Priadi untuk MARKERS & SUCH. Versi/rilisan persis pada unggahan lirik Titik Nadir belum terverifikasi, sehingga albumnya dikosongkan. File audio dan tag metadata sebelumnya tetap utuh.

Jalankan `npm.cmd run check:music-library` untuk pemilihan dan urutan lagu di 320/390/430/1440 px serta landscape 844×390, scroll sentuh native, keyboard, playback yang berlanjut, persistensi saat navigasi/reload, dan konflik audio-video. Screenshot serta laporan ada di `.museum-checks/music-library/`.

Cover chapter dipilih melalui `cover` (nama file di folder chapter), terpisah dari urutan `photos` dan `videos`. Detail membuka media pilihan tersebut; galeri tetap mengikuti urutan aslinya. Painting Date menggunakan `painting-date2.webp` untuk menampilkan piknik dengan komposisi utuh; selfie helm tetap di galeri.

Untuk menambahkan catatan asli Chelsea, isi properti opsional ini pada chapter yang sesuai di `data.js`:

```js
chelseaNote: "teks asli dari Chelsea",
```

Field kosong atau hanya spasi disembunyikan. Catatan tampil sebagai teks biasa di detail chapter, detail bulanan, dan Our Story; baris baru dipertahankan. Tidak ada isi catatan yang dibuat otomatis.

Klik media di galeri detail chapter atau detail bulanan untuk membuka modal beranimasi. Foto tampil utuh, video diputar dengan kontrol, dan tombol panah berpindah antar-media. Tutup lewat tombol ×, Escape, atau area luar panel. Saat ditutup, video berhenti dan fokus serta posisi scroll kembali ke galeri. Preferensi reduced motion didukung. Jalankan `npm run check:viewer` untuk memeriksa interaksi modal di browser.

Modal memakai scene perspektif 1200px dan kartu dua sisi dengan `preserve-3d` serta backface tersembunyi. Animasi diimplementasikan langsung di `media.js` dan `media.css` menggunakan Web Animations API: masuk 540° dalam 1000ms, rotasi X/Y/Z dan kedalaman, lalu settle. Tutup memakai putaran balik 680ms. Tombol putar mengulang rotasi 360° dalam 820ms tanpa mengubah media terpilih. Foto merespons kursor dengan tilt dan pantulan cahaya; pada HP tersedia respons tekan/lepas, drag tilt, serta swipe horizontal untuk pindah media. Kontrol video tetap menggunakan interaksi native. Tampilan tetap polaroid pastel Museum Kita. Gerak aktif dibatalkan saat ditutup, diganti, atau preferensi reduced motion berubah.

Foto web berada di `assets/images/` (WebP quality 82, sisi panjang maksimal 1920 px), thumbnail cover/grid di `assets/thumbnails/` (maksimal 800 px), dan poster statis dari video masing-masing di `assets/posters/`. Aspect ratio dipertahankan tanpa upscale; orientasi EXIF diterapkan sebelum metadata dihapus. `assets/media/manifest.js` memetakan varian, ukuran intrinsik dan preview blur. Galeri/detail memakai foto besar; cover/grid memakai thumbnail. Prioritas media pertama, lazy loading, skeleton, dan fallback tetap aktif.

Seluruh 66 JPEG asli disimpan di luar workspace/deploy: `C:\DIONN\MUSEUMKITA-V2-BACKUPS\photos-2026-10-19\assets\images\`. Hash SHA-256 masing-masing tercatat di `scripts/media-sources.json` dan dicek sebelum pemrosesan. Turunan web lama juga dibackup di `previous-web-derivatives/` pada direktori backup tersebut. Tidak ada JPEG asli atau backup dalam paket web. Jangan menghapus direktori backup ini.

Video tidak dikompres pada tahap optimasi foto. Semua 14 video sumber dan 13 salinan playback yang sudah ada tetap identik. `assets/media/` tetap menyimpan salinan playback tersebut. Video hanya dimuat setelah tombol play ditekan; kegagalan playback menyediakan tautan ke video sumber.

Untuk memproses ulang foto dari backup eksternal dan mengambil ulang poster statis:

```sh
npm run media
npm run check:assets
```

Lokasi backup, sumber foto beserta hash, nama varian, kualitas dan waktu frame poster dipilih di `scripts/media-sources.json`. Jika backup dipindahkan, set `MUSEUM_ORIGINALS` ke direktori penggantinya. `npm run media:samples` membuat perbandingan sampel pada ukuran yang sama dan crop 100%; hasilnya ada di `.museum-checks/asset-optimization/`. `npm run media` tidak mengenkode video dan memerlukan salinan playback yang sudah ada. Untuk menambah foto, tambahkan sumber ke backup eksternal dan inventaris konfigurasi terlebih dahulu, kemudian perbarui data chapter. Perubahan isi sumber memerlukan pembaruan hash yang disengaja.

Audit dan paket hosting bersih:

```sh
npm run audit:assets
npm run build
npm run check:assets -- --deploy
```

Deploy isi `dist/`. Paket hanya berisi halaman, CSS/JS runtime dan aset web; backup, tool pengembangan, dependensi dan sampel dikecualikan. Detail ukuran sebelum/sesudah, file terbesar, kualitas sampel dan hasil pengecekan tersedia di `ASSET-OPTIMIZATION.md`.

Pengecekan browser:

```sh
npx playwright install chromium
npm run check
```

Hasil dan screenshot tersimpan lokal di `.museum-checks/` (diabaikan Git). Pengecekan mencakup viewport mobile/desktop/landscape, tombol masuk tanpa scroll, navigasi, cover dan urutan galeri, seluruh playback video, catatan opsional, preview loading, dan fallback gagal muat. Untuk browser Chromium yang sudah terpasang, set `MUSEUM_BROWSER` ke path executable jika diperlukan.
