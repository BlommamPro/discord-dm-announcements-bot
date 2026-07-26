const fs = require('fs');
const path = require('path');

function loadJson(filePath, defaultValue) {
    const fullPath = path.join(process.cwd(), filePath);
    try {
        if (!fs.existsSync(fullPath)) {
            saveJson(filePath, defaultValue);
            return defaultValue;
        }
        const data = fs.readFileSync(fullPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error cargando ${filePath}:`, error.message);
        return defaultValue;
    }
}

function saveJson(filePath, data) {
    const fullPath = path.join(process.cwd(), filePath);
    try {
        fs.writeFileSync(fullPath, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error(`Error guardando ${filePath}:`, error.message);
    }
}

module.exports = { loadJson, saveJson };