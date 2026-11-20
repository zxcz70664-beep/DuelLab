const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/styles.css'), 'utf8');

test('all page assets referenced by the HTML exist', () => {
  assert.match(html, /href="\/styles\.css"/);
  assert.match(html, /src="\/app\.js"/);
  assert.ok(fs.existsSync(path.join(root, 'public/styles.css')));
  assert.ok(fs.existsSync(path.join(root, 'public/app.js')));
});

test('the four main workspace pages are present', () => {
  for (const id of ['home', 'decks', 'library', 'settings']) {
    assert.match(html, new RegExp('id="' + id + '"'));
    assert.match(html, new RegExp('data-page="' + id + '"'));
  }
});

test('deck management controls are wired in the client script', () => {
  for (const id of ['newDeck', 'deckName', 'addCard', 'deleteDeck', 'exportDeck', 'importDeck']) {
    assert.ok(html.includes('id="' + id + '"'), 'missing HTML control: ' + id);
    assert.ok(js.includes('$("#' + id + '")') || js.includes('$("' + id + '")'), 'control is not referenced by app.js: ' + id);
  }
});

test('local persistence and JSON import/export are present', () => {
  assert.match(js, /localStorage\.getItem/);
  assert.match(js, /localStorage\.setItem/);
  assert.match(js, /JSON\.parse/);
  assert.match(js, /JSON\.stringify/);
  assert.match(js, /createObjectURL/);
});

test('mobile responsive breakpoints are defined', () => {
  assert.match(css, /@media\s*\(max-width:\s*800px\)/);
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
});


test('basic deck structure validation is implemented without claiming banlist validation', () => {
  assert.match(js, /function validateDeck\(d\)/);
  assert.match(js, /main\.length<40\|\|main\.length>60/);
  assert.match(js, /extra\.length>15/);
  assert.match(js, /n>3/);
  assert.match(html, /禁限卡表与特殊构筑限制尚未检查/);
});


test('deck validation module enforces size limits and duplicate cap', () => {
  const { validateDeck } = require('../public/deck-validation.js');
  const make = (count, zone, prefix='Card') => Array.from({length:count}, (_,i)=>({name:prefix+' '+i,zone}));
  assert.equal(validateDeck({cards:make(40,'main')}).ok,true);
  assert.ok(validateDeck({cards:make(39,'main')}).errors.some(e=>e.includes('40–60')));
  assert.ok(validateDeck({cards:make(61,'main')}).errors.some(e=>e.includes('40–60')));
  assert.ok(validateDeck({cards:[...make(40,'main'),...make(16,'extra')]}).errors.some(e=>e.includes('额外卡组')));
  assert.ok(validateDeck({cards:[...make(39,'main'),...Array.from({length:4},()=>({name:'Blue-Eyes White Dragon',zone:'main'}))]}).errors.some(e=>e.includes('同名卡')));
});

test('deck validation module handles missing and blank card names safely', () => {
  const { validateDeck } = require('../public/deck-validation.js');
  const result = validateDeck({cards:[{name:'',zone:'main'},{zone:'main'}]});
  assert.equal(result.main,2);
  assert.equal(result.duplicates.length,0);
});
