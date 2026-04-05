import axios from 'axios';
import { config } from '../config.js';
export async function createShipment(orderRecord) {
  if (!config.dhl.apiKey || !config.dhl.accountNumber) throw new Error('Missing DHL credentials');
  const totalWeight = Math.max(0.5, orderRecord.items.reduce((sum, item) => sum + Number(item.weightKg || 0.5) * Number(item.quantity), 0));
  const payload = {
    plannedShippingDateAndTime: new Date().toISOString(),
    pickup: { isRequested: false },
    productCode: config.dhl.productCode,
    accounts: [{ typeCode: 'shipper', number: config.dhl.accountNumber }],
    customerDetails: {
      shipperDetails: {
        postalAddress: { postalCode: '34718', cityName: 'Istanbul', countryCode: 'TR', addressLine1: 'Istanbul' },
        contactInformation: { fullName: 'MushSoul', companyName: 'MushSoul', phone: config.defaults.phone, email: orderRecord.customer.email }
      },
      receiverDetails: {
        postalAddress: { postalCode: orderRecord.customer.zip || '34000', cityName: orderRecord.customer.city || 'Istanbul', countryCode: orderRecord.customer.countryCode || config.defaults.countryCode, addressLine1: orderRecord.customer.address1 },
        contactInformation: { fullName: orderRecord.customer.fullName, phone: orderRecord.customer.phone, email: orderRecord.customer.email }
      }
    },
    content: {
      packages: [{ weight: totalWeight, dimensions: { length: 20, width: 20, height: 20 } }],
      isCustomsDeclarable: false,
      description: orderRecord.items.map((i) => i.title).join(', ')
    },
    outputImageProperties: { imageOptions: [{ typeCode: 'label', templateName: 'ECOM26_84_A4_001' }] }
  };
  const { data } = await axios.post(`${config.dhl.baseUrl}/shipments`, payload, { headers: { 'DHL-API-Key': config.dhl.apiKey, 'Content-Type': 'application/json' } });
  const trackingNumber = data?.shipmentTrackingNumber || data?.packages?.[0]?.trackingNumber || data?.documents?.[0]?.shipmentTrackingNumber || null;
  return { raw: data, trackingNumber };
}
