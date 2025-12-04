# Настройка GitHub Pages для MOTOмаркет

## Что было добавлено:

1. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
   - Автоматический деплой при пуше в main/master
   - Сборка проекта с правильным base-href

2. **Конфигурация для GitHub Pages**:
   - `angular.json` - добавлена конфигурация `gh-pages`
   - `package.json` - добавлены скрипты `build:gh-pages` и `deploy`
   - `app.config.ts` - добавлен HashLocationStrategy для работы роутинга

3. **Файлы окружения**:
   - `src/environments/environment.ts` - для разработки
   - `src/environments/environment.prod.ts` - для продакшена
   - `api.service.ts` - обновлен для использования environment

4. **Вспомогательные файлы**:
   - `.nojekyll` - отключает обработку Jekyll на GitHub Pages
   - `404.html` - редирект для SPA
   - `DEPLOY.md` - инструкции по деплою

## Шаги для деплоя:

### 1. Включите GitHub Pages в настройках репозитория:
   - Settings → Pages
   - Source: выберите "GitHub Actions"

### 2. Обновите API URL для продакшена:
   Откройте `src/environments/environment.prod.ts` и замените:
   ```typescript
   apiUrl: 'http://localhost:3000'
   ```
   на URL вашего бэкенда:
   ```typescript
   apiUrl: 'https://your-backend-url.com'
   ```

### 3. Если репозиторий называется не `kwadro`:
   Обновите base-href в следующих файлах:
   - `angular.json` (конфигурация `gh-pages`)
   - `404.html` (переменная `basePath`)
   - `package.json` (скрипт `build:gh-pages`)

### 4. Запушьте изменения:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

### 5. Проверьте деплой:
   - Перейдите в Actions вкладку на GitHub
   - Дождитесь завершения workflow
   - Приложение будет доступно по адресу: `https://rukhmanov.github.io/kwadro/`

## Важные замечания:

- Приложение использует HashLocationStrategy, поэтому все URL будут с `#`:
  - `https://rukhmanov.github.io/kwadro/#/products`
  - `https://rukhmanov.github.io/kwadro/#/cart`

- Убедитесь, что бэкенд поддерживает CORS для домена GitHub Pages

- Для работы WebSocket чата нужно обновить URL в `chat.service.ts` (если используется)

