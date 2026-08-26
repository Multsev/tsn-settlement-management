# Production-запуск «ТСН: Управление посёлком»

## Перед запуском

Нужны Docker Compose, домен с HTTPS, PostgreSQL 16+ и длинный случайный `JWT_SECRET`. Для одного экземпляра допустим именованный Docker volume файлов; для нескольких экземпляров настройте S3-совместимое хранилище через переменные `S3_*` из `.env.example`. Не размещайте секреты в Git.

```bash
export JWT_SECRET="$(openssl rand -base64 48)"
export WEB_ORIGIN="https://tsn.example.ru"
docker compose --profile production up -d --build
curl --fail http://localhost:3000/api/ready
```

Контейнер перед стартом выполняет только накопительные Prisma-миграции (`migrate deploy`), затем одним Node-процессом отдает API и собранный SPA. Завершение по SIGTERM корректно останавливает HTTP-сервер и фоновые задачи. TLS завершается на reverse proxy; при работе за доверенным proxy задайте `TRUST_PROXY=true`.

## Наблюдаемость и безопасность

- `/api/health` — liveness без обращения к БД; `/api/ready` — readiness с запросом PostgreSQL.
- Каждый ответ получает `X-Request-Id`; необработанная ошибка пишет структурированную запись без stack trace в production.
- Включены security headers, лимит JSON 1 МБ, общий rate limit и отдельный лимит входа.
- API не кэшируется service worker. Приватные данные жителя офлайн не сохраняются.
- OpenAPI-схема доступна по `/api/openapi.json`.

## Резервное копирование и восстановление

На машине с PostgreSQL client запускайте регулярный дамп и отдельно копируйте S3 bucket/volume файлов:

```bash
DATABASE_URL="postgresql://..." BACKUP_DIR=/secure/backups npm run backup
```

Восстановление намеренно требует явного подтверждения и выполняется сначала на тестовом окружении:

```bash
DATABASE_URL="postgresql://..." BACKUP_FILE=/secure/backups/tsn-management.dump CONFIRM_RESTORE=1 npm run restore
```

Рекомендуемый режим: ежедневный дамп, 14 дневных и 6 месячных копий, шифрование вне сервера приложения, ежемесячная проверка восстановления. Перед обновлением создайте дамп, затем разверните новый тег; откат приложения выполняйте на предыдущий образ только после проверки совместимости примененных миграций.
