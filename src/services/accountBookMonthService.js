import { supabase } from "../lib/supabaseClient";

const ACCOUNT_BOOK_MONTH_COLUMNS =
  "account_book_month_id, account_book_id, month, income_total, expense_total, created_at, updated_at";

const toAccountBookMonth = (row) => ({
  account_book_month_id: row.account_book_month_id,
  account_book_id: row.account_book_id,
  month: row.month,
  income: Number(row.income_total),
  expense: Number(row.expense_total),
  income_total: Number(row.income_total),
  expense_total: Number(row.expense_total),
  created_at: row.created_at,
  updated_at: row.updated_at,
});

export const fetchAccountBookMonths = async (accountBookId) => {
  const { data, error } = await supabase
    .from("account_book_months")
    .select(ACCOUNT_BOOK_MONTH_COLUMNS)
    .eq("account_book_id", accountBookId)
    .order("month", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map(toAccountBookMonth);
};

export const createAccountBookMonth = async (accountBookId, month) => {
  const { data, error } = await supabase
    .from("account_book_months")
    .insert({
      account_book_id: accountBookId,
      month,
      income_total: 0,
      expense_total: 0,
    })
    .select(ACCOUNT_BOOK_MONTH_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toAccountBookMonth(data);
};

export const updateAccountBookMonth = async (
  accountBookId,
  currentMonth,
  nextMonth,
) => {
  const { data, error } = await supabase
    .from("account_book_months")
    .update({
      month: nextMonth,
      updated_at: new Date().toISOString(),
    })
    .eq("account_book_id", accountBookId)
    .eq("month", currentMonth)
    .select(ACCOUNT_BOOK_MONTH_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toAccountBookMonth(data);
};

export const deleteAccountBookMonth = async (accountBookId, month) => {
  const { error } = await supabase
    .from("account_book_months")
    .delete()
    .eq("account_book_id", accountBookId)
    .eq("month", month);

  if (error) {
    throw error;
  }

  return true;
};
