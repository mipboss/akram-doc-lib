/** @type {import('next').NextConfig} */
export default {
  async headers() {
    // Browsers must re-check the service worker on every visit, or app updates could be held back for a day.
    return [{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }] }];
  },
};
