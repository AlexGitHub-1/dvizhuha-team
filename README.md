# dvizhuha-gamejam

Создай клиентскую веб-игру на React и TypeScript без серверной части (полностью client-side, работающую в браузере) в жанре Tower Offense (Reverse Tower Defense) под названием «SIEGE: March of Doom».

1. Игровое поле на HTML5 Canvas с поддержкой адаптивного размера:
   - Атмосферная стилизованная карта темного фэнтези (извилистая дорога от спавна орды к воротам замка, обочины, декорации).
   - Вдоль дороги расставлены защитные башни людей:
     * Башня лучников (быстрый темп стрельбы, одиночный урон).
     * Пушечный бастион (медленный темп, сплеш-урон ядрами).
     * Магический обелиск (замедляющие ледяные/молниевые лучи).
   - В конце дороги — Главные Ворота Цитадели (HP бар, цель миссии — пробить ворота).

2. Система призыва юнитов Орды (игрок):
   - Ресурс (Эссенция / Золото), накапливающийся со временем.
   - 4 типа юнитов с уникальными ролями:
     * Гоблин-разведчик (дешевый, быстрый, мало HP — отвлекает огонь).
     * Осадный Тролль (медленный танк с огромным запасом HP и защитой).
     * Гоблин-подрывник (несет бочку, детонирует при приближении к башням/воротам).
     * Тёмный Шаман (аура регенерации и ускорения союзников рядом).
   - Нижняя UI-панель карточек призыва с кулдаунами, стоимостью и шорткатами (клавиши 1, 2, 3, 4).

3. Интерактивность и боевая система:
   - Башни сканируют радиус, наводятся и выпускают снаряды (снаряды летят с физикой, частицами).
   - Подрывники могут атаковать ближайшие башни или взрывать ворота.
   - Активное заклинание командира (клавиша Space / кнопка): «Боевой марш» (ускорение всех идущих войск на 3 сек).
   - Попадания, разрушения башен, эффект взрыва ворот, screen shake (тряска экрана), визуальные эффекты частиц.

4. Звуки и геймплейный цикл:
   - Звуковые эффекты на чистом Web Audio API (выстрелы стрел, залп пушки, взрыв бочки, призыв юнитов, фанфары победы / поражения) с кнопкой включения/выключения звука.
   - Полный игровой цикл: стартовое меню / туториал, активный бой, экран победы и экран поражения с возможностью перезапуска.
   - Чистый, модульный код на React + TS, плавные 60 FPS на requestAnimationFrame.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dvizhuha-gamejam.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/aae7acdb-faf3-4858-8589-313bfeee74b2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
