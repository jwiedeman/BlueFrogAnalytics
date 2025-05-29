/**
 * Analyze cookies from the given Puppeteer page.
 * @param {object} page - Puppeteer page instance.
 * @returns {Promise<Array>} An array of cookie objects with name and value.
 */
async function analyzeCookies(page) {
    console.log(`🍪 Extracting cookies from the page: ${await page.url()}`);

    try {
        const cookies = await page.cookies();
        console.log(`✅ Cookies extracted:`, cookies.map(c => ({ name: c.name, value: c.value })));
        return cookies.map(cookie => ({ name: cookie.name, value: cookie.value }));
    } catch (error) {
        console.error(`❌ Failed to analyze cookies:`, error.message);
        return [];
    }
}

export { analyzeCookies };
