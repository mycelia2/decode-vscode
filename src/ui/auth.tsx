import { RealmApp } from "./App";
import * as RealmWeb from "realm-web";

export async function loginUser(
  email: string,
  password: string
): Promise<any | null> {
  try {
    const credentials = RealmWeb.Credentials.emailPassword(email, password);
    const user = await RealmApp.logIn(credentials);

    const AUTH_API_KEY_NAME = "authApiKey";

    let key;
    const keys = await user.apiKeys.fetchAll();
    if (keys.length > 0) {
      key = keys[0];
    } else {
      key = await user.apiKeys.create(AUTH_API_KEY_NAME);
    }
    return { _id: user.id, email: user.profile.email, authApiKey: key };
  } catch (error) {
    console.error("Login failed:", error);
    return null;
  }
}

export function getCurrentUser() {
  return RealmApp.currentUser;
}

export async function logoutUser() {
  if (RealmApp.currentUser) {
    await RealmApp.currentUser.logOut();
  }
}
