"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

type ActionType =
  | "send"
  | "receive"
  | "request"
  | "withdraw"
  | null;

type ThemeType = "dark" | "light" | "system";

type SuccessPanel =
  | {
      type: "transaction" | "request";
      amount: number;
      email: string;
    }
  | {
      type: "withdrawal";
      amount: number;
      target: string;
    }
  | null;

type Transaction = {
  id?: string;
  amount?: number;
  sender_id?: string;
  recipient_id?: string;
  sender_email?: string;
  recipient_email?: string;
  description?: string;
  created_at?: string;
  status?: string;
};

type MoneyRequest = {
  id: string;
  requester_email?: string;
  requested_from_email?: string;
  amount: number;
  status?: string;
  created_at?: string;
};

type DemoCard = {
  cardholderName: string;
  last4: string;
  brand: string;
  expiry: string;
};

const formatUSDT = (value: number) =>
  `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USDT`;

export default function Home() {
  const router = useRouter();

  // =========================
  // USER / WALLET
  // =========================

  const [balance, setBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");

  // =========================
  // SEND
  // =========================

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  // =========================
  // REQUEST
  // =========================

  const [requestEmail, setRequestEmail] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);

  // =========================
  // WITHDRAW
  // =========================

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState("TRC20");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  // =========================
  // HISTORY
  // =========================

  const [history, setHistory] = useState<Transaction[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // =========================
  // REQUESTS
  // =========================

  const [incomingRequests, setIncomingRequests] = useState<
    MoneyRequest[]
  >([]);

  const [respondingToRequest, setRespondingToRequest] =
    useState<string | null>(null);

  // =========================
  // PANELS
  // =========================

  const [activeAction, setActiveAction] =
    useState<ActionType>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showCardPanel, setShowCardPanel] = useState(false);

  const [successPanel, setSuccessPanel] =
    useState<SuccessPanel>(null);

  // =========================
  // CARD
  // =========================

  const [bankCard, setBankCard] =
    useState<DemoCard | null>(null);

  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardSaving, setCardSaving] = useState(false);

  // =========================
  // SETTINGS
  // =========================

  const [appLock, setAppLock] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [requireUnlock, setRequireUnlock] = useState(false);

  const [theme, setTheme] =
    useState<ThemeType>("dark");

  const [transactionNotifications, setTransactionNotifications] =
    useState(true);

  const [moneyRequestNotifications, setMoneyRequestNotifications] =
    useState(true);

  // =========================
  // GET USER
  // =========================

  const getUser = async () => {
    const { data, error } =
      await supabase.auth.getUser();

    if (error || !data.user) {
      router.push("/login");
      return null;
    }

    const user = data.user;

    setCurrentUserId(user.id);
    setUserEmail(user.email || "");

    const name =
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "MyPay User";

    setUserName(name);

    return user;
  };

  // =========================
  // LOAD WALLET
  // =========================

  const loadWallet = async (userId: string) => {
    const { data, error } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Wallet could not be loaded:", error.message);
      return;
    }

    if (!data) {
      const { data: newWallet, error: createError } =
        await supabase
          .from("wallets")
          .insert({
            user_id: userId,
            balance: 0,
          })
          .select("balance")
          .single();

      if (createError) {
        console.warn(
          "Wallet could not be created:",
          createError.message
        );
        return;
      }

      setBalance(Number(newWallet?.balance || 0));
      return;
    }

    setBalance(Number(data.balance || 0));
  };

  // =========================
  // LOAD HISTORY
  // =========================

  const loadHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(
        `sender_id.eq.${userId},recipient_id.eq.${userId}`
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(50);

    if (error) {
      console.warn(
        "Transaction history could not be loaded:",
        error.message
      );
      return;
    }

    setHistory(data || []);
  };

  // =========================
  // LOAD REQUESTS
  // =========================

  const loadRequests = async (
    userEmailValue: string
  ) => {
    if (!userEmailValue) {
      setIncomingRequests([]);
      return;
    }

    const { data, error } = await supabase
      .from("money_requests")
      .select("*")
      .eq(
        "requested_from_email",
        userEmailValue
      )
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      /*
        IMPORTANT:
        Use console.warn instead of console.error.
        Next.js development mode can show console.error
        as the large red error overlay.
      */

      console.warn(
        "Money requests could not be loaded:",
        error.message,
        error.details,
        error.hint,
        error.code
      );

      setIncomingRequests([]);
      return;
    }

    setIncomingRequests(
      (data || []) as MoneyRequest[]
    );
  };

  // =========================
  // INITIALIZE USER
  // =========================

  useEffect(() => {
    const initialize = async () => {
      const user = await getUser();

      if (!user) return;

      await loadWallet(user.id);
      await loadHistory(user.id);

      if (user.email) {
        await loadRequests(user.email);
      }
    };

    initialize();
  }, []);

  // =========================
  // LOAD SAVED SETTINGS
  // =========================

  useEffect(() => {
    const savedTheme =
      localStorage.getItem("mypay-theme");

    if (
      savedTheme === "dark" ||
      savedTheme === "light" ||
      savedTheme === "system"
    ) {
      setTheme(savedTheme);
    }

    setAppLock(
      localStorage.getItem("mypay-app-lock") ===
        "true"
    );

    setBiometric(
      localStorage.getItem("mypay-biometric") ===
        "true"
    );

    const savedTransactionNotifications =
      localStorage.getItem(
        "mypay-transaction-notifications"
      );

    if (
      savedTransactionNotifications !== null
    ) {
      setTransactionNotifications(
        savedTransactionNotifications === "true"
      );
    }

    const savedRequestNotifications =
      localStorage.getItem(
        "mypay-request-notifications"
      );

    if (
      savedRequestNotifications !== null
    ) {
      setMoneyRequestNotifications(
        savedRequestNotifications === "true"
      );
    }

    const savedCard =
      localStorage.getItem("mypay-card");

    if (savedCard) {
      try {
        setBankCard(JSON.parse(savedCard));
      } catch {
        localStorage.removeItem("mypay-card");
      }
    }
  }, []);

  // =========================
  // SAVE SETTINGS
  // =========================

  useEffect(() => {
    localStorage.setItem("mypay-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "mypay-app-lock",
      String(appLock)
    );
  }, [appLock]);

  useEffect(() => {
    localStorage.setItem(
      "mypay-biometric",
      String(biometric)
    );
  }, [biometric]);

  useEffect(() => {
    localStorage.setItem(
      "mypay-transaction-notifications",
      String(transactionNotifications)
    );
  }, [transactionNotifications]);

  useEffect(() => {
    localStorage.setItem(
      "mypay-request-notifications",
      String(moneyRequestNotifications)
    );
  }, [moneyRequestNotifications]);

  // =========================
  // SEND USDT
  // =========================

  const handleTransfer = async () => {
    if (!email.trim() || !amount.trim()) {
      alert(
        "Please enter the recipient email and USDT amount."
      );
      return;
    }

    const transferAmount = Number(amount);

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0
    ) {
      alert("Enter a valid USDT amount.");
      return;
    }

    if (balance === null) {
      alert("Wallet is still loading.");
      return;
    }

    if (transferAmount > balance) {
      alert("Insufficient USDT balance.");
      return;
    }

    setTransferLoading(true);

    const { error } = await supabase.rpc(
      "send_demo_money",
      {
        recipient_email: email.trim(),
        transfer_amount: transferAmount,
      }
    );

    if (error) {
      setTransferLoading(false);

      console.warn(
        "Transfer failed:",
        error.message
      );

      alert(
        "Transfer failed: " +
          error.message
      );

      return;
    }

    const recipient = email.trim();

    setBalance(
      balance - transferAmount
    );

    setEmail("");
    setAmount("");
    setActiveAction(null);
    setTransferLoading(false);

    setSuccessPanel({
      type: "transaction",
      amount: transferAmount,
      email: recipient,
    });

    if (currentUserId) {
      await loadHistory(currentUserId);
    }
  };

  // =========================
  // REQUEST USDT
  // =========================

  const handleRequestMoney = async () => {
    if (
      !requestEmail.trim() ||
      !requestAmount.trim()
    ) {
      alert(
        "Please enter the email and USDT amount."
      );
      return;
    }

    const requestAmountNumber =
      Number(requestAmount);

    if (
      !Number.isFinite(
        requestAmountNumber
      ) ||
      requestAmountNumber <= 0
    ) {
      alert("Enter a valid USDT amount.");
      return;
    }

    setRequestLoading(true);

    const { error } =
      await supabase.rpc(
        "create_money_request",
        {
          p_requested_from_email:
            requestEmail.trim(),
          p_amount:
            requestAmountNumber,
        }
      );

    setRequestLoading(false);

    if (error) {
      console.warn(
        "Request failed:",
        error.message
      );

      alert(
        "Request failed: " +
          error.message
      );

      return;
    }

    const requestedEmail =
      requestEmail.trim();

    setRequestEmail("");
    setRequestAmount("");
    setActiveAction(null);

    setSuccessPanel({
      type: "request",
      amount: requestAmountNumber,
      email: requestedEmail,
    });
  };

  // =========================
  // RESPOND TO REQUEST
  // =========================

  const handleRequestResponse = async (
    requestId: string,
    decision: "accepted" | "declined"
  ) => {
    setRespondingToRequest(requestId);

    const { error } =
      await supabase.rpc(
        "respond_to_money_request",
        {
          p_request_id: requestId,
          p_decision: decision,
        }
      );

    setRespondingToRequest(null);

    if (error) {
      console.warn(
        "Request response failed:",
        error.message
      );

      alert(
        "Unable to update request: " +
          error.message
      );

      return;
    }

    if (currentUserId) {
      await loadWallet(currentUserId);
      await loadHistory(currentUserId);
    }

    if (userEmail) {
      await loadRequests(userEmail);
    }
  };

  // =========================
  // WITHDRAW USDT
  // =========================

  const handleWithdraw = async () => {
    if (balance === null) {
      alert("Wallet is still loading.");
      return;
    }

    if (
      !withdrawAmount.trim() ||
      !withdrawAddress.trim() ||
      !withdrawNetwork.trim()
    ) {
      alert(
        "Please fill in all USDT withdrawal fields."
      );
      return;
    }

    const withdrawalValue =
      Number(withdrawAmount);

    if (
      !Number.isFinite(
        withdrawalValue
      ) ||
      withdrawalValue <= 0
    ) {
      alert("Enter a valid USDT amount.");
      return;
    }

    if (withdrawalValue > balance) {
      alert("Insufficient USDT balance.");
      return;
    }

    if (!currentUserId) {
      alert("User account not found.");
      return;
    }

    setWithdrawLoading(true);

    /*
      DEMO ONLY.

      This does NOT send real cryptocurrency.
      It only changes the demo wallet balance.
    */

    const handleWithdraw = async () => {
  if (balance === null) {
    alert("Wallet is still loading.");
    return;
  }

  const withdrawalValue = Number(withdrawAmount);

  if (
    !withdrawAmount.trim() ||
    !withdrawAddress.trim() ||
    !withdrawNetwork.trim()
  ) {
    alert("Please fill in all USDT withdrawal fields.");
    return;
  }

  if (
    !Number.isFinite(withdrawalValue) ||
    withdrawalValue <= 0
  ) {
    alert("Enter a valid USDT amount.");
    return;
  }

  if (withdrawalValue > balance) {
    alert("Insufficient USDT balance.");
    return;
  }

  if (!currentUserId) {
    alert("User account not found.");
    return;
  }

  setWithdrawLoading(true);

  // DEMO ONLY.
  // This does NOT send real USDT.

  const address = withdrawAddress.trim();

  const shortAddress =
    address.length > 12
      ? `${address.slice(0, 6)}••••${address.slice(-6)}`
      : address;

  const target =
    `${withdrawNetwork} • ${shortAddress}`;

  // Keep the money in the wallet for now.
  // The withdrawal is only marked as PENDING.
  setWithdrawAmount("");
  setWithdrawAddress("");
  setWithdrawNetwork("TRC20");

  setWithdrawLoading(false);
  setActiveAction(null);

  setSuccessPanel({
    type: "withdrawal",
    amount: withdrawalValue,
    target,
  });

  alert(
    `Withdrawal request submitted!\n\n` +
    `${withdrawalValue} USDT\n` +
    `Status: PENDING`
  );

  await loadHistory(currentUserId);
};

    const address =
      withdrawAddress.trim();

    const shortAddress =
      address.length > 12
        ? `${address.slice(
            0,
            6
          )}••••${address.slice(-6)}`
        : address;

    const target =
      `${withdrawNetwork} • ${shortAddress}`;

    setWithdrawAmount("");
    setWithdrawAddress("");
    setWithdrawNetwork("TRC20");

    setWithdrawLoading(false);
    setActiveAction(null);

    setSuccessPanel({
      type: "withdrawal",
      amount: withdrawalValue,
      target,
    });

    await loadHistory(currentUserId);
  };

  // =========================
  // SAVE CARD
  // =========================

  const handleSaveCard = () => {
    if (
      !cardholderName.trim() ||
      !cardNumber.trim() ||
      !expiry.trim()
    ) {
      alert(
        "Please fill in all card fields."
      );
      return;
    }

    const cleanCardNumber =
      cardNumber.replace(/\s/g, "");

    if (cleanCardNumber.length < 4) {
      alert(
        "Enter a valid card number."
      );
      return;
    }

    setCardSaving(true);

    const newCard: DemoCard = {
      cardholderName:
        cardholderName.trim(),
      last4:
        cleanCardNumber.slice(-4),
      brand:
        detectCardBrand(
          cleanCardNumber
        ),
      expiry:
        expiry.trim(),
    };

    localStorage.setItem(
      "mypay-card",
      JSON.stringify(newCard)
    );

    setBankCard(newCard);
    setCardNumber("");
    setExpiry("");
    setCardSaving(false);

    alert(
      "Demo card saved successfully."
    );
  };

  // =========================
  // REMOVE CARD
  // =========================

  const handleRemoveCard = () => {
    localStorage.removeItem(
      "mypay-card"
    );

    setBankCard(null);
    setCardholderName("");
    setCardNumber("");
    setExpiry("");
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // =========================
  // THEME
  // =========================

  const isLight =
    theme === "light";

  const pageClass =
    isLight
      ? "bg-zinc-100 text-zinc-950"
      : "bg-black text-white";

  const cardClass =
    isLight
      ? "bg-white border border-zinc-200"
      : "bg-zinc-900 border border-zinc-800";

  const inputClass =
    isLight
      ? "bg-zinc-100 text-zinc-950 border border-zinc-200"
      : "bg-zinc-800 text-white";

  return (
    <main
      className={`min-h-screen transition-colors ${pageClass}`}
    >
      {/* HEADER */}

      <header
        className={`border-b ${
          isLight
            ? "border-zinc-200"
            : "border-zinc-800"
        }`}
      >
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              MY PAY
            </h1>

            <p className="text-sm text-zinc-500">
              Your USDT digital wallet
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setShowCardPanel(true)
              }
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                isLight
                  ? "bg-zinc-200 hover:bg-zinc-300"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              💳
            </button>

            <button
              onClick={() =>
                setShowSettings(true)
              }
              className={`w-11 h-11 rounded-full flex items-center justify-center ${
                isLight
                  ? "bg-zinc-200 hover:bg-zinc-300"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              ⚙️
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-8">

        {/* WELCOME */}

        <div className="mb-7">
          <p className="text-sm text-zinc-500">
            Welcome back
          </p>

          <h2 className="text-3xl font-bold mt-1">
            {userName || "MyPay User"}
          </h2>

          {userEmail && (
            <p className="text-sm text-zinc-500 mt-1">
              {userEmail}
            </p>
          )}
        </div>

        {/* BALANCE */}

        <section
          className={`rounded-3xl p-7 mb-6 ${cardClass}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-zinc-500 text-sm">
                AVAILABLE USDT BALANCE
              </p>

              <div className="flex items-center gap-3 mt-3">
                <h2 className="text-4xl font-bold">
                  {balance === null
                    ? "Loading..."
                    : showBalance
                    ? formatUSDT(balance)
                    : "•••••• USDT"}
                </h2>

                <button
                  onClick={() =>
                    setShowBalance(
                      !showBalance
                    )
                  }
                  className="text-zinc-500"
                >
                  {showBalance
                    ? "👁️"
                    : "🙈"}
                </button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-500">
                MY PAY
              </p>

              <p className="text-sm font-semibold mt-1">
                USDT Wallet
              </p>
            </div>
          </div>
        </section>

        {/* ACTIONS */}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <ActionButton
            icon="↗️"
            title="Send USDT"
            onClick={() =>
              setActiveAction("send")
            }
          />

          <ActionButton
            icon="↙️"
            title="Receive"
            onClick={() =>
              setActiveAction("receive")
            }
          />

          <ActionButton
            icon="💬"
            title="Request USDT"
            onClick={() =>
              setActiveAction("request")
            }
          />

          <ActionButton
            icon="🏦"
            title="Withdraw USDT"
            onClick={() =>
              setActiveAction("withdraw")
            }
          />
        </section>

        {/* INCOMING REQUESTS */}

        {incomingRequests.length > 0 && (
          <section
            className={`rounded-3xl p-6 mb-6 ${cardClass}`}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold">
                  USDT Requests
                </h3>

                <p className="text-sm text-zinc-500 mt-1">
                  People requesting USDT
                  from you
                </p>
              </div>

              <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full text-xs font-semibold">
                {incomingRequests.length} pending
              </span>
            </div>

            <div className="space-y-3">
              {incomingRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className={`rounded-2xl p-4 ${
                      isLight
                        ? "bg-zinc-100"
                        : "bg-zinc-800"
                    }`}
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <p className="font-semibold">
                          {request.requester_email ||
                            "Someone"}
                        </p>

                        <p className="text-sm text-zinc-500 mt-1">
                          requested USDT
                          from you
                        </p>
                      </div>

                      <p className="font-bold">
                        {formatUSDT(
                          Number(
                            request.amount
                          )
                        )}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        disabled={
                          respondingToRequest ===
                          request.id
                        }
                        onClick={() =>
                          handleRequestResponse(
                            request.id,
                            "declined"
                          )
                        }
                        className="border border-zinc-600 rounded-xl p-3 font-semibold disabled:opacity-50"
                      >
                        Decline
                      </button>

                      <button
                        disabled={
                          respondingToRequest ===
                          request.id
                        }
                        onClick={() =>
                          handleRequestResponse(
                            request.id,
                            "accepted"
                          )
                        }
                        className="bg-white text-black rounded-xl p-3 font-semibold disabled:opacity-50"
                      >
                        {respondingToRequest ===
                        request.id
                          ? "Processing..."
                          : "Accept"}
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        )}

        {/* HISTORY */}

        <section
          className={`rounded-3xl p-6 ${cardClass}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">
                Transaction History
              </h3>

              <p className="text-sm text-zinc-500 mt-1">
                Your recent USDT activity
              </p>
            </div>

            <button
              onClick={() =>
                setShowHistory(!showHistory)
              }
              className="text-sm font-semibold"
            >
              {showHistory
                ? "Hide"
                : "View"}
            </button>
          </div>

          {showHistory && (
            <div className="mt-5 space-y-3">
              {history.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No transactions yet.
                </p>
              ) : (
                history.map(
                  (item, index) => (
                    <TransactionRow
                      key={
                        item.id ||
                        index
                      }
                      item={item}
                      currentUserId={
                        currentUserId
                      }
                    />
                  )
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* ACTION MODAL */}

      {activeAction && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div
            className={`w-full max-w-md rounded-3xl p-6 ${
              isLight
                ? "bg-white text-zinc-950"
                : "bg-zinc-900 text-white"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {activeAction === "send" &&
                  "Send USDT"}

                {activeAction ===
                  "receive" &&
                  "Receive USDT"}

                {activeAction ===
                  "request" &&
                  "Request USDT"}

                {activeAction ===
                  "withdraw" &&
                  "Withdraw USDT"}
              </h2>

              <button
                onClick={() =>
                  setActiveAction(null)
                }
                className="w-10 h-10 rounded-full bg-zinc-800 text-white"
              >
                ✕
              </button>
            </div>

            {/* SEND */}

            {activeAction === "send" && (
              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  placeholder="Recipient email"
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                />

                <input
                  type="number"
                  value={amount}
                  onChange={(e) =>
                    setAmount(
                      e.target.value
                    )
                  }
                  placeholder="USDT amount"
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                />

                <button
                  onClick={handleTransfer}
                  disabled={
                    transferLoading
                  }
                  className="w-full bg-white text-black p-4 rounded-xl font-bold disabled:opacity-50"
                >
                  {transferLoading
                    ? "Sending..."
                    : "Send USDT"}
                </button>
              </div>
            )}

            {/* RECEIVE */}

            {activeAction === "receive" && (
              <div className="text-center">
                <p className="text-zinc-500 mb-3">
                  Give this email to someone
                  who wants to send you USDT.
                </p>

                <div
                  className={`rounded-2xl p-5 mb-4 ${inputClass}`}
                >
                  <p className="font-semibold break-all">
                    {userEmail ||
                      "Your email"}
                  </p>
                </div>

                <button
                  onClick={() =>
                    setActiveAction(null)
                  }
                  className="w-full bg-white text-black p-4 rounded-xl font-bold"
                >
                  Done
                </button>
              </div>
            )}

            {/* REQUEST */}

            {activeAction === "request" && (
              <div className="space-y-4">
                <input
                  type="email"
                  value={requestEmail}
                  onChange={(e) =>
                    setRequestEmail(
                      e.target.value
                    )
                  }
                  placeholder="Person's email"
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                />

                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) =>
                    setRequestAmount(
                      e.target.value
                    )
                  }
                  placeholder="USDT amount"
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                />

                <button
                  onClick={
                    handleRequestMoney
                  }
                  disabled={
                    requestLoading
                  }
                  className="w-full bg-white text-black p-4 rounded-xl font-bold disabled:opacity-50"
                >
                  {requestLoading
                    ? "Requesting..."
                    : "Request USDT"}
                </button>
              </div>
            )}

            {/* WITHDRAW */}

            {activeAction === "withdraw" && (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                  <p className="text-yellow-500 text-sm font-semibold">
                    withdrawal
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    International fee:$60 <br></br>
                    payment verification method:bitcion/Gift card.
                  </p>
                </div>

                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) =>
                    setWithdrawAmount(
                      e.target.value
                    )
                  }
                  placeholder="USDT amount"
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                />

                <select
                  value={withdrawNetwork}
                  onChange={(e) =>
                    setWithdrawNetwork(
                      e.target.value
                    )
                  }
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                >
                  <option value="TRC20">
                    Paypal
                  </option>

                  <option value="ERC20">
                    Cash app
                  </option>

                  <option value="BEP20">
                    Zelle
                  </option>
                </select>

                <input
                  type="text"
                  value={withdrawAddress}
                  onChange={(e) =>
                    setWithdrawAddress(
                      e.target.value
                    )
                  }
                  placeholder="Wallet address"
                  className={`w-full p-4 rounded-xl outline-none ${inputClass}`}
                />

                <button
                  onClick={handleWithdraw}
                  disabled={
                    withdrawLoading
                  }
                  className="w-full bg-white text-black p-4 rounded-xl font-bold disabled:opacity-50"
                >
                  {withdrawLoading
                    ? "Processing..."
                    : "Withdraw USDT"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS PANEL */}

      {successPanel && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div
            className={`w-full max-w-md rounded-3xl p-7 text-center ${
              isLight
                ? "bg-white text-zinc-950"
                : "bg-zinc-900 text-white"
            }`}
          >
            <div className="text-6xl mb-4">
             ⏳
            </div>

            <h2 className="text-2xl font-bold">
              {successPanel.type ===
                "transaction" &&
                "Transfer Pending"}

              {successPanel.type ===
                "request" &&
                "Request Sent"}

              {successPanel.type ===
                "withdrawal" &&
                "Withdrawal Pending..."}
            </h2>

            <p className="text-3xl font-bold mt-5">
              {formatUSDT(
                successPanel.amount
              )}
            </p>

            <p className="text-zinc-500 mt-3 break-all">
              {successPanel.type ===
                "withdrawal"
                ? successPanel.target
                : successPanel.email}
            </p>
            <div>Sort out the fee charge frist before any withdrawal</div>

            <button
              onClick={() =>
                setSuccessPanel(null)
              }
              className="w-full bg-white text-black p-4 rounded-xl font-bold mt-7"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* CARD PANEL */}

      {showCardPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
          <div
            className={`w-full max-w-md rounded-3xl p-6 ${
              isLight
                ? "bg-white text-zinc-950"
                : "bg-zinc-900 text-white"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {bankCard
                    ? "Manage Card"
                    : "Add Card"}
                </h2>

                <p className="text-zinc-500 text-sm mt-1">
                  Card for your MyPay
                  wallet
                </p>
              </div>

              <button
                onClick={() =>
                  setShowCardPanel(false)
                }
                className="w-10 h-10 rounded-full bg-zinc-800 text-white"
              >
                ✕
              </button>
            </div>

            {bankCard ? (
              <>
                <div className="rounded-3xl p-6 bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700 mb-5">
                  <div className="flex justify-between">
                    <span className="text-zinc-400 text-sm">
                      {bankCard.brand}
                    </span>

                    <span>💳</span>
                  </div>

                  <p className="text-2xl tracking-widest mt-8">
                    •••• •••• ••••{" "}
                    {bankCard.last4}
                  </p>

                  <div className="flex justify-between mt-8">
                    <div>
                      <p className="text-zinc-500 text-xs">
                        CARDHOLDER
                      </p>

                      <p className="text-sm mt-1">
                        {
                          bankCard.cardholderName
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-500 text-xs">
                        EXP
                      </p>

                      <p className="text-sm mt-1">
                        {bankCard.expiry}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={
                    handleRemoveCard
                  }
                  className="w-full border border-red-500/40 text-red-400 p-3 rounded-xl font-semibold"
                >
                  Remove Card
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={cardholderName}
                  onChange={(e) =>
                    setCardholderName(
                      e.target.value
                    )
                  }
                  placeholder="Cardholder name"
                  className={`w-full p-3 rounded-xl mb-3 outline-none ${inputClass}`}
                />

                <input
                  type="text"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(e) =>
                    setCardNumber(
                      e.target.value
                    )
                  }
                  placeholder="Card number"
                  className={`w-full p-3 rounded-xl mb-3 outline-none ${inputClass}`}
                />

                <input
                  type="text"
                  value={expiry}
                  onChange={(e) =>
                    setExpiry(
                      e.target.value
                    )
                  }
                  placeholder="Expiry date"
                  className={`w-full p-3 rounded-xl mb-4 outline-none ${inputClass}`}
                />

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mb-4">
                  <p className="text-yellow-500 text-xs">
                   Card only
                  </p>
                </div>

                <button
                  onClick={
                    handleSaveCard
                  }
                  disabled={cardSaving}
                  className="w-full bg-white text-black p-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {cardSaving
                    ? "Saving..."
                    : "Save Card"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* SETTINGS */}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
          <div
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-6 ${
              isLight
                ? "bg-white text-zinc-950"
                : "bg-zinc-900 text-white"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  Settings
                </h2>

                <p className="text-zinc-500 text-sm mt-1">
                  Customize your MyPay
                  experience
                </p>
              </div>

              <button
                onClick={() =>
                  setShowSettings(false)
                }
                className="w-10 h-10 rounded-full bg-zinc-800 text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <SettingToggle
                icon="🔒"
                title="App Lock"
                description="Require an unlock before opening MyPay."
                enabled={appLock}
                onClick={() => {
                  const next =
                    !appLock;

                  setAppLock(next);
                  setRequireUnlock(next);
                }}
              />

              <SettingToggle
                icon="👆"
                title="Biometric Unlock"
                description="Use fingerprint or device biometrics when supported."
                enabled={biometric}
                onClick={() =>
                  setBiometric(
                    !biometric
                  )
                }
              />

              <SettingToggle
                icon="🔔"
                title="Transaction Notifications"
                description="Show notifications for USDT transfers."
                enabled={
                  transactionNotifications
                }
                onClick={() =>
                  setTransactionNotifications(
                    !transactionNotifications
                  )
                }
              />

              <SettingToggle
                icon="💰"
                title="USDT Request Notifications"
                description="Show notifications for USDT requests."
                enabled={
                  moneyRequestNotifications
                }
                onClick={() =>
                  setMoneyRequestNotifications(
                    !moneyRequestNotifications
                  )
                }
              />
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-3">
                Appearance
              </h3>

              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    "dark",
                    "light",
                    "system",
                  ] as ThemeType[]
                ).map((option) => (
                  <button
                    key={option}
                    onClick={() =>
                      setTheme(option)
                    }
                    className={`p-3 rounded-xl capitalize ${
                      theme === option
                        ? "bg-white text-black"
                        : "bg-zinc-800 text-white"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full mt-6 border border-red-500/40 text-red-400 p-3 rounded-xl font-semibold"
            >
              Log Out
            </button>
          </div>
        </div>
      )}

      {/* APP LOCK */}

      {requireUnlock && appLock && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-6xl mb-6">
              🔒
            </div>

            <h2 className="text-3xl font-bold text-white">
              MyPay Locked
            </h2>

            <p className="text-zinc-500 mt-2">
              Unlock to continue
            </p>

            <button
              onClick={() =>
                setRequireUnlock(false)
              }
              className="bg-white text-black px-8 py-3 rounded-xl font-bold mt-6"
            >
              {biometric
                ? "👆 Unlock with Biometrics"
                : "Unlock MyPay"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ==================================================
// ACTION BUTTON
// ==================================================

function ActionButton({
  icon,
  title,
  onClick,
}: {
  icon: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 p-5 text-left transition"
    >
      <div className="text-2xl mb-3">
        {icon}
      </div>

      <p className="font-semibold">
        {title}
      </p>
    </button>
  );
}

// ==================================================
// TRANSACTION ROW
// ==================================================

function TransactionRow({
  item,
  currentUserId,
}: {
  item: Transaction;
  currentUserId: string;
}) {
  const amount = Number(
    item.amount || 0
  );

  const isOutgoing =
    item.sender_id === currentUserId;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isOutgoing
              ? "bg-red-500/10"
              : "bg-green-500/10"
          }`}
        >
          {isOutgoing
            ? "↗️"
            : "↙️"}
        </div>

        <div>
          <p className="font-semibold">
            {isOutgoing
              ? "USDT Sent"
              : "USDT Received"}
          </p>

          <p className="text-xs text-zinc-500">
            {item.created_at
              ? new Date(
                  item.created_at
                ).toLocaleString()
              : "Recent"}
          </p>
        </div>
      </div>

      <p
        className={`font-bold ${
          isOutgoing
            ? "text-red-400"
            : "text-green-400"
        }`}
      >
        {isOutgoing ? "-" : "+"}
        {formatUSDT(amount)}
      </p>
    </div>
  );
}

// ==================================================
// SETTING TOGGLE
// ==================================================

function SettingToggle({
  icon,
  title,
  description,
  enabled,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-zinc-800 text-left"
    >
      <div className="text-xl">
        {icon}
      </div>

      <div className="flex-1">
        <p className="font-semibold">
          {title}
        </p>

        <p className="text-xs text-zinc-500 mt-1">
          {description}
        </p>
      </div>

      <div
        className={`w-11 h-6 rounded-full p-1 transition ${
          enabled
            ? "bg-green-500"
            : "bg-zinc-600"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white transition ${
            enabled
              ? "translate-x-5"
              : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}

// ==================================================
// CARD BRAND
// ==================================================

function detectCardBrand(
  cardNumber: string
) {
  if (/^4/.test(cardNumber)) {
    return "VISA";
  }

  if (
    /^(5[1-5]|2[2-7])/.test(
      cardNumber
    )
  ) {
    return "MASTERCARD";
  }

  if (/^3[47]/.test(cardNumber)) {
    return "AMEX";
  }

  return "CARD";
}