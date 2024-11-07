export class CustomerInfoResDto {
  customer: CustomerInfo;
}

class CustomerInfo {
  id: number;
  id_default_group: string;
  id_lang: string;
  newsletter_date_add: string;
  last_passwd_gen: string;
  secure_key: string;
  passwd: string;
  lastname: string;
  firstname: string;
  email: string;
  id_gender: string;
  birthday: string;
  outstanding_allow_amount: string;
  active: string;
  id_shop: string;
  id_shop_group: string;
  date_add: string;
  date_upd: string;
  reset_password_validity: string;
  associations: {
    groups: [
      {
        id: string;
      },
    ];
  };
}
