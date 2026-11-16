# Google Analytics для bukiski-hram.net

Поручение владельца: 16 ноября 2026 года. Сайт .net и его аналитика самостоятельны; счётчик .org не переносится и домены не объединяются.

Аккаунт GA4 `68875333`, ресурс `456692884`, веб-поток `8625045913`, Measurement ID `G-RK3WMMM3V2`. Публичные идентификаторы интеграции не являются секретами. Сохранён существующий ресурс; второй старый ресурс `456723197` не удаляется.

## Граница согласия и данных

- `scripts/lib/analytics.mjs` добавляет разметку только в production на `https://bukiski-hram.net`, без префикса. Страницы записок, документов, архивные/noindex страницы и 404 исключены. Браузер независимо проверяет hostname и разрешённый тип страницы.
- До явного согласия нет Google-скрипта, очереди `dataLayer` и запросов GA4. Действия до согласия не накапливаются и не воспроизводятся.
- Равноправные варианты «Без аналитики» и «Разрешить аналитику» есть на шести языках. Выбор с датой хранится 180 дней; недействительная или просроченная запись требует нового выбора. Сайт остаётся работоспособен при недоступном хранилище и блокировщике скриптов.
- «Настройки аналитики» в подвале открывают выбор заново. Отказ мгновенно ставит `ga-disable`, очищает очередь и два cookies `_ga`/`_ga_RK3WMMM3V2`, удаляет script и перезагружает страницу. Отзыв в другой вкладке также останавливает учёт. Global Privacy Control запрещает запуск.
- Google signals и рекламные согласия отключены. Не используются User-ID, адрес электронной почты, Measurement Protocol или междоменное связывание.
- Адрес страницы берётся из canonical без query/hash; referrer ограничен origin. В payload нет имён, сообщений, содержимого форм, поисковых фраз, произвольных URL и названий ссылок. Параметры событий проходят закрытый список типов и значений.
- Разрешены только Google-origin `www.googletagmanager.com` для скрипта и конфигурации, `www.google-analytics.com`, `region1.google-analytics.com`, `analytics.google.com`, `region1.analytics.google.com` и `www.google.com` для конфигурации/измерения. Это явный список семейств коллекторов GA4 вместо широких wildcard из [руководства Google по CSP](https://developers.google.com/tag-platform/security/guides/csp). CSP остаётся без `unsafe-inline`, `unsafe-eval` и wildcard-источников; рекламные домены DoubleClick не добавляются.

## События

| Событие | Когда считается | Дополнительные параметры |
|---|---|---|
| `page_view` | Открытая публичная страница после согласия, один раз | Нет |
| `schedule_view` | Страница расписания | Нет |
| `contacts_view` | Страница контактов | Нет |
| `library_view` | Библиотека | Нет |
| `support_view` | Помощь храму или раздел 1,2 % | Нет |
| `schedule_modal_open` | После успешного открытия окна расписания | Нет |
| `contact_click` | Ссылка телефона, e-mail или WhatsApp | `contact_method`: phone/email/whatsapp |
| `directions_click` | Переход к построению маршрута Google Maps | Нет |
| `map_open` | Переход к OpenStreetMap | Нет |
| `calendar_download` | Файл календаря или создание файла отдельной службы | `download_type`: all_services/single_service, `file_extension`: ics |
| `calendar_subscribe` | Переход к подписке на календарь | Нет |
| `file_download` | Нажатие прямой ссылки PDF/DOC/DOCX или карточки контакта; успешная подготовка файла из HTML-контейнера на странице статьи | Только расширение; у vCard тип contact_card |
| `language_change` | Переход на другую поддерживаемую локаль | `target_language` из списка локалей |
| `library_search` | Ввод в библиотечном поиске с паузой; один раз на странице | Нет, поисковая фраза не передаётся |
| `article_read` | Не менее 30 секунд видимого чтения и прокрутка 60 % после согласия | Нет |
| `scroll` | Прокрутка 90 % после согласия | `percent_scrolled`: 90 |
| `support_details_copy` | Нажатие копирования в блоке реквизитов | Без значения реквизитов |

Общие параметры: `site_language` (локаль сайта), `content_group` (тип страницы), очищенные `page_location` и `page_referrer`. Ключевые цели: переход к маршруту и нажатие контакта; просмотры и чтение не следует автоматически объявлять обращениями в приход. Нажатие ссылки не доказывает совершённый звонок, полученное письмо, перевод денег или посещение храма.

## Источники переходов и кампании

Тег использует очищенный referrer для источников трафика. Для приходских рассылок поддерживается ограниченный словарь UTM-меток: источники facebook/instagram/telegram/viber/newsletter/google/bing/chatgpt.com; каналы social/email/referral/organic/cpc/paid_social/ai-assistant; кампании parish_news/schedule/library/nativity/easter/gpm/seimas/kain. Произвольные значения отбрасываются, полный query не передаётся.

Пример для приходской группы: `https://bukiski-hram.net/ru/?utm_source=viber&utm_medium=social&utm_campaign=parish_news`. Это пример разметки ссылки, а не разрешение на рассылку. Новые значения добавляются в словарь отдельной правкой.

## Проверка и сопровождение

1. `npm run check` проверяет сборку и весь набор тестов. Отдельно `node --test tests/analytics.test.mjs` проверяет переходы согласия и состав payload.
2. В production-сборке проверьте .net, отсутствие тега на `/ru/notes.html`, архивных и тестовых страницах и наличие актуального текста конфиденциальности во всех локалях.
3. Для контрольного посещения используйте `?analytics_debug=1`: параметр включает `debug_mode`, сам query в события не попадает. События проверяются в DebugView/реальном времени. Контрольные посещения нельзя объявлять ростом аудитории.
4. Проверяйте отсутствие Google-скриптов до согласия, появление одного тега после разрешения, отсутствие повторного page_view и полную остановку после отзыва. Отдельно проверяйте экран 390 px и клавиатурную доступность выбора.
5. Автоматические события форм, поисковых фраз, исходящих ссылок, видео, загрузок и изменений history в GA4 выключены, чтобы не дублировать контролируемые события и не передавать свободный текст. Базовый page_view отправляется модулем с `send_page_view: false` в config.

Настройки GA4 и Search Console проверяются непосредственно в интерфейсе, а не только по этому документу. Обычные отчёты обновляются с задержкой; успешная сборка не доказывает доставку события в Google.

Первичные справочники: [согласие](https://developers.google.com/tag-platform/security/concepts/consent-mode), [события GA4](https://developers.google.com/analytics/devguides/collection/ga4/events), [запрет передачи личных сведений](https://support.google.com/analytics/answer/6004245), [связь с Search Console](https://support.google.com/analytics/answer/10737381).


## 2026-11-17: dedicated .net container

The former loader, `/gtag/js?id=G-RK3WMMM3V2`, returned HTTP 404 from Google. This measurement ID existed as a destination of a migrated shared tag, but was absent from that tag's source IDs. The replacement loader uses the dedicated container `GTM-KQFHK588`. The existing GA4 property `456692884`, web stream `8625045913` and measurement ID `G-RK3WMMM3V2` are preserved.

`deploy/analytics-container.json` is the reviewed import configuration for this container. It contains one native Google Analytics destination tag, using the standard Initialization trigger. Its settings disable automatic page views, Google signals and ad personalization; preserve the 180-day host-only analytics cookies; and disable URL passthrough. All automatic event detection, user-provided data collection and contact-data detection are disabled. There are no advertising destinations, cross-domain rules, custom scripts or user-defined variables.

This supersedes earlier references to an on-page `config` command. Standard GTM initializes on load. Static privacy settings now live in the destination tag, and the page queues its sanitized URL, referrer, language, content group and allowed campaign/debug settings with `gtag('set', ...)` before `gtm.start`. Manual events still use `send_to: G-RK3WMMM3V2`. The script remains blocked until explicit consent; advertising consent stays denied; excluded pages and withdrawal behavior are unchanged.

Import this file into `GTM-KQFHK588`, review the workspace differences, and publish the matching container version. A saved export or passing build does not verify publication or delivery. After deployment, verify the live asset version, loader HTTP 200, exactly one manual `page_view`, `schedule_modal_open`, and GA4 receipt. Check that collect requests target only GRK, omit arbitrary query strings/fragments and private content, and that no Google requests occur before consent or on prayer-request pages. Recheck withdrawal and reload. Control visits are test traffic, not audience growth.

References: [standard and legacy initialization](https://support.google.com/analytics/answer/18411054), [event routing](https://developers.google.com/tag-platform/gtagjs/routing).
