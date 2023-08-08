import { app } from "./db";

export async function loginUser(
  email: string,
  password: string
): Promise<any | null> {
  try {
    const credentials = Realm.Credentials.emailPassword(email, password);
    const user = await app.logIn(credentials);
    return user;
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}

export function getCurrentUser() {
  return app.currentUser;
}

export async function logoutUser() {
  if (app.currentUser) {
    await app.currentUser.logOut();
  }
}
