# Бриф для агента на VPS

Это задание для агента, работающего прямо на сервере. Сервер **уже боевой**: на нём
крутятся чужие сервисы. Задача — подселить к ним ещё одно приложение, ничего не сломав.

Репозиторий: `https://github.com/andrewvnukov/storypostingapi`
Базовая инструкция (вариант для пустого сервера): `deploy/README.md` — читать как справочник,
но выполнять не дословно: она предполагает, что сервер ваш целиком.

---

## Что это за приложение

Node 22 + Express, SQLite, ffmpeg. Делает из текста поста Reddit вертикальное видео с
озвучкой и вшитыми субтитрами и публикует его в TikTok через Content Posting API.
Слушает HTTP на одном порту, наружу должен смотреть через существующий обратный прокси
с TLS. Нужен публичный HTTPS-домен: без него не работает OAuth TikTok.

---

## Жёсткие ограничения

Нарушение любого пункта — это поломка чужого продакшена, поэтому они важнее срока.

1. **Ничего чужого не трогать.** Не останавливать, не перезапускать и не менять конфиги
   сервисов, которые уже работают. Исключение — один `reload` прокси после добавления
   своего конфига.
2. **Не удалять `/etc/nginx/sites-enabled/default`** и любые другие существующие сайты.
   В `deploy/README.md` это есть — для занятого сервера пункт не применяется.
3. **Не занимать порты 80/443 своим контейнером.** Их уже держит прокси.
4. **Не выполнять `docker compose down`, `docker system prune`, `docker volume prune`**
   вне каталога этого проекта. Чужие контейнеры и тома этим сносятся.
5. **Любой файл, который правите вне каталога проекта, сначала копировать рядом** с
   суффиксом `.bak-<дата>`.
6. **Firewall не переписывать.** Если нужно открыть порт — добавить правило, не
   пересоздавать набор.
7. **Секреты в git не коммитить.** `.env` держать с правами `600`.
8. Если шаг требует решения, которого нет в этом брифе, — **остановиться и спросить
   владельца**, а не выбирать за него.

---

## Шаг 1. Разведка, до любых изменений

Собрать и показать владельцу:

```bash
# чем занят сервер
systemctl list-units --type=service --state=running --no-pager | head -40
ss -tlnp                                     # занятые порты, в т.ч. 3000
docker ps --format '{{.Names}}\t{{.Ports}}'  # если докер есть

# что служит обратным прокси
command -v nginx caddy traefik
nginx -T 2>/dev/null | grep -E 'server_name|listen|root' | head -40
ls /etc/letsencrypt/live/ 2>/dev/null        # уже выпущенные сертификаты

# ресурсы
df -h /; free -m; nproc
command -v ffmpeg docker git node
```

Из этого следуют три ответа, которые нужны дальше:
- какой прокси стоит (nginx / Caddy / Traefik / иной);
- свободен ли порт 3000, если нет — какой взять;
- есть ли уже сертификат на нужный домен.

## Шаг 2. Спросить владельца

Не угадывать:

1. **Домен или поддомен** для приложения (например `story.example.com`). A-запись на IP
   этого сервера должна существовать — проверить `dig +short <домен>`.
2. Ставить ли **докером** или systemd-юнитом (если докер на сервере не используется —
   второе честнее, образ тянуть незачем).
3. Куда класть проект, если `/srv` занят.

Дальше в тексте: `<домен>` — то, что ответил владелец, `<порт>` — свободный порт.

## Шаг 3. Развернуть приложение

```bash
git clone https://github.com/andrewvnukov/storypostingapi.git /srv/storypostingapi
cd /srv/storypostingapi
cp app/.env.example app/.env && chmod 600 app/.env
```

Заполнить `app/.env`. Значения ключей TikTok и TTS спросить у владельца — их нет в
репозитории и быть не должно:

| Переменная | Значение |
|---|---|
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | из портала разработчика TikTok |
| `TIKTOK_REDIRECT_URI` | `https://<домен>/auth/callback` — посимвольно как в портале |
| `TIKTOK_SCOPES` | `user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | ключ синтеза речи (или переменные ElevenLabs) |

**Докером:**

```bash
echo "APP_PORT=<порт>" >> .env     # файл .env в корне проекта, не app/.env
docker compose up -d --build
docker compose logs --tail=50 app  # ждём "StoryPostingApi on http://localhost:3000"
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:<порт>/   # 200
```

**Без докера:** Node 22 и `ffmpeg` из пакетов, `npm ci --omit=dev` в `app/`, затем
`deploy/storypostingapi.service` — в нём поправить `WorkingDirectory`, `DATA_DIR` и
добавить `Environment=PORT=<порт>`. Запуск: `systemctl enable --now storypostingapi`.

Проверить, что приложение слушает только `127.0.0.1`, а не `0.0.0.0`.

## Шаг 4. Подключить к существующему прокси

Берём **только** серверный блок для своего домена. Файл `deploy/nginx.conf` — образец,
из него нужны директивы, а не структура: редирект с 80 порта и выпуск сертификата у
занятого сервера обычно уже настроены централизованно.

**nginx:** новый файл `/etc/nginx/sites-available/storypostingapi`, симлинк в
`sites-enabled`, затем `nginx -t && systemctl reload nginx`. Обязательно перенести из
образца:

- `client_max_body_size 512M;` — иначе загрузка фоновых клипов обрывается;
- `proxy_read_timeout 600s; proxy_send_timeout 600s;` — рендер ffmpeg длится минуты,
  с дефолтными 60 с запрос рвётся на середине;
- `proxy_set_header X-Forwarded-Proto $scheme;` — без него сессия не переживает редирект
  с TikTok;
- отдачу `/terms.html`, `/privacy.html`, `/tiktok<токен>.txt` и `/brand/` из
  `/srv/storypostingapi` — это требование ревью TikTok, ссылки в заявке и домен
  приложения должны совпадать.

**Caddy:** то же самое втрое короче, TLS Caddy берёт сам:

```caddyfile
<домен> {
    handle /terms.html   { root * /srv/storypostingapi; file_server }
    handle /privacy.html { root * /srv/storypostingapi; file_server }
    handle /brand/*      { root * /srv/storypostingapi; file_server }
    handle /tiktok*.txt  { root * /srv/storypostingapi; file_server }
    handle {
        reverse_proxy 127.0.0.1:<порт> {
            transport http { read_timeout 600s }
        }
    }
    request_body { max_size 512MB }
}
```

**Сертификат:** если на домен его ещё нет и прокси не выпускает сам — выпустить тем же
способом, каким выпущены остальные на этом сервере (посмотреть `/etc/letsencrypt/renewal/`).
Не ставить второй ACME-клиент рядом с существующим.

## Шаг 5. Проверить

```bash
curl -sS -o /dev/null -w 'root        %{http_code}\n' https://<домен>/
curl -sS -o /dev/null -w 'terms       %{http_code}\n' https://<домен>/terms.html
curl -sS -o /dev/null -w 'privacy     %{http_code}\n' https://<домен>/privacy.html
curl -sS -o /dev/null -w 'callback    %{http_code}\n' https://<домен>/auth/callback
curl -sSI https://<домен>/ | grep -i strict-transport  # TLS живой
```

Ожидается: `/` → 200, `terms` и `privacy` → 200, `/auth/callback` → 400 или редирект
(без параметров OAuth это нормально, главное — не 404 и не 502).

И отдельно: убедиться, что **чужие сайты на этом сервере продолжают отвечать**. Проверить
каждый домен из `nginx -T` до и после — это обязательный пункт, не формальность.

## Шаг 6. Что сообщить владельцу

1. Итоговый URL приложения и `redirect_uri`, который он должен вписать в портал TikTok.
2. Какой порт занят на loopback.
3. Какие файлы вне каталога проекта созданы или изменены и где лежат их `.bak`.
4. Результаты проверок из шага 5, включая проверку чужих доменов.
5. Что положить в `data/assets/backgrounds/` свои фоновые клипы — без них студия не
   отрендерит видео.
6. Что на домен нужно заново пройти подтверждение в TikTok: «Свойства URL» → добавить
   `https://<домен>/` → скачанный `tiktok<токен>.txt` положить в `/srv/storypostingapi/`
   (прокси уже отдаёт этот путь) → «Проверять».

## Чего делать не нужно

- Не настраивать CI, мониторинг, бэкапы и алерты — об этом не просили.
- Не менять код приложения. Нашли баг — сообщить, не править.
- Не публиковать ничего в TikTok от имени владельца.
- Не открывать приложение наружу в обход прокси.
