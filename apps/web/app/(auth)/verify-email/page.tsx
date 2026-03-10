"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailRedirect />
    </Suspense>
  );
}

function VerifyEmailRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") ?? "";

  useEffect(() => {
    router.replace(`/verify-telegram?email=${encodeURIComponent(email)}`);
  }, [email, router]);

  return null;
}
