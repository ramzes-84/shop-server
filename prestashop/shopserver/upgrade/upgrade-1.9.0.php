<?php
/**
 * 1.9.0: письмо клиенту при записи трек-номера через webservice (actionObjectOrderCarrierUpdateAfter),
 * чтобы сервер мог сам вписывать трек созданной отправки без ручной вставки в БО.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_9_0($module)
{
    if (!Configuration::hasKey(ShopServer::CONF_NOTIFY_TRACKING_TEMPLATE)) {
        Configuration::updateValue(ShopServer::CONF_NOTIFY_TRACKING_TEMPLATE, '');
    }

    return $module->registerHook('actionObjectOrderCarrierUpdateAfter');
}
