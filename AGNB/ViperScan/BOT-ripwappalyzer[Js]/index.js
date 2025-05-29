import { scanTechnologies } from './techDetection.js';

(async () => {
    const url = process.argv[2] || 'https://example.com';
    console.log(`🔍 Scanning: ${url}`);

    const detected = await scanTechnologies(url);
    console.log(`✅ Technologies detected:`, detected);
})();
