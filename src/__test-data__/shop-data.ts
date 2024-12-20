import { OrderInfoResDto } from 'src/shop/dto/order-info.dto';
import { AddressInfoResDto } from 'src/shop/dto/address-info.dto';
import { CustomerInfoResDto } from 'src/shop/dto/customer-info.dto';
import { OrderCarrierInfoResDto } from 'src/shop/dto/order-carrier-info.dto';
import { StatusesInfoResDto } from 'src/shop/dto/statuses-info.dto';
import { InTransitOrders } from 'src/shop/dto/in-transit-orders.dto';

export const orderDetails: OrderInfoResDto['order'] = {
  id: 19979,
  id_address_delivery: '111005',
  id_address_invoice: '111005',
  id_cart: '208319',
  id_currency: '1',
  id_lang: '2',
  id_customer: '6190',
  id_carrier: '514',
  current_state: '13',
  module: 'ps_checkpayment',
  invoice_number: '1313',
  invoice_date: '2024-10-26 09:58:17',
  delivery_date: '0000-00-00 00:00:00',
  date_add: '2024-10-26 09:58:16',
  date_upd: '2024-10-26 17:36:28',
  shipping_number: '00000000-0000-48ba-b85f-17db26a69905',
  id_shop_group: '1',
  id_shop: '1',
  secure_key: '0000000000000000000',
  payment: 'Выставить счёт в SMS',
  total_discounts: '326.500000',
  total_discounts_tax_incl: '326.500000',
  total_discounts_tax_excl: '326.500000',
  total_paid: '2603.470000',
  total_paid_tax_incl: '2603.470000',
  total_paid_tax_excl: '2603.470000',
  total_paid_real: '2603.470000',
  total_products: '2729.970000',
  total_products_wt: '2729.970000',
  total_shipping: '200.000000',
  total_shipping_tax_incl: '200.000000',
  total_shipping_tax_excl: '200.000000',
  carrier_tax_rate: '0.000',
  total_wrapping: '0.000000',
  total_wrapping_tax_incl: '0.000000',
  total_wrapping_tax_excl: '0.000000',
  round_mode: '2',
  round_type: '2',
  conversion_rate: '1.000000',
  reference: 'TESTREFERENCE',
  associations: {
    order_rows: [
      {
        id: '103229',
        product_id: '413',
        product_attribute_id: '1411',
        product_quantity: '1',
        product_name: 'Основа',
        product_reference: '000001',
        product_ean13: '',
        product_isbn: '',
        product_upc: '',
        product_price: '1349.990000',
        id_customization: '0',
        unit_price_tax_incl: '1349.990000',
        unit_price_tax_excl: '1349.990000',
      },
      {
        id: '103230',
        product_id: '869',
        product_attribute_id: '3684',
        product_quantity: '1',
        product_name: 'Румяна',
        product_reference: '000002',
        product_ean13: '',
        product_isbn: '',
        product_upc: '',
        product_price: '579.990000',
        id_customization: '0',
        unit_price_tax_incl: '579.990000',
        unit_price_tax_excl: '579.990000',
      },
      {
        id: '103231',
        product_id: '811',
        product_attribute_id: '3465',
        product_quantity: '1',
        product_name: 'Пудра',
        product_reference: '000003',
        product_ean13: '',
        product_isbn: '',
        product_upc: '',
        product_price: '799.990000',
        id_customization: '0',
        unit_price_tax_incl: '799.990000',
        unit_price_tax_excl: '799.990000',
      },
    ],
  },
};

export const addressDetails: AddressInfoResDto['address'] = {
  id: 111005,
  id_customer: '6190',
  id_country: '175',
  id_state: '324',
  alias: 'Мой адрес',
  lastname: 'John',
  firstname: 'Doe',
  address1: 'Чапаевский переулок',
  postcode: '125252',
  city: 'Москва',
  phone: '00000000000',
  phone_mobile: '00000000000',
  date_add: '2020-05-16 02:23:16',
  date_upd: '2020-05-16 02:23:16',
};

export const customerDetails: CustomerInfoResDto['customer'] = {
  id: 6190,
  id_default_group: '3',
  id_lang: '2',
  newsletter_date_add: '0000-00-00 00:00:00',
  last_passwd_gen: '2024-10-26 09:53:48',
  secure_key: '0000000000000000000',
  passwd: '00000000000000000000',
  lastname: 'John',
  firstname: 'Doe',
  email: 'test@test.com',
  id_gender: '2',
  birthday: '0000-00-00',
  outstanding_allow_amount: '0.000000',
  active: '1',
  id_shop: '1',
  id_shop_group: '1',
  date_add: '2020-05-16 02:22:02',
  date_upd: '2024-10-26 09:53:48',
  reset_password_validity: '0000-00-00 00:00:00',
  associations: {
    groups: [
      {
        id: '3',
      },
    ],
  },
};

export const shippingDetails: OrderCarrierInfoResDto = {
  order_carriers: [
    {
      id: 19984,
      id_order: '19979',
      id_carrier: '514',
      id_order_invoice: '19964',
      weight: '0.073000',
      shipping_cost_tax_excl: '200.000000',
      shipping_cost_tax_incl: '200.000000',
      tracking_number: '00000000-0000-48ba-b85f-17db26a69905',
      date_add: '2024-10-26 09:58:16',
    },
  ],
};

export const statusesDetails: StatusesInfoResDto['order_histories'] = [
  {
    id_order_state: '908',
  },
  {
    id_order_state: '4',
  },
  {
    id_order_state: '13',
  },
  {
    id_order_state: '3',
  },
  {
    id_order_state: '2',
  },
  {
    id_order_state: '1',
  },
];

export const inTransitOrders: InTransitOrders['orders'] = [
  {
    id: 1,
    current_state: '4',
    reference: '0001',
    date_upd: '2024-10-26 17:36:28',
    shipping_number: '00000000-0000-48ba-b85f-17db26a69905',
  },
  {
    id: 2,
    current_state: '4',
    reference: '0002',
    date_upd: '2024-10-26 17:36:28',
    shipping_number: '00000000-0000-48ba-b85f-17db26a69905',
  },
  {
    id: 3,
    current_state: '908',
    reference: '0003',
    date_upd: '2024-10-26 17:36:28',
    shipping_number: '00000000-0000-48ba-b85f-17db26a69905',
  },
  {
    id: 4,
    current_state: '908',
    reference: '0004',
    date_upd: '2024-10-26 17:36:28',
    shipping_number: '00000000-0000-48ba-b85f-17db26a69905',
  },
];
