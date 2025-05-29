import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url' ;

/**
 * Load all technology definitions from JSON files.
 * @returns {Array} List of technologies with names.
 */
function loadTechnologies() {
    console.log(`📂 Initializing technology loading...`);

    // Resolve __dirname equivalent in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    console.log(`📂 Resolved directory: ${__dirname}`);

    // Read technology definition files
    const techDir = path.join(__dirname, 'technologies');
    console.log(`📂 Loading technology files from: ${techDir}`);

    let technologies = [];
    let techFiles;

    try {
        techFiles = fs.readdirSync(techDir);
        console.log(`📂 Found ${techFiles.length} technology files.`);
    } catch (error) {
        console.error(`❌ Error reading technology directory:`, error.message);
        return [];
    }

    // Load and parse each technology JSON file
    for (const file of techFiles) {
        const filePath = path.join(techDir, file);
        console.log(`📄 Processing file: ${file}`);

        try {
            const rawData = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(rawData);

            // Ensure technology names are preserved
            Object.entries(data).forEach(([name, techData]) => {
                if (!name || name.trim() === "") {
                    console.warn(`⚠️ [DEBUG] Skipping technology without a name in ${file}:`, JSON.stringify(techData, null, 2));
                } else {
                    technologies.push({ name, ...techData });
                }
            });

            console.log(`✅ Loaded ${Object.keys(data).length} technologies from ${file}`);
        } catch (error) {
            console.error(`❌ Failed to load ${file}:`, error.message);
        }
    }

    console.log(`🎯 Successfully loaded ${technologies.length} total technologies.`);
    return technologies;
}

export { loadTechnologies };
