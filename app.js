const form = document.querySelector('#report-form');
const tabs = [...document.querySelectorAll('.tab')];
const reportView = document.querySelector('#report-view');
const dashboardView = document.querySelector('#dashboard-view');
const issueInput = document.querySelector('#issue-type');
const description = document.querySelector('#description');
const charCount = document.querySelector('#char-count');
const cameraButton = document.querySelector('#camera-button');
const fileInput = document.querySelector('#file-input');
const cameraPreview = document.querySelector('#camera-preview');
const photoPreview = document.querySelector('#photo-preview');
const evidenceEmpty = document.querySelector('#evidence-empty');
const cameraControls = document.querySelector('#camera-controls');
const captureButton = document.querySelector('#capture-button');
const cancelCamera = document.querySelector('#cancel-camera');
const removePhoto = document.querySelector('#remove-photo');
const locationButton = document.querySelector('#location-button');
const locationStatus = document.querySelector('#location-status');
const locationCard = document.querySelector('.location-card');
const locationMap = document.querySelector('#location-map');
const mapCaption = document.querySelector('#map-caption');
const submitButton = document.querySelector('#submit-button');
const reportList = document.querySelector('#report-list');
const emptyState = document.querySelector('#empty-state');
const reportCount = document.querySelector('#report-count');
const feedTotal = document.querySelector('#feed-total');
const toast = document.querySelector('#toast');

const MAX_PHOTO_WIDTH = 800;
let photoData = '';
let coords = null;
let cameraStream = null;
let toastTimer;

/* ---------- Storage: IndexedDB (photos are too big for localStorage) ---------- */
const DB_NAME = 'roadsaathi';
const STORE = 'reports';
let dbPromise;
let memoryReports = []; // fallback if IndexedDB is blocked (e.g. private mode)
let useMemory = false;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}
async function withStore(mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));
    transaction.oncomplete = () => resolve(request && request.result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}
async function getReports() {
  let list;
  if (useMemory) list = memoryReports;
  else {
    try { list = await withStore('readonly', store => store.getAll()); }
    catch { useMemory = true; list = memoryReports; }
  }
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}
async function addReports(reports) {
  if (!useMemory) {
    try {
      await withStore('readwrite', store => { reports.forEach(r => store.put(r)); });
      return;
    } catch { useMemory = true; }
  }
  memoryReports.push(...reports);
}
async function clearReports() {
  memoryReports = [];
  if (!useMemory) {
    try { await withStore('readwrite', store => store.clear()); } catch { useMemory = true; }
  }
}

/* ---------- UI helpers ---------- */
function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function showView(view) {
  const dashboard = view === 'dashboard';
  if (dashboard) closeCamera();
  reportView.hidden = dashboard;
  dashboardView.hidden = !dashboard;
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));
  if (dashboard) renderReports();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
tabs.forEach(tab => tab.addEventListener('click', () => showView(tab.dataset.view)));
document.querySelector('#first-report').addEventListener('click', () => showView('report'));

document.querySelectorAll('.issue-option').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.issue-option').forEach(option => option.classList.remove('selected'));
  button.classList.add('selected');
  issueInput.value = button.dataset.type;
}));
description.addEventListener('input', () => { charCount.textContent = `${description.value.length}/180`; });

/* ---------- Photo: camera, upload, resize ---------- */
function toJpeg(source, width, height) {
  const scale = Math.min(1, MAX_PHOTO_WIDTH / width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext('2d').drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}
function stopCamera() {
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  cameraPreview.srcObject = null;
}
function closeCamera() {
  stopCamera();
  cameraPreview.hidden = true;
  cameraControls.hidden = true;
  if (!photoData) evidenceEmpty.hidden = false;
}
function setPhoto(dataUrl) {
  photoData = dataUrl;
  photoPreview.src = dataUrl;
  photoPreview.hidden = false;
  evidenceEmpty.hidden = true;
  cameraPreview.hidden = true;
  cameraControls.hidden = true;
  removePhoto.hidden = false;
  stopCamera();
}
function clearPhoto() {
  photoData = '';
  photoPreview.removeAttribute('src');
  photoPreview.hidden = true;
  evidenceEmpty.hidden = false;
  cameraPreview.hidden = true;
  cameraControls.hidden = true;
  removePhoto.hidden = true;
  fileInput.value = '';
  stopCamera();
}
removePhoto.addEventListener('click', clearPhoto);
cancelCamera.addEventListener('click', closeCamera);

cameraButton.addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia) {
    notify('Camera needs HTTPS or localhost. Choose a photo instead.');
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    cameraPreview.srcObject = cameraStream;
    cameraPreview.hidden = false;
    evidenceEmpty.hidden = true;
    cameraControls.hidden = false;
  } catch (error) {
    notify(error.name === 'NotAllowedError'
      ? 'Allow camera access in your browser settings, or choose a photo.'
      : 'Could not open the camera. Try choosing a photo.');
  }
});

captureButton.addEventListener('click', () => {
  if (!cameraPreview.videoWidth) {
    notify('Camera is still starting. Try again in a moment.');
    return;
  }
  setPhoto(toJpeg(cameraPreview, cameraPreview.videoWidth, cameraPreview.videoHeight));
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    setPhoto(toJpeg(image, image.naturalWidth, image.naturalHeight));
    URL.revokeObjectURL(url);
  };
  image.onerror = () => {
    notify('That file could not be read as an image.');
    URL.revokeObjectURL(url);
    fileInput.value = '';
  };
  image.src = url;
});

/* ---------- Location ---------- */
function resetLocation() {
  clearPinHistory();
  coords = null;
  locationStatus.textContent = 'Location hasn’t been added yet';
  locationMap.hidden = true;
  locationCard.classList.remove('done');
  locationButton.textContent = 'Use my location';
}
locationButton.addEventListener('click', () => {
  if (!navigator.geolocation) {
    notify('This browser does not support location.');
    return;
  }
  if (!window.isSecureContext) {
    notify('Location needs HTTPS or localhost.');
    return;
  }
  locationButton.disabled = true;
  locationButton.textContent = 'Locating…';
  navigator.geolocation.getCurrentPosition(position => {
    coords = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: Math.round(position.coords.accuracy)
    };
    updateLocationText();
    locationMap.hidden = false;
    showPickMap();
    locationCard.classList.add('done');
    locationButton.textContent = 'Update';
    locationButton.disabled = false;
  }, error => {
    locationButton.disabled = false;
    locationButton.textContent = coords ? 'Update' : 'Use my location';
    const messages = {
      1: 'Location blocked. Allow it in your browser settings and try again.',
      2: 'Location unavailable. Check that GPS or Wi-Fi is on.',
      3: 'Location timed out. Try again, ideally with a clear view of the sky.'
    };
    notify(messages[error.code] || 'Could not get your location.');
  }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
});


/* ---------- Maps (Leaflet + OpenStreetMap) ---------- */
const mapsAvailable = typeof L !== 'undefined';
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ISSUE_COLORS = { 'Pothole': '#d9534f', 'Damaged road': '#e79a4d', 'Road closure': '#6f5bd3', 'Construction': '#2f7fb8' };
let pickMap, pickMarker, pickCircle, reportsMap, reportsLayer;
let pinHistory = [], pinIndex = -1, undoButton, redoButton;
const MAX_PIN_HISTORY = 50;

function addTiles(map) { L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(map); }
function pinIcon(color) {
  return L.divIcon({ className: '', html: `<span class="map-dot" style="background:${color}"></span>`, iconSize: [20, 20], iconAnchor: [10, 10] });
}
function updateLocationText() {
  locationStatus.textContent = coords.adjusted
    ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (adjusted by you)`
    : `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${coords.accuracy} m)`;
}
function movePin(latlng) {
  if (coords && coords.lat === latlng.lat && coords.lng === latlng.lng) return;
  coords = { lat: latlng.lat, lng: latlng.lng, adjusted: true };
  pickMarker.setLatLng(latlng);
  pickCircle.setRadius(0);
  updateLocationText();
  pushPinHistory();
}

/* ---------- Undo / redo for the pin ---------- */
function refreshHistoryButtons() {
  if (!undoButton || !redoButton) return;
  undoButton.disabled = pinIndex <= 0;
  redoButton.disabled = pinIndex < 0 || pinIndex >= pinHistory.length - 1;
}
function resetPinHistory() {
  pinHistory = [{ ...coords }];
  pinIndex = 0;
  refreshHistoryButtons();
}
function clearPinHistory() {
  pinHistory = [];
  pinIndex = -1;
  refreshHistoryButtons();
}
function pushPinHistory() {
  pinHistory = pinHistory.slice(0, pinIndex + 1); // a new move discards the redo path
  pinHistory.push({ ...coords });
  if (pinHistory.length > MAX_PIN_HISTORY) pinHistory.shift();
  pinIndex = pinHistory.length - 1;
  refreshHistoryButtons();
}
function stepPin(delta) {
  const next = pinIndex + delta;
  if (!pickMap || next < 0 || next >= pinHistory.length) return;
  pinIndex = next;
  coords = { ...pinHistory[pinIndex] };
  const latlng = [coords.lat, coords.lng];
  pickMarker.setLatLng(latlng);
  pickCircle.setLatLng(latlng);
  pickCircle.setRadius(coords.adjusted ? 0 : coords.accuracy);
  updateLocationText();
  if (!pickMap.getBounds().contains(latlng)) pickMap.panTo(latlng);
  refreshHistoryButtons();
}
function addHistoryControl() {
  const UNDO_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>';
  const HistoryControl = L.Control.extend({
    options: { position: 'topright' },
    onAdd() {
      const box = L.DomUtil.create('div', 'history-control');
      undoButton = L.DomUtil.create('button', 'history-btn undo', box);
      redoButton = L.DomUtil.create('button', 'history-btn redo', box);
      [[undoButton, 'Undo pin move', -1], [redoButton, 'Redo pin move', 1]].forEach(([button, label, step]) => {
        button.type = 'button';
        button.title = label;
        button.setAttribute('aria-label', label);
        button.innerHTML = UNDO_ICON;
        L.DomEvent.on(button, 'click', () => stepPin(step));
      });
      L.DomEvent.disableClickPropagation(box);
      refreshHistoryButtons();
      return box;
    }
  });
  pickMap.addControl(new HistoryControl());
}
function showPickMap() {
  if (!mapsAvailable) { mapCaption.textContent = 'Location captured'; return; }
  const latlng = [coords.lat, coords.lng];
  if (!pickMap) {
    pickMap = L.map('pick-map').setView(latlng, 17);
    addTiles(pickMap);
    pickCircle = L.circle(latlng, { radius: coords.accuracy, color: '#176b51', weight: 1, fillOpacity: 0.12 }).addTo(pickMap);
    pickMarker = L.marker(latlng, { draggable: true, icon: pinIcon('#d9534f') }).addTo(pickMap);
    pickMarker.on('dragend', () => movePin(pickMarker.getLatLng()));
    pickMap.on('click', event => movePin(event.latlng));
    addHistoryControl();
  } else {
    pickMarker.setLatLng(latlng);
    pickCircle.setLatLng(latlng);
    pickCircle.setRadius(coords.accuracy);
  }
  pickMap.invalidateSize();
  pickMap.setView(latlng, 17);
  resetPinHistory(); // each new GPS fix starts a fresh history
}
function renderReportsMap(reports) {
  const box = document.querySelector('#reports-map');
  const legend = document.querySelector('#map-legend');
  if (!mapsAvailable || reports.length === 0) { box.hidden = true; legend.hidden = true; return; }
  box.hidden = false;
  legend.hidden = false;
  if (!reportsMap) {
    reportsMap = L.map(box).setView([13.0827, 80.2707], 11);
    addTiles(reportsMap);
    reportsLayer = L.layerGroup().addTo(reportsMap);
    legend.replaceChildren(...Object.entries(ISSUE_COLORS).map(([name, color]) => {
      const item = el('span', '');
      const dot = el('i');
      dot.style.background = color;
      item.append(dot, name);
      return item;
    }));
  }
  reportsLayer.clearLayers();
  const points = [];
  reports.forEach(report => {
    const latlng = [report.coords.lat, report.coords.lng];
    points.push(latlng);
    const popup = el('div', 'map-popup');
    popup.append(el('strong', '', report.type));
    popup.append(el('div', '', report.route ? `${report.route.zoneName} zone (simulated)` : 'Outside demo area'));
    if (report.note) popup.append(el('div', '', report.note));
    if (report.photo) { const img = el('img'); img.src = report.photo; img.alt = ''; popup.append(img); }
    L.marker(latlng, { icon: pinIcon(ISSUE_COLORS[report.type] || '#176b51') }).bindPopup(popup).addTo(reportsLayer);
  });
  reportsMap.invalidateSize();
  reportsMap.fitBounds(points, { padding: [30, 30], maxZoom: 16 });
}

/* ---------- Submit ---------- */
function buildReport({ type, note, photo, coords: position, sample = false }) {
  const match = nearestZone(position.lat, position.lng);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    type,
    note,
    photo,
    coords: position,
    sample,
    route: match ? { zoneId: match.zone.id, zoneName: match.zone.name, km: match.km } : null
  };
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!photoData) { notify('Add a photo of the issue first.'); return; }
  if (!coords) { notify('Add the location of the issue first.'); return; }
  submitButton.disabled = true;
  try {
    await addReports([buildReport({ type: issueInput.value, note: description.value.trim(), photo: photoData, coords })]);
    description.value = '';
    charCount.textContent = '0/180';
    clearPhoto();
    resetLocation();
    await refreshCount();
    notify('Report saved on this device. Routing is simulated.');
    showView('dashboard');
  } catch {
    notify('Could not save the report. Try again.');
  } finally {
    submitButton.disabled = false;
  }
});

/* ---------- Dashboard ---------- */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function reportCard(report) {
  const card = el('article', 'report-card');
  if (report.photo) {
    const image = el('img', 'report-image');
    image.src = report.photo;
    image.alt = `${report.type} evidence`;
    card.append(image);
  } else {
    card.append(el('div', 'report-image report-placeholder', '⌁'));
  }
  const info = el('div', 'report-info');
  const head = el('div', 'report-head');
  head.append(el('span', 'issue-badge', report.type),
    el('span', 'status-badge', report.sample ? 'Sample · Received' : 'Received (demo)'));
  info.append(head);
  info.append(el('h3', '', report.route ? `${report.route.zoneName} area` : 'Outside demo area'));
  if (report.note) info.append(el('p', '', report.note));
  const meta = el('div', 'report-meta');
  meta.append(
    el('span', '', new Date(report.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })),
    el('span', '', `${report.coords.lat.toFixed(4)}, ${report.coords.lng.toFixed(4)}`)
  );
  if (report.coords.accuracy) meta.append(el('span', '', `±${report.coords.accuracy} m`));
  info.append(meta);
  info.append(el('div', 'route-line', report.route
    ? `Simulated routing → ${report.route.zoneName} zone (Zone ${report.route.zoneId}), ${report.route.km.toFixed(1)} km from zone centre`
    : 'Simulated routing → no zone assigned'));
  card.append(info);
  return card;
}
async function refreshCount() {
  const reports = await getReports();
  reportCount.textContent = reports.length;
  return reports;
}
async function renderReports() {
  const reports = await refreshCount();
  feedTotal.textContent = `${reports.length} report${reports.length === 1 ? '' : 's'}`;
  reportList.replaceChildren(...reports.map(reportCard));
  renderReportsMap(reports);
  emptyState.hidden = reports.length > 0;
}

document.querySelector('#clear-reports').addEventListener('click', async () => {
  if (!confirm('Delete all reports stored on this device?')) return;
  await clearReports();
  renderReports();
});
document.querySelector('#load-samples').addEventListener('click', async () => {
  const samples = [
    { type: 'Pothole', note: 'Sample: deep pothole near the junction', coords: { lat: 13.0418, lng: 80.2341 } },
    { type: 'Damaged road', note: 'Sample: cracked surface after rain', coords: { lat: 13.0067, lng: 80.2573 } },
    { type: 'Construction', note: 'Sample: lane blocked by pipe work', coords: { lat: 12.9815, lng: 80.2180 } },
    { type: 'Road closure', note: 'Sample: barricaded stretch', coords: { lat: 13.1143, lng: 80.1548 } }
  ];
  await addReports(samples.map(s => buildReport({ ...s, photo: '', sample: true })));
  renderReports();
});

refreshCount();