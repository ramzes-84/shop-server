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

Сервисы ходят в Яндекс.Доставку, 5Post, DPD (SOAP), Почту России, кассу и Telegram через `node-fetch`. При правке любого из них:

- проверяйте `response.ok` до разбора тела;
- не отдавайте объект ошибки наружу — в ответ утекают стектрейсы и внутренние адреса.

## Известные недоработки

Учитывайте при планировании задач, не считайте это нормой:

- Внешние вызовы без таймаутов — один зависший API способен исчерпать пул и уронить сервис целиком.
- `ShopController` и `YaController` без гардов: перебором id выгружаются данные покупателей.
- `ValidationPipe` в `main.ts` с `whitelist: false, transform: false`.
- В `tsconfig.json` отключены `strictNullChecks` и `noImplicitAny`.
- Нет `helmet`, rate limiting, структурного логирования и healthcheck.

Подробности и причины — в [docs/decisions.md](../../docs/decisions.md).
