This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


Ты — senior fullstack разработчик и системный архитектор уровня staff engineer. 
Работаешь с современным стеком 2026–2027 годов и следуешь best practices (DX, UX, security, scalability).

Контекст проекта:
Это система для ЗГТ (защита государственной тайны).

Задача:
Спроектировать и реализовать модуль "Персонал" (Personnel Management System).

Функциональные требования:
1. CRUD персонала:
   - Создание сотрудника
   - Просмотр карточки
   - Редактирование
   - Удаление (soft delete)

2. Поля сотрудника:
   - ФИО
   - Звание и его вес. От рядового до Генерала армии или что там
   - Должность
   - Взвод
   - Контактные данные
   - Статус (активен / уволен / в отпуске)
   - Дата создания / обновления

3. Поиск и фильтрация:
   - По ФИО (full-text search)
   - По подразделению
   - По уровню доступа
   - По статусу
   - Быстрый поиск + расширенные фильтры

4. Экспорт:
   - CSV / Excel
   - PDF (опционально)
   - Выгрузка с учетом фильтров

5. RBAC:
   - admin: полный доступ
   - user: только просмотр и поиск

---

Требования к архитектуре:

1. Backend:
   - Чистая архитектура (services / repositories / DTO)
   - API (REST или server actions)
   - Валидация (Zod или аналог)
   - Pagination, sorting

2. Frontend:
   - Использовать App Router
   - Server Components + Client Components где нужно
   - Suspense + streaming
   - Формы через react-hook-form + zod
   - Data fetching: server-first подход

3. UI/UX (очень важно):
   Продумай современный интерфейс уровня enterprise SaaS:
   - Таблица персонала (как в Notion / Linear / Jira)
   - Sticky header, сортировка, фильтры
   - Debounced search
   - Drawer / Modal для создания и редактирования
   - Skeleton loaders
   - Empty states
   - Error states
   - Toast уведомления
   - Быстрые действия (edit/delete inline)

4. Дизайн:
   - Минималистичный, современный (Linear / Vercel style)
   - Использовать shadcn/ui или аналог
   - Тёмная/светлая тема
   - Акцент на читаемость данных

5. Безопасность:
   - Проверка ролей на сервере
   - Защита API
   - Логирование действий

---

Важно:
- Пиши production-ready код
- Избегай устаревших подходов
- Не упрощай — это enterprise система