"use client";

import type { User } from "firebase/auth";

function getProviderId(user: User) {
  return user.providerData[0]?.providerId ?? "firebase";
}

export async function syncServerSession(user: User | null) {
  if (!user) {
    await fetch("/api/auth/session", {
      method: "DELETE",
    });
    return;
  }

  if (!user.email) {
    return;
  }

  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      photoURL: user.photoURL,
      provider: getProviderId(user),
    }),
  });

  if (!response.ok) {
    throw new Error(`Auth session request failed with status ${response.status}`);
  }
}
