export class OrderInfoResDto {
  order: ShopOrderInfo;
}

export class ShopOrderInfo {
  id: number;
  id_address_delivery: string;
  id_address_invoice: string;
  id_cart: string;
  id_currency: string;
  id_lang: string;
  id_customer: string;
  id_carrier: string;
  current_state: string;
  module: string;
  invoice_number: string;
  invoice_date: string;
  delivery_date: string;
  date_add: string;
  date_upd: string;
  shipping_number: string;
  id_shop_group: string;
  id_shop: string;
  secure_key: string;
  payment: string;
  total_discounts: string;
  total_discounts_tax_incl: string;
  total_discounts_tax_excl: string;
  total_paid: string;
  total_paid_tax_incl: string;
  total_paid_tax_excl: string;
  total_paid_real: string;
  total_products: string;
  total_products_wt: string;
  total_shipping: string;
  total_shipping_tax_incl: string;
  total_shipping_tax_excl: string;
  carrier_tax_rate: string;
  total_wrapping: string;
  total_wrapping_tax_incl: string;
  total_wrapping_tax_excl: string;
  round_mode: string;
  round_type: string;
  conversion_rate: string;
  reference: string;
  associations: {
    order_rows: ShopOrderInfoRow[];
  };
}

class ShopOrderInfoRow {
  id: string;
  product_id: string;
  product_attribute_id: string;
  product_quantity: string;
  product_name: string;
  product_reference: string;
  product_ean13: string;
  product_isbn: string;
  product_upc: string;
  product_price: string;
  id_customization: string;
  unit_price_tax_incl: string;
  unit_price_tax_excl: string;
}
