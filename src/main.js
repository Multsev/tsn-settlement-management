import './styles.css';
import { dashboard, issues, money, projects } from './data.js';

const icon = (name) => ({
  home: '⌂', projects: '◫', finance: '₽', requests: '◌', docs: '▤', more: '•••', bell: '♧', arrow: '→', close: '×', plus: '+'
}[name] || '•');

const navigation = [
  ['home', 'Главная'], ['projects', 'Проекты'], ['finance', 'Финансы'], ['requests', 'Заявки'], ['docs', 'Документы']
];

let active = 'Главная';
let modal = null;

function layout(content) {
  return `
    <aside class="sidebar">
      <a class="brand" href="#"><span class="brand-mark">⌁</span><span>прозор</span></a>
      <div class="community-switch"><span class="community-dot"></span><div><small>Мой поселок</small><strong>${dashboard.community}</strong></div><span>⌄</span></div>
      <nav>${navigation.map(([key, label]) => `<button class="nav-item ${active === label ? 'active' : ''}" data-view="${label}"><span>${icon(key)}</span>${label}</button>`).join('')}</nav>
      <div class="side-bottom"><button class="nav-item"><span>?</span> Помощь</button><div class="profile"><span class="avatar">АС</span><div><strong>Александр С.</strong><small>Участок №157</small></div><span>⌄</span></div></div>
    </aside>
    <main class="content">${content}</main>
    <nav class="mobile-nav">${navigation.slice(0, 4).map(([key, label]) => `<button class="mobile-item ${active === label ? 'active' : ''}" data-view="${label}"><span>${icon(key)}</span><small>${label}</small></button>`).join('')}</nav>
    ${modal || ''}`;
}

const card = (content, className = '') => `<section class="card ${className}">${content}</section>`;
const formatDate = () => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date());

function dashboardView() {
  return layout(`
    <header class="topbar"><div><p class="eyebrow">${formatDate()} · Добрый день, ${dashboard.user}</p><h1>Что происходит в поселке</h1></div><div class="top-actions"><button class="icon-button" aria-label="Уведомления">${icon('bell')}<i></i></button><button class="primary" data-action="request">${icon('plus')} Новая заявка</button></div></header>
    ${card(`<div class="notice-icon">!</div><div><strong>Важное объявление</strong><p>27 августа с 10:00 до 15:00 будет перекрыта техническая дорога.</p></div><button class="text-button" data-view="Документы">Подробнее ${icon('arrow')}</button>`, 'notice')}
    <div class="dashboard-grid">
      <div class="main-column">
        <div class="section-heading"><div><h2>Сейчас</h2><p>Главное о работах и планах</p></div><button class="text-button" data-view="Проекты">Все проекты ${icon('arrow')}</button></div>
        <div class="project-stack">${dashboard.projects.map(item => card(`<div class="project-row"><div class="status-icon ${item.color}">${item.progress === 72 ? '↗' : item.color === 'blue' ? '◷' : '◌'}</div><div class="project-info"><div class="project-title"><h3>${item.title}</h3><span class="badge ${item.color}">${item.tag}</span></div>${item.progress ? `<div class="progress-line"><span style="width:${item.progress}%"></span></div><p>Готовность ${item.progress}% <em>· ${item.date}</em></p>` : `<p>${item.date}</p>`}</div><button class="round-arrow" data-project="${item.title}">${icon('arrow')}</button></div>`)).join('')}</div>
        <div class="section-heading results-heading"><div><h2>Последние результаты</h2><p>Сделано за последнюю неделю</p></div><button class="text-button">Весь дайджест ${icon('arrow')}</button></div>
        ${card(`<ul class="result-list">${dashboard.results.map(r => `<li><span>✓</span>${r}</li>`).join('')}</ul>`)}
      </div>
      <aside class="right-column">
        ${card(`<div class="section-heading compact"><div><h2>Ваши действия</h2><p>2 действия ждут вас</p></div></div><div class="action-list">${dashboard.actions.map(a => `<div class="action-item"><span class="action-symbol">${a.icon}</span><div><strong>${a.title}</strong><small>${a.text}</small></div><button class="small-button" data-action="${a.title === 'Оплатить взнос' ? 'pay' : 'vote'}">${a.action}</button></div>`).join('')}</div>`, 'actions-card')}
        ${card(`<div class="section-heading compact"><div><h2>Финансы поселка</h2><p>На сегодня</p></div><button class="round-arrow" data-view="Финансы">${icon('arrow')}</button></div><div class="balance">${money(dashboard.balance)}</div><div class="finance-grid"><div><span>Поступило за месяц</span><strong class="income">+${money(dashboard.income)}</strong></div><div><span>Потрачено</span><strong>−${money(dashboard.spent)}</strong></div></div><div class="finance-note"><span>◎</span> Все расходы связаны с работами и документами</div>`, 'finance-card')}
        ${card(`<div class="section-heading compact"><div><h2>Быстрый доступ</h2></div></div><div class="quick-grid"><button data-view="Финансы">Мои платежи</button><button data-view="Документы">Документы</button><button data-view="Заявки">Мои заявки</button><button data-view="Проекты">Дорожная карта</button></div>`)}
      </aside>
    </div>`);
}

function projectsView() {
  return layout(`<header class="topbar"><div><p class="eyebrow">КП Новотитаровка</p><h1>Проекты поселка</h1></div><button class="primary" data-action="request">${icon('plus')} Сообщить о проблеме</button></header><div class="filter-row"><button class="filter active">Все</button><button class="filter">В работе</button><button class="filter">Планируемые</button><button class="filter">Завершённые</button></div><div class="projects-list">${projects.map(p => card(`<article class="project-card"><div><span class="badge green">${p.category}</span><span class="project-status">${p.status}</span><h2>${p.title}</h2><p>${p.description}</p><div class="project-meta"><span>◷ ${p.deadline}</span><span>◉ ${p.lead}</span></div></div><div class="project-budget"><span>Бюджет</span><strong>${money(p.budget)}</strong><div class="progress-line"><span style="width:${p.progress}%"></span></div><small>Готовность ${p.progress}%</small><button class="text-button" data-project="${p.id}">Открыть проект ${icon('arrow')}</button></div></article>`)).join('')}</div>`);
}

function financeView() {
  return layout(`<header class="topbar"><div><p class="eyebrow">Прозрачный учет</p><h1>Финансы</h1></div></header><div class="metric-grid"><div class="metric"><span>Баланс поселка</span><strong>${money(dashboard.balance)}</strong><small>Доступно на счетах</small></div><div class="metric"><span>Поступило в августе</span><strong class="income">+${money(dashboard.income)}</strong><small>Собираемость 82%</small></div><div class="metric"><span>Потрачено в августе</span><strong>−${money(dashboard.spent)}</strong><small>Все расходы с документами</small></div></div>${card(`<div class="section-heading"><div><h2>Мои начисления</h2><p>Участок №157</p></div><strong class="paid">Задолженность: 0 ₽</strong></div><div class="payment-row"><div><strong>Регулярный взнос · август</strong><small>Начислено 1 августа</small></div><strong>${money(3500)}</strong><span class="paid">✓ Оплачено</span></div><div class="payment-row"><div><strong>Регулярный взнос · июль</strong><small>Оплачено 5 июля</small></div><strong>${money(3500)}</strong><span class="paid">✓ Оплачено</span></div>`)}`);
}

function requestsView() {
 return layout(`<header class="topbar"><div><p class="eyebrow">Обращения жителей</p><h1>Мои заявки</h1></div><button class="primary" data-action="request">${icon('plus')} Новая заявка</button></header><p class="view-lead">Сообщите о проблеме — мы назначим ответственного и покажем статус работ.</p><div class="request-list">${issues.map(i => card(`<article class="request-card"><div class="request-id">${i.id}</div><div><h2>${i.title}</h2><p>${i.address}</p><div class="project-meta"><span>◉ ${i.responsible}</span><span>◷ Срок: ${i.due}</span></div></div><span class="badge orange">${i.status}</span><button class="round-arrow">${icon('arrow')}</button></article>`)).join('')}</div>`);
}

function docsView() {
 return layout(`<header class="topbar"><div><p class="eyebrow">Единый источник информации</p><h1>Документы и решения</h1></div></header><div class="docs-grid">${[['Решение №32','Установка второго шлагбаума','15 июня 2026','Решение принято · проект в работе'],['Акт выполненных работ','Мусорная площадка','12 августа 2026','Подписан председателем и подрядчиком'],['Смета','Ремонт Центральной улицы','4 августа 2026','Связана с проектом']].map(d => card(`<article class="doc"><span class="doc-icon">▤</span><div><small>${d[0]}</small><h2>${d[1]}</h2><p>${d[2]}</p><span class="doc-state">${d[3]}</span></div><button class="round-arrow">${icon('arrow')}</button></article>`)).join('')}</div>`);
}

function requestModal() {
  return `<div class="modal-backdrop"><section class="modal"><button class="modal-close" data-action="close">${icon('close')}</button><p class="eyebrow">Новая заявка</p><h2>Что случилось?</h2><p>Укажите проблему и место — председатель назначит ответственного.</p><label>Описание<input id="issue-title" placeholder="Например, не работает фонарь" /></label><label>Адрес или улица<input placeholder="ул. Калинина, участок 18" /></label><label>Комментарий<textarea placeholder="Добавьте детали, которые помогут решить вопрос"></textarea></label><button class="primary full" data-action="submit-request">Отправить заявку</button></section></div>`;
}

function projectModal(project) {
 const p = typeof project === 'number' ? projects.find(x => x.id === project) : projects.find(x => x.title === project) || projects[0];
 return `<div class="modal-backdrop"><section class="modal project-modal"><button class="modal-close" data-action="close">${icon('close')}</button><span class="badge green">${p.category}</span><h2>${p.title}</h2><p>${p.description}</p><div class="detail-progress"><strong>${p.progress}%</strong><div class="progress-line"><span style="width:${p.progress}%"></span></div><span>готовность</span></div><div class="detail-grid"><div><small>Бюджет</small><strong>${money(p.budget)}</strong></div><div><small>Потрачено</small><strong>${money(p.spent)}</strong></div><div><small>Срок</small><strong>${p.deadline}</strong></div><div><small>Ответственный</small><strong>${p.lead}</strong></div></div><div class="update"><small>Последнее обновление</small><p>${p.update}</p></div></section></div>`;
}

function render() {
  const views = { 'Главная': dashboardView, 'Проекты': projectsView, 'Финансы': financeView, 'Заявки': requestsView, 'Документы': docsView };
  document.querySelector('#app').innerHTML = views[active]();
}

document.addEventListener('click', event => {
  const view = event.target.closest('[data-view]')?.dataset.view;
  if (view) { active = view; modal = null; render(); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'request') { modal = requestModal(); render(); }
  if (action === 'close') { modal = null; render(); }
  if (action === 'submit-request') { modal = null; active = 'Заявки'; issues.unshift({ id: 'REQ-325', title: document.querySelector('#issue-title')?.value || 'Новая заявка', address: 'Адрес уточняется', status: 'Новая', due: 'Будет назначен', responsible: 'Не назначен' }); render(); }
  if (action === 'pay') { alert('Демо: платеж сформирован. В рабочей версии здесь открывается безопасная форма оплаты.'); }
  if (action === 'vote') { alert('Демо: ваш голос будет учтён после подключения сервера опросов.'); }
  const project = event.target.closest('[data-project]')?.dataset.project;
  if (project) { modal = projectModal(Number(project) || project); render(); }
});

render();
