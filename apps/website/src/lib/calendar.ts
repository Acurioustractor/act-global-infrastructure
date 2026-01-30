/**
 * Google Calendar Integration
 * Adds farm stay bookings to Google Calendar
 *
 * Setup required:
 * 1. Create Google Cloud project: https://console.cloud.google.com
 * 2. Enable Google Calendar API
 * 3. Create Service Account credentials
 * 4. Download JSON key file
 * 5. Share calendar with service account email
 * 6. Add service account credentials to environment variables
 */

import { google } from 'googleapis';

interface CalendarEvent {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string; // ISO 8601 format
    date?: string; // YYYY-MM-DD for all-day events
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

/**
 * Add farm stay booking to Google Calendar
 *
 * @param booking - Booking details from GHL webhook
 * @returns Event ID if successful, null if failed
 */
export async function addBookingToCalendar(booking: {
  guestName: string;
  guestEmail: string;
  dates: string; // e.g., "Jan 15-20, 2025"
  guests: number;
  phone?: string;
  notes?: string;
}): Promise<string | null> {
  // Check if calendar integration is configured
  if (!process.env.GOOGLE_CALENDAR_ID) {
    console.warn('⚠️ GOOGLE_CALENDAR_ID not set - skipping calendar integration');
    return null;
  }

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn('⚠️ Google Calendar credentials not set - skipping calendar integration');
    return null;
  }

  try {
    // Create JWT auth client with service account
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Parse dates (this is a simplified parser - you may need to adjust)
    const { start, end } = parseDateRange(booking.dates);

    const event: CalendarEvent = {
      summary: `Farm Stay: ${booking.guestName}`,
      description: `
Farm Stay Booking

Guest: ${booking.guestName}
Email: ${booking.guestEmail}
${booking.phone ? `Phone: ${booking.phone}` : ''}
Number of guests: ${booking.guests}
${booking.notes ? `\nNotes: ${booking.notes}` : ''}

Booked via website
      `.trim(),
      location: 'ACT Farm', // Update with actual address
      start: {
        date: start, // All-day event
        timeZone: 'America/New_York', // Update with your timezone
      },
      end: {
        date: end,
        timeZone: 'America/New_York',
      },
      attendees: [
        {
          email: booking.guestEmail,
          displayName: booking.guestName,
        },
      ],
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: event,
      sendUpdates: 'none', // Don't send email invites (we already sent confirmation)
    });

    console.log('✅ Added booking to Google Calendar:', response.data.id);
    return response.data.id || null;
  } catch (error) {
    console.error('❌ Failed to add booking to Google Calendar:', error);
    return null;
  }
}

/**
 * Parse date range string into start/end dates
 * Examples:
 *  - "Jan 15-20, 2025" → start: 2025-01-15, end: 2025-01-20
 *  - "2025-01-15 to 2025-01-20" → start: 2025-01-15, end: 2025-01-20
 *  - "TBD" → start: today, end: today + 1
 */
function parseDateRange(dateStr: string): { start: string; end: string } {
  // Default fallback: tomorrow as a 1-day booking
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const defaultStart = tomorrow.toISOString().split('T')[0];
  const defaultEnd = dayAfter.toISOString().split('T')[0];

  if (!dateStr || dateStr === 'TBD') {
    return { start: defaultStart, end: defaultEnd };
  }

  // Try to parse ISO format: "2025-01-15 to 2025-01-20"
  const isoMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return {
      start: isoMatch[1],
      end: isoMatch[2],
    };
  }

  // Try to parse "Jan 15-20, 2025" format
  const rangeMatch = dateStr.match(/([A-Za-z]+)\s+(\d+)-(\d+),?\s+(\d{4})/);
  if (rangeMatch) {
    const month = rangeMatch[1];
    const startDay = rangeMatch[2];
    const endDay = rangeMatch[3];
    const year = rangeMatch[4];

    const monthMap: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };

    const monthNum = monthMap[month.toLowerCase().substring(0, 3)] || '01';

    return {
      start: `${year}-${monthNum}-${startDay.padStart(2, '0')}`,
      end: `${year}-${monthNum}-${endDay.padStart(2, '0')}`,
    };
  }

  // Fallback: use default dates
  console.warn('⚠️ Could not parse date range:', dateStr, '- using default dates');
  return { start: defaultStart, end: defaultEnd };
}
