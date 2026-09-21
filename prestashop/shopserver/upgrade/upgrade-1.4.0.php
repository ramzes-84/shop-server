<?php
/**
 * 1.4.0: configurable Yandex Delivery source platform ID.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_4_0($module)
{
    if (!Configuration::hasKey('SHOPSERVER_YA_SOURCE_PLATFORM_ID')) {
        Configuration::updateValue('SHOPSERVER_YA_SOURCE_PLATFORM_ID', '');
    }

    return true;
}