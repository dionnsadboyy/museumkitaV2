# Optimasi aset Museum Kita — 19 Oktober 2026

Semua ukuran memakai MB desimal (1 MB = 1.000.000 byte). Audit mencakup seluruh `assets/`, termasuk foto/video yang belum dipakai chapter.

| Kelompok aset deploy | Sebelum | Sesudah | Penghematan |
| --- | ---: | ---: | ---: |
| Foto + thumbnail, termasuk JPEG asli sebelumnya | 85,39 MB | 10,56 MB | 87,64% |
| Poster statis video | 0,64 MB | 1,29 MB | bertambah 0,65 MB |
| **Seluruh foto, thumbnail, dan poster** | **86,03 MB** | **11,84 MB** | **86,23%** |
| Video sumber, 14 file | 191,97 MB | 191,97 MB | 0% |
| Salinan playback yang sudah ada, 13 file | 22,47 MB | 22,47 MB | 0% |
| Audio | 5,29 MB | 5,29 MB | 0% |
| Manifest, termasuk preview blur | 0,030 MB | 0,035 MB | bertambah 4,7 KB |
| **Total aset** | **305,79 MB** | **231,61 MB** | **24,26%** |

Penghematan total: **74.186.021 byte**. Foto besar baru berjumlah 66 file / 8.299.226 byte; thumbnail 66 file / 2.257.194 byte. Poster besar dan thumbnail poster berjumlah 26 file / 1.286.446 byte. Paket `dist/` berisi 204 file runtime, total 231.773.758 byte termasuk halaman, CSS dan JavaScript.

Penghematan di atas adalah ukuran paket aset, bukan pengukuran waktu loading produksi. Sebelum pekerjaan ini sudah ada turunan WebP 1200/400 px sebesar 4,23 MB. Varian foto 1920/800 px sekarang berukuran 10,56 MB; kenaikan resolusi dan pemrosesan enam foto tambahan menjelaskan pertambahan turunan ini. Thumbnail digunakan untuk cover/grid dan foto besar untuk detail/galeri; pemuatan bertahap serta prioritas media pertama dipertahankan. JPEG asli tidak lagi ikut dalam deploy.

## Audit file terbesar

Foto asli terbesar sebelum migrasi, sekarang hanya di backup eksternal:

| Path relatif backup | Ukuran |
| --- | ---: |
| `assets/images/day-uno/uno11.jpeg` | 4,74 MB |
| `assets/images/rndom/IMG_2604.JPG.jpeg` | 4,22 MB |
| `assets/images/day-uno/uno4.jpeg` | 3,86 MB |
| `assets/images/day-date/date1.jpeg` | 3,81 MB |
| `assets/images/day-uno/uno6.jpeg` | 3,65 MB |
| `assets/images/014-day/014-day3.jpg` | 2,91 MB |

Foto besar hasil optimasi terbesar: `assets/images/day-date/date1.webp`, **539.970 byte**, 1080 × 1920 px. Berikutnya `assets/images/014-day/014-day3.webp`, **318.172 byte**.

Video terbesar, seluruhnya tetap identik:

| Path proyek | Ukuran |
| --- | ---: |
| `assets/images/rndom/IMG_2801.MP4` | 23,93 MB |
| `assets/videos/painting-date/painting-date2.mp4` | 23,33 MB |
| `assets/videos/painting-date/painting-date1.mp4` | 22,95 MB |
| `assets/videos/jababeka-day/jababeka-day1.MOV` | 18,00 MB |
| `assets/videos/012-day/012-day2.MOV` | 15,04 MB |
| `assets/videos/012-day/012-day1.MOV` | 13,99 MB |

`IMG_2801.MP4` belum direferensikan oleh chapter; file tetap dipertahankan. Total video **214.443.026 byte** menjadi bagian terbesar paket. Optimasi video dapat dikerjakan terpisah dengan evaluasi codec/bitrate/resolusi per klip dan pemisahan penyimpanan sumber dari playback. Tidak ada perkiraan penghematan video tanpa percobaan encode dan perbandingan visual; tahap ini hanya mengekstrak frame poster, tanpa encode video.

## Sampel dan kualitas

Empat sampel dibandingkan pada ukuran yang sama, dilengkapi crop detail 100%: wajah/rambut/kacamata, wajah malam, tekstur bunga/piknik, dan foto malam dengan EXIF orientation 6. Pemeriksaan visual tidak menemukan kerusakan wajah atau artefak yang mengganggu; quality **82** dipakai untuk seluruh foto.

| Sampel | JPEG asli | WebP Q82 | Hasil |
| --- | ---: | ---: | --- |
| `painting-date10.jpeg` — wajah | 478.010 B | 145.468 B | 1440 × 1920 |
| `uno10.jpeg` — wajah malam | 2.396.750 B | 139.292 B | 1080 × 1920 |
| `painting-date2.jpeg` — detail piknik | 531.823 B | 202.396 B | 1080 × 1920 |
| `date1.jpeg` — malam/EXIF 6 | 3.814.298 B | 539.970 B | 1080 × 1920, orientasi benar |

Pipeline menerapkan orientasi EXIF, mengubah piksel ke sRGB, resize dengan aspect ratio utuh tanpa upscale, lalu membuang metadata. Batas sisi panjang foto 1920 px dan thumbnail 800 px. Sumber yang lebih kecil dipertahankan ukurannya. Sampel perbandingan berada di `.museum-checks/asset-optimization/*-comparison.png` dan tidak masuk paket web.

## Backup dan referensi

Backup: **`C:\DIONN\MUSEUMKITA-V2-BACKUPS\photos-2026-10-19`**. Seluruh 66 JPEG asli tersimpan dengan struktur folder asli di `assets/images/` dalam direktori tersebut. SHA-256 diverifikasi sebelum memindahkan file keluar dari deploy dan saat pengecekan akhir. Sebanyak 146 turunan foto/poster lama juga disimpan di `previous-web-derivatives/`; tidak ada file foto asli yang dihapus permanen.

Data chapter, gambar statis HTML, referensi CSS, poster, srcset dan manifest telah diperbarui. Tidak ada preload foto lama. Skrip pemrosesan membaca foto dari backup eksternal dan tidak mengenkode video. `npm run build` hanya menyalin runtime ke `dist/`; backup, sampel, source tooling dan dependensi dikecualikan.

## Hasil verifikasi

- `npm run check:assets -- --deploy`: backup 66 foto valid, 132 varian foto dan 26 poster valid, tanpa upscale/metadata, dimensi intrinsik dan srcset benar, 200 path lokal valid dengan case persis, paket deploy identik dengan runtime.
- Seluruh **27 video** memiliki SHA-256 yang sama dengan audit awal.
- `npm run check`: lulus pada **12 viewport** mobile, desktop dan landscape. Seluruh delapan chapter, navigasi, pencarian, grid/list, Our Story, detail bulanan, pilihan cover dan urutan galeri lulus. Tidak ada error JavaScript atau HTTP gagal.
- Seluruh **13 video chapter** berhasil playback; video tidak diminta sebelum interaksi pengguna. File video yang belum dipakai chapter diperiksa integritasnya, tanpa menambahkannya ke cerita.
- `npm run check:viewer`: lulus pada **lima viewport**, termasuk foto besar, animasi/gestur 3D, next/previous, keyboard, fokus, scroll, playback/cleanup, reduced motion dan fallback.
- Preview loading dan fallback gagal muat lulus; tinggi stage stabil selama loading. Screenshot mobile/desktop, cover 07 setelah discroll, dan modal foto diperiksa secara visual.
- Cerita, metadata chapter, desain pastel/polaroid, pilihan cover dan urutan galeri sama dengan sebelum optimasi. Catatan Chelsea kosong tetap disembunyikan.

Audit JSON sebelum/sesudah dan laporan migrasi disimpan di `.museum-checks/asset-optimization/` serta direktori backup eksternal.
