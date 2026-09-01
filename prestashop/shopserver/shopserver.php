<?php
/**
 * Интеграция админки PrestaShop с сервисом доставки shop-server.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once __DIR__ . '/src/ShopServerJwtSigner.php';

class ShopServer extends Module
{
    public const CONF_SECRET = 'SHOPSERVER_JWT_SECRET';
    public const CONF_API_URL = 'SHOPSERVER_API_URL';
    public const CONF_TOKEN_TTL = 'SHOPSERVER_TOKEN_TTL';
    public const CONF_CRON_KEY = 'SHOPSERVER_CRON_KEY';
    public const CONF_CARRIER_YANDEX = 'SHOPSERVER_CARRIER_YANDEX';
    public const CONF_CARRIER_FIVEPOST = 'SHOPSERVER_CARRIER_FIVEPOST';
    public const CONF_CARRIER_POST = 'SHOPSERVER_CARRIER_POST';
    public const CONF_CARRIER_DPD = 'SHOPSERVER_CARRIER_DPD';
    public const CONF_FIVEPOST_KEY = 'SHOPSERVER_FIVEPOST_KEY';
    public const CONF_DPD_SID = 'SHOPSERVER_DPD_SID';
    public const CONF_POCHTA_WIDGET_ID = 'SHOPSERVER_POCHTA_WIDGET_ID';

    private const DEFAULT_TOKEN_TTL = 7200;
    private const MIN_TOKEN_TTL = 300;
    private const MAX_TOKEN_TTL = 43200;

    public function __construct()
    {
        $this->name = 'shopserver';
        $this->tab = 'shipping_logistics';
        $this->version = '1.3.1';
        $this->author = 'Mineral Magic';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = ['min' => '8.0.0', 'max' => _PS_VERSION_];
        $this->bootstrap = true;

        parent::__construct();

        $this->displayName = 'Shop Server';
        $this->description = 'Кнопки создания счёта и отправки на странице заказа, авторизованные подписанным токеном.';
        $this->confirmUninstall = 'Токен подписи будет удалён. Продолжить?';
    }

    public function install(): bool
    {
        return parent::install()
            && $this->registerHook('displayAdminOrderTop')
            && $this->registerHook('actionFrontControllerSetMedia')
            && Configuration::updateValue(self::CONF_SECRET, $this->generateSecret())
            && Configuration::updateValue(self::CONF_API_URL, '')
            && Configuration::updateValue(self::CONF_TOKEN_TTL, self::DEFAULT_TOKEN_TTL)
            && Configuration::updateValue(self::CONF_CRON_KEY, $this->generateSecret())
            && Configuration::updateValue(self::CONF_CARRIER_YANDEX, 0)
            && Configuration::updateValue(self::CONF_CARRIER_FIVEPOST, 0)
            && Configuration::updateValue(self::CONF_CARRIER_POST, 0)
            && Configuration::updateValue(self::CONF_CARRIER_DPD, 0)
            && Configuration::updateValue(self::CONF_FIVEPOST_KEY, '')
            && Configuration::updateValue(self::CONF_DPD_SID, '')
            && Configuration::updateValue(self::CONF_POCHTA_WIDGET_ID, '');
    }

    public function uninstall(): bool
    {
        foreach ($this->configurationKeys() as $key) {
            Configuration::deleteByName($key);
        }

        return parent::uninstall();
    }

    /**
     * Рендерит панель действий на странице заказа и отдаёт скрипту свежий токен.
     */
    public function hookDisplayAdminOrderTop(array $params): string
    {
        $order = new Order((int) ($params['id_order'] ?? 0));

        if (!Validate::isLoadedObject($order)) {
            return '';
        }

        $apiUrl = (string) Configuration::get(self::CONF_API_URL);
        $secret = (string) Configuration::get(self::CONF_SECRET);

        if ($apiUrl === '' || $secret === '') {
            return '';
        }

        $employee = $this->context->employee;

        if (!Validate::isLoadedObject($employee)) {
            return '';
        }

        $token = ShopServerJwtSigner::issueForEmployee(
            (int) $employee->id,
            (string) $employee->email,
            $this->tokenTtl(),
            $secret
        );

        $config = [
            'apiUrl' => rtrim($apiUrl, '/'),
            'token' => $token,
            'orderId' => (string) $order->id,
            'carrier' => $this->resolveCarrierType($order),
            'fivePostKey' => (string) Configuration::get(self::CONF_FIVEPOST_KEY),
        ];

        $this->context->smarty->assign([
            'shopserver_carrier' => $config['carrier'],
            'shopserver_config' => json_encode(
                $config,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE
            ),
            'shopserver_script_url' => $this->_path . 'views/js/backend.js?v=' . $this->version,
            'shopserver_style_url' => $this->_path . 'views/css/backend.css?v=' . $this->version,
        ]);

        return $this->display(__FILE__, 'views/templates/admin/order_actions.tpl');
    }

    /**
     * Подключает виджеты ПВЗ на шаге доставки в оформлении заказа.
     */
    public function hookActionFrontControllerSetMedia(): void
    {
        if ($this->context->controller->php_self !== 'order') {
            return;
        }

        $carriers = $this->frontCarrierMap();

        if (!$carriers) {
            return;
        }

        Media::addJsDef(['shopServerFront' => [
            'carriers' => $carriers,
            'fivePostKey' => (string) Configuration::get(self::CONF_FIVEPOST_KEY),
            'dpdSid' => (string) Configuration::get(self::CONF_DPD_SID),
            'pochtaWidgetId' => (string) Configuration::get(self::CONF_POCHTA_WIDGET_ID),
        ]]);

        $this->context->controller->registerStylesheet(
            'shopserver-front',
            'modules/' . $this->name . '/views/css/front.css',
            ['media' => 'all', 'priority' => 150, 'version' => $this->version]
        );

        $this->context->controller->registerJavascript(
            'shopserver-front',
            'modules/' . $this->name . '/views/js/front.js',
            ['position' => 'bottom', 'priority' => 150, 'version' => $this->version]
        );
    }

    public function getContent(): string
    {
        $output = '';

        if (Tools::isSubmit('submitShopServerRegenerate')) {
            Configuration::updateValue(self::CONF_SECRET, $this->generateSecret());
            $output .= $this->displayConfirmation(
                'Секрет перевыпущен. Скопируйте новое значение в переменную SHOPSERVER_JWT_SECRET на сервере — до этого запросы будут отклоняться.'
            );
        }

        if (Tools::isSubmit('submitShopServerRegenerateCronKey')) {
            Configuration::updateValue(self::CONF_CRON_KEY, $this->generateSecret());
            $output .= $this->displayConfirmation(
                'Ключ CRON перевыпущен. Обновите заголовок X-ShopServer-Cron-Key в сервисе расписания.'
            );
        }

        if (Tools::isSubmit('submitShopServerSettings')) {
            $output .= $this->saveSettings();
        }

        return $output . $this->renderForm();
    }

    private function saveSettings(): string
    {
        $apiUrl = trim((string) Tools::getValue(self::CONF_API_URL));

        if ($apiUrl !== '' && !preg_match('#^https://#i', $apiUrl)) {
            return $this->displayError('Адрес сервера должен начинаться с https://');
        }

        if ($apiUrl !== '' && !Validate::isUrl($apiUrl)) {
            return $this->displayError('Адрес сервера указан некорректно.');
        }

        $ttl = (int) Tools::getValue(self::CONF_TOKEN_TTL);

        if ($ttl < self::MIN_TOKEN_TTL || $ttl > self::MAX_TOKEN_TTL) {
            return $this->displayError(sprintf(
                'Время жизни токена должно быть от %d до %d секунд.',
                self::MIN_TOKEN_TTL,
                self::MAX_TOKEN_TTL
            ));
        }

        Configuration::updateValue(self::CONF_API_URL, rtrim($apiUrl, '/'));
        Configuration::updateValue(self::CONF_TOKEN_TTL, $ttl);
        Configuration::updateValue(self::CONF_CARRIER_YANDEX, (int) Tools::getValue(self::CONF_CARRIER_YANDEX));
        Configuration::updateValue(self::CONF_CARRIER_FIVEPOST, (int) Tools::getValue(self::CONF_CARRIER_FIVEPOST));
        Configuration::updateValue(self::CONF_CARRIER_POST, (int) Tools::getValue(self::CONF_CARRIER_POST));
        Configuration::updateValue(self::CONF_CARRIER_DPD, (int) Tools::getValue(self::CONF_CARRIER_DPD));
        Configuration::updateValue(self::CONF_FIVEPOST_KEY, trim((string) Tools::getValue(self::CONF_FIVEPOST_KEY)));
        Configuration::updateValue(self::CONF_DPD_SID, trim((string) Tools::getValue(self::CONF_DPD_SID)));
        Configuration::updateValue(self::CONF_POCHTA_WIDGET_ID, trim((string) Tools::getValue(self::CONF_POCHTA_WIDGET_ID)));

        return $this->displayConfirmation('Настройки сохранены.');
    }

    private function renderForm(): string
    {
        $carrierOptions = $this->carrierOptions();

        $fields = [
            'form' => [
                'legend' => ['title' => 'Настройки', 'icon' => 'icon-cogs'],
                'input' => [
                    [
                        'type' => 'text',
                        'label' => 'Ключ CRON',
                        'name' => 'SHOPSERVER_CRON_KEY_READONLY',
                        'readonly' => true,
                        'desc' => 'CRON вызывает POST /module/shopserver/cron с этим значением в заголовке X-ShopServer-Cron-Key.',
                    ],
                    [
                        'type' => 'text',
                        'label' => 'Адрес сервера',
                        'name' => self::CONF_API_URL,
                        'desc' => 'Например: https://shop-server-4y1m.onrender.com',
                        'required' => true,
                    ],
                    [
                        'type' => 'submit',
                        'title' => 'Перевыпустить ключ CRON',
                        'name' => 'submitShopServerRegenerateCronKey',
                        'icon' => 'process-icon-refresh',
                        'class' => 'btn btn-default pull-right',
                    ],
                    [
                        'type' => 'text',
                        'label' => 'Время жизни токена, сек',
                        'name' => self::CONF_TOKEN_TTL,
                        'desc' => 'Токен выдаётся при открытии страницы заказа. По истечении сотруднику нужно обновить страницу.',
                        'required' => true,
                    ],
                    [
                        'type' => 'select',
                        'label' => 'Перевозчик Яндекс.Доставка',
                        'name' => self::CONF_CARRIER_YANDEX,
                        'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name'],
                    ],
                    [
                        'type' => 'select',
                        'label' => 'Перевозчик 5Post',
                        'name' => self::CONF_CARRIER_FIVEPOST,
                        'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name'],
                    ],
                    [
                        'type' => 'select',
                        'label' => 'Перевозчик Почта России',
                        'name' => self::CONF_CARRIER_POST,
                        'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name'],
                    ],
                    [
                        'type' => 'select',
                        'label' => 'Перевозчик DPD',
                        'name' => self::CONF_CARRIER_DPD,
                        'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name'],
                    ],
                    [
                        'type' => 'text',
                        'label' => 'Ключ виджета 5Post',
                        'name' => self::CONF_FIVEPOST_KEY,
                        'desc' => 'Ключ попадает в браузер покупателя — используйте ключ, ограниченный доменом.',
                    ],
                    [
                        'type' => 'text',
                        'label' => 'SID чузера DPD',
                        'name' => self::CONF_DPD_SID,
                    ],
                    [
                        'type' => 'text',
                        'label' => 'ID виджета Почты России',
                        'name' => self::CONF_POCHTA_WIDGET_ID,
                    ],
                    [
                        'type' => 'text',
                        'label' => 'SHOPSERVER_JWT_SECRET',
                        'name' => 'SHOPSERVER_SECRET_READONLY',
                        'readonly' => true,
                        'desc' => 'Скопируйте это значение в переменную окружения сервера. Кнопка ниже выпускает новый секрет.',
                    ],
                ],
                'submit' => ['title' => 'Сохранить', 'name' => 'submitShopServerSettings'],
                'buttons' => [
                    [
                        'type' => 'submit',
                        'title' => 'Перевыпустить секрет',
                        'name' => 'submitShopServerRegenerate',
                        'icon' => 'process-icon-refresh',
                        'class' => 'btn btn-default pull-right',
                    ],
                ],
            ],
        ];

        $helper = new HelperForm();
        $helper->module = $this;
        $helper->identifier = $this->identifier;
        $helper->submit_action = 'submitShopServerSettings';
        $helper->token = Tools::getAdminTokenLite('AdminModules');
        $helper->currentIndex = AdminController::$currentIndex . '&' . http_build_query(['configure' => $this->name]);
        $helper->default_form_language = (int) Configuration::get('PS_LANG_DEFAULT');
        $helper->tpl_vars = [
            'fields_value' => [
                self::CONF_API_URL => Configuration::get(self::CONF_API_URL),
                self::CONF_TOKEN_TTL => $this->tokenTtl(),
                'SHOPSERVER_CRON_KEY_READONLY' => Configuration::get(self::CONF_CRON_KEY),
                self::CONF_CARRIER_YANDEX => (int) Configuration::get(self::CONF_CARRIER_YANDEX),
                self::CONF_CARRIER_FIVEPOST => (int) Configuration::get(self::CONF_CARRIER_FIVEPOST),
                self::CONF_CARRIER_POST => (int) Configuration::get(self::CONF_CARRIER_POST),
                self::CONF_CARRIER_DPD => (int) Configuration::get(self::CONF_CARRIER_DPD),
                self::CONF_FIVEPOST_KEY => Configuration::get(self::CONF_FIVEPOST_KEY),
                self::CONF_DPD_SID => Configuration::get(self::CONF_DPD_SID),
                self::CONF_POCHTA_WIDGET_ID => Configuration::get(self::CONF_POCHTA_WIDGET_ID),
                'SHOPSERVER_SECRET_READONLY' => Configuration::get(self::CONF_SECRET),
            ],
        ];

        return $helper->generateForm([$fields]);
    }

    /**
     * Перевозчики сопоставляются по id_reference: при редактировании PrestaShop
     * создаёт новую запись с новым id_carrier, а reference остаётся прежним.
     */
    private function carrierOptions(): array
    {
        $options = [['id' => 0, 'name' => '— не выбран —']];
        $seen = [];

        foreach (Carrier::getCarriers((int) $this->context->language->id, false, false, false, null, Carrier::ALL_CARRIERS) as $carrier) {
            $reference = (int) $carrier['id_reference'];

            if ($reference === 0 || isset($seen[$reference])) {
                continue;
            }

            $seen[$reference] = true;
            $options[] = ['id' => $reference, 'name' => $carrier['name']];
        }

        return $options;
    }

    private function resolveCarrierType(Order $order): string
    {
        $carrier = new Carrier((int) $order->id_carrier);

        if (!Validate::isLoadedObject($carrier)) {
            return '';
        }

        return $this->carrierTypesByReference()[(int) $carrier->id_reference] ?? '';
    }

    /**
     * @return array<int, string> id_reference => тип перевозчика
     */
    private function carrierTypesByReference(): array
    {
        $map = [
            (int) Configuration::get(self::CONF_CARRIER_YANDEX) => 'yandex',
            (int) Configuration::get(self::CONF_CARRIER_FIVEPOST) => 'fivepost',
            (int) Configuration::get(self::CONF_CARRIER_POST) => 'post',
            (int) Configuration::get(self::CONF_CARRIER_DPD) => 'dpd',
        ];

        unset($map[0]);

        return $map;
    }

    /**
     * Витрина знает перевозчика только по id_carrier из радиокнопки, поэтому
     * сопоставление reference -> тип разворачивается в id_carrier -> тип.
     *
     * @return array<string, string>
     */
    private function frontCarrierMap(): array
    {
        $byReference = $this->carrierTypesByReference();

        if (!$byReference) {
            return [];
        }

        $map = [];

        foreach (Carrier::getCarriers((int) $this->context->language->id, true, false, false, null, Carrier::ALL_CARRIERS) as $carrier) {
            $type = $byReference[(int) $carrier['id_reference']] ?? null;

            if ($type !== null) {
                $map[(string) $carrier['id_carrier']] = $type;
            }
        }

        return $map;
    }

    private function tokenTtl(): int
    {
        $ttl = (int) Configuration::get(self::CONF_TOKEN_TTL);

        return $ttl >= self::MIN_TOKEN_TTL && $ttl <= self::MAX_TOKEN_TTL ? $ttl : self::DEFAULT_TOKEN_TTL;
    }

    private function generateSecret(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function configurationKeys(): array
    {
        return [
            self::CONF_SECRET,
            self::CONF_API_URL,
            self::CONF_TOKEN_TTL,
            self::CONF_CRON_KEY,
            self::CONF_CARRIER_YANDEX,
            self::CONF_CARRIER_FIVEPOST,
            self::CONF_CARRIER_POST,
            self::CONF_CARRIER_DPD,
            self::CONF_FIVEPOST_KEY,
            self::CONF_DPD_SID,
            self::CONF_POCHTA_WIDGET_ID,
        ];
    }
}
