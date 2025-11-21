import { format, differenceInDays, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

export function formatDate(date: Date | string, formatStr: string = 'dd MMM yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr, { locale: el });
}

export function calculateDays(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
  return differenceInDays(end, start) + 1; // Include both days
}

export function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

export function getTransmissionLabel(transmission: string): string {
  switch (transmission) {
    case 'manual':
      return 'Χειροκίνητο';
    case 'automatic':
      return 'Αυτόματο';
    case 'both':
      return 'Και τα δύο';
    default:
      return transmission;
  }
}

