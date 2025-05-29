import fetch from 'node-fetch';

/**
 * Analyze HTTP headers of a given URL.
 * @param {string} url - The URL to fetch headers from.
 * @returns {Promise<Object>} An object containing the HTTP headers.
 */
async function analyzeHeaders(url) {
    console.log(`🔍 Fetching headers for: ${url}`);

    try {
        const response = await fetch(url);
        const headers = Object.fromEntries(response.headers.entries());

        console.log(`✅ Headers received for ${url}:`, headers);
        return headers;
    } catch (error) {
        console.error(`❌ Failed to fetch headers for ${url}:`, error.message);
        return {};
    }
}

export { analyzeHeaders };
