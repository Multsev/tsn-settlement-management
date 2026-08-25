const layerLabels = { properties: 'Участки', projects: 'Проекты', issues: 'Проблемы', features: 'Инфраструктура' };
const featureLabels = { INFRASTRUCTURE: 'Инфраструктура', ROAD: 'Дорога', GATE: 'Въезд', CAMERA: 'Камера', LIGHTING: 'Освещение', PLAYGROUND: 'Площадка', UTILITY: 'Коммуникации', OTHER: 'Другое' };

function positions(map, visibleLayers) {
  const items = visibleLayers.flatMap(layer => (map.layers[layer] || []).map(item => ({ ...item, layer })));
  if (!map.bounds) return [];
  const width = map.bounds.east - map.bounds.west || 1;
  const height = map.bounds.north - map.bounds.south || 1;
  return items.map(item => ({ ...item, x: ((item.longitude - map.bounds.west) / width) * 100, y: ((map.bounds.north - item.latitude) / height) * 100 }));
}

function markerLabel(item) {
  if (item.layer === 'properties') return item.number;
  if (item.layer === 'issues') return '!';
  if (item.layer === 'projects') return `${item.progress}%`;
  return item.type === 'GATE' ? '↔' : '●';
}

export function mapContent({ map, visibleLayers, selectedId, canManage, card }) {
  const items = positions(map, visibleLayers);
  const selected = items.find(item => `${item.layer}:${item.id}` === selectedId);
  const filters = Object.entries(layerLabels).map(([layer, label]) => `<button class="filter ${visibleLayers.includes(layer) ? 'active' : ''}" data-action="toggle-map-layer" data-map-layer="${layer}">${label}</button>`).join('');
  const editableEntity = selected && ({ properties: 'property', projects: 'project', issues: 'issue' })[selected.layer];
  return `<header class="topbar"><div><p class="eyebrow">Территория без персональных данных</p><h1>Карта поселка</h1></div><div class="top-actions"><button class="small-button" data-action="map-issue">Проблема на карте</button>${canManage ? '<button class="primary" data-action="new-map-feature">+ Объект</button>' : ''}</div></header><div class="filter-row">${filters}</div><div class="settlement-map"><div class="map-road road-one"></div><div class="map-road road-two"></div>${items.map(item => `<button class="map-marker ${item.layer} ${`${item.layer}:${item.id}` === selectedId ? 'selected' : ''}" style="left:${item.x}%;top:${item.y}%" data-action="select-map-item" data-map-item="${item.layer}:${item.id}" aria-label="${item.title || item.number}">${markerLabel(item)}</button>`).join('')}${!items.length ? '<div class="map-empty">Для выбранных слоев пока нет координат.</div>' : ''}</div><div class="map-legend">${visibleLayers.map(layer => `<span class="${layer}">● ${layerLabels[layer]}</span>`).join('')}</div>${selected ? card(`<article class="map-detail"><span class="badge green">${layerLabels[selected.layer]}</span><h2>${selected.title || `Участок ${selected.number}`}</h2><p>${selected.description || selected.address || selected.street || selected.category || ''}</p><div class="project-meta"><span>${selected.status || (selected.occupied ? 'Заселен' : selected.hasHouse ? 'Есть дом' : 'Свободный участок')}</span><span>${Number(selected.latitude).toFixed(5)}, ${Number(selected.longitude).toFixed(5)}</span></div>${canManage && editableEntity ? `<button class="small-button" data-action="edit-map-location" data-map-entity="${editableEntity}" data-map-id="${selected.id}" data-map-latitude="${selected.latitude}" data-map-longitude="${selected.longitude}">Изменить координаты</button>` : ''}</article>`) : card('<p>Выберите объект на карте, чтобы открыть его карточку.</p>')}`;
}

export function mapModal(type, data = {}) {
  const close = '<button class="modal-close" data-action="close">×</button>';
  const coordinates = '<div class="form-grid"><label>Широта<input id="map-latitude" type="number" step="0.000001" /></label><label>Долгота<input id="map-longitude" type="number" step="0.000001" /></label></div>';
  if (type === 'issue') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Точка на территории</p><h2>Сообщить о проблеме</h2><label>Проблема<input id="map-issue-title" /></label><label>Адрес<input id="map-issue-address" /></label><label>Описание<textarea id="map-issue-description"></textarea></label>${coordinates}<button class="primary full" data-action="submit-map-issue">Создать обращение</button></section></div>`;
  if (type === 'location') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Геоданные объекта</p><h2>Изменить координаты</h2><div class="form-grid"><label>Широта<input id="map-latitude" type="number" step="0.000001" value="${data.latitude}" /></label><label>Долгота<input id="map-longitude" type="number" step="0.000001" value="${data.longitude}" /></label></div><button class="primary full" data-action="submit-map-location" data-map-entity="${data.entity}" data-map-id="${data.id}">Сохранить точку</button></section></div>`;
  return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Паспорт территории</p><h2>Новый объект карты</h2><label>Тип<select id="map-feature-type">${Object.entries(featureLabels).map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></label><label>Название<input id="map-feature-title" /></label><label>Описание<textarea id="map-feature-description"></textarea></label><label>Состояние<input id="map-feature-status" /></label>${coordinates}<button class="primary full" data-action="submit-map-feature">Добавить на карту</button></section></div>`;
}
