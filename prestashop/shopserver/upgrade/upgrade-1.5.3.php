<?php
/**
 * 1.5.3: prevents manual status revision from validating unrelated settings.
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_1_5_3($module)
{
    return true;
}