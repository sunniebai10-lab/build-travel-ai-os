"use client";

import { Cloud, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getAuthSession, onAuthStateChange, signOut } from "@/lib/supabase/auth";

export function AuthSyncStatus({ compact = false }: { compact?: boolean }) {
  const [configured, setConfigured] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void getAuthSession().then((state) => {
      setConfigured(state.configured);
      setSignedIn(Boolean(state.session));
      setEmail(state.session?.user.email ?? null);
    });

    return onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      setEmail(session?.user.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    await signOut();
    setSignedIn(false);
    setEmail(null);
  }

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-small)] bg-white/72 px-4 py-3 text-xs leading-[1.6] text-text-secondary shadow-[0_10px_28px_rgba(83,58,36,0.05)]">
        <div className="flex min-w-0 items-center gap-2">
          <Cloud className="h-4 w-4 shrink-0 text-accent-orange" strokeWidth={1.8} />
          <span className="min-w-0 break-words">
            {signedIn ? "已同步云端" : configured ? "本机体验模式" : "本机体验模式"}
            {signedIn && email ? <span className="ml-1 text-text-secondary/80">{email}</span> : null}
          </span>
        </div>
        {signedIn ? (
          <button type="button" onClick={handleSignOut} className="shrink-0 text-accent-orange">
            退出
          </button>
        ) : (
          <a href="/login" className="shrink-0 text-accent-orange">
            登录
          </a>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-[var(--radius-medium)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Cloud className="h-5 w-5 text-accent-orange" strokeWidth={1.8} />
            {signedIn ? "已同步云端" : "本机体验模式"}
          </div>
          <p className="mt-2 text-sm leading-[1.6] text-text-secondary">
            {signedIn
              ? "手帐、账本和体验状态会优先保存到 Supabase。"
              : configured
                ? "登录后，手帐和账本会自动尝试同步到云端。"
                : "当前未配置 Supabase，记录会暂时保存在本机。"}
          </p>
          {signedIn && email ? <p className="mt-2 break-words text-xs text-text-secondary">{email}</p> : null}
        </div>
        {signedIn ? (
          <Button type="button" variant="secondary" size="sm" onClick={handleSignOut} className="shrink-0 rounded-[var(--radius-small)]">
            <LogOut className="h-3.5 w-3.5" />
            退出
          </Button>
        ) : (
          <Button asChild size="sm" className="shrink-0 rounded-[var(--radius-small)]">
            <a href="/login">登录</a>
          </Button>
        )}
      </div>
    </section>
  );
}
