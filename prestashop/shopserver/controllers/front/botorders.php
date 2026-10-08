<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

/**
 * Отдаёт Telegram-боту заказы, готовые к регистрации отправки, и настройки доставки.
 * Авторизация — общий ключ в заголовке X-ShopServer-Bot-Key (по аналогии с CRON).
 */
class ShopServerBotordersModuleFrontController extends ModuleFrontController
{
    private const REGISTRATION_STATE_IDS = [12, 13];

    public function postProcess(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
            $this->respond(405, ['ok' => false, 'message' => 'Method not allowed']);
        }

        $botKey = isset($_SERVER['HTTP_X_SHOPSERVER_BOT_KEY'])
            ? (string) $_SERVER['HTTP_X_SHOPSERVER_BOT_KEY']
            : '';
        $expectedKey = (string) Configuration::get(ShopServer::CONF_BOT_KEY);

        if ($botKey === '' || $expectedKey === '' || !hash_equals($expectedKey, $botKey)) {
            $this->respond(403, ['ok' => false, 'message' => 'Forbidden']);
        }

        /** @var ShopServer $module */
        $module = Module::getInstanceByName('shopserver');

        $this->respond(200, [
            'ok' => true,
            'data' => $module->ordersForBotRegistration(self::REGISTRATION_STATE_IDS),
        ]);
    }

    private function respond(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        exit(json_encode($payload));
    }
}
