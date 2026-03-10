"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { register as registerUser } from "@/lib/auth";
import toast from "react-hot-toast";
import { Eye, EyeOff, Zap, ArrowRight } from "lucide-react";

const schema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await registerUser(data.email, data.password, data.full_name);
      toast.success("Account created! Welcome to Einstein.");
      router.push("/contacts");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cyan-300 p-4 relative overflow-hidden">
      <div className="bg-dot-pattern" />

      <div className="relative w-full max-w-md">
        {/* Offset shadow */}
        <div className="absolute inset-0 translate-x-3 translate-y-3 border-4 border-black bg-yellow-300" />

        <div className="relative border-4 border-black bg-white p-8">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 pb-6 border-b-2 border-black">
            <div className="w-12 h-12 border-2 border-black bg-black flex items-center justify-center shrink-0">
              <Zap className="w-7 h-7 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight leading-none">Einstein</h1>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-black/60">Contact Manager</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-black uppercase tracking-tight">Create Account</h2>
            <p className="text-sm font-bold text-black/60 mt-1">Start managing contacts smarter</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Full Name</label>
              <input {...register("full_name")} placeholder="Your name" className="neo-input" />
              {errors.full_name && <p className="text-red-600 text-xs font-black mt-1 uppercase">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Email Address</label>
              <input {...register("email")} type="email" placeholder="you@example.com" className="neo-input" />
              {errors.email && <p className="text-red-600 text-xs font-black mt-1 uppercase">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-1.5">Password</label>
              <div className="relative">
                <input {...register("password")} type={showPwd ? "text" : "password"} placeholder="At least 8 characters" className="neo-input pr-12" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-600 text-xs font-black mt-1 uppercase">{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="neo-btn-black w-full py-3 text-sm mt-2">
              {loading ? "Creating account..." : <><span>Create Account</span><ArrowRight className="w-4 h-4 ml-2" /></>}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t-2 border-black">
            <p className="text-sm font-bold text-center">
              Already have an account?{" "}
              <Link href="/login" className="font-black underline underline-offset-4 hover:text-yellow-600 transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
