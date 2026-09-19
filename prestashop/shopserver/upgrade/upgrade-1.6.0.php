<?php
/**
 * 1.6.0: configurable customer email templates for order status changes.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_6_0($module)
{
    return $module->registerHook('actionObjectOrderHistoryAddAfter')
        && (!Configuration::hasKey(ShopServer::CONF_NOTIFY_WAITING_STATE)
            || Configuration::updateValue(ShopServer::CONF_NOTIFY_WAITING_STATE, 0))
        && (!Configuration::hasKey(ShopServer::CONF_NOTIFY_WAITING_TEMPLATE)
            || Configuration::updateValue(ShopServer::CONF_NOTIFY_WAITING_TEMPLATE, ''))
        && (!Configuration::hasKey(ShopServer::CONF_NOTIFY_DELIVERED_STATE)
            || Configuration::updateValue(ShopServer::CONF_NOTIFY_DELIVERED_STATE, 0))
        && (!Configuration::hasKey(ShopServer::CONF_NOTIFY_DELIVERED_TEMPLATE)
            || Configuration::updateValue(ShopServer::CONF_NOTIFY_DELIVERED_TEMPLATE, ''));
}