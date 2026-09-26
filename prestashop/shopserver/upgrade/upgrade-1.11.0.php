<?php
/**
 * 1.11.0: configurable DPD sender terminals (Rostov/Tula) for shipment registration.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_11_0($module)
{
    return (Configuration::hasKey(ShopServer::CONF_DPD_SOURCE_TERMINAL_RND)
            || Configuration::updateValue(ShopServer::CONF_DPD_SOURCE_TERMINAL_RND, ''))
        && (Configuration::hasKey(ShopServer::CONF_DPD_SOURCE_TERMINAL_TUL)
            || Configuration::updateValue(ShopServer::CONF_DPD_SOURCE_TERMINAL_TUL, ''));
}
