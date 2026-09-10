---
description: "Use when editing the PrestaShop module: PHP hooks, Smarty templates, module config, carriers, upgrade scripts, or the packaging script. Covers PHP 7.4 constraints, id_reference matching and zip packaging pitfalls."
applyTo: "prestashop/**, scripts/**"
---

# Модуль PrestaShop

## Целевая среда

Магазин работает на **PHP 7.4.33**. Не используйте синтаксис PHP 8: `?->`, `match`, promotion в конструкторе, union-типы, `str_contains`, `str_starts_with`, именованные аргументы, `enum`, `readonly`, атрибуты. Приводите типы явно перед вызовом функций (`trim((string) Tools::getValue(...))`), чтобы код оставался корректным и после апгрейда на 8.1+.

## Перевозчики

Сопоставляйте только по `id_reference`, никогда по `id_carrier` и никогда по названию. PrestaShop при редактировании перевозчика помечает старую запись `deleted = 1` и создаёт новую с новым `id_carrier`, сохраняя `id_reference`. Точка входа — `carrierTypesByReference()`.

Для витрины карта разворачивается в `id_carrier => тип` (`frontCarrierMap()`), потому что в разметке чекаута доступно только значение радиокнопки вида `"493,"`.

## Изменения после релиза

Новый хук или новый ключ `Configuration` не появятся у уже установленного модуля сами. При любом таком изменении:

1. Поднимите `$this->version` в конструкторе.
2. Добавьте `upgrade/upgrade-<version>.php` с функцией `upgrade_module_<x>_<y>_<z>($module)`.
3. В ней регистрируйте хук (`registerHook` идемпотентен) и досоздавайте ключи через проверку `Configuration::hasKey`.

Ассеты подключайте с `'version' => $this->version` — иначе браузеры отдадут закешированные JS и CSS.

## Безопасность и структура

- В каждой папке модуля нужен `index.php`-заглушка с редиректом.
- Данные в JS передавайте через `Media::addJsDef` или `json_encode` с `JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT`, в шаблоне — `{$var nofilter}`.
- Секрет JWT генерируйте только через `bin2hex(random_bytes(32))`.

## Упаковка

Собирайте архив только через `npm run pack:module`.

`Compress-Archive` и `ZipFile::CreateFromDirectory` на .NET Framework пишут в имена записей `\`. PHP не читает это как структуру папок, и PrestaShop отвечает «Этот файл не является архивом модуля». Скрипт формирует имена вручную с `/`.

`scripts/pack-module.ps1` должен оставаться **ASCII-only**: Windows PowerShell 5.1 читает `.ps1` без BOM как ANSI и падает на кириллице.
