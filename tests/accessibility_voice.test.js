const fs = require('fs');
const vm = require('vm');

const script = fs.readFileSync('d:/accessedu/static/js/accessibility.js', 'utf8');

const fakeDocument = {
  documentElement: { style: { setProperty() {} }, setAttribute() {}, removeAttribute() {}, getAttribute() { return null; } },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  getElementById() { return null; },
  addEventListener() {},
  body: { innerText: 'AccessEdu dashboard page' },
};

const fakeWindow = {
  speechSynthesis: null,
  SpeechRecognition: null,
  webkitSpeechRecognition: null,
  location: { assign() {} },
  setTimeout(fn) { return fn(); },
};

const context = {
  window: fakeWindow,
  document: fakeDocument,
  localStorage: { getItem() { return null; }, setItem() {} },
  console,
  setTimeout: fakeWindow.setTimeout,
  clearTimeout() {},
  SpeechSynthesisUtterance: class {},
};

vm.createContext(context);
vm.runInContext(script, context);

if (!context.window.AccessEdu) {
  throw new Error('AccessEdu global API is missing');
}

const english = context.window.AccessEdu.normalizeCommand('Open Academic');
if (english !== 'open academic') {
  throw new Error('English normalization failed: ' + english);
}

const hindi = context.window.AccessEdu.normalizeCommand('अकादमिक खोलें');
if (hindi !== 'अकादमिक खोलें') {
  throw new Error('Hindi normalization failed: ' + hindi);
}

const match = context.window.AccessEdu.matchCommand('open academic');
if (!match || match.action !== 'open' || match.target !== 'academic') {
  throw new Error('Voice command matching failed for English command');
}

const matchHi = context.window.AccessEdu.matchCommand('अकादमिक खोलें');
if (!matchHi || matchHi.target !== 'academic') {
  throw new Error('Voice command matching failed for Hindi command');
}

console.log('voice assistant tests passed');
