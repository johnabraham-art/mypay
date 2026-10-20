"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  destination_type: string;
  destination_label: string;
  progress: number;
  status: string;
  created_at: string;
};

const statuses = [
  "pending",
  "under_review",
  "processing",
  "completed",
  "failed",
];

export default function AdminPage() {
  const router = useRouter();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadWithdrawals() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    // Only trusted app metadata can grant admin access.
    if (user.app_metadata?.role !== "admin") {
      setMessage("Access denied. This account is not an admin.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("withdrawals")
      .select(
        "id, user_id, amount, destination_type, destination_label, progress, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Could not load withdrawals: ${error.message}`);
    } else {
      setWithdrawals((data || []) as Withdrawal[]);
    }

    setLoading(false);
  }

  async function updateWithdrawal(
    item: Withdrawal,
    progress: number,
    status: string
  ) {
    if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
      setMessage("Progress must be a whole number from 0 to 100.");
      return;
    }

    if (!statuses.includes(status)) {
      setMessage("Invalid withdrawal status.");
      return;
    }

    if (
      status === "completed" &&
      !window.confirm(
        "Only mark completed if the actual payout has been confirmed. Continue?"
      )
    ) {
      return;
    }

    setSavingId(item.id);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();

    if (authData.user?.app_metadata?.role !== "admin") {
      setMessage("Admin access could not be verified. Sign in again.");
      setSavingId("");
      return;
    }

    const { error } = await supabase
      .from("withdrawals")
      .update({
        progress,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.id);

    if (error) {
      setMessage(`Update failed: ${error.message}`);
    } else {
      setMessage("Withdrawal workflow updated.");
      await loadWithdrawals();
    }

    setSavingId("");
  }

  useEffect(() => {
    void loadWithdrawals();
    // Load once when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1120",
        color: "#f8fafc",
        padding: "32px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 28,
          }}
        >
          <div>
            <p
              style={{
                color: "#5eead4",
                fontSize: 12,
                letterSpacing: 3,
              }}
            >
              MY PAY · ADMIN
            </p>
            <h1 style={{ fontSize: 30, margin: "8px 0" }}>
              Withdrawal management
            </h1>
            <p style={{ color: "#94a3b8" }}>
              Review requests and update their workflow progress.
            </p>
          </div>

          <button
            onClick={() => router.push("/")}
            style={buttonStyle}
          >
            Back to dashboard
          </button>
        </header>

        {message && (
          <div
            role="status"
            style={{
              background: "#172554",
              border: "1px solid #334155",
              borderRadius: 10,
              padding: 14,
              marginBottom: 20,
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </div>
        )}

        {loading ? (
          <p>Loading withdrawals...</p>
        ) : withdrawals.length === 0 ? (
          <section style={panelStyle}>
            <h2>No withdrawal requests found</h2>
            <p style={{ color: "#94a3b8" }}>
              Requests will appear here after they are saved to your
              withdrawals table.
            </p>
            <button onClick={() => void loadWithdrawals()} style={buttonStyle}>
              Refresh
            </button>
          </section>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {withdrawals.map((item) => (
              <WithdrawalCard
                key={item.id}
                item={item}
                saving={savingId === item.id}
                onSave={updateWithdrawal}
              />
            ))}
          </div>
        )}

        <p
          style={{
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.7,
            marginTop: 28,
          }}
        >
          Progress represents the withdrawal workflow only. It does not
          confirm that funds have been transferred. Never request gift
          cards or cryptocurrency payments to unlock a withdrawal.
        </p>
      </div>
    </main>
  );
}

function WithdrawalCard({
  item,
  saving,
  onSave,
}: {
  item: Withdrawal;
  saving: boolean;
  onSave: (
    item: Withdrawal,
    progress: number,
    status: string
  ) => Promise<void>;
}) {
  const [progress, setProgress] = useState(item.progress);
  const [status, setStatus] = useState(item.status);

  return (
    <section style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <p style={{ color: "#94a3b8", fontSize: 12 }}>Withdrawal amount</p>
          <h2 style={{ fontSize: 25, margin: "6px 0" }}>
            ${Number(item.amount).toFixed(2)}
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 12 }}>
            Request ID: {item.id}
          </p>
        </div>

        <div>
          <p style={{ color: "#94a3b8", fontSize: 12 }}>Destination</p>
          <p>{item.destination_type}</p>
          <p style={{ color: "#cbd5e1", overflowWrap: "anywhere" }}>
            {item.destination_label}
          </p>
        </div>
      </div>

      <p style={{ color: "#94a3b8", fontSize: 12 }}>
        Customer ID: {item.user_id}
      </p>

      <div
        style={{
          height: 9,
          background: "#334155",
          borderRadius: 99,
          overflow: "hidden",
          margin: "18px 0 8px",
        }}
      >
        <div
          style={{
            width: `${item.progress}%`,
            height: "100%",
            background: "#2dd4bf",
            transition: "width 0.2s",
          }}
        />
      </div>

      <p style={{ fontWeight: 700 }}>{item.progress}% complete</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginTop: 18,
        }}
      >
        <label>
          <span style={labelStyle}>Progress (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        <label>
          <span style={labelStyle}>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={inputStyle}
          >
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        disabled={saving}
        onClick={() => void onSave(item, progress, status)}
        style={{
          ...buttonStyle,
          marginTop: 16,
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save progress"}
      </button>

      <p style={{ color: "#64748b", fontSize: 12, marginTop: 12 }}>
        Submitted: {new Date(item.created_at).toLocaleString()}
      </p>
    </section>
  );
}

const panelStyle = {
  background: "#111c30",
  border: "1px solid #263449",
  borderRadius: 16,
  padding: 22,
};

const buttonStyle = {
  background: "#0d9488",
  color: "#ffffff",
  border: "none",
  borderRadius: 9,
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const labelStyle = {
  display: "block",
  color: "#cbd5e1",
  fontSize: 13,
  marginBottom: 8,
};

const inputStyle = {
  boxSizing: "border-box" as const,
  width: "100%",
  background: "#0b1120",
  color: "#ffffff",
  border: "1px solid #475569",
  borderRadius: 8,
  padding: 12,
};