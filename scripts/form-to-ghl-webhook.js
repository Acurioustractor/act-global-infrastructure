/**
 * Form to GHL - Website Form Integration
 *
 * This provides two options for website forms to create GHL contacts:
 *
 * OPTION 1: Direct to GHL (Simplest)
 * ----------------------------------
 * Send form data directly to the GHL Inbound Webhook.
 * The same workflow that handles Gmail and Calendar will create the contact.
 *
 * OPTION 2: Via Supabase Edge Function (With tracking)
 * ----------------------------------------------------
 * Send form data to a Supabase Edge Function that:
 * 1. Logs the submission
 * 2. Forwards to GHL
 * 3. Stores in Supabase for analytics
 *
 * GHL Inbound Webhook URL:
 * https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554
 */

// ============================================================
// OPTION 1: Direct to GHL - Client-side JavaScript
// ============================================================

/**
 * Example HTML Form:
 *
 * <form id="contact-form">
 *   <input type="text" name="firstName" placeholder="First Name" required>
 *   <input type="text" name="lastName" placeholder="Last Name">
 *   <input type="email" name="email" placeholder="Email" required>
 *   <input type="tel" name="phone" placeholder="Phone">
 *   <textarea name="message" placeholder="Message"></textarea>
 *   <button type="submit">Submit</button>
 * </form>
 *
 * <script src="form-to-ghl.js"></script>
 */

const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554';

/**
 * Initialize form handler on page load
 */
function initFormToGHL(formId, options = {}) {
  const form = document.getElementById(formId);
  if (!form) {
    console.error(`Form with ID "${formId}" not found`);
    return;
  }

  const config = {
    webhookUrl: options.webhookUrl || GHL_WEBHOOK_URL,
    source: options.source || 'Website Form',
    tags: options.tags || ['Website Lead', 'Form Submission'],
    onSuccess: options.onSuccess || defaultOnSuccess,
    onError: options.onError || defaultOnError,
    ...options
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Build GHL-compatible payload
    const payload = {
      email: data.email,
      firstName: data.firstName || data.first_name || '',
      lastName: data.lastName || data.last_name || '',
      phone: data.phone || '',
      source: config.source,
      tags: config.tags,

      // Form-specific data
      formName: form.name || form.id || 'Unknown Form',
      formPage: window.location.href,
      message: data.message || data.comments || '',

      // Metadata
      importedAt: new Date().toISOString(),
      importSource: 'website-form'
    };

    // Add any custom fields
    Object.keys(data).forEach(key => {
      if (!['email', 'firstName', 'lastName', 'first_name', 'last_name', 'phone', 'message', 'comments'].includes(key)) {
        payload[key] = data[key];
      }
    });

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        mode: 'no-cors' // GHL webhook may not return CORS headers
      });

      // no-cors mode means we can't read the response, assume success
      config.onSuccess(form, payload);

    } catch (error) {
      console.error('Form submission error:', error);
      config.onError(form, error);
    }
  });
}

function defaultOnSuccess(form, data) {
  // Replace form with success message
  form.innerHTML = `
    <div class="form-success">
      <h3>Thank you!</h3>
      <p>We've received your message and will be in touch soon.</p>
    </div>
  `;
}

function defaultOnError(form, error) {
  alert('There was an error submitting the form. Please try again.');
}

// Auto-initialize forms with data-ghl-form attribute
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-ghl-form]').forEach(form => {
    const options = {
      source: form.dataset.ghlSource,
      tags: form.dataset.ghlTags ? form.dataset.ghlTags.split(',') : undefined
    };
    initFormToGHL(form.id, options);
  });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initFormToGHL, GHL_WEBHOOK_URL };
}


// ============================================================
// OPTION 2: Example HTML with inline script
// ============================================================

const EXAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Contact Form</title>
  <style>
    .contact-form {
      max-width: 500px;
      margin: 2rem auto;
      padding: 2rem;
      font-family: system-ui, sans-serif;
    }
    .contact-form input,
    .contact-form textarea {
      width: 100%;
      padding: 0.75rem;
      margin-bottom: 1rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    .contact-form button {
      background: #2563eb;
      color: white;
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
    }
    .contact-form button:hover {
      background: #1d4ed8;
    }
    .form-success {
      text-align: center;
      padding: 2rem;
      color: #059669;
    }
  </style>
</head>
<body>

<form id="contact-form" class="contact-form" data-ghl-form data-ghl-source="Website Contact">
  <h2>Get in Touch</h2>

  <input type="text" name="firstName" placeholder="First Name" required>
  <input type="text" name="lastName" placeholder="Last Name">
  <input type="email" name="email" placeholder="Email Address" required>
  <input type="tel" name="phone" placeholder="Phone Number">
  <textarea name="message" rows="4" placeholder="Your Message"></textarea>

  <button type="submit">Send Message</button>
</form>

<script>
// Inline version - no external script needed
(function() {
  const GHL_WEBHOOK = 'https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554';

  document.getElementById('contact-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const form = this;
    const data = Object.fromEntries(new FormData(form).entries());

    const payload = {
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone || '',
      source: form.dataset.ghlSource || 'Website Form',
      tags: ['Website Lead', 'Form Submission'],
      formName: 'Contact Form',
      formPage: window.location.href,
      message: data.message || '',
      importedAt: new Date().toISOString(),
      importSource: 'website-form'
    };

    try {
      await fetch(GHL_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors'
      });

      form.innerHTML = '<div class="form-success"><h3>Thank you!</h3><p>We\\'ll be in touch soon.</p></div>';
    } catch (err) {
      alert('Error submitting form. Please try again.');
    }
  });
})();
</script>

</body>
</html>
`;

console.log('Example HTML form saved. Copy the HTML above to use in your website.');
