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
  const property = await database.property.upsert({
    where: { communityId_number: { communityId: community.id, number: '157' } },
    update: {}, create: { communityId: community.id, membershipId: membership.id, number: '157', street: 'ул. Калинина' }
  });
  const project = await database.project.upsert({
    where: { id: 'demo-central-road' },
    update: {},
    create: { id: 'demo-central-road', communityId: community.id, title: 'Ремонт Центральной улицы', description: 'Восстанавливаем покрытие от въезда до перекрёстка с ул. Садовой.', category: 'Дороги', status: ProjectStatus.IN_PROGRESS, budget: 1280000, collected: 1280000, spent: 970000, progress: 72 }
  });
  await database.projectUpdate.upsert({ where: { id: 'demo-road-update' }, update: {}, create: { id: 'demo-road-update', projectId: project.id, message: 'Уложен выравнивающий слой, подрядчик приступил к финишному покрытию.' } });
  await database.charge.upsert({ where: { id: 'demo-charge-august' }, update: {}, create: { id: 'demo-charge-august', communityId: community.id, userId: user.id, propertyId: property.id, amount: 3500, period: 'Август 2026', status: ChargeStatus.PAID } });
  console.log('Demo user: alexander@example.test / ChangeMe123!');
}

main().finally(() => database.$disconnect());
