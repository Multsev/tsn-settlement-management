export const money = (value) => new Intl.NumberFormat('ru-RU').format(value) + ' ₽';

export const dashboard = {
  community: 'КП Новотитаровка',
  user: 'Александр',
  balance: 1420000,
  income: 620000,
  spent: 410000,
  debt: 480000,
  projects: [
    { title: 'Ремонт Центральной улицы', tag: 'В работе', progress: 72, date: 'Обновлено вчера', color: 'orange' },
    { title: 'Вывоз крупного мусора', tag: '28 августа', progress: 0, date: 'Запланировано', color: 'blue' },
    { title: 'Освещение ул. Калинина', tag: 'Сбор предложений', progress: 0, date: 'До 31 августа', color: 'green' }
  ],
  actions: [
    { icon: '₽', title: 'Оплатить взнос', text: 'Август · 3 500 ₽', action: 'Оплатить' },
    { icon: '✓', title: 'Проголосовать', text: 'Дополнительное освещение', action: 'Открыть' }
  ],
  results: ['Восстановлено 120 метров дороги', 'Вывезено 2 контейнера мусора', 'Заменено 7 фонарей']
};

export const projects = [
  { id: 1, title: 'Ремонт Центральной улицы', category: 'Дороги', status: 'В работе', progress: 72, budget: 1280000, spent: 970000, collected: 1280000, deadline: '20 сентября', lead: 'Марина Сергеева', description: 'Восстанавливаем покрытие на участке от въезда до перекрёстка с ул. Садовой.', update: 'Уложен выравнивающий слой, подрядчик приступил к финишному покрытию.' },
  { id: 2, title: 'Освещение ул. Калинина', category: 'Освещение', status: 'Сбор предложений', progress: 18, budget: 460000, spent: 0, collected: 84000, deadline: '30 октября', lead: 'Совет поселка', description: 'Установка 14 новых опор и замена светильников на энергоэффективные.', update: 'Собираем предложения жителей по расположению опор.' },
  { id: 3, title: 'Мусорная площадка', category: 'Благоустройство', status: 'Завершено', progress: 100, budget: 215000, spent: 198000, collected: 215000, deadline: 'Завершён', lead: 'Иван Егоров', description: 'Оборудовали площадку с ограждением и твёрдым покрытием.', update: 'Работы приняты, фото и акт доступны в документах.' }
];

export const issues = [
  { id: 'REQ-324', title: 'Не работает фонарь №37', address: 'ул. Калинина, участок 18', status: 'Подрядчик вызван', due: '27 августа', responsible: 'Иван Егоров' },
  { id: 'REQ-319', title: 'Яма у выезда на Центральную', address: 'ул. Центральная, д. 4', status: 'В работе', due: '26 августа', responsible: 'Дорожная служба' }
];
