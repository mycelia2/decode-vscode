import { RealmApp } from "./App";
import * as RealmWeb from "realm-web";

export async function loginUser(
  email: string,
  password: string
): Promise<any | null> {
  try {
    const credentials = RealmWeb.Credentials.emailPassword(email, password);
    const user = await RealmApp.logIn(credentials);

    const AUTH_API_KEY_ID = "authApiKey";

    let key;
    try {
      key = await user.apiKeys.fetch(AUTH_API_KEY_ID);
    } catch (err) {
      key = await user.apiKeys.create(AUTH_API_KEY_ID);
    }
    return { _id: user.id, email: user.profile.email, apiKey: key };
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
