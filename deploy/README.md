# Развёртывание на VPS

Ubuntu 22.04/24.04 или Debian 12, пользователь с sudo, домен, A-запись которого
указывает на IP сервера. Ниже везде замените `example.com` на свой домен.

Приложение слушает только loopback, наружу смотрит nginx с сертификатом Let's Encrypt.
Страницы `terms.html`, `privacy.html` и файл подтверждения TikTok отдаются nginx прямо
из клона репозитория — так домен приложения и ссылки в заявке совпадают, а именно это
проверяет ревью.

## 1. Докер и клон

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo mkdir -p /srv && sudo chown "$USER" /srv
git clone https://github.com/andrewvnukov/storypostingapi.git /srv/storypostingapi
cd /srv/storypostingapi
```

## 2. Настройки

```bash
cp app/.env.example app/.env
nano app/.env
```

Заполнить:

| Переменная | Значение |
|---|---|
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | из «Реквизиты для входа» в портале |
| `TIKTOK_REDIRECT_URI` | `https://example.com/auth/callback` — ровно эта строка должна стоять и в портале |
| `TIKTOK_SCOPES` | `user.info.basic,user.info.profile,user.info.stats,video.list,video.upload,video.publish` |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `OPENAI_API_KEY` | ключ для синтеза речи (или переменные ElevenLabs) |

`DATA_DIR`, `TRUST_PROXY` и `COOKIE_SECURE` compose проставляет сам — в `.env` их писать не нужно.

## 3. Запуск

```bash
docker compose up -d --build
docker compose logs -f app     # ждём "StoryPostingApi on http://localhost:3000"
```

База, отрендеренные видео и фоновые клипы лежат в `/srv/storypostingapi/data` и
переживают пересборку образа. Свои фоны кладите в `data/assets/backgrounds/`.

## 4. nginx и сертификат

```bash
sudo apt update && sudo apt install -y nginx certbot
sudo cp deploy/nginx.conf /etc/nginx/sites-available/storypostingapi
sudo sed -i 's/example\.com/ВАШ-ДОМЕН/g' /etc/nginx/sites-available/storypostingapi
sudo ln -sf /etc/nginx/sites-available/storypostingapi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo mkdir -p /var/www/certbot
```

Сертификат берём до того, как включим 443, иначе nginx не стартует без файлов ключа:

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d ВАШ-ДОМЕН --agree-tos -m ваша@почта --no-eff-email
sudo nginx -t && sudo systemctl reload nginx
```

Если `certbot certonly` не проходит, потому что 80-й порт ещё не отдаёт challenge,
временно оставьте в конфиге только первый `server`-блок, получите сертификат,
затем верните второй.

Обновление сертификата certbot ставит в cron сам; проверить — `sudo certbot renew --dry-run`.

## 5. Что поменять в заявке TikTok

| Поле | Значение |
|---|---|
| Website URL | `https://example.com/` |
| Условия использования URL | `https://example.com/terms.html` |
| URL политики конфиденциальности | `https://example.com/privacy.html` |
| Redirect URI (Login Kit) | `https://example.com/auth/callback` |

Домен нужно заново подтвердить: **Свойства URL → добавить** `https://example.com/`,
скачать выданный `tiktok<токен>.txt`, положить его в корень `/srv/storypostingapi`,
`git add` не обязателен — nginx отдаёт файл с диска. Затем «Проверять».

Демо-видео снимайте на этом же домене: правило ревью — домен в кадре совпадает с
Website URL.

## 6. Обновление

```bash
cd /srv/storypostingapi && git pull && docker compose up -d --build
```

## Без докера

Если докер не нужен: Node 22, `apt install ffmpeg`, `npm ci --omit=dev` в `app/`,
и systemd-юнит из `deploy/storypostingapi.service`. Пути и переменные в нём те же.
