---
description: "Use when editing the NestJS server in src/ — controllers, guards, services calling external delivery APIs, or tests. Covers JWT auth, external call patterns and known gaps."
applyTo: "src/**, test/**"
---

# Сервер NestJS

## Авторизация

Запросы подписывает модуль PrestaShop, сервер только проверяет: `AuthGuard('jwt')`, HS256, `issuer`/`audience` из `src/auth/jwt-claims.ts`.

Секрет читается через `configService.getOrThrow('SHOPSERVER_JWT_SECRET')` — приложение обязано падать на старте, если переменной нет. Не заменяйте на `get()` с дефолтом: это возвращает дыру, когда `undefined === undefined` пропускает запрос.

В `req.user` лежит `{ id, email }` сотрудника PrestaShop. Используйте это в логах и уведомлениях.

Тесты, поднимающие `AuthModule` или `AppModule`, должны выставлять `process.env.SHOPSERVER_JWT_SECRET` в `beforeEach`.

## Внешние API

Сервисы ходят в Яндекс.Доставку, 5Post, DPD (SOAP), Почту России, кассу и Telegram. При правке любого из них:

- **никогда не вызывайте `fetch` напрямую** — только `fetchWithTimeout` из `src/common/fetch-with-timeout.ts`. Без таймаута один зависший API исчерпывает пул воркеров;
- в DPD таймаут задаётся дважды: `wsdl_options` при `createClient` и опции самого вызова;
- проверяйте `response.ok` до разбора тела;
- не отдавайте объект ошибки наружу — в ответ утекают стектрейсы и внутренние адреса.

Тесты мокают `node-fetch` через `{ __esModule: true, default: jest.fn() }` — хелпер импортирует тот же модуль, поэтому старые моки продолжают работать.

## Контроллеры

Роуты есть только у `AppController` (всё под `AuthGuard('jwt')`, кроме `GET /`) и `BotController` (вебхук Telegram).

`ShopController` и `YaController` существуют как файлы, но **закомментированы в своих модулях** — их роутов в рантайме нет. Прежде чем делать выводы о доступности эндпоинта, проверяйте регистрацию в `@Module({ controllers })`, а не наличие файла с декораторами.

## Известные недоработки

Учитывайте при планировании задач, не считайте это нормой:

- Вебхук `POST /bot` не проверяет `X-Telegram-Bot-Api-Secret-Token`.
- `ValidationPipe` в `main.ts` с `whitelist: false, transform: false`.
- В `tsconfig.json` отключены `strictNullChecks` и `noImplicitAny`.
- Нет `helmet`, rate limiting и healthcheck.
- `pendingYaReferences` в `BotController` без TTL.

Подробности и причины — в [docs/decisions.md](../../docs/decisions.md).
