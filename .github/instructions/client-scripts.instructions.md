---
description: "Use when editing client/src/backend.ts or client/src/front.ts — the PrestaShop admin and storefront scripts. Covers global-scope compilation, injected config, widget embedding and DOM safety."
applyTo: "client/**"
---

# Клиентские скрипты

## Сборка

Скрипты внедряются в PrestaShop как обычные `<script>` и вызываются по имени из inline-кода виджетов, поэтому `module: none` — весь код в глобальной области.

Из-за общей области видимости `backend.ts` и `front.ts` **компилируются раздельно**: `client/tsconfig.backend.json` и `client/tsconfig.front.json`. Корневой `client/tsconfig.json` содержит только `compilerOptions` и `files: []`. Одинаковые имена в двух файлах — это конфликт объявлений, а не ошибка.

Оба конфига перечислены в `parserOptions.project` в `.eslintrc.js`. Новый файл в `client/src` требует своего tsconfig, иначе ESLint упадёт с `not included in project` и заблокирует коммит.

Выходные файлы идут прямо в `prestashop/shopserver/views/js/`. Не добавляйте промежуточные каталоги сборки.

## Конфигурация вместо констант

Ни адреса сервера, ни ключей виджетов, ни идентификаторов перевозчиков в исходниках быть не должно. Всё приходит из модуля:

- админка — `window.shopServerConfig` (`apiUrl`, `token`, `orderId`, `carrier`, `fivePostKey`)
- витрина — `window.shopServerFront` (`carriers`, `fivePostKey`, `dpdSid`, `pochtaWidgetId`)

Перевозчика определяйте по значению радиокнопки (`id_carrier`), а не сравнением текста `.carrier-name` — название меняется при правке настроек магазина.

## Виджеты ПВЗ

Виджеты подключаются inline-скриптом. Любое подставляемое значение оборачивайте в `JSON.stringify` — иначе это дыра для инъекции. Данные пункта выводите через `textContent`, не `innerHTML`.

Скрипты виджетов грузите по требованию (`loadWidgetScript`), а не при открытии страницы.

## Взаимодействие с чекаутом

Блок доставки перерисовывается аяксом. Переинициализация висит на событии темы `updatedDeliveryForm` с запасным таймаутом; функции инициализации обязаны быть идемпотентными (проверяйте, что элемент ещё не добавлен).

Перед открытием карты перевозчик выбирается программно и код **ждёт** `updatedDeliveryForm`. Иначе ответ аякса затрёт textarea с только что записанным адресом пункта.

Ссылка на карту лежит вне `<label>`: внутри него клик дополнительно переключал бы радиокнопку.
