<?php
/**
 * 1.4.1: separate Yandex Delivery source platforms for Rostov and Tula.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_4_1($module)
{
    $legacyValue = (string) Configuration::get('SHOPSERVER_YA_SOURCE_PLATFORM_ID');

    if (!Configuration::hasKey(ShopServer::CONF_YA_SOURCE_PLATFORM_ID_RND)) {
        Configuration::updateValue(ShopServer::CONF_YA_SOURCE_PLATFORM_ID_RND, $legacyValue);
    }

    if (!Configuration::hasKey(ShopServer::CONF_YA_SOURCE_PLATFORM_ID_TUL)) {
        Configuration::updateValue(ShopServer::CONF_YA_SOURCE_PLATFORM_ID_TUL, $legacyValue);
    }

    Configuration::deleteByName('SHOPSERVER_YA_SOURCE_PLATFORM_ID');

    return true;
}