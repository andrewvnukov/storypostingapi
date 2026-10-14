# Заявка в TikTok for Developers — StoryPostingApi

Готовые тексты для формы `developers.tiktok.com/app/7696178130269063188`.
Английские блоки — копировать как есть, русский текст — пояснения.

Базовый URL сайта (GitHub Pages): `https://andrewvnukov.github.io/content-farm-legal/`

---

## 1. Основная информация (Basic information)

| Поле | Значение |
|---|---|
| Название приложения | `StoryPostingApi` (в портале сейчас опечатка — **Stoty**, исправить) |
| Категория | **Productivity** (запасной вариант — Business / Social) |
| Website URL | `https://andrewvnukov.github.io/content-farm-legal/` |
| Условия использования URL | `https://andrewvnukov.github.io/content-farm-legal/terms.html` |
| URL политики конфиденциальности | `https://andrewvnukov.github.io/content-farm-legal/privacy.html` |
| Платформы | **Web** (только то, что реально показано в демо-видео) |
| Иконка | 1024×1024 PNG/JPG, без логотипа TikTok и без слова «TikTok» в самой иконке |

### Описание (Description)

```
StoryPostingApi is a web publishing tool for creators. After connecting their own TikTok
account with TikTok Login Kit, a user uploads a video or a set of images, writes the caption,
chooses the privacy level and the comment/duet/stitch settings, and publishes the post to their
own TikTok account through the Content Posting API. Before each post the app queries the Creator
Info endpoint and shows the account nickname, the privacy options the account allows and the
maximum video duration, plus the branded-content and "your brand" disclosure switches. Nothing is
uploaded or published without an explicit action by the user. The app does not read other users'
data and does not generate engagement.
```

---

## 2. Продукты (Products)

Добавить:
- **Login Kit** — вход пользователя и получение access/refresh токена.
- **Content Posting API** — публикация.

## 3. Области применения (Scopes)

| Scope | Зачем |
|---|---|
| `user.info.basic` | показать, в какой аккаунт идёт публикация (ник, аватар) |
| `video.upload` | загрузка в черновики («Inbox») — пользователь дописывает и публикует в самом TikTok |
| `video.publish` | **Direct Post** — публикация сразу из приложения |

Если используете и фото-посты — они идут тем же продуктом Content Posting API (`video.publish`).

> Не добавляйте scope «про запас». Каждый неиспользуемый scope нужно показать в видео, иначе отказ.

---

## 4. «Необходимая информация для отправки приложения» (поле на 1000 символов)

```
Login Kit: the user clicks "Connect TikTok", is sent to the TikTok authorization page and grants
user.info.basic, video.upload and video.publish. We store the access and refresh tokens encrypted
and show the user's nickname and avatar in the header so the user always sees which account is
connected.

Content Posting API: on the "New post" screen the user uploads a video file or images and writes a
caption. The app calls /v2/post/publish/creator_info/query/ and renders the returned data: nickname,
allowed privacy levels (Public / Friends / Private), comment, duet and stitch toggles with the
disabled ones greyed out, and the maximum video duration. The user must pick a privacy level before
the Post button is enabled. If the user turns on commercial content disclosure, the app shows the
"Your brand" / "Branded content" options and the TikTok Music Usage Confirmation link, and blocks
the combination of Branded content with the Private privacy level.

Direct Post (video.publish) sends the content to /v2/post/publish/video/init/ ; Upload to drafts
(video.upload) sends it to /v2/post/publish/inbox/video/init/. The app then polls
/v2/post/publish/status/fetch/ and shows the result to the user. The demo video shows this full
cycle in the sandbox environment.
```

---

## 5. Демо-видео — что обязано быть в кадре

Запись экрана, mp4/mov, до 50 МБ, без монтажных обрезок внутри флоу. Снимать в **Sandbox**
(приложение ещё не одобрено). Домен в адресной строке должен совпадать с Website URL из заявки.

1. Главный экран приложения на вашем домене.
2. Нажатие «Connect TikTok» → **экран авторизации TikTok со списком разрешений** (его видно целиком).
3. Возврат в приложение, в интерфейсе виден ник/аватар подключённого аккаунта.
4. Загрузка файла, ввод описания.
5. **Экран настроек поста**: выбор privacy level, переключатели комментариев/дуэтов/стичей,
   переключатель коммерческого контента + ссылка Music Usage Confirmation.
6. Нажатие «Post», статус публикации.
7. Открытый TikTok-аккаунт, где видно опубликованный пост.

Самая частая причина отказа — в видео нет шага 5 или не показан экран согласия на шаге 2.

---

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
- [ ] Описание заполнено
- [ ] Terms URL и Privacy URL открываются публично и отдают 200
- [ ] Домен подтверждён в **URL properties** (все три verification-строки на месте)
- [ ] Платформа: Web
- [ ] Продукты: Login Kit + Content Posting API
- [ ] Scopes: только используемые
- [ ] Демо-видео со всеми 7 шагами загружено
- [ ] Redirect URI в настройках приложения совпадает с тем, что реально использует код
