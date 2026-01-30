import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { syncToNotion } from "@/lib/notion-sync";

export const dynamic = "force-dynamic";

interface GHLWebhookPayload {
  type: string;
  formId: string;
  formName: string;
  submissionId: string;
  contactId: string;
  contact: {
    name?: string;
    firstName?: string;
    email?: string;
    phone?: string;
    [key: string]: any;
  };
  customFields?: Record<string, any>;
  submittedAt: string;
  location?: string;
}

/**
 * Verify webhook signature from GoHighLevel
 * Uses HMAC SHA-256 to validate the webhook is from GHL
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    console.warn("⚠️ No signature provided in webhook");
    return false;
  }

  try {
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error("❌ Signature verification error:", error);
    return false;
  }
}

/**
 * GoHighLevel Webhook Handler
 *
 * This endpoint receives form submission webhooks from GoHighLevel
 * and processes them based on form type.
 *
 * Setup Instructions:
 * 1. In GoHighLevel, go to Settings → Integrations → Webhooks
 * 2. Create webhook pointing to: https://your-domain.com/api/webhooks/ghl
 * 3. Set webhook secret in GOHIGHLEVEL_WEBHOOK_SECRET env var
 * 4. Select "Form Submission" as trigger event
 * 5. Copy the webhook secret from GHL and add to your .env.local
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const payload: GHLWebhookPayload = JSON.parse(rawBody);

    // Verify webhook signature (fixes issue #7)
    const webhookSecret = process.env.GOHIGHLEVEL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get("x-ghl-signature");

      if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
        console.error("❌ Invalid webhook signature - possible unauthorized request");
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }

      console.log("✅ Webhook signature verified");
    } else {
      console.warn("⚠️ GOHIGHLEVEL_WEBHOOK_SECRET not set - signature verification skipped");
    }

    console.log("Received GHL webhook:", {
      formId: payload.formId,
      formName: payload.formName,
      contactEmail: payload.contact.email,
    });

    // Route to appropriate handler based on form type
    const formType = determineFormType(payload.formId, payload.formName);

    switch (formType) {
      case "contact":
        await handleContactForm(payload);
        break;
      case "farm_stay":
        await handleFarmStayBooking(payload);
        break;
      case "csa":
        await handleCSAInterest(payload);
        break;
      case "art_residency":
        await handleArtResidency(payload);
        break;
      case "newsletter":
        await handleNewsletterSignup(payload);
        break;
      default:
        console.warn("Unknown form type:", payload.formId);
    }

    // Store submission in Supabase (fixes issue #8)
    const submissionId = await storeSubmission(payload, formType);

    // Sync to Notion (fixes issue #9)
    const notionResult = await syncToNotion(payload, formType);
    if (!notionResult.success) {
      console.error('❌ Failed to sync to Notion:', notionResult.error);
      // Don't fail the webhook - log the error and continue
      // The data is already in Supabase, so we can retry Notion sync manually if needed
    } else {
      console.log('✅ Synced to Notion page:', notionResult.pageId);
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      formType,
      submissionId,
      notionPageId: notionResult.pageId,
    });
  } catch (error) {
    console.error("GHL webhook error:", error);
    return NextResponse.json(
      {
        error: "Failed to process webhook",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Determine form type from GHL webhook payload
 * Fixes issue #10 - Uses form ID mapping with name-based fallback
 *
 * Setup: Add these to your .env.local:
 * - GHL_FORM_CONTACT=<form-id-from-ghl>
 * - GHL_FORM_FARM_STAY=<form-id-from-ghl>
 * - GHL_FORM_CSA=<form-id-from-ghl>
 * - GHL_FORM_ART_RESIDENCY=<form-id-from-ghl>
 * - GHL_FORM_NEWSLETTER=<form-id-from-ghl>
 *
 * To get form IDs: GHL → Settings → Forms → Copy form ID
 */
function determineFormType(
  formId: string,
  formName: string
): "contact" | "farm_stay" | "csa" | "art_residency" | "newsletter" | "unknown" {
  // Primary: Map by form ID (most reliable)
  const formMappings: Record<string, string> = {
    [process.env.GHL_FORM_CONTACT || ""]: "contact",
    [process.env.GHL_FORM_FARM_STAY || ""]: "farm_stay",
    [process.env.GHL_FORM_CSA || ""]: "csa",
    [process.env.GHL_FORM_ART_RESIDENCY || ""]: "art_residency",
    [process.env.GHL_FORM_NEWSLETTER || ""]: "newsletter",
  };

  // Check if we have a direct form ID match
  if (formId && formMappings[formId]) {
    const mappedType = formMappings[formId] as "contact" | "farm_stay" | "csa" | "art_residency" | "newsletter";
    console.log(`✅ Form matched by ID: ${formId} → ${mappedType}`);
    return mappedType;
  }

  // Fallback: Match by form name (less reliable but works without config)
  const nameLower = formName.toLowerCase();
  let detectedType: "contact" | "farm_stay" | "csa" | "art_residency" | "newsletter" | "unknown" = "unknown";

  if (nameLower.includes("contact")) detectedType = "contact";
  else if (nameLower.includes("farm") || nameLower.includes("stay") || nameLower.includes("booking")) detectedType = "farm_stay";
  else if (nameLower.includes("csa") || nameLower.includes("harvest")) detectedType = "csa";
  else if (nameLower.includes("art") || nameLower.includes("residency")) detectedType = "art_residency";
  else if (nameLower.includes("newsletter") || nameLower.includes("subscribe")) detectedType = "newsletter";

  if (detectedType !== "unknown") {
    console.log(`⚠️ Form matched by name fallback: "${formName}" → ${detectedType}`);
    console.log(`💡 Tip: Set GHL_FORM_${detectedType.toUpperCase()}=${formId} in .env.local for more reliable matching`);
  } else {
    console.warn(`❌ Unknown form type: ID="${formId}", Name="${formName}"`);
  }

  return detectedType;
}

async function handleContactForm(payload: GHLWebhookPayload) {
  console.log("Processing contact form submission:", payload.contact.email);

  // Send notification email to ACT team (fixes issue #11)
  try {
    const { sendPartnershipNotification } = await import('@/lib/email');
    await sendPartnershipNotification({
      name: payload.contact.name || payload.contact.email || 'Unknown',
      email: payload.contact.email || '',
      phone: payload.contact.phone,
      company: payload.contact.companyName || payload.customFields?.company,
      message: payload.customFields?.message || payload.customFields?.notes,
    });
    console.log("✅ Partnership notification sent to ACT team");
  } catch (error) {
    console.error("❌ Failed to send partnership notification:", error);
  }

  // Add partnership tags in GHL
  try {
    const { addTagsToContact } = await import('@/lib/ghl');
    await addTagsToContact(payload.contactId, ['Partnership Inquiry', 'Website Signup']);
    console.log("✅ Added partnership tags to contact in GHL");
  } catch (error) {
    console.error("❌ Failed to add partnership tags in GHL:", error);
  }

  // Note: Issue #13 (Add to CRM workflow) is handled automatically by GHL
  // when tags are added - workflows can be triggered by tag addition
}

async function handleFarmStayBooking(payload: GHLWebhookPayload) {
  console.log("Processing farm stay booking:", payload.contact.email);

  // Send confirmation email (fixes issue #15)
  if (payload.contact.email && payload.contact.name) {
    try {
      const { sendBookingConfirmation } = await import('@/lib/email');
      await sendBookingConfirmation(
        payload.contact.email,
        payload.contact.name,
        {
          dates: payload.customFields?.dates || 'TBD',
          guests: payload.customFields?.guests || 1,
        }
      );
      console.log("✅ Booking confirmation sent to:", payload.contact.email);
    } catch (error) {
      console.error("❌ Failed to send booking confirmation:", error);
    }
  }

  // Add booking tags in GHL
  try {
    const { addTagsToContact } = await import('@/lib/ghl');
    await addTagsToContact(payload.contactId, ['Farm Stay Booking', 'Website Signup']);
    console.log("✅ Added farm stay tags to contact in GHL");
  } catch (error) {
    console.error("❌ Failed to add farm stay tags in GHL:", error);
  }

  // Add to Google Calendar (fixes issue #16)
  try {
    const { addBookingToCalendar } = await import('@/lib/calendar');
    await addBookingToCalendar({
      guestName: payload.contact.name || 'Guest',
      guestEmail: payload.contact.email || '',
      dates: payload.customFields?.dates || 'TBD',
      guests: payload.customFields?.guests || 1,
      phone: payload.contact.phone,
      notes: payload.customFields?.notes || payload.customFields?.message,
    });
    console.log("✅ Added booking to Google Calendar");
  } catch (error) {
    console.error("❌ Failed to add booking to Google Calendar:", error);
    // Don't fail the webhook if calendar fails
  }
}

async function handleCSAInterest(payload: GHLWebhookPayload) {
  console.log("Processing CSA interest:", payload.contact.email);

  // Send welcome email (fixes issue #19)
  if (payload.contact.email) {
    try {
      const { sendCSAWelcome } = await import('@/lib/email');
      await sendCSAWelcome(
        payload.contact.email,
        payload.contact.name
      );
      console.log("✅ CSA welcome email sent to:", payload.contact.email);
    } catch (error) {
      console.error("❌ Failed to send CSA welcome email:", error);
    }
  }

  // Add to Harvest mailing list in GHL (fixes issue #18)
  try {
    const { addTagsToContact } = await import('@/lib/ghl');
    await addTagsToContact(payload.contactId, ['Harvest', 'CSA Interest', 'Website Signup']);
    console.log("✅ Added Harvest CSA tags to contact in GHL");
  } catch (error) {
    console.error("❌ Failed to add Harvest tags in GHL:", error);
    // Don't fail the webhook if GHL API fails
  }
}

async function handleArtResidency(payload: GHLWebhookPayload) {
  console.log("Processing art residency application:", payload.contact.email);

  // Send acknowledgment email (fixes issue #21)
  if (payload.contact.email && payload.contact.name) {
    try {
      const { sendResidencyAcknowledgment } = await import('@/lib/email');
      await sendResidencyAcknowledgment(
        payload.contact.email,
        payload.contact.name
      );
      console.log("✅ Residency acknowledgment sent to:", payload.contact.email);
    } catch (error) {
      console.error("❌ Failed to send residency acknowledgment:", error);
    }
  }

  // Notify residency coordinator (fixes issue #22)
  if (payload.contact.email && payload.contact.name) {
    try {
      const { sendResidencyCoordinatorNotification } = await import('@/lib/email');
      await sendResidencyCoordinatorNotification({
        name: payload.contact.name,
        email: payload.contact.email,
        phone: payload.contact.phone,
        practice: payload.customFields?.practice || payload.customFields?.medium,
        dates: payload.customFields?.dates,
        project: payload.customFields?.project || payload.customFields?.description,
      });
      console.log("✅ Residency coordinator notified");
    } catch (error) {
      console.error("❌ Failed to notify residency coordinator:", error);
    }
  }

  // Add art residency tags in GHL
  try {
    const { addTagsToContact } = await import('@/lib/ghl');
    await addTagsToContact(payload.contactId, ['Art Residency', 'Application Submitted', 'Website Signup']);
    console.log("✅ Added art residency tags to contact in GHL");
  } catch (error) {
    console.error("❌ Failed to add art residency tags in GHL:", error);
  }

  // Note: Tags in GHL can trigger workflows that notify coordinators
  // Set up a workflow in GHL: "When tag 'Art Residency' is added → Send internal notification"
}

async function handleNewsletterSignup(payload: GHLWebhookPayload) {
  console.log("Processing newsletter signup:", payload.contact.email);

  // Send welcome email (fixes issue #24)
  try {
    const { sendNewsletterWelcome } = await import('@/lib/email');
    await sendNewsletterWelcome(
      payload.contact.email!,
      payload.contact.name
    );
    console.log("✅ Newsletter welcome email sent to:", payload.contact.email);
  } catch (error) {
    console.error("❌ Failed to send newsletter welcome email:", error);
    // Don't fail the webhook if email fails
  }

  // Add to GHL newsletter list (fixes issue #23)
  try {
    const { addTagsToContact } = await import('@/lib/ghl');
    await addTagsToContact(payload.contactId, ['Newsletter', 'Website Signup']);
    console.log("✅ Added Newsletter tags to contact in GHL");
  } catch (error) {
    console.error("❌ Failed to add newsletter tags in GHL:", error);
    // Don't fail the webhook if GHL API fails
  }
}

/**
 * Store form submission in Supabase
 * Fixes issue #8
 */
async function storeSubmission(
  payload: GHLWebhookPayload,
  formType: string
): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const submissionData = {
      form_id: payload.formId,
      form_name: payload.formName,
      form_type: formType,
      submission_id: payload.submissionId,
      contact_id: payload.contactId,
      email: payload.contact.email,
      name: payload.contact.name,
      phone: payload.contact.phone,
      custom_fields: payload.customFields || {},
      submitted_at: payload.submittedAt || new Date().toISOString(),
      webhook_payload: payload,
      synced_to_notion: false,
    };

    const { data, error } = await supabase
      .from('ghl_submissions')
      .insert([submissionData])
      .select('id')
      .single();

    if (error) {
      console.error("Failed to store GHL submission:", error);
      return null;
    }

    console.log("GHL submission stored with ID:", data?.id);
    return data?.id || null;

  } catch (error) {
    console.error("Error storing submission:", error);
    return null;
  }
}
