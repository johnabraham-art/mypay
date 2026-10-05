"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ActionType = "send" | "receive" | "request" | null;
type ThemeType = "dark" | "light" | "system";

type SuccessPanel =
  | {
      type: "transaction" | "request";
      amount: number;
      email: string;
    }
  | null;

type DemoCard = {
  cardholderName: string;
  last4: string;
  brand: string;
  expiry: string;
};

export default function Home() {
  // =========================
  // BASIC WALLET STATE
  // =========================

  const [balance, setBalance] = useState<number | null>(null);
  const [showBalance, setShowBalance] = useState(true);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");

  const [requestEmail, setRequestEmail] = useState("");
  const [requestAmount, setRequestAmount] = useState("");

  const [history, setHistory] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [requestLoading, setRequestLoading] = useState(false);
  const [respondingToRequest, setRespondingToRequest] =
    useState<string | null>(null);

  // =========================
  // PANELS
  // =========================

  const [activeAction, setActiveAction] =
    useState<ActionType>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCardPanel, setShowCardPanel] = useState(false);

  const [successPanel, setSuccessPanel] =
    useState<SuccessPanel>(null);

  // =========================
  // BANK CARD STATE
  // =========================

  const [bankCard, setBankCard] =
    useState<DemoCard | null>(null);

  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cardSaving, setCardSaving] = useState(false);

  // =========================
  // SETTINGS STATE
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
  // LOAD SAVED SETTINGS
  // =========================

  useEffect(() => {
    const savedTheme = localStorage.getItem(
      "mypay-theme"
    ) as ThemeType | null;

    if (savedTheme) {
      setTheme(savedTheme);
    }

    const savedAppLock =
      localStorage.getItem("mypay-app-lock");

    const savedBiometric =
      localStorage.getItem("mypay-biometric");

    const savedRequireUnlock =
      localStorage.getItem("mypay-require-unlock");

    const savedTransactionNotifications =
      localStorage.getItem(
        "mypay-transaction-notifications"
      );

    const savedMoneyRequestNotifications =
      localStorage.getItem(
        "mypay-money-request-notifications"
      );

    const savedCard =
      localStorage.getItem("mypay-demo-card");

    if (savedAppLock !== null) {
      setAppLock(savedAppLock === "true");
    }

    if (savedBiometric !== null) {
      setBiometric(savedBiometric === "true");
    }

    if (savedRequireUnlock !== null) {
      setRequireUnlock(savedRequireUnlock === "true");
    }

    if (savedTransactionNotifications !== null) {
      setTransactionNotifications(
        savedTransactionNotifications === "true"
      );
    }

    if (savedMoneyRequestNotifications !== null) {
      setMoneyRequestNotifications(
        savedMoneyRequestNotifications === "true"
      );
    }

    if (savedCard) {
      try {
        setBankCard(JSON.parse(savedCard));
      } catch {
        localStorage.removeItem("mypay-demo-card");
      }
    }
  }, []);

  // =========================
  // APPLY INITIAL THEME
  // =========================

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add(
        "mypay-light"
      );
    } else if (theme === "dark") {
      document.documentElement.classList.remove(
        "mypay-light"
      );
    } else {
      const prefersLight =
        window.matchMedia(
          "(prefers-color-scheme: light)"
        ).matches;

      if (prefersLight) {
        document.documentElement.classList.add(
          "mypay-light"
        );
      } else {
        document.documentElement.classList.remove(
          "mypay-light"
        );
      }
    }
  }, [theme]);

  // =========================
  // LOAD TRANSACTION HISTORY
  // =========================

  const loadHistory = async (userId: string) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .or(
        `sender_id.eq.${userId},recipient_id.eq.${userId}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log("HISTORY ERROR:", error.message);
      return;
    }

    setHistory(data || []);
  };

  // =========================
  // LOAD INCOMING REQUESTS
  // =========================

  const loadIncomingRequests = async (
    userId: string
  ) => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("money_requests")
      .select("*")
      .eq("requested_from_id", userId)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.log("REQUEST ERROR:", error.message);
      return;
    }

    setIncomingRequests(data || []);
  };

  // =========================
  // START APP
  // =========================

  useEffect(() => {
    const startApp = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.log(
          "USER ERROR:",
          userError?.message
        );
        return;
      }

      setCurrentUserId(user.id);

      setUserName(
        user.user_metadata?.name || "MyPay User"
      );

      setUserEmail(user.email || "");

      await loadHistory(user.id);
      await loadIncomingRequests(user.id);

      // =========================
      // LOAD WALLET
      // =========================

      const {
        data: wallet,
        error: walletError,
      } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) {
        console.log(
          "WALLET ERROR:",
          walletError.message
        );
        return;
      }

      // =========================
      // CREATE WALLET IF NEEDED
      // =========================

      if (!wallet) {
        const {
          data: newWallet,
          error: createError,
        } = await supabase
          .from("wallets")
          .insert({
            user_id: user.id,
            balance: 125050,
          })
          .select("balance")
          .single();

        if (createError) {
          console.log(
            "CREATE WALLET ERROR:",
            createError.message
          );
          return;
        }

        setBalance(Number(newWallet.balance));
        return;
      }

      setBalance(Number(wallet.balance));
    };

    startApp();
  }, []);

  // =========================
  // SEND MONEY
  // =========================

  const handleTransfer = async () => {
    if (balance === null) {
      alert("Wallet is still loading");
      return;
    }

    const transferAmount = Number(amount);

    if (!email || !amount) {
      alert("Fill all fields");
      return;
    }

    if (transferAmount <= 0) {
      alert("Enter a valid amount");
      return;
    }

    if (transferAmount > balance) {
      alert("Insufficient funds");
      return;
    }

    const { error } = await supabase.rpc(
      "send_demo_money",
      {
        recipient_email: email,
        transfer_amount: transferAmount,
      }
    );

    if (error) {
      alert(
        "Transfer failed: " + error.message
      );
      return;
    }

    setBalance(balance - transferAmount);

    if (currentUserId) {
      await loadHistory(currentUserId);
    }

    const recipient = email;

    setEmail("");
    setAmount("");
    setActiveAction(null);

    setSuccessPanel({
      type: "transaction",
      amount: transferAmount,
      email: recipient,
    });
  };

  // =========================
  // REQUEST MONEY
  // =========================

  const handleRequestMoney = async () => {
    const requestAmountNumber =
      Number(requestAmount);

    if (!requestEmail || !requestAmount) {
      alert("Fill all fields");
      return;
    }

    if (requestAmountNumber <= 0) {
      alert("Enter a valid amount");
      return;
    }

    setRequestLoading(true);

    const { error } = await supabase.rpc(
      "create_money_request",
      {
        p_requested_from_email: requestEmail,
        p_amount: requestAmountNumber,
      }
    );

    setRequestLoading(false);

    if (error) {
      alert(
        "Request failed: " + error.message
      );
      return;
    }

    const requestedEmail = requestEmail;

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
  // ACCEPT / DECLINE REQUEST
  // =========================

  const handleRequestResponse = async (
    requestId: string,
    decision: "accepted" | "declined"
  ) => {
    setRespondingToRequest(requestId);

    const { data, error } = await supabase.rpc(
      "respond_to_money_request",
      {
        p_request_id: requestId,
        p_decision: decision,
      }
    );

    setRespondingToRequest(null);

    if (error) {
      alert(
        `${
          decision === "accepted"
            ? "Accept"
            : "Decline"
        } failed: ${error.message}`
      );

      return;
    }

    if (decision === "accepted") {
      alert(
        "Money request accepted. The money has been transferred."
      );
    } else {
      alert("Money request declined.");
    }

    if (currentUserId) {
      await loadIncomingRequests(
        currentUserId
      );

      await loadHistory(currentUserId);
    }

    if (
      decision === "accepted" &&
      currentUserId
    ) {
      const { data: wallet } =
        await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", currentUserId)
          .maybeSingle();

      if (wallet) {
        setBalance(Number(wallet.balance));
      }
    }

    console.log(
      "REQUEST RESPONSE:",
      data
    );
  };

  // ==================================================
  // BANK CARD FUNCTIONS
  // ==================================================

  const detectCardBrand = (number: string) => {
    const cleanNumber =
      number.replace(/\D/g, "");

    if (/^4/.test(cleanNumber)) {
      return "Visa";
    }

    if (
      /^(5[1-5]|2[2-7])/.test(cleanNumber)
    ) {
      return "Mastercard";
    }

    if (/^3[47]/.test(cleanNumber)) {
      return "American Express";
    }

    if (/^6(?:011|5)/.test(cleanNumber)) {
      return "Discover";
    }

    return "Bank Card";
  };

  const formatCardNumber = (
    value: string
  ) => {
    const clean = value
      .replace(/\D/g, "")
      .slice(0, 19);

    return clean
      .replace(/(.{4})/g, "$1 ")
      .trim();
  };

  const formatExpiry = (
    value: string
  ) => {
    const clean = value
      .replace(/\D/g, "")
      .slice(0, 4);

    if (clean.length <= 2) {
      return clean;
    }

    return `${clean.slice(
      0,
      2
    )}/${clean.slice(2)}`;
  };

  const saveBankCard = () => {
    const cleanNumber =
      cardNumber.replace(/\D/g, "");

    if (!cardholderName.trim()) {
      alert("Enter the cardholder name.");
      return;
    }

    if (
      cleanNumber.length < 12 ||
      cleanNumber.length > 19
    ) {
      alert(
        "Enter a valid demo card number."
      );
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      alert(
        "Enter the expiry date as MM/YY."
      );
      return;
    }

    setCardSaving(true);

    const newCard: DemoCard = {
      cardholderName:
        cardholderName.trim(),
      last4: cleanNumber.slice(-4),
      brand: detectCardBrand(cleanNumber),
      expiry,
    };

    // Only safe demo metadata is stored.
    // The full card number is NOT stored.
    // CVV is NOT collected.

    localStorage.setItem(
      "mypay-demo-card",
      JSON.stringify(newCard)
    );

    setBankCard(newCard);

    setCardNumber("");
    setCardholderName("");
    setExpiry("");

    setCardSaving(false);
    setShowCardPanel(false);

    alert(
      "Demo bank card added successfully."
    );
  };

  const removeBankCard = () => {
    localStorage.removeItem(
      "mypay-demo-card"
    );

    setBankCard(null);
    setShowCardPanel(false);
  };

  // =========================
  // LOGOUT
  // =========================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  // =========================
  // SETTINGS FUNCTIONS
  // =========================

  const changeTheme = (
    newTheme: ThemeType
  ) => {
    setTheme(newTheme);

    localStorage.setItem(
      "mypay-theme",
      newTheme
    );

    if (newTheme === "light") {
      document.documentElement.classList.add(
        "mypay-light"
      );
    } else if (newTheme === "dark") {
      document.documentElement.classList.remove(
        "mypay-light"
      );
    } else {
      const prefersLight =
        window.matchMedia(
          "(prefers-color-scheme: light)"
        ).matches;

      if (prefersLight) {
        document.documentElement.classList.add(
          "mypay-light"
        );
      } else {
        document.documentElement.classList.remove(
          "mypay-light"
        );
      }
    }
  };

  const toggleAppLock = () => {
    const newValue = !appLock;

    setAppLock(newValue);

    localStorage.setItem(
      "mypay-app-lock",
      String(newValue)
    );
  };

  const toggleBiometric = async () => {
    if (!window.PublicKeyCredential) {
      alert(
        "Biometric authentication is not supported by this browser."
      );
      return;
    }

    const newValue = !biometric;

    setBiometric(newValue);

    localStorage.setItem(
      "mypay-biometric",
      String(newValue)
    );

    if (newValue) {
      alert(
        "Biometric support is enabled in your MyPay settings. Actual fingerprint authentication will be connected using WebAuthn."
      );
    }
  };

  const toggleRequireUnlock = () => {
    const newValue = !requireUnlock;

    setRequireUnlock(newValue);

    localStorage.setItem(
      "mypay-require-unlock",
      String(newValue)
    );
  };

  const toggleTransactionNotifications =
    () => {
      const newValue =
        !transactionNotifications;

      setTransactionNotifications(
        newValue
      );

      localStorage.setItem(
        "mypay-transaction-notifications",
        String(newValue)
      );
    };

  const toggleMoneyRequestNotifications =
    () => {
      const newValue =
        !moneyRequestNotifications;

      setMoneyRequestNotifications(
        newValue
      );

      localStorage.setItem(
        "mypay-money-request-notifications",
        String(newValue)
      );
    };

  // =========================
  // PAGE
  // =========================

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-sm mx-auto">

        {/* HEADER */}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              MY PAY
            </h1>

            <p className="text-zinc-500 text-sm mt-1">
              Your wallet dashboard
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setShowSettings(true)
              }
              className="w-11 h-11 rounded-full bg-zinc-900 flex items-center justify-center text-xl hover:bg-zinc-800 transition"
              aria-label="Open settings"
            >
              ⚙️
            </button>

            <div className="w-11 h-11 rounded-full bg-zinc-700 flex items-center justify-center text-xl">
              👤
            </div>
          </div>
        </div>

        {/* PROFILE */}

        <div className="bg-zinc-900 rounded-3xl p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center text-2xl">
              👤
            </div>

            <div>
              <p className="text-lg font-semibold">
                {userName || "MyPay User"}
              </p>

              <p className="text-zinc-500 text-sm">
                {userEmail ||
                  "No email available"}
              </p>
            </div>
          </div>
        </div>

        {/* WALLET BALANCE */}

        <div className="bg-zinc-900 rounded-3xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <p className="text-zinc-400 text-sm">
              Wallet Balance
            </p>

            <button
              onClick={() =>
                setShowBalance(!showBalance)
              }
              className="text-zinc-400 hover:text-white text-xl"
            >
              {showBalance ? "👁️" : "🙈"}
            </button>
          </div>

          <h2 className="text-4xl font-bold mt-2">
            {balance === null
              ? "Loading..."
              : showBalance
              ? `$${balance.toLocaleString()}`
              : "••••••"}
          </h2>

          <button
            onClick={() =>
              setShowHistory(true)
            }
            className="text-blue-400 text-sm mt-4 hover:underline"
          >
            Transaction History →
          </button>
        </div>

        {/* =========================
            SMALL BANK CARD SECTION
        ========================= */}

        <button
          onClick={() =>
            setShowCardPanel(true)
          }
          className="w-full bg-zinc-900 rounded-2xl p-4 mb-5 text-left hover:bg-zinc-800 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                💳
              </div>

              <div>
                <p className="text-zinc-400 text-xs">
                  Bank Card
                </p>

                <p className="font-semibold text-sm mt-1">
                  {bankCard
                    ? `${bankCard.brand} •••• ${bankCard.last4}`
                    : "No card connected"}
                </p>
              </div>
            </div>

            <span className="text-zinc-400 text-lg">
              →
            </span>
          </div>
        </button>

        {/* ACTION BUTTONS */}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() =>
              setActiveAction(
                activeAction === "send"
                  ? null
                  : "send"
              )
            }
            className="bg-zinc-900 rounded-3xl p-5 text-left hover:bg-zinc-800 transition"
          >
            <div className="text-2xl mb-3">
              📤
            </div>

            <p className="font-semibold">
              Send Money
            </p>

            <p className="text-zinc-500 text-sm mt-1">
              Send money to another user
            </p>
          </button>

          <button
            onClick={() =>
              setActiveAction(
                activeAction === "receive"
                  ? null
                  : "receive"
              )
            }
            className="bg-zinc-900 rounded-3xl p-5 text-left hover:bg-zinc-800 transition"
          >
            <div className="text-2xl mb-3">
              📥
            </div>

            <p className="font-semibold">
              Receive Money
            </p>

            <p className="text-zinc-500 text-sm mt-1">
              Receive money from another user
            </p>
          </button>

          <button
            onClick={() =>
              setActiveAction(
                activeAction === "request"
                  ? null
                  : "request"
              )
            }
            className="bg-zinc-900 rounded-3xl p-5 text-left hover:bg-zinc-800 transition"
          >
            <div className="text-2xl mb-3">
              📨
            </div>

            <p className="font-semibold">
              Request Money
            </p>

            <p className="text-zinc-500 text-sm mt-1">
              Ask another user for money
            </p>
          </button>
        </div>

        {/* INCOMING REQUESTS */}

        {incomingRequests.length > 0 && (
          <div className="bg-zinc-900 rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">
                Money Requests
              </h3>

              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                {incomingRequests.length}
              </span>
            </div>

            <div className="space-y-4">
              {incomingRequests.map(
                (request) => (
                  <div
                    key={request.id}
                    className="bg-zinc-800 rounded-2xl p-4"
                  >
                    <p className="font-semibold">
                      Money Request
                    </p>

                    <p className="text-zinc-400 text-sm mt-1">
                      Account ID:
                    </p>

                    <p className="text-zinc-300 text-xs break-all">
                      {request.requester_id}
                    </p>

                    <p className="text-2xl font-bold mt-3">
                      $
                      {Number(
                        request.amount
                      ).toLocaleString()}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() =>
                          handleRequestResponse(
                            request.id,
                            "accepted"
                          )
                        }
                        disabled={
                          respondingToRequest ===
                          request.id
                        }
                        className="bg-green-500 text-black p-3 rounded-xl font-bold disabled:opacity-50"
                      >
                        {respondingToRequest ===
                        request.id
                          ? "..."
                          : "Accept"}
                      </button>

                      <button
                        onClick={() =>
                          handleRequestResponse(
                            request.id,
                            "declined"
                          )
                        }
                        disabled={
                          respondingToRequest ===
                          request.id
                        }
                        className="bg-red-500 text-white p-3 rounded-xl font-bold disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* QUICK HISTORY */}

        <div className="bg-zinc-900 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Recent Activity
            </h3>

            <button
              onClick={() =>
                setShowHistory(true)
              }
              className="text-blue-400 text-sm"
            >
              See all
            </button>
          </div>

          {history.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              No transactions yet.
            </p>
          ) : (
            history
              .slice(0, 3)
              .map(
                (transaction, index) => {
                  const isSent =
                    transaction.sender_id ===
                    currentUserId;

                  return (
                    <div
                      key={index}
                      className="flex justify-between py-3 border-b border-zinc-800 last:border-0"
                    >
                      <div>
                        <p className="font-semibold">
                          {isSent
                            ? "Sent"
                            : "Received"}
                        </p>

                        <p className="text-zinc-500 text-sm">
                          {isSent
                            ? `To: ${transaction.recipient_email}`
                            : `From: ${transaction.sender_id}`}
                        </p>
                      </div>

                      <span className="font-bold">
                        {isSent ? "-" : "+"}$
                        {Number(
                          transaction.amount
                        ).toLocaleString()}
                      </span>
                    </div>
                  );
                }
              )
          )}
        </div>
      </div>

      {/* ==================================================
          SEND / RECEIVE / REQUEST MODAL
      ================================================== */}

      {activeAction && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {activeAction === "send"
                  ? "Send Money"
                  : activeAction === "receive"
                  ? "Receive Money"
                  : "Request Money"}
              </h2>

              <button
                onClick={() =>
                  setActiveAction(null)
                }
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* SEND */}

            {activeAction === "send" && (
              <>
                <input
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="Recipient email"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-3 outline-none"
                />

                <input
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value)
                  }
                  type="number"
                  placeholder="Amount"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-4 outline-none"
                />

                <button
                  onClick={handleTransfer}
                  className="w-full bg-white text-black p-3 rounded-xl font-bold"
                >
                  Transfer Now
                </button>
              </>
            )}

            {/* RECEIVE */}

            {activeAction === "receive" && (
              <>
                <p className="text-zinc-400 text-sm mb-4">
                  Give your email to another
                  MyPay user so they can send
                  money to you.
                </p>

                <div className="bg-zinc-800 rounded-xl p-4">
                  <p className="text-zinc-500 text-xs mb-1">
                    YOUR EMAIL
                  </p>

                  <p className="font-semibold break-all">
                    {userEmail ||
                      "Loading..."}
                  </p>
                </div>
              </>
            )}

            {/* REQUEST */}

            {activeAction === "request" && (
              <>
                <p className="text-zinc-400 text-sm mb-4">
                  Ask another user to send
                  money to you.
                </p>

                <input
                  type="email"
                  value={requestEmail}
                  onChange={(e) =>
                    setRequestEmail(
                      e.target.value
                    )
                  }
                  placeholder="Person's email"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-3 outline-none"
                />

                <input
                  type="number"
                  value={requestAmount}
                  onChange={(e) =>
                    setRequestAmount(
                      e.target.value
                    )
                  }
                  placeholder="Amount"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-4 outline-none"
                />

                <button
                  onClick={handleRequestMoney}
                  disabled={requestLoading}
                  className="w-full bg-white text-black p-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {requestLoading
                    ? "Sending Request..."
                    : "Send Request"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================================================
          BANK CARD MODAL
      ================================================== */}

      {showCardPanel && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-2xl">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">
                  {bankCard
                    ? "Manage Bank Card"
                    : "Add Bank Card"}
                </h2>

                <p className="text-zinc-500 text-sm mt-1">
                  Manage your MyPay demo card
                </p>
              </div>

              <button
                onClick={() =>
                  setShowCardPanel(false)
                }
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700"
              >
                ✕
              </button>
            </div>

            {bankCard ? (
              <>
                {/* CARD PREVIEW */}

                <div className="rounded-2xl p-5 bg-gradient-to-br from-zinc-700 to-zinc-950 border border-zinc-700 mb-5">
                  <div className="flex justify-between">
                    <span className="font-bold">
                      {bankCard.brand}
                    </span>

                    <span>💳</span>
                  </div>

                  <p className="text-xl tracking-widest mt-8">
                    •••• •••• ••••{" "}
                    {bankCard.last4}
                  </p>

                  <div className="flex justify-between mt-6">
                    <div>
                      <p className="text-zinc-400 text-[10px] uppercase">
                        Cardholder
                      </p>

                      <p className="font-semibold text-sm">
                        {bankCard.cardholderName}
                      </p>
                    </div>

                    <div>
                      <p className="text-zinc-400 text-[10px] uppercase">
                        Expires
                      </p>

                      <p className="font-semibold text-sm">
                        {bankCard.expiry}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={removeBankCard}
                  className="w-full bg-red-500/10 text-red-400 p-3 rounded-xl font-bold hover:bg-red-500/20"
                >
                  Remove Card
                </button>
              </>
            ) : (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
                  <p className="text-yellow-400 text-sm">
                    Demo card only
                  </p>

                  <p className="text-zinc-400 text-xs mt-1">
                    Do not enter a real card number
                    or CVV here. This demo stores
                    only the last 4 digits and basic
                    card information.
                  </p>
                </div>

                <label className="text-sm text-zinc-400">
                  Cardholder Name
                </label>

                <input
                  value={cardholderName}
                  onChange={(e) =>
                    setCardholderName(
                      e.target.value
                    )
                  }
                  placeholder="John Doe"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-4 mt-2 outline-none"
                />

                <label className="text-sm text-zinc-400">
                  Demo Card Number
                </label>

                <input
                  value={formatCardNumber(
                    cardNumber
                  )}
                  onChange={(e) =>
                    setCardNumber(
                      e.target.value
                    )
                  }
                  inputMode="numeric"
                  placeholder="4111 1111 1111 1111"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-4 mt-2 outline-none"
                />

                <label className="text-sm text-zinc-400">
                  Expiry
                </label>

                <input
                  value={expiry}
                  onChange={(e) =>
                    setExpiry(
                      formatExpiry(
                        e.target.value
                      )
                    )
                  }
                  inputMode="numeric"
                  placeholder="MM/YY"
                  className="w-full bg-zinc-800 p-3 rounded-xl mb-5 mt-2 outline-none"
                />

                <button
                  onClick={saveBankCard}
                  disabled={cardSaving}
                  className="w-full bg-white text-black p-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {cardSaving
                    ? "Adding Card..."
                    : "Add Bank Card"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================================================
          TRANSACTION HISTORY MODAL
      ================================================== */}

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-sm mx-auto min-h-full flex items-center justify-center">
            <div className="w-full bg-zinc-900 rounded-3xl p-6 shadow-2xl">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    Transaction History
                  </h2>

                  <p className="text-zinc-500 text-sm mt-1">
                    Your recent wallet activity
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowHistory(false)
                  }
                  className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700"
                >
                  ✕
                </button>
              </div>

              {history.length === 0 ? (
                <p className="text-zinc-500 text-sm">
                  No transactions yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map(
                    (transaction, index) => {
                      const isSent =
                        transaction.sender_id ===
                        currentUserId;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-zinc-800 rounded-2xl p-4"
                        >
                          <div>
                            <p className="font-semibold">
                              {isSent
                                ? "Sent"
                                : "Received"}
                            </p>

                            <p className="text-zinc-500 text-xs mt-1 break-all">
                              {isSent
                                ? `To: ${transaction.recipient_email}`
                                : `From: ${transaction.sender_id}`}
                            </p>

                            {transaction.created_at && (
                              <p className="text-zinc-600 text-xs mt-1">
                                {new Date(
                                  transaction.created_at
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <span className="font-bold">
                            {isSent
                              ? "-"
                              : "+"}
                            $
                            {Number(
                              transaction.amount
                            ).toLocaleString()}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          SETTINGS MODAL
      ================================================== */}

      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="max-w-sm mx-auto min-h-full flex items-center justify-center">
            <div className="w-full bg-zinc-900 rounded-3xl p-6 shadow-2xl">

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    Settings
                  </h2>

                  <p className="text-zinc-500 text-sm mt-1">
                    Customize your MyPay experience
                  </p>
                </div>

                <button
                  onClick={() =>
                    setShowSettings(false)
                  }
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg hover:bg-zinc-700"
                >
                  ✕
                </button>
              </div>

              {/* PRIVACY */}

              <div className="mb-6">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                  Privacy & Security
                </p>

                <div className="space-y-2">
                  <SettingToggle
                    icon="🔒"
                    title="Private App Lock"
                    description="Protect MyPay with an app lock"
                    enabled={appLock}
                    onClick={toggleAppLock}
                  />

                  <SettingToggle
                    icon="👆"
                    title="Fingerprint / Biometric Unlock"
                    description="Use device biometrics when supported"
                    enabled={biometric}
                    onClick={toggleBiometric}
                  />

                  <SettingToggle
                    icon="🔐"
                    title="Require unlock on opening"
                    description="Ask for verification when opening MyPay"
                    enabled={requireUnlock}
                    onClick={toggleRequireUnlock}
                  />
                </div>
              </div>

              {/* APPEARANCE */}

              <div className="mb-6">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                  Appearance
                </p>

                <div className="bg-zinc-800 rounded-2xl p-2">
                  <button
                    onClick={() =>
                      changeTheme("dark")
                    }
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition ${
                      theme === "dark"
                        ? "bg-white text-black"
                        : "text-white hover:bg-zinc-700"
                    }`}
                  >
                    <span>🌙 Dark Mode</span>

                    {theme === "dark" && (
                      <span>✓</span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      changeTheme("light")
                    }
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition ${
                      theme === "light"
                        ? "bg-white text-black"
                        : "text-white hover:bg-zinc-700"
                    }`}
                  >
                    <span>☀️ Light Mode</span>

                    {theme === "light" && (
                      <span>✓</span>
                    )}
                  </button>

                  <button
                    onClick={() =>
                      changeTheme("system")
                    }
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition ${
                      theme === "system"
                        ? "bg-white text-black"
                        : "text-white hover:bg-zinc-700"
                    }`}
                  >
                    <span>
                      🌓 System Default
                    </span>

                    {theme === "system" && (
                      <span>✓</span>
                    )}
                  </button>
                </div>
              </div>

              {/* NOTIFICATIONS */}

              <div className="mb-6">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                  Notifications
                </p>

                <div className="space-y-2">
                  <SettingToggle
                    icon="🔔"
                    title="Transaction Notifications"
                    description="Get notified about transactions"
                    enabled={
                      transactionNotifications
                    }
                    onClick={
                      toggleTransactionNotifications
                    }
                  />

                  <SettingToggle
                    icon="💰"
                    title="Money Request Notifications"
                    description="Get notified about money requests"
                    enabled={
                      moneyRequestNotifications
                    }
                    onClick={
                      toggleMoneyRequestNotifications
                    }
                  />
                </div>
              </div>

              {/* ACCOUNT */}

              <div>
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                  Account
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      alert(
                        `Profile\n\nName: ${
                          userName ||
                          "MyPay User"
                        }\nEmail: ${
                          userEmail ||
                          "No email available"
                        }`
                      );
                    }}
                    className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-4 rounded-2xl text-left transition"
                  >
                    <span className="text-xl">
                      👤
                    </span>

                    <div>
                      <p className="font-semibold">
                        Profile
                      </p>

                      <p className="text-zinc-500 text-xs">
                        View your profile
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      alert(
                        userEmail ||
                          "No email available"
                      );
                    }}
                    className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 p-4 rounded-2xl text-left transition"
                  >
                    <span className="text-xl">
                      📧
                    </span>

                    <div>
                      <p className="font-semibold">
                        Email
                      </p>

                      <p className="text-zinc-500 text-xs break-all">
                        {userEmail ||
                          "No email available"}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 p-4 rounded-2xl text-left transition"
                  >
                    <span className="text-xl">
                      🚪
                    </span>

                    <div>
                      <p className="font-semibold">
                        Logout
                      </p>

                      <p className="text-red-400/60 text-xs">
                        Sign out of MyPay
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          SUCCESS PANEL
      ================================================== */}

      {successPanel && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-sm bg-zinc-900 rounded-3xl p-7 text-center shadow-2xl">

            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center text-3xl mb-5">
              ✓
            </div>

            <h2 className="text-2xl font-bold">
              {successPanel.type ===
              "transaction"
                ? "Transaction Successful"
                : "Request Successful"}
            </h2>

            <p className="text-zinc-400 text-sm mt-2">
              {successPanel.type ===
              "transaction"
                ? `Money sent successfully to ${successPanel.email}`
                : `Your money request was sent to ${successPanel.email}`}
            </p>

            <p className="text-4xl font-bold mt-6">
              $
              {successPanel.amount.toLocaleString()}
            </p>

            <button
              onClick={() =>
                setSuccessPanel(null)
              }
              className="w-full bg-white text-black p-3 rounded-xl font-bold mt-6"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ==================================================
// SETTINGS TOGGLE COMPONENT
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
      className="w-full flex items-center justify-between bg-zinc-800 hover:bg-zinc-700 p-4 rounded-2xl text-left transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">
          {icon}
        </span>

        <div>
          <p className="font-semibold">
            {title}
          </p>

          <p className="text-zinc-500 text-xs mt-1">
            {description}
          </p>
        </div>
      </div>

      <div
        className={`w-11 h-6 rounded-full p-1 transition ${
          enabled
            ? "bg-green-500"
            : "bg-zinc-600"
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full transition-transform ${
            enabled
              ? "translate-x-5"
              : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}