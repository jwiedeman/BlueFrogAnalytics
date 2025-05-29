/**
 * Analyze network requests made by a webpage.
 * @param {object} page - Puppeteer page instance.
 * @returns {Promise<Array>} Array of network request details.
 */
async function analyzeNetworkRequests(page) {
    console.log(`🔍 Starting network request analysis...`);

    const requests = [];

    page.on('request', (request) => {
        const requestData = {
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
        };

        console.log(`➡️ Captured Request: ${requestData.method} ${requestData.url}`);
        requests.push(requestData);
    });

    return new Promise((resolve) => {
        console.log(`⏳ Capturing network requests for 5 seconds...`);
        
        setTimeout(() => {
            console.log(`✅ Network request analysis complete. Captured ${requests.length} requests.`);
            resolve(requests);
        }, 5000);
    });
}

export { analyzeNetworkRequests };
