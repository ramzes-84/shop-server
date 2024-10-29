export class AddressInfoResDto {
  address: AddressInfo;
}

class AddressInfo {
  id: number;
  id_customer: string;
  id_country: string;
  id_state: string;
  alias: string;
  lastname: string;
  firstname: string;
  address1: string;
  postcode: string;
  city: string;
  phone: string;
  phone_mobile: string;
  date_add: string;
  date_upd: string;
}
