import fs from 'fs';
import path from 'path';
const dbPath = path.join(process.cwd(), 'data', 'orders.json');
function ensureDb() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ orders: [] }, null, 2), 'utf8');
}
export function readDb() { ensureDb(); return JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
export function writeDb(db) { ensureDb(); fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8'); }
export function upsertOrder(order) {
  const db = readDb();
  const idx = db.orders.findIndex((x) => x.merchantOid === order.merchantOid);
  if (idx >= 0) db.orders[idx] = { ...db.orders[idx], ...order, updatedAt: new Date().toISOString() };
  else db.orders.push({ ...order, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  writeDb(db); return order;
}
export function getOrder(merchantOid) { const db = readDb(); return db.orders.find((x) => x.merchantOid === merchantOid) || null; }
export function listOrders() { const db = readDb(); return db.orders.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); }
