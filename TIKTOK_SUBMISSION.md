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
StoryPostingApi is a web app for creators who make narrated story videos. The user pastes a link
to a public Reddit post (or their own text), picks a background clip, a narration voice, a
speaking speed and a caption style, and the app renders a 1080x1920 video with burned-in captions
and an opening headline card. The user previews the video in the browser, writes the caption, and
publishes it to their own TikTok account through the Content Posting API — immediately or at a
scheduled time. Before each post the app queries the Creator Info endpoint and shows the account
nickname, the privacy options the account allows, the comment/duet/stitch settings and the maximum
video duration, plus the commercial-content disclosure switches; videos with a synthetic voice are
marked as AI-generated content. The app also shows the view, like, comment and share counts of the
connected account's own videos so the creator can see how the published stories performed. Nothing
is published without an explicit action by the user.
```

---

## 2. Продукты (Products)

Добавить:
- **Login Kit** — вход пользователя и получение access/refresh токена.
- **Content Posting API** — публикация.

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

```
Login Kit: the user clicks "Connect TikTok", is sent to the TikTok authorization page and grants the
requested scopes. Tokens are stored encrypted and refreshed automatically; the connected account's
nickname and avatar are shown in the app so the user always sees where a post will go.

Display API: the account page shows the connected account's own profile and stats (user.info.profile,
user.info.stats) and the view/like/comment/share counts of its recent videos (video.list). Only the
authorized account is read.

Story studio: the user pastes a public Reddit post link, the app loads the post text, and the user
edits it, picks a background clip, a voice, a speaking speed and a caption style. The app renders a
1080x1920 video and plays it back for review.

Content Posting API: on the preview screen the app calls /v2/post/publish/creator_info/query/ and
renders the returned data — nickname, allowed privacy levels, comment/duet/stitch toggles with the
disabled ones greyed out, and the maximum video duration, which is compared against the rendered
video. No privacy level is preselected and the Publish button stays disabled until the user picks
one. Turning on content disclosure reveals "Your brand" and "Branded content"; Branded content is
blocked with the private level, and the Music Usage Confirmation link is shown. The AI-generated
content flag is set by default because the narration is a synthetic voice.

Direct Post (video.publish) sends the video to /v2/post/publish/video/init/ and uploads it in chunks;
"Send to drafts" (video.upload) uses /v2/post/publish/inbox/video/init/. The app then polls
/v2/post/publish/status/fetch/ until PUBLISH_COMPLETE and links the published post. Scheduled posts
run through the same calls at the chosen time. The demo video shows this full cycle in the sandbox.
```

---

## 5. Демо-видео — что обязано быть в кадре

Запись экрана, mp4/mov, до 50 МБ, без монтажных обрезок внутри флоу. Снимать в **Sandbox**
(приложение ещё не одобрено). Домен в адресной строке должен совпадать с Website URL из заявки.

1. Главный экран приложения на вашем домене.
2. Нажатие «Connect TikTok» → **экран авторизации TikTok со списком разрешений** (его видно целиком).
3. Возврат в приложение, в интерфейсе виден ник/аватар подключённого аккаунта.
4. Экран аккаунта: подписчики, лайки, плитки своих видео со статистикой (это закрывает
   `video.list` и `user.info.*`).
5. Story studio: вставка ссылки на Reddit → загрузился текст → выбор фона, голоса, стиля субтитров
   → «Generate video».
6. Экран превью: видео играет прямо в браузере.
7. **Экран настроек поста**: выбор privacy level, переключатели комментариев/дуэтов/стичей,
   переключатель коммерческого контента + ссылка Music Usage Confirmation, галка AI-generated content.
8. Нажатие «Publish», затем страница очереди со статусом.
9. Открытый TikTok-аккаунт, где видно опубликованный пост.

Самая частая причина отказа — в видео нет шага 7 или не показан экран согласия на шаге 2.
Каждый запрошенный scope должен быть видно в деле: если не показываете экран статистики — убирайте
`video.list` и `user.info.stats` из заявки.

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
- [ ] Видео помечается как AI-generated (синтетический голос) — галка включена по умолчанию
- [ ] Фоновые клипы, которые вы показываете в демо, принадлежат вам
- [ ] Демо-видео со всеми 7 шагами загружено
- [ ] Redirect URI в настройках приложения совпадает с тем, что реально использует код
