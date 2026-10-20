# Rose & Lilac — 20 Oktober 2026

Palet dicocokkan secara visual dengan warna blok swatch yang dilampirkan, bukan tulisan HEX yang samar. Semua token dan treatment permukaan ada di [theme.css](./theme.css). Stylesheet ini dimuat setelah CSS halaman, media, dan player; tetap terpasang selama navigasi internal.

| Token | HEX final | Pemakaian |
| --- | --- | --- |
| `--powder-pink` | `#FDE3E8` | Basis latar halaman, dicampur putih hangat agar sangat muda |
| `--lilac-breeze` | `#DDD0E5` | Section Our Story, hover, active navbar, awal gradasi player |
| `--carnation` | `#F3AEC3` | Label kecil cover soundtrack |
| `--mauve-dream` | `#BCA5C8` | Border panel, akhir gradasi player |
| `--raspberry-sorbet` | `#D88AAB` | Border catatan personal dan aksen terpilih |
| `--violet-bloom` | `#9F80AD` | Tepi panel dan lapisan pilihan aktif |
| `--warm-white` | `#FFFCF7` | Card, navbar, polaroid, permukaan modal, ikon play |
| `--plum` | `#38263F` | Teks utama |

Turunan aksesibel: `--violet-action: #724B80`, `--violet-hover: #654171`, `--violet-pressed: #55335F`, `--raspberry-ink: #914060`, `--text-secondary: #624C69`, `--text-on-mauve: #4F3659`. Warna asli raspberry/violet dipakai sebagai lapisan/aksen; turunannya dipakai pada teks dan kontrol penting.

Token semantik `--surface-page`, `--surface-section`, `--surface-hover`, `--surface-note`, `--border-soft`, `--border-panel`, `--edge-light`, `--shadow-soft`, `--shadow-panel`, dan `--player-gradient` diturunkan dari palet tersebut. Latar halaman efektif sekitar `#FEF2F1`. Gradasi dekoratif dibatasi pada player/pemilih lagu dan wash splash; card serta navbar tetap solid. Gradasi seek bar menunjukkan progres.

Card berwarna putih hangat dengan border lilac dan shadow tipis. Our Story memakai bidang lilac lembut. Navbar mempunyai permukaan putih hangat, outline dan garis bawah pada item aktif. Player mini/pill/expanded/pemilih lagu memakai gradasi lilac ke mauve, teks plum, play violet dengan ikon terang, serta seek bar violet dengan tepi yang terbaca. Caption di atas foto mendapat alas plum setempat agar terbaca; foto tidak difilter atau diberi tint baru.

## Verifikasi

- Chrome terpasang: viewport 320, 390, 430, dan 1440 × 844 px; tidak ada overflow. Perbandingan bounding box dan font pada sembilan elemen archive/player identik sebelum/sesudah.
- Audit 484 sampel teks pada splash, archive, Our Story, detail chapter, detail bulan, expanded player, pemilih lagu, dan modal: tidak ada kegagalan. Kontras dihitung dari computed styles, termasuk alpha dan endpoint gradasi; angka endpoint terburuk dipakai secara konservatif untuk player.
- Minimum teks normal 4,67:1; teks plum pada mauve 6,17:1; teks sekunder pada lilac 5,16:1; teks raspberry pada card 6,61:1; ikon/teks putih hangat pada violet action 6,76:1. Kontrol violet pada mauve 3,08:1.
- Focus keyboard tetap ber-outline. Play mendapat ring putih hangat di dalam tombol violet. Navbar aktif mempunyai garis bawah/outline; lagu aktif tetap ber-centang; thumbnail aktif tetap ber-outline. Disabled mempertahankan atribut native/ARIA dan cursor yang sesuai.
- `npm.cmd run check:music`: lulus, termasuk lima lebar viewport (tambahan 768 px), singleton audio, seek, pill/expanded/mini, gesture, keyboard, reduced motion, navigasi/back-forward, reload/resume, kegagalan audio, dan konflik beberapa video. Cabang satu lagu memakai fixture yang sudah ada.
- `npm.cmd run check:assets`: lulus; 66 hash backup asli, 132 varian foto, 26 poster, 27 video tidak berubah, 205 path lokal valid, serta isi/urutan chapter tetap sama.
- Tidak ada perubahan layout, font, spacing, aset foto/video, cerita, urutan media, kode playback, playlist, gesture, atau navigasi pada task warna ini. Safari/iPhone belum diuji di Windows. Tidak ada commit, push, build, atau deploy.

## Screenshot pada viewport yang sama

Semua perbandingan berikut memakai 390 × 844 px, track yang sama, posisi scroll sama, dan audio dijeda pada awal lagu.

![Archive sebelum dan sesudah](./.museum-checks/rose-lilac/archive-comparison.png)

![Expanded player sebelum dan sesudah](./.museum-checks/rose-lilac/expanded-comparison.png)

PNG asli untuk setiap lebar tersedia di `.museum-checks/rose-lilac/`. Bukti ukur: `before.json`, `after.json`, `contrast.json`, dan `verification.json`. Screenshot pemeriksaan tambahan: `splash-after.png`, `story-after.png`, `chapter-after.png`, `month-after.png`, `modal-after.png`, dan `picker-after.png`.

## File task ini

- `theme.css`: token terpusat dan treatment warna/permukaan.
- `index.html`, `archive.html`, `story.html`, `chapter.html`, `month.html`: memuat theme dan memperbarui warna chrome browser.
- `README.md`: dokumentasi sumber warna.
- `ROSE-LILAC-UPDATE.md`: palet final, hasil verifikasi, dan perbandingan screenshot.

Perubahan proyek dari task sebelumnya tetap dipertahankan. File bukti lokal di `.museum-checks/` diabaikan Git.
