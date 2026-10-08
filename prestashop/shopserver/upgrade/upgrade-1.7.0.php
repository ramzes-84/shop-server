<?php
/**
 * 1.7.0: configurable 5Post sender warehouse for shipment registration.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_7_0($module)
{
    return !Configuration::hasKey(ShopServer::CONF_FIVEPOST_SENDER_LOCATION)
        || Configuration::updateValue(ShopServer::CONF_FIVEPOST_SENDER_LOCATION, '');
}