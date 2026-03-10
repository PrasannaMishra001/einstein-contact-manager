"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login } from "@/lib/auth";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success("Welcome back!");
      router.push("/contacts");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Invalid credentials";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-300 dark:bg-neutral-950 p-4 relative overflow-hidden transition-colors">
      <div className="bg-grid-pattern" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        {/* Offset shadow */}
        <div className="absolute inset-0 translate-x-3 translate-y-3 border-4 border-black dark:border-white/20 bg-pink-300 dark:bg-pink-950" />

        <div className="relative border-4 border-black dark:border-white/30 bg-white dark:bg-neutral-900 p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-black dark:border-white/20">
            <div className="w-12 h-12 border-2 border-black dark:border-white/30 bg-black flex items-center justify-center shrink-0">
              <Zap className="w-7 h-7 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-black dark:text-white">Einstein</h1>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/50 dark:text-white/50">Contact Manager</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tight text-black dark:text-white">Sign In</h2>
            <p className="text-sm font-bold text-black/60 dark:text-white/60 mt-1">Enter your credentials below</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-black dark:text-white">
                Email Address
              </label>
              <input {...register("email")} type="email" placeholder="prasanna@example.com"
                className="neo-input dark:bg-neutral-800 dark:text-white dark:border-white/30 dark:placeholder:text-white/30" />
              {errors.email && <p className="text-red-500 text-xs font-black mt-1 uppercase">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5 text-black dark:text-white">
                Password
              </label>
              <div className="relative">
                <input {...register("password")} type={showPwd ? "text" : "password"} placeholder="••••••••"
                  className="neo-input pr-12 dark:bg-neutral-800 dark:text-white dark:border-white/30" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs font-black mt-1 uppercase">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="neo-btn-primary w-full py-3 text-sm mt-2">
              {loading ? "Signing in…" : <><span>Sign In</span><ArrowRight className="w-4 h-4 ml-2" /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-black dark:border-white/20">
            <p className="text-sm font-bold text-center text-black dark:text-white">
              No account?{" "}
              <Link href="/register" className="font-black underline underline-offset-4 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
