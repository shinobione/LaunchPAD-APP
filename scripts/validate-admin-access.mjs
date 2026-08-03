import { resolveAdminAccess } from '../js/features/admin-access.js';

const values = new Map();
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key)
};

if (!resolveAdminAccess({ search: '?admin=1', storage, desktop: true })) throw new Error('Desktop activation failed.');
if (!resolveAdminAccess({ search: '', storage, desktop: true })) throw new Error('Admin activation did not persist.');
if (resolveAdminAccess({ search: '', storage, desktop: false })) throw new Error('Admin access leaked outside desktop.');
if (resolveAdminAccess({ search: '?admin=0', storage, desktop: true })) throw new Error('Admin opt-out failed.');
if (resolveAdminAccess({ search: '', storage, desktop: true })) throw new Error('Admin access leaked to ordinary visitors.');

console.log('Desktop-only persistent Track Manager access is covered.');

