# MushSoul PayTR + DHL Backend

Bu proje, Shopify tema içindeki **PayTR ile Öde** butonunu çalışan bir backend'e bağlamak için hazırlandı.

## Ne yapar?
- PayTR iFrame token alır
- Ödeme sayfasını döner
- PayTR callback doğrular
- Başarılı ödemede Shopify order oluşturur
- Ardından DHL shipment oluşturmayı dener
- DHL tracking numarasını Shopify fulfillment akışına bağlamayı dener

## Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

## Shopify cart tarafı

Shopify cart template içinde PayTR butonunu şu backend'e bağla:

```html
<form method="post" action="https://YOUR-BACKEND-DOMAIN.com/paytr/start">
  <input type="hidden" name="cart_token" value="{{ cart.token }}">
  <input type="hidden" name="cart_total" value="{{ cart.total_price }}">
  {% for item in cart.items %}
    <input type="hidden" name="items[{{ forloop.index0 }}][variant_id]" value="{{ item.variant.id }}">
    <input type="hidden" name="items[{{ forloop.index0 }}][title]" value="{{ item.product.title | escape }}">
    <input type="hidden" name="items[{{ forloop.index0 }}][quantity]" value="{{ item.quantity }}">
    <input type="hidden" name="items[{{ forloop.index0 }}][price]" value="{{ item.final_price }}">
  {% endfor %}
  <button type="submit">PayTR ile Öde</button>
</form>
```

## Endpointler
- `GET /health`
- `POST /paytr/start`
- `POST /paytr/callback`
- `GET /admin/orders`
- `GET /admin/orders/:merchantOid`
- `POST /admin/retry-ship/:merchantOid`

## Notlar
- Canlıya almak için gerçek PayTR, Shopify ve DHL bilgilerini `.env` içine girmelisin.
- `SHOPIFY_LOCATION_GID` fulfillment tracking için faydalı.
- Bu proje çalışan bir temel iskelet sağlar; canlı kullanımda DHL payload alanlarını hesabına göre netleştirmen gerekir.
