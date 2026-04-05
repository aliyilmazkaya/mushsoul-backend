import crypto from 'crypto';
import { nanoid } from 'nanoid';
export function makeMerchantOid() { return `MS-${Date.now()}-${nanoid(8)}`; }
export function externalUserIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || '127.0.0.1';
}
export function paytrTokenHash({ merchantId, userIp, merchantOid, email, paymentAmount, userBasket, noInstallment, maxInstallment, currency, testMode, merchantSalt, merchantKey }) {
  const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
  return crypto.createHmac('sha256', merchantKey).update(hashStr + merchantSalt).digest('base64');
}
export function paytrCallbackHash({ merchantOid, status, totalAmount, merchantSalt, merchantKey }) {
  return crypto.createHmac('sha256', merchantKey).update(`${merchantOid}${merchantSalt}${status}${totalAmount}`).digest('base64');
}
export function formatBasketForPaytr(items) { return Buffer.from(JSON.stringify(items.map((item) => [item.title, Number(item.unitPrice).toFixed(2), Number(item.quantity)]))).toString('base64'); }
export function tryParseNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
export function centsToDecimalString(cents) { return (Number(cents) / 100).toFixed(2); }
