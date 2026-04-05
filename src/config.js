function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT || 3001),
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
  paytr: {
    merchantId: process.env.PAYTR_MERCHANT_ID || '',
    merchantKey: process.env.PAYTR_MERCHANT_KEY || '',
    merchantSalt: process.env.PAYTR_MERCHANT_SALT || '',
    testMode: process.env.PAYTR_TEST_MODE || '1',
    debugOn: process.env.PAYTR_DEBUG_ON || '1',
    noInstallment: process.env.PAYTR_NO_INSTALLMENT || '0',
    maxInstallment: process.env.PAYTR_MAX_INSTALLMENT || '0',
    currency: process.env.PAYTR_CURRENCY || 'TL',
    timeoutLimit: process.env.PAYTR_TIMEOUT_LIMIT || '30'
  },
  shopify: {
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN || '',
    token: process.env.SHOPIFY_ADMIN_API_TOKEN || '',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2026-01',
    locationGid: process.env.SHOPIFY_LOCATION_GID || ''
  },
  dhl: {
    apiKey: process.env.DHL_API_KEY || '',
    accountNumber: process.env.DHL_ACCOUNT_NUMBER || '',
    baseUrl: process.env.DHL_BASE_URL || 'https://api.dhl.com',
    productCode: process.env.DHL_PRODUCT_CODE || 'P'
  },
  defaults: {
    countryCode: process.env.DEFAULT_COUNTRY_CODE || 'TR',
    phone: process.env.DEFAULT_PHONE || '05555555555'
  }
};

export const assertCoreConfig = () => {
  required('PAYTR_MERCHANT_ID');
  required('PAYTR_MERCHANT_KEY');
  required('PAYTR_MERCHANT_SALT');
  required('SHOPIFY_SHOP_DOMAIN');
  required('SHOPIFY_ADMIN_API_TOKEN');
};
