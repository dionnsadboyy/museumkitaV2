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
      cover: "uno1.jpeg",
      date: "17 june 2026",
      sortDate: "2026-06-17",
      location: "jatiwangi, cikarang",
      maps: "jalan kampung rt 4 rw 2, desa jatiwangi, kontrakan warna pink, belakang rumah putih, kontrakan no.21",
      mood: "🥹❤️",
      story:
        "hari kedua setelah kita kenal, kita kumpul rame-rame buat main uno bertujuh. yang kalah mukanya dicoret-coret pake spidol, jadi suasananya rame banget. sebenernya di hari itu nggak ada yang terlalu besar, tapi entah kenapa mas berani ngajak kamu foto bareng. dari momen yang keliatannya biasa aja itu, semuanya mulai kerasa beda buat mas.",
      tags: ["uno", "random", "friends", "first photo"],
      photos: [
        "uno1.jpeg",
        "uno2.jpeg",
        "uno3.jpeg",
        "uno4.jpeg",
        "uno5.jpeg",
        "uno6.jpeg",
        "uno7.jpeg",
        "uno8.jpeg",
        "uno9.jpeg",
        "uno10.jpeg",
        "uno11.jpeg",
        "uno12.jpeg",
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
      cover: "date1.jpeg",
      date: "22 june 2026",
      sortDate: "2026-06-22",
      location: "central park meikarta",
      maps: "central park meikarta, cikarang selatan, bekasi",
      mood: "🌃🤍",
      story:
        "awalnya cuma kepikiran buat keluar bentar habis pulang kerja, nggak ada rencana apa-apa, cuma pengen muter aja. yang nggak mas sangka, kamu malah dandan hampir dua jam sampai nyatok segala. akhirnya kita cuma ke indomaret beli jajan, terus duduk di pinggir danau dekat jembatan central park meikarta. ngobrol random, ngelihatin air, sesederhana itu. tapi anehnya malam itu rasanya nyaman banget buat mas.",
      tags: ["night ride", "meikarta", "lake", "random talk"],
      photos: [
        "date1.jpeg",
        "date2.jpeg",
        "date3.jpeg",
        "date4.jpeg",
        "date5.jpeg",
        "date6.jpeg",
        "date7.jpeg",
        "date8.jpeg",
        "date9.jpeg",
        "date10.jpeg",
      ],
      videos: ["day-date1.MOV", "day-date2.MOV"],
    },

    {
      id: 5,
      chapter: 5,
      folder: "jababeka-day",
      title: "jababeka day",
      subtitle: "random meet",
      cover: "jababeka1.jpg",
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
        "jababeka1.jpg",
        "jababeka2.jpg",
        "jababeka3.jpg",
        "jababeka4.jpg",
        "jababeka5.jpg",
        "jababeka6.jpg",
        "jababeka7.jpg",
        "jababeka8.jpg",
        "jababeka9.jpg",
        "jababeka10.jpg",
        "jababeka11.jpg",
        "jababeka12.jpg",
        "jababeka13.jpg",
        "jababeka14.jpg",
      ],
      videos: ["jababeka-day1.MOV", "jababeka-day2.MOV"],
    },

    {
      id: 6,
      chapter: 6,
      folder: "012-day",
      title: "012 day",
      subtitle: "hari kedua belas",
      cover: "012-1.jpg",
      date: "29 june 2026",
      sortDate: "2026-06-29",
      location: "jatiwangi, cikarang barat",
      maps: "jatiwangi, cikarang barat, bekasi",
      mood: "🍦🐈🤍",
      story:
        "hari itu kamu sebenernya lagi nggak baik-baik aja. habis diomongin macem-macem sama masa lalu, sampai sempet nangis juga di tempat kerja. mas nggak bisa ngelakuin banyak hal, jadi yang kepikiran cuma ngajak kamu muter bentar habis pulang kerja. kita keliling cikarang barat tanpa tujuan, berhenti di alfamart jatiwangi, beli es krim, duduk sebentar, ngasih makan kucing, terus pulang. nggak ada yang mewah, tapi ngeliat kamu bisa ketawa lagi malam itu rasanya udah lebih dari cukup buat mas.",
      tags: ["day 12", "night ride", "ice cream", "jatiwangi", "cat"],
      photos: [
        "012-1.jpg",
        "012-2.jpg",
        "012-3.jpg",
        "012-4.jpg",
        "012-5.jpg",
        "012-6.jpg",
        "012-7.jpg",
        "012-8.jpg",
        "012-9.jpg",
      ],
      videos: ["012-day1.MOV", "012-day2.MOV"],
    },

    {
      id: 7,
      chapter: 7,
      folder: "014-day",
      title: "014 day",
      subtitle: "kebab before work",
      cover: "014-day1.jpg",
      date: "1 july 2026",
      sortDate: "2026-07-01",
      location: "cibarengkok, jatiwangi",
      maps: "cibarengkok, jatiwangi, cikarang barat, bekasi",
      mood: "🥙🥤📺🤍",
      story:
        "hari itu waktunya mepet banget. kamu baru pulang shift pagi, sementara mas bentar lagi masuk shift malem. di sela waktu satu dua jam itu kita mutusin buat keluar sebentar. beli kebab, beli smoothies, terus balik lagi ke kos. makannya sambil nonton upin ipin, ngobrol ngalor ngidul, ketawa-ketawa nggak jelas. cuma beberapa jam, tapi rasanya cukup buat bikin capek satu hari hilang.",
      tags: ["day 14", "kebab", "smoothies", "kos", "upin ipin", "before work"],
      photos: ["014-day1.jpg", "014-day2.jpg", "014-day3.jpg"],
      videos: [],
    },

    {
      id: 8,
      chapter: 8,
      folder: "painting-date",
      title: "painting date",
      subtitle: "picnic painting day",
      cover: "painting-date1.jpeg",
      date: "4 july 2026",
      sortDate: "2026-07-04",
      location: "central park meikarta",
      maps: "central park meikarta, cikarang selatan, bekasi",
      mood: "🎨🧺🌇🤍",
      story:
        "hari itu sebenernya niatnya piknik, tapi dibikin ada rasa painting date juga. berangkat jam dua siang, terus beli bunga dulu di central park, deket indomaret. habis itu belanja ke indomaret, sewa alat piknik, terus nyari spot di dekat danau yang ngadep senja. nggak ada yang spesial secara besar, tapi justru itu yang bikin berasa berarti. ini first time buat mas dan first time juga buat kamu. kita ngerapiin tempat, makan jajan, ngelukis, liatin senja, terus lanjut duduk di pinggir danau sampai malam setelah maghrib. pelan-pelan, sederhana, tapi jadi kenangan yang berat buat dilupain.",
      tags: ["picnic", "painting", "sunset", "meikarta", "first time", "date"],
      photos: [
        "painting-date1.jpeg",
        "painting-date2.jpeg",
        "painting-date3.jpeg",
        "painting-date4.jpeg",
        "painting-date5.jpeg",
        "painting-date6.jpeg",
        "painting-date7.jpeg",
        "painting-date8.jpeg",
        "painting-date9.jpeg",
        "painting-date10.jpeg",
        "painting-date11.jpeg",
        "painting-date12.jpeg",
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
      album.cover || album.photos?.[0] || album.videos?.[0] || "cover.jpeg";

    const cover_type =
      album.coverType || (is_video_file(cover_file) ? "video" : "photo");

    const cover =
      cover_type === "video"
        ? video_path(album.folder, cover_file)
        : cover_path(album.folder, cover_file);

    return {
      ...album,
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
