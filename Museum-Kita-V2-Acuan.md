# Museum Kita v2 — Acuan Mentah

> bahan mentah untuk rekonsep dan implementasi Museum Kita v2.

## 1. Konsep

Museum Kita adalah **personal digital memory archive** untuk menyimpan dan menikmati kenangan bersama pasangan.

Versi pertama terlalu kompleks, terlalu dekoratif, terlalu banyak interaksi, dan terasa seperti interactive museum experiment. Versi kedua diarahkan menjadi pengalaman yang personal, intimate, tenang, mudah dinikmati, mobile-first, content-first, cepat, dan tidak terasa AI-generated.

**Museum adalah metafora/identitas, bukan museum virtual yang harus dijelajahi.**

## 2. Arah Visual

### Warna utama
- pastel purple / lavender
- pastel pink / blush

### Warna pendukung
- cream
- off-white
- soft paper
- muted plum
- soft gray

Monokrom hanya menjadi aksen untuk body text, garis, icon, metadata, dan elemen UI kecil.

**Pink + purple = identitas utama Museum Kita.**

Foto asli tetap menjadi sumber warna visual utama pada konten.

## 3. Bahasa Visual

Referensi rasa:
- personal journal
- editorial magazine
- old photo album
- scrapbook
- museum archive

### Boleh
- paper texture
- subtle grain
- tape
- handwritten note
- polaroid
- thin lines
- sedikit foto miring
- torn paper edge

### Hindari berlebihan
- tape di mana-mana
- bunga/doodle/sticker terlalu banyak
- gradient berlebihan
- glassmorphism
- shadow bertumpuk
- rounded card berlebihan
- semua elemen dibuat aesthetic sekaligus

Targetnya: **terasa seperti dibuat khusus oleh seseorang, bukan template AI yang mencoba terlihat aesthetic.**

## 4. Typography

Maksimal dua keluarga font utama.

### Display
Serif editorial untuk judul besar, chapter, nama bulan, dan judul memory.

### Body
Sans-serif bersih untuk caption, deskripsi, metadata, tanggal, lokasi, jumlah media, dan button.

### Handwriting
Opsional dan terbatas untuk catatan personal/handwritten note/caption kecil tertentu.

Jangan seluruh website handwritten.

# 5. User Flow

```text
SPLASH
  ↓
ARCHIVE
  ├── OUR STORY
  │     ↓
  │   STORY
  │
  └── MEMORIES BY MONTH
        ↓
      MONTH
        ↓
      MEMORY DETAIL
```

Konsep lama seperti Lobby, Room, Hall, Gallery, Cinema, Stats dihapus dari core experience.

# 6. Routes

```text
/
└── Splash

/archive
└── Archive
    ├── Our Story preview
    └── Memories by Month

/archive/:month
└── Month Memories

/story
└── Full Story

/memory/:id
└── Memory Detail
```

# 7. Page 01 — Splash

Splash adalah cover/pintu masuk.

Baseline:
- private museum feeling
- pastel purple + pastel pink
- cream/paper background
- scrapbook/editorial details
- typography besar
- foto sebagai bagian dari cover
- satu CTA utama

Contoh copy:

```text
PRIVATE MUSEUM

WELCOME TO

OUR
MUSEUM

every memory
deserves a place.

ESTABLISHED
June 2026

Some moments deserve more than a gallery.
They deserve a museum.

[ Enter Museum → ]

Curated for Dion & Chelsea
```

Splash boleh lebih dekoratif daripada halaman lain. Dekorasi splash tidak wajib dibawa ke seluruh halaman.

# 8. Page 02 — Archive

Archive adalah halaman utama setelah Enter Museum.

Dua fungsi utama:
1. Our Story
2. Memories by Month

Struktur kasar:

```text
OUR MUSEUM

every memory deserves a place.

OUR STORY
[hero / preview]
[read story →]

MEMORIES BY MONTH

2026

January
February
March
April
May
June
...
```

**Our Story** ditempatkan sebagai featured section di atas. Story bukan salah satu bulan.

# 9. Memories by Month

Memory disusun berdasarkan bulan, bukan kalender.

Contoh:

```text
2026

01 January
02 February
03 March
04 April
05 May
06 June
07 July
08 August
09 September
...
```

Setiap bulan dapat memiliki cover image, nama bulan, jumlah memory, dan tombol masuk.

Target rasa: **archive / collection, bukan calendar app.**

# 10. Page 03 — Month Memories

Contoh:

```text
SEPTEMBER 2026

6 memories
```

Lalu kumpulan memory:

```text
12 SEP
Sunset After Work

[cover image]

14 SEP
...

18 SEP
...
```

Satu memory = satu momen/cerita kecil.

Satu memory dapat memiliki beberapa foto, beberapa video, caption, journal text, lokasi, dan waktu.

# 11. Page 04 — Our Story

Story adalah cerita lengkap hubungan. Bukan gallery dan bukan kumpulan memory acak. Dibaca dari atas ke bawah.

Contoh chapter:

```text
OUR STORY

dari awal kita bertemu,
sampai semua cerita sekarang.

CHAPTER 01
How We Met
2023

CHAPTER 02
The Beginning
2023–2024

CHAPTER 03
Somewhere Along the Way
2024–2025

CHAPTER 04
Now
2026
```

Chapter dapat berisi teks cerita, foto, handwritten note, dan periode waktu.

# 12. Page 05 — Memory Detail

Memory Detail menampilkan satu momen secara lengkap.

Contoh:

```text
← September 2026

12 September 2026

Sunset After Work

Cikarang Barat
17.42 — 19.03

[large photo]

[handwritten note]

[journal text]

Media dalam momen ini

[photo]
[photo]
[video]
[photo]

← Memory Sebelumnya
Memory Selanjutnya →
```

Fokus: foto utama, cerita, caption, dan media tambahan. Jangan terasa seperti dashboard.

# 13. Content Model

## memories

```text
id
date
title
location
description
note
cover_url
created_at
```

## media

```text
id
memory_id
type
url
thumbnail_url
caption
sort_order
created_at
```

Type: `image` atau `video`.

## story_chapters

```text
id
order
title
period
description
cover_url
created_at
```

Contoh: `01 — How We Met`, `02 — The Beginning`, `03 — Somewhere Along the Way`, `04 — Now`.

# 14. Media Architecture

Performance adalah requirement penting.

Prinsip: **user hanya membayar bandwidth untuk sesuatu yang memang ingin dia lihat.**

### Archive
Load thumbnail + metadata. Jangan load full-resolution image atau video.

### Month
Load optimized image + video thumbnail/poster.

### Memory Detail
Load large image + video poster.

### Video

```text
poster
  ↓
user click
  ↓
load video
  ↓
play
```

Jangan fetch semua video sekaligus.

# 15. Image Pipeline

Foto idealnya memiliki:

```text
original
thumbnail
medium
large
```

Contoh:

```text
photo-original.jpg
photo-400.webp
photo-800.webp
photo-1200.webp
```

Pemakaian:
- Archive → 400px
- Month → 800px
- Detail → 1200px

Jangan hanya JPG → WebP. Resize juga berdasarkan kebutuhan tampilan.

# 16. Frontend Components

```text
components/
├── MuseumHeader
├── MemoryCard
├── MonthCard
├── StoryPreview
├── StoryChapter
├── MediaGallery
├── MediaViewer
├── MemoryMeta
├── HandwrittenNote
└── PageTransition
```

Hindari membuat terlalu banyak varian komponen hanya untuk perbedaan visual kecil.

# 17. Data / Content Separation

```text
data/
├── memories
├── story
└── media
```

Jika memakai Supabase:

```text
frontend
   ↓
data/API
   ↓
Supabase
```

Data media jangan hardcoded seluruhnya di frontend ketika masuk tahap production.

# 18. Feature Scope

## MUST HAVE
- Splash
- Archive
- Monthly archive
- Our Story
- Memory detail
- Image
- Video
- Responsive mobile-first UI
- Lazy loading
- Optimized image
- Video poster
- Simple navigation

## LATER / OPTIONAL
- Favorite
- Search
- Music
- Share
- Private lock
- Statistics
- Reactions
- Fancy transitions

Jangan masukkan optional features sebelum core experience selesai.

# 19. Navigation Principle

Jangan membuat navigation seperti website corporate. Navigation harus mengikuti konteks.

Contoh:

```text
Archive
← September 2026
← Back
```

User harus selalu tahu sedang berada di mana, berasal dari mana, dan bagaimana kembali.

# 20. Animation Principle

Animasi boleh, tetapi harus membantu pengalaman.

### Boleh
- fade
- subtle page transition
- image reveal
- smooth scroll
- subtle media transition

### Hindari
- excessive parallax
- 3D museum animation
- loading animation berlebihan
- floating object terus-menerus
- transition yang membuat user menunggu

Prinsip: **kalau animasi membuat pengalaman lebih halus, pertahankan. Kalau hanya menunjukkan bahwa website bisa dianimasikan, buang.**

# 21. Anti-AI-Slop Rules

Jangan membuat semua elemen terlihat aesthetic sekaligus.

Hindari kombinasi berlebihan:

```text
gradient + glassmorphism + paper texture + polaroid + tape + flowers + doodles + glow + shadow + rounded cards
```

Gunakan dekorasi sebagai aksen.

Foto asli dan cerita asli harus menjadi sumber visual utama.

> Museum Kita harus terasa dibuat untuk dua orang tertentu, bukan dibuat untuk kategori “romantic website”.

# 22. Real Photo Rule

Foto final harus menggunakan foto asli.

Generated image hanya untuk mockup, eksplorasi layout, dan visual direction.

Implementasi final menggunakan real photo, real video, real story, real caption, dan real date.

Konten asli harus mengalahkan dekorasi.

# 23. Implementation Workflow

Jangan membangun semua halaman sekaligus.

```text
01 — Foundation
02 — Splash
03 — Archive
04 — Month
05 — Story
06 — Memory Detail
07 — Media Optimization
08 — Polish
```

Setiap halaman:

```text
design
↓
implement
↓
test on phone
↓
review
↓
lock
↓
next page
```

Jika implementasi menunjukkan desain terlalu padat: sederhanakan. Mockup bukan hukum.

# 24. Current Design Reference

Baseline visual yang sudah disetujui:
1. Splash
2. Archive
3. Our Story
4. Memory Detail

Mockup digunakan sebagai **visual reference**, bukan pixel-perfect specification.

Prioritas:

```text
experience
>
content hierarchy
>
readability
>
performance
>
visual fidelity
```

# 25. Status

## LOCKED
- [x] Splash direction
- [x] Archive direction
- [x] Monthly memory structure
- [x] Our Story direction
- [x] Memory Detail direction
- [x] Pastel purple + pastel pink as main colors
- [x] Monochrome as accent
- [x] Mobile-first
- [x] Content-first
- [x] No virtual rooms
- [x] No unnecessary feature overload
- [x] Performance-first media loading

## NOT LOCKED
- [ ] Final font selection
- [ ] Exact color tokens
- [ ] Exact database implementation
- [ ] Supabase schema finalization
- [ ] Image processing pipeline
- [ ] Video hosting strategy
- [ ] Exact animation details
- [ ] Desktop adaptation
- [ ] Optional features

# 26. Final Direction

Museum Kita v2 bukan museum virtual yang harus dijelajahi.

Museum Kita v2 adalah **digital memory archive yang terasa seperti tempat kecil milik dua orang.**

Museum menjadi identitas.

Archive menjadi struktur.

Foto dan video menjadi koleksi.

Story menjadi narasi.

Memory detail menjadi tempat untuk berhenti dan mengingat.

Seluruh visual dibangun dengan:

> **pastel pink + pastel purple + personal memories + restrained scrapbook/editorial details.**

## One-line Brief

**Museum Kita adalah arsip digital personal yang menyimpan perjalanan dua orang melalui cerita, foto, dan video—dibungkus dalam visual pastel pink-lavender yang lembut, personal, dan tidak berlebihan.**
