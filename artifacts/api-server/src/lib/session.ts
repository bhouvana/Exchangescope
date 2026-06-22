import { v4 as uuidv4 } from "uuid";

interface SessionData {
  id: string;
  userId: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: number;
}

const store = new Map<string, SessionData>();

const SESSION_COOKIE = "exs_sid";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24h

export function createSession(user: { sub: string; email: string; name: string; picture?: string }): string {
  const sid = uuidv4();
  store.set(sid, {
    id: sid,
    userId: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    createdAt: Date.now(),
  });
  return sid;
}

export function getSession(sid: string): SessionData | undefined {
  const s = store.get(sid);
  if (!s) return undefined;
  if (Date.now() - s.createdAt > SESSION_MAX_AGE) {
    store.delete(sid);
    return undefined;
  }
  return s;
}

export function destroySession(sid: string): void {
  store.delete(sid);
}

export function getUserId(req: any): string | undefined {
  const sid = req.signedCookies?.[SESSION_COOKIE] ?? req.cookies?.[SESSION_COOKIE];
  if (!sid) return undefined;
  const session = getSession(sid);
  return session?.userId;
}

export { SESSION_COOKIE };
