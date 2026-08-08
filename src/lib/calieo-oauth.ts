import * as oauth from "oauth4webapi";

const ISSUER = new URL("https://portal.calieo.xyz");

// 缓存 AS metadata（Workers 实例级别；冷启动后首次请求时重新获取）
let cachedAs: oauth.AuthorizationServer | null = null;

export async function getAuthorizationServer(): Promise<oauth.AuthorizationServer> {
  if (cachedAs) return cachedAs;
  const response = await oauth.discoveryRequest(ISSUER);
  cachedAs = await oauth.processDiscoveryResponse(ISSUER, response);
  return cachedAs;
}

export function buildClient(): oauth.Client {
  const clientId = process.env.CALIEO_CLIENT_ID;
  if (!clientId) throw new Error("CALIEO_CLIENT_ID 未配置");
  return { client_id: clientId };
}

export function buildClientAuth(): oauth.ClientAuth {
  const secret = process.env.CALIEO_CLIENT_SECRET;
  if (!secret) throw new Error("CALIEO_CLIENT_SECRET 未配置");
  return oauth.ClientSecretPost(secret);
}

export function getRedirectUri(request: Request): string {
  const base = process.env.BASE_URL ?? new URL(request.url).origin;
  return `${base}/api/auth/callback/calieo`;
}

/** 生成授权 URL，含 PKCE S256 和 state */
export async function generateAuthorizationUrl(
  as: oauth.AuthorizationServer,
  client: oauth.Client,
  state: string,
  codeChallenge: string,
  redirectUri: string,
): Promise<URL> {
  const authUrl = new URL(as.authorization_endpoint!);
  authUrl.searchParams.set("client_id", client.client_id);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  return authUrl;
}

export interface CalieoUser {
  sub: string;
  email: string;
  name: string;
}

/** 用 code + codeVerifier 换取 token，验证 id_token，返回用户 claims */
export async function exchangeCodeForUser(
  as: oauth.AuthorizationServer,
  client: oauth.Client,
  clientAuth: oauth.ClientAuth,
  callbackUrl: URL,
  storedState: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<CalieoUser> {
  // 验证回调参数（含 state 校验）
  const params = oauth.validateAuthResponse(as, client, callbackUrl, storedState);

  // 用 code 换 token
  const tokenResponse = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    clientAuth,
    params,
    redirectUri,
    codeVerifier,
  );

  const result = await oauth.processAuthorizationCodeResponse(as, client, tokenResponse);

  // 解析 id_token claims（oauth4webapi 已验证签名、issuer、audience、exp）
  const claims = oauth.getValidatedIdTokenClaims(result)!;

  const sub = typeof claims.sub === "string" ? claims.sub.trim() : "";
  const email = typeof claims.email === "string" ? claims.email.trim() : "";
  const name =
    (typeof claims.name === "string" ? claims.name.trim() : "") ||
    (typeof claims.preferred_username === "string" ? claims.preferred_username.trim() : "") ||
    email;

  if (!sub || !email) throw new Error("MISSING_CLAIMS");

  return { sub, email, name };
}
