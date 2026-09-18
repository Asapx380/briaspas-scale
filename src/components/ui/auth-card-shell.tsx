"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

type AuthCardShellProps = Readonly<{
  children: React.ReactNode;
  configured: boolean;
  subtitle: string;
  title: string;
}>;

export function AuthCardShell({ children, configured, subtitle, title }: AuthCardShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8eef5] px-4 py-8 text-[var(--text)] sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,rgba(0,113,227,0.14),transparent_58%),linear-gradient(180deg,#f5f8fc_0%,#e3ebf4_100%)]" />
      <div className="auth-noise pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-soft-light" />

      <motion.div
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" }}
        animate={{ opacity: 1, transform: "translateY(0)" }}
        transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-md"
      >
        <section className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_16px_48px_rgba(15,23,42,0.08)] sm:p-8">
          <header className="text-center">
            <Link
              href="/"
              aria-label="Voltar para a página inicial da Briaspas Scale"
              className="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
            >
              <span className="relative flex size-12 items-center justify-center overflow-hidden rounded-full border border-black/[0.06] bg-[var(--neu-bg-pop)]">
                <Image
                  src="/brand/briaspas-scale-symbol.png?v=2"
                  alt=""
                  width={256}
                  height={256}
                  priority
                  className="size-9"
                />
              </span>
            </Link>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
            <p className="mt-1.5 text-sm text-[var(--text-3)]">{subtitle}</p>
          </header>
          {!configured && (
            <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              O Supabase ainda não está conectado. Preencha as variáveis do arquivo `.env.local`.
            </div>
          )}
          {children}
        </section>
      </motion.div>
    </main>
  );
}

type AuthFieldProps = Readonly<
  React.ComponentProps<"input"> & {
    icon: React.ReactNode;
    label: string;
    trailingAction?: React.ReactNode;
  }
>;

export function AuthField({
  icon,
  id,
  label,
  onBlur,
  onFocus,
  trailingAction,
  disabled,
  ...inputProps
}: AuthFieldProps) {
  const [focused, setFocused] = useState(false);
  const { pending } = useFormStatus();
  const isDisabled = Boolean(disabled || pending);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[var(--text-2)]">
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 transition-colors duration-200 ${focused ? "text-[var(--brand)]" : "text-[var(--text-4)]"}`}
        >
          {icon}
        </span>
        <input
          id={id}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className="h-11 w-full rounded-xl border border-black/[0.08] bg-[var(--neu-bg-pop)] pr-11 pl-10 text-sm text-[var(--text)] outline-none transition-[background-color,border-color,box-shadow] duration-200 placeholder:text-[var(--text-4)] hover:bg-white focus:border-[var(--brand)]/45 focus:bg-white focus:shadow-[0_0_0_3px_rgba(0,113,227,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
          {...inputProps}
          disabled={isDisabled}
        />
        {trailingAction}
      </div>
    </div>
  );
}

type AuthSubmitButtonProps = Readonly<{
  configured: boolean;
  label: string;
  pendingLabel: string;
}>;

export function AuthSubmitButton({ configured, label, pendingLabel }: AuthSubmitButtonProps) {
  const { pending } = useFormStatus();
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="submit"
      disabled={!configured || pending}
      aria-busy={pending}
      whileHover={pending || reduceMotion ? undefined : { transform: "scale(1.01)" }}
      whileTap={pending || reduceMotion ? undefined : { transform: "scale(0.985)" }}
      className="group relative mt-1 h-11 w-full overflow-hidden rounded-full bg-[#1f1f23] px-5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,23,42,0.18)] outline-none transition-colors hover:bg-[#2a2a2e] disabled:cursor-not-allowed disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2"
    >
      {pending && !reduceMotion && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ transform: ["translateX(-160%)", "translateX(260%)"] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <span className="relative flex items-center justify-center gap-2">
        {pending ? pendingLabel : label}
        {!pending && (
          <ArrowRight
            size={17}
            weight="bold"
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        )}
      </span>
    </motion.button>
  );
}
