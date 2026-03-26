"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type SupportWidgetProps = {
  defaultEmail: string;
};

type SupportResponse = {
  ok: boolean;
  id?: string;
  error?: string;
};

function isValidEmail(email: string): boolean {
  return /^\S+@\S+\.\S+$/.test(email);
}

export default function SupportWidget({ defaultEmail }: SupportWidgetProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setEmail((current) => (current.trim() ? current : defaultEmail));
  }, [defaultEmail]);

  const canSend = useMemo(
    () => !submitting && email.trim().length > 0 && message.trim().length > 0,
    [email, message, submitting],
  );

  const resetFeedback = () => {
    setEmailError(null);
    setMessageError(null);
    setSubmitError(null);
    setSuccessMessage(null);
    setRequestId(null);
  };

  const closeModal = () => {
    setOpen(false);
    setSubmitting(false);
    resetFeedback();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetFeedback();

    const nextEmail = email.trim();
    const nextMessage = message.trim();
    let valid = true;

    if (!nextEmail) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!isValidEmail(nextEmail)) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }

    if (!nextMessage) {
      setMessageError("Message is required.");
      valid = false;
    } else if (nextMessage.length < 10) {
      setMessageError("Message should be at least 10 characters.");
      valid = false;
    }

    if (!valid) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: nextEmail,
          message: nextMessage,
        }),
      });

      const payload = (await response.json()) as SupportResponse;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to send support request.");
      }

      setSuccessMessage("Support request sent. We’ll get back to you soon.");
      setRequestId(payload.id ?? null);
      setMessage("");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to send support request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="support-fab"
        aria-label="Open support"
        title="Support"
        onClick={() => {
          resetFeedback();
          setOpen(true);
        }}
      >
        <span className="support-fab-icon" aria-hidden="true">
          <svg
            viewBox="0 0 20 20"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 16.6c3.9 0 7-2.8 7-6.2S13.9 4.2 10 4.2 3 7 3 10.4c0 1.4.5 2.6 1.5 3.6l-.3 2 2.3-.6c1 .6 2.1 1.2 3.5 1.2Z" />
            <path d="M7.4 9.2h5.2" />
            <path d="M7.4 11.5h3.6" />
          </svg>
        </span>
        <span className="support-fab-label">Support</span>
      </button>

      {open ? (
        <div
          className="support-modal-backdrop"
          role="presentation"
          onClick={closeModal}
        >
          <section
            className="support-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="support-modal-head">
              <div>
                <p className="support-modal-kicker">Need a hand?</p>
                <h2 id="support-modal-title">Contact Motion support</h2>
                <p className="support-modal-copy">
                  Send us a quick note and we&apos;ll store it for follow-up.
                </p>
              </div>
              <button
                type="button"
                className="support-modal-close"
                onClick={closeModal}
                aria-label="Close support modal"
              >
                ×
              </button>
            </div>

            {successMessage ? (
              <div className="support-success-card">
                <div className="support-success-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 20 20"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 10.5 3 3 7-7" />
                  </svg>
                </div>
                <div>
                  <p className="support-success-title">Request sent</p>
                  <p className="support-success-copy">{successMessage}</p>
                  {requestId ? (
                    <p className="support-success-meta">Reference: {requestId}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="support-modal-primary"
                  onClick={closeModal}
                >
                  Done
                </button>
              </div>
            ) : (
              <form className="support-form" onSubmit={handleSubmit} noValidate>
                <div className="support-field">
                  <label htmlFor="support-email">Email</label>
                  <input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className={emailError ? "is-invalid" : undefined}
                    autoComplete="email"
                  />
                  {emailError ? <p className="support-field-error">{emailError}</p> : null}
                </div>

                <div className="support-field">
                  <label htmlFor="support-message">Message</label>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Tell us what’s going wrong or what you need help with."
                    className={messageError ? "is-invalid" : undefined}
                    rows={6}
                  />
                  {messageError ? (
                    <p className="support-field-error">{messageError}</p>
                  ) : (
                    <p className="support-field-help">Minimum 10 characters.</p>
                  )}
                </div>

                {submitError ? <p className="support-submit-error">{submitError}</p> : null}

                <div className="support-actions">
                  <button
                    type="button"
                    className="support-modal-secondary"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="support-modal-primary"
                    disabled={!canSend}
                  >
                    {submitting ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}
