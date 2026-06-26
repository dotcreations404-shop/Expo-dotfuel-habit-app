const fs = require('fs');

try {
  const schema = JSON.parse(fs.readFileSync('/Users/doran/.gemini/antigravity-ide/brain/6926ab28-e9e7-41a2-ae66-292b32fbea88/scratch/schema.json', 'utf8'));
  console.log('Meals table schema:', JSON.stringify(schema, null, 2).slice(0, 4000));
} catch (err) {
  console.error(err);
}
