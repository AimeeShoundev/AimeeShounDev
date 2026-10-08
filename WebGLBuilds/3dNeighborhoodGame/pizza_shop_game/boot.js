// Boot separately so a failed Three.js download does not leave an endless loading screen.
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const error = document.getElementById('error');
const errorText = document.getElementById('errorText');
const paths = [
  'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js',
  'https://unpkg.com/three@0.165.0/build/three.module.js',
];
let failed = false;
window.addEventListener('error', e => { if(!failed && !document.getElementById('start').classList.contains('hidden')) return; show(e.message || 'Unknown browser error'); });
window.addEventListener('unhandledrejection', e => show(e.reason?.message || String(e.reason)));
function show(message) {
  failed=true;
  console.error('Pizza Shop: ',message);
  loading.classList.add('hidden');
  document.getElementById('start').classList.add('hidden');
  errorText.textContent=message + ' — Make sure you are running the whole extracted folder using a local web server and can access the internet.';
  error.classList.remove('hidden');
}
(async()=>{
  if(location.protocol==='file:') {
    show('This project cannot be opened directly as a file (file://). Use START_GAME_WINDOWS.bat or run npx serve . in the project folder.');
    return;
  }
  loadingText.textContent='Connecting to the 3D engine…';
  try {
    // Imports of GLTFLoader resolve `three` via the import map in index.html.
    await import('./script.js');
  } catch (err) {
    show('Could not start Three.js: '+(err?.message||err)+'. If using a school network, its firewall may be blocking cdn.jsdelivr.net.');
  }
})();
