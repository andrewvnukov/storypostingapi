# Заявка в TikTok for Developers — StoryPostingApi

Готовые тексты для формы `developers.tiktok.com/app/7696178130269063188`.
Английские блоки — копировать как есть, русский текст — пояснения.

---

## 0. Домен и подтверждение (сделано)

Репозиторий переименован, базовый URL сайта:

`https://andrewvnukov.github.io/storypostingapi/`

Для этого URL property выдан токен `06MgudZLgvlHbaZspQ9P9BKHxWqzaDFz`. Он положен в репозиторий
двумя способами сразу, чтобы проверка прошла при любом из них:

- файл `tiktok06MgudZLgvlHbaZspQ9P9BKHxWqzaDFz.txt` в корне — ровно то, что отдаёт портал;
- `<meta name="tiktok-developers-site-verification" content="06Mgud…">` в `index.html`.

Старые токены (`s8XGdmU…`, `ofXYhwA…`, `Tb8MQg7…`) и файлы `confirm.txt` /
`tiktoks2lVg….txt` оставлены на месте — они подтверждают прежние URL properties, удалять их
до окончания ревью не нужно.

> GitHub Pages публикует ветку `main`. Файл с токеном попадает на сайт только после слияния
> PR #1 — до этого кнопка «Проверять» в портале вернёт ошибку.

### После развёртывания на VPS

GitHub Pages — статика, Login Kit на ней не работает: `redirect_uri` должен вести на
`/auth/callback` самого приложения. Как поднимете приложение на своём домене
(`deploy/README.md`), URL в заявке меняются на него:

| Поле | Значение |
|---|---|
| Website URL | `https://<домен>/` |
| Условия использования URL | `https://<домен>/terms.html` |
| URL политики конфиденциальности | `https://<домен>/privacy.html` |
| Redirect URI | `https://<домен>/auth/callback` |

nginx из `deploy/nginx.conf` отдаёт `terms.html`, `privacy.html` и файл подтверждения
с того же домена, так что ссылки в заявке, домен в демо-видео и адрес приложения совпадают —
именно этого требует ревью. Домен нужно будет подтвердить в **Свойства URL** заново.

---

## 1. Основная информация (Basic information)

| Поле | Значение |
|---|---|
| Название приложения | `StoryPostingApi` (в портале сейчас опечатка — **Stoty**, исправить) |
| Категория | **Productivity** (запасной вариант — Business / Social) |
| Website URL | `https://andrewvnukov.github.io/storypostingapi/` |
| Условия использования URL | `https://andrewvnukov.github.io/storypostingapi/terms.html` |
| URL политики конфиденциальности | `https://andrewvnukov.github.io/storypostingapi/privacy.html` |
| Платформы | **Web** (только то, что реально показано в демо-видео) |
| Иконка | 1024×1024 PNG/JPG, без логотипа TikTok и без слова «TikTok» в самой иконке |

### Описание (Description) — максимум 120 символов

Полная версия тут не нужна: вся история про API идёт в поле на 1000 символов (раздел 4).
Здесь нужна одна строка. Основной вариант — 101 символ:

```
Turn a Reddit story into a captioned vertical video and post it to your TikTok, now or on a schedule.
```

Запасные, если захочется другой акцент:

```
Turns Reddit stories into captioned 1080x1920 videos and posts them to your TikTok now or on a schedule.
```
```
Make captioned vertical story videos from Reddit posts and publish them to your own TikTok on a schedule.
```

Не вписывайте сюда слова вроде automation, bulk, mass или farm — на этом поле ревью спотыкается
чаще всего.

---

## 2. Продукты (Products)

Добавить:
- **Login Kit** — вход пользователя и получение access/refresh токена.
- **Content Posting API** — публикация (Direct Post и черновики).
- **Display API** — экран аккаунта: профиль, статистика, список своих видео.

## 3. Области применения (Scopes)

| Scope | Зачем | Где в демо-видео |
|---|---|---|
| `user.info.basic` | ник и аватар — видно, в какой аккаунт идёт публикация | шапка после входа |
| `user.info.profile` | профиль аккаунта на экране мониторинга | экран аккаунта |
| `user.info.stats` | подписчики / лайки / число видео | экран аккаунта |
| `video.list` | просмотры и лайки своих опубликованных видео | экран аккаунта |
| `video.upload` | загрузка в черновики TikTok | переключатель «Send to my TikTok drafts» |
| `video.publish` | **Direct Post** — публикация сразу из приложения | кнопка Publish |

Продукты: **Login Kit** (вход) + **Content Posting API** (публикация) + **Display API**
(`video.list`, `user.info.*` — экран мониторинга).

> Не добавляйте scope «про запас». Каждый неиспользуемый scope нужно показать в видео, иначе отказ.

---

## 4. «Необходимая информация для отправки приложения» (поле на 1000 символов)

Блок ниже — 983 символа, влезает без правок. Если дописываете что-то своё — сначала уберите
столько же, иначе портал обрежет текст на середине предложения.

```
Login Kit: the user clicks "Connect TikTok", grants the scopes on TikTok's page, and the app then shows the connected nickname and avatar.

Display API: the account page shows that account's own profile, stats and the view/like counts of its own recent videos only.

Content Posting API: the user pastes a public Reddit link, edits the text, picks a background, a voice and a caption style, and the app renders a 1080x1920 video with burned-in captions. The preview screen calls creator_info/query and renders the result: nickname, allowed privacy levels with none preselected, comment/duet/stitch toggles with disabled ones greyed out, and the max duration, checked against the video. Disclosure reveals Your brand / Branded content, blocked with the private level, and the Music Usage Confirmation link. AI-generated content is on by default (synthetic voice). Publish calls video/init (inbox/video/init for drafts), uploads in chunks and polls status/fetch until PUBLISH_COMPLETE.
```

---

## 5. Демо-видео

Подробный сценарий со съёмкой, подготовкой песочницы и сжатием до 50 МБ вынесен в
отдельный файл: **`DEMO_VIDEO.md`**. Коротко — что обязано быть в кадре:

1. Главный экран приложения на вашем домене.
2. Нажатие «Connect TikTok» → **экран авторизации TikTok со списком разрешений** целиком.
3. Возврат в приложение, в шапке ник и аватар подключённого аккаунта.
4. Экран аккаунта: подписчики, лайки, плитки своих видео со статистикой.
5. Story studio: ссылка на Reddit → текст загрузился → выбор фона, голоса, стиля субтитров.
6. Экран превью: видео играет прямо в браузере.
7. **Экран настроек поста**: privacy level, переключатели комментариев/дуэтов/стичей,
   коммерческий контент + ссылка Music Usage Confirmation, галка AI-generated content.
8. Нажатие «Publish», страница очереди со статусом.
9. Открытый TikTok-аккаунт с опубликованным постом.

Самая частая причина отказа — нет шага 7 или не показан экран согласия на шаге 2.

## 6. Обязательные требования UX, которые проверяет ревью

- Перед публикацией вызывать `creator_info/query` и показывать **реальные** значения оттуда,
  а не захардкоженный список.
- Privacy level не имеет значения по умолчанию — пользователь выбирает сам.
- Недоступные опции (комментарии/дуэт/стич выключены в аккаунте) — показывать неактивными, не скрывать.
- При включённом Branded content запретить privacy = SELF_ONLY/Private.
- Показывать ссылку на Music Usage Confirmation при раскрытии коммерческого контента.
- Текст согласия: «By posting, you agree to TikTok's Music Usage Confirmation» (и Branded Content Policy,
  если включён branded content).
- До прохождения аудита все посты неаудированного клиента публикуются только как приватные (SELF_ONLY),
  и аккаунт-тестер должен быть добавлен в Sandbox.

---

## 7. Чек-лист перед «Отправить на рассмотрение»

- [ ] Опечатка в названии исправлена (`StoryPostingApi`)
- [ ] Иконка 1024×1024 загружена
- [ ] Категория выбрана
- [ ] Описание влезает в 120 символов
- [x] Репозиторий переименован в `storypostingapi`
- [ ] PR слит в `main`, файл с токеном отдаётся по новому адресу
- [ ] URL property подтверждён кнопкой «Проверять»
- [ ] Terms URL и Privacy URL открываются публично и отдают 200
- [ ] Домен подтверждён в **URL properties** (все три verification-строки на месте)
- [ ] Платформа: Web
- [ ] Продукты: Login Kit + Content Posting API + Display API
- [ ] Scopes: только используемые
- [ ] Видео помечается как AI-generated (синтетический голос) — галка включена по умолчанию
- [ ] Фоновые клипы, которые вы показываете в демо, принадлежат вам
- [ ] Демо-видео со всеми 9 шагами загружено
- [ ] Redirect URI в настройках приложения совпадает с тем, что реально использует код
