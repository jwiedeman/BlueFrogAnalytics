const fs = require('fs');
const path = require('path');
const reval = require('./lib/ruleEngine').evaluate;
(async ()=>{
  // Determine HAR path from command-line argument
  // Usage: node testEvaluate.js <path-to-har>
  const harArg = process.argv[2];
  if (!harArg) {
    console.error('Usage: node testEvaluate.js <path-to-har>');
    process.exit(1);
  }
  // Use provided HAR path (absolute or relative)
  const harPath = harArg;
  console.log('Using HAR:', harPath);
  let harString;
  try {
    harString = fs.readFileSync(harPath, 'utf8');
  } catch(e) { console.error('Read error', e); process.exit(1); }
  let harJson;
  try { harJson = JSON.parse(harString); } catch(e) { console.error('Parse HAR JSON error', e); process.exit(1); }
  const rulesDir = path.join(__dirname,'rules');
  const dimsDir = path.join(__dirname,'dimensions');
  const ruleNames = fs.readdirSync(rulesDir).filter(f => /\.(json|ya?ml)$/i.test(f));
  console.log('Rule files:', ruleNames);
  const rules = [];
  for (const f of ruleNames) {
    console.log('Reading rule file:', f);
    const content = fs.readFileSync(path.join(rulesDir,f),'utf8');
    let obj;
    try { obj = JSON.parse(content); } catch (e) {
      console.error('JSON.parse error in', f, e);
      try { obj = require('js-yaml').load(content); } catch (e2) { console.error('YAML load error in', f, e2); }
    }
    console.log('Parsed rule:', obj);
    rules.push(obj);
  }
  const dimNames = fs.readdirSync(dimsDir).filter(f => /\.(json|ya?ml)$/i.test(f));
  console.log('Dimension files:', dimNames);
  const dimensions = [];
  for (const f of dimNames) {
    console.log('Reading dimension file:', f);
    const content = fs.readFileSync(path.join(dimsDir,f),'utf8');
    let obj;
    try { obj = JSON.parse(content); } catch (e) {
      console.error('JSON.parse error in dimension', f, e);
      try { obj = require('js-yaml').load(content); } catch (e2) { console.error('YAML load error in dimension', f, e2); }
    }
    console.log('Parsed dimension:', obj);
    dimensions.push(obj);
  }
  console.log('Rules loaded:', rules.map(r => r.id||r.name));
  console.log('Dimensions loaded:', dimensions.map(d => d.key));
  let result;
  try { result = reval(harJson, rules, dimensions); console.log('Result:', JSON.stringify(result, null, 2)); } 
  catch(e) { console.error('Evaluate threw', e); }
})();
