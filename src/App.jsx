import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import ProfileModal from "./components/ProfileModal.jsx";
import AccountBookCreatePage from "./pages/AccountBookCreatePage.jsx";
import AccountBookDetailPage from "./pages/AccountBookDetailPage.jsx";
import AccountBookListPage from "./pages/AccountBookListPage.jsx";
import AccountBookMonthPage from "./pages/AccountBookMonthPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import SupabaseTestPage from "./pages/SupabaseTestPage.jsx";
import { supabase } from "./lib/supabaseClient";
import {
  createAccountBook,
  deleteAccountBook,
  fetchAccountBooks,
  updateAccountBookName as updateAccountBookNameInDb,
  updateAccountBookStartMonth,
} from "./services/accountBookService.js";
import {
  createAccountBookMonth,
  deleteAccountBookMonth,
  fetchAccountBookMonths,
  updateAccountBookMonth,
} from "./services/accountBookMonthService.js";
import {
  createAccountBookCategory,
  deleteAccountBookCategory,
  fetchAccountBookCategories,
  syncAccountBookCategories,
  updateAccountBookCategory,
} from "./services/accountBookCategoryService.js";
import {
  fetchTransactions,
  syncTransactions,
} from "./services/transactionService.js";
import {
  fetchProfile,
  updateProfileNickname,
  upsertProfile,
} from "./services/profileService.js";
import LoginPage from "./pages/LoginPage.jsx";
import bchar from "./assets/image/char/bchar.png";
import bcharClicked from "./assets/image/char/bchar_c.png";
import ychar from "./assets/image/char/ychar.png";
import ycharClicked from "./assets/image/char/ychar_c.png";
import "./App.css";

const hasAccountBooks = (accountBooks) => accountBooks.length > 0;

const EMPTY_CATEGORY_TYPES = { expense: [], income: [] };
const TRANSACTION_SAVE_DELAY = 800;
const AUTH_CHECK_TIMEOUT = 5000;

const getTransactionSaveKey = (accountBookId, month) =>
  `${accountBookId}:${month}`;

const getTransactionDraftKey = (accountBookId, month) =>
  `transaction-draft:${accountBookId}:${month}`;

const readTransactionDraft = (accountBookId, month) => {
  const rawDraft = sessionStorage.getItem(
    getTransactionDraftKey(accountBookId, month),
  );

  if (!rawDraft) {
    return null;
  }

  try {
    return JSON.parse(rawDraft);
  } catch {
    sessionStorage.removeItem(getTransactionDraftKey(accountBookId, month));
    return null;
  }
};

const writeTransactionDraft = (accountBookId, month, transactions) => {
  sessionStorage.setItem(
    getTransactionDraftKey(accountBookId, month),
    JSON.stringify(transactions),
  );
};

const clearTransactionDraft = (accountBookId, month) => {
  sessionStorage.removeItem(getTransactionDraftKey(accountBookId, month));
};

const getNextMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextDate = new Date(year, monthNumber, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
};

const getLatestMonth = (months) => {
  return [...months].sort((a, b) => b.month.localeCompare(a.month))[0];
};

const getLatestMonthValue = (months) => {
  return getLatestMonth(months)?.month;
};

const getRandomCharacterPosition = (motion) => ({
  x: motion.minX + Math.random() * (motion.maxX - motion.minX),
  y: motion.minY + Math.random() * (motion.maxY - motion.minY),
});

const getLoginIdFromUser = (user) => {
  return (
    user?.user_metadata?.login_id ||
    user?.user_metadata?.nickname ||
    user?.email?.split("@")[0] ||
    "user"
  );
};

const toCurrentUser = (user, profile = null) => {
  const loginId = profile?.login_id || getLoginIdFromUser(user);

  return {
    id: user.id,
    userId: loginId,
    nickname: profile?.nickname || loginId,
    email: user.email,
  };
};

const withTimeout = (promise, timeoutMs, errorMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
};

const loadUserProfile = async (user) => {
  if (!user) {
    return { currentUser: null, profile: null };
  }

  const fallbackLoginId = getLoginIdFromUser(user);

  try {
    const existingProfile = await fetchProfile(user.id);

    if (existingProfile) {
      return {
        currentUser: toCurrentUser(user, existingProfile),
        profile: existingProfile,
      };
    }

    const createdProfile = await upsertProfile({
      user_id: user.id,
      login_id: fallbackLoginId,
      nickname: fallbackLoginId,
    });

    return {
      currentUser: toCurrentUser(user, createdProfile),
      profile: createdProfile,
    };
  } catch (error) {
    console.error("Load profile error:", error);
    return { currentUser: toCurrentUser(user), profile: null };
  }
};

const CHARACTER_MOTIONS = {
  b: {
    acceleration: 0.0002,
    damping: 0.99,
    maxVelocity: 0.038,
    minX: 18,
    maxX: 80,
    minY: 14,
    maxY: 76,
    targetBaseTime: 10500,
    targetExtraTime: 7600,
    waveA: 1800,
    waveB: 2300,
    waveStrength: 0.009,
    waveType: "loop",
  },
  y: {
    acceleration: 0.00035,
    damping: 0.986,
    maxVelocity: 0.052,
    minX: 4,
    maxX: 72,
    minY: 10,
    maxY: 70,
    targetBaseTime: 7200,
    targetExtraTime: 4600,
    waveA: 1200,
    waveB: 1650,
    waveStrength: 0.012,
    waveType: "float",
  },
};

function AppShell({ nickname, onLogout, onOpenProfile, children }) {
  return (
    <div className="app-shell">
      <AppHeader
        nickname={nickname}
        onLogout={onLogout}
        onOpenProfile={onOpenProfile}
      />
      {children}
    </div>
  );
}

function FloatingCharacter({
  clickedImage,
  image,
  initialPosition,
  motionConfig,
}) {
  const characterRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const motionRef = useRef({
    config: motionConfig,
    dragging: false,
    nextTargetAt: 0,
    seed: Math.random() * 100,
    target: getRandomCharacterPosition(motionConfig),
    vx: 0,
    vy: 0,
    x: initialPosition.x,
    y: initialPosition.y,
  });
  const dragRef = useRef({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const animate = () => {
      const character = characterRef.current;
      const motion = motionRef.current;
      const time = window.performance.now();

      if (character && !motion.dragging) {
        const distanceX = motion.target.x - motion.x;
        const distanceY = motion.target.y - motion.y;
        const distance = Math.hypot(distanceX, distanceY);

        if (time > motion.nextTargetAt || distance < 3) {
          motion.target = getRandomCharacterPosition(motion.config);
          motion.nextTargetAt =
            time +
            motion.config.targetBaseTime +
            Math.random() * motion.config.targetExtraTime;
        }

        const waveTimeA = time / motion.config.waveA + motion.seed;
        const waveTimeB = time / motion.config.waveB + motion.seed * 0.7;
        const swirlX =
          motion.config.waveType === "loop"
            ? Math.sin(waveTimeA) *
              Math.cos(waveTimeB) *
              motion.config.waveStrength
            : Math.sin(waveTimeA) * motion.config.waveStrength;
        const swirlY =
          motion.config.waveType === "loop"
            ? Math.cos(waveTimeB) * motion.config.waveStrength
            : Math.cos(waveTimeB) *
              Math.sin(waveTimeA) *
              motion.config.waveStrength;

        motion.vx =
          (motion.vx + distanceX * motion.config.acceleration + swirlX) *
          motion.config.damping;
        motion.vy =
          (motion.vy + distanceY * motion.config.acceleration + swirlY) *
          motion.config.damping;
        motion.vx = Math.min(
          Math.max(motion.vx, -motion.config.maxVelocity),
          motion.config.maxVelocity,
        );
        motion.vy = Math.min(
          Math.max(motion.vy, -motion.config.maxVelocity),
          motion.config.maxVelocity,
        );
        motion.x = Math.min(
          Math.max(motion.x + motion.vx, motion.config.minX),
          motion.config.maxX,
        );
        motion.y = Math.min(
          Math.max(motion.y + motion.vy, motion.config.minY),
          motion.config.maxY,
        );

        character.style.left = `${motion.x}%`;
        character.style.top = `${motion.y}%`;
      }
    };

    const intervalId = window.setInterval(animate, 80);
    return () => window.clearInterval(intervalId);
  }, []);

  const handlePointerDown = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();

    motionRef.current.dragging = true;
    setIsDragging(true);
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!motionRef.current.dragging) {
      return;
    }

    const { offsetX, offsetY } = dragRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const nextX = ((event.clientX - offsetX) / viewportWidth) * 100;
    const nextY = ((event.clientY - offsetY) / viewportHeight) * 100;

    motionRef.current.x = Math.min(
      Math.max(nextX, motionConfig.minX),
      motionConfig.maxX,
    );
    motionRef.current.y = Math.min(
      Math.max(nextY, motionConfig.minY),
      motionConfig.maxY,
    );
    motionRef.current.vx = 0;
    motionRef.current.vy = 0;
    motionRef.current.target = getRandomCharacterPosition(motionConfig);

    event.currentTarget.style.left = `${motionRef.current.x}%`;
    event.currentTarget.style.top = `${motionRef.current.y}%`;
  };

  const handlePointerUp = () => {
    motionRef.current.dragging = false;
    motionRef.current.nextTargetAt = 0;
    setIsDragging(false);
  };

  return (
    <img
      className="page-character"
      ref={characterRef}
      src={isDragging ? clickedImage : image}
      alt=""
      draggable="false"
      style={{
        left: `${initialPosition.x}%`,
        top: `${initialPosition.y}%`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

function PageCharacters() {
  return (
    <div className="page-characters" aria-hidden="true">
      <FloatingCharacter
        clickedImage={ycharClicked}
        image={ychar}
        initialPosition={{ x: 8, y: 52 }}
        motionConfig={CHARACTER_MOTIONS.y}
      />
      <FloatingCharacter
        clickedImage={bcharClicked}
        image={bchar}
        initialPosition={{ x: 78, y: 52 }}
        motionConfig={CHARACTER_MOTIONS.b}
      />
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [accountBooks, setAccountBooks] = useState([]);
  const [accountBooksLoading, setAccountBooksLoading] = useState(true);
  const [categoryTypes, setCategoryTypes] = useState(EMPTY_CATEGORY_TYPES);
  const [transactions, setTransactions] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const transactionSaveTimersRef = useRef({});
  const transactionSaveVersionsRef = useRef({});
  const savedTransactionsRef = useRef({});
  const pendingTransactionChangesRef = useRef({});

  const isLoggedIn = Boolean(currentUser);
  const startPath = "/account-books";
  const detailMatch = location.pathname.match(/^\/account-books\/([^/]+)$/);
  const detailAccountBookId =
    detailMatch?.[1] && detailMatch[1] !== "new" ? detailMatch[1] : undefined;
  const monthMatch = location.pathname.match(
    /^\/account-books\/([^/]+)\/months\/(\d{4}-\d{2})$/,
  );
  const monthAccountBookId = monthMatch?.[1];
  const selectedMonth = monthMatch?.[2];
  const activeAccountBookId = detailAccountBookId || monthAccountBookId;

  useEffect(() => {
    const transactionSaveTimers = transactionSaveTimersRef.current;

    return () => {
      Object.values(transactionSaveTimers).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const applyAuthUser = async (user) => {
      const nextUserProfile = await loadUserProfile(user);

      if (!isActive) {
        return;
      }

      setAccountBooksLoading(Boolean(user));
      setCurrentUser(nextUserProfile.currentUser);
      setProfile(nextUserProfile.profile);
      setIsAuthLoading(false);
    };

    const clearAuthUser = () => {
      if (!isActive) {
        return;
      }

      setAccountBooksLoading(false);
      setCurrentUser(null);
      setProfile(null);
      setIsAuthLoading(false);
    };

    const loadSession = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_CHECK_TIMEOUT,
          "Supabase session check timed out",
        );

        if (error) {
          console.error("Supabase session error:", error);
          clearAuthUser();
          return;
        }

        await applyAuthUser(data.session?.user);
      } catch (error) {
        console.error("Supabase session check failed:", error);
        clearAuthUser();
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applyAuthUser(session?.user).catch((error) => {
        console.error("Supabase auth state change failed:", error);
        clearAuthUser();
      });
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setAccountBooks([]);
      setAccountBooksLoading(false);
      return;
    }

    const loadAccountBooks = async () => {
      setAccountBooksLoading(true);

      try {
        const data = await fetchAccountBooks(currentUser.id);
        setAccountBooks(data);
      } catch (error) {
        console.error("Fetch account books error:", error);
        setAccountBooks([]);
      } finally {
        setAccountBooksLoading(false);
      }
    };

    loadAccountBooks();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !detailAccountBookId || accountBooksLoading) {
      return;
    }

    const loadMonths = async () => {
      try {
        const months = await fetchAccountBookMonths(detailAccountBookId);

        setAccountBooks((prevAccountBooks) =>
          prevAccountBooks.map((accountBook) =>
            accountBook.account_book_id === detailAccountBookId
              ? { ...accountBook, months }
              : accountBook,
          ),
        );
      } catch (error) {
        console.error("Fetch account book months error:", error);
      }
    };

    loadMonths();
  }, [accountBooksLoading, currentUser, detailAccountBookId]);

  useEffect(() => {
    if (!currentUser || !activeAccountBookId || accountBooksLoading) {
      setCategoryTypes(EMPTY_CATEGORY_TYPES);
      return;
    }

    const loadCategories = async () => {
      setCategoryTypes(EMPTY_CATEGORY_TYPES);

      try {
        const data = await fetchAccountBookCategories(activeAccountBookId);
        setCategoryTypes(data);
      } catch (error) {
        console.error("Fetch account book categories error:", error);
      }
    };

    loadCategories();
  }, [accountBooksLoading, currentUser, activeAccountBookId]);

  useEffect(() => {
    if (!currentUser || !monthAccountBookId || !selectedMonth) {
      return;
    }

    const loadTransactions = async () => {
      try {
        const data = await fetchTransactions(monthAccountBookId, selectedMonth);
        const saveKey = getTransactionSaveKey(monthAccountBookId, selectedMonth);
        const draftTransactions = readTransactionDraft(
          monthAccountBookId,
          selectedMonth,
        );
        const visibleTransactions = draftTransactions || data;

        savedTransactionsRef.current[saveKey] = data;
        pendingTransactionChangesRef.current[saveKey] =
          Boolean(draftTransactions);
        transactionSaveVersionsRef.current[saveKey] =
          transactionSaveVersionsRef.current[saveKey] || 0;

        setTransactions((prevTransactions) => ({
          ...prevTransactions,
          [monthAccountBookId]: {
            ...(prevTransactions[monthAccountBookId] || {}),
            [selectedMonth]: visibleTransactions,
          },
        }));
      } catch (error) {
        console.error("Fetch transactions error:", error);
      }
    };

    loadTransactions();
  }, [currentUser, monthAccountBookId, selectedMonth]);

  const handleLogin = async (account) => {
    setAccountBooksLoading(true);

    const nextUserProfile = await loadUserProfile({
      id: account.id,
      email: account.email,
      user_metadata: {
        login_id: account.userId,
        nickname: account.nickname,
      },
    });

    setCurrentUser(nextUserProfile.currentUser);
    setProfile(nextUserProfile.profile);

    return startPath;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();

    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userId");
    localStorage.removeItem("nickname");
    setCurrentUser(null);
    setProfile(null);
    setIsProfileModalOpen(false);
    navigate("/login", { replace: true });
  };

  const handleCreateAccountBook = async (accountBook) => {
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const newAccountBook = await createAccountBook(currentUser.id, accountBook);

      setAccountBooks((prevAccountBooks) => [
        ...prevAccountBooks,
        newAccountBook,
      ]);
      navigate(`/account-books/${newAccountBook.account_book_id}`, {
        replace: true,
      });
    } catch (error) {
      console.error("Create account book error:", error);
      alert("가계부 생성 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateAccountBookName = async (accountBookId, name) => {
    if (!currentUser) {
      return;
    }

    try {
      const updatedAccountBook = await updateAccountBookNameInDb(
        currentUser.id,
        accountBookId,
        name,
      );

      setAccountBooks((prevAccountBooks) =>
        prevAccountBooks.map((accountBook) =>
          accountBook.account_book_id === accountBookId
            ? {
                ...accountBook,
                ...updatedAccountBook,
                months: accountBook.months,
              }
            : accountBook,
        ),
      );
    } catch (error) {
      console.error("Update account book name error:", error);
      alert("가계부 이름 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteAccountBook = async (accountBookId) => {
    if (!currentUser) {
      return;
    }

    try {
      await deleteAccountBook(currentUser.id, accountBookId);

      setAccountBooks((prevAccountBooks) =>
        prevAccountBooks.filter(
          (accountBook) => accountBook.account_book_id !== accountBookId,
        ),
      );
    } catch (error) {
      console.error("Delete account book error:", error);
      alert("가계부 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleAddMonth = async (accountBookId) => {
    if (!currentUser) {
      return;
    }

    const accountBook = accountBooks.find(
      (item) => item.account_book_id === accountBookId,
    );

    if (!accountBook) {
      return;
    }

    const latestMonth = getLatestMonth(accountBook.months);
    const nextMonth = latestMonth
      ? getNextMonth(latestMonth.month)
      : accountBook.start_month;

    try {
      const newMonth = await createAccountBookMonth(accountBookId, nextMonth);
      const updatedAccountBook = await updateAccountBookStartMonth(
        currentUser.id,
        accountBookId,
        newMonth.month,
      );

      setAccountBooks((prevAccountBooks) =>
        prevAccountBooks.map((item) =>
          item.account_book_id === accountBookId
            ? {
                ...item,
                start_month: updatedAccountBook.start_month,
                updated_at: updatedAccountBook.updated_at,
                months: [...item.months, newMonth],
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Create account book month error:", error);
      alert("월 추가 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateMonth = async (accountBookId, currentMonth, nextMonth) => {
    if (!currentUser) {
      return;
    }

    try {
      const updatedMonth = await updateAccountBookMonth(
        accountBookId,
        currentMonth,
        nextMonth,
      );
      const accountBook = accountBooks.find(
        (item) => item.account_book_id === accountBookId,
      );
      const updatedMonths =
        accountBook?.months.map((monthRecord) =>
          monthRecord.month === currentMonth ? updatedMonth : monthRecord,
        ) || [];
      const latestMonth = getLatestMonthValue(updatedMonths);
      const updatedAccountBook = latestMonth
        ? await updateAccountBookStartMonth(
            currentUser.id,
            accountBookId,
            latestMonth,
          )
        : null;

      setAccountBooks((prevAccountBooks) =>
        prevAccountBooks.map((accountBook) => {
          if (accountBook.account_book_id !== accountBookId) {
            return accountBook;
          }

          return {
            ...accountBook,
            start_month:
              updatedAccountBook?.start_month || accountBook.start_month,
            updated_at: updatedAccountBook?.updated_at || accountBook.updated_at,
            months: accountBook.months.map((monthRecord) =>
              monthRecord.month === currentMonth ? updatedMonth : monthRecord,
            ),
          };
        }),
      );
    } catch (error) {
      console.error("Update account book month error:", error);
      alert("월 수정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteMonth = async (accountBookId, month) => {
    if (!currentUser) {
      return;
    }

    try {
      await deleteAccountBookMonth(accountBookId, month);
      const accountBook = accountBooks.find(
        (item) => item.account_book_id === accountBookId,
      );
      const remainingMonths =
        accountBook?.months.filter((monthRecord) => monthRecord.month !== month) ||
        [];
      const latestMonth = getLatestMonthValue(remainingMonths);
      const updatedAccountBook = latestMonth
        ? await updateAccountBookStartMonth(
            currentUser.id,
            accountBookId,
            latestMonth,
          )
        : null;

      setAccountBooks((prevAccountBooks) =>
        prevAccountBooks.map((accountBook) => {
          if (accountBook.account_book_id !== accountBookId) {
            return accountBook;
          }

          return {
            ...accountBook,
            start_month:
              updatedAccountBook?.start_month ||
              (latestMonth ? accountBook.start_month : ""),
            updated_at: updatedAccountBook?.updated_at || accountBook.updated_at,
            months: accountBook.months.filter(
              (monthRecord) => monthRecord.month !== month,
            ),
          };
        }),
      );
    } catch (error) {
      console.error("Delete account book month error:", error);
      alert("월 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleStartEditingTransactions = (accountBookId, month) => {
    const saveKey = getTransactionSaveKey(accountBookId, month);

    window.clearTimeout(transactionSaveTimersRef.current[saveKey]);
  };

  const handleChangeTransactions = async (
    accountBookId,
    month,
    nextTransactions,
    options = {},
  ) => {
    const saveKey = getTransactionSaveKey(accountBookId, month);
    const previousMonthTransactions =
      savedTransactionsRef.current[saveKey] ||
      transactions[accountBookId]?.[month] || {
        expense: [],
        income: [],
      };
    const shouldMarkDirty = options.markDirty !== false;

    if (shouldMarkDirty) {
      pendingTransactionChangesRef.current[saveKey] = true;
      transactionSaveVersionsRef.current[saveKey] =
        (transactionSaveVersionsRef.current[saveKey] || 0) + 1;
      writeTransactionDraft(accountBookId, month, nextTransactions);
    }

    setTransactions((prevTransactions) => ({
      ...prevTransactions,
      [accountBookId]: {
        ...(prevTransactions[accountBookId] || {}),
        [month]: nextTransactions,
      },
    }));

    const income = nextTransactions.income.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );
    const expense = nextTransactions.expense.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0,
    );

    setAccountBooks((prevAccountBooks) =>
      prevAccountBooks.map((accountBook) => {
        if (accountBook.account_book_id !== accountBookId) {
          return accountBook;
        }

        return {
          ...accountBook,
          months: accountBook.months.map((monthRecord) =>
            monthRecord.month === month
              ? {
                  ...monthRecord,
                  income,
                  expense,
                  income_total: income,
                  expense_total: expense,
                }
              : monthRecord,
          ),
        };
      }),
    );

    window.clearTimeout(transactionSaveTimersRef.current[saveKey]);

    if (options.deferSave || !pendingTransactionChangesRef.current[saveKey]) {
      return;
    }

    const saveVersion = transactionSaveVersionsRef.current[saveKey] || 0;

    transactionSaveTimersRef.current[saveKey] = window.setTimeout(async () => {
      try {
        const savedTransactions = await syncTransactions(
          accountBookId,
          month,
          previousMonthTransactions,
          nextTransactions,
        );
        const hasNewerChanges =
          (transactionSaveVersionsRef.current[saveKey] || 0) !== saveVersion;
        const savedIncome = savedTransactions.income.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        );
        const savedExpense = savedTransactions.expense.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        );

        savedTransactionsRef.current[saveKey] = savedTransactions;

        if (hasNewerChanges) {
          return;
        }

        pendingTransactionChangesRef.current[saveKey] = false;
        clearTransactionDraft(accountBookId, month);

        setTransactions((prevTransactions) => ({
          ...prevTransactions,
          [accountBookId]: {
            ...(prevTransactions[accountBookId] || {}),
            [month]: savedTransactions,
          },
        }));

        setAccountBooks((prevAccountBooks) =>
          prevAccountBooks.map((accountBook) => {
            if (accountBook.account_book_id !== accountBookId) {
              return accountBook;
            }

            return {
              ...accountBook,
              months: accountBook.months.map((monthRecord) =>
                monthRecord.month === month
                  ? {
                      ...monthRecord,
                      income: savedIncome,
                      expense: savedExpense,
                      income_total: savedIncome,
                      expense_total: savedExpense,
                    }
                  : monthRecord,
              ),
            };
          }),
        );
      } catch (error) {
        console.error("Save transactions error:", error);
        pendingTransactionChangesRef.current[saveKey] = true;
        alert("거래내역 저장 중 오류가 발생했습니다.");
      }
    }, TRANSACTION_SAVE_DELAY);
  };

  const handleSaveCategoryTypes = async (nextCategoryTypes) => {
    if (!detailAccountBookId) {
      return;
    }

    try {
      const savedCategoryTypes = await syncAccountBookCategories(
        detailAccountBookId,
        categoryTypes,
        nextCategoryTypes,
      );

      setCategoryTypes(savedCategoryTypes);
    } catch (error) {
      console.error("Save account book categories error:", error);
      alert("수입/지출 항목 저장 중 오류가 발생했습니다.");
      throw error;
    }
  };

  const handleCreateCategoryType = async (accountBookId, category) => {
    try {
      const savedCategory = await createAccountBookCategory(
        accountBookId,
        category,
      );

      setCategoryTypes((current) => ({
        ...current,
        [savedCategory.type]: [savedCategory, ...current[savedCategory.type]],
      }));

      return savedCategory;
    } catch (error) {
      console.error("Create account book category error:", error);
      alert("수입/지출 항목 추가 중 오류가 발생했습니다.");
      throw error;
    }
  };

  const handleUpdateCategoryType = async (
    accountBookId,
    categoryId,
    nextCategory,
  ) => {
    try {
      const savedCategory = await updateAccountBookCategory(
        accountBookId,
        categoryId,
        nextCategory,
      );

      setCategoryTypes((current) => ({
        ...current,
        [savedCategory.type]: current[savedCategory.type].map((category) =>
          category.id === categoryId ? savedCategory : category,
        ),
      }));

      return savedCategory;
    } catch (error) {
      console.error("Update account book category error:", error);
      alert("수입/지출 항목 수정 중 오류가 발생했습니다.");
      throw error;
    }
  };

  const handleDeleteCategoryType = async (accountBookId, type, categoryId) => {
    try {
      await deleteAccountBookCategory(accountBookId, categoryId);

      setCategoryTypes((current) => ({
        ...current,
        [type]: current[type].filter((category) => category.id !== categoryId),
      }));
      setTransactions((current) => {
        const accountBookTransactions = current[accountBookId] || {};

        return {
          ...current,
          [accountBookId]: Object.fromEntries(
            Object.entries(accountBookTransactions).map(
              ([month, monthTransactions]) => [
                month,
                {
                  expense: monthTransactions.expense.map((transaction) =>
                    transaction.category_id === categoryId
                      ? { ...transaction, category_id: null, category: "" }
                      : transaction,
                  ),
                  income: monthTransactions.income.map((transaction) =>
                    transaction.category_id === categoryId
                      ? { ...transaction, category_id: null, category: "" }
                      : transaction,
                  ),
                },
              ],
            ),
          ),
        };
      });
    } catch (error) {
      console.error("Delete account book category error:", error);
      alert("수입/지출 항목 삭제 중 오류가 발생했습니다.");
      throw error;
    }
  };

  const handleSaveProfile = async ({ nickname, newPassword }) => {
    if (!currentUser) {
      return;
    }

    const nextNickname = nickname.trim();

    try {
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) {
          throw passwordError;
        }
      }

      const updatedProfile = await updateProfileNickname(
        currentUser.id,
        nextNickname,
      );

      setProfile(updatedProfile);
      setCurrentUser((prevCurrentUser) =>
        prevCurrentUser
          ? { ...prevCurrentUser, nickname: updatedProfile.nickname }
          : prevCurrentUser,
      );
      setIsProfileModalOpen(false);
    } catch (error) {
      console.error("Save profile error:", error);
      alert("프로필 저장 중 오류가 발생했습니다.");
    }
  };

  const renderAuthedPage = (children) => {
    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }

    return (
      <AppShell
        nickname={currentUser.nickname}
        onLogout={handleLogout}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      >
        {children}
      </AppShell>
    );
  };

  const renderAccountBookListRoute = () => {
    if (isAuthLoading || accountBooksLoading) {
      return renderAuthedPage(
        <main className="list-page">
          <section className="list-section">
            <p>가계부 목록을 불러오는 중...</p>
          </section>
        </main>,
      );
    }

    if (!hasAccountBooks(accountBooks)) {
      return renderAuthedPage(<Navigate to="/account-books/new" replace />);
    }

    return renderAuthedPage(
      <AccountBookListPage
        accountBooks={accountBooks}
        onDeleteAccountBook={handleDeleteAccountBook}
        onUpdateAccountBookName={handleUpdateAccountBookName}
      />,
    );
  };

  const renderAccountBookMonthRoute = () => {
    if (isAuthLoading || accountBooksLoading) {
      return renderAuthedPage(
        <main className="month-page">
          <section className="month-workspace">
            <p>월별 거래내역을 불러오는 중...</p>
          </section>
        </main>,
      );
    }

    return renderAuthedPage(
      <AccountBookMonthPage
        accountBooks={accountBooks}
        categoryTypes={categoryTypes}
        transactions={transactions}
        onChangeTransactions={handleChangeTransactions}
        onStartEditingTransactions={handleStartEditingTransactions}
      />,
    );
  };

  if (isAuthLoading) {
    return (
      <>
        <PageCharacters />
        <main className="login-page">
          <section className="login-card">
            <p>로그인 상태 확인 중...</p>
            <button
              className="submit-button"
              type="button"
              onClick={() => navigate("/login", { replace: true })}
            >
              로그인 페이지로 이동
            </button>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <PageCharacters />
      {isProfileModalOpen && currentUser && (
        <ProfileModal
          profile={profile}
          currentUser={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveProfile}
        />
      )}
      <Routes>
        <Route
          path="/"
          element={
            <Navigate to={isLoggedIn ? "/account-books" : "/login"} replace />
          }
        />
        <Route path="/supabase-test" element={<SupabaseTestPage />} />
        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to={startPath} replace />
            ) : (
              <LoginPage onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            isLoggedIn ? <Navigate to={startPath} replace /> : <SignupPage />
          }
        />
        <Route
          path="/account-books"
          element={renderAccountBookListRoute()}
        />
        <Route
          path="/account-books/new"
          element={renderAuthedPage(
            <AccountBookCreatePage onCreate={handleCreateAccountBook} />,
          )}
        />
        <Route
          path="/account-books/:accountBookId/months/:month"
          element={renderAccountBookMonthRoute()}
        />
        <Route
          path="/account-books/:accountBookId"
          element={renderAuthedPage(
            <AccountBookDetailPage
              accountBooks={accountBooks}
              categoryTypes={categoryTypes}
              onAddMonth={handleAddMonth}
              onCreateCategoryType={handleCreateCategoryType}
              onDeleteCategoryType={handleDeleteCategoryType}
              onDeleteMonth={handleDeleteMonth}
              onSaveCategoryTypes={handleSaveCategoryTypes}
              onUpdateCategoryType={handleUpdateCategoryType}
              onUpdateMonth={handleUpdateMonth}
            />,
          )}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
