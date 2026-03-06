"use client";

import { useTranslations } from "next-intl";
import { signOut } from "@script/api/auth-client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const t = useTranslations("Auth");

  return (
    <button
      onClick={async () => {
        await signOut();
        router.push("/sign-in");
      }}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      {t("signOut")}
    </button>
  );
}
