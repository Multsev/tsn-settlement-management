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
    update: { streetId: street.id }, create: { communityId: community.id, membershipId: membership.id, number: '157', street: street.name, streetId: street.id }
  });
  await database.property.upsert({ where: { communityId_number: { communityId: community.id, number: '158' } }, update: { streetId: street.id }, create: { communityId: community.id, number: '158', street: street.name, streetId: street.id } });
  const chairman = await database.user.upsert({
    where: { email: 'chairman@example.test' }, update: {},
    create: { email: 'chairman@example.test', fullName: 'Марина Волкова', passwordHash: await bcrypt.hash('ChangeMe123!', 12) }
  });
  await database.membership.upsert({ where: { userId_communityId: { userId: chairman.id, communityId: community.id } }, update: { role: 'chairman', approvedAt: new Date() }, create: { userId: chairman.id, communityId: community.id, role: 'chairman', approvedAt: new Date() } });
  const project = await database.project.upsert({
    where: { id: 'demo-central-road' },
    update: { streetId: street.id, responsible: 'Иван Егоров', priority: 'HIGH', fundingSource: 'Целевой сбор', problem: 'Разрушенное дорожное покрытие основного проезда.', expectedResult: 'Безопасный проезд с новым финишным покрытием.', startAt: new Date('2026-07-01'), deadline: new Date('2026-09-30'), beforePhotoUrl: 'https://placehold.co/1000x600?text=Road+Before' },
    create: { id: 'demo-central-road', communityId: community.id, streetId: street.id, title: 'Ремонт Центральной улицы', description: 'Восстанавливаем покрытие от въезда до перекрёстка с ул. Садовой.', problem: 'Разрушенное дорожное покрытие основного проезда.', expectedResult: 'Безопасный проезд с новым финишным покрытием.', category: 'Дороги', status: ProjectStatus.IN_PROGRESS, priority: 'HIGH', responsible: 'Иван Егоров', fundingSource: 'Целевой сбор', budget: 1280000, collected: 1280000, spent: 970000, progress: 72, startAt: new Date('2026-07-01'), deadline: new Date('2026-09-30'), beforePhotoUrl: 'https://placehold.co/1000x600?text=Road+Before' }
  });
  await database.projectUpdate.upsert({ where: { id: 'demo-road-update' }, update: { progress: 72 }, create: { id: 'demo-road-update', projectId: project.id, authorId: chairman.id, progress: 72, message: 'Уложен выравнивающий слой, подрядчик приступил к финишному покрытию.', photoUrl: 'https://placehold.co/1000x600?text=Road+Progress' } });
  await database.projectTask.upsert({ where: { id: 'demo-road-task-base' }, update: {}, create: { id: 'demo-road-task-base', projectId: project.id, title: 'Подготовить основание', responsible: 'Иван Егоров', status: 'DONE', dueAt: new Date('2026-08-10'), completedAt: new Date('2026-08-08') } });
  await database.projectTask.upsert({ where: { id: 'demo-road-task-finish' }, update: {}, create: { id: 'demo-road-task-finish', projectId: project.id, title: 'Уложить финишное покрытие', responsible: 'ООО «ДорСтрой»', status: 'IN_PROGRESS', dueAt: new Date('2026-09-20') } });
  await database.projectHistory.upsert({ where: { id: 'demo-road-history' }, update: {}, create: { id: 'demo-road-history', projectId: project.id, actorId: chairman.id, toStatus: 'IN_PROGRESS', comment: 'Работы начаты' } });
  await database.charge.upsert({ where: { id: 'demo-charge-august' }, update: {}, create: { id: 'demo-charge-august', communityId: community.id, userId: user.id, propertyId: property.id, amount: 3500, period: 'Август 2026', status: ChargeStatus.PAID } });
  await database.issue.upsert({ where: { communityId_number: { communityId: community.id, number: 1 } }, update: {}, create: { communityId: community.id, authorId: user.id, number: 1, title: 'Не работает фонарь', description: 'Темно возле поворота к участку.', address: 'ул. Калинина, участок 157', beforePhotoUrl: 'https://placehold.co/800x500?text=Before', history: { create: { actorId: user.id, toStatus: 'NEW', comment: 'Обращение создано' } } } });
  console.log('Demo resident: alexander@example.test / ChangeMe123!');
  console.log('Demo chairman: chairman@example.test / ChangeMe123!');
}

main().finally(() => database.$disconnect());
