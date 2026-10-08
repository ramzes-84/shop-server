<?php
/**
 * 1.14.0: the tracking mail is sent only for webservice writes flagged by the server;
 * the template now uses the native in_transit variables ({shipping_number}, {followup}).
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_14_0($module)
{
    return true;
}
