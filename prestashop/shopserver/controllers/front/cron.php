<?php

if (!defined('_PS_VERSION_')) {
    exit;
}

class ShopServerCronModuleFrontController extends ModuleFrontController
{
    private const CRON_TOKEN_TTL = 300;
    private const SERVER_REQUEST_TIMEOUT = 300;

    public function postProcess(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->respond(405, ['ok' => false, 'message' => 'Method not allowed']);
        }

        $cronKey = isset($_SERVER['HTTP_X_SHOPSERVER_CRON_KEY'])
            ? (string) $_SERVER['HTTP_X_SHOPSERVER_CRON_KEY']
            : '';
        $expectedKey = (string) Configuration::get(ShopServer::CONF_CRON_KEY);

        if ($cronKey === '' || $expectedKey === '' || !hash_equals($expectedKey, $cronKey)) {
            $this->respond(403, ['ok' => false, 'message' => 'Forbidden']);
        }

        $apiUrl = rtrim((string) Configuration::get(ShopServer::CONF_API_URL), '/');
        $jwtSecret = (string) Configuration::get(ShopServer::CONF_SECRET);

        if ($apiUrl === '' || $jwtSecret === '') {
            $this->respond(503, ['ok' => false, 'message' => 'Shop Server is not configured']);
        }

        $token = ShopServerJwtSigner::issueForCron(self::CRON_TOKEN_TTL, $jwtSecret);
        $curl = curl_init($apiUrl . '/revise');

        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => self::SERVER_REQUEST_TIMEOUT,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Accept: application/json',
            ],
        ]);

        $response = curl_exec($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        if ($response === false || $status === 0) {
            $this->respond(502, ['ok' => false, 'message' => 'Shop Server is unavailable']);
        }

        $this->respond($status, ['ok' => $status < 400, 'data' => json_decode((string) $response, true)]);
    }

    private function respond(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        exit(json_encode($payload));
    }
}