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
    public const CONF_BOT_KEY = 'SHOPSERVER_BOT_KEY';
    public const CONF_YA_SOURCE_PLATFORM_ID_RND = 'SHOPSERVER_YA_SOURCE_PLATFORM_ID_RND';
    public const CONF_YA_SOURCE_PLATFORM_ID_TUL = 'SHOPSERVER_YA_SOURCE_PLATFORM_ID_TUL';
    public const CONF_FIVEPOST_SENDER_LOCATION = 'SHOPSERVER_FIVEPOST_SENDER_LOCATION';
    public const CONF_CARRIER_YANDEX = 'SHOPSERVER_CARRIER_YANDEX';
    public const CONF_CARRIER_FIVEPOST = 'SHOPSERVER_CARRIER_FIVEPOST';
    public const CONF_CARRIER_POST = 'SHOPSERVER_CARRIER_POST';
    public const CONF_CARRIER_DPD = 'SHOPSERVER_CARRIER_DPD';
    public const CONF_FIVEPOST_KEY = 'SHOPSERVER_FIVEPOST_KEY';
    public const CONF_DPD_SID = 'SHOPSERVER_DPD_SID';
    public const CONF_POCHTA_WIDGET_ID = 'SHOPSERVER_POCHTA_WIDGET_ID';
    public const CONF_NOTIFY_WAITING_STATE = 'SHOPSERVER_NOTIFY_WAITING_STATE';
    public const CONF_NOTIFY_WAITING_TEMPLATE = 'SHOPSERVER_NOTIFY_WAITING_TEMPLATE';
    public const CONF_NOTIFY_DELIVERED_STATE = 'SHOPSERVER_NOTIFY_DELIVERED_STATE';
    public const CONF_NOTIFY_DELIVERED_TEMPLATE = 'SHOPSERVER_NOTIFY_DELIVERED_TEMPLATE';

    private const DEFAULT_TOKEN_TTL = 7200;
    private const MIN_TOKEN_TTL = 300;
    private const MAX_TOKEN_TTL = 43200;

    public function __construct()
    {
        $this->name = 'shopserver';
        $this->tab = 'shipping_logistics';
        $this->version = '1.8.0';
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
            && $this->registerHook('actionObjectOrderHistoryAddAfter')
            && Configuration::updateValue(self::CONF_SECRET, $this->generateSecret())
            && Configuration::updateValue(self::CONF_API_URL, '')
            && Configuration::updateValue(self::CONF_TOKEN_TTL, self::DEFAULT_TOKEN_TTL)
            && Configuration::updateValue(self::CONF_CRON_KEY, $this->generateSecret())
            && Configuration::updateValue(self::CONF_BOT_KEY, $this->generateSecret())
            && Configuration::updateValue(self::CONF_YA_SOURCE_PLATFORM_ID_RND, '')
            && Configuration::updateValue(self::CONF_YA_SOURCE_PLATFORM_ID_TUL, '')
            && Configuration::updateValue(self::CONF_FIVEPOST_SENDER_LOCATION, '')
            && Configuration::updateValue(self::CONF_CARRIER_YANDEX, 0)
            && Configuration::updateValue(self::CONF_CARRIER_FIVEPOST, 0)
            && Configuration::updateValue(self::CONF_CARRIER_POST, 0)
            && Configuration::updateValue(self::CONF_CARRIER_DPD, 0)
            && Configuration::updateValue(self::CONF_FIVEPOST_KEY, '')
            && Configuration::updateValue(self::CONF_DPD_SID, '')
            && Configuration::updateValue(self::CONF_POCHTA_WIDGET_ID, '')
            && Configuration::updateValue(self::CONF_NOTIFY_WAITING_STATE, 0)
            && Configuration::updateValue(self::CONF_NOTIFY_WAITING_TEMPLATE, '')
            && Configuration::updateValue(self::CONF_NOTIFY_DELIVERED_STATE, 0)
            && Configuration::updateValue(self::CONF_NOTIFY_DELIVERED_TEMPLATE, '');
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
            $secret,
            (string) Configuration::get(self::CONF_YA_SOURCE_PLATFORM_ID_RND),
            (string) Configuration::get(self::CONF_YA_SOURCE_PLATFORM_ID_TUL),
            (string) Configuration::get(self::CONF_FIVEPOST_SENDER_LOCATION)
        );

        $config = [
            'apiUrl' => rtrim($apiUrl, '/'),
            'token' => $token,
            'orderId' => (string) $order->id,
            'carrier' => $this->resolveCarrierType($order),
            'fivePostKey' => (string) Configuration::get(self::CONF_FIVEPOST_KEY),
            'pochtaWidgetId' => (string) Configuration::get(self::CONF_POCHTA_WIDGET_ID),
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

    public function hookActionObjectOrderHistoryAddAfter(array $params): void
    {
        if (empty($params['object']) || !($params['object'] instanceof OrderHistory)) {
            return;
        }

        /** @var OrderHistory $history */
        $history = $params['object'];
        if (!(int) $history->id_order_state || !(int) $history->id_order) {
            return;
        }

        $template = $this->notificationTemplateForState((int) $history->id_order_state);
        if ($template === '') {
            return;
        }

        $this->sendStatusNotification($history, $template);
    }

    public function getContent(): string
    {
        $output = '';
        $activeTab = $this->configurationTab();

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

        if (Tools::isSubmit('submitShopServerRegenerateBotKey')) {
            Configuration::updateValue(self::CONF_BOT_KEY, $this->generateSecret());
            $output .= $this->displayConfirmation(
                'Ключ бота перевыпущен. Обновите переменную SHOPSERVER_BOT_KEY на сервере.'
            );
        }

        if (Tools::isSubmit('submitShopServerSettings')) {
            $output .= $this->saveSettings($activeTab);
        }

        if (Tools::isSubmit('submitShopServerRunStatusRevision')) {
            $output .= $this->runStatusRevision();
        }

        return $output . $this->renderTabs($activeTab) . $this->renderForm($activeTab);
    }

    private function saveSettings(string $activeTab): string
    {
        if ($activeTab === 'status') {
            return '';
        }

        if ($activeTab === 'delivery') {
            return $this->saveDeliverySettings();
        }

        if ($activeTab === 'widgets') {
            Configuration::updateValue(self::CONF_FIVEPOST_KEY, trim((string) Tools::getValue(self::CONF_FIVEPOST_KEY)));
            Configuration::updateValue(self::CONF_DPD_SID, trim((string) Tools::getValue(self::CONF_DPD_SID)));
            Configuration::updateValue(self::CONF_POCHTA_WIDGET_ID, trim((string) Tools::getValue(self::CONF_POCHTA_WIDGET_ID)));

            return $this->displayConfirmation('Настройки сохранены.');
        }

        if ($activeTab === 'notifications') {
            Configuration::updateValue(self::CONF_NOTIFY_WAITING_STATE, (int) Tools::getValue(self::CONF_NOTIFY_WAITING_STATE));
            Configuration::updateValue(self::CONF_NOTIFY_WAITING_TEMPLATE, trim((string) Tools::getValue(self::CONF_NOTIFY_WAITING_TEMPLATE)));
            Configuration::updateValue(self::CONF_NOTIFY_DELIVERED_STATE, (int) Tools::getValue(self::CONF_NOTIFY_DELIVERED_STATE));
            Configuration::updateValue(self::CONF_NOTIFY_DELIVERED_TEMPLATE, trim((string) Tools::getValue(self::CONF_NOTIFY_DELIVERED_TEMPLATE)));

            return $this->displayConfirmation('Настройки сохранены.');
        }

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

        return $this->displayConfirmation('Настройки сохранены.');
    }

    private function saveDeliverySettings(): string
    {
        $yaSourcePlatformIdRnd = trim((string) Tools::getValue(self::CONF_YA_SOURCE_PLATFORM_ID_RND));
        $yaSourcePlatformIdTul = trim((string) Tools::getValue(self::CONF_YA_SOURCE_PLATFORM_ID_TUL));
        $fivePostSenderLocation = trim((string) Tools::getValue(self::CONF_FIVEPOST_SENDER_LOCATION));
        $fivePostCarrier = (int) Tools::getValue(self::CONF_CARRIER_FIVEPOST);

        if ($yaSourcePlatformIdRnd === '' || $yaSourcePlatformIdTul === '') {
            return $this->displayError('Укажите ID пунктов приёма Яндекс.Доставки для Ростова и Тулы.');
        }

        if ($fivePostCarrier !== 0 && $fivePostSenderLocation === '') {
            return $this->displayError('Укажите ID склада отправителя 5Post.');
        }

        Configuration::updateValue(self::CONF_YA_SOURCE_PLATFORM_ID_RND, $yaSourcePlatformIdRnd);
        Configuration::updateValue(self::CONF_YA_SOURCE_PLATFORM_ID_TUL, $yaSourcePlatformIdTul);
        Configuration::updateValue(self::CONF_FIVEPOST_SENDER_LOCATION, $fivePostSenderLocation);
        Configuration::updateValue(self::CONF_CARRIER_YANDEX, (int) Tools::getValue(self::CONF_CARRIER_YANDEX));
        Configuration::updateValue(self::CONF_CARRIER_FIVEPOST, $fivePostCarrier);
        Configuration::updateValue(self::CONF_CARRIER_POST, (int) Tools::getValue(self::CONF_CARRIER_POST));
        Configuration::updateValue(self::CONF_CARRIER_DPD, (int) Tools::getValue(self::CONF_CARRIER_DPD));

        return $this->displayConfirmation('Настройки сохранены.');
    }

    private function runStatusRevision(): string
    {
        $apiUrl = rtrim((string) Configuration::get(self::CONF_API_URL), '/');
        $secret = (string) Configuration::get(self::CONF_SECRET);

        if ($apiUrl === '' || $secret === '') {
            return $this->displayError('Адрес сервера или секрет JWT не настроен.');
        }

        @set_time_limit(310);
        $token = ShopServerJwtSigner::issueForCron(300, $secret);
        $curl = curl_init($apiUrl . '/revise');

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 300,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($response === false || $status === 0) {
            return $this->displayError('Не удалось подключиться к Shop Server. Проверьте адрес сервера и его журнал.');
        }

        if ($status >= 400) {
            return $this->displayError(sprintf('Проверка статусов завершилась ошибкой Shop Server (HTTP %d).', $status));
        }

        $result = json_decode((string) $response, true);

        if (!is_array($result) || count($result) === 0) {
            return $this->displayConfirmation('Проверка статусов завершена. Изменений, предупреждений и ошибок не обнаружено.');
        }

        $messages = array_map(function ($message): string {
            return htmlspecialchars((string) $message, ENT_QUOTES, 'UTF-8');
        }, $result);

        return $this->displayConfirmation(
            'Проверка статусов завершена:<br>' . implode('<br>', $messages)
        );
    }

    private function renderForm(string $activeTab): string
    {
        $carrierOptions = $this->carrierOptions();

        $fields = [
            'form' => [
                'legend' => ['title' => $this->tabTitle($activeTab), 'icon' => 'icon-cogs'],
                'input' => $this->fieldsForTab($activeTab, $carrierOptions),
                'submit' => $activeTab === 'status' ? [] : ['title' => 'Сохранить', 'name' => 'submitShopServerSettings'],
                'buttons' => $this->buttonsForTab($activeTab),
            ],
        ];

        $helper = new HelperForm();
        $helper->module = $this;
        $helper->identifier = $this->identifier;
        $helper->submit_action = 'submitShopServerSettings';
        $helper->token = Tools::getAdminTokenLite('AdminModules');
        $helper->currentIndex = $this->configurationUrl($activeTab);
        $helper->default_form_language = (int) Configuration::get('PS_LANG_DEFAULT');
        $helper->tpl_vars = ['fields_value' => $this->formValues()];

        return $helper->generateForm([$fields]);
    }

    private function fieldsForTab(string $activeTab, array $carrierOptions): array
    {
        if ($activeTab === 'delivery') {
            return [
                ['type' => 'text', 'label' => 'ID пункта приёма Яндекс.Доставки, Ростов', 'name' => self::CONF_YA_SOURCE_PLATFORM_ID_RND, 'desc' => 'platform_id пункта для заказов со статусом 12.', 'required' => true],
                ['type' => 'text', 'label' => 'ID пункта приёма Яндекс.Доставки, Тула', 'name' => self::CONF_YA_SOURCE_PLATFORM_ID_TUL, 'desc' => 'platform_id пункта для заказов со статусом 13.', 'required' => true],
                ['type' => 'text', 'label' => 'ID склада отправителя 5Post', 'name' => self::CONF_FIVEPOST_SENDER_LOCATION, 'desc' => 'partnerLocationId склада, выданный 5Post. Обязателен при выбранном перевозчике 5Post.'],
                ['type' => 'select', 'label' => 'Перевозчик Яндекс.Доставка', 'name' => self::CONF_CARRIER_YANDEX, 'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name']],
                ['type' => 'select', 'label' => 'Перевозчик 5Post', 'name' => self::CONF_CARRIER_FIVEPOST, 'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name']],
                ['type' => 'select', 'label' => 'Перевозчик Почта России', 'name' => self::CONF_CARRIER_POST, 'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name']],
                ['type' => 'select', 'label' => 'Перевозчик DPD', 'name' => self::CONF_CARRIER_DPD, 'options' => ['query' => $carrierOptions, 'id' => 'id', 'name' => 'name']],
            ];
        }

        if ($activeTab === 'widgets') {
            return [
                ['type' => 'text', 'label' => 'Ключ виджета 5Post', 'name' => self::CONF_FIVEPOST_KEY, 'desc' => 'Ключ попадает в браузер покупателя — используйте ключ, ограниченный доменом.'],
                ['type' => 'text', 'label' => 'SID чузера DPD', 'name' => self::CONF_DPD_SID],
                ['type' => 'text', 'label' => 'ID виджета Почты России', 'name' => self::CONF_POCHTA_WIDGET_ID],
            ];
        }

        if ($activeTab === 'notifications') {
            return [
                ['type' => 'text', 'label' => 'ID статуса «Ожидание получения»', 'name' => self::CONF_NOTIFY_WAITING_STATE, 'class' => 'fixed-width-sm', 'desc' => 'При создании этого статуса клиенту отправляется указанный шаблон. Оставьте оба поля пустыми, чтобы отключить уведомление.'],
                ['type' => 'text', 'label' => 'Шаблон для статуса «Ожидание получения»', 'name' => self::CONF_NOTIFY_WAITING_TEMPLATE, 'desc' => 'Имя шаблона из /mails без языкового суффикса. Например: order_changed.'],
                ['type' => 'text', 'label' => 'ID статуса «Доставлен»', 'name' => self::CONF_NOTIFY_DELIVERED_STATE, 'class' => 'fixed-width-sm', 'desc' => 'При создании этого статуса клиенту отправляется указанный шаблон. Оставьте оба поля пустыми, чтобы отключить уведомление.'],
                ['type' => 'text', 'label' => 'Шаблон для статуса «Доставлен»', 'name' => self::CONF_NOTIFY_DELIVERED_TEMPLATE, 'desc' => 'Имя шаблона из /mails без языкового суффикса. Например: order_changed.'],
            ];
        }

        if ($activeTab === 'status') {
            return [[
                'type' => 'html',
                'name' => 'status_revision',
                'html_content' => '<p>Запускает тот же пересмотр статусов, что и внешний CRON. Операция может занять до 5 минут.</p>',
            ]];
        }

        return [
                    [
                        'type' => 'text',
                        'label' => 'Адрес сервера',
                        'name' => self::CONF_API_URL,
                        'desc' => 'Например: https://shop-server-4y1m.onrender.com',
                        'required' => true,
                    ],
                    [
                        'type' => 'text',
                        'label' => 'Время жизни токена, сек',
                        'name' => self::CONF_TOKEN_TTL,
                        'desc' => 'Токен выдаётся при открытии страницы заказа. По истечении сотруднику нужно обновить страницу.',
                        'required' => true,
                    ],
                    [
                        'type' => 'text',
                        'label' => 'SHOPSERVER_JWT_SECRET',
                        'name' => 'SHOPSERVER_SECRET_READONLY',
                        'readonly' => true,
                        'desc' => 'Скопируйте это значение в переменную окружения сервера. Кнопка ниже выпускает новый секрет.',
                    ],
                    [
                        'type' => 'text',
                        'label' => 'SHOPSERVER_BOT_KEY',
                        'name' => 'SHOPSERVER_BOT_KEY_READONLY',
                        'readonly' => true,
                        'desc' => 'Ключ, которым Telegram-бот подтверждает себя при запросе списка заказов на регистрацию. Скопируйте в переменную окружения сервера.',
                    ],
        ];
    }

    private function buttonsForTab(string $activeTab): array
    {
        if ($activeTab === 'server') {
            return [
                    [
                        'type' => 'submit',
                        'title' => 'Перевыпустить секрет',
                        'name' => 'submitShopServerRegenerate',
                        'icon' => 'process-icon-refresh',
                        'class' => 'btn btn-default pull-right',
                    ],
                    [
                        'type' => 'submit',
                        'title' => 'Перевыпустить ключ CRON',
                        'name' => 'submitShopServerRegenerateCronKey',
                        'icon' => 'process-icon-refresh',
                        'class' => 'btn btn-default pull-right',
                    ],
                    [
                        'type' => 'submit',
                        'title' => 'Перевыпустить ключ бота',
                        'name' => 'submitShopServerRegenerateBotKey',
                        'icon' => 'process-icon-refresh',
                        'class' => 'btn btn-default pull-right',
                    ],
            ];
        }

        if ($activeTab === 'status') {
            return [[
                'type' => 'submit',
                'title' => 'Запустить проверку статусов',
                'name' => 'submitShopServerRunStatusRevision',
                'icon' => 'process-icon-refresh',
                'class' => 'btn btn-primary pull-right',
            ]];
        }

        return [];
    }

    private function formValues(): array
    {
        return [
            self::CONF_API_URL => Configuration::get(self::CONF_API_URL),
            self::CONF_TOKEN_TTL => $this->tokenTtl(),
            self::CONF_YA_SOURCE_PLATFORM_ID_RND => Configuration::get(self::CONF_YA_SOURCE_PLATFORM_ID_RND),
            self::CONF_YA_SOURCE_PLATFORM_ID_TUL => Configuration::get(self::CONF_YA_SOURCE_PLATFORM_ID_TUL),
            self::CONF_FIVEPOST_SENDER_LOCATION => Configuration::get(self::CONF_FIVEPOST_SENDER_LOCATION),
            'SHOPSERVER_CRON_KEY_READONLY' => Configuration::get(self::CONF_CRON_KEY),
            'SHOPSERVER_BOT_KEY_READONLY' => Configuration::get(self::CONF_BOT_KEY),
            self::CONF_CARRIER_YANDEX => (int) Configuration::get(self::CONF_CARRIER_YANDEX),
            self::CONF_CARRIER_FIVEPOST => (int) Configuration::get(self::CONF_CARRIER_FIVEPOST),
            self::CONF_CARRIER_POST => (int) Configuration::get(self::CONF_CARRIER_POST),
            self::CONF_CARRIER_DPD => (int) Configuration::get(self::CONF_CARRIER_DPD),
            self::CONF_FIVEPOST_KEY => Configuration::get(self::CONF_FIVEPOST_KEY),
            self::CONF_DPD_SID => Configuration::get(self::CONF_DPD_SID),
            self::CONF_POCHTA_WIDGET_ID => Configuration::get(self::CONF_POCHTA_WIDGET_ID),
            self::CONF_NOTIFY_WAITING_STATE => (int) Configuration::get(self::CONF_NOTIFY_WAITING_STATE),
            self::CONF_NOTIFY_WAITING_TEMPLATE => Configuration::get(self::CONF_NOTIFY_WAITING_TEMPLATE),
            self::CONF_NOTIFY_DELIVERED_STATE => (int) Configuration::get(self::CONF_NOTIFY_DELIVERED_STATE),
            self::CONF_NOTIFY_DELIVERED_TEMPLATE => Configuration::get(self::CONF_NOTIFY_DELIVERED_TEMPLATE),
            'SHOPSERVER_SECRET_READONLY' => Configuration::get(self::CONF_SECRET),
        ];
    }

    private function configurationTab(): string
    {
        $tab = (string) Tools::getValue('shopserver_tab', 'server');

        return in_array($tab, ['server', 'delivery', 'widgets', 'notifications', 'status'], true) ? $tab : 'server';
    }

    private function configurationUrl(string $tab): string
    {
        return AdminController::$currentIndex . '&' . http_build_query([
            'configure' => $this->name,
            'shopserver_tab' => $tab,
        ]);
    }

    private function renderTabs(string $activeTab): string
    {
        $tabs = ['server' => 'Сервер и доступ', 'delivery' => 'Доставка', 'widgets' => 'Виджеты', 'notifications' => 'Уведомления', 'status' => 'Проверка статусов'];
        $html = '<ul class="nav nav-tabs" style="margin-bottom: 20px;">';

        foreach ($tabs as $tab => $title) {
            $class = $tab === $activeTab ? ' class="active"' : '';
            $url = $this->configurationUrl($tab) . '&token=' . Tools::getAdminTokenLite('AdminModules');
            $html .= '<li' . $class . '><a href="' . htmlspecialchars($url, ENT_QUOTES, 'UTF-8') . '">' . $title . '</a></li>';
        }

        return $html . '</ul>';
    }

    private function tabTitle(string $tab): string
    {
        return ['server' => 'Сервер и доступ', 'delivery' => 'Доставка', 'widgets' => 'Виджеты', 'notifications' => 'Уведомления', 'status' => 'Проверка статусов'][$tab];
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
     * Заказы, готовые к регистрации отправки ботом: reference, фамилия получателя
     * и тип перевозчика (определяется так же, как на странице заказа, по id_reference).
     *
     * @param int[] $orderStateIds
     */
    public function ordersForBotRegistration(array $orderStateIds): array
    {
        $stateIds = array_values(array_unique(array_filter(array_map('intval', $orderStateIds))));

        $orders = [];

        if ($stateIds) {
            $rows = Db::getInstance()->executeS(
                'SELECT o.id_order, o.reference, o.id_address_delivery, o.id_carrier'
                . ' FROM `' . _DB_PREFIX_ . 'orders` o'
                . ' WHERE o.current_state IN (' . implode(',', $stateIds) . ')'
                . ' ORDER BY o.date_add ASC'
            );

            $carrierTypesByReference = $this->carrierTypesByReference();

            foreach ((array) $rows as $row) {
                $carrier = new Carrier((int) $row['id_carrier']);
                $carrierType = Validate::isLoadedObject($carrier)
                    ? ($carrierTypesByReference[(int) $carrier->id_reference] ?? '')
                    : '';

                $address = new Address((int) $row['id_address_delivery']);
                $lastname = Validate::isLoadedObject($address) ? (string) $address->lastname : '';

                $orders[] = [
                    'id' => (int) $row['id_order'],
                    'reference' => (string) $row['reference'],
                    'lastname' => $lastname,
                    'carrier' => $carrierType,
                ];
            }
        }

        return [
            'orders' => $orders,
            'yaSourcePlatformIds' => [
                'rnd' => (string) Configuration::get(self::CONF_YA_SOURCE_PLATFORM_ID_RND),
                'tul' => (string) Configuration::get(self::CONF_YA_SOURCE_PLATFORM_ID_TUL),
            ],
            'fivePostSenderLocation' => (string) Configuration::get(self::CONF_FIVEPOST_SENDER_LOCATION),
        ];
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

    private function notificationTemplateForState(int $orderStateId): string
    {
        if ($orderStateId === (int) Configuration::get(self::CONF_NOTIFY_WAITING_STATE)) {
            return trim((string) Configuration::get(self::CONF_NOTIFY_WAITING_TEMPLATE));
        }

        if ($orderStateId === (int) Configuration::get(self::CONF_NOTIFY_DELIVERED_STATE)) {
            return trim((string) Configuration::get(self::CONF_NOTIFY_DELIVERED_TEMPLATE));
        }

        return '';
    }

    private function sendStatusNotification(OrderHistory $history, string $template): void
    {
        $order = new Order((int) $history->id_order);

        if (!Validate::isLoadedObject($order)) {
            PrestaShopLogger::addLog(
                sprintf('[%s] Unable to load order or customer for status notification.', $this->name),
                3,
                null,
                __CLASS__,
                (int) $history->id
            );
            return;
        }

        $customer = new Customer((int) $order->id_customer);
        if (!Validate::isLoadedObject($customer)) {
            PrestaShopLogger::addLog(
                sprintf('[%s] Unable to load order or customer for status notification.', $this->name),
                3,
                null,
                __CLASS__,
                (int) $history->id
            );
            return;
        }

        $languageId = (int) $order->id_lang ?: (int) $this->context->language->id;
        $sent = false;

        try {
            $sent = Mail::Send(
                $languageId,
                $template,
                'Обновление статуса заказа: ' . $order->reference,
                [
                    '{firstname}' => $customer->firstname,
                    '{lastname}' => $customer->lastname,
                    '{order_name}' => $order->reference,
                    '{id_order}' => (int) $order->id,
                ],
                $customer->email,
                $customer->firstname . ' ' . $customer->lastname,
                null,
                null,
                null,
                null,
                _PS_MAIL_DIR_,
                false,
                (int) $order->id_shop
            );
        } catch (Exception $exception) {
            PrestaShopLogger::addLog(
                sprintf('[%s] Unable to send template "%s": %s', $this->name, $template, $exception->getMessage()),
                3,
                null,
                __CLASS__,
                (int) $history->id
            );
            return;
        }

        if (!$sent) {
            PrestaShopLogger::addLog(
                sprintf('[%s] Unable to send template "%s" for order %s.', $this->name, $template, $order->reference),
                3,
                null,
                __CLASS__,
                (int) $history->id
            );
        }
    }

    private function configurationKeys(): array
    {
        return [
            self::CONF_SECRET,
            self::CONF_API_URL,
            self::CONF_TOKEN_TTL,
            self::CONF_CRON_KEY,
            self::CONF_BOT_KEY,
            self::CONF_YA_SOURCE_PLATFORM_ID_RND,
            self::CONF_YA_SOURCE_PLATFORM_ID_TUL,
            self::CONF_FIVEPOST_SENDER_LOCATION,
            self::CONF_CARRIER_YANDEX,
            self::CONF_CARRIER_FIVEPOST,
            self::CONF_CARRIER_POST,
            self::CONF_CARRIER_DPD,
            self::CONF_FIVEPOST_KEY,
            self::CONF_DPD_SID,
            self::CONF_POCHTA_WIDGET_ID,
            self::CONF_NOTIFY_WAITING_STATE,
            self::CONF_NOTIFY_WAITING_TEMPLATE,
            self::CONF_NOTIFY_DELIVERED_STATE,
            self::CONF_NOTIFY_DELIVERED_TEMPLATE,
        ];
    }
}
