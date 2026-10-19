// Retain coverage of one-track behavior even when the production playlist grows.
// Production tracks are exercised separately by check-playlist.mjs.
export const useSingleTrackFixture = async context => {
  await context.route('**/music-playlist.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nwindow.MuseumPlaylist = window.MuseumPlaylist.slice(0, 1);\n` });
  });
};
