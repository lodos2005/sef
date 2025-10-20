import { NextResponse, type NextRequest } from "next/server"

const authRoutes = ["/auth/login", "/auth/callback"]
const safeToRedirect = ["/auth", "/settings"]

export function middleware(request: NextRequest) {
  let urlBeforeRedirect = request.nextUrl.pathname
  if (urlBeforeRedirect === "/auth/login") {
    urlBeforeRedirect = "/"
  }

  if (
    request.nextUrl.pathname.includes("_next") ||
    request.nextUrl.pathname.includes("favicon") ||
    request.nextUrl.pathname.includes("locales") ||
    request.nextUrl.pathname.startsWith("/api/v1") ||
    isStaticAsset(request)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("access_token")?.value || request.cookies.get("refresh_token")?.value

  if (
    !token &&
    (request.nextUrl.pathname.includes("forgot_password") ||
      request.nextUrl.pathname.includes("reset_password") ||
      request.nextUrl.pathname === "/auth/callback")
  ) {
    return NextResponse.next()
  }

  if (!token && !authRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.redirect(
      new URL("/auth/login?redirect=" + request.nextUrl.pathname, request.url)
    )
  }

  if (token && authRoutes.includes(request.nextUrl.pathname) && request.nextUrl.pathname !== "/auth/callback") {
    let url = request.nextUrl.searchParams.get("redirect") || "/"

    // Check if url is safe
    const isSafe =
      new URL(url, request.url).origin === new URL(request.url).origin &&
      (() => {
        for (const safeUrl of safeToRedirect) {
          if (url.startsWith(safeUrl)) {
            return true
          }
        }
        return false
      })()

    if (!isSafe) {
      url = "/"
    }

    return NextResponse.redirect(new URL(url, request.url))
  }

  return NextResponse.next()
}

function isStaticAsset(req: NextRequest) {
  const extensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".mp3",
  ]
  const requestPath = req.nextUrl.pathname.toLowerCase()
  return extensions.some((extension) => requestPath.endsWith(extension))
}
