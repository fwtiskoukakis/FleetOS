/**
 * Maintenance Urgency Utilities
 * Calculates urgency levels and colors for vehicle maintenance items
 * Same as mobile app utils/maintenance-urgency.ts
 */

export type UrgencyLevel = 'expired' | 'critical' | 'warning' | 'soon' | 'ok';

export interface UrgencyResult {
  level: UrgencyLevel;
  color: string;
  daysRemaining: number;
  label: string;
}

/**
 * Calculate urgency level based on expiry date
 */
export function calculateExpiryUrgency(expiryDate: Date | null | undefined): UrgencyResult {
  if (!expiryDate) {
    return {
      level: 'ok',
      color: '#8E8E93',
      daysRemaining: Infinity,
      label: 'Μη καθορισμένο',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysRemaining = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      level: 'expired',
      color: '#FF3B30',
      daysRemaining,
      label: `Έληξε πριν ${Math.abs(daysRemaining)} ημέρες`,
    };
  }

  if (daysRemaining === 0) {
    return {
      level: 'expired',
      color: '#FF3B30',
      daysRemaining: 0,
      label: 'Λήγει σήμερα',
    };
  }

  if (daysRemaining <= 7) {
    return {
      level: 'critical',
      color: '#FF3B30',
      daysRemaining,
      label: `${daysRemaining} ημέρες`,
    };
  }

  if (daysRemaining <= 30) {
    return {
      level: 'warning',
      color: '#FF9500',
      daysRemaining,
      label: `${daysRemaining} ημέρες`,
    };
  }

  if (daysRemaining <= 60) {
    return {
      level: 'soon',
      color: '#FFCC00',
      daysRemaining,
      label: `${daysRemaining} ημέρες`,
    };
  }

  return {
    level: 'ok',
    color: '#34C759',
    daysRemaining,
    label: `${daysRemaining} ημέρες`,
  };
}

/**
 * Calculate urgency for service based on mileage
 */
export function calculateServiceUrgency(
  currentMileage: number | null | undefined,
  nextServiceMileage: number | null | undefined
): UrgencyResult {
  if (!nextServiceMileage || !currentMileage) {
    return {
      level: 'ok',
      color: '#8E8E93',
      daysRemaining: Infinity,
      label: 'Μη καθορισμένο',
    };
  }

  const kmRemaining = nextServiceMileage - currentMileage;

  if (kmRemaining <= 0) {
    return {
      level: 'expired',
      color: '#FF3B30',
      daysRemaining: kmRemaining,
      label: `Υπέρβαση ${Math.abs(kmRemaining)} km`,
    };
  }

  if (kmRemaining <= 500) {
    return {
      level: 'critical',
      color: '#FF3B30',
      daysRemaining: kmRemaining,
      label: `${kmRemaining} km`,
    };
  }

  if (kmRemaining <= 1000) {
    return {
      level: 'warning',
      color: '#FF9500',
      daysRemaining: kmRemaining,
      label: `${kmRemaining} km`,
    };
  }

  if (kmRemaining <= 2000) {
    return {
      level: 'soon',
      color: '#FFCC00',
      daysRemaining: kmRemaining,
      label: `${kmRemaining} km`,
    };
  }

  return {
    level: 'ok',
    color: '#34C759',
    daysRemaining: kmRemaining,
    label: `${kmRemaining} km`,
  };
}

/**
 * Get the most urgent maintenance item from multiple urgency results
 */
export function getMostUrgent(...urgencies: UrgencyResult[]): UrgencyResult {
  if (urgencies.length === 0) {
    return {
      level: 'ok',
      color: '#8E8E93',
      daysRemaining: Infinity,
      label: 'OK',
    };
  }

  const priorityMap: Record<UrgencyLevel, number> = {
    expired: 0,
    critical: 1,
    warning: 2,
    soon: 3,
    ok: 4,
  };

  return urgencies.reduce((mostUrgent, current) => {
    if (priorityMap[current.level] < priorityMap[mostUrgent.level]) {
      return current;
    }
    if (
      priorityMap[current.level] === priorityMap[mostUrgent.level] &&
      current.daysRemaining < mostUrgent.daysRemaining
    ) {
      return current;
    }
    return mostUrgent;
  });
}

