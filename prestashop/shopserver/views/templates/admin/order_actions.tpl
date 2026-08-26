{**
 * Панель действий shop-server на странице заказа.
 *}
<link rel="stylesheet" href="{$shopserver_style_url|escape:'html':'UTF-8'}">

<div class="card mb-2 shopserver-panel">
  <div class="card-header">Доставка и оплата</div>
  <div class="card-body shopserver-actions">
    <button type="button" class="btn btn-success" data-shopserver-action="invoice">
      💰 Создать счёт
    </button>

    {if $shopserver_carrier === 'yandex'}
      <button type="button" class="btn btn-primary" data-shopserver-action="create-order">
        🚛 Зарегистрировать отправку
      </button>
      <button type="button" class="btn btn-light" data-shopserver-action="map">
        🌍 Пункты Яндекс.Доставки
      </button>
    {elseif $shopserver_carrier === 'fivepost'}
      <button type="button" class="btn btn-light" data-shopserver-action="map">
        🌍 Пункты 5Post
      </button>
    {/if}
  </div>
</div>

<script>window.shopServerConfig = {$shopserver_config nofilter};</script>
<script src="{$shopserver_script_url|escape:'html':'UTF-8'}" defer></script>
