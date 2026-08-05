'use client';

import { useState } from 'react';
import { ChevronDown, Mail, MessageCircleQuestion } from 'lucide-react';
import Link from 'next/link';
import { AccountCard } from './AccountCard';
import { AccountButton } from './AccountButton';

const FAQS = [
  {
    question: 'How do I track my order?',
    answer: 'Go to Orders in your account sidebar — each order shows a live status timeline from Placed through Delivered.',
  },
  {
    question: 'How do I request a return or replacement?',
    answer: 'Open Orders, expand a delivered order within its return window, and use the Return / Replace button on the item. Track its progress under Returns & Refunds.',
  },
  {
    question: 'How do delivery slots work?',
    answer: 'You pick a delivery window at checkout. Slots have limited capacity per day and close out as they fill up.',
  },
  {
    question: 'How do I use a referral code?',
    answer: 'Enter it at signup, or apply it from the link a friend shares with you. Your own code and referral history are under Coupons & Rewards.',
  },
  {
    question: 'How do I delete my account?',
    answer: 'Go to Security and use the Delete Account section at the bottom. This is permanent and cannot be undone.',
  },
];

export function HelpSupportDetails() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>
      <AccountCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <Mail size={20} color="var(--accent)" />
          <div>
            <p style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>Still need help?</p>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Our support team typically replies within a day.</p>
          </div>
        </div>
        <Link href="/contact" style={{ textDecoration: 'none' }}>
          <AccountButton variant="primary">Contact Us</AccountButton>
        </Link>
      </AccountCard>

      <section>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: 'var(--acc-text-section-title-size, 1.05rem)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <MessageCircleQuestion size={17} /> Frequently Asked Questions
        </h2>
        <div style={{ border: 'var(--acc-card-border, 1px solid var(--border-color))', borderRadius: 'var(--acc-card-radius, var(--radius-sm))', overflow: 'hidden' }}>
          {FAQS.map((faq, index) => {
            const open = openIndex === index;
            return (
              <div key={faq.question} style={{ borderBottom: index < FAQS.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : index)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
                    padding: '0.95rem 1.1rem', background: 'transparent', border: 'none', cursor: 'pointer',
                    fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left',
                  }}
                >
                  {faq.question}
                  <ChevronDown size={16} style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--acc-transition-fast, 150ms ease-out)' }} />
                </button>
                {open && (
                  <p style={{ margin: 0, padding: '0 1.1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
