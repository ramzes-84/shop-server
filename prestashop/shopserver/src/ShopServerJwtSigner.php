<?php
/**
 * Подпись JWT по HS256 без внешних зависимостей.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

final class ShopServerJwtSigner
{
    public const ISSUER = 'prestashop';
    public const AUDIENCE = 'shop-server';

    public static function sign(array $claims, string $secret): string
    {
        $header = self::base64UrlEncode((string) json_encode([
            'alg' => 'HS256',
            'typ' => 'JWT',
        ]));
        $payload = self::base64UrlEncode((string) json_encode($claims));
        $signature = hash_hmac('sha256', $header . '.' . $payload, $secret, true);

        return $header . '.' . $payload . '.' . self::base64UrlEncode($signature);
    }

    public static function issueForEmployee(int $employeeId, string $email, int $ttl, string $secret): string
    {
        $now = time();

        return self::sign([
            'iss' => self::ISSUER,
            'aud' => self::AUDIENCE,
            'sub' => (string) $employeeId,
            'email' => $email,
            'iat' => $now,
            'exp' => $now + $ttl,
        ], $secret);
    }

    public static function issueForCron(int $ttl, string $secret): string
    {
        $now = time();

        return self::sign([
            'iss' => self::ISSUER,
            'aud' => self::AUDIENCE,
            'sub' => 'prestashop-cron',
            'scope' => 'orders:revise',
            'iat' => $now,
            'exp' => $now + $ttl,
        ], $secret);
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
