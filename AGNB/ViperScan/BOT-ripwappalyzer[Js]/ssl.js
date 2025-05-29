import tls from 'tls';

/**
 * Analyze the SSL certificate of a given URL.
 * @param {string} url - The website URL to analyze.
 * @returns {Promise<Object>} SSL certificate details.
 */
async function analyzeSSL(url) {
    console.log(`🔍 Starting SSL analysis for: ${url}`);

    return new Promise((resolve) => {
        try {
            const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
            console.log(`🌐 Extracted hostname: ${hostname}`);

            const socket = tls.connect(443, hostname, {}, () => {
                const cert = socket.getPeerCertificate();

                if (!cert || Object.keys(cert).length === 0) {
                    console.warn(`⚠️ No certificate received for ${hostname}`);
                    resolve({});
                    return;
                }

                console.log(`✅ SSL certificate retrieved for ${hostname}`);
                console.log(`🔹 Issuer: ${cert.issuer?.O || 'Unknown'}`);
                console.log(`📅 Valid Until: ${cert.valid_to || 'Unknown'}`);

                resolve({
                    issuer: cert.issuer?.O || '',
                    validTo: cert.valid_to || '',
                });

                socket.end();
            });

            socket.on('error', (err) => {
                console.error(`❌ SSL Analysis Failed for ${hostname}: ${err.message}`);
                resolve({});
            });

        } catch (error) {
            console.error(`❌ Unexpected error during SSL analysis:`, error.message);
            resolve({});
        }
    });
}

export { analyzeSSL };
