import { PrismaClient } from '@prisma/client';

// Delays opening the ORM until a database-backed endpoint is called.
// This keeps the liveness endpoint available during migration or maintenance.
let client;
function getClient() {
  client ??= new PrismaClient();
  return client;
}

export const database = new Proxy({}, {
  get(_target, property) {
    const value = getClient()[property];
    return typeof value === 'function' ? value.bind(getClient()) : value;
  }
});
