const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const logger = require('./utils/logger');

function loadFlow(file) {
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    logger.error({ flow: filePath }, 'Flow file not found');
    process.exit(1);
  }
  try {
    const data = yaml.load(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(data)) {
      throw new Error('Flow must be an array of steps');
    }
    return data;
  } catch (err) {
    logger.error({ err, flow: filePath }, 'Failed to parse flow YAML');
    process.exit(1);
  }
}

module.exports = { loadFlow };