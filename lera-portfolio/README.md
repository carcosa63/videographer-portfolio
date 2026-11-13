# Портфолио видеографа

Обычный статический сайт. Сборка не нужна.

## Посмотреть у себя на компьютере
Открывать index.html двойным кликом нельзя, нужен локальный сервер:

    python -m http.server 8000

и открыть http://localhost:8000

## Выложить в интернет (бесплатно)
1. Создайте на github.com репозиторий `lera-portfolio` (публичный) и загрузите в него все файлы из этой папки.
2. В admin/config.yml замените ВАШ_ЛОГИН на ваш логин GitHub.
3. На netlify.com войдите через GitHub, нажмите Add new site → Import an existing project, выберите репозиторий.
   Build command оставьте пустым, Publish directory: `.`
4. Вход в админку. Netlify умеет авторизовать Decap CMS через GitHub:
   - на GitHub создайте OAuth App (Settings → Developer settings → OAuth Apps), Authorization callback URL: `https://api.netlify.com/auth/done`;
   - в настройках сайта на Netlify найдите раздел OAuth (Site configuration → Access & security), подключите GitHub и вставьте Client ID и Secret.
   Названия пунктов меню могут отличаться, ищите по слову OAuth.
5. Пригласите Леру в репозиторий: Settings → Collaborators → Add people. У неё должен быть бесплатный аккаунт GitHub.

## Как Лера добавляет работы
1. Открывает `адрес-сайта/admin`, нажимает Login with GitHub.
2. Сайт → Работы → Добавить работу.
3. Заливает видео на YouTube (доступ «по ссылке» или открытый), вставляет ссылку, пишет название, нажимает Publish.
4. Через 1–2 минуты работа появляется на сайте.

Посетители видят только готовые страницы и ничего изменить не могут.
