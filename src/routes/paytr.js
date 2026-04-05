import express from 'express';
import { config, assertCoreConfig } from '../config.js';
import { requestIframeToken } from '../lib/paytr.js';
import { upsertOrder, getOrder } from '../lib/storage.js';
import { centsToDecimalString, externalUserIp, formatBasketForPaytr, makeMerchantOid, paytrCallbackHash, tryParseNumber } from '../lib/utils.js';
import { createPaidOrderFromPending, attachTracking } from '../lib/shopify.js';
import { createShipment } from '../lib/dhl.js';
export const paytrRouter = express.Router();
function collectItems(body) {
  const raw = body.items;
  if (Array.isArray(raw)) return raw.map(normalizeItem).filter(Boolean);
  const items = []; let i = 0;
  while (body[`items[${i}][title]`] || body[`items[${i}][variant_id]`]) {
    items.push(normalizeItem({ title: body[`items[${i}][title]`], variantId: body[`items[${i}][variant_id]`], quantity: body[`items[${i}][quantity]`], unitPrice: body[`items[${i}][price]`] }));
    i += 1;
  }
  return items.filter(Boolean);
}
function normalizeItem(item) { if (!item) return null; return { title: item.title || 'Ürün', variantId: item.variantId || item.variant_id, quantity: tryParseNumber(item.quantity, 1), unitPrice: tryParseNumber(item.unitPrice || item.price, 0), weightKg: tryParseNumber(item.weightKg || item.weight_kg, 0.5) }; }
function renderCustomerForm(initial) {
  return `<html lang="tr"><head><meta charset="utf-8" /><title>Ödeme Bilgileri</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:30px auto;padding:0 16px;line-height:1.5}label{display:block;margin:12px 0 6px}input,textarea{width:100%;min-height:44px;padding:10px 12px;border:1px solid #d8d8d8;border-radius:10px}button{margin-top:18px;background:#6f4e37;color:#fff;border:0;border-radius:999px;padding:14px 20px;cursor:pointer}.box{background:#fff;padding:22px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.06)}</style></head><body><div class="box"><h1>Ödeme Bilgileri</h1><p>PayTR ödeme ekranı için müşteri bilgileri gerekiyor.</p><form method="post" action="/paytr/start"><input type="hidden" name="cart_token" value="${initial.cartToken || ''}"><input type="hidden" name="cart_total" value="${initial.cartTotal || ''}"><input type="hidden" name="items_json" value='${JSON.stringify(initial.items || []).replace(/'/g, '&#39;')}'><label>Ad Soyad</label><input name="full_name" required><label>E-posta</label><input name="email" type="email" required><label>Telefon</label><input name="phone" required><label>Adres</label><textarea name="address1" required></textarea><label>Şehir</label><input name="city" required><label>Posta Kodu</label><input name="zip"><button type="submit">PayTR Ödeme Ekranına Geç</button></form></div></body></html>`;
}
paytrRouter.post('/start', async (req, res, next) => {
  try {
    assertCoreConfig();
    const items = req.body.items_json ? JSON.parse(req.body.items_json) : collectItems(req.body);
    const cartTotal = tryParseNumber(req.body.cart_total, items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0));
    const customer = { fullName: req.body.full_name || '', email: req.body.email || '', phone: req.body.phone || '', address1: req.body.address1 || '', city: req.body.city || '', zip: req.body.zip || '', countryCode: req.body.country_code || config.defaults.countryCode };
    if (!customer.fullName || !customer.email || !customer.phone || !customer.address1 || !customer.city) { res.type('html').send(renderCustomerForm({ cartToken: req.body.cart_token || '', cartTotal, items })); return; }
    const merchantOid = makeMerchantOid();
    const paymentAmount = Math.round(cartTotal);
    const userBasket = formatBasketForPaytr(items.map((item) => ({ title: item.title, unitPrice: Number(item.unitPrice) / 100, quantity: item.quantity })));
    upsertOrder({ merchantOid, cartToken: req.body.cart_token || '', totalAmount: paymentAmount, currency: config.paytr.currency, status: 'pending', items, customer });
    const iframeToken = await requestIframeToken({ user_ip: externalUserIp(req), merchant_oid: merchantOid, email: customer.email, payment_amount: String(paymentAmount), user_basket: userBasket, debug_on: config.paytr.debugOn, no_installment: config.paytr.noInstallment, max_installment: config.paytr.maxInstallment, user_name: customer.fullName, user_address: customer.address1, user_phone: customer.phone, merchant_ok_url: `${config.baseUrl}/paytr/ok?merchant_oid=${encodeURIComponent(merchantOid)}`, merchant_fail_url: `${config.baseUrl}/paytr/fail?merchant_oid=${encodeURIComponent(merchantOid)}`, timeout_limit: config.paytr.timeoutLimit, currency: config.paytr.currency, test_mode: config.paytr.testMode, lang: 'tr' });
    res.type('html').send(`<html lang="tr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>PayTR Ödeme</title><style>body{font-family:Arial,sans-serif;max-width:960px;margin:30px auto;padding:0 16px}.card{background:#fff;padding:22px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,.06)}</style><script src="https://www.paytr.com/js/iframeResizer.min.js"></script></head><body><div class="card"><h1>Ödeme</h1><p>Tutar: ₺${centsToDecimalString(paymentAmount)}</p><iframe src="https://www.paytr.com/odeme/guvenli/${iframeToken}" id="paytriframe" frameborder="0" scrolling="no" style="width:100%;min-height:600px;"></iframe><script>iFrameResize({}, '#paytriframe');</script></div></body></html>`);
  } catch (error) { next(error); }
});
paytrRouter.get('/ok', (_req, res) => res.type('html').send('<h1>Ödeme işleniyor</h1><p>Kesin sonuç callback ile işlenir.</p>'));
paytrRouter.get('/fail', (_req, res) => res.type('html').send('<h1>Ödeme tamamlanmadı</h1><p>Lütfen tekrar deneyin.</p>'));
paytrRouter.post('/callback', async (req, res) => {
  try {
    const post = req.body;
    const expectedHash = paytrCallbackHash({ merchantOid: post.merchant_oid, status: post.status, totalAmount: post.total_amount, merchantSalt: config.paytr.merchantSalt, merchantKey: config.paytr.merchantKey });
    if (expectedHash !== post.hash) return res.status(400).send('PAYTR notification failed: bad hash');
    const existing = getOrder(post.merchant_oid);
    if (!existing) return res.status(404).send('Order not found');
    if (existing.status === 'paid' || existing.status === 'completed') return res.type('text/plain').send('OK');
    if (post.status !== 'success') { upsertOrder({ merchantOid: post.merchant_oid, status: 'payment_failed', paytrStatus: post.status, failedReasonCode: post.failed_reason_code || '', failedReasonMessage: post.failed_reason_msg || '' }); return res.type('text/plain').send('OK'); }
    let shopifyOrder = null, dhlShipment = null, trackingNumber = null, fulfillment = null;
    shopifyOrder = await createPaidOrderFromPending(existing);
    try { dhlShipment = await createShipment(existing); trackingNumber = dhlShipment.trackingNumber || null; } catch (e) { console.error('DHL error:', e.message); }
    if (shopifyOrder?.id && trackingNumber) { try { fulfillment = await attachTracking(shopifyOrder.id, trackingNumber); } catch (e) { console.error('Fulfillment attach error:', e.message); } }
    upsertOrder({ merchantOid: post.merchant_oid, status: 'paid', paytrStatus: post.status, paidTotalAmount: Number(post.total_amount), paymentType: post.payment_type || '', shopifyOrderId: shopifyOrder?.id || '', shopifyOrderName: shopifyOrder?.name || '', dhlTrackingNumber: trackingNumber || '', dhlShipmentRaw: dhlShipment?.raw || null, fulfillmentResult: fulfillment || null });
    res.type('text/plain').send('OK');
  } catch (error) {
    console.error('PayTR callback error:', error);
    res.status(500).send('Callback processing error');
  }
});
