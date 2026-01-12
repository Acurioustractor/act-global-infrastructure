/**
 * GHL Contact Form Component
 *
 * Drop-in React/Next.js component for creating GHL contacts from website forms.
 * Uses the same GHL Inbound Webhook as Gmail and Calendar integrations.
 *
 * Usage:
 *   import { GHLContactForm } from '@/components/GHLContactForm';
 *
 *   <GHLContactForm
 *     source="Empathy Ledger Website"
 *     tags={['Website Lead', 'Empathy Ledger']}
 *     onSuccess={() => router.push('/thank-you')}
 *   />
 */

'use client';

import { useState, FormEvent } from 'react';

const GHL_WEBHOOK_URL =
  'https://services.leadconnectorhq.com/hooks/agzsSZWgovjwgpcoASWG/webhook-trigger/544336e8-172c-4516-a1dd-30a8d1df6554';

interface GHLContactFormProps {
  source?: string;
  tags?: string[];
  webhookUrl?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  showMessage?: boolean;
  submitText?: string;
  successMessage?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export function GHLContactForm({
  source = 'Website Form',
  tags = ['Website Lead', 'Form Submission'],
  webhookUrl = GHL_WEBHOOK_URL,
  onSuccess,
  onError,
  className = '',
  showMessage = true,
  submitText = 'Submit',
  successMessage = "Thank you! We'll be in touch soon.",
}: GHLContactFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    const payload = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      source,
      tags,
      formPage: typeof window !== 'undefined' ? window.location.href : '',
      message: formData.message || undefined,
      importedAt: new Date().toISOString(),
      importSource: 'website-form-react',
    };

    try {
      // Using no-cors because GHL webhook may not return CORS headers
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });

      // With no-cors, we can't read the response, so assume success
      setStatus('success');
      onSuccess?.();
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('error');
      onError?.(error as Error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (status === 'success') {
    return (
      <div className={`ghl-form-success ${className}`}>
        <p>{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`ghl-contact-form ${className}`}>
      <div className="form-row">
        <input
          type="text"
          name="firstName"
          placeholder="First Name"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="lastName"
          placeholder="Last Name"
          value={formData.lastName}
          onChange={handleChange}
        />
      </div>

      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleChange}
        required
      />

      <input
        type="tel"
        name="phone"
        placeholder="Phone Number (optional)"
        value={formData.phone}
        onChange={handleChange}
      />

      {showMessage && (
        <textarea
          name="message"
          placeholder="Your Message (optional)"
          value={formData.message}
          onChange={handleChange}
          rows={4}
        />
      )}

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending...' : submitText}
      </button>

      {status === 'error' && (
        <p className="form-error">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}

/**
 * Minimal styled version with Tailwind
 */
export function GHLContactFormStyled(props: GHLContactFormProps) {
  return (
    <GHLContactForm
      {...props}
      className={`
        max-w-md mx-auto p-6
        [&_input]:w-full [&_input]:p-3 [&_input]:mb-3 [&_input]:border [&_input]:border-gray-300 [&_input]:rounded
        [&_textarea]:w-full [&_textarea]:p-3 [&_textarea]:mb-3 [&_textarea]:border [&_textarea]:border-gray-300 [&_textarea]:rounded
        [&_button]:w-full [&_button]:p-3 [&_button]:bg-blue-600 [&_button]:text-white [&_button]:rounded [&_button]:hover:bg-blue-700 [&_button]:disabled:opacity-50
        [&_.form-row]:flex [&_.form-row]:gap-3
        [&_.form-error]:text-red-600 [&_.form-error]:text-sm [&_.form-error]:mt-2
        [&_.ghl-form-success]:text-green-600 [&_.ghl-form-success]:text-center [&_.ghl-form-success]:p-8
        ${props.className || ''}
      `}
    />
  );
}

export default GHLContactForm;
