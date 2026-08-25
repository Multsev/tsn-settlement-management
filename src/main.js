import './styles.css';
import { dashboard, issues, money, projects } from './data.js';
import { addProjectUpdate, contributeToFundraiser, createCharge, createExpense, createFundraiser, createIssue, createListing, createProjectFromProposal, createProjectTask, createProperty, createStreet, loadCommunityInfo, loadDashboard, loadDirectory, loadFinanceAdminOptions, loadFinanceOverview, loadIssues, loadListings, loadMyFinances, loadProjectAttention, loadProjects, loadProperties, loadProposals, loadRoadmap, loadStreets, login, openVote, recordPayment, requestPropertyAccess, reviewPropertyAccess, updateIssue, updateProject, updateProjectTask } from './api.js';
import { clearSession, readSession, saveSession } from './session.js';
import { financeAdminContent, financeResidentContent } from './finance-views.js';
import { issueManagementContent, streetsContent } from './community-operations-views.js';
import { projectDetail, projectOperationsContent, projectPriorityLabels, projectStatusLabels, roadmapContent } from './project-views.js';

const icon = (name) => ({
  home: '⌂', projects: '◫', finance: '₽', requests: '◌', docs: '▤', more: '•••', bell: '♧', arrow: '→', close: '×', plus: '+'
}[name] || '•');

const navigation = [
  ['home', 'Главная'], ['projects', 'Проекты'], ['more', 'Дорожная карта'], ['finance', 'Финансы'], ['requests', 'Заявки'], ['more', 'Улицы и участки'], ['docs', 'Документы'], ['more', 'Соседи'], ['more', 'О поселке']
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
let directoryFilter = '';
let communityInfo = { community: {}, contacts: [], articles: [], documents: [] };
let proposalData = [];
let myFinances = { charges: [], payments: [] };
let financeOverview = { totals: { balance: 0, received: 0, spent: 0, debt: 0 }, expenses: [], fundraisers: [] };
let financeOptions = { memberships: [], projects: [], openCharges: [] };
let streetData = [];
let propertyState = { properties: [], accessRequests: [], availableProperties: [] };
let roadmapData = [];
let projectAttentionData = [];
let expenseFilter = '';
const managesCommunity = () => ['chairman', 'administrator'].includes(session?.role);
const worksWithProjects = () => ['assistant_chairman', 'board_member', 'chairman', 'administrator'].includes(session?.role);
let loading = false;
let loadError = '';

const projectStatus = { IN_PROGRESS: 'В работе', FUNDRAISING: 'Сбор средств', PLANNED: 'Запланировано', IDEA: 'Идея', ESTIMATION: 'Оценка', PAUSED: 'Приостановлено', COMPLETED: 'Завершено', CANCELLED: 'Отменено' };
const issueStatus = { NEW: 'Новая', ACCEPTED: 'Принята', PLANNED: 'Запланирована', IN_PROGRESS: 'В работе', WAITING_CONTRACTOR: 'Ждем подрядчика', COMPLETED: 'Выполнена', CLOSED: 'Закрыта' };
const dateLabel = (value) => value ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(value)) : 'Срок уточняется';

function normalizedProjects(items) {
  return items.map(project => ({ ...project, rawStatus: project.status, rawDeadline: project.deadline, status: projectStatus[project.status] || project.status, deadline: dateLabel(project.deadline), responsible: project.responsible || 'Правление поселка', lead: project.responsible || 'Правление поселка', update: project.updates?.[0]?.message || 'Обновлений пока нет', tasks: project.tasks || [] }));
}

function normalizedIssues(items) {
  return items.map(issue => ({ ...issue, databaseId: issue.id, rawStatus: issue.status, id: `REQ-${issue.number}`, status: issueStatus[issue.status] || issue.status, due: dateLabel(issue.dueAt), responsible: issue.responsible || 'Будет назначен' }));
}

async function loadApplicationData() {
  if (!session) return;
  loading = true; loadError = ''; render();
  try {
    const [serverDashboard, serverProjects, serverIssues, serverDirectory, serverListings, serverInfo, serverProposals, serverMyFinances, serverFinanceOverview, serverFinanceOptions, serverStreets, serverProperties, serverRoadmap, serverProjectAttention] = await Promise.all([loadDashboard(session.token), loadProjects(session.token), loadIssues(session.token), loadDirectory(session.token), loadListings(session.token), loadCommunityInfo(session.token), loadProposals(session.token), loadMyFinances(session.token), loadFinanceOverview(session.token), managesCommunity() ? loadFinanceAdminOptions(session.token) : Promise.resolve(financeOptions), loadStreets(session.token), loadProperties(session.token), loadRoadmap(session.token), worksWithProjects() ? loadProjectAttention(session.token) : Promise.resolve([])]);
    dashboardData = { ...dashboard, community: serverDashboard.community, user: currentUser.fullName.split(' ')[0], balance: serverDashboard.finances.balance, income: serverDashboard.finances.received, spent: serverDashboard.finances.spent, debt: serverDashboard.myDebt, projects: normalizedProjects(serverDashboard.projects) };
    projectData = normalizedProjects(serverProjects);
    issueData = normalizedIssues(serverIssues);
    directoryData = serverDirectory;
    listingData = serverListings;
    communityInfo = serverInfo;
    proposalData = serverProposals;
    myFinances = serverMyFinances;
    financeOverview = serverFinanceOverview;
    financeOptions = serverFinanceOptions;
    streetData = serverStreets;
    propertyState = serverProperties;
    roadmapData = serverRoadmap;
    projectAttentionData = serverProjectAttention;
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
      <nav>${[...navigation, ...(managesCommunity() ? [['more', 'Управление']] : [])].map(([key, label]) => `<button class="nav-item ${active === label ? 'active' : ''}" data-view="${label}"><span>${icon(key)}</span>${label}</button>`).join('')}</nav>
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
  return layout(`<header class="topbar"><div><p class="eyebrow">${dashboardData.community}</p><h1>Проекты поселка</h1></div><button class="primary" data-view="Дорожная карта">Открыть дорожную карту</button></header><div class="projects-list">${projectData.map(p => card(`<article class="project-card"><div><div class="project-title"><span class="badge green">${p.category}</span><span class="project-status">${p.status}</span>${p.priority && p.priority !== 'NORMAL' ? `<span class="badge orange">${projectPriorityLabels[p.priority]}</span>` : ''}</div><h2>${p.title}</h2><p>${p.description}</p><div class="project-meta"><span>⌖ ${p.street?.name || 'Общая территория'}</span><span>◷ ${p.deadline}</span><span>◉ ${p.lead}</span><span>Задач: ${p.tasks.length}</span></div></div><div class="project-budget"><span>Бюджет</span><strong>${money(p.budget)}</strong><div class="progress-line"><span style="width:${p.progress}%"></span></div><small>Готовность ${p.progress}%</small><button class="text-button" data-project="${p.id}">Открыть проект ${icon('arrow')}</button>${worksWithProjects() ? `<button class="small-button" data-action="new-project-update" data-project-id="${p.id}">Добавить обновление</button><button class="small-button" data-action="new-project-task" data-project-id="${p.id}">Добавить задачу</button>` : ''}</div></article>`)).join('')}</div>`);
}

function roadmapView() {
  return layout(roadmapContent({ groups: roadmapData, card, money }));
}

function financeView() {
  return layout(`<header class="topbar"><div><p class="eyebrow">Прозрачный учет</p><h1>Финансы</h1></div></header>${financeResidentContent({ money, totals: financeOverview.totals, my: myFinances, fundraisers: financeOverview.fundraisers })}${managesCommunity() ? financeAdminContent({ money, totals: financeOverview.totals, expenses: financeOverview.expenses, expenseFilter }) : ''}`);
}

function requestsView() {
 return layout(`<header class="topbar"><div><p class="eyebrow">Обращения жителей</p><h1>${managesCommunity() ? 'Все обращения' : 'Мои заявки'}</h1></div><button class="primary" data-action="request">${icon('plus')} Новая заявка</button></header><p class="view-lead">Сообщите о проблеме — мы назначим ответственного и покажем статус работ.</p><div class="request-list">${issueData.length ? issueData.map(i => card(`<article class="issue-detail"><div class="request-card"><div class="request-id">${i.id}</div><div><h2>${i.title}</h2><p>${i.address}</p><div class="project-meta"><span>◉ ${i.responsible}</span><span>◷ Срок: ${i.due}</span></div></div><span class="badge orange">${i.status}</span>${managesCommunity() ? `<button class="small-button" data-action="manage-issue" data-issue-id="${i.databaseId}">Управлять</button>` : ''}</div>${i.description ? `<p>${i.description}</p>` : ''}${i.resultNote ? `<div class="result-note"><strong>Результат</strong><p>${i.resultNote}</p></div>` : ''}<div class="issue-history">${(i.history || []).map(item => `<span>${issueStatus[item.toStatus] || item.toStatus}<small>${new Date(item.createdAt).toLocaleDateString('ru-RU')}</small></span>`).join('')}</div>${i.beforePhotoUrl || i.afterPhotoUrl ? `<div class="issue-photos">${i.beforePhotoUrl ? `<a href="${i.beforePhotoUrl}" target="_blank" rel="noreferrer">Фото до</a>` : ''}${i.afterPhotoUrl ? `<a href="${i.afterPhotoUrl}" target="_blank" rel="noreferrer">Фото после</a>` : ''}</div>` : ''}</article>`)).join('') : card('<p>Обращений пока нет.</p>')}</div>`);
}

function streetsView() {
  return layout(streetsContent({ card, streets: streetData, propertyState, managesCommunity: managesCommunity() }));
}

function docsView() {
 return layout(`<header class="topbar"><div><p class="eyebrow">Единый источник информации</p><h1>Документы и решения</h1></div></header><div class="docs-grid">${[['Решение №32','Установка второго шлагбаума','15 июня 2026','Решение принято · проект в работе'],['Акт выполненных работ','Мусорная площадка','12 августа 2026','Подписан председателем и подрядчиком'],['Смета','Ремонт Центральной улицы','4 августа 2026','Связана с проектом']].map(d => card(`<article class="doc"><span class="doc-icon">▤</span><div><small>${d[0]}</small><h2>${d[1]}</h2><p>${d[2]}</p><span class="doc-state">${d[3]}</span></div><button class="round-arrow">${icon('arrow')}</button></article>`)).join('')}</div>`);
}

function neighborsView() {
  const contacts = profile => [profile.contact.phone, profile.contact.email].filter(Boolean).join(' · ') || 'Контакты скрыты владельцем';
  const query = directoryFilter.trim().toLocaleLowerCase('ru-RU');
  const matchingPeople = directoryData.filter(person => !query || `${person.name} ${person.streets.join(' ')} ${person.skills.join(' ')}`.toLocaleLowerCase('ru-RU').includes(query));
  return layout(`<header class="topbar"><div><p class="eyebrow">Внутри ${dashboardData.community}</p><h1>Соседи и услуги</h1></div><button class="primary" data-action="listing">${icon('plus')} Разместить объявление</button></header><div class="neighbors-grid"><section><div class="section-heading"><div><h2>Доска объявлений</h2><p>Предлагают и ищут услуги рядом с домом</p></div></div><div class="projects-list">${listingData.length ? listingData.map(listing => card(`<article class="listing-card"><span class="badge ${listing.type === 'OFFER' ? 'green' : 'orange'}">${listing.type === 'OFFER' ? 'Предлагаю' : 'Ищу'}</span><h2>${listing.title}</h2><p>${listing.description}</p><small>${listing.category} · ${listing.author.name}</small><div class="listing-contact">${contacts(listing.author)}</div></article>`)).join('') : card('<p>Пока нет активных объявлений.</p>')}</div></section><section><div class="section-heading"><div><h2>Каталог навыков</h2><p>Только профили, открытые самими жителями</p></div></div><input class="directory-filter" data-directory-filter placeholder="Навык или улица" value="${directoryFilter}" /><div class="directory-list">${matchingPeople.length ? matchingPeople.map(person => card(`<article class="person-card"><span class="avatar">${person.name.split(' ').map(word => word[0]).join('').slice(0, 2)}</span><div><h3>${person.name}</h3><p>${person.streets.join(', ') || 'Улица не указана'}</p><div class="skill-list">${person.skills.map(skill => `<span>${skill}</span>`).join('')}</div><small>${contacts(person)}</small></div></article>`)).join('') : card('<p>По этому запросу никого не найдено.</p>')}</div></section></div>`);
}

function aboutView() {
  const grouped = type => communityInfo.articles.filter(article => article.type === type);
  return layout(`<header class="topbar"><div><p class="eyebrow">Для жителей и новых собственников</p><h1>О поселке</h1></div></header><section class="about-hero"><div><span class="badge green">${communityInfo.community.name || dashboardData.community}</span><h2>${communityInfo.community.address || 'Адрес поселка уточняется у администрации'}</h2><p>Здесь собрана основная информация: куда обращаться, как подключить коммуникации и какие правила действуют в поселке.</p></div></section><div class="about-grid"><section><h2>Полезные контакты</h2><div class="directory-list">${communityInfo.contacts.length ? communityInfo.contacts.map(contact => card(`<article class="contact-card"><strong>${contact.title}</strong><span>${contact.contactName || ''}</span><p>${[contact.phone, contact.email].filter(Boolean).join(' · ') || 'Контакт уточняется'}</p><small>${contact.note || ''}</small></article>`)).join('') : card('<p>Контакты добавит председатель.</p>')}</div></section><section><h2>Начинаю жить в поселке</h2><div class="directory-list">${grouped('ONBOARDING').map(article => card(`<article class="article-card"><h3>${article.title}</h3><p>${article.content}</p></article>`)).join('') || card('<p>Инструкции готовятся.</p>')}</div></section></div><div class="about-grid"><section><h2>Частые вопросы</h2><div class="directory-list">${grouped('FAQ').map(article => card(`<article class="article-card"><h3>${article.title}</h3><p>${article.content}</p></article>`)).join('') || card('<p>Вопросы и ответы скоро появятся.</p>')}</div></section><section><h2>Правила и документы</h2><div class="directory-list">${[...grouped('RULE'), ...communityInfo.documents].map(item => card(`<article class="article-card"><h3>${item.title}</h3><p>${item.content || item.description || 'Открыть документ по ссылке.'}</p>${item.url ? `<a class="text-button" href="${item.url}" target="_blank" rel="noreferrer">Открыть документ ${icon('arrow')}</a>` : ''}</article>`)).join('') || card('<p>Документы готовятся к публикации.</p>')}</div></section></div>`);
}

function managementView() {
 const pending = proposalData.filter(p => ['SUBMITTED', 'REVIEW', 'VOTING'].includes(p.status));
 return layout(`<header class="topbar"><div><p class="eyebrow">Операционная панель</p><h1>Управление поселком</h1></div></header><div class="metric-grid"><div class="metric"><span>Инициативы в работе</span><strong>${pending.length}</strong><small>Требуют решения</small></div><div class="metric"><span>Проекты требуют внимания</span><strong>${projectAttentionData.length}</strong><small>Сроки и обновления</small></div><div class="metric"><span>Новые заявки</span><strong>${issueData.filter(issue => issue.rawStatus === 'NEW').length}</strong><small>Нужен ответственный</small></div></div>${projectOperationsContent({ projects: projectData, attention: projectAttentionData, card, money })}${issueManagementContent({ card, issues: issueData })}<section class="management-section"><h2>Инициативы и голосования</h2><div class="projects-list">${pending.length ? pending.map(p => card(`<article class="project-card"><div><span class="badge orange">${p.status}</span><h2>${p.title}</h2><p>${p.description}</p><div class="project-meta"><span>${p.category}</span><span>${p.preliminaryBudget ? money(p.preliminaryBudget) : 'Бюджет уточняется'}</span></div></div><div class="project-budget">${p.poll ? `<span>Голосование до ${new Date(p.poll.closesAt).toLocaleDateString('ru-RU')}</span><strong>${p.pollResult?.supportVotes || 0} за</strong><button class="text-button" data-action="project-from-proposal" data-proposal="${p.id}">Создать проект ${icon('arrow')}</button>` : `<button class="primary" data-action="open-vote" data-proposal="${p.id}">Открыть голосование</button>`}</div></article>`)).join('') : card('<p>Нет инициатив, требующих внимания.</p>')}</div></section>`);
}

function requestModal() {
  return `<div class="modal-backdrop"><section class="modal"><button class="modal-close" data-action="close">${icon('close')}</button><p class="eyebrow">Новая заявка</p><h2>Что случилось?</h2><p>Укажите проблему и место — председатель назначит ответственного.</p><label>Описание<input id="issue-title" placeholder="Например, не работает фонарь" /></label><label>Адрес или улица<input id="issue-address" placeholder="ул. Калинина, участок 18" /></label><label>Комментарий<textarea id="issue-description" placeholder="Добавьте детали, которые помогут решить вопрос"></textarea></label><label>Ссылка на фото до работ<input id="issue-before-photo" type="url" placeholder="https://…" /></label><button class="primary full" data-action="submit-request">Отправить заявку</button></section></div>`;
}

function operationsModal(type, issueId) {
  const close = `<button class="modal-close" data-action="close">${icon('close')}</button>`;
  if (type === 'street') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Территория</p><h2>Новая улица</h2><label>Название<input id="street-name" placeholder="ул. Центральная" /></label><label>Состояние дороги<input id="street-road" placeholder="Хорошее / требуется ремонт" /></label><label>Освещение, %<input id="street-lighting" type="number" min="0" max="100" value="0" /></label><label>Примечание<textarea id="street-note"></textarea></label><button class="primary full" data-action="submit-street">Добавить улицу</button></section></div>`;
  if (type === 'property') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Реестр</p><h2>Новый участок</h2><label>Улица<select id="property-street">${streetData.map(street => `<option value="${street.id}">${street.name}</option>`).join('')}</select></label><label>Номер участка<input id="property-number" /></label><button class="primary full" data-action="submit-property">Добавить участок</button></section></div>`;
  const issue = issueData.find(item => item.databaseId === issueId);
  return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">${issue.id} · ${issue.status}</p><h2>${issue.title}</h2><label>Новый статус<select id="issue-status">${Object.entries(issueStatus).map(([value, label]) => `<option value="${value}" ${value === issue.rawStatus ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Ответственный<input id="issue-responsible" value="${issue.responsible === 'Будет назначен' ? '' : issue.responsible}" /></label><label>Срок<input id="issue-due" type="date" value="${issue.dueAt ? issue.dueAt.slice(0, 10) : ''}" /></label><label>Комментарий к статусу<textarea id="issue-comment"></textarea></label><label>Результат работ<textarea id="issue-result">${issue.resultNote || ''}</textarea></label><label>Ссылка на фото после<input id="issue-after-photo" type="url" value="${issue.afterPhotoUrl || ''}" /></label><button class="primary full" data-action="submit-issue-update" data-issue-id="${issue.databaseId}">Сохранить</button></section></div>`;
}

function listingModal() {
  return `<div class="modal-backdrop"><section class="modal"><button class="modal-close" data-action="close">${icon('close')}</button><p class="eyebrow">Новое объявление</p><h2>Услуга или запрос</h2><label>Тип<select id="listing-type"><option value="OFFER">Предлагаю услугу</option><option value="REQUEST">Ищу услугу</option></select></label><label>Название<input id="listing-title" placeholder="Например, ищу няню на выходные" /></label><label>Категория<input id="listing-category" placeholder="Дети, ремонт, красота…" /></label><label>Описание<textarea id="listing-description" placeholder="Укажите важные детали"></textarea></label><button class="primary full" data-action="submit-listing">Опубликовать</button></section></div>`;
}

function financeModal(type) {
  const close = `<button class="modal-close" data-action="close">${icon('close')}</button>`;
  const submit = label => `<button class="primary full" data-action="submit-finance-${type}">${label}</button>`;
  if (type === 'charge') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Финансовый учет</p><h2>Новое начисление</h2><label>Житель и участок<select id="finance-member">${financeOptions.memberships.flatMap(member => member.properties.map(property => `<option value="${member.userId}|${property.id}">${member.user.fullName} · ${property.street}, ${property.number}</option>`)).join('')}</select></label><label>Период<input id="finance-period" placeholder="Сентябрь 2026" /></label><label>Сумма, ₽<input id="finance-amount" type="number" min="1" /></label><label>Оплатить до<input id="finance-due" type="date" /></label>${submit('Создать начисление')}</section></div>`;
  if (type === 'payment') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Финансовый учет</p><h2>Зарегистрировать оплату</h2><label>Начисление<select id="finance-charge">${financeOptions.openCharges.map(charge => `<option value="${charge.id}">${charge.user.fullName} · ${charge.period} · ${money(charge.amount)}</option>`).join('')}</select></label><label>Сумма, ₽<input id="finance-amount" type="number" min="1" /></label>${submit('Зарегистрировать')}</section></div>`;
  if (type === 'expense') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Финансовый учет</p><h2>Новый расход</h2><label>Описание<input id="finance-description" /></label><label>Категория<input id="finance-category" /></label><label>Получатель<input id="finance-recipient" /></label><label>Проект<select id="finance-project"><option value="">Без проекта</option>${financeOptions.projects.map(project => `<option value="${project.id}">${project.title}</option>`).join('')}</select></label><label>Сумма, ₽<input id="finance-amount" type="number" min="1" /></label>${submit('Опубликовать расход')}</section></div>`;
  return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">Финансовый учет</p><h2>Новый целевой сбор</h2><label>Название<input id="finance-title" /></label><label>Описание<textarea id="finance-description"></textarea></label><label>Проект<select id="finance-project"><option value="">Общий сбор</option>${financeOptions.projects.map(project => `<option value="${project.id}">${project.title}</option>`).join('')}</select></label><label>Цель, ₽<input id="finance-amount" type="number" min="1" /></label><label>Срок<input id="finance-due" type="date" /></label>${submit('Открыть сбор')}</section></div>`;
}

function projectWorkModal(type, projectId) {
  const project = projectData.find(item => item.id === projectId);
  const close = `<button class="modal-close" data-action="close">${icon('close')}</button>`;
  if (type === 'task') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">${project.title}</p><h2>Новая задача</h2><label>Название<input id="project-task-title" /></label><label>Описание<textarea id="project-task-description"></textarea></label><label>Исполнитель<input id="project-task-responsible" /></label><label>Срок<input id="project-task-due" type="date" /></label><button class="primary full" data-action="submit-project-task" data-project-id="${project.id}">Добавить задачу</button></section></div>`;
  if (type === 'update') return `<div class="modal-backdrop"><section class="modal">${close}<p class="eyebrow">${project.title}</p><h2>Обновление хода работ</h2><label>Что изменилось<textarea id="project-update-message"></textarea></label><label>Готовность, %<input id="project-update-progress" type="number" min="0" max="100" value="${project.progress}" /></label><label>Ссылка на фотографию<input id="project-update-photo" type="url" placeholder="https://…" /></label><button class="primary full" data-action="submit-project-update" data-project-id="${project.id}">Опубликовать</button></section></div>`;
  return `<div class="modal-backdrop"><section class="modal wide-modal">${close}<p class="eyebrow">Операционное управление</p><h2>${project.title}</h2><div class="form-grid"><label>Статус<select id="project-status">${Object.entries(projectStatusLabels).map(([value, label]) => `<option value="${value}" ${value === project.rawStatus ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Приоритет<select id="project-priority">${Object.entries(projectPriorityLabels).map(([value, label]) => `<option value="${value}" ${value === project.priority ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Улица<select id="project-street"><option value="">Общая территория</option>${streetData.map(street => `<option value="${street.id}" ${street.id === project.streetId ? 'selected' : ''}>${street.name}</option>`).join('')}</select></label><label>Ответственный<input id="project-responsible" value="${project.responsible === 'Правление поселка' ? '' : project.responsible}" /></label><label>Дата начала<input id="project-start" type="date" value="${project.startAt ? project.startAt.slice(0, 10) : ''}" /></label><label>Плановый срок<input id="project-deadline" type="date" value="${project.rawDeadline ? project.rawDeadline.slice(0, 10) : ''}" /></label><label>Бюджет, ₽<input id="project-budget" type="number" min="0" value="${project.budget}" /></label><label>Источник финансирования<input id="project-funding" value="${project.fundingSource || ''}" /></label></div><label>Проблема<textarea id="project-problem">${project.problem || ''}</textarea></label><label>Ожидаемый результат<textarea id="project-expected">${project.expectedResult || ''}</textarea></label><label>Комментарий к смене статуса<textarea id="project-comment"></textarea></label><label>Фото до<input id="project-before-photo" type="url" value="${project.beforePhotoUrl || ''}" /></label><label>Результат выполненного проекта<textarea id="project-result">${project.resultNote || ''}</textarea></label><label>Фото после<input id="project-after-photo" type="url" value="${project.afterPhotoUrl || ''}" /></label><button class="primary full" data-action="submit-project-edit" data-project-id="${project.id}">Сохранить проект</button></section></div>`;
}

function projectModal(project) {
 const p = projectData.find(x => x.id === project || x.title === project) || projectData[0];
 return projectDetail(p, { money, canWork: worksWithProjects() });
}

function loginView() {
  return `<main class="login-page"><section class="login-card"><a class="brand" href="#"><span class="brand-mark">⌁</span><span>прозор</span></a><p class="eyebrow">Кабинет жителя</p><h1>Войдите в поселок</h1><p>Используйте данные, которые вам выдала администрация.</p>${loadError ? `<p class="form-error">${loadError}</p>` : ''}<form id="login-form"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label><label>Пароль<input name="password" type="password" autocomplete="current-password" required placeholder="Ваш пароль" /></label><label>Поселок<input name="communitySlug" required value="novotitarovka" /></label><button class="primary full" ${loading ? 'disabled' : ''}>${loading ? 'Входим…' : 'Войти'}</button></form><small>Демо: alexander@example.test / ChangeMe123!</small></section></main>`;
}

function render() {
  if (!session) { document.querySelector('#app').innerHTML = loginView(); return; }
  const views = { 'Главная': dashboardView, 'Проекты': projectsView, 'Дорожная карта': roadmapView, 'Финансы': financeView, 'Заявки': requestsView, 'Улицы и участки': streetsView, 'Документы': docsView, 'Соседи': neighborsView, 'О поселке': aboutView, 'Управление': managementView };
  document.querySelector('#app').innerHTML = loading ? layout('<div class="page-state">Загружаем данные поселка…</div>') : loadError ? layout(`<div class="page-state error-state">${loadError}<button class="primary" data-action="reload">Повторить</button></div>`) : views[active]();
}

document.addEventListener('click', async event => {
  const view = event.target.closest('[data-view]')?.dataset.view;
  if (view) { active = view; modal = null; render(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'request') { modal = requestModal(); render(); }
  if (action === 'listing') { modal = listingModal(); render(); }
  if (action === 'new-street') { modal = operationsModal('street'); render(); }
  if (action === 'new-property') { modal = operationsModal('property'); render(); }
  if (action === 'manage-issue') { modal = operationsModal('issue', event.target.closest('[data-issue-id]').dataset.issueId); render(); }
  if (action === 'edit-project') { modal = projectWorkModal('edit', event.target.closest('[data-project-id]').dataset.projectId); render(); }
  if (action === 'new-project-task') { modal = projectWorkModal('task', event.target.closest('[data-project-id]').dataset.projectId); render(); }
  if (action === 'new-project-update') { modal = projectWorkModal('update', event.target.closest('[data-project-id]').dataset.projectId); render(); }
  if (action?.startsWith('finance-') && !action.startsWith('submit-')) { modal = financeModal(action.replace('finance-', '')); render(); }
  if (action === 'close') { modal = null; render(); }
  if (action === 'logout') { clearSession(); session = null; currentUser = null; modal = null; loadError = ''; render(); }
  if (action === 'reload') { loadApplicationData(); }
  if (action === 'open-vote') { try { await openVote(session.token, event.target.closest('[data-proposal]').dataset.proposal, { closesAt: new Date(Date.now() + 7 * 86400000).toISOString(), quorumPercent: 30, approvalPercent: 60 }); await loadApplicationData(); } catch (error) { loadError = error.message; render(); } }
  if (action === 'project-from-proposal') { try { await createProjectFromProposal(session.token, event.target.closest('[data-proposal]').dataset.proposal, {}); await loadApplicationData(); } catch (error) { loadError = error.message; render(); } }
  if (action === 'submit-request') {
    try { const issue = await createIssue(session.token, { title: document.querySelector('#issue-title')?.value, address: document.querySelector('#issue-address')?.value, description: document.querySelector('#issue-description')?.value, beforePhotoUrl: document.querySelector('#issue-before-photo')?.value }); issueData.unshift(normalizedIssues([issue])[0]); modal = null; active = 'Заявки'; }
    catch (error) { loadError = error.message; modal = null; }
    render();
  }
  if (action === 'submit-street') {
    try { await createStreet(session.token, { name: document.querySelector('#street-name').value, roadCondition: document.querySelector('#street-road').value, lightingCoverage: Number(document.querySelector('#street-lighting').value), note: document.querySelector('#street-note').value }); modal = null; active = 'Улицы и участки'; await loadApplicationData(); }
    catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'submit-property') {
    try { await createProperty(session.token, { streetId: document.querySelector('#property-street').value, number: document.querySelector('#property-number').value }); modal = null; active = 'Улицы и участки'; await loadApplicationData(); }
    catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'claim-property') {
    try { await requestPropertyAccess(session.token, event.target.closest('[data-property-id]').dataset.propertyId, 'Прошу подтвердить мой участок'); active = 'Улицы и участки'; await loadApplicationData(); }
    catch (error) { loadError = error.message; render(); }
  }
  if (action === 'review-property') {
    const target = event.target.closest('[data-request-id]');
    try { await reviewPropertyAccess(session.token, target.dataset.requestId, target.dataset.decision); active = 'Улицы и участки'; await loadApplicationData(); }
    catch (error) { loadError = error.message; render(); }
  }
  if (action === 'submit-issue-update') {
    try { await updateIssue(session.token, event.target.closest('[data-issue-id]').dataset.issueId, { status: document.querySelector('#issue-status').value, responsible: document.querySelector('#issue-responsible').value, dueAt: document.querySelector('#issue-due').value || null, comment: document.querySelector('#issue-comment').value, resultNote: document.querySelector('#issue-result').value, afterPhotoUrl: document.querySelector('#issue-after-photo').value }); modal = null; active = 'Управление'; await loadApplicationData(); }
    catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'submit-project-edit') {
    try {
      await updateProject(session.token, event.target.closest('[data-project-id]').dataset.projectId, { status: document.querySelector('#project-status').value, priority: document.querySelector('#project-priority').value, streetId: document.querySelector('#project-street').value, responsible: document.querySelector('#project-responsible').value, startAt: document.querySelector('#project-start').value || null, deadline: document.querySelector('#project-deadline').value || null, budget: Number(document.querySelector('#project-budget').value), fundingSource: document.querySelector('#project-funding').value, problem: document.querySelector('#project-problem').value, expectedResult: document.querySelector('#project-expected').value, comment: document.querySelector('#project-comment').value, beforePhotoUrl: document.querySelector('#project-before-photo').value, resultNote: document.querySelector('#project-result').value, afterPhotoUrl: document.querySelector('#project-after-photo').value });
      modal = null; active = 'Управление'; await loadApplicationData();
    } catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'submit-project-task') {
    try { await createProjectTask(session.token, event.target.closest('[data-project-id]').dataset.projectId, { title: document.querySelector('#project-task-title').value, description: document.querySelector('#project-task-description').value, responsible: document.querySelector('#project-task-responsible').value, dueAt: document.querySelector('#project-task-due').value || null }); modal = null; active = managesCommunity() ? 'Управление' : 'Проекты'; await loadApplicationData(); }
    catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'submit-project-update') {
    try { await addProjectUpdate(session.token, event.target.closest('[data-project-id]').dataset.projectId, { message: document.querySelector('#project-update-message').value, progress: Number(document.querySelector('#project-update-progress').value), photoUrl: document.querySelector('#project-update-photo').value }); modal = null; active = 'Проекты'; await loadApplicationData(); }
    catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'advance-task') {
    const target = event.target.closest('[data-task-id]');
    try { await updateProjectTask(session.token, target.dataset.projectId, target.dataset.taskId, { status: target.dataset.taskStatus }); modal = null; active = 'Проекты'; await loadApplicationData(); }
    catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'submit-listing') {
    try { const listing = await createListing(session.token, { type: document.querySelector('#listing-type')?.value, title: document.querySelector('#listing-title')?.value, category: document.querySelector('#listing-category')?.value, description: document.querySelector('#listing-description')?.value }); listingData.unshift(listing); modal = null; active = 'Соседи'; }
    catch (error) { loadError = error.message; modal = null; }
    render();
  }
  if (action?.startsWith('submit-finance-')) {
    try {
      const kind = action.replace('submit-finance-', '');
      const amount = Number(document.querySelector('#finance-amount')?.value);
      if (kind === 'charge') { const [userId, propertyId] = document.querySelector('#finance-member').value.split('|'); await createCharge(session.token, { userId, propertyId, amount, period: document.querySelector('#finance-period').value, dueAt: document.querySelector('#finance-due').value || null }); }
      if (kind === 'payment') await recordPayment(session.token, { chargeId: document.querySelector('#finance-charge').value, amount });
      if (kind === 'expense') await createExpense(session.token, { amount, description: document.querySelector('#finance-description').value, category: document.querySelector('#finance-category').value, recipient: document.querySelector('#finance-recipient').value, projectId: document.querySelector('#finance-project').value || null });
      if (kind === 'fundraiser') await createFundraiser(session.token, { title: document.querySelector('#finance-title').value, description: document.querySelector('#finance-description').value, targetAmount: amount, projectId: document.querySelector('#finance-project').value || null, deadline: document.querySelector('#finance-due').value || null });
      modal = null; active = 'Финансы'; await loadApplicationData();
    } catch (error) { loadError = error.message; modal = null; render(); }
  }
  if (action === 'contribute') { try { await contributeToFundraiser(session.token, event.target.closest('[data-fundraiser]').dataset.fundraiser, 1000); active = 'Финансы'; await loadApplicationData(); } catch (error) { loadError = error.message; render(); } }
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

document.addEventListener('input', event => {
  const isDirectory = event.target.matches('[data-directory-filter]');
  const isExpense = event.target.matches('[data-expense-filter]');
  if (!isDirectory && !isExpense) return;
  if (isDirectory) directoryFilter = event.target.value;
  if (isExpense) expenseFilter = event.target.value;
  const position = event.target.selectionStart;
  render();
  const selector = isDirectory ? '[data-directory-filter]' : '[data-expense-filter]';
  document.querySelector(selector)?.focus();
  document.querySelector(selector)?.setSelectionRange(position, position);
});

render();
if (session) loadApplicationData();
