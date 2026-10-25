"use client";

import { LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DetailPageShell } from "@/components/interaction-detail-cards";
import { Button } from "@/components/ui/button";
import { signInWithPassword } from "@/lib/supabase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const canSubmit = email.includes("@") && password.length > 0 && status !== "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");
    setMessage("");
    const result = await signInWithPassword(email.trim(), password);
    if (result.error) {
      setStatus("error");
      setMessage("邮箱或密码不正确，或该账号尚未设置密码。请重试。");
      return;
    }

    window.location.assign("/?auth=success");
  }

  return (
    <DetailPageShell title="登录同步" eyebrow="Account" backHref="/#mobile-today">
      <section className="rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-small)] bg-[color:rgba(255,242,231,0.96)] text-accent-orange">
          <LockKeyhole className="h-5 w-5" strokeWidth={1.8} />
        </div>
        <h1 className="mt-5 font-serif text-[34px] font-bold leading-none text-text-primary">让旅行记录同步云端</h1>
        <p className="mt-4 text-sm leading-[1.7] text-text-secondary">
          使用你的邮箱和密码登录。登录后，手帐、账本和体验状态会优先保存到 Supabase。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入密码"
              className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30"
            />
          </label>
          <Button type="submit" disabled={!canSubmit} className="h-12 w-full rounded-[var(--radius-small)]">
            {status === "submitting" ? "正在登录..." : "登录"}
          </Button>
        </form>

        {message ? (
          <div className={`mt-4 rounded-[var(--radius-small)] px-4 py-3 text-sm leading-[1.6] ${status === "error" ? "bg-red-50 text-red-700" : "bg-[color:rgba(255,250,242,0.96)] text-text-secondary"}`}>
            {message}
          </div>
        ) : null}

        <p className="mt-5 text-xs leading-[1.6] text-text-secondary">
          当前为 Personal Beta 登录。即使未登录，你也可以继续体验本机数据。
        </p>
      </section>
    </DetailPageShell>
  );
}
