'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

const WELCOME =
  'Hey! Ready to get your gas money back?\n\nYour checklist:\n1. Connect wallet\n2. Post proof on X\n3. Submit at /submit\n4. Wait for AI review (~2 min)\n5. SOL in wallet\n\nWhat step are you on, or do you have a question?';

export function ChatAgent({
  autoOpen = false,
  align = 'right',
  wallet,
}: {
  autoOpen?: boolean;
  align?: 'left' | 'right';
  wallet?: string;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: wallet ? { wallet } : {},
    }),
    messages: [
      { id: 'welcome', role: 'assistant', parts: [{ type: 'text', text: WELCOME }] },
    ],
  });

  const busy = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <>
      <button
        className={`chat-agent-fab chat-agent-fab--${align}`}
        onClick={() => setOpen((o) => !o)}
        aria-label="Refund assistant"
      >
        {open ? '✕' : '?'}
      </button>

      {open && (
        <div className={`chat-agent-panel chat-agent-panel--${align}`}>
          <div className="chat-agent-header">
            <span className="chat-agent-title">REFUND ASSISTANT</span>
            <button className="chat-agent-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-agent-messages">
            {messages.map((m) => {
              const text = m.parts
                .filter((p) => p.type === 'text')
                .map((p) => (p as { type: 'text'; text: string }).text)
                .join('');
              return (
                <div key={m.id} className={`chat-msg chat-msg--${m.role}`}>
                  {text}
                </div>
              );
            })}
            {busy && (
              <div className="chat-msg chat-msg--assistant chat-msg--loading">…</div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="chat-agent-form">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything or type 'what's next'"
              className="chat-agent-input"
              disabled={busy}
            />
            <button type="submit" disabled={busy} className="chat-agent-send">
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
