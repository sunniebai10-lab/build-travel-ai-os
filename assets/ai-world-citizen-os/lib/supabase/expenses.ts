import travelConfig from "@/travel.config.json";
import { expenses as fallbackExpenses, trip as fallbackTrip } from "@/lib/mock-data";
import { fallbackResult, supabase, supabaseResult, type QueryResult } from "@/lib/supabase/client";
import { formatShortDate } from "@/lib/supabase/format";
import { addUserExpense, isValidCalendarDate, type UserExpenseInput } from "@/lib/user-input-store";

export interface ExpenseView {
  date: string;
  title: string;
  amount: string;
  rmb: string;
  category: string;
  location: string;
}

export interface FinanceView {
  expenses: ExpenseView[];
  spent: number;
  remaining: number;
}

export interface PersistenceResult {
  source: "supabase" | "local" | "none";
  error?: string;
}

export async function getFinance(totalBudget = fallbackTrip.budget): Promise<QueryResult<FinanceView>> {
  if (!supabase) {
    return fallbackResult({ expenses: fallbackExpenses, spent: fallbackTrip.spent, remaining: fallbackTrip.remaining }, "Supabase environment variables are not configured.");
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id,budget")
    .eq("id", travelConfig.tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!trip) {
    return fallbackResult({ expenses: fallbackExpenses, spent: fallbackTrip.spent, remaining: fallbackTrip.remaining }, "Trip data was not found.");
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("date,category,amount,currency,location,note")
    .eq("trip_id", trip.id)
    .neq("category", "Accommodation Budget")
    .order("date");

  if (error || !data) {
    return fallbackResult({ expenses: fallbackExpenses, spent: fallbackTrip.spent, remaining: fallbackTrip.remaining }, error?.message ?? "Expense data was not found.");
  }

  const spent = data.reduce((sum, expense) => sum + Number(expense.amount), 0);
  return supabaseResult({
    spent,
    remaining: Number(trip.budget ?? totalBudget) - spent,
    expenses: data.map((expense) => ({
      date: formatShortDate(expense.date),
      title: expense.note ?? expense.category,
      amount: `${Number(expense.amount).toLocaleString()} ${expense.currency}`,
      rmb: expense.currency === travelConfig.currency ? `${Number(expense.amount).toLocaleString()} ${travelConfig.currency}` : "",
      category: expense.category,
      location: expense.location ?? "",
    })),
  });
}

async function getCurrentTripId() {
  if (!supabase) return null;

  const { data } = await supabase
    .from("trips")
    .select("id")
    .eq("id", travelConfig.tripId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.id ?? null;
}

export async function saveExpenseInput(expense: UserExpenseInput): Promise<PersistenceResult> {
  if (!Number.isFinite(expense.amount) || expense.amount <= 0 || !isValidCalendarDate(expense.date) || !expense.location.trim()) {
    return { source: "none", error: "Enter a valid amount, date, and city." };
  }

  function saveLocally(error: string): PersistenceResult {
    try {
      addUserExpense(expense);
      return { source: "local", error };
    } catch {
      return { source: "none", error: "Browser storage is unavailable. Your expense was not saved." };
    }
  }

  if (!supabase) {
    return saveLocally("Supabase is not configured.");
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const user = userResult?.user;

  if (userError || !user) {
    return saveLocally(userError?.message ?? "User is not signed in.");
  }

  const tripId = await getCurrentTripId();
  const { error } = await supabase.from("expenses").insert({
    trip_id: tripId,
    user_id: user.id,
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    currency: expense.currency,
    location: expense.location,
    note: expense.note,
  });

  if (error) {
    return saveLocally(error.message);
  }

  return { source: "supabase" };
}
