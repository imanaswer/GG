const fs = require('fs');
const https = require('https');

const images = {
  games: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop',
  coaches: 'https://images.unsplash.com/photo-1580238166562-b91c0e352ef9?q=80&w=1200&auto=format&fit=crop',
  camps: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop',
  events: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1200&auto=format&fit=crop',
  workshops: 'https://images.unsplash.com/photo-1511886929837-354d827aae26?q=80&w=1200&auto=format&fit=crop',
  leaders: 'https://images.unsplash.com/photo-1526566762798-8fac9c07aa69?q=80&w=1200&auto=format&fit=crop',
  about: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1200&auto=format&fit=crop'
};

Object.entries(images).forEach(([name, url]) => {
  const download = (downloadUrl) => {
    https.get(downloadUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        download(res.headers.location);
      } else {
        const file = fs.createWriteStream(`public/cinematic/${name}_real.jpg`);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${name}`);
        });
      }
    }).on('error', (err) => {
      console.error(`Error downloading ${name}: ${err.message}`);
    });
  };
  download(url);
});
