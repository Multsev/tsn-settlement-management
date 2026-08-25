import { Router } from 'express';
import { audit } from '../audit.js';
import { database } from '../database.js';
import { publicMemberProfile } from '../services/public-profile.js';

export const listingsRouter = Router();
const listingInclude = { membership: { include: { user: { select: { fullName: true, email: true } }, properties: { select: { street: true } }, skills: { include: { skill: true } } } } };

function presentListing(listing) {
  return { ...listing, membership: undefined, author: publicMemberProfile(listing.membership) };
}

listingsRouter.get('/', async (request, response, next) => {
  try {
    const type = request.query.type;
    const listings = await database.listing.findMany({ where: { communityId: request.membership.communityId, status: 'ACTIVE', ...(type === 'OFFER' || type === 'REQUEST' ? { type } : {}) }, include: listingInclude, orderBy: { createdAt: 'desc' } });
    response.json(listings.map(presentListing));
  } catch (error) { next(error); }
});

listingsRouter.post('/', async (request, response, next) => {
  try {
    const { type, title, description, category } = request.body;
    if (!['OFFER', 'REQUEST'].includes(type) || !title || !description || !category) return response.status(400).json({ error: 'Укажите тип, название, описание и категорию объявления.' });
    const listing = await database.listing.create({ data: { communityId: request.membership.communityId, membershipId: request.membership.id, type, title, description, category }, include: listingInclude });
    await audit({ communityId: request.membership.communityId, actorId: request.membership.userId, action: 'created', entityType: 'Listing', entityId: listing.id, after: { type, title, category } });
    response.status(201).json(presentListing(listing));
  } catch (error) { next(error); }
});

listingsRouter.post('/:listingId/close', async (request, response, next) => {
  try {
    const listing = await database.listing.findFirst({ where: { id: request.params.listingId, communityId: request.membership.communityId } });
    if (!listing) return response.status(404).json({ error: 'Объявление не найдено.' });
    if (listing.membershipId !== request.membership.id && !['chairman', 'administrator'].includes(request.membership.role)) return response.status(403).json({ error: 'Закрыть можно только собственное объявление.' });
    response.json(await database.listing.update({ where: { id: listing.id }, data: { status: 'CLOSED' } }));
  } catch (error) { next(error); }
});
