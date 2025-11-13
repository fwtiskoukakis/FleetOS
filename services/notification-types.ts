/**
 * Notification Types and Configurations
 * Defines all notification types, priorities, and timing for the fleet management system
 */

export type NotificationPriority = 'critical' | 'high' | 'medium' | 'low';

export type NotificationType = 
  // Contract Notifications
  | 'pickup_24h'
  | 'pickup_3h'
  | 'pickup_30min'
  | 'return_7d'
  | 'return_3d'
  | 'return_1d'
  | 'return_3h'
  | 'return_overdue'
  
  // Maintenance Notifications - KTEO
  | 'kteo_60d'
  | 'kteo_30d'
  | 'kteo_14d'
  | 'kteo_7d'
  | 'kteo_3d'
  | 'kteo_1d'
  | 'kteo_expired'
  | 'kteo_overdue'
  
  // Maintenance Notifications - Insurance
  | 'insurance_60d'
  | 'insurance_30d'
  | 'insurance_14d'
  | 'insurance_7d'
  | 'insurance_3d'
  | 'insurance_1d'
  | 'insurance_expired'
  
  // Maintenance Notifications - Road Tax
  | 'road_tax_30d'
  | 'road_tax_14d'
  | 'road_tax_7d'
  | 'road_tax_expired'
  
  // Maintenance Notifications - Tires & Service
  | 'tires_30d'
  | 'tires_14d'
  | 'tires_7d'
  | 'service_due'
  | 'service_overdue'
  
  // Financial Notifications
  | 'payment_due_tomorrow'
  | 'payment_overdue'
  | 'deposit_not_received'
  | 'daily_revenue_summary'
  | 'weekly_revenue_summary'
  | 'monthly_milestone'
  
  // Availability Notifications
  | 'all_vehicles_booked'
  | 'low_availability'
  | 'vehicle_available'
  
  // Damage & Incident
  | 'damage_reported'
  | 'damage_repair_completed'
  
  // Operational
  | 'morning_briefing'
  | 'end_of_day_summary'
  | 'weekend_planning'
  
  // Smart Alerts
  | 'double_booking'
  | 'maintenance_during_rental'
  | 'gap_opportunity'
  
  // Milestones
  | 'milestone_achieved'
  | 'perfect_week'
  
  // General
  | 'general';

export interface NotificationConfig {
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  titleEn?: string;
  category: 'contract' | 'maintenance' | 'financial' | 'operational' | 'alert' | 'milestone';
  emoji: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const NOTIFICATION_CONFIGS: Record<NotificationType, NotificationConfig> = {
  // Contract Notifications
  pickup_24h: {
    type: 'pickup_24h',
    priority: 'medium',
    title: 'Προετοιμασία Παράδοσης',
    titleEn: 'Prepare Vehicle',
    category: 'contract',
    emoji: '🚗',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  pickup_3h: {
    type: 'pickup_3h',
    priority: 'high',
    title: 'Παράδοση Σήμερα',
    titleEn: 'Pickup Today',
    category: 'contract',
    emoji: '🚗',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  pickup_30min: {
    type: 'pickup_30min',
    priority: 'high',
    title: 'Πελάτης Έρχεται',
    titleEn: 'Customer Arriving',
    category: 'contract',
    emoji: '⏰',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  return_7d: {
    type: 'return_7d',
    priority: 'low',
    title: 'Επιστροφή Την Επόμενη Εβδομάδα',
    titleEn: 'Return Next Week',
    category: 'contract',
    emoji: '📅',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  return_3d: {
    type: 'return_3d',
    priority: 'medium',
    title: 'Επιστροφή Σε 3 Ημέρες',
    titleEn: 'Return in 3 Days',
    category: 'contract',
    emoji: '📅',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  return_1d: {
    type: 'return_1d',
    priority: 'medium',
    title: 'Επιστροφή Αύριο',
    titleEn: 'Return Tomorrow',
    category: 'contract',
    emoji: '🔜',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  return_3h: {
    type: 'return_3h',
    priority: 'high',
    title: 'Επιστροφή Σήμερα',
    titleEn: 'Return Today',
    category: 'contract',
    emoji: '⏰',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  return_overdue: {
    type: 'return_overdue',
    priority: 'critical',
    title: '⚠️ Καθυστερημένη Επιστροφή',
    titleEn: '⚠️ Overdue Return',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // KTEO Notifications
  kteo_60d: {
    type: 'kteo_60d',
    priority: 'low',
    title: 'ΚΤΕΟ Σε 2 Μήνες',
    titleEn: 'KTEO in 2 Months',
    category: 'maintenance',
    emoji: '🔧',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  kteo_30d: {
    type: 'kteo_30d',
    priority: 'medium',
    title: 'ΚΤΕΟ Σε 1 Μήνα',
    titleEn: 'KTEO in 1 Month',
    category: 'maintenance',
    emoji: '🔧',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  kteo_14d: {
    type: 'kteo_14d',
    priority: 'high',
    title: '⚠️ ΚΤΕΟ Σε 2 Εβδομάδες',
    titleEn: '⚠️ KTEO in 2 Weeks',
    category: 'maintenance',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  kteo_7d: {
    type: 'kteo_7d',
    priority: 'high',
    title: '🚨 ΚΤΕΟ Σε 1 Εβδομάδα',
    titleEn: '🚨 KTEO in 1 Week',
    category: 'maintenance',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  kteo_3d: {
    type: 'kteo_3d',
    priority: 'critical',
    title: '🚨 ΚΤΕΟ Σε 3 Ημέρες',
    titleEn: '🚨 KTEO in 3 Days',
    category: 'maintenance',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  kteo_1d: {
    type: 'kteo_1d',
    priority: 'critical',
    title: '🚨 ΚΤΕΟ Λήγει Αύριο!',
    titleEn: '🚨 KTEO Expires Tomorrow!',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  kteo_expired: {
    type: 'kteo_expired',
    priority: 'critical',
    title: '🚨 ΚΤΕΟ ΕΛΗΞΕ!',
    titleEn: '🚨 KTEO EXPIRED!',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  kteo_overdue: {
    type: 'kteo_overdue',
    priority: 'critical',
    title: '🚨 ΚΤΕΟ Καθυστερημένο',
    titleEn: '🚨 KTEO Overdue',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // Insurance Notifications
  insurance_60d: {
    type: 'insurance_60d',
    priority: 'low',
    title: 'Ασφάλεια Σε 2 Μήνες',
    titleEn: 'Insurance in 2 Months',
    category: 'maintenance',
    emoji: '🛡️',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  insurance_30d: {
    type: 'insurance_30d',
    priority: 'medium',
    title: 'Ασφάλεια Σε 1 Μήνα',
    titleEn: 'Insurance in 1 Month',
    category: 'maintenance',
    emoji: '🛡️',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  insurance_14d: {
    type: 'insurance_14d',
    priority: 'high',
    title: '⚠️ Ασφάλεια Σε 2 Εβδομάδες',
    titleEn: '⚠️ Insurance in 2 Weeks',
    category: 'maintenance',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  insurance_7d: {
    type: 'insurance_7d',
    priority: 'critical',
    title: '🚨 Ασφάλεια Σε 1 Εβδομάδα',
    titleEn: '🚨 Insurance in 1 Week',
    category: 'maintenance',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  insurance_3d: {
    type: 'insurance_3d',
    priority: 'critical',
    title: '🚨 Ασφάλεια Σε 3 Ημέρες',
    titleEn: '🚨 Insurance in 3 Days',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  insurance_1d: {
    type: 'insurance_1d',
    priority: 'critical',
    title: '🚨 Ασφάλεια Λήγει Αύριο!',
    titleEn: '🚨 Insurance Expires Tomorrow!',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  insurance_expired: {
    type: 'insurance_expired',
    priority: 'critical',
    title: '🚨 ΑΣΦΑΛΕΙΑ ΕΛΗΞΕ!',
    titleEn: '🚨 INSURANCE EXPIRED!',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // Road Tax
  road_tax_30d: {
    type: 'road_tax_30d',
    priority: 'medium',
    title: 'Τέλη Κυκλοφορίας Σε 1 Μήνα',
    titleEn: 'Road Tax in 1 Month',
    category: 'maintenance',
    emoji: '💳',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  road_tax_14d: {
    type: 'road_tax_14d',
    priority: 'high',
    title: '⚠️ Τέλη Κυκλοφορίας Σε 2 Εβδομάδες',
    titleEn: '⚠️ Road Tax in 2 Weeks',
    category: 'maintenance',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  road_tax_7d: {
    type: 'road_tax_7d',
    priority: 'high',
    title: '🚨 Τέλη Κυκλοφορίας Σε 1 Εβδομάδα',
    titleEn: '🚨 Road Tax in 1 Week',
    category: 'maintenance',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  road_tax_expired: {
    type: 'road_tax_expired',
    priority: 'critical',
    title: '🚨 Τέλη Κυκλοφορίας Έληξαν',
    titleEn: '🚨 Road Tax Expired',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // Tires & Service
  tires_30d: {
    type: 'tires_30d',
    priority: 'low',
    title: 'Αλλαγή Ελαστικών Σε 1 Μήνα',
    titleEn: 'Tire Change in 1 Month',
    category: 'maintenance',
    emoji: '🛞',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  tires_14d: {
    type: 'tires_14d',
    priority: 'medium',
    title: 'Αλλαγή Ελαστικών Σε 2 Εβδομάδες',
    titleEn: 'Tire Change in 2 Weeks',
    category: 'maintenance',
    emoji: '🛞',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  tires_7d: {
    type: 'tires_7d',
    priority: 'medium',
    title: 'Αλλαγή Ελαστικών Σε 1 Εβδομάδα',
    titleEn: 'Tire Change in 1 Week',
    category: 'maintenance',
    emoji: '🛞',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  service_due: {
    type: 'service_due',
    priority: 'medium',
    title: 'Service Απαιτείται',
    titleEn: 'Service Due',
    category: 'maintenance',
    emoji: '🔧',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  service_overdue: {
    type: 'service_overdue',
    priority: 'high',
    title: '⚠️ Service Καθυστερημένο',
    titleEn: '⚠️ Service Overdue',
    category: 'maintenance',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // Financial
  payment_due_tomorrow: {
    type: 'payment_due_tomorrow',
    priority: 'high',
    title: 'Πληρωμή Αύριο',
    titleEn: 'Payment Due Tomorrow',
    category: 'financial',
    emoji: '💰',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  payment_overdue: {
    type: 'payment_overdue',
    priority: 'critical',
    title: '⚠️ Καθυστερημένη Πληρωμή',
    titleEn: '⚠️ Payment Overdue',
    category: 'financial',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  deposit_not_received: {
    type: 'deposit_not_received',
    priority: 'high',
    title: 'Προκαταβολή Εκκρεμεί',
    titleEn: 'Deposit Pending',
    category: 'financial',
    emoji: '💳',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  daily_revenue_summary: {
    type: 'daily_revenue_summary',
    priority: 'low',
    title: 'Ημερήσια Περίληψη',
    titleEn: 'Daily Summary',
    category: 'operational',
    emoji: '📊',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  weekly_revenue_summary: {
    type: 'weekly_revenue_summary',
    priority: 'low',
    title: 'Εβδομαδιαία Περίληψη',
    titleEn: 'Weekly Summary',
    category: 'operational',
    emoji: '📈',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  monthly_milestone: {
    type: 'monthly_milestone',
    priority: 'low',
    title: '🎉 Επίτευγμα Μήνα!',
    titleEn: '🎉 Monthly Milestone!',
    category: 'milestone',
    emoji: '🎉',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // Availability
  all_vehicles_booked: {
    type: 'all_vehicles_booked',
    priority: 'low',
    title: '🎉 Όλα Τα Οχήματα Κλεισμένα!',
    titleEn: '🎉 All Vehicles Booked!',
    category: 'operational',
    emoji: '🎉',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  low_availability: {
    type: 'low_availability',
    priority: 'medium',
    title: 'Χαμηλή Διαθεσιμότητα',
    titleEn: 'Low Availability',
    category: 'operational',
    emoji: '⚠️',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  vehicle_available: {
    type: 'vehicle_available',
    priority: 'low',
    title: 'Όχημα Διαθέσιμο',
    titleEn: 'Vehicle Available',
    category: 'operational',
    emoji: '✅',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  
  // Damage & Incident
  damage_reported: {
    type: 'damage_reported',
    priority: 'critical',
    title: '⚠️ Νέα Ζημιά Αναφέρθηκε',
    titleEn: '⚠️ Damage Reported',
    category: 'alert',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  damage_repair_completed: {
    type: 'damage_repair_completed',
    priority: 'low',
    title: '✅ Επισκευή Ολοκληρώθηκε',
    titleEn: '✅ Repair Completed',
    category: 'operational',
    emoji: '✅',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  
  // Operational
  morning_briefing: {
    type: 'morning_briefing',
    priority: 'medium',
    title: '🌅 Καλημέρα - Σημερινό Πρόγραμμα',
    titleEn: '🌅 Good Morning - Today\'s Schedule',
    category: 'operational',
    emoji: '🌅',
    soundEnabled: true,
    vibrationEnabled: false,
  },
  end_of_day_summary: {
    type: 'end_of_day_summary',
    priority: 'low',
    title: '🌙 Περίληψη Ημέρας',
    titleEn: '🌙 End of Day Summary',
    category: 'operational',
    emoji: '🌙',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  weekend_planning: {
    type: 'weekend_planning',
    priority: 'medium',
    title: '📅 Σχεδιασμός Σαββατοκύριακου',
    titleEn: '📅 Weekend Planning',
    category: 'operational',
    emoji: '📅',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  
  // Smart Alerts
  double_booking: {
    type: 'double_booking',
    priority: 'critical',
    title: '🚨 Διπλή Κράτηση!',
    titleEn: '🚨 Double Booking!',
    category: 'alert',
    emoji: '🚨',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  maintenance_during_rental: {
    type: 'maintenance_during_rental',
    priority: 'critical',
    title: '⚠️ Συντήρηση Κατά Την Ενοικίαση',
    titleEn: '⚠️ Maintenance During Rental',
    category: 'alert',
    emoji: '⚠️',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  gap_opportunity: {
    type: 'gap_opportunity',
    priority: 'low',
    title: '💡 Ευκαιρία Service',
    titleEn: '💡 Service Opportunity',
    category: 'operational',
    emoji: '💡',
    soundEnabled: false,
    vibrationEnabled: false,
  },
  
  // Milestones
  milestone_achieved: {
    type: 'milestone_achieved',
    priority: 'low',
    title: '🏆 Επίτευγμα!',
    titleEn: '🏆 Milestone Achieved!',
    category: 'milestone',
    emoji: '🏆',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  perfect_week: {
    type: 'perfect_week',
    priority: 'low',
    title: '🌟 Τέλεια Εβδομάδα!',
    titleEn: '🌟 Perfect Week!',
    category: 'milestone',
    emoji: '🌟',
    soundEnabled: true,
    vibrationEnabled: true,
  },
  
  // General
  general: {
    type: 'general',
    priority: 'medium',
    title: 'Ειδοποίηση',
    titleEn: 'Notification',
    category: 'operational',
    emoji: '📢',
    soundEnabled: true,
    vibrationEnabled: true,
  },
};

export interface NotificationPreferences {
  userId: string;
  enabledTypes: NotificationType[];
  quietHoursStart?: string; // HH:MM format
  quietHoursEnd?: string; // HH:MM format
  criticalOnly: boolean;
  maxDailyNotifications: number;
  timezone: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: Partial<NotificationPreferences> = {
  enabledTypes: Object.keys(NOTIFICATION_CONFIGS) as NotificationType[],
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  criticalOnly: false,
  maxDailyNotifications: 10,
  timezone: 'Europe/Athens',
};

