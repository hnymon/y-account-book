import { supabase } from "../lib/supabaseClient";

const ACCOUNT_BOOK_CATEGORY_COLUMNS =
  "account_book_category_id, account_book_id, type, name, display_order, created_at, updated_at";

const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const toCategory = (row) => ({
  id: row.account_book_category_id,
  account_book_category_id: row.account_book_category_id,
  account_book_id: row.account_book_id,
  type: row.type,
  name: row.name,
  display_order: row.display_order,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const toCategoryTypes = (rows) => {
  return rows.reduce(
    (result, row) => {
      const category = toCategory(row);
      result[category.type].push(category);
      return result;
    },
    { expense: [], income: [] },
  );
};

const flattenCategoryTypes = (categoryTypes) => {
  return ["expense", "income"].flatMap((type) =>
    (categoryTypes[type] || []).map((category, index) => ({
      ...category,
      type,
      display_order: index,
    })),
  );
};

export const fetchAccountBookCategories = async (accountBookId) => {
  const { data, error } = await supabase
    .from("account_book_categories")
    .select(ACCOUNT_BOOK_CATEGORY_COLUMNS)
    .eq("account_book_id", accountBookId)
    .order("type", { ascending: true })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return toCategoryTypes(data);
};

export const createAccountBookCategory = async (accountBookId, category) => {
  const { data, error } = await supabase
    .from("account_book_categories")
    .insert({
      account_book_id: accountBookId,
      type: category.type,
      name: category.name,
      display_order: category.display_order ?? 0,
    })
    .select(ACCOUNT_BOOK_CATEGORY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toCategory(data);
};

export const updateAccountBookCategory = async (
  accountBookId,
  categoryId,
  nextCategory,
) => {
  const { data, error } = await supabase
    .from("account_book_categories")
    .update({
      type: nextCategory.type,
      name: nextCategory.name,
      display_order: nextCategory.display_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq("account_book_id", accountBookId)
    .eq("account_book_category_id", categoryId)
    .select(ACCOUNT_BOOK_CATEGORY_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return toCategory(data);
};

export const deleteAccountBookCategory = async (accountBookId, categoryId) => {
  const { error } = await supabase
    .from("account_book_categories")
    .delete()
    .eq("account_book_id", accountBookId)
    .eq("account_book_category_id", categoryId);

  if (error) {
    throw error;
  }

  return true;
};

export const syncAccountBookCategories = async (
  accountBookId,
  previousCategoryTypes,
  nextCategoryTypes,
) => {
  const previousCategories = flattenCategoryTypes(previousCategoryTypes);
  const nextCategories = flattenCategoryTypes(nextCategoryTypes);
  const previousById = new Map(
    previousCategories
      .filter((category) => isUuid(category.account_book_category_id || category.id))
      .map((category) => [
        category.account_book_category_id || category.id,
        category,
      ]),
  );
  const nextDbIds = new Set(
    nextCategories
      .map((category) => category.account_book_category_id || category.id)
      .filter(isUuid),
  );

  for (const category of previousCategories) {
    const categoryId = category.account_book_category_id || category.id;

    if (isUuid(categoryId) && !nextDbIds.has(categoryId)) {
      await deleteAccountBookCategory(accountBookId, categoryId);
    }
  }

  for (const category of nextCategories) {
    const categoryId = category.account_book_category_id || category.id;

    if (!isUuid(categoryId)) {
      await createAccountBookCategory(accountBookId, category);
      continue;
    }

    const previous = previousById.get(categoryId);
    const hasChanges =
      !previous ||
      previous.name !== category.name ||
      previous.type !== category.type ||
      previous.display_order !== category.display_order;

    if (hasChanges) {
      await updateAccountBookCategory(accountBookId, categoryId, category);
    }
  }

  return fetchAccountBookCategories(accountBookId);
};
