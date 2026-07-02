import { supabase } from "../lib/supabaseClient";

const ACCOUNT_BOOK_MONTH_COLUMNS =
  "account_book_month_id, account_book_id, month, income_total, expense_total, created_at, updated_at";
const TRANSACTION_COLUMNS =
  "transaction_id, account_book_id, account_book_month_id, category_id, type, transaction_date, amount, description, created_at, updated_at";

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const toTransaction = (row) => ({
  id: row.transaction_id,
  transaction_id: row.transaction_id,
  account_book_id: row.account_book_id,
  account_book_month_id: row.account_book_month_id,
  category_id: row.category_id,
  category: row.category_id || "",
  type: row.type,
  date: row.transaction_date,
  amount: Number(row.amount),
  description: row.description || "",
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const toTransactionTypes = (rows) => {
  return rows.reduce(
    (result, row) => {
      const transaction = toTransaction(row);
      result[transaction.type].push(transaction);
      return result;
    },
    { expense: [], income: [] },
  );
};

const flattenTransactions = (transactions) => {
  return ["expense", "income"].flatMap((type) =>
    (transactions[type] || []).map((transaction) => ({
      ...transaction,
      type,
      category_id: transaction.category_id || null,
      amount: Number(transaction.amount || 0),
      description: transaction.description || "",
    })),
  );
};

const findAccountBookMonth = async (accountBookId, month) => {
  const { data, error } = await supabase
    .from("account_book_months")
    .select(ACCOUNT_BOOK_MONTH_COLUMNS)
    .eq("account_book_id", accountBookId)
    .eq("month", month)
    .single();

  if (error) {
    throw error;
  }

  return data;
};

const getTransactionId = (transaction) =>
  transaction.transaction_id || transaction.id;

export const fetchTransactions = async (accountBookId, month) => {
  const accountBookMonth = await findAccountBookMonth(accountBookId, month);

  const { data, error } = await supabase
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("account_book_id", accountBookId)
    .eq("account_book_month_id", accountBookMonth.account_book_month_id)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return toTransactionTypes(data);
};

export const syncTransactions = async (
  accountBookId,
  month,
  previousTransactions,
  nextTransactions,
) => {
  const accountBookMonth = await findAccountBookMonth(accountBookId, month);
  const accountBookMonthId = accountBookMonth.account_book_month_id;
  const previousItems = flattenTransactions(previousTransactions);
  const nextItems = flattenTransactions(nextTransactions);
  const previousById = new Map(
    previousItems
      .filter((transaction) => isUuid(getTransactionId(transaction)))
      .map((transaction) => [getTransactionId(transaction), transaction]),
  );
  const nextDbIds = new Set(
    nextItems.map(getTransactionId).filter((transactionId) => isUuid(transactionId)),
  );

  for (const transaction of previousItems) {
    const transactionId = getTransactionId(transaction);

    if (isUuid(transactionId) && !nextDbIds.has(transactionId)) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("transaction_id", transactionId)
        .eq("account_book_id", accountBookId)
        .eq("account_book_month_id", accountBookMonthId);

      if (error) {
        throw error;
      }
    }
  }

  for (const transaction of nextItems) {
    const transactionId = getTransactionId(transaction);
    const values = {
      account_book_id: accountBookId,
      account_book_month_id: accountBookMonthId,
      category_id: transaction.category_id || null,
      type: transaction.type,
      transaction_date: transaction.date,
      amount: Number(transaction.amount || 0),
      description: transaction.description || "",
    };

    if (!isUuid(transactionId)) {
      const { error } = await supabase.from("transactions").insert(values);

      if (error) {
        throw error;
      }

      continue;
    }

    const previous = previousById.get(transactionId);
    const hasChanges =
      !previous ||
      previous.date !== transaction.date ||
      previous.amount !== transaction.amount ||
      previous.description !== transaction.description ||
      previous.category_id !== transaction.category_id ||
      previous.type !== transaction.type;

    if (hasChanges) {
      const { error } = await supabase
        .from("transactions")
        .update({
          category_id: values.category_id,
          type: values.type,
          transaction_date: values.transaction_date,
          amount: values.amount,
          description: values.description,
          updated_at: new Date().toISOString(),
        })
        .eq("transaction_id", transactionId)
        .eq("account_book_id", accountBookId)
        .eq("account_book_month_id", accountBookMonthId);

      if (error) {
        throw error;
      }
    }
  }

  const incomeTotal = (nextTransactions.income || []).reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  );
  const expenseTotal = (nextTransactions.expense || []).reduce(
    (sum, transaction) => sum + Number(transaction.amount || 0),
    0,
  );

  const { error: monthError } = await supabase
    .from("account_book_months")
    .update({
      income_total: incomeTotal,
      expense_total: expenseTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("account_book_month_id", accountBookMonthId);

  if (monthError) {
    throw monthError;
  }

  return fetchTransactions(accountBookId, month);
};
