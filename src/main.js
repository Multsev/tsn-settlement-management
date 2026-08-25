import './styles.css';
import { dashboard, issues, money, projects } from './data.js';
import { createIssue, createListing, loadDashboard, loadDirectory, loadIssues, loadListings, loadProjects, login } from './api.js';
import { clearSession, readSession, saveSession } from './session.js';

const icon = (name) => ({
  home: '⌂', projects: '◫', finance: '₽', requests: '◌', docs: '▤', more: '•••', bell: '♧', arrow: '→', close: '×', plus: '+'
}[name] || '•');

const navigation = [
  ['home', 'Главная'], ['projects', 'Проекты'], ['finance', 'Финансы'], ['requests', 'Заявки'], ['docs', 'Документы'], ['more', 'Соседи']
];

let active = 'Главная';
let modal = null;
let session = readSession();
let currentUser = session?.user || null;
let dashboardData = dashboard;
let projectData = projects;
let issueData = issues;
let directoryData = [];
let listingData = [];
let loading = false;
let loadError = '';

const projectStatus = { IN_PROGRESS: 'В работе', FUNDRAISING: 'Сбор средств', PLANNED: 'Запланировано', IDEA: 'Идея', ESTIMATION: 'Оценка', PAUSED: 'Приостановлено', COMPLETED: 'Завершено', CANCELLED: 'Отменено' };
const issueStatus = { NEW: 'Новая', ACCEPTED: 'Принята', PLANNED: 'Запланирована', IN_PROGRESS: 'В работе', WAITING_CONTRACTOR: 'Ждем подрядчика', COMPLETED: 'Выполнена', CLOSED: 'Закрыта' };
const dateLabel = (value) => value ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value)) : 'Срок уточняется';

function normalizedProjects(items) {
  return items.map(project => ({ ...project, status: projectStatus[project.status] || project.status, deadline: dateLabel(project.deadline), lead: 'Правление поселка', update: project.updates?.[0]?.message || 'Обновлений пока нет' }));
}

function normalizedIssues(items) {
  return items.map(issue => ({ ...issue, id: `REQ-${issue.number}`, status: issueStatus[issue.status] || issue.status, due: dateLabel(issue.dueAt), responsible: issue.responsible || 'Будет назначен' }));
}

async function loadApplicationData() {
  if (!session) return;
  loading = true; loadError = ''; render();
  try {
    const [serverDashboard, serverProjects, serverIssues, serverDirectory, serverListings] = await Promise.all([loadDashboard(session.token), loadProjects(session.token), loadIssues(session.token), loadDirectory(session.token), loadListings(session.token)]);
    dashboardData = { ...dashboard, community: serverDashboard.community, user: currentUser.fullName.split(' ')[0], balance: serverDashboard.finances.balance, income: serverDashboard.finances.received, spent: serverDashboard.finances.spent, debt: serverDashboard.myDebt, projects: normalizedProjects(serverDashboard.projects) };
    projectData = normalizedProjects(serverProjects);
    issueData = normalizedIssues(serverIssues);
    directoryData = serverDirectory;
    listingData = serverListings;
  } catch (error) {
    if (error.status === 401 || error.status === 403) { clearSession(); session = null; currentUser = null; loadError = 'Сессия завершена. Войдите снова.'; }
    else loadError = error.message;
  } finally { loading = false; render(); }
}

function layout(content) {
  return `
    <aside class="sidebar">
      <a class="brand" href="#"><span class="brand-mark">⌁</span><span>прозор</span></a>
      <div class="community-switch"><span class="community-dot"></span><div><small>Мой поселок</small><strong>${dashboardData.community}</strong></div><span>⌄</span></div>
      <nav>${navigation.map(([key, label]) => `<button class="nav-item ${active === label ? 'active' : ''}" data-view="${label}"><span>${icon(key)}</span>${label}</button>`).join('')}</nav>
      <div class="side-bottom"><button class="nav-item"><span>?</span> Помощь</button><button class="profile profile-button" data-action="logout"><span class="avatar">${currentUser?.fullName?.split(' ').map(word => word[0]).join('').slice(0, 2) || 'АС'}</span><div><strong>${currentUser?.fullName || 'Александр С.'}</strong><small>Выйти из аккаунта</small></div><span>⌄</span></button></div>
    </aside>
    <main class="content">${content}</main>
    <nav class="mobile-nav">${navigation.slice(0, 4).map(([key, label]) => `<button class="mobile-item ${active === label ? 'active' : ''}" data-view="${label}"><span>${icon(key)}</span><small>${label}</small></button>`).join('')}</nav>
    ${modal || ''}`;
}

const card = (content, className = '') => `<section class="card ${className}">${content}</section>`;
const formatDate = () => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date());

function dashboardView() {
  return layout(`
    <header class="topbar"><div><p class="eyebrow">${formatDate()} · Добрый день, ${dashboardData.user}</p><h1>Что происходит в поселке</h1></div><div class="top-actions"><button class="icon-button" aria-label="Уведомления">${icon('bell')}<i></i></button><button class="primary" data-action="request">${icon('plus')} Новая заявка</button></div></header>
    ${card(`<div class="notice-icon">!</div><div><strong>Важное объявление</strong><p>27 августа с 10:00 до 15:00 будет перекрыта техническая дорога.</p></div><button class="text-button" data-view="Документы">Подробнее ${icon('arrow')}</button>`, 'notice')}
    <div class="dashboard-grid">
      <div class="main-column">
        <div class="section-heading"><div><h2>Сейчас</h2><p>Главное о работах и планах</p></div><button class="text-button" data-view="Проекты">Все проекты ${icon('arrow')}</button></div>
        <div class="project-stack">${dashboardData.projects.map(item => card(`<div class="project-row"><div class="status-icon orange">${item.progress ? '↗' : '◌'}</div><div class="project-info"><div class="project-title"><h3>${item.title}</h3><span class="badge orange">${item.status || item.tag}</span></div><div class="progress-line"><span style="width:${item.progress}%"></span></div><p>Готовность ${item.progress}% <em>· ${item.deadline || item.date}</em></p></div><button class="round-arrow" data-project="${item.id || item.title}">${icon('arrow')}</button></div>`)).join('')}</div>
        <div class="section-heading results-heading"><div><h2>Последние результаты</h2><p>Сделано за последнюю неделю</p></div><button class="text-button">Весь дайджест ${icon('arrow')}</button></div>
        ${card(`<ul class="result-list">${dashboard.results.map(r => `<li><span>✓</span>${r}</li>`).join('')}</ul>`)}
      </div>
      <aside class="right-column">
        ${card(`<div class="section-heading compact"><div><h2>Ваши действия</h2><p>2 действия ждут вас</p></div></div><div class="action-list">${dashboard.actions.map(a => `<div class="action-item"><span class="action-symbol">${a.icon}</span><div><strong>${a.title}</strong><small>${a.text}</small></div><button class="small-button" data-action="${a.title === 'Оплатить взнос' ? 'pay' : 'vote'}">${a.action}</button></div>`).join('')}</div>`, 'actions-card')}
        ${card(`<div class="section-heading compact"><div><h2>Финансы поселка</h2><p>На сегодня</p></div><button class="round-arrow" data-view="Финансы">${icon('arrow')}</button></div><div class="balance">${money(dashboardData.balance)}</div><div class="finance-grid"><div><span>Поступило за месяц</span><strong class="income">+${money(dashboardData.income)}</strong></div><div><span>Потрачено</span><strong>−${money(dashboardData.spent)}</strong></div></div><div class="finance-note"><span>◎</span> Все расходы связаны с работами и документами</div>`, 'finance-card')}
        ${card(`<div class="section-heading compact"><div><h2>Быстрый доступ</h2></div></div><div class="quick-grid"><button data-view="Финансы">Мои платежи</button><button data-view="Документы">Документы</button><button data-view="Заявки">Мои заявки</button><button data-view="Проекты">Дорожная карта</button></div>`)}
      </aside>
    </div>`);
}

function projectsView() {
  return layout(`<header class="topbar"><div><p class="eyebrow">${dashboardData.community}</p><h1>Проекты поселка</h1></div><button class="primary" data-action="request">${icon('plus')} Сообщить о проблеме</button></header><div class="filter-row"><button class="filter active">Все</button><button class="filter">В работе</button><button class="filter">Планируемые</button><button class="filter">Завершённые</button></div><div class="projects-list">${projectData.map(p => card(`<article class="project-card"><div><span class="badge green">${p.category}</span><span class="project-status">${p.status}</span><h2>${p.title}</h2><p>${p.description}</p><div class="project-meta"><span>◷ ${p.deadline}</span><span>◉ ${p.lead}</span></div></div><div class="project-budget"><span>Бюджет</span><strong>${money(p.budget)}</strong><div class="progress-line"><span style="width:${p.progress}%"></span></div><small>Готовность ${p.progress}%</small><button class="text-button" data-project="${p.id}">Открыть проект ${icon('arrow')}</button></div></article>`)).join('')}</div>`);
}

function financeView() {
  return layout(`<header class="topbar"><div><p class="eyebrow">Прозрачный учет</p><h1>Финансы</h1></div></header><div class="metric-grid"><div class="metric"><span>Баланс поселка</span><strong>${money(dashboardData.balance)}</strong><small>Доступно на счетах</small></div><div class="metric"><span>Поступило в августе</span><strong class="income">+${money(dashboardData.income)}</strong><small>Собираемость 82%</small></div><div class="metric"><span>Потрачено в августе</span><strong>−${money(dashboardData.spent)}</strong><small>Все расходы с документами</small></div></div>${card(`<div class="section-heading"><div><h2>Мои начисления</h2><p>Участок №157</p></div><strong class="paid">Задолженность: ${money(dashboardData.debt)}</strong></div>`)}`);
}

function requestsView() {
 return layout(`<header class="topbar"><div><p class="eyebrow">Обращения жителей</p><h1>Мои заявки</h1></div><button class="primary" data-action="request">${icon('plus')} Новая заявка</button></header><p class="view-lead">Сообщите о проблеме — мы назначим ответственного и покажем статус работ.</p><div class="request-list">${issueData.map(i => card(`<article class="request-card"><div class="request-id">${i.id}</div><div><h2>${i.title}</h2><p>${i.address}</p><div class="project-meta"><span>◉ ${i.responsible}</span><span>◷ Срок: ${i.due}</span></div></div><span class="badge orange">${i.status}</span><button class="round-arrow">${icon('arrow')}</button></article>`)).join('')}</div>`);
}

function docsView() {
 return layout(`<header class="topbar"><div><p class="eyebrow">Единый источник информации</p><h1>Документы и решения</h1></div></header><div class="docs-grid">${[['Решение №32','Установка второго шлагбаума','15 июня 2026','Решение принято · проект в работе'],['Акт выполненных работ','Мусорная площадка','12 августа 2026','Подписан председателем и подрядчиком'],['Смета','Ремонт Центральной улицы','4 августа 2026','Связана с проектом']].map(d => card(`<article class="doc"><span class="doc-icon">▤</span><div><small>${d[0]}</small><h2>${d[1]}</h2><p>${d[2]}</p><span class="doc-state">${d[3]}</span></div><button class="round-arrow">${icon('arrow')}</button></article>`)).join('')}</div>`);
}

function neighborsView() {
  const contacts = profile => [profile.contact.phone, profile.contact.email].filter(Boolean).join(' · ') || 'Контакты скрыты владельцем';
  return layout(`<header class="topbar"><div><p class="eyebrow">Внутри ${dashboardData.community}</p><h1>Соседи и услуги</h1></div><button class="primary" data-action="listing">${icon('plus')} Разместить объявление</button></header><div class="neighbors-grid"><section><div class="section-heading"><div><h2>Доска объявлений</h2><p>Предлагают и ищут услуги рядом с домом</p></div></div><div class="projects-list">${listingData.length ? listingData.map(listing => card(`<article class="listing-card"><span class="badge ${listing.type === 'OFFER' ? 'green' : 'orange'}">${listing.type === 'OFFER' ? 'Предлагаю' : 'Ищу'}</span><h2>${listing.title}</h2><p>${listing.description}</p><small>${listing.category} · ${listing.author.name}</small><div class="listing-contact">${contacts(listing.author)}</div></article>`)).join('') : card('<p>Пока нет активных объявлений.</p>')}</div></section><section><div class="section-heading"><div><h2>Каталог навыков</h2><p>Только профили, открытые самими жителями</p></div></div><div class="directory-list">${directoryData.length ? directoryData.map(person => card(`<article class="person-card"><span class="avatar">${person.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</span><div><h3>${person.name}</h3><p>${person.streets.join(', ') || 'Улица не указана'}</p><div class="skill-list">${person.skills.map(skill => `<span>${skill}</span>`).join('')}</div><small>${contacts(person)}</small></div></article>`)).join('') : card('<p>Жители пока не открыли публичные профили.</p>')}</div></section></div>`);
}

function requestModal() {
  return `<div class="modal-backdrop"><section class="modal"><button class="modal-close" data-action="close">${icon('close')}</button><p class="eyebrow">Новая заявка</p><h2>Что случилось?</h2><p>Укажите проблему и место — председатель назначит ответственного.</p><label>Описание<input id="issue-title" placeholder="Например, не работает фонарь" /></label><label>Адрес или улица<input id="issue-address" placeholder="ул. Калинина, участок 18" /></label><label>Комментарий<textarea id="issue-description" placeholder="Добавьте детали, которые помогут решить вопрос"></textarea></label><button class="primary full" data-action="submit-request">Отправить заявку</button></section></div>`;
}

function listingModal() {
  return `<div class="modal-backdrop"><section class="modal"><button class="modal-close" data-action="close">${icon('close')}</button><p class="eyebrow">Новое объявление</p><h2>Услуга или запрос</h2><label>Тип<select id="listing-type"><option value="OFFER">Предлагаю услугу</option><option value="REQUEST">Ищу услугу</option></select></label><label>Название<input id="listing-title" placeholder="Например, ищу няню на выходные" /></label><label>Категория<input id="listing-category" placeholder="Дети, ремонт, красота…" /></label><label>Описание<textarea id="listing-description" placeholder="Укажите важные детали"></textarea></label><button class="primary full" data-action="submit-listing">Опубликовать</button></section></div>`;
}

function projectModal(project) {
 const p = projectData.find(x => x.id === project || x.title === project) || projectData[0];
 return `<div class="modal-backdrop"><section class="modal project-modal"><button class="modal-close" data-action="close">${icon('close')}</button><span class="badge green">${p.category}</span><h2>${p.title}</h2><p>${p.description}</p><div class="detail-progress"><strong>${p.progress}%</strong><div class="progress-line"><span style="width:${p.progress}%"></span></div><span>готовность</span></div><div class="detail-grid"><div><small>Бюджет</small><strong>${money(p.budget)}</strong></div><div><small>Потрачено</small><strong>${money(p.spent)}</strong></div><div><small>Срок</small><strong>${p.deadline}</strong></div><div><small>Ответственный</small><strong>${p.lead}</strong></div></div><div class="update"><small>Последнее обновление</small><p>${p.update}</p></div></section></div>`;
}

function loginView() {
  return `<main class="login-page"><section class="login-card"><a class="brand" href="#"><span class="brand-mark">⌁</span><span>прозор</span></a><p class="eyebrow">Кабинет жителя</p><h1>Войдите в поселок</h1><p>Используйте данные, которые вам выдала администрация.</p>${loadError ? `<p class="form-error">${loadError}</p>` : ''}<form id="login-form"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label><label>Пароль<input name="password" type="password" autocomplete="current-password" required placeholder="Ваш пароль" /></label><label>Поселок<input name="communitySlug" required value="novotitarovka" /></label><button class="primary full" ${loading ? 'disabled' : ''}>${loading ? 'Входим…' : 'Войти'}</button></form><small>Демо: alexander@example.test / ChangeMe123!</small></section></main>`;
}

function render() {
  if (!session) { document.querySelector('#app').innerHTML = loginView(); return; }
  const views = { 'Главная': dashboardView, 'Проекты': projectsView, 'Финансы': financeView, 'Заявки': requestsView, 'Документы': docsView, 'Соседи': neighborsView };
  document.querySelector('#app').innerHTML = loading ? layout('<div class="page-state">Загружаем данные поселка…</div>') : loadError ? layout(`<div class="page-state error-state">${loadError}<button class="primary" data-action="reload">Повторить</button></div>`) : views[active]();
}

document.addEventListener('click', async event => {
  const view = event.target.closest('[data-view]')?.dataset.view;
  if (view) { active = view; modal = null; render(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'request') { modal = requestModal(); render(); }
  if (action === 'listing') { modal = listingModal(); render(); }
  if (action === 'close') { modal = null; render(); }
  if (action === 'logout') { clearSession(); session = null; currentUser = null; modal = null; loadError = ''; render(); }
  if (action === 'reload') { loadApplicationData(); }
  if (action === 'submit-request') {
    try { const issue = await createIssue(session.token, { title: document.querySelector('#issue-title')?.value, address: document.querySelector('#issue-address')?.value, description: document.querySelector('#issue-description')?.value }); issueData.unshift(normalizedIssues([issue])[0]); modal = null; active = 'Заявки'; }
    catch (error) { loadError = error.message; modal = null; }
    render();
  }
  if (action === 'submit-listing') {
    try { const listing = await createListing(session.token, { type: document.querySelector('#listing-type')?.value, title: document.querySelector('#listing-title')?.value, category: document.querySelector('#listing-category')?.value, description: document.querySelector('#listing-description')?.value }); listingData.unshift(listing); modal = null; active = 'Соседи'; }
    catch (error) { loadError = error.message; modal = null; }
    render();
  }
  if (action === 'pay') { alert('Демо: платеж сформирован. В рабочей версии здесь открывается безопасная форма оплаты.'); }
  if (action === 'vote') { alert('Демо: ваш голос будет учтён после подключения сервера опросов.'); }
  const project = event.target.closest('[data-project]')?.dataset.project;
  if (project) { modal = projectModal(project); render(); }
});

document.addEventListener('submit', async event => {
  if (event.target.id !== 'login-form') return;
  event.preventDefault();
  const form = new FormData(event.target);
  loading = true; loadError = ''; render();
  try { const result = await login(Object.fromEntries(form)); session = { token: result.token, user: result.user, community: result.community, role: result.role }; currentUser = result.user; saveSession(session); await loadApplicationData(); }
  catch (error) { loading = false; loadError = error.message; render(); }
});

render();
if (session) loadApplicationData();
