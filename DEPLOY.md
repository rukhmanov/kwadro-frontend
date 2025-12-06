# Деплой на GitHub Pages

## Автоматический деплой через GitHub Actions

1. Убедитесь, что в репозитории включен GitHub Pages:
   - Перейдите в Settings → Pages
   - В разделе "Source" выберите "GitHub Actions"

2. Запушьте изменения в ветку `main` или `master`:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

3. GitHub Actions автоматически соберет и задеплоит приложение.

## Ручной деплой

Если нужно задеплоить вручную:

1. Установите зависимости (если еще не установлены):
   ```bash
   cd frontend
   npm install
   ```

2. Соберите проект для GitHub Pages:
   ```bash
   npm run build:gh-pages
   ```

3. Задеплойте на GitHub Pages:
   ```bash
   npm run deploy
   ```

   При первом запуске вам нужно будет указать ваш email в команде deploy в `package.json`.

## Настройка base-href

Если ваш репозиторий называется не `kwadro`, измените base-href в `package.json`:

```json
"build:gh-pages": "ng build --configuration production --base-href=/ваше-название-репозитория/"
```

Например, если репозиторий называется `my-shop`, то:
```json
"build:gh-pages": "ng build --configuration production --base-href=/my-shop/"
```

## Настройка API URL

Для работы с бэкендом на GitHub Pages нужно изменить API URL в `api.service.ts`:

1. Задеплойте бэкенд на хостинг (например, Heroku, Railway, Render)
2. Обновите `API_URL` в `frontend/src/app/services/api.service.ts`:

```typescript
const API_URL = 'https://your-backend-url.com';
```

Или используйте переменную окружения:

```typescript
const API_URL = environment.apiUrl || 'http://localhost:3000';
```

И создайте файл `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-url.com'
};
```

## Важные замечания

- Приложение использует HashLocationStrategy (`#` в URL), что необходимо для GitHub Pages
- Все маршруты будут иметь вид: `https://rukhmanov.github.io/kwadro/#/products`
- Убедитесь, что бэкенд поддерживает CORS для вашего домена GitHub Pages




