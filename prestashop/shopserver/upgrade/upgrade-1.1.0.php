<?php
/**
 * 1.1.0: виджеты пунктов выдачи на витрине.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_1_0($module)
{
    $defaults = [
        ShopServer::CONF_CARRIER_POST => 0,
        ShopServer::CONF_CARRIER_DPD => 0,
        ShopServer::CONF_DPD_SID => '',
        ShopServer::CONF_POCHTA_WIDGET_ID => '',
    ];

    foreach ($defaults as $key => $value) {
        if (!Configuration::hasKey($key)) {
            Configuration::updateValue($key, $value);
        }
    }

    // registerHook идемпотентен: вернёт true, если хук уже зарегистрирован.
    return $module->registerHook('actionFrontControllerSetMedia');
}
