import fs from 'node:fs';

// Retain coverage of one-track behavior even when the production playlist grows.
// Production tracks are exercised separately by check-playlist.mjs.
export const useSingleTrackFixture = async context => {
  await context.route('**/music-playlist.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nwindow.MuseumPlaylist = window.MuseumPlaylist.slice(0, 1);\n` });
  });
};

// Album grouping regression uses the original seven-track catalogue as a fixture.
// The live expanded catalogue is tested by check-prepared-audio.mjs.
export const useLegacyLibraryFixture = async context => {
  const tracks = JSON.parse(fs.readFileSync('scripts/audio-playlist-legacy.json', 'utf8'));
  await context.route('**/music-playlist.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nwindow.MuseumPlaylist = ${JSON.stringify(tracks)};\n` });
  });
};
