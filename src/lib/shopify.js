import axios from 'axios';
import { config } from '../config.js';
function shopifyClient() {
  return axios.create({
    baseURL: `https://${config.shopify.shopDomain}/admin/api/${config.shopify.apiVersion}/graphql.json`,
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': config.shopify.token }
  });
}
function variantGidFromNumeric(id) { return String(id).startsWith('gid://') ? id : `gid://shopify/ProductVariant/${id}`; }
export async function createPaidOrderFromPending(orderRecord) {
  const client = shopifyClient();
  const lineItems = orderRecord.items.map((item) => ({ variantId: variantGidFromNumeric(item.variantId), quantity: Number(item.quantity) }));
  const mutation = `mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) { orderCreate(order: $order, options: $options) { order { id name displayFinancialStatus displayFulfillmentStatus } userErrors { field message } } }`;
  const variables = {
    order: {
      email: orderRecord.customer.email,
      phone: orderRecord.customer.phone,
      currency: config.paytr.currency,
      shippingAddress: { firstName: orderRecord.customer.fullName, address1: orderRecord.customer.address1, city: orderRecord.customer.city, countryCode: orderRecord.customer.countryCode || config.defaults.countryCode, zip: orderRecord.customer.zip || '' },
      billingAddress: { firstName: orderRecord.customer.fullName, address1: orderRecord.customer.address1, city: orderRecord.customer.city, countryCode: orderRecord.customer.countryCode || config.defaults.countryCode, zip: orderRecord.customer.zip || '' },
      lineItems,
      transactions: [{ kind: 'SALE', status: 'SUCCESS', amountSet: { shopMoney: { amount: (Number(orderRecord.totalAmount) / 100).toFixed(2), currencyCode: config.paytr.currency } } }],
      note: `Created by PayTR callback. Merchant OID: ${orderRecord.merchantOid}`,
      tags: ['paytr', 'external-checkout', 'mushsoul']
    },
    options: { inventoryBehavior: 'BYPASS', sendReceipt: false, sendFulfillmentReceipt: false }
  };
  const { data } = await client.post('', { query: mutation, variables });
  const payload = data?.data?.orderCreate;
  if (!payload) throw new Error(`Shopify orderCreate missing payload: ${JSON.stringify(data)}`);
  if (payload.userErrors?.length) throw new Error(`Shopify orderCreate userErrors: ${JSON.stringify(payload.userErrors)}`);
  return payload.order;
}
export async function attachTracking(orderGid, trackingNumber) {
  if (!config.shopify.locationGid) return { skipped: true, reason: 'SHOPIFY_LOCATION_GID not set' };
  const client = shopifyClient();
  const query = `query getOrderFulfillmentOrders($id: ID!) { order(id: $id) { fulfillmentOrders(first: 10) { nodes { id status } } } }`;
  const qRes = await client.post('', { query, variables: { id: orderGid } });
  const fos = qRes.data?.data?.order?.fulfillmentOrders?.nodes || [];
  if (!fos.length) return { skipped: true, reason: 'No fulfillment order found' };
  const mutation = `mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) { fulfillmentCreateV2(fulfillment: $fulfillment) { fulfillment { id status } userErrors { field message } } }`;
  const variables = { fulfillment: { notifyCustomer: false, lineItemsByFulfillmentOrder: [{ fulfillmentOrderId: fos[0].id }], trackingInfo: { company: 'DHL', number: trackingNumber, url: `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${encodeURIComponent(trackingNumber)}` } } };
  const { data } = await client.post('', { query: mutation, variables });
  const payload = data?.data?.fulfillmentCreateV2;
  if (!payload) return { skipped: true, reason: 'No fulfillmentCreateV2 payload' };
  if (payload.userErrors?.length) return { skipped: true, reason: JSON.stringify(payload.userErrors) };
  return payload.fulfillment;
}
