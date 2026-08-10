import type { WeekdaySchedule } from "@/types/domain";

export type Slot = {
  date: string;
  time: string;
  iso: string;
  label: string;
};

const SLOT_INTERVAL_MINUTES = 30;
const MAX_DAYS_FORWARD = 7;

function parseMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function findNextEnabledDay(
  weeklySchedule: WeekdaySchedule[],
  from: Date,
  maxDaysForward: number = MAX_DAYS_FORWARD
): { date: Date; schedule: WeekdaySchedule } | null {
  for (let offset = 1; offset <= maxDaysForward; offset++) {
    const candidate = new Date(from);
    candidate.setDate(candidate.getDate() + offset);
    const daySchedule = weeklySchedule.find((day) => day.day === candidate.getDay() && day.enabled);
    if (daySchedule) return { date: candidate, schedule: daySchedule };
  }
  return null;
}

const weekdayLabelShort = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export function generateAvailableSlots(weeklySchedule: WeekdaySchedule[], averagePrepTime: number, now: Date): Slot[] {
  const next = findNextEnabledDay(weeklySchedule, now);
  if (!next) return [];

  const { date, schedule } = next;
  const openMinutes = parseMinutes(schedule.open);
  const closeMinutes = parseMinutes(schedule.close);
  const dateKey = toDateKey(date);
  const dayLabel = weekdayLabelShort[date.getDay()];
  const isTomorrow = date.getDate() === new Date(now.getTime() + 24 * 60 * 60 * 1000).getDate();
  const dayPrefix = isTomorrow ? "Amanhã" : dayLabel;

  const slots: Slot[] = [];
  for (let minutes = openMinutes; minutes + averagePrepTime <= closeMinutes; minutes += SLOT_INTERVAL_MINUTES) {
    const time = formatMinutes(minutes);
    slots.push({ date: dateKey, time, iso: `${dateKey}T${time}`, label: `${dayPrefix} • ${time}` });
  }

  return slots;
}
