"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  // Check if the user previously started verification.
  // This allows them to close the page and come back later.
  useEffect(() => {
    const savedEmail = localStorage.getItem(
      "mypay-pending-verification-email"
    );

    if (savedEmail) {
      setEmail(savedEmail);
      setShowVerification(true);
    }
  }, []);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error) {
      alert("Signup failed: " + error.message);
      return;
    }

    // If email confirmation is enabled, Supabase normally
    // returns no session until the email is verified.
    if (!data.session) {
      localStorage.setItem(
        "mypay-pending-verification-email",
        cleanEmail
      );

      setEmail(cleanEmail);
      setShowVerification(true);

      alert(
        "Account created! 🎉 Check your email for your verification code."
      );

      return;
    }

    // If email confirmation is disabled, go straight to dashboard.
    router.push("/");
  };

  const handleVerify = async () => {
    const cleanCode = verificationCode.trim();

    if (!cleanCode) {
      alert("Enter the verification code from your email.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      alert("Please enter the 6-digit verification code.");
      return;
    }

    setVerifying(true);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: cleanCode,
      type: "email",
    });

    setVerifying(false);

    if (error) {
      alert("Verification failed: " + error.message);
      return;
    }

    // Verification succeeded.
    localStorage.removeItem(
      "mypay-pending-verification-email"
    );

    setVerificationCode("");

    alert("Email verified successfully! 🎉");

    // Go directly to the MyPay dashboard.
    router.push("/");
  };

  const handleResend = async () => {
    if (!email) {
      alert("Enter your email address first.");
      return;
    }

    setResending(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim().toLowerCase(),
    });

    setResending(false);

    if (error) {
      alert("Could not resend the code: " + error.message);
      return;
    }

    alert("A new verification code has been sent to your email.");
  };

  const backToSignup = () => {
    localStorage.removeItem(
      "mypay-pending-verification-email"
    );

    setShowVerification(false);
    setVerificationCode("");
  };

  if (showVerification) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold">
              MY PAY
            </h1>

            <p className="text-zinc-400 mt-2">
              Verify your email
            </p>
          </div>

          <div className="bg-zinc-900 rounded-3xl p-6">

            <h2 className="text-2xl font-bold mb-3">
              Enter your code
            </h2>

            <p className="text-zinc-400 text-sm mb-6">
              We sent a 6-digit verification code to:
            </p>

            <p className="text-white font-semibold mb-5 break-all">
              {email}
            </p>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              value={verificationCode}
              onChange={(e) =>
                setVerificationCode(
                  e.target.value.replace(/\D/g, "")
                )
              }
              className="w-full bg-zinc-800 p-4 rounded-xl mb-4 outline-none text-center text-2xl tracking-[0.4em]"
            />

            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full bg-white text-black p-3 rounded-xl font-bold disabled:opacity-50"
            >
              {verifying
                ? "Verifying..."
                : "Verify email"}
            </button>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full text-blue-400 p-3 mt-3 font-semibold disabled:opacity-50"
            >
              {resending
                ? "Sending..."
                : "Resend code"}
            </button>

            <button
              onClick={backToSignup}
              className="w-full text-zinc-400 p-2 mt-2 text-sm"
            >
              Back to sign up
            </button>

          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">
            PAYPAL 💸
          </h1>

          <p className="text-zinc-400 mt-2">
            Create your account
          </p>
        </div>

        <div className="bg-zinc-900 rounded-3xl p-6">

          <h2 className="text-2xl font-bold mb-6">
            Sign up
          </h2>

          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-800 p-3 rounded-xl mb-3 outline-none"
          />

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
            className="w-full bg-zinc-800 p-3 rounded-xl mb-3 outline-none"
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) =>
              setConfirmPassword(e.target.value)
            }
            className="w-full bg-zinc-800 p-3 rounded-xl mb-4 outline-none"
          />

          <button
            onClick={handleSignup}
            className="w-full bg-white text-black p-3 rounded-xl font-bold"
          >
            Create account
          </button>

        </div>

      </div>
    </main>
  );
}