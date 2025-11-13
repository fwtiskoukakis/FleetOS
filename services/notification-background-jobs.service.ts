/**
 * Notification Background Jobs Service
 * Manages periodic background jobs for operational notifications
 */

import { NotificationScheduler } from './notification-scheduler.service';
import { NotificationService } from './notification.service';
import { SupabaseContractService } from './supabase-contract.service';
import { VehicleService } from './vehicle.service';
import { Contract } from '../models/contract.interface';
import { Vehicle } from '../models/vehicle.interface';
import { supabase } from '../utils/supabase';

export class NotificationBackgroundJobs {
  private static isRunning = false;
  private static checkInterval: NodeJS.Timeout | null = null;

  /**
   * Start background job checking
   * This should be called when the app initializes
   */
  static async startBackgroundJobs() {
    if (this.isRunning) {
      console.log('Background jobs already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting notification background jobs...');

    // Run immediate check
    await this.runAllChecks();

    // Set up interval to run every hour
    this.checkInterval = setInterval(async () => {
      await this.runAllChecks();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Stop background job checking
   */
  static stopBackgroundJobs() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('Stopped notification background jobs');
  }

  /**
   * Run all periodic checks
   */
  private static async runAllChecks() {
    try {
      console.log('Running notification background checks...');

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user logged in, skipping checks');
        return;
      }

      // Load contracts and vehicles
      const contracts = await SupabaseContractService.getAllContracts();
      const vehicles = await VehicleService.getAllVehicles();

      // Run operational notifications
      await NotificationScheduler.checkOperationalNotifications(contracts, vehicles);

      // Run smart alerts
      await NotificationScheduler.checkSmartAlerts(contracts, vehicles);

      // Check for overdue returns
      await this.checkOverdueReturns(contracts);

      // Check for critical maintenance
      await this.checkCriticalMaintenance(vehicles);

      console.log('Background checks completed successfully');
    } catch (error) {
      console.error('Error running background checks:', error);
    }
  }

  /**
   * Check for overdue returns and send alerts
   */
  private static async checkOverdueReturns(contracts: Contract[]) {
    const now = new Date();

    for (const contract of contracts) {
      if (contract.status !== 'active') continue;

      const dropoffDate = new Date(contract.rentalPeriod.dropoffDate);
      
      // Check if return is overdue by more than 1 hour
      const hoursSinceDropoff = (now.getTime() - dropoffDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceDropoff > 1) {
        // Send overdue notification
        await NotificationService.sendNotificationByType('return_overdue', {
          body: `Το όχημα ${contract.carInfo.licensePlate} δεν επιστράφηκε! Καθυστέρηση: ${Math.floor(hoursSinceDropoff)} ώρες`,
          data: {
            contractId: contract.id,
            licensePlate: contract.carInfo.licensePlate,
            customerName: contract.user.fullName,
            hoursOverdue: Math.floor(hoursSinceDropoff),
          },
        });
      }
    }
  }

  /**
   * Check for critical maintenance issues
   */
  private static async checkCriticalMaintenance(vehicles: Vehicle[]) {
    const now = new Date();

    for (const vehicle of vehicles) {
      // Check KTEO expiry
      if (vehicle.kteoExpiryDate) {
        const kteoExpiry = new Date(vehicle.kteoExpiryDate);
        const daysUntilExpiry = Math.floor((kteoExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          // KTEO expired
          const daysOverdue = Math.abs(daysUntilExpiry);
          await NotificationService.sendNotificationByType('kteo_overdue', {
            body: `🚨 Το ΚΤΕΟ του ${vehicle.licensePlate} έχει λήξει εδώ και ${daysOverdue} ημέρες! Το όχημα δεν μπορεί να κυκλοφορήσει!`,
            data: {
              vehicleId: vehicle.id,
              licensePlate: vehicle.licensePlate,
              daysOverdue,
            },
          });
        }
      }

      // Check Insurance expiry
      if (vehicle.insuranceExpiryDate) {
        const insuranceExpiry = new Date(vehicle.insuranceExpiryDate);
        const daysUntilExpiry = Math.floor((insuranceExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          // Insurance expired
          const daysOverdue = Math.abs(daysUntilExpiry);
          await NotificationService.sendNotificationByType('insurance_expired', {
            body: `🚨 Η ασφάλεια του ${vehicle.licensePlate} έχει λήξει εδώ και ${daysOverdue} ημέρες!`,
            data: {
              vehicleId: vehicle.id,
              licensePlate: vehicle.licensePlate,
              daysOverdue,
            },
          });
        }
      }
    }
  }

  /**
   * Manually trigger daily briefing
   */
  static async sendDailyBriefing() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const contracts = await SupabaseContractService.getAllContracts();
      const today = new Date();

      const todayPickups = contracts.filter(c => {
        const pickup = new Date(c.rentalPeriod.pickupDate);
        return pickup.toDateString() === today.toDateString();
      });

      const todayReturns = contracts.filter(c => {
        const dropoff = new Date(c.rentalPeriod.dropoffDate);
        return dropoff.toDateString() === today.toDateString();
      });

      if (todayPickups.length > 0 || todayReturns.length > 0) {
        await NotificationService.sendNotificationByType('morning_briefing', {
          body: `Καλημέρα! Σήμερα: ${todayPickups.length} παραδόσεις, ${todayReturns.length} επιστροφές`,
          data: {
            pickups: todayPickups.length,
            returns: todayReturns.length,
            date: today.toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Error sending daily briefing:', error);
    }
  }

  /**
   * Manually trigger end of day summary
   */
  static async sendEndOfDaySummary() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const contracts = await SupabaseContractService.getAllContracts();
      const vehicles = await VehicleService.getAllVehicles();

      const activeContracts = contracts.filter(c => c.status === 'active').length;
      const availableVehicles = vehicles.filter(v => v.status === 'available').length;

      await NotificationService.sendNotificationByType('end_of_day_summary', {
        body: `Περίληψη ημέρας: ${activeContracts} ενεργές ενοικιάσεις, ${availableVehicles} διαθέσιμα οχήματα`,
        data: {
          activeContracts,
          availableVehicles,
          date: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Error sending end of day summary:', error);
    }
  }

  /**
   * Manually trigger weekly summary
   */
  static async sendWeeklySummary() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const contracts = await SupabaseContractService.getAllContracts();

      // Calculate week stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const weekContracts = contracts.filter(c => {
        const created = new Date(c.createdAt);
        return created >= weekAgo && created <= now;
      });

      const weekRevenue = weekContracts.reduce((sum, c) => sum + (c.rentalPeriod.totalCost || 0), 0);

      await NotificationService.sendNotificationByType('weekly_revenue_summary', {
        body: `Εβδομαδιαία Περίληψη: ${weekContracts.length} συμβόλαια, €${weekRevenue.toLocaleString()} έσοδα`,
        data: {
          contracts: weekContracts.length,
          revenue: weekRevenue,
          weekStart: weekAgo.toISOString(),
          weekEnd: now.toISOString(),
        },
      });
    } catch (error) {
      console.error('Error sending weekly summary:', error);
    }
  }

  /**
   * Check and send milestone notifications
   */
  static async checkMilestones() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const contracts = await SupabaseContractService.getAllContracts();

      // Check for 100th contract
      if (contracts.length === 100) {
        await NotificationService.sendNotificationByType('milestone_achieved', {
          body: '🏆 Συγχαρητήρια! Ολοκληρώσατε το 100ο συμβόλαιο!',
          data: { milestone: '100_contracts', count: 100 },
        });
      }

      // Check for perfect week (no issues)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentContracts = contracts.filter(c => new Date(c.createdAt) >= weekAgo);
      
      const hasIssues = recentContracts.some(c => 
        c.status === 'cancelled' || 
        (c.rentalPeriod.dropoffDate && new Date(c.rentalPeriod.dropoffDate) < new Date() && c.status === 'active')
      );

      if (!hasIssues && recentContracts.length > 0) {
        await NotificationService.sendNotificationByType('perfect_week', {
          body: '🌟 Τέλεια εβδομάδα! Καμία καθυστέρηση ή ακύρωση!',
          data: { contracts: recentContracts.length },
        });
      }
    } catch (error) {
      console.error('Error checking milestones:', error);
    }
  }

  /**
   * Initialize notification system when app starts
   */
  static async initializeNotificationSystem() {
    try {
      // Initialize notification service
      await NotificationService.initialize();

      // Start background jobs
      await this.startBackgroundJobs();

      console.log('Notification system initialized successfully');
    } catch (error) {
      console.error('Error initializing notification system:', error);
    }
  }
}

