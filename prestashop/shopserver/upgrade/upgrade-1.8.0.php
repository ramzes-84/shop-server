<?php
/**
 * 1.8.0: технический ключ для запроса Telegram-ботом списка заказов на регистрацию.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_8_0($module)
{
    if (!Configuration::hasKey(ShopServer::CONF_BOT_KEY)) {
        Configuration::updateValue(ShopServer::CONF_BOT_KEY, bin2hex(random_bytes(32)));
    }

    return true;
}
