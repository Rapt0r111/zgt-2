Ты — senior fullstack разработчик и системный архитектор уровня staff engineer.
Работаешь с современным стеком 2026–2027 годов и следуешь best practices (DX, UX, security, scalability).

Контекст проекта:
Это система для ЗГТ (защита государственной тайны), где критически важны:

* строгий учёт техники
* контроль перемещений
* аудит действий
* отказоустойчивость

Задача:
Спроектировать и реализовать модуль "Вычислительная техника" (Equipment Management System).

---

## Функциональные требования:

### 1. Основная сущность: вычислительная техника

Типы:

* ПЭВМ
* АРМ
* Ноутбук
* Сервер
* Что-то своё

Поля:

* Тип устройства
* Инвентарный номер (МО) — уникальный, может быть пустой
* Серийный номер
* МНИ серийный номер - может быть пустой
* Производитель - может быть пустой
* Модель - может быть пустой

Технические характеристики:

* CPU - может быть пустой
* RAM - может быть пустой
* Тип хранилища (HDD/SSD/NVMe) - может быть пустой
* Объём хранилища - может быть пустой
* Операционная система - может быть пустой

Состояние:

* Статус:
  * В работе
  * На складе
  * В ремонте
  * Сломан
* Исправность (boolean)
* Местоположение (строка или сущность)
* Владелец (ссылка на personnel) - может быть пустой

---

### 2. Комплектность устройства

Каждое устройство может иметь комплект:

* Ноутбук
* Зарядка
* Мышь
* Сумка

Для каждого элемента:

* Наличие (boolean)
* Исправность (boolean)

Важно:

* Комплект — отдельная вложенная структура
* Возможность частичной утраты/повреждения

---

### 3. Накопители (StorageDevice)

Отдельная сущность, связанная с устройством:

Поля:

* Тип (HDD/SSD)
* Инвентарный номер - может быть пустой
* Серийный номер
* Производитель - может быть пустой
* Модель - может быть пустой
* Ёмкость - может быть пустой
* Интерфейс (SATA/NVMe и т.д.) - может быть пустой

Особенности:

* Один ко многим (device → storage devices)
* Возможность отдельного учёта и перемещения

---

### 4. Прочая электроника

Типы:

* Телевизоры
* Проекторы
* Доски и т.д.

Поля:

* display_name
* Серийный номер (обязательный)
* Инвентарный номер - может быть пустой

Без технических характеристик (CPU/RAM)

---

### 5. Массовые операции (КРИТИЧЕСКИ ВАЖНО)

Реализовать batch операции:

* Массовая выдача
* Массовая сдача
* Массовое перемещение

Требования:

* Выбор нескольких устройств
* Одна операция → много записей
* Транзакционность (all-or-nothing)
* Отображение результата (успех / ошибки)

---

### 6. История перемещений (audit trail)

Отдельная сущность:

Поля:

* device_id
* from_location
* to_location
* from_person
* to_person
* Тип операции:

  * выдача
  * возврат
  * перемещение
  * ремонт
* Документ-основание
* Дата/время
* Кто выполнил действие

Требования:

* Полная неизменяемая история
* Нельзя редактировать записи
* Только append-only

---

### 7. Поиск и фильтрация

* Full-text search

* По:

  * инвентарному номеру
  * серийному номеру
  * владельцу
  * статусу
  * типу устройства
  * местоположению

* Расширенные фильтры + быстрый поиск

---

### 8. Экспорт

* Excel / CSV
* Печать
* Экспорт с учетом фильтров

---

## Требования к архитектуре:

### 1. Backend:

* Чистая архитектура:

  * entities
  * repositories
  * services
  * DTO
* Транзакции (особенно для batch операций)
* Валидация (Zod или аналог)
* Частичные индексы (для inventory_number)
* Pagination / sorting / filtering
* Логирование всех операций

---

### 2. Frontend:

* Next.js App Router
* Server Components (по максимуму)
* Client Components для интерактива
* Suspense + streaming
* Формы:

  * react-hook-form + zod
* Data fetching:

  * server-first

---

### 3. UI/UX (очень важно):

Интерфейс уровня enterprise (Linear / Notion / Jira):

* Таблица техники:

  * sticky header
  * сортировка
  * фильтры
  * выбор нескольких строк (checkbox)

* Массовые действия (toolbar)

* Drawer / Modal:

  * создание
  * редактирование
  * просмотр карточки

* История устройства (timeline)

* Skeleton loaders

* Empty states

* Error states

* Toast уведомления

---

### 4. Дизайн:

* shadcn/ui
* Тёмная и светлая тема
* Максимальная читаемость таблиц

Важно:

* Пиши production-ready код
* Учитывай масштабирование (тысячи устройств)
* Не упрощай — это система уровня госструктуры
* Предлагай улучшения, если видишь архитектурные риски





Proxy
Last updated April 6, 2026
Proxy
Good to know: Starting with Next.js 16, Middleware is now called Proxy to better reflect its purpose. The functionality remains the same.

Proxy allows you to run code before a request is completed. Then, based on the incoming request, you can modify the response by rewriting, redirecting, modifying the request or response headers, or responding directly.

Use cases
Some common scenarios where Proxy is effective include:

Modifying headers for all pages or a subset of pages
Rewriting to different pages based on A/B tests or experiments
Programmatic redirects based on incoming request properties
For simple redirects, consider using the redirects configuration in next.config.ts first. Proxy should be used when you need access to request data or more complex logic.

Proxy is not intended for slow data fetching. While Proxy can be helpful for optimistic checks such as permission-based redirects, it should not be used as a full session management or authorization solution.

Using fetch with options.cache, options.next.revalidate, or options.next.tags, has no effect in Proxy.

Convention
Create a proxy.ts (or .js) file in the project root, or inside src if applicable, so that it is located at the same level as pages or app.

Note: While only one proxy.ts file is supported per project, you can still organize your proxy logic into modules. Break out proxy functionalities into separate .ts or .js files and import them into your main proxy.ts file. This allows for cleaner management of route-specific proxy, aggregated in the proxy.ts for centralized control. By enforcing a single proxy file, it simplifies configuration, prevents potential conflicts, and optimizes performance by avoiding multiple proxy layers.

Example
You can export your proxy function as either a default export or a named proxy export:

proxy.ts
TypeScript

TypeScript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}
 
// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }
 
export const config = {
  matcher: '/about/:path*',
}
The matcher config allows you to filter Proxy to run on specific paths. See the Matcher documentation for more details on path matching.

Read more about using proxy, or refer to the proxy API reference.

proxy.js
Last updated April 6, 2026
Note: The middleware file convention is deprecated and has been renamed to proxy. See Migration to Proxy for more details.

The proxy.js|ts file is used to write Proxy and run code on the server before a request is completed. Then, based on the incoming request, you can modify the response by rewriting, redirecting, modifying the request or response headers, or responding directly.

Proxy executes before routes are rendered. It's particularly useful for implementing custom server-side logic like authentication, logging, or handling redirects.

Good to know:

Proxy is meant to be invoked separately of your render code and in optimized cases deployed to your CDN for fast redirect/rewrite handling, you should not attempt relying on shared modules or globals.

To pass information from Proxy to your application, use headers, cookies, rewrites, redirects, or the URL.

Create a proxy.ts (or .js) file in the project root, or inside src if applicable, so that it is located at the same level as pages or app.

If you’ve customized pageExtensions, for example to .page.ts or .page.js, name your file proxy.page.ts or proxy.page.js accordingly.

proxy.ts
TypeScript

TypeScript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}
 
export const config = {
  matcher: '/about/:path*',
}
Exports
Proxy function
The file must export a single function, either as a default export or named proxy. Note that multiple proxy from the same file are not supported.

proxy.js
// Example of default export
export default function proxy(request) {
  // Proxy logic
}
Config object (optional)
Optionally, a config object can be exported alongside the Proxy function. This object includes the matcher to specify paths where the Proxy applies.

Matcher
The matcher option allows you to target specific paths for the Proxy to run on. You can specify these paths in several ways:

For a single path: Directly use a string to define the path, like '/about'.
For multiple paths: Use an array to list multiple paths, such as matcher: ['/about', '/contact'], which applies the Proxy to both /about and /contact.
proxy.js
export const config = {
  matcher: ['/about/:path*', '/dashboard/:path*'],
}
Additionally, the matcher option supports complex path specifications using regular expressions. For example, you can exclude certain paths with a regular expression matcher:

proxy.js
export const config = {
  matcher: [
    // Exclude API routes, static files, image optimizations, and .png files
    '/((?!api|_next/static|_next/image|.*\\.png$).*)',
  ],
}
This enables precise control over which paths to include or exclude.

The matcher option accepts an array of objects with the following keys:

source: The path or pattern used to match the request paths. It can be a string for direct path matching or a pattern for more complex matching.
locale (optional): A boolean that, when set to false, ignores locale-based routing in path matching.
has (optional): Specifies conditions based on the presence of specific request elements such as headers, query parameters, or cookies.
missing (optional): Focuses on conditions where certain request elements are absent, like missing headers or cookies.
proxy.js
export const config = {
  matcher: [
    {
      source: '/api/:path*',
      locale: false,
      has: [
        { type: 'header', key: 'Authorization', value: 'Bearer Token' },
        { type: 'query', key: 'userId', value: '123' },
      ],
      missing: [{ type: 'cookie', key: 'session', value: 'active' }],
    },
  ],
}
The source path patterns:

MUST start with /
Can include named parameters: /about/:path matches /about/a and /about/b but not /about/a/c
Can have modifiers on named parameters (starting with :): /about/:path* matches /about/a/b/c because * is zero or more. ? is zero or one and + one or more
Can use regular expression enclosed in parenthesis: /about/(.*) is the same as /about/:path*
Are anchored to the start of the path: /about matches /about and /about/team but not /blog/about
Read more details on path-to-regexp documentation.

Good to know:

The matcher values need to be constants so they can be statically analyzed at build-time. Dynamic values such as variables will be ignored.
For backward compatibility, Next.js always considers /public as /public/index. Therefore, a matcher of /public/:path will match.
Params
request
When defining Proxy, the default export function accepts a single parameter, request. This parameter is an instance of NextRequest, which represents the incoming HTTP request.

proxy.ts
TypeScript

TypeScript
import type { NextRequest } from 'next/server'
 
export function proxy(request: NextRequest) {
  // Proxy logic goes here
}
If you prefer a shorthand, you can use the NextProxy type. It infers the parameter types for both request (NextRequest) and event (NextFetchEvent) automatically:

proxy.ts
import type { NextProxy } from 'next/server'
 
export const proxy: NextProxy = (request, event) => {
  event.waitUntil(Promise.resolve())
  return Response.json({ pathname: request.nextUrl.pathname })
}
Good to know:

NextRequest is a type that represents incoming HTTP requests in Next.js Proxy, whereas NextResponse is a class used to manipulate and send back HTTP responses.
NextResponse
The NextResponse API allows you to:

redirect the incoming request to a different URL
rewrite the response by displaying a given URL
Set request headers for API Routes, getServerSideProps, and rewrite destinations
Set response cookies
Set response headers
To produce a response from Proxy, you can:

rewrite to a route (Page or Route Handler) that produces a response
return a NextResponse directly. See Producing a Response
Good to know: For redirects, you can also use Response.redirect instead of NextResponse.redirect.

Execution order
Proxy will be invoked for every route in your project. Given this, it's crucial to use matchers to precisely target or exclude specific routes. The following is the execution order:

headers from next.config.js
redirects from next.config.js
Proxy (rewrites, redirects, etc.)
beforeFiles (rewrites) from next.config.js
Filesystem routes (public/, _next/static/, pages/, app/, etc.)
afterFiles (rewrites) from next.config.js
Dynamic Routes (/blog/[slug])
fallback (rewrites) from next.config.js
Good to know: Server Functions are not separate routes in this chain. They are handled as POST requests to the route where they are used, so a Proxy matcher that excludes a path will also skip Server Function calls on that path.

A matcher change or a refactor that moves a Server Function to a different route can silently remove Proxy coverage. Always verify authentication and authorization inside each Server Function rather than relying on Proxy alone. See the Data Security guide for recommended patterns.

Runtime
Proxy defaults to using the Node.js runtime. The runtime config option is not available in Proxy files. Setting the runtime config option in Proxy will throw an error.

Advanced Proxy flags
In v13.1 of Next.js two additional flags were introduced for proxy, skipProxyUrlNormalize (formerly skipMiddlewareUrlNormalize) and skipTrailingSlashRedirect to handle advanced use cases.

skipTrailingSlashRedirect disables Next.js redirects for adding or removing trailing slashes. This allows custom handling inside proxy to maintain the trailing slash for some paths but not others, which can make incremental migrations easier.

next.config.js
module.exports = {
  skipTrailingSlashRedirect: true,
}
proxy.js
const legacyPrefixes = ['/docs', '/blog']
 
export default async function proxy(req) {
  const { pathname } = req.nextUrl
 
  if (legacyPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }
 
  // apply trailing slash handling
  if (
    !pathname.endsWith('/') &&
    !pathname.match(/((?!\.well-known(?:\/.*)?)(?:[^/]+\/)*[^/]+\.\w+)/)
  ) {
    return NextResponse.redirect(
      new URL(`${req.nextUrl.pathname}/`, req.nextUrl)
    )
  }
}
skipProxyUrlNormalize allows for disabling the URL normalization in Next.js to make handling direct visits and client-transitions the same. In some advanced cases, this option provides full control by using the original URL.

next.config.js
module.exports = {
  skipProxyUrlNormalize: true,
}
proxy.js
export default async function proxy(req) {
  const { pathname } = req.nextUrl
 
  // GET /_next/data/build-id/hello.json
 
  console.log(pathname)
  // with the flag this now /_next/data/build-id/hello.json
  // without the flag this would be normalized to /hello
}
Examples
Conditional Statements
proxy.ts
TypeScript

TypeScript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/about')) {
    return NextResponse.rewrite(new URL('/about-2', request.url))
  }
 
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.rewrite(new URL('/dashboard/user', request.url))
  }
}
Using Cookies
Cookies are regular headers. On a Request, they are stored in the Cookie header. On a Response they are in the Set-Cookie header. Next.js provides a convenient way to access and manipulate these cookies through the cookies extension on NextRequest and NextResponse.

For incoming requests, cookies comes with the following methods: get, getAll, set, and delete cookies. You can check for the existence of a cookie with has or remove all cookies with clear.
For outgoing responses, cookies have the following methods get, getAll, set, and delete.
proxy.ts
TypeScript

TypeScript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function proxy(request: NextRequest) {
  // Assume a "Cookie:nextjs=fast" header to be present on the incoming request
  // Getting cookies from the request using the `RequestCookies` API
  let cookie = request.cookies.get('nextjs')
  console.log(cookie) // => { name: 'nextjs', value: 'fast', Path: '/' }
  const allCookies = request.cookies.getAll()
  console.log(allCookies) // => [{ name: 'nextjs', value: 'fast' }]
 
  request.cookies.has('nextjs') // => true
  request.cookies.delete('nextjs')
  request.cookies.has('nextjs') // => false
 
  // Setting cookies on the response using the `ResponseCookies` API
  const response = NextResponse.next()
  response.cookies.set('vercel', 'fast')
  response.cookies.set({
    name: 'vercel',
    value: 'fast',
    path: '/',
  })
  cookie = response.cookies.get('vercel')
  console.log(cookie) // => { name: 'vercel', value: 'fast', Path: '/' }
  // The outgoing response will have a `Set-Cookie:vercel=fast;path=/` header.
 
  return response
}
Setting Headers
You can set request and response headers using the NextResponse API (setting request headers is available since Next.js v13.0.0).

proxy.ts
TypeScript

TypeScript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
export function proxy(request: NextRequest) {
  // Clone the request headers and set a new header `x-hello-from-proxy1`
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-hello-from-proxy1', 'hello')
 
  // You can also set request headers in NextResponse.next
  const response = NextResponse.next({
    request: {
      // New request headers
      headers: requestHeaders,
    },
  })
 
  // Set a new response header `x-hello-from-proxy2`
  response.headers.set('x-hello-from-proxy2', 'hello')
  return response
}
Note that the snippet uses:

NextResponse.next({ request: { headers: requestHeaders } }) to make requestHeaders available upstream
NOT NextResponse.next({ headers: requestHeaders }) which makes requestHeaders available to clients
Learn more in NextResponse headers in Proxy.

Good to know: Avoid setting large headers as it might cause 431 Request Header Fields Too Large error depending on your backend web server configuration.

RSC requests and rewrites
During RSC requests, Next.js strips internal Flight headers from the request instance in Proxy. For example, headers like rsc, next-router-state-tree, and next-router-prefetch are not exposed through request.headers. This is to prevent accidentally handling an RSC request differently than the HTML request as both need to align.

When you use NextResponse.rewrite(), Next.js automatically propagates the required RSC rewrite headers upstream.

If you implement custom rewrite logic with fetch() instead of NextResponse.rewrite(), you can run into missing RSC headers unless you forward them manually.

For custom fetch rewrite setups, you can also enable skipProxyUrlNormalize in next.config.js so your rewrite logic can receive the necessary URL shape and RSC headers from the provided request object:

next.config.js
module.exports = {
  skipProxyUrlNormalize: true,
}
CORS
You can set CORS headers in Proxy to allow cross-origin requests, including simple and preflighted requests.

proxy.ts
TypeScript

TypeScript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
 
const allowedOrigins = ['https://acme.com', 'https://my-app.org']
 
const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
 
export function proxy(request: NextRequest) {
  // Check the origin from the request
  const origin = request.headers.get('origin') ?? ''
  const isAllowedOrigin = allowedOrigins.includes(origin)
 
  // Handle preflighted requests
  const isPreflight = request.method === 'OPTIONS'
 
  if (isPreflight) {
    const preflightHeaders = {
      ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
      ...corsOptions,
    }
    return NextResponse.json({}, { headers: preflightHeaders })
  }
 
  // Handle simple requests
  const response = NextResponse.next()
 
  if (isAllowedOrigin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
 
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
 
  return response
}
 
export const config = {
  matcher: '/api/:path*',
}
Good to know: You can configure CORS headers for individual routes in Route Handlers.

Producing a response
You can respond from Proxy directly by returning a Response or NextResponse instance. (This is available since Next.js v13.1.0)

proxy.ts
TypeScript

TypeScript
import type { NextRequest } from 'next/server'
import { isAuthenticated } from '@lib/auth'
 
// Limit the proxy to paths starting with `/api/`
export const config = {
  matcher: '/api/:function*',
}
 
export function proxy(request: NextRequest) {
  // Call our authentication function to check the request
  if (!isAuthenticated(request)) {
    // Respond with JSON indicating an error message
    return Response.json(
      { success: false, message: 'authentication failed' },
      { status: 401 }
    )
  }
}
Negative matching
The matcher config allows full regex so matching like negative lookaheads or character matching is supported. An example of a negative lookahead to match all except specific paths can be seen here:

proxy.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
You can also bypass Proxy for certain requests by using the missing or has arrays, or a combination of both:

proxy.js
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
 
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      has: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
 
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      has: [{ type: 'header', key: 'x-present' }],
      missing: [{ type: 'header', key: 'x-missing', value: 'prefetch' }],
    },
  ],
}
Good to know:

Even when _next/data is excluded in a negative matcher pattern, proxy will still be invoked for _next/data routes. This is intentional behavior to prevent accidental security issues where you might protect a page but forget to protect the corresponding data route.

proxy.js
export const config = {
  matcher:
    '/((?!api|_next/data|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
}
 
// Proxy will still run for /_next/data/* routes despite being excluded
waitUntil and NextFetchEvent
The NextFetchEvent object extends the native FetchEvent object, and includes the waitUntil() method.

The waitUntil() method takes a promise as an argument, and extends the lifetime of the Proxy until the promise settles. This is useful for performing work in the background.

proxy.ts
import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest } from 'next/server'
 
export function proxy(req: NextRequest, event: NextFetchEvent) {
  event.waitUntil(
    fetch('https://my-analytics-platform.com', {
      method: 'POST',
      body: JSON.stringify({ pathname: req.nextUrl.pathname }),
    })
  )
 
  return NextResponse.next()
}
Unit testing (experimental)
Starting in Next.js 15.1, the next/experimental/testing/server package contains utilities to help unit test proxy files. Unit testing proxy can help ensure that it's only run on desired paths and that custom routing logic works as intended before code reaches production.

The unstable_doesProxyMatch function can be used to assert whether proxy will run for the provided URL, headers, and cookies.

import { unstable_doesProxyMatch } from 'next/experimental/testing/server'
 
expect(
  unstable_doesProxyMatch({
    config,
    nextConfig,
    url: '/test',
  })
).toEqual(false)
The entire proxy function can also be tested.

import { isRewrite, getRewrittenUrl } from 'next/experimental/testing/server'
 
const request = new NextRequest('https://nextjs.org/docs')
const response = await proxy(request)
expect(isRewrite(response)).toEqual(true)
expect(getRewrittenUrl(response)).toEqual('https://other-domain.com/docs')
// getRedirectUrl could also be used if the response were a redirect
Platform support
Deployment Option	Supported
Node.js server	Yes
Docker container	Yes
Static export	No
Adapters	Platform-specific
Learn how to configure Proxy when self-hosting Next.js.

Migration to Proxy
Why the Change
The reason behind the renaming of middleware is that the term "middleware" can often be confused with Express.js middleware, leading to a misinterpretation of its purpose. Also, Middleware is highly capable, so it may encourage the usage; however, this feature is recommended to be used as a last resort.

Next.js is moving forward to provide better APIs with better ergonomics so that developers can achieve their goals without Middleware. This is the reason behind the renaming of middleware.

Why "Proxy"
The name Proxy clarifies what Middleware is capable of. The term "proxy" implies that it has a network boundary in front of the app, which is the behavior of Middleware. Also, Middleware defaults to run at the Edge Runtime, which can run closer to the client, separated from the app's region. These behaviors align better with the term "proxy" and provide a clearer purpose of the feature.

How to Migrate
We recommend users avoid relying on Middleware unless no other options exist. Our goal is to give them APIs with better ergonomics so they can achieve their goals without Middleware.

The term “middleware” often confuses users with Express.js middleware, which can encourage misuse. To clarify our direction, we are renaming the file convention to “proxy.” This highlights that we are moving away from Middleware, breaking down its overloaded features, and making the Proxy clear in its purpose.

Next.js provides a codemod to migrate from middleware.ts to proxy.ts. You can run the following command to migrate:

npx @next/codemod@canary middleware-to-proxy .
The codemod will rename the file and the function name from middleware to proxy.

// middleware.ts -> proxy.ts
 
- export function middleware() {
+ export function proxy() {