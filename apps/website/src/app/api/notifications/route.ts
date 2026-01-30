import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Fetch unread notifications for the notification banner
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    // Get summary of notifications
    const { data: summary, error: summaryError } = await supabase
      .from('notification_summary')
      .select('*')
      .single();

    if (summaryError) {
      console.error('Error fetching notification summary:', summaryError);
    }

    // Get recent unread notifications (limit to 10 most recent)
    const { data: notifications, error: notificationsError } = await supabase
      .from('wiki_notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary: summary || {
        unread_count: 0,
        urgent_count: 0,
        high_count: 0,
        review_due_count: 0,
        high_confidence_count: 0,
        latest_unread_at: null,
      },
      notifications: notifications || [],
    });
  } catch (error) {
    console.error('Unexpected error in notifications API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/mark-read
 * Mark notification(s) as read
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('wiki_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, marked: 'all' });
    } else if (notificationId) {
      // Mark specific notification as read
      const { error } = await supabase
        .from('wiki_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json(
          { error: 'Failed to mark notification as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, marked: notificationId });
    } else {
      return NextResponse.json(
        { error: 'Must provide notificationId or markAllRead' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Unexpected error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
