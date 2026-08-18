"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TotpFactor = { id: string; friendly_name?: string; status: string };

export function MfaSettings({ nextPath = "/app" }: { nextPath?: string }) {
  const router = useRouter();
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const client = createSupabaseBrowserClient();
    const { data } = client ? await client.auth.mfa.listFactors() : { data: null };
    setFactors((data?.totp ?? []) as TotpFactor[]);
  }

  useEffect(() => {
    const client = createSupabaseBrowserClient();
    void client?.auth.mfa.listFactors().then(({ data }) => setFactors((data?.totp ?? []) as TotpFactor[]));
  }, []);

  async function enroll() {
    const client = createSupabaseBrowserClient();
    if (!client) return setError("Authentication is not configured.");
    setBusy(true); setError("");
    const { data, error: enrollError } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: "Eventloom authenticator" });
    setBusy(false);
    if (enrollError) return setError(enrollError.message);
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
  }

  async function verify() {
    const client = createSupabaseBrowserClient();
    const selectedFactor = factorId || factors.find((factor) => factor.status === "verified")?.id || "";
    if (!client || !selectedFactor || code.length !== 6) return setError("Enter the six-digit code from your authenticator app.");
    setBusy(true); setError("");
    const challenge = await client.auth.mfa.challenge({ factorId: selectedFactor });
    if (challenge.error) { setBusy(false); return setError(challenge.error.message); }
    const result = await client.auth.mfa.verify({ factorId: selectedFactor, challengeId: challenge.data.id, code });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    await refresh();
    router.push(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/app");
    router.refresh();
  }

  const verified = factors.some((factor) => factor.status === "verified");
  return <section className="eventloom-app-card rounded-2xl p-6">
    <h2 className="text-xl font-semibold">Authenticator app</h2>
    <p className="mt-2 text-sm leading-relaxed text-[#66736c]">Two-step verification is required before publishing, billing, RSVP exports, or domain changes.</p>
    {verified && !qrCode ? <p className="mt-5 rounded-xl bg-green-50 p-4 text-sm text-green-800">An authenticator is enrolled. Enter a fresh code to raise this session to MFA.</p> : null}
    {!verified && !qrCode ? <button type="button" disabled={busy} onClick={enroll} className="eventloom-app-button-primary mt-5 rounded-full px-5 py-3 disabled:opacity-50">Set up authenticator</button> : null}
    {qrCode ? <div className="mt-5"><p className="text-sm">Scan this QR code with your authenticator app.</p><Image unoptimized width={224} height={224} src={qrCode} alt="Authenticator enrollment QR code" className="mt-3 size-56" /></div> : null}
    {(verified || qrCode) ? <div className="mt-5 flex flex-wrap gap-3"><label className="grid gap-2 text-sm font-medium">Six-digit code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="eventloom-app-field rounded-xl border px-4 py-3" /></label><button type="button" disabled={busy || code.length !== 6} onClick={verify} className="eventloom-app-button-primary self-end rounded-full px-5 py-3 disabled:opacity-50">Verify session</button></div> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
  </section>;
}
