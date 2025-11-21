'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrganizationId } from '@/lib/organization';
import { 
  Calendar as CalendarIcon, ArrowLeft, ArrowRight,
  ArrowDownCircle, ArrowUpCircle, MapPin, Clock
} from 'lucide-react';
import FleetOSLogo from '@/components/FleetOSLogo';
import { format, startOfMonth, endOfMonth, startOfDay, isSameDay, isBefore, addMonths, subMonths, getDay, addDays, eachDayOfInterval } from 'date-fns';
import { el } from 'date-fns/locale';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'pickup' | 'dropoff';
  contractId?: string;
  description?: string;
  isCompleted: boolean;
  vehicleName?: string;
  renterName?: string;
  location?: string;
  time?: string;
}

const DAY_LABELS = ['ΔΕ', 'ΤΡ', 'ΤΕ', 'ΠΕ', 'ΠΑ', 'ΣΑ', 'ΚΥ'];

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'month' | 'agenda'>('month');
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(new Date()));

  useEffect(() => {
    loadCalendarEvents();
  }, []);

  async function loadCalendarEvents() {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const organizationId = await getOrganizationId(user.id);

      // Load contracts
      let contractsQuery = supabase
        .from('contracts')
        .select('id, status, renter_full_name, car_make_model, car_license_plate, pickup_date, dropoff_date, pickup_time, dropoff_time, pickup_location, dropoff_location');

      if (organizationId) {
        contractsQuery = contractsQuery.eq('organization_id', organizationId);
      } else {
        contractsQuery = contractsQuery.eq('user_id', user.id);
      }

      const { data: contracts, error } = await contractsQuery;

      if (error) {
        console.error('Error loading contracts:', error);
        return;
      }

      const calendarEvents: CalendarEvent[] = [];

      // Convert contracts to calendar events
      (contracts || []).forEach(contract => {
        if (contract.pickup_date) {
          const pickupDate = new Date(contract.pickup_date);
          calendarEvents.push({
            id: `${contract.id}-pickup`,
            title: `Pickup - ${contract.renter_full_name || 'Unknown'}`,
            date: pickupDate,
            type: 'pickup',
            contractId: contract.id,
            description: `${contract.car_make_model || 'Unknown'} • ${contract.car_license_plate || 'N/A'}`,
            isCompleted: contract.status === 'completed',
            vehicleName: contract.car_make_model || 'Unknown',
            renterName: contract.renter_full_name || 'Unknown',
            location: contract.pickup_location || 'No location',
            time: contract.pickup_time || '',
          });
        }

        if (contract.dropoff_date) {
          const dropoffDate = new Date(contract.dropoff_date);
          calendarEvents.push({
            id: `${contract.id}-dropoff`,
            title: `Dropoff - ${contract.renter_full_name || 'Unknown'}`,
            date: dropoffDate,
            type: 'dropoff',
            contractId: contract.id,
            description: `${contract.car_make_model || 'Unknown'} • ${contract.car_license_plate || 'N/A'}`,
            isCompleted: contract.status === 'completed',
            vehicleName: contract.car_make_model || 'Unknown',
            renterName: contract.renter_full_name || 'Unknown',
            location: contract.dropoff_location || contract.pickup_location || 'No location',
            time: contract.dropoff_time || '',
          });
        }
      });

      // Sort events by date
      calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  }

  const today = useMemo(() => startOfDay(new Date()), []);
  const futureEvents = useMemo(
    () => events.filter(event => !isBefore(startOfDay(event.date), today)),
    [events, today]
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    futureEvents.forEach(event => {
      const key = format(event.date, 'yyyy-MM-dd');
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(event);
    });
    map.forEach(list => list.sort((a, b) => a.date.getTime() - b.date.getTime()));
    return map;
  }, [futureEvents]);

  const upcomingEventsList = useMemo(() => {
    const sorted = [...futureEvents].sort((a, b) => a.date.getTime() - b.date.getTime());
    return sorted.slice(0, 20);
  }, [futureEvents]);

  function renderAgendaEvent(event: CalendarEvent) {
    const meta = event.type === 'pickup' 
      ? { label: 'Pickup', icon: ArrowDownCircle, color: '#10b981' }
      : { label: 'Dropoff', icon: ArrowUpCircle, color: '#f59e0b' };

    const Icon = meta.icon;
    const timeText = event.time || format(event.date, 'HH:mm');
    const dateText = format(event.date, 'dd/MM', { locale: el });
    const titleText = event.vehicleName || event.title;
    const subtitleText = event.renterName || event.description || '';
    const locationText = event.location || 'No location';

    return (
      <button
        key={event.id}
        onClick={() => {
          if (event.contractId) {
            router.push(`/dashboard/rentals/${event.contractId}`);
          }
        }}
        className="w-full bg-white rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`} style={{ backgroundColor: `${meta.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: meta.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 mb-1">{meta.label}</p>
            <p className="text-sm text-gray-700 mb-1 truncate">
              {titleText}
              {subtitleText ? ` • ${subtitleText}` : ''}
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{dateText} {timeText}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{locationText}</span>
              </div>
            </div>
          </div>
        </div>
      </button>
    );
  }

  function renderMonthView() {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = addDays(monthStart, -getDay(monthStart));
    const endDate = addDays(monthEnd, 6 - getDay(monthEnd));
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h3 className="text-lg font-bold text-gray-900">
            {format(currentMonth, 'MMMM yyyy', { locale: el })}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Day Labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_LABELS.map((day, index) => (
            <div key={index} className="text-center text-xs font-semibold text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dayKey) || [];
            const isToday = isSameDay(day, today);
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isSelected = isSameDay(day, selectedDate);

            return (
              <button
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square p-1 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : isToday
                    ? 'bg-blue-50 border-blue-200'
                    : !isCurrentMonth
                    ? 'text-gray-300 border-transparent'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className={`text-xs font-medium mb-1 ${isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 justify-center">
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${
                          event.type === 'pickup' ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[8px] text-gray-500">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Day Events */}
        {(() => {
          const selectedDayKey = format(selectedDate, 'yyyy-MM-dd');
          const selectedDayEvents = eventsByDate.get(selectedDayKey) || [];
          
          if (selectedDayEvents.length === 0) return null;
          
          return (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {isSameDay(selectedDate, today) ? 'Today' : format(selectedDate, 'EEEE d MMMM', { locale: el })}
              </h4>
              <div className="space-y-2">
                {selectedDayEvents.map(event => renderAgendaEvent(event))}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  function renderAgendaView() {
    return (
      <div className="space-y-3">
        {upcomingEventsList.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No upcoming events</p>
          </div>
        ) : (
          upcomingEventsList.map(event => renderAgendaEvent(event))
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <FleetOSLogo variant="icon" size={40} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
                <p className="text-sm text-gray-600">View pickup and dropoff events</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/dashboard" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Dashboard
            </Link>
            <Link href="/dashboard/fleet" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Fleet
            </Link>
            <Link href="/dashboard/rentals" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Rentals
            </Link>
            <Link href="/dashboard/customers" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Customers
            </Link>
            <Link href="/dashboard/book-online" className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300">
              Book Online
            </Link>
            <Link href="/dashboard/calendar" className="border-b-2 border-blue-600 py-4 px-1 text-sm font-medium text-blue-600">
              Calendar
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* View Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-2 mb-6 flex gap-2">
          <button
            onClick={() => setActiveView('month')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setActiveView('agenda')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === 'agenda'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
        </div>

        {/* Content */}
        {activeView === 'month' ? renderMonthView() : renderAgendaView()}
      </main>
    </div>
  );
}

