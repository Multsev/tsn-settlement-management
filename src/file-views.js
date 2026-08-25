const typeLabels = { ISSUE: 'Обращение', PROJECT: 'Проект', DOCUMENT: 'Документ', EXPENSE: 'Расход', DECISION: 'Решение', CONTRACTOR: 'Подрядчик', COMMUNITY: 'Поселок' };
const formatSize = size => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} КБ` : `${(size / 1024 / 1024).toFixed(1)} МБ`;

function attachmentOptions({ projects, issues, documents, communityId, canWork }) {
  const options = [`<option value="COMMUNITY|${communityId}">Общие файлы поселка</option>`];
  issues.forEach(item => options.push(`<option value="ISSUE|${item.databaseId}">Обращение ${item.id}: ${item.title}</option>`));
  if (canWork) {
    projects.forEach(item => options.push(`<option value="PROJECT|${item.id}">Проект: ${item.title}</option>`));
    documents.forEach(item => options.push(`<option value="DOCUMENT|${item.id}">Документ: ${item.title}</option>`));
  }
  return options.join('');
}

export function filesContent({ files, projects, issues, documents, communityId, canWork, card }) {
  return `<header class="topbar"><div><p class="eyebrow">Защищенное хранилище</p><h1>Файлы поселка</h1></div></header>
    <p class="view-lead">Файлы доступны только участникам текущего поселка. PDF, изображения и офисные документы — до 15 МБ.</p>
    ${card(`<form id="file-upload-form" class="file-upload-form"><div><strong>Загрузить файл</strong><small>Файл можно сразу связать с обращением, проектом или документом</small></div><label>Файл<input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv" /></label><label>Куда прикрепить<select name="attachment">${attachmentOptions({ projects, issues, documents, communityId, canWork })}</select></label>${canWork ? '<label>Доступ<select name="visibility"><option value="COMMUNITY">Всем жителям</option><option value="MANAGEMENT">Только правлению</option></select></label>' : '<input type="hidden" name="visibility" value="COMMUNITY" />'}<button class="primary">Загрузить</button></form>`, 'file-upload-card')}
    <div class="file-list">${files.length ? files.map(file => card(`<article class="file-row"><span class="file-icon">${file.mimeType.startsWith('image/') ? '▧' : '▤'}</span><div><h3>${file.originalName}</h3><p>${formatSize(file.size)} · ${file.uploadedBy.fullName} · ${new Date(file.createdAt).toLocaleDateString('ru-RU')}</p><div class="skill-list">${file.visibility === 'MANAGEMENT' ? '<span>Только правлению</span>' : ''}${file.attachments.map(item => `<span>${typeLabels[item.entityType] || item.entityType}</span>`).join('')}</div></div><button class="small-button" data-action="download-file" data-file-id="${file.id}" data-file-name="${file.originalName}">Скачать</button>${canWork || !file.attachments.length ? `<button class="text-button danger-button" data-action="delete-file" data-file-id="${file.id}">Удалить</button>` : ''}</article>`)).join('') : card('<p>В хранилище пока нет файлов.</p>')}</div>`;
}
