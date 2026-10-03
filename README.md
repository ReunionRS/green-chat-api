# Green Chat

React-клиент для отправки и получения текстовых сообщений через GREEN-API.

**Демо:** https://frontendchat-65ec1.web.app/

## Возможности

- подключение нескольких инстансов Telegram и WhatsApp;
- переключение и удаление подключений;
- создание чатов, отправка и получение текстовых сообщений;
- список чатов, аватары и поиск;
- хранение подключений и истории в Firebase Firestore;
- шифрование текста сообщений перед сохранением в Firestore;
- светлая и тёмная темы, выбор эмодзи;
- адаптивный интерфейс и установка как PWA;
- звук входящего сообщения, пока приложение открыто.

## Стек

- React 19, TypeScript, Vite;
- Firebase Authentication и Cloud Firestore;
- GREEN-API;
- `emoji-picker-react` и `react-phone-number-input`.

## Локальный запуск

Понадобится Node.js 20 или новее.

```bash
git clone https://github.com/ReunionRS/green-chat-api.git
cd green-chat-api
npm install
```

Скопируйте `.env.example` в `.env.local`, заполните значения и запустите проект:

```bash
npm run dev
```

Проверка и production-сборка:

```bash
npm run lint
npm run build
npm run preview
```

## Настройка Firebase Console

1. Откройте [Firebase Console](https://console.firebase.google.com/) и создайте проект.
2. В настройках проекта выберите **Your apps → Web (`</>`)**, зарегистрируйте веб-приложение и скопируйте значения из объекта `firebaseConfig`.
3. Откройте **Build → Authentication → Sign-in method**, включите провайдер **Anonymous** и сохраните настройку. Приложение вызывает `signInAnonymously`, поэтому без этого вход в Firestore работать не будет.
4. Откройте **Build → Firestore Database → Create database**, выберите регион и создайте базу в production mode.
5. Установите [Firebase CLI](https://firebase.google.com/docs/cli), авторизуйтесь и выберите созданный проект:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

6. Опубликуйте правила из `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

Правила разрешают пользователю читать и изменять только документы внутри `users/{uid}`. Для тестового приложения используется анонимный Firebase-пользователь; после удаления данных сайта или смены браузерного профиля будет создан другой UID.

### Переменные Firebase

Заполните `.env.local` значениями из настроек веб-приложения:

```env
VITE_GREEN_API_URL=https://api.green-api.com
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_APP_ID=your_app_id
```

Firebase Web API key является идентификатором клиентского приложения и всё равно попадает в браузерную сборку. Защита данных обеспечивается Authentication и Firestore Security Rules. Не добавляйте в проект Firebase Admin SDK JSON, приватный ключ service account или содержимое `.env.local`.

Официальные инструкции: [добавление Firebase в Web-проект](https://firebase.google.com/docs/web/setup), [анонимная авторизация](https://firebase.google.com/docs/auth/web/anonymous-auth), [создание Firestore](https://firebase.google.com/docs/firestore/quickstart).

## Настройка аккаунта GREEN-API

1. Зарегистрируйтесь в [личном кабинете GREEN-API](https://console.green-api.com/).
2. Нажмите **Создать инстанс** и выберите подходящий продукт и тариф. Для тестирования можно использовать доступный тестовый тариф.
3. Откройте созданный инстанс и выполните его авторизацию:
   - для WhatsApp нажмите **Получить QR**, затем в мобильном WhatsApp откройте **Связанные устройства → Привязка устройства** и отсканируйте QR-код;
   - для Telegram следуйте способу авторизации, показанному в кабинете Telegram-инстанса.
4. Дождитесь статуса **Авторизован**. После создания подготовка инстанса может занять несколько минут.
5. На странице инстанса скопируйте:
   - `idInstance` — идентификатор инстанса;
   - `apiTokenInstance` — секретный ключ доступа.
6. Откройте Green Chat, выберите Telegram или WhatsApp, вставьте оба значения и нажмите **Войти**.

Приложение само включает получение входящих уведомлений через HTTP API. Webhook и Cloudflare Worker для локального запуска не требуются.

`apiTokenInstance` не относится к `.env`: это пользовательское подключение, которое вводится через интерфейс. Не публикуйте токен в README, GitHub, скриншотах или issue. При компрометации обновите токен в личном кабинете GREEN-API.

Официальная инструкция: [перед началом работы с GREEN-API](https://green-api.com/docs/before-start/).

## Развёртывание на Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

Для публикации Hosting и правил одной командой:

```bash
firebase deploy --only hosting,firestore:rules
```

## Структура проекта

```text
src/
├── components/   # компоненты интерфейса
├── hooks/        # состояние и бизнес-логика
├── firebase/     # Authentication и Firestore
├── crypto/       # шифрование текста сообщений
├── assets/       # изображения и звук
├── greenApi.ts   # запросы к GREEN-API
└── types.ts      # общие типы
```

## Ограничения

- поддерживаются только текстовые сообщения;
- входящие сообщения принимаются через HTTP API GREEN-API;
- системные push-уведомления не используются;
- звук работает, пока приложение открыто и браузер разрешает воспроизведение;
- доступность аватаров и сведений о контакте зависит от продукта, тарифа и настроек инстанса GREEN-API.
