<?php
/**
 * 1.3.0: защищённый CRON-маршрут пересмотра статусов.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_3_0($module)
{
    if (!Configuration::hasKey(ShopServer::CONF_CRON_KEY)) {
        Configuration::updateValue(ShopServer::CONF_CRON_KEY, bin2hex(random_bytes(32)));
    }

    return true;
}