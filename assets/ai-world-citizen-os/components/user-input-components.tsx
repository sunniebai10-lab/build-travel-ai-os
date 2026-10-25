"use client";

import travelConfig from "@/travel.config.json";

import { Camera, Check, NotebookPen, Plus, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getActivityCompletion, saveActivityCompletion } from "@/lib/supabase/activity-state";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { saveExpenseInput } from "@/lib/supabase/expenses";
import { saveJournalInput } from "@/lib/supabase/journal";
import { uploadJournalPhotoFiles } from "@/lib/supabase/storage";
import { getEffectiveItinerary } from "@/lib/supabase/effective-itinerary";
import type { DailyPlanView } from "@/lib/supabase/itinerary";
import type { TripView } from "@/lib/supabase/trips";
import { calendarDateAtLocalNoon, getTravelDateContext, matchesTravelDate } from "@/lib/travel-date-context";
import {
  createInputId,
  isValidCalendarDate,
  type ActivityCompletionState,
  type ExpenseCategory,
  type ExpenseCurrency,
} from "@/lib/user-input-store";

const currencies: ExpenseCurrency[] = [...new Set([travelConfig.currency, "USD", "EUR", "GBP", "JPY"])];
const categories: ExpenseCategory[] = ["Food", "Transport", "Hotel", "Ticket", "Shopping", "Other"];

export function ExpenseInputCard({ defaultLocation = travelConfig.cities[0]?.name ?? "", defaultDate = new Date().toISOString().slice(0, 10) }: { defaultLocation?: string; defaultDate?: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<ExpenseCurrency>(travelConfig.currency);
  const [category, setCategory] = useState<ExpenseCategory>("Food");
  const [location, setLocation] = useState(defaultLocation);
  const [locationEdited, setLocationEdited] = useState(false);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [dateEdited, setDateEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave = Number.isFinite(Number(amount)) && Number(amount) > 0 && location.trim().length > 0 && isValidCalendarDate(date) && !saving;

  useEffect(() => {
    if (!locationEdited) setLocation(defaultLocation);
  }, [defaultLocation, locationEdited]);

  useEffect(() => {
    if (!dateEdited) setDate(defaultDate);
  }, [dateEdited, defaultDate]);

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);
    const result = await saveExpenseInput({
      id: createInputId("expense"),
      date,
      amount: Number(amount),
      currency,
      category,
      location: location.trim(),
      note: note.trim() || category,
      createdAt: new Date().toISOString(),
    });
    setSaving(false);

    if (result.source === "supabase") {
      router.push("/wallet");
      return;
    }

    setSaveError(result.source === "none"
      ? "消费未保存，请检查输入或浏览器存储空间。"
      : isSupabaseConfigured
        ? "消费已保存在本机，云端同步未完成。"
        : "消费已保存在这台设备的浏览器中，尚未启用云端同步。");
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <InputGroup label="Amount">
        <input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="500" className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30" />
      </InputGroup>

      <InputGroup label="Currency">
        <SegmentedOptions value={currency} options={currencies} onChange={(value) => setCurrency(value as ExpenseCurrency)} />
      </InputGroup>

      <InputGroup label="Category">
        <SegmentedOptions value={category} options={categories} onChange={(value) => setCategory(value as ExpenseCategory)} />
      </InputGroup>

      <InputGroup label="City">
        <input value={location} onChange={(event) => { setLocationEdited(true); setLocation(event.target.value); }} className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30" />
      </InputGroup>

      <InputGroup label="Date">
        <input type="date" value={date} onChange={(event) => { setDateEdited(true); setDate(event.target.value); }} className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30" />
      </InputGroup>

      <InputGroup label="Note">
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="午餐、门票、机场接送..." className="min-h-24 w-full resize-none rounded-[var(--radius-small)] border border-border-soft bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-accent-orange/30" />
      </InputGroup>

      <Button type="button" onClick={handleSave} disabled={!canSave} className="h-12 w-full rounded-[var(--radius-small)]">
        <WalletCards className="h-4 w-4" />
        {saving ? "正在保存..." : "Save Expense"}
      </Button>
      {saveError ? <p className="text-sm leading-[1.6] text-text-secondary">{saveError}</p> : null}
    </div>
  );
}

export function JournalComposer({ defaultCity = travelConfig.cities[0]?.name ?? "", defaultDate = new Date().toISOString().slice(0, 10) }: { defaultCity?: string; defaultDate?: string }) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [cityEdited, setCityEdited] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [dateEdited, setDateEdited] = useState(false);
  const [sentence, setSentence] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const canSave = sentence.trim().length > 0 && city.trim().length > 0 && isValidCalendarDate(date) && !saving;

  useEffect(() => {
    if (!cityEdited) setCity(defaultCity);
  }, [cityEdited, defaultCity]);

  useEffect(() => {
    if (!dateEdited) setDate(defaultDate);
  }, [dateEdited, defaultDate]);

  function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 3);
    if (!files.length) return;

    setPhotoFiles(files);
    void Promise.all(
      files.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
            reader.readAsDataURL(file);
          }),
      ),
    ).then((nextPhotos) => setPhotos(nextPhotos.filter(Boolean).slice(0, 3)));
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);
    const journalId = createInputId("journal");
    const savedPhotos = await uploadJournalPhotoFiles({
      journalId,
      files: photoFiles,
      fallbackPhotos: photos,
    });
    const result = await saveJournalInput({
      id: journalId,
      date,
      city: city.trim(),
      photos: savedPhotos,
      sentence: sentence.trim(),
      story: "",
      createdAt: new Date().toISOString(),
    });
    setSaving(false);

    if (result.source === "supabase") {
      router.push("/journal");
      return;
    }

    setSaveError(result.source === "none"
      ? "手帐未保存，请检查输入或浏览器存储空间。"
      : isSupabaseConfigured
        ? "手帐已保存在本机，云端同步未完成。"
        : "手帐已保存在这台设备的浏览器中，尚未启用云端同步。");
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-large)] bg-white/90 p-5 shadow-[var(--shadow-soft-card)]">
      <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-medium)] border border-dashed border-border-soft bg-surface-muted/70 text-center text-sm text-text-secondary">
        <Camera className="mb-2 h-6 w-6 text-accent-orange" strokeWidth={1.8} />
        Add Photo
        <input type="file" accept="image/*" multiple onChange={handlePhoto} className="sr-only" />
      </label>

      {photos.length ? (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.slice(0, 48)} className="aspect-[4/3] rounded-[var(--radius-small)] bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
          ))}
        </div>
      ) : null}

      <InputGroup label="Sentence">
        <textarea value={sentence} onChange={(event) => setSentence(event.target.value)} placeholder="记下今天最想留下的一刻。" className="min-h-32 w-full resize-none rounded-[var(--radius-small)] border border-border-soft bg-white px-4 py-3 text-base leading-[1.6] outline-none focus:ring-2 focus:ring-accent-orange/30" />
      </InputGroup>

      <div className="grid grid-cols-2 gap-3">
        <InputGroup label="City">
          <input value={city} onChange={(event) => { setCityEdited(true); setCity(event.target.value); }} className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-4 text-base outline-none focus:ring-2 focus:ring-accent-orange/30" />
        </InputGroup>
        <InputGroup label="Date">
          <input type="date" value={date} onChange={(event) => { setDateEdited(true); setDate(event.target.value); }} className="h-12 w-full rounded-[var(--radius-small)] border border-border-soft bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent-orange/30" />
        </InputGroup>
      </div>

      <Button type="button" onClick={handleSave} disabled={!canSave} className="h-12 w-full rounded-[var(--radius-small)]">
        <NotebookPen className="h-4 w-4" />
        {saving ? "正在保存..." : "Save Memory"}
      </Button>
      {saveError ? <p className="text-sm leading-[1.6] text-text-secondary">{saveError}</p> : null}
    </div>
  );
}

function useTodayFormDefaults(trip: TripView, dailyPlan: DailyPlanView[]) {
  const [calendarNow, setCalendarNow] = useState<Date | null>(null);
  const previewNow = useMemo(() => calendarDateAtLocalNoon(trip.startDate), [trip.startDate]);
  const travelDateContext = useMemo(
    () => getTravelDateContext({ tripStartDate: trip.startDate, tripEndDate: trip.endDate }, calendarNow ?? previewNow),
    [calendarNow, previewNow, trip.endDate, trip.startDate],
  );
  const fallbackCity = useMemo(
    () => dailyPlan.find((day) => matchesTravelDate(day.date, travelDateContext.todayDate))?.city ?? trip.today.city,
    [dailyPlan, travelDateContext.todayDate, trip.today.city],
  );
  const [city, setCity] = useState(fallbackCity);

  useEffect(() => {
    setCalendarNow(new Date());
  }, []);

  useEffect(() => {
    setCity(fallbackCity);
  }, [fallbackCity]);

  useEffect(() => {
    let active = true;
    void getEffectiveItinerary(trip.id, travelDateContext.todayDate).then((result) => {
      if (active) setCity(result.data[0]?.city ?? fallbackCity);
    });
    return () => {
      active = false;
    };
  }, [fallbackCity, travelDateContext.todayDate, trip.id]);

  return { city, date: travelDateContext.todayDate };
}

export function TodayJournalComposer({ trip, dailyPlan }: { trip: TripView; dailyPlan: DailyPlanView[] }) {
  const defaults = useTodayFormDefaults(trip, dailyPlan);
  return <JournalComposer defaultCity={defaults.city} defaultDate={defaults.date} />;
}

export function TodayExpenseInputCard({ trip, dailyPlan }: { trip: TripView; dailyPlan: DailyPlanView[] }) {
  const defaults = useTodayFormDefaults(trip, dailyPlan);
  return <ExpenseInputCard defaultLocation={defaults.city} defaultDate={defaults.date} />;
}

export function ActivityStatusButton({ activityId, legacyActivityId }: { activityId: string; legacyActivityId?: string }) {
  const [status, setStatus] = useState<ActivityCompletionState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void getActivityCompletion(activityId, legacyActivityId).then((result) => setStatus(result.data));
  }, [activityId, legacyActivityId]);

  const completed = status?.completed ?? false;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={async () => {
          const previousStatus = status;
          const nextCompleted = !completed;
          setSaving(true);
          setSaveMessage(null);
          setStatus({
            activity_id: activityId,
            completed: nextCompleted,
            completed_at: nextCompleted ? new Date().toISOString() : null,
            journal_created: status?.journal_created ?? false,
          });
          const result = await saveActivityCompletion(activityId, nextCompleted);
          setStatus(result.error && !result.queued ? previousStatus : result.data);
          setSaveMessage(result.queued ? "已离线保存，网络恢复后会自动同步。" : result.error ?? null);
          setSaving(false);
        }}
        disabled={saving}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--radius-small)] bg-white/90 px-4 text-sm font-semibold text-text-primary shadow-[var(--shadow-soft-card)]"
      >
        {completed ? <Check className="h-4 w-4 text-accent-orange" /> : <Plus className="h-4 w-4 text-accent-orange" />}
        {saving ? "正在保存..." : completed ? "已完成体验" : "完成体验"}
      </button>
      {saveMessage ? <p className="text-center text-xs leading-[1.6] text-text-secondary" aria-live="polite">{saveMessage}</p> : null}
    </div>
  );
}

export function QuickAddButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-small)] bg-accent-orange px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(232,138,74,0.28)]">
      <Plus className="h-4 w-4" />
      {label}
    </a>
  );
}

function InputGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-text-secondary">{label}</span>
      {children}
    </label>
  );
}

function SegmentedOptions({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`min-h-11 rounded-[var(--radius-small)] px-2 text-sm font-medium ${value === option ? "bg-accent-orange text-white" : "bg-surface-muted text-text-secondary"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
