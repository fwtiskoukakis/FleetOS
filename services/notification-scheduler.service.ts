/**
 * Notification Scheduler Service
 * Handles automatic scheduling of notifications based on contracts, maintenance, and events
 */

import { addDays, addHours, differenceInDays, differenceInHours, format, isBefore, isAfter, parse } from 'date-fns';
import { NotificationService } from './notification.service';
import { NOTIFICATION_CONFIGS, NotificationType, NotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES } from './notification-types';
import { Contract } from '../models/contract.interface';
import { Vehicle } from '../models/vehicle.interface';
import { supabase } from '../utils/supabase';

export class NotificationScheduler {
  
  /**
   * Schedule all notifications for a contract (pickups and returns)
   */
  static async scheduleContractNotifications(contract: Contract): Promise<void> {
    try {
      const pickupDate = new Date(contract.rentalPeriod.pickupDate);
      const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
      const licensePlate = contract.carInfo.licensePlate;
      const customerName = contract.user.fullName;

      // Schedule pickup notifications
      await this.schedulePickupNotifications(contract.id, licensePlate, customerName, pickupDate);
      
      // Schedule return notifications
      await this.scheduleReturnNotifications(contract.id, licensePlate, customerName, dropoffDate);
      
      console.log(`Scheduled all notifications for contract ${contract.id}`);
    } catch (error) {
      console.error('Error scheduling contract notifications:', error);
    }
  }

  /**
   * Schedule pickup reminder notifications
   */
  private static async schedulePickupNotifications(
    contractId: string,
    licensePlate: string,
    customerName: string,
    pickupDate: Date
  ): Promise<void> {
    const now = new Date();

    // 24 hours before pickup
    const pickup24h = addHours(pickupDate, -24);
    if (isAfter(pickup24h, now)) {
      await NotificationService.scheduleNotificationByType('pickup_24h', {
        body: `Προετοιμάστε το όχημα ${licensePlate} για παράδοση στον/στην ${customerName} αύριο στις ${format(pickupDate, 'HH:mm')}`,
        data: { contractId, licensePlate, customerName, pickupDate: pickupDate.toISOString() },
      }, pickup24h);
    }

    // 3 hours before pickup
    const pickup3h = addHours(pickupDate, -3);
    if (isAfter(pickup3h, now)) {
      await NotificationService.scheduleNotificationByType('pickup_3h', {
        body: `Παράδοση σε 3 ώρες: ${licensePlate} στον/στην ${customerName}`,
        data: { contractId, licensePlate, customerName, pickupDate: pickupDate.toISOString() },
      }, pickup3h);
    }

    // 30 minutes before pickup
    const pickup30min = addHours(pickupDate, -0.5);
    if (isAfter(pickup30min, now)) {
      await NotificationService.scheduleNotificationByType('pickup_30min', {
        body: `Ο/Η ${customerName} θα έρθει σε 30 λεπτά για το ${licensePlate}`,
        data: { contractId, licensePlate, customerName, pickupDate: pickupDate.toISOString() },
      }, pickup30min);
    }
  }

  /**
   * Schedule return reminder notifications
   */
  private static async scheduleReturnNotifications(
    contractId: string,
    licensePlate: string,
    customerName: string,
    dropoffDate: Date
  ): Promise<void> {
    const now = new Date();

    // 7 days before return
    const return7d = addDays(dropoffDate, -7);
    if (isAfter(return7d, now)) {
      await NotificationService.scheduleNotificationByType('return_7d', {
        body: `Επιστροφή του ${licensePlate} από ${customerName} σε 7 ημέρες`,
        data: { contractId, licensePlate, customerName, dropoffDate: dropoffDate.toISOString() },
      }, return7d);
    }

    // 3 days before return
    const return3d = addDays(dropoffDate, -3);
    if (isAfter(return3d, now)) {
      await NotificationService.scheduleNotificationByType('return_3d', {
        body: `Επιστροφή του ${licensePlate} σε 3 ημέρες - προετοιμάστε για έλεγχο`,
        data: { contractId, licensePlate, customerName, dropoffDate: dropoffDate.toISOString() },
      }, return3d);
    }

    // 1 day before return
    const return1d = addDays(dropoffDate, -1);
    if (isAfter(return1d, now)) {
      await NotificationService.scheduleNotificationByType('return_1d', {
        body: `Επιστροφή του ${licensePlate} αύριο στις ${format(dropoffDate, 'HH:mm')}`,
        data: { contractId, licensePlate, customerName, dropoffDate: dropoffDate.toISOString() },
      }, return1d);
    }

    // 3 hours before return
    const return3h = addHours(dropoffDate, -3);
    if (isAfter(return3h, now)) {
      await NotificationService.scheduleNotificationByType('return_3h', {
        body: `Επιστροφή σε 3 ώρες: ${licensePlate}`,
        data: { contractId, licensePlate, customerName, dropoffDate: dropoffDate.toISOString() },
      }, return3h);
    }

    // Overdue check (1 hour after scheduled return)
    const returnOverdue = addHours(dropoffDate, 1);
    if (isAfter(returnOverdue, now)) {
      await NotificationService.scheduleNotificationByType('return_overdue', {
        body: `Το όχημα ${licensePlate} δεν επιστράφηκε! Επικοινωνήστε με ${customerName}`,
        data: { contractId, licensePlate, customerName, dropoffDate: dropoffDate.toISOString() },
      }, returnOverdue);
    }
  }

  /**
   * Schedule all maintenance notifications for a vehicle
   */
  static async scheduleVehicleMaintenanceNotifications(vehicle: Vehicle): Promise<void> {
    try {
      const vehicleId = vehicle.id;
      const licensePlate = vehicle.licensePlate;

      // Schedule KTEO notifications
      if (vehicle.kteoExpiryDate) {
        await this.scheduleKTEONotifications(vehicleId, licensePlate, new Date(vehicle.kteoExpiryDate));
      }

      // Schedule Insurance notifications
      if (vehicle.insuranceExpiryDate) {
        await this.scheduleInsuranceNotifications(vehicleId, licensePlate, new Date(vehicle.insuranceExpiryDate));
      }

      // Schedule Tire change notifications
      if (vehicle.tiresNextChangeDate) {
        await this.scheduleTireNotifications(vehicleId, licensePlate, new Date(vehicle.tiresNextChangeDate));
      }

      // Schedule Service notifications
      if (vehicle.nextServiceMileage && vehicle.currentMileage) {
        await this.scheduleServiceNotifications(vehicleId, licensePlate, vehicle.currentMileage, vehicle.nextServiceMileage);
      }

      console.log(`Scheduled maintenance notifications for vehicle ${licensePlate}`);
    } catch (error) {
      console.error('Error scheduling vehicle maintenance notifications:', error);
    }
  }

  /**
   * Schedule KTEO (roadworthiness) notifications
   */
  private static async scheduleKTEONotifications(
    vehicleId: string,
    licensePlate: string,
    expiryDate: Date
  ): Promise<void> {
    const now = new Date();

    // 60 days before
    const kteo60d = addDays(expiryDate, -60);
    if (isAfter(kteo60d, now)) {
      await NotificationService.scheduleNotificationByType('kteo_60d', {
        body: `Το ΚΤΕΟ για ${licensePlate} λήγει σε 2 μήνες (${format(expiryDate, 'dd/MM/yyyy')})`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, kteo60d);
    }

    // 30 days before
    const kteo30d = addDays(expiryDate, -30);
    if (isAfter(kteo30d, now)) {
      await NotificationService.scheduleNotificationByType('kteo_30d', {
        body: `Το ΚΤΕΟ για ${licensePlate} λήγει σε 1 μήνα - κλείστε ραντεβού`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, kteo30d);
    }

    // 14 days before
    const kteo14d = addDays(expiryDate, -14);
    if (isAfter(kteo14d, now)) {
      await NotificationService.scheduleNotificationByType('kteo_14d', {
        body: `⚠️ Το ΚΤΕΟ για ${licensePlate} λήγει σε 2 εβδομάδες!`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, kteo14d);
    }

    // 7 days before
    const kteo7d = addDays(expiryDate, -7);
    if (isAfter(kteo7d, now)) {
      await NotificationService.scheduleNotificationByType('kteo_7d', {
        body: `🚨 Το ΚΤΕΟ για ${licensePlate} λήγει σε 1 εβδομάδα!`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, kteo7d);
    }

    // 3 days before
    const kteo3d = addDays(expiryDate, -3);
    if (isAfter(kteo3d, now)) {
      await NotificationService.scheduleNotificationByType('kteo_3d', {
        body: `🚨 ΕΠΕΙΓΟΝ: Το ΚΤΕΟ για ${licensePlate} λήγει σε 3 ημέρες!`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, kteo3d);
    }

    // 1 day before
    const kteo1d = addDays(expiryDate, -1);
    if (isAfter(kteo1d, now)) {
      await NotificationService.scheduleNotificationByType('kteo_1d', {
        body: `🚨 ΚΡΙΣΙΜΟ: Το ΚΤΕΟ για ${licensePlate} λήγει αύριο!`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, kteo1d);
    }

    // On expiry date
    if (isAfter(expiryDate, now)) {
      await NotificationService.scheduleNotificationByType('kteo_expired', {
        body: `🚨 Το ΚΤΕΟ για ${licensePlate} έληξε σήμερα! Το όχημα δεν μπορεί να κυκλοφορήσει!`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, expiryDate);
    }
  }

  /**
   * Schedule Insurance notifications
   */
  private static async scheduleInsuranceNotifications(
    vehicleId: string,
    licensePlate: string,
    expiryDate: Date
  ): Promise<void> {
    const now = new Date();

    const intervals = [
      { days: 60, type: 'insurance_60d' as NotificationType },
      { days: 30, type: 'insurance_30d' as NotificationType },
      { days: 14, type: 'insurance_14d' as NotificationType },
      { days: 7, type: 'insurance_7d' as NotificationType },
      { days: 3, type: 'insurance_3d' as NotificationType },
      { days: 1, type: 'insurance_1d' as NotificationType },
    ];

    for (const interval of intervals) {
      const notificationDate = addDays(expiryDate, -interval.days);
      if (isAfter(notificationDate, now)) {
        const daysText = interval.days === 1 ? 'αύριο' : `σε ${interval.days} ${interval.days <= 7 ? 'ημέρες' : interval.days === 14 ? 'εβδομάδες' : 'μήνες'}`;
        await NotificationService.scheduleNotificationByType(interval.type, {
          body: `Η ασφάλεια για ${licensePlate} λήγει ${daysText} (${format(expiryDate, 'dd/MM/yyyy')})`,
          data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
        }, notificationDate);
      }
    }

    // On expiry date
    if (isAfter(expiryDate, now)) {
      await NotificationService.scheduleNotificationByType('insurance_expired', {
        body: `🚨 Η ασφάλεια για ${licensePlate} έληξε! Το όχημα δεν μπορεί να ενοικιαστεί!`,
        data: { vehicleId, licensePlate, expiryDate: expiryDate.toISOString() },
      }, expiryDate);
    }
  }

  /**
   * Schedule Tire change notifications
   */
  private static async scheduleTireNotifications(
    vehicleId: string,
    licensePlate: string,
    changeDate: Date
  ): Promise<void> {
    const now = new Date();

    const intervals = [
      { days: 30, type: 'tires_30d' as NotificationType },
      { days: 14, type: 'tires_14d' as NotificationType },
      { days: 7, type: 'tires_7d' as NotificationType },
    ];

    for (const interval of intervals) {
      const notificationDate = addDays(changeDate, -interval.days);
      if (isAfter(notificationDate, now)) {
        await NotificationService.scheduleNotificationByType(interval.type, {
          body: `Προγραμματισμένη αλλαγή ελαστικών για ${licensePlate} σε ${interval.days} ημέρες`,
          data: { vehicleId, licensePlate, changeDate: changeDate.toISOString() },
        }, notificationDate);
      }
    }
  }

  /**
   * Schedule Service notifications based on mileage
   */
  private static async scheduleServiceNotifications(
    vehicleId: string,
    licensePlate: string,
    currentMileage: number,
    nextServiceMileage: number
  ): Promise<void> {
    const remainingKm = nextServiceMileage - currentMileage;

    if (remainingKm <= 500 && remainingKm > 0) {
      // Service due soon
      await NotificationService.scheduleNotificationByType('service_due', {
        body: `Το ${licensePlate} χρειάζεται service σε ${remainingKm} χλμ`,
        data: { vehicleId, licensePlate, currentMileage, nextServiceMileage },
      }, new Date());
    } else if (remainingKm <= 0) {
      // Service overdue
      await NotificationService.scheduleNotificationByType('service_overdue', {
        body: `⚠️ Το ${licensePlate} έχει υπερβεί το service κατά ${Math.abs(remainingKm)} χλμ!`,
        data: { vehicleId, licensePlate, currentMileage, nextServiceMileage },
      }, new Date());
    }
  }

  /**
   * Cancel all notifications for a contract
   */
  static async cancelContractNotifications(contractId: string): Promise<void> {
    try {
      // Get all scheduled notifications
      const scheduled = await NotificationService.getScheduledNotifications();
      
      // Filter and cancel notifications for this contract
      for (const notification of scheduled) {
        if (notification.content.data?.contractId === contractId) {
          await NotificationService.cancelNotification(notification.identifier);
        }
      }
      
      console.log(`Cancelled all notifications for contract ${contractId}`);
    } catch (error) {
      console.error('Error cancelling contract notifications:', error);
    }
  }

  /**
   * Cancel all notifications for a vehicle
   */
  static async cancelVehicleNotifications(vehicleId: string): Promise<void> {
    try {
      const scheduled = await NotificationService.getScheduledNotifications();
      
      for (const notification of scheduled) {
        if (notification.content.data?.vehicleId === vehicleId) {
          await NotificationService.cancelNotification(notification.identifier);
        }
      }
      
      console.log(`Cancelled all notifications for vehicle ${vehicleId}`);
    } catch (error) {
      console.error('Error cancelling vehicle notifications:', error);
    }
  }

  /**
   * Check and send operational notifications (daily briefings, summaries, etc.)
   */
  static async checkOperationalNotifications(
    contracts: Contract[],
    vehicles: Vehicle[]
  ): Promise<void> {
    const now = new Date();
    const hour = now.getHours();

    // Morning briefing (8 AM)
    if (hour === 8) {
      await this.sendMorningBriefing(contracts);
    }

    // End of day summary (8 PM)
    if (hour === 20) {
      await this.sendEndOfDaySummary(contracts, vehicles);
    }

    // Weekend planning (Friday 3 PM)
    if (now.getDay() === 5 && hour === 15) {
      await this.sendWeekendPlanning(contracts);
    }
  }

  /**
   * Send morning briefing
   */
  private static async sendMorningBriefing(contracts: Contract[]): Promise<void> {
    const today = new Date();
    const todayPickups = contracts.filter(c => 
      format(new Date(c.rentalPeriod.pickupDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );
    const todayReturns = contracts.filter(c => 
      format(new Date(c.rentalPeriod.dropoffDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
    );

    if (todayPickups.length > 0 || todayReturns.length > 0) {
      await NotificationService.sendNotificationByType('morning_briefing', {
        body: `Καλημέρα! Σήμερα: ${todayPickups.length} παραδόσεις, ${todayReturns.length} επιστροφές`,
        data: { pickups: todayPickups.length, returns: todayReturns.length },
      });
    }
  }

  /**
   * Send end of day summary
   */
  private static async sendEndOfDaySummary(contracts: Contract[], vehicles: Vehicle[]): Promise<void> {
    const activeContracts = contracts.filter(c => c.status === 'active').length;
    const availableVehicles = vehicles.filter(v => v.status === 'available').length;

    await NotificationService.sendNotificationByType('end_of_day_summary', {
      body: `Περίληψη ημέρας: ${activeContracts} ενεργές ενοικιάσεις, ${availableVehicles} διαθέσιμα οχήματα`,
      data: { activeContracts, availableVehicles },
    });
  }

  /**
   * Send weekend planning notification
   */
  private static async sendWeekendPlanning(contracts: Contract[]): Promise<void> {
    const weekend = contracts.filter(c => {
      const pickup = new Date(c.rentalPeriod.pickupDate);
      return pickup.getDay() === 6 || pickup.getDay() === 0; // Saturday or Sunday
    });

    if (weekend.length > 0) {
      await NotificationService.sendNotificationByType('weekend_planning', {
        body: `Προετοιμασία σαββατοκύριακου: ${weekend.length} κρατήσεις ξεκινούν το Σάββατο/Κυριακή`,
        data: { weekendBookings: weekend.length },
      });
    }
  }

  /**
   * Check for smart alerts (double bookings, conflicts, etc.)
   */
  static async checkSmartAlerts(contracts: Contract[], vehicles: Vehicle[]): Promise<void> {
    // Check for double bookings
    await this.checkDoubleBookings(contracts);
    
    // Check for maintenance during rental
    await this.checkMaintenanceDuringRental(contracts, vehicles);
    
    // Check for gap opportunities
    await this.checkGapOpportunities(contracts);
  }

  /**
   * Check for double booking conflicts
   */
  private static async checkDoubleBookings(contracts: Contract[]): Promise<void> {
    // Group contracts by vehicle
    const byVehicle = contracts.reduce((acc, contract) => {
      const plate = contract.carInfo.licensePlate;
      if (!acc[plate]) acc[plate] = [];
      acc[plate].push(contract);
      return acc;
    }, {} as Record<string, Contract[]>);

    // Check for overlaps
    for (const [licensePlate, vehicleContracts] of Object.entries(byVehicle)) {
      for (let i = 0; i < vehicleContracts.length; i++) {
        for (let j = i + 1; j < vehicleContracts.length; j++) {
          const c1 = vehicleContracts[i];
          const c2 = vehicleContracts[j];
          
          const overlap = (
            isBefore(new Date(c1.rentalPeriod.pickupDate), new Date(c2.rentalPeriod.dropoffDate)) &&
            isAfter(new Date(c1.rentalPeriod.dropoffDate), new Date(c2.rentalPeriod.pickupDate))
          );

          if (overlap) {
            await NotificationService.sendNotificationByType('double_booking', {
              body: `Διπλή κράτηση εντοπίστηκε για ${licensePlate}! Ελέγξτε τα συμβόλαια άμεσα.`,
              data: { licensePlate, contract1: c1.id, contract2: c2.id },
            });
          }
        }
      }
    }
  }

  /**
   * Check if maintenance expires during an active rental
   */
  private static async checkMaintenanceDuringRental(contracts: Contract[], vehicles: Vehicle[]): Promise<void> {
    const activeContracts = contracts.filter(c => c.status === 'active');

    for (const contract of activeContracts) {
      const vehicle = vehicles.find(v => v.licensePlate === contract.carInfo.licensePlate);
      if (!vehicle) continue;

      const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);

      // Check KTEO
      if (vehicle.kteoExpiryDate) {
        const kteoExpiry = new Date(vehicle.kteoExpiryDate);
        if (isBefore(kteoExpiry, dropoffDate)) {
          await NotificationService.sendNotificationByType('maintenance_during_rental', {
            body: `⚠️ Το ΚΤΕΟ του ${vehicle.licensePlate} λήγει ενώ είναι ενοικιασμένο!`,
            data: { vehicleId: vehicle.id, contractId: contract.id, maintenanceType: 'kteo' },
          });
        }
      }

      // Check Insurance
      if (vehicle.insuranceExpiryDate) {
        const insuranceExpiry = new Date(vehicle.insuranceExpiryDate);
        if (isBefore(insuranceExpiry, dropoffDate)) {
          await NotificationService.sendNotificationByType('maintenance_during_rental', {
            body: `⚠️ Η ασφάλεια του ${vehicle.licensePlate} λήγει ενώ είναι ενοικιασμένο!`,
            data: { vehicleId: vehicle.id, contractId: contract.id, maintenanceType: 'insurance' },
          });
        }
      }
    }
  }

  /**
   * Check for gaps between rentals (service opportunities)
   */
  private static async checkGapOpportunities(contracts: Contract[]): Promise<void> {
    // Group by vehicle and sort by date
    const byVehicle = contracts.reduce((acc, contract) => {
      const plate = contract.carInfo.licensePlate;
      if (!acc[plate]) acc[plate] = [];
      acc[plate].push(contract);
      return acc;
    }, {} as Record<string, Contract[]>);

    for (const [licensePlate, vehicleContracts] of Object.entries(byVehicle)) {
      const sorted = vehicleContracts.sort((a, b) => 
        new Date(a.rentalPeriod.pickupDate).getTime() - new Date(b.rentalPeriod.pickupDate).getTime()
      );

      for (let i = 0; i < sorted.length - 1; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        
        const gapDays = differenceInDays(
          new Date(next.rentalPeriod.pickupDate),
          new Date(current.rentalPeriod.dropoffDate)
        );

        // If there's a 3+ day gap, suggest service
        if (gapDays >= 3) {
          await NotificationService.sendNotificationByType('gap_opportunity', {
            body: `Ευκαιρία service: ${licensePlate} έχει ${gapDays} ημέρες ελεύθερο μεταξύ κρατήσεων`,
            data: { licensePlate, gapDays, fromDate: current.rentalPeriod.dropoffDate, toDate: next.rentalPeriod.pickupDate },
          });
        }
      }
    }
  }
}

