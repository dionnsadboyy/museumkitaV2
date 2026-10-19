(() => {
  const base = "/assets/images";
  const video_base = "/assets/videos";

  const photo_path = (folder, file) => `${base}/${folder}/${file}`;
  const video_path = (folder, file) => `${video_base}/${folder}/${file}`;
  const cover_path = (folder, file) => photo_path(folder, file);

  const is_video_file = (file = "") => /\.(mov|mp4|webm|m4v)$/i.test(file);

  const gallery = [
    {
      id: 1,
      chapter: 1,
      folder: "day-uno",
      title: "opening chapter",
      subtitle: "hari kedua kita kenal",
      cover: "uno10.webp",
      date: "17 june 2026",
      sortDate: "2026-06-17",
      location: "jatiwangi, cikarang",
      maps: "jalan kampung rt 4 rw 2, desa jatiwangi, kontrakan warna pink, belakang rumah putih, kontrakan no.21",
      mood: "🥹❤️",
      story:
        "hari kedua setelah kita kenal, kita kumpul rame-rame buat main uno bertujuh. yang kalah mukanya dicoret-coret pake spidol, jadi suasananya rame banget. sebenernya di hari itu nggak ada yang terlalu besar, tapi entah kenapa mas berani ngajak kamu foto bareng. dari momen yang keliatannya biasa aja itu, semuanya mulai kerasa beda buat mas.",
      tags: ["uno", "random", "friends", "first photo"],
      photos: [
        "uno1.webp",
        "uno2.webp",
        "uno3.webp",
        "uno4.webp",
        "uno5.webp",
        "uno6.webp",
        "uno7.webp",
        "uno8.webp",
        "uno9.webp",
        "uno10.webp",
        "uno11.webp",
        "uno12.webp",
      ],
      videos: ["day-uno1.MP4"],
    },

    {
      id: 2,
      chapter: 2,
      folder: "random-nr-meikarta",
      title: "random nr meikarta",
      subtitle: "tengah malem sebelum gowes",
      cover: "random-nr-meikarta.MOV",
      coverType: "video",
      date: "20 june 2026",
      sortDate: "2026-06-20",
      location: "meikarta",
      maps: "meikarta, cikarang selatan, bekasi",
      mood: "🌙🛵🤍",
      story:
        "malam itu mas cuma iseng muter ke meikarta, nggak ada tujuan besar dari awal. cuma pengen nyari angin bentar sebelum besoknya gowes. jadi yang tengah malem itu sebenernya cuma pemanasan kecil, muter random, lihat jalanan malam, terus pulang dengan kepala yang sedikit lebih ringan. momen yang kelihatannya iseng itu malah nyangkut di kepala mas.",
      tags: ["random ride", "meikarta", "night ride", "before gowes"],
      photos: [],
      videos: ["random-nr-meikarta.MOV"],
    },

    {
      id: 3,
      chapter: 3,
      folder: "gowes-date",
      title: "gowes day",
      subtitle: "pertama kali keluar berdua",
      cover: "gowes-date1.MOV",
      coverType: "video",
      date: "21 june 2026",
      sortDate: "2026-06-21",
      location: "cikarang barat",
      maps: "cikarang barat, bekasi",
      mood: "🚲🌸🤍",
      story:
        "hari itu pertama kalinya mas keluar berdua beneran sama kamu. kita gowes pelan, muter sebentar, dan di hari itu juga mas kasih bunga pertama buat kamu. nggak rame, nggak heboh, tapi buat mas rasanya susah dilupain karena itu salah satu momen yang bikin semuanya jadi lebih nyata.",
      tags: ["gowes", "first date", "flower", "memory"],
      photos: [],
      videos: ["gowes-date1.MOV", "gowes-date3.MP4"],
    },

    {
      id: 4,
      chapter: 4,
      folder: "day-date",
      title: "date",
      subtitle: "keliling malem tanpa tujuan",
      cover: "date1.webp",
      date: "22 june 2026",
      sortDate: "2026-06-22",
      location: "central park meikarta",
      maps: "central park meikarta, cikarang selatan, bekasi",
      mood: "🌃🤍",
      story:
        "awalnya cuma kepikiran buat keluar bentar habis pulang kerja, nggak ada rencana apa-apa, cuma pengen muter aja. yang nggak mas sangka, kamu malah dandan hampir dua jam sampai nyatok segala. akhirnya kita cuma ke indomaret beli jajan, terus duduk di pinggir danau dekat jembatan central park meikarta. ngobrol random, ngelihatin air, sesederhana itu. tapi anehnya malam itu rasanya nyaman banget buat mas.",
      tags: ["night ride", "meikarta", "lake", "random talk"],
      photos: [
        "date1.webp",
        "date2.webp",
        "date3.webp",
        "date4.webp",
        "date5.webp",
        "date6.webp",
        "date7.webp",
        "date8.webp",
        "date9.webp",
        "date10.webp",
      ],
      videos: ["day-date1.MOV", "day-date2.MOV"],
    },

    {
      id: 5,
      chapter: 5,
      folder: "jababeka-day",
      title: "jababeka day",
      subtitle: "random meet",
      cover: "jababeka4.webp",
      coverPosition: "50% 40%",
      date: "25 june 2026",
      sortDate: "2026-06-25",
      location: "jababeka, cikarang",
      maps: "jababeka, cikarang utara, bekasi",
      mood: "🛵🍛🤍",
      story:
        "awalnya cuma bilang mau benerin iphone, padahal sebenernya itu cuma alasan biar bisa ketemu lagi. selesai servis, kita muter-muter di jababeka, bingung mau makan apa, sempet mampir ke chiefs, terus akhirnya nyerah dan milih nasi goreng. pulangnya udah lumayan malem, bahkan sempet ada drama karena mas nganter kamu sampai sekitar jam sepuluh. sesimpel itu, tapi malah jadi salah satu malam yang paling mas inget.",
      tags: [
        "jababeka",
        "iphone service",
        "cifest",
        "nasi goreng",
        "night ride",
      ],
      photos: [
        "jababeka1.webp",
        "jababeka2.webp",
        "jababeka3.webp",
        "jababeka4.webp",
        "jababeka5.webp",
        "jababeka6.webp",
        "jababeka7.webp",
        "jababeka8.webp",
        "jababeka9.webp",
        "jababeka10.webp",
        "jababeka11.webp",
        "jababeka12.webp",
        "jababeka13.webp",
        "jababeka14.webp",
      ],
      videos: ["jababeka-day1.MOV", "jababeka-day2.MOV"],
    },

    {
      id: 6,
      chapter: 6,
      folder: "012-day",
      title: "012 day",
      subtitle: "hari kedua belas",
      cover: "012-6.webp",
      date: "29 june 2026",
      sortDate: "2026-06-29",
      location: "jatiwangi, cikarang barat",
      maps: "jatiwangi, cikarang barat, bekasi",
      mood: "🍦🐈🤍",
      story:
        "hari itu kamu sebenernya lagi nggak baik-baik aja. habis diomongin macem-macem sama masa lalu, sampai sempet nangis juga di tempat kerja. mas nggak bisa ngelakuin banyak hal, jadi yang kepikiran cuma ngajak kamu muter bentar habis pulang kerja. kita keliling cikarang barat tanpa tujuan, berhenti di alfamart jatiwangi, beli es krim, duduk sebentar, ngasih makan kucing, terus pulang. nggak ada yang mewah, tapi ngeliat kamu bisa ketawa lagi malam itu rasanya udah lebih dari cukup buat mas.",
      tags: ["day 12", "night ride", "ice cream", "jatiwangi", "cat"],
      photos: [
        "012-1.webp",
        "012-2.webp",
        "012-3.webp",
        "012-4.webp",
        "012-5.webp",
        "012-6.webp",
        "012-7.webp",
        "012-8.webp",
        "012-9.webp",
      ],
      videos: ["012-day1.MOV", "012-day2.MOV"],
    },

    {
      id: 7,
      chapter: 7,
      folder: "014-day",
      title: "014 day",
      subtitle: "kebab before work",
      cover: "014-day1.webp",
      date: "1 july 2026",
      sortDate: "2026-07-01",
      location: "cibarengkok, jatiwangi",
      maps: "cibarengkok, jatiwangi, cikarang barat, bekasi",
      mood: "🥙🥤📺🤍",
      story:
        "hari itu waktunya mepet banget. kamu baru pulang shift pagi, sementara mas bentar lagi masuk shift malem. di sela waktu satu dua jam itu kita mutusin buat keluar sebentar. beli kebab, beli smoothies, terus balik lagi ke kos. makannya sambil nonton upin ipin, ngobrol ngalor ngidul, ketawa-ketawa nggak jelas. cuma beberapa jam, tapi rasanya cukup buat bikin capek satu hari hilang.",
      tags: ["day 14", "kebab", "smoothies", "kos", "upin ipin", "before work"],
      photos: ["014-day1.webp", "014-day2.webp", "014-day3.webp"],
      videos: [],
    },

    {
      id: 8,
      chapter: 8,
      folder: "painting-date",
      title: "painting date",
      subtitle: "picnic painting day",
      cover: "painting-date2.webp",
      coverPosition: "50% 75%",
      date: "4 july 2026",
      sortDate: "2026-07-04",
      location: "central park meikarta",
      maps: "central park meikarta, cikarang selatan, bekasi",
      mood: "🎨🧺🌇🤍",
      story:
        "hari itu sebenernya niatnya piknik, tapi dibikin ada rasa painting date juga. berangkat jam dua siang, terus beli bunga dulu di central park, deket indomaret. habis itu belanja ke indomaret, sewa alat piknik, terus nyari spot di dekat danau yang ngadep senja. nggak ada yang spesial secara besar, tapi justru itu yang bikin berasa berarti. ini first time buat mas dan first time juga buat kamu. kita ngerapiin tempat, makan jajan, ngelukis, liatin senja, terus lanjut duduk di pinggir danau sampai malam setelah maghrib. pelan-pelan, sederhana, tapi jadi kenangan yang berat buat dilupain.",
      tags: ["picnic", "painting", "sunset", "meikarta", "first time", "date"],
      photos: [
        "painting-date1.webp",
        "painting-date2.webp",
        "painting-date3.webp",
        "painting-date4.webp",
        "painting-date5.webp",
        "painting-date6.webp",
        "painting-date7.webp",
        "painting-date8.webp",
        "painting-date9.webp",
        "painting-date10.webp",
        "painting-date11.webp",
        "painting-date12.webp",
      ],

      videos: [
        "painting-date1.mp4",
        "painting-date2.mp4",
        "painting-date3.mp4",
      ],
    },
  ];

  const enrich_album = (album) => {
    const photos = (album.photos || []).map((file) =>
      photo_path(album.folder, file),
    );
    const videos = (album.videos || []).map((file) =>
      video_path(album.folder, file),
    );

    const cover_file =
      album.cover || album.photos?.[0] || album.videos?.[0] || "cover.webp";

    const cover_type =
      album.coverType || (is_video_file(cover_file) ? "video" : "photo");

    const cover =
      cover_type === "video"
        ? video_path(album.folder, cover_file)
        : cover_path(album.folder, cover_file);

    return {
      ...album,
      // Optional text supplied by Chelsea. Empty notes are never rendered.
      chelseaNote: album.chelseaNote || "",
      cover,
      coverType: cover_type,
      photos,
      videos,
      coverFile: cover_file,
      photoFiles: [...(album.photos || [])],
      videoFiles: [...(album.videos || [])],
    };
  };

  const gallery_data = gallery.map(enrich_album);

  const get_album_by_id = (id) =>
    gallery_data.find((item) => String(item.id) === String(id));

  const get_album_by_folder = (folder) =>
    gallery_data.find((item) => item.folder === folder);

  const get_photo_by_index = (album, index) => {
    if (!album || !album.photos || !album.photos[index]) return "";
    return album.photos[index];
  };

  const get_video_by_index = (album, index) => {
    if (!album || !album.videos || !album.videos[index]) return "";
    return album.videos[index];
  };

  const get_random_album = () => {
    if (!gallery_data.length) return null;
    return gallery_data[Math.floor(Math.random() * gallery_data.length)];
  };

  const get_random_cover = () => {
    const album = get_random_album();
    return album ? album.cover : "";
  };

  const get_random_video = () => {
    const video_albums = gallery_data.filter(
      (item) => item.videos && item.videos.length,
    );
    if (!video_albums.length) return "";
    const album = video_albums[Math.floor(Math.random() * video_albums.length)];
    return album.videos[Math.floor(Math.random() * album.videos.length)];
  };

  window.our_museum = {
    base,
    video_base,
    gallery: gallery_data,
    get_album_by_id,
    get_album_by_folder,
    get_photo_by_index,
    get_video_by_index,
    get_random_album,
    get_random_cover,
    get_random_video,
  };

  window.gallery = gallery_data;
  window.getAlbumById = get_album_by_id;
  window.getAlbumByFolder = get_album_by_folder;
  window.getPhotoByIndex = get_photo_by_index;
  window.getVideoByIndex = get_video_by_index;
  window.getRandomAlbum = get_random_album;
  window.getRandomCover = get_random_cover;
  window.getRandomVideo = get_random_video;
})();
