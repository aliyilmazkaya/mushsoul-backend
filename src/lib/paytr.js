import axios from 'axios';
import { config } from '../config.js';
import { paytrTokenHash } from './utils.js';
export async function requestIframeToken(payload) {
  const token = paytrTokenHash({
    merchantId: config.paytr.merchantId,
    userIp: payload.user_ip,
    merchantOid: payload.merchant_oid,
    email: payload.email,
    paymentAmount: payload.payment_amount,
    userBasket: payload.user_basket,
    noInstallment: payload.no_installment,
    maxInstallment: payload.max_installment,
    currency: payload.currency,
    testMode: payload.test_mode,
    merchantSalt: config.paytr.merchantSalt,
    merchantKey: config.paytr.merchantKey
  });
  const form = new URLSearchParams({
    merchant_id: config.paytr.merchantId,
    user_ip: payload.user_ip,
    merchant_oid: payload.merchant_oid,
    email: payload.email,
    payment_amount: String(payload.payment_amount),
    paytr_token: token,
    user_basket: payload.user_basket,
    debug_on: payload.debug_on,
    no_installment: payload.no_installment,
    max_installment: payload.max_installment,
    user_name: payload.user_name,
    user_address: payload.user_address,
    user_phone: payload.user_phone,
    merchant_ok_url: payload.merchant_ok_url,
    merchant_fail_url: payload.merchant_fail_url,
    timeout_limit: payload.timeout_limit,
    currency: payload.currency,
    test_mode: payload.test_mode,
    lang: payload.lang || 'tr'
  });
  const { data } = await axios.post('https://www.paytr.com/odeme/api/get-token', form.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!data || data.status !== 'success' || !data.token) throw new Error(`PayTR token error: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  return data.token;
}
