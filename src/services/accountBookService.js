import { supabase } from "../lib/supabaseClient";

const ACCOUNT_BOOK_COLUMNS =
  "account_book_id, user_id, name, start_month, created_at, updated_at";

const toAccountBook = (row) => ({
  account_book_id: row.account_book_id,
  user_id: row.user_id,
  name: row.name,
  start_month: row.start_month,
  created_at: row.created_at,
  updated_at: row.updated_at,
  months: [],
});

export const fetchAccountBooks = async (userId) => {
  const { data, error } = await supabase
    .from("account_books")
    .select(ACCOUNT_BOOK_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data.map(toAccountBook);
};

export const createAccountBook = async (userId, accountBook) => {
  const { data, error } = await supabase
    .from("account_books")
    .insert({
      user_id: userId,
      name: accountBook.name,
      start_month: accountBook.start_month,
    })
    .select(ACCOUNT_BOOK_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toAccountBook(data);
};

export const updateAccountBookName = async (userId, accountBookId, name) => {
  const { data, error } = await supabase
    .from("account_books")
    .update({
      name,
      updated_at: new Date().toISOString(),
    })
    .eq("account_book_id", accountBookId)
    .eq("user_id", userId)
    .select(ACCOUNT_BOOK_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toAccountBook(data);
};

export const updateAccountBookStartMonth = async (
  userId,
  accountBookId,
  startMonth,
) => {
  const { data, error } = await supabase
    .from("account_books")
    .update({
      start_month: startMonth,
      updated_at: new Date().toISOString(),
    })
    .eq("account_book_id", accountBookId)
    .eq("user_id", userId)
    .select(ACCOUNT_BOOK_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toAccountBook(data);
};

export const deleteAccountBook = async (userId, accountBookId) => {
  const { error } = await supabase
    .from("account_books")
    .delete()
    .eq("account_book_id", accountBookId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return true;
};
