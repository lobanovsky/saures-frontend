function escHtml(str) {
  if (str == null) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderReadingPanel(r) {
  const primary = r.valuePrimary != null ? Number(r.valuePrimary).toFixed(3) : '—';
  const unit = escHtml(r.unit);
  const syncedAt = r.syncedAt
    ? `<div class="reading-timestamp">Обновлено ${escHtml(new Date(r.syncedAt).toLocaleString('ru-RU'))}</div>`
    : '';

  let extraHtml = '';
  if (r.valueExtra && r.valueExtra.trim() !== '') {
    const channels = r.valueExtra.split(';').map((v, i) =>
      `<span>Канал ${i + 2}: <strong>${escHtml(v.trim())}</strong> ${unit}</span>`
    );
    extraHtml = `<div class="reading-extra">${channels.join('')}</div>`;
  }

  return `
    <div>
      <span class="reading-value">${escHtml(primary)}</span>
      <span class="reading-unit">${unit}</span>
    </div>
    ${extraHtml}
    ${syncedAt}`;
}

function meterBadgeClass(device) {
  const type = `${device.meterType || ''} ${device.meterName || ''}`.toLowerCase();
  if (type.includes('горяч') || type.includes('гвс')) return 'device-badge device-badge-hot';
  if (type.includes('холод') || type.includes('хвс')) return 'device-badge device-badge-cold';
  return 'device-badge';
}

function showReading(meterId, reading) {
  const panel = document.getElementById(`reading-${meterId}`);
  if (!panel || !reading) return;
  panel.innerHTML = renderReadingPanel(reading);
  panel.classList.remove('hidden');
}

function showReadings(readings) {
  readings.forEach(reading => showReading(reading.meterId, reading));
}

function renderDeviceCard(device) {
  const stateOk = (device.state || '').toLowerCase() === 'ошибок нет' ||
                  (device.state || '').toLowerCase() === 'ok';
  const stateClass = stateOk ? 'device-state' : 'device-state state-error';

  return `
    <div class="device-card" data-meter-id="${device.meterId}">
      <div class="device-card-header">
        <span class="device-name">${escHtml(device.meterName)}</span>
        <span class="${meterBadgeClass(device)}">${escHtml(device.meterType)}</span>
      </div>
      <div class="device-meta">
        <span><span class="meta-label">Объект</span> ${escHtml(device.objectLabel)}</span>
        <span><span class="meta-label">Адрес</span> ${escHtml(device.objectAddress)}</span>
        <span><span class="meta-label">Сенсор</span> ${escHtml(device.sensorSn)}</span>
        <span><span class="meta-label">Счётчик</span> ${escHtml(device.meterSn || '—')}</span>
        <span class="${stateClass}">${escHtml(device.state)}</span>
      </div>
      <div class="device-card-footer">
        <button class="btn btn-ghost btn-sm btn-get-reading" data-meter-id="${device.meterId}">
          Получить показания
        </button>
      </div>
      <div class="device-reading hidden" id="reading-${device.meterId}"></div>
    </div>`;
}

function renderDevices(devices) {
  const grid = document.getElementById('devices-grid');
  if (devices.length === 0) {
    grid.innerHTML = '<p style="color:var(--gray-400);text-align:center;padding:32px 0;">Устройства не найдены</p>';
  } else {
    grid.innerHTML = devices.map(renderDeviceCard).join('');
  }
  grid.classList.remove('hidden');
}

async function fetchReading(meterId) {
  const btn   = document.querySelector(`.btn-get-reading[data-meter-id="${meterId}"]`);
  const panel = document.getElementById(`reading-${meterId}`);

  btn.disabled = true;
  btn.textContent = 'Загрузка...';
  panel.classList.remove('hidden');
  panel.innerHTML = '<div class="reading-spinner"><span class="spinner"></span> Получение данных...</div>';

  try {
    const data = await api.get(`/readings/current/${meterId}`);
    const r = Array.isArray(data) ? data[0] : data;
    if (!r) throw new Error('Нет данных');
    showReading(meterId, r);
  } catch (err) {
    panel.innerHTML = `<span class="reading-error">${escHtml(err.message)}</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Получить показания';
  }
}

async function syncAll() {
  const btn    = document.getElementById('sync-all-btn');
  const result = document.getElementById('sync-result');
  const errEl  = document.getElementById('global-error');

  btn.disabled = true;
  btn.textContent = 'Синхронизация...';
  result.classList.add('hidden');
  errEl.classList.add('hidden');

  try {
    const data = await api.post('/sync');
    showReadings(data.readings || []);
    const ts = data.readings && data.readings.length > 0
      ? new Date(data.readings[0].syncedAt).toLocaleString('ru-RU')
      : new Date().toLocaleString('ru-RU');
    result.textContent = `Синхронизировано: ${data.synced} показаний (${ts})`;
    result.classList.remove('hidden');
    setTimeout(() => result.classList.add('hidden'), 6000);
  } catch (err) {
    errEl.textContent = err.message || 'Ошибка синхронизации';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Синхронизировать все';
  }
}

async function loadDevices() {
  const loading = document.getElementById('devices-loading');
  const errEl   = document.getElementById('global-error');

  loading.classList.remove('hidden');
  errEl.classList.add('hidden');

  try {
    const [devices, latestReadings] = await Promise.all([
      api.get('/devices'),
      api.get('/readings/latest'),
    ]);
    renderDevices(devices);
    showReadings(latestReadings || []);
  } catch (err) {
    errEl.textContent = err.message || 'Не удалось загрузить устройства';
    errEl.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
  }
}

function initDevices() {
  document.getElementById('devices-grid').addEventListener('click', e => {
    const btn = e.target.closest('.btn-get-reading');
    if (!btn) return;
    const meterId = parseInt(btn.dataset.meterId, 10);
    if (!isNaN(meterId)) fetchReading(meterId);
  });

  document.getElementById('sync-all-btn').addEventListener('click', syncAll);
}
