import { MiniKit } from "@worldcoin/minikit-js";
import { useCallback, useState } from "react";

export function useWorldSignIn(): {
  signInWithWorld: () => Promise<typeof MiniKit.user | null>;
  worldUser: typeof MiniKit.user | null;
  isLoadingSignIn: boolean;
} {
  const [worldUser, setWorldUser] = useState<typeof MiniKit.user | null>(null);
  const [isLoadingSignIn, setIsLoadingSignIn] = useState(false);

  const signInWithWorld = useCallback(async (): Promise<
    typeof MiniKit.user | null
  > => {
    if (worldUser != null) {
      console.log("[WORLD_SIGNIN] user already signed in");
      return worldUser;
    }

    setIsLoadingSignIn(true);
    try {
      if (!MiniKit.isInstalled()) {
        console.log("[WORLD_SIGNIN] MiniKit is not installed");
        return null;
      }

      const res = await fetch("https://daimo.com/api/worldcoin/siwe-nonce");
      const { nonce } = await res.json();

      console.log("[WORLD_SIGNIN] nonce", nonce);

      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { commandPayload: generateMessageResult, finalPayload } =
        await MiniKit.commandsAsync.walletAuth({
          nonce,
          requestId: "0",
          expirationTime: nextWeek,
          notBefore: yesterday,
          statement: "Sign in",
        });

      console.log(
        "[WORLD_SIGNIN] generateMessageResult",
        generateMessageResult,
      );
      console.log("[WORLD_SIGNIN] finalPayload", finalPayload);

      if (finalPayload.status === "error") {
        return null;
      } else {
        const response = await fetch(
          "https://daimo.com/api/worldcoin/complete-siwe",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              payload: finalPayload,
              nonce,
            }),
          },
        );
        const verificationResponse = await response.json();

        console.log(
          "[WORLD_SIGNIN] verification response",
          verificationResponse,
        );
        if (verificationResponse.isValid) {
          console.log("[WORLD_SIGNIN] user is valid");
          const user = await MiniKit.getUserByAddress(finalPayload.address);
          setWorldUser(user);
          return user;
        }
      }
    } catch (error) {
      console.error("[WORLD_SIGNIN] error", error);
    } finally {
      setIsLoadingSignIn(false);
    }
    return null;
  }, [setWorldUser, setIsLoadingSignIn, worldUser]);

  return { signInWithWorld, worldUser, isLoadingSignIn };
}
