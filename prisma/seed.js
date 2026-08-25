import bcrypt from 'bcryptjs';
import { PrismaClient, ProjectStatus, ChargeStatus } from '@prisma/client';

const database = new PrismaClient();

async function main() {
  const community = await database.community.upsert({
    where: { slug: 'novotitarovka' }, update: {}, create: { name: 'КП Новотитаровка', slug: 'novotitarovka' }
  });
  const user = await database.user.upsert({
    where: { email: 'alexander@example.test' },
    update: {},
    create: { email: 'alexander@example.test', fullName: 'Александр Сергеев', passwordHash: await bcrypt.hash('ChangeMe123!', 12) }
  });
  const membership = await database.membership.upsert({
    where: { userId_communityId: { userId: user.id, communityId: community.id } },
    update: {}, create: { userId: user.id, communityId: community.id, role: 'resident', approvedAt: new Date() }
  });
  const street = await database.street.upsert({
    where: { communityId_name: { communityId: community.id, name: 'ул. Калинина' } },
    update: { roadCondition: 'Удовлетворительное', lightingCoverage: 78 },
    create: { communityId: community.id, name: 'ул. Калинина', roadCondition: 'Удовлетворительное', lightingCoverage: 78, note: 'Основной проезд освещен, два фонаря требуют ремонта.' }
  });
  const property = await database.property.upsert({
    where: { communityId_number: { communityId: community.id, number: '157' } },
    update: { streetId: street.id, latitude: 45.2392, longitude: 38.9806, hasHouse: true, occupied: true }, create: { communityId: community.id, membershipId: membership.id, number: '157', street: street.name, streetId: street.id, latitude: 45.2392, longitude: 38.9806, hasHouse: true, occupied: true }
  });
  await database.property.upsert({ where: { communityId_number: { communityId: community.id, number: '158' } }, update: { streetId: street.id, latitude: 45.2396, longitude: 38.9811 }, create: { communityId: community.id, number: '158', street: street.name, streetId: street.id, latitude: 45.2396, longitude: 38.9811 } });
  const chairman = await database.user.upsert({
    where: { email: 'chairman@example.test' }, update: {},
    create: { email: 'chairman@example.test', fullName: 'Марина Волкова', passwordHash: await bcrypt.hash('ChangeMe123!', 12) }
  });
  await database.membership.upsert({ where: { userId_communityId: { userId: chairman.id, communityId: community.id } }, update: { role: 'chairman', approvedAt: new Date() }, create: { userId: chairman.id, communityId: community.id, role: 'chairman', approvedAt: new Date() } });
  const project = await database.project.upsert({
    where: { id: 'demo-central-road' },
    update: { streetId: street.id, responsible: 'Иван Егоров', priority: 'HIGH', fundingSource: 'Целевой сбор', problem: 'Разрушенное дорожное покрытие основного проезда.', expectedResult: 'Безопасный проезд с новым финишным покрытием.', startAt: new Date('2026-07-01'), deadline: new Date('2026-09-30'), beforePhotoUrl: 'https://placehold.co/1000x600?text=Road+Before', latitude: 45.2394, longitude: 38.9801 },
    create: { id: 'demo-central-road', communityId: community.id, streetId: street.id, title: 'Ремонт Центральной улицы', description: 'Восстанавливаем покрытие от въезда до перекрёстка с ул. Садовой.', problem: 'Разрушенное дорожное покрытие основного проезда.', expectedResult: 'Безопасный проезд с новым финишным покрытием.', category: 'Дороги', status: ProjectStatus.IN_PROGRESS, priority: 'HIGH', responsible: 'Иван Егоров', fundingSource: 'Целевой сбор', budget: 1280000, collected: 1280000, spent: 970000, progress: 72, startAt: new Date('2026-07-01'), deadline: new Date('2026-09-30'), beforePhotoUrl: 'https://placehold.co/1000x600?text=Road+Before', latitude: 45.2394, longitude: 38.9801 }
  });
  await database.projectUpdate.upsert({ where: { id: 'demo-road-update' }, update: { progress: 72 }, create: { id: 'demo-road-update', projectId: project.id, authorId: chairman.id, progress: 72, message: 'Уложен выравнивающий слой, подрядчик приступил к финишному покрытию.', photoUrl: 'https://placehold.co/1000x600?text=Road+Progress' } });
  await database.projectTask.upsert({ where: { id: 'demo-road-task-base' }, update: {}, create: { id: 'demo-road-task-base', projectId: project.id, title: 'Подготовить основание', responsible: 'Иван Егоров', status: 'DONE', dueAt: new Date('2026-08-10'), completedAt: new Date('2026-08-08') } });
  await database.projectTask.upsert({ where: { id: 'demo-road-task-finish' }, update: {}, create: { id: 'demo-road-task-finish', projectId: project.id, title: 'Уложить финишное покрытие', responsible: 'ООО «ДорСтрой»', status: 'IN_PROGRESS', dueAt: new Date('2026-09-20') } });
  await database.projectHistory.upsert({ where: { id: 'demo-road-history' }, update: {}, create: { id: 'demo-road-history', projectId: project.id, actorId: chairman.id, toStatus: 'IN_PROGRESS', comment: 'Работы начаты' } });
  const decision = await database.decision.upsert({ where: { id: 'demo-road-decision' }, update: { projects: { connect: { id: project.id } } }, create: { id: 'demo-road-decision', communityId: community.id, title: 'Ремонт Центральной улицы', description: 'Утвердить ремонт дорожного покрытия от въезда до перекрестка.', basis: 'Протокол общего собрания №32', type: 'GENERAL_MEETING', status: 'IN_PROGRESS', adoptedBy: 'Общее собрание собственников', supportPercent: 73, decidedAt: new Date('2026-06-15'), projects: { connect: { id: project.id } } } });
  const contractor = await database.contractor.upsert({ where: { communityId_name: { communityId: community.id, name: 'ООО «ДорСтрой»' } }, update: { rating: 4 }, create: { communityId: community.id, name: 'ООО «ДорСтрой»', contactName: 'Сергей Павлов', phone: '+7 900 555-21-10', email: 'office@dorstroy.example', services: 'Дорожное строительство и благоустройство', rating: 4, note: 'Работает с поселком с 2025 года.' } });
  await database.projectContractor.upsert({ where: { projectId_contractorId: { projectId: project.id, contractorId: contractor.id } }, update: { contractAmount: 1200000 }, create: { projectId: project.id, contractorId: contractor.id, role: 'Генеральный подрядчик', contractNumber: 'Д-18/2026', contractAmount: 1200000, warrantyUntil: new Date('2027-09-30') } });
  const expense = await database.expense.upsert({ where: { id: 'demo-road-expense' }, update: {}, create: { id: 'demo-road-expense', communityId: community.id, projectId: project.id, amount: 970000, category: 'Дороги', description: 'Аванс и выполненный объем дорожных работ', recipient: contractor.name, spentAt: new Date('2026-08-12') } });
  await database.communityDocument.upsert({ where: { id: 'demo-road-contract' }, update: { projectId: project.id, contractorId: contractor.id }, create: { id: 'demo-road-contract', communityId: community.id, projectId: project.id, contractorId: contractor.id, uploadedById: chairman.id, type: 'CONTRACT', title: 'Договор Д-18/2026', url: 'https://example.test/documents/road-contract.pdf', description: 'Договор на ремонт Центральной улицы.', documentDate: new Date('2026-07-01') } });
  await database.communityDocument.upsert({ where: { id: 'demo-road-protocol' }, update: { decisionId: decision.id }, create: { id: 'demo-road-protocol', communityId: community.id, decisionId: decision.id, uploadedById: chairman.id, type: 'PROTOCOL', title: 'Протокол общего собрания №32', url: 'https://example.test/documents/protocol-32.pdf', description: 'Основание для запуска проекта ремонта дороги.', documentDate: new Date('2026-06-15') } });
  await database.communityDocument.upsert({ where: { id: 'demo-road-act' }, update: { expenseId: expense.id, projectId: project.id, contractorId: contractor.id }, create: { id: 'demo-road-act', communityId: community.id, projectId: project.id, expenseId: expense.id, contractorId: contractor.id, uploadedById: chairman.id, type: 'ACT', title: 'Акт выполненных работ №1', url: 'https://example.test/documents/road-act-1.pdf', description: 'Промежуточная приемка основания дороги.', documentDate: new Date('2026-08-12') } });
  const announcement = await database.announcement.upsert({ where: { id: 'demo-road-closure' }, update: { notifiedAt: new Date('2026-08-25') }, create: { id: 'demo-road-closure', communityId: community.id, authorId: chairman.id, title: 'Перекрытие технической дороги', content: '27 августа с 10:00 до 15:00 техническая дорога будет перекрыта из-за укладки покрытия.', priority: 'IMPORTANT', startsAt: new Date('2026-08-25'), expiresAt: new Date('2026-08-28'), notifiedAt: new Date('2026-08-25') } });
  const digest = await database.weeklyDigest.upsert({ where: { id: 'demo-weekly-digest' }, update: {}, create: { id: 'demo-weekly-digest', communityId: community.id, weekStart: new Date('2026-08-24'), weekEnd: new Date('2026-08-31'), title: 'Эта неделя в поселке · 24.08.2026', status: 'PUBLISHED', publishedAt: new Date('2026-08-25'), content: { results: ['Подготовлено основание Центральной улицы', 'Заменен фонарь у участка 157'], projectUpdates: [{ project: project.title, message: 'Началась укладка финишного покрытия', progress: 72 }], collected: 320000, activeProjects: 1, actionsRequired: 1 } } });
  const residentNotification = await database.notification.upsert({ where: { id: 'demo-resident-announcement' }, update: {}, create: { id: 'demo-resident-announcement', communityId: community.id, membershipId: membership.id, announcementId: announcement.id, kind: 'ANNOUNCEMENT', title: announcement.title, body: announcement.content } });
  await database.emailDelivery.upsert({ where: { notificationId: residentNotification.id }, update: {}, create: { notificationId: residentNotification.id, recipient: user.email } });
  await database.notification.upsert({ where: { id: 'demo-resident-digest' }, update: {}, create: { id: 'demo-resident-digest', communityId: community.id, membershipId: membership.id, digestId: digest.id, kind: 'DIGEST', title: digest.title, body: 'Краткая сводка работ, финансов и действий за неделю.' } });
  await database.charge.upsert({ where: { id: 'demo-charge-august' }, update: {}, create: { id: 'demo-charge-august', communityId: community.id, userId: user.id, propertyId: property.id, amount: 3500, period: 'Август 2026', status: ChargeStatus.PAID } });
  await database.issue.upsert({ where: { communityId_number: { communityId: community.id, number: 1 } }, update: { latitude: 45.23925, longitude: 38.98072 }, create: { communityId: community.id, authorId: user.id, number: 1, title: 'Не работает фонарь', description: 'Темно возле поворота к участку.', address: 'ул. Калинина, участок 157', latitude: 45.23925, longitude: 38.98072, beforePhotoUrl: 'https://placehold.co/800x500?text=Before', history: { create: { actorId: user.id, toStatus: 'NEW', comment: 'Обращение создано' } } } });
  await database.mapFeature.upsert({ where: { id: 'demo-main-gate' }, update: { latitude: 45.2388, longitude: 38.9794 }, create: { id: 'demo-main-gate', communityId: community.id, type: 'GATE', title: 'Главный въезд', description: 'Шлагбаум и пост охраны', status: 'Работает круглосуточно', latitude: 45.2388, longitude: 38.9794 } });
  console.log('Demo resident: alexander@example.test / ChangeMe123!');
  console.log('Demo chairman: chairman@example.test / ChangeMe123!');
}

main().finally(() => database.$disconnect());
