<?php
/**
 * 1.13.0: 5Post shipments are registered via C2C (drop-off at a 5Post point),
 * so the sender warehouse setting is no longer used.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_13_0($module)
{
    Configuration::deleteByName('SHOPSERVER_FIVEPOST_SENDER_LOCATION');

    return true;
}