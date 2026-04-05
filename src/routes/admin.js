import express from 'express';
import { getOrder, listOrders, upsertOrder } from '../lib/storage.js';
import { createShipment } from '../lib/dhl.js';
export const adminRouter = express.Router();
adminRouter.get('/orders', (_req, res) => res.json({ ok: true, orders: listOrders() }));
adminRouter.get('/orders/:merchantOid', (req, res) => {
  const order = getOrder(req.params.merchantOid);
  if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
  res.json({ ok: true, order });
});
adminRouter.post('/retry-ship/:merchantOid', async (req, res, next) => {
  try {
    const order = getOrder(req.params.merchantOid);
    if (!order) return res.status(404).json({ ok: false, error: 'Order not found' });
    const dhl = await createShipment(order);
    upsertOrder({ merchantOid: order.merchantOid, dhlTrackingNumber: dhl.trackingNumber || '', dhlShipmentRaw: dhl.raw || null });
    res.json({ ok: true, trackingNumber: dhl.trackingNumber, raw: dhl.raw });
  } catch (error) { next(error); }
});
