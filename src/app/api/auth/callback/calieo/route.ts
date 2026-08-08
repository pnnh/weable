import * as oauth from "oauth4webapi";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/index";
import { users } from "@/db/schema";
import { createId } from "@/db/schema";
import {
  getAuthorizationServer,
  buildClient,
  buildClientAuth,
  getRedirectUri,
  exchangeCodeForUser,
} from "@/lib/calieo-oauth";

/** 解析 oauth_state cookie，返回三段内容；格式非法返回 null */
function parseStateCookie(value: string): { storedState: string; codeVerifier: string; lang: string } | null {
  const parts = value.split("::");
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  return { storedState: parts[0], codeVerifier: parts[1], lang: parts[2] };
}

/** 清除临时 state cookie */
async function clearStateCookie() {
  const cookieStore = await cookies();
  cookieStore.set("oauth_state", "", { maxAge: 0, path: "/" });
}

/** 按 calieo_sub → email → 新建 的顺序查找或创建用户，返回 users.id */
async function ensureCalieoUser(sub: string, email: string, name: string): Promise<string> {
  const db = getDb();

  // 1. 按 calieo_sub 查找
  const bySubRows = await db.select().from(users).where(eq(users.calieoSub, sub)).limit(1);
  if (bySubRows.length > 0) return bySubRows[0].id;

  // 2. 按 email 查找
  const byEmailRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (byEmailRows.length > 0) {
    // 关联 calieo_sub（首次 Calieo 登录的已有用户）
    await db.update(users).set({ calieoSub: sub }).where(eq(users.id, byEmailRows[0].id)).run();
    return byEmailRows[0].id;
  }

  // 3. 新建用户
  const newId = createId();
  await db.insert(users).values({ id: newId, name, email, calieoSub: sub }).run();
  return newId;
}

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const stateCookieValue = cookieStore.get("oauth_state")?.value ?? "";
  const parsed = parseStateCookie(stateCookieValue);
  const lang = parsed?.lang ?? "en";

  function redirectError(code: string) {
    return Response.redirect(
      new URL(`/${lang}/account/signin?error=${code}`, request.url).toString(),
      302,
    );
  }

  // 1. cookie 缺失或格式错误
  if (!parsed) {
    await clearStateCookie();
    return redirectError("invalid_state");
  }

  const { storedState, codeVerifier } = parsed;
  const callbackUrl = new URL(request.url);

  // 2. provider 返回错误（用户取消等）
  const providerError = callbackUrl.searchParams.get("error");
  if (providerError) {
    await clearStateCookie();
    return redirectError(providerError);
  }

  // 3. state 校验（防 CSRF）——由 oauth4webapi.validateAuthResponse 内部执行，
  //    但提前检查快速返回
  const returnedState = callbackUrl.searchParams.get("state");
  if (!returnedState || returnedState !== storedState) {
    await clearStateCookie();
    return redirectError("invalid_state");
  }

  try {
    const as = await getAuthorizationServer();
    const client = buildClient();
    const clientAuth = buildClientAuth();
    const redirectUri = getRedirectUri(request);

    // 4. 换取 token 并验证 id_token（oauth4webapi 处理签名/issuer/exp）
    const calieoUser = await exchangeCodeForUser(
      as,
      client,
      clientAuth,
      callbackUrl,
      storedState,
      codeVerifier,
      redirectUri,
    );

    // 5. 查找或创建用户
    const userId = await ensureCalieoUser(calieoUser.sub, calieoUser.email, calieoUser.name);

    // 6. 清除临时 cookie，写入会话 cookie，互斥清除其他登录 session
    await clearStateCookie();
    const isProduction = process.env.NODE_ENV === "production";
    cookieStore.set("user_id", "", { maxAge: 0, path: "/" }); // 清除 mock 登录残留会话
    cookieStore.set("calieo_session", userId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 天
      path: "/",
      secure: isProduction,
    });

    return Response.redirect(new URL(`/${lang}/console`, request.url).toString(), 302);
  } catch (err) {
    await clearStateCookie();
    const isMissingClaims = err instanceof Error && err.message === "MISSING_CLAIMS";
    return redirectError(isMissingClaims ? "missing_claims" : "token_invalid");
  }
}
