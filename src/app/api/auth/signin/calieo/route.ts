import * as oauth from "oauth4webapi";
import { cookies } from "next/headers";
import {
  getAuthorizationServer,
  buildClient,
  buildClientAuth,
  generateAuthorizationUrl,
  getRedirectUri,
} from "@/lib/calieo-oauth";


export async function GET(request: Request) {
  try {
    buildClient();     // 提前校验环境变量存在
    buildClientAuth();
  } catch {
    return new Response("OAuth 配置缺失", { status: 500 });
  }

  const url = new URL(request.url);
  const lang = url.searchParams.get("lang") || "en";

  const as = await getAuthorizationServer();
  const client = buildClient();
  const redirectUri = getRedirectUri(request);

  const state = oauth.generateRandomState();
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const codeChallenge = await oauth.calculatePKCECodeChallenge(codeVerifier);

  const authUrl = await generateAuthorizationUrl(as, client, state, codeChallenge, redirectUri);

  // 将 state、codeVerifier、lang 存入短期 httpOnly cookie
  const cookieValue = `${state}::${codeVerifier}::${lang}`;
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  cookieStore.set("oauth_state", cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
    secure: isProduction,
  });

  return Response.redirect(authUrl.toString(), 302);
}
