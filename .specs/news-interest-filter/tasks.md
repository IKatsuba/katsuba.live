# Implementation Plan: News Interest Filter

## Overview

Реализация двухэтапной обработки новостей: AI-оценка интересности + публикация в человечном стиле. Новости с оценкой 4+ из 5 публикуются в Telegram с красивым оформлением ссылок.

## Tasks

- [x] 1. Настройка зависимостей
  - [x] 1.1 Добавить zod в корневой deno.json
    - Добавить `"zod": "npm:zod@^3.23.0"` в секцию `imports`
    - Файл: `deno.json`
    - _Requirements: 1.5, 5.1_

- [x] 2. Расширить типы данных
  - [x] 2.1 Добавить тип EvaluationResult
    - Добавить тип с полями `score`, `reason`, `shouldPublish`
    - Файл: `apps/webhook/lib/types.ts`
    - _Requirements: 1.4, 5.3_

  - [x] 2.2 Добавить тип EntryProcessingResult
    - Discriminated union с вариантами: `published`, `skipped`, `error`
    - Файл: `apps/webhook/lib/types.ts`
    - _Requirements: 2.4, 5.4, 6.2_

- [x] 3. Создать модуль оценки интересности
  - [x] 3.1 Создать файл evaluator.ts
    - Создать `apps/webhook/lib/evaluator.ts`
    - Импортировать `generateObject` из `ai` и `z` из `zod`
    - _Requirements: 1.1, 1.2, 5.1_

  - [x] 3.2 Реализовать Zod-схему для оценки
    - Схема с полями `score` (number 1-5) и `reason` (string)
    - Добавить `.describe()` для каждого поля
    - _Requirements: 1.4, 1.5_

  - [x] 3.3 Реализовать функцию evaluateEntry
    - Принимает `ProcessableEntry`, возвращает `Promise<EvaluationResult>`
    - Использовать `generateObject` с моделью `openai/gpt-5-mini`
    - System prompt с критериями оценки (актуальность, ценность, уникальность, масштаб)
    - Вычислять `shouldPublish` как `score >= 4`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

- [x] 4. Checkpoint - Проверка модуля evaluator
  - Запустить `deno check apps/webhook/lib/evaluator.ts`
  - Убедиться что нет ошибок типизации
  - Проверить что импорты работают корректно

- [x] 5. Обновить LLM процессор
  - [x] 5.1 Обновить system prompt в llm.ts
    - Изменить стиль на человечный, разговорный
    - Добавить инструкции по оформлению ссылок `[текст](url)`
    - Запретить голые URL
    - Файл: `apps/webhook/lib/llm.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

- [x] 6. Интегрировать в main handler
  - [x] 6.1 Импортировать evaluator и новые типы
    - Добавить импорт `evaluateEntry` из `./lib/evaluator.ts`
    - Добавить импорт `EntryProcessingResult` из `./lib/types.ts`
    - Файл: `apps/webhook/main.ts`
    - _Requirements: 5.2_

  - [x] 6.2 Обновить handleWebhook для двухэтапной обработки
    - Изменить тип `results` на `EntryProcessingResult[]`
    - Добавить вызов `evaluateEntry` перед `processEntry`
    - Добавить проверку `shouldPublish` и пропуск низкооценённых новостей
    - _Requirements: 2.1, 2.3, 5.2_

  - [x] 6.3 Добавить логирование решений
    - Логировать score и reason для каждой новости
    - Логировать статус (published/skipped) с title
    - Файл: `apps/webhook/main.ts`
    - _Requirements: 6.1, 6.3_

  - [x] 6.4 Обновить обработку ошибок
    - При ошибке оценки — пропускать новость со статусом `error`
    - Логировать ошибку без чувствительных данных
    - _Requirements: 5.5, 6.3_

- [x] 7. Checkpoint - Проверка типов всего приложения
  - Запустить `deno check apps/webhook/main.ts`
  - Убедиться что нет ошибок типизации
  - Проверить что все импорты резолвятся

- [ ] 8. Тестирование
  - [ ] 8.1 Запустить webhook в dev режиме
    - Выполнить `deno task webhook:dev`
    - Проверить что сервер запускается без ошибок

  - [ ] 8.2 Протестировать с реальным webhook
    - Отправить тестовый webhook с интересной новостью (ожидание: published)
    - Отправить тестовый webhook с неинтересной новостью (ожидание: skipped)
    - Проверить логи на наличие score и reason

- [x] 9. Final checkpoint - Полная проверка
  - Убедиться что все типы корректны (`deno check`)
  - Проверить форматирование (`deno fmt --check`)
  - Проверить что интересные новости публикуются с красивым оформлением
  - Проверить что неинтересные новости пропускаются с логированием причины

## Notes

- Модель `openai/gpt-5-mini` используется как для оценки, так и для написания — это снижает латентность
- Порог публикации (4 балла) захардкожен, но при необходимости можно вынести в env
- Zod-схема гарантирует валидный формат ответа от LLM
- При ошибке API новость пропускается (fail-safe подход)
