export const projectStatusLabels = {
  IDEA: 'Идея', ESTIMATION: 'Оценка', PLANNED: 'Запланировано', FUNDRAISING: 'Сбор средств',
  IN_PROGRESS: 'В работе', PAUSED: 'Приостановлено', COMPLETED: 'Завершено', CANCELLED: 'Отменено'
};
export const projectPriorityLabels = { LOW: 'Низкий', NORMAL: 'Обычный', HIGH: 'Высокий', CRITICAL: 'Критический' };
export const taskStatusLabels = { TODO: 'К выполнению', IN_PROGRESS: 'В работе', DONE: 'Готово', CANCELLED: 'Отменено' };

const date = value => value ? new Date(value).toLocaleDateString('ru-RU') : 'не указан';
const projectBadge = status => status === 'COMPLETED' ? 'green' : ['PAUSED', 'CANCELLED'].includes(status) ? 'orange' : 'blue';

function roadmapProject(project, card, money) {
  return card(`<article class="roadmap-card" data-project="${project.id}">
    <span class="roadmap-dot ${projectBadge(project.status)}"></span>
    <div><div class="project-title"><h3>${project.title}</h3><span class="badge ${projectBadge(project.status)}">${projectStatusLabels[project.status]}</span></div>
    <p>${project.street?.name || 'Общая территория'} · ${project.category}</p><div class="progress-line"><span style="width:${project.progress}%"></span></div><small>${project.progress}% · бюджет ${money(project.budget)}</small></div>
    <button class="round-arrow">→</button></article>`);
}

export function roadmapContent({ groups, card, money }) {
  const periods = groups.map(group => `<section class="roadmap-period">
    <div class="roadmap-label"><strong>${group.year}</strong><span>${group.quarter} квартал</span></div>
    <div class="roadmap-projects">${group.projects.map(project => roadmapProject(project, card, money)).join('')}</div>
  </section>`).join('');
  return `<header class="topbar"><div><p class="eyebrow">План развития поселка</p><h1>Дорожная карта</h1></div></header>
    <p class="view-lead">Проекты сгруппированы по плановому периоду. Карточка показывает направление развития, а не только текущие проблемы.</p>
    <div class="roadmap">${periods || card('<p>Для дорожной карты пока нет запланированных проектов.</p>')}</div>`;
}

function operationsProject(project, warning, card, money) {
  const completedTasks = project.tasks.filter(task => task.status === 'DONE').length;
  return card(`<article class="project-operations"><div><div class="project-title"><span class="badge ${projectBadge(project.rawStatus)}">${project.status}</span>${warning ? '<span class="badge orange">Требует внимания</span>' : ''}</div>
    <h2>${project.title}</h2><p>${project.street?.name || 'Общая территория'} · ${project.responsible}</p>
    <div class="project-meta"><span>Задачи ${completedTasks}/${project.tasks.length}</span><span>Срок ${project.deadline}</span><span>${money(project.spent)} из ${money(project.budget)}</span>${warning?.overdueTasks ? `<span class="danger">Просрочено задач: ${warning.overdueTasks}</span>` : ''}</div></div>
    <div class="project-operation-actions"><button class="small-button" data-action="edit-project" data-project-id="${project.id}">Параметры</button><button class="small-button" data-action="new-project-task" data-project-id="${project.id}">+ Задача</button><button class="text-button" data-action="new-project-update" data-project-id="${project.id}">Обновление</button></div></article>`);
}

export function projectOperationsContent({ projects, attention, card, money }) {
  const flagged = new Map(attention.map(item => [item.id, item]));
  const cards = projects.map(project => operationsProject(project, flagged.get(project.id), card, money)).join('');
  return `<section class="management-section"><div class="section-heading"><div><h2>Проекты и задачи</h2><p>Сроки, исполнители и актуальность информации</p></div></div><div class="projects-list">${cards || card('<p>Проектов пока нет.</p>')}</div></section>`;
}

function taskList(project, canWork) {
  if (!project.tasks?.length) return '<p>Задачи еще не добавлены.</p>';
  return project.tasks.map(task => `<article class="task-row"><span class="task-state ${task.status.toLowerCase()}">✓</span><div><strong>${task.title}</strong><small>${taskStatusLabels[task.status]} · ${task.responsible || 'Исполнитель не назначен'} · до ${date(task.dueAt)}</small></div>${canWork && !['DONE', 'CANCELLED'].includes(task.status) ? `<button class="small-button" data-action="advance-task" data-project-id="${project.id}" data-task-id="${task.id}" data-task-status="${task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE'}">${task.status === 'TODO' ? 'Начать' : 'Завершить'}</button>` : ''}</article>`).join('');
}

function updateList(project) {
  if (!project.updates?.length) return '<p>Обновлений пока нет.</p>';
  return project.updates.map(update => `<article class="update"><small>${date(update.createdAt)}${update.progress != null ? ` · ${update.progress}%` : ''}</small><p>${update.message}</p>${update.photoUrl ? `<a href="${update.photoUrl}" target="_blank" rel="noreferrer">Фотография обновления</a>` : ''}</article>`).join('');
}

function statusHistory(project) {
  return (project.history || []).map(item => `<span>${projectStatusLabels[item.toStatus]}<small>${date(item.createdAt)}</small></span>`).join('');
}

function institutionalLinks(project, money) {
  const decisionLabels = { ADOPTED: 'Принято', IN_PROGRESS: 'Исполняется', EXECUTED: 'Исполнено', CANCELLED: 'Отменено' };
  const decisions = (project.decisions || []).map(item => `<div><strong>${item.title}</strong><small>Решение · ${decisionLabels[item.status] || item.status}</small></div>`).join('');
  const contractors = (project.contractorLinks || []).map(item => `<div><strong>${item.contractor.name}</strong><small>${item.role || 'Подрядчик'}${item.contractAmount ? ` · ${money(item.contractAmount)}` : ''}${item.warrantyUntil ? ` · гарантия до ${date(item.warrantyUntil)}` : ''}</small></div>`).join('');
  const documents = (project.documents || []).map(item => `<div><a href="${item.url}" target="_blank" rel="noreferrer">${item.title}</a><small>${item.type}</small></div>`).join('');
  if (!decisions && !contractors && !documents) return '';
  return `<section class="update-section"><h3>Решения, документы и подрядчики</h3><div class="institutional-links">${decisions}${contractors}${documents}</div></section>`;
}

export function projectDetail(project, { money, canWork }) {
  const fundraiserCollected = (project.fundraisers || []).reduce((sum, item) => sum + item.collectedAmount, 0);
  return `<div class="modal-backdrop"><section class="modal project-modal wide-modal"><button class="modal-close" data-action="close">×</button>
    <div class="project-title"><span class="badge ${projectBadge(project.rawStatus)}">${project.status}</span><span class="badge orange">Приоритет: ${projectPriorityLabels[project.priority] || 'Обычный'}</span></div><h2>${project.title}</h2><p>${project.description}</p>
    <div class="detail-progress"><strong>${project.progress}%</strong><div class="progress-line"><span style="width:${project.progress}%"></span></div><span>готовность</span></div>
    <div class="detail-grid"><div><small>Улица / территория</small><strong>${project.street?.name || 'Общая территория'}</strong></div><div><small>Ответственный</small><strong>${project.responsible}</strong></div><div><small>Начало</small><strong>${date(project.startAt)}</strong></div><div><small>Плановый срок</small><strong>${project.deadline}</strong></div><div><small>Бюджет / потрачено</small><strong>${money(project.budget)} / ${money(project.spent)}</strong></div><div><small>Собрано по сборам</small><strong>${money(fundraiserCollected || project.collected)}</strong></div></div>
    ${project.problem || project.expectedResult ? `<div class="project-outcome"><div><small>Проблема</small><p>${project.problem || 'Не описана'}</p></div><div><small>Ожидаемый результат</small><p>${project.expectedResult || 'Не описан'}</p></div></div>` : ''}
    <section class="task-section"><h3>Задачи</h3><div class="task-list">${taskList(project, canWork)}</div></section>
    <section class="update-section"><h3>Ход работ</h3>${updateList(project)}</section>
    ${project.history?.length ? `<section class="update-section"><h3>История статусов</h3><div class="issue-history">${statusHistory(project)}</div></section>` : ''}
    ${institutionalLinks(project, money)}
    ${project.resultNote ? `<div class="result-note"><strong>Результат проекта</strong><p>${project.resultNote}</p></div>` : ''}
    <div class="issue-photos">${project.beforePhotoUrl ? `<a href="${project.beforePhotoUrl}" target="_blank" rel="noreferrer">Фото до</a>` : ''}${project.afterPhotoUrl ? `<a href="${project.afterPhotoUrl}" target="_blank" rel="noreferrer">Фото после</a>` : ''}</div>
  </section></div>`;
}
