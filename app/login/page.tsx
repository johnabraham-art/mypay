"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter your email and password");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Login failed: " + error.message);
      return;
    }

 router.push("/");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            MY PAY
          </h1>

          <p className="text-zinc-400 mt-2">
            Your digital wallet
          </p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-6">

          <h2 className="text-2xl font-bold mb-6">
            Log in
          </h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-800 p-3 rounded-xl mb-3 outline-none"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-800 p-3 rounded-xl mb-4 outline-none"
          />

          <button
            onClick={handleLogin}
            className="w-full bg-white text-black p-3 rounded-xl font-bold"
          >
            Log In
          </button>

          <p className="text-center text-zinc-400 text-sm mt-5">
            Don't have a MyPay account?
          </p>

         <button
  onClick={() => router.push("/signup")}
  className="w-full border border-zinc-700 p-3 rounded-xl mt-3 font-semibold"
>
  Create account
</button>

        </div>

      </div>
    </main>
  );
}