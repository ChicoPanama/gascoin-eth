'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
import { useState, useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatPageHint = 'welcome' | 'submit' | 'wallet' | 'gates' | 'docs';

export interface ChatClaimContext {
  status: string;
  failedGates?: string[];
  streakCount?: number;
  cooldownHoursLeft?: number;
}

export interface ChatUserProfile {
  walletShort: string;
  tier: string | null;
  totalClaims: number;
  streakCount: number;
  lastClaimStatus: string | null;
  cooldownHoursLeft: number;
  isNewUser: boolean;
}

// ---------------------------------------------------------------------------
// Opening message — contextual, based on page + wallet state
// ---------------------------------------------------------------------------

const DEFAULT_WELCOME =
  'Hey! Ready to get your gas money back?\n\nYour checklist:\n1. Connect wallet\n2. Post proof on X\n3. Submit at /submit\n4. Wait for AI review (~5–30 min)\n5. SOL in wallet\n\nWhat step are you on, or do you have a question?';

function buildOpeningMessage(
  pageHint?: ChatPageHint,
  claimCtx?: ChatClaimContext,
  profile?: ChatUserProfile | null,
): string {
  // Page-specific overrides first
  if (pageHint === 'submit') {
    return 'Ready to submit? I can:\n• Check if your tweet URL passes gates\n• Confirm what to write on your receipt\n• Walk through any step\n\nWhat do you need?';
  }
  if (pageHint === 'gates') {
    return "Looking at the gates? I can explain any of them or help you figure out why a specific gate failed.\n\nJust ask — or paste your tweet URL and I'll check it for you.";
  }
  if (pageHint === 'docs') {
    return "Have a question about the docs? I can explain anything on this page or walk you through specific steps.\n\nWhat would you like to know?";
  }

  // Wallet-page context (claim status)
  if (pageHint === 'wallet' && claimCtx) {
    if (claimCtx.status === 'rejected' && claimCtx.failedGates?.length) {
      return `I see your recent claim was rejected — ${claimCtx.failedGates.join(', ')} failed.\n\nWant me to walk you through fixing it? Or ask me anything.`;
    }
    if (claimCtx.status === 'pending' || claimCtx.status === 'processing') {
      return "Your claim is processing — I can explain what's happening at each gate or answer any questions while you wait.";
    }
  }

  // Personalized welcome for returning authenticated users
  if (profile && !profile.isNewUser) {
    const parts: string[] = [];
    parts.push(`Welcome back${profile.walletShort ? ` (${profile.walletShort})` : ''}!`);

    if (profile.tier) {
      parts.push(`${profile.tier} tier · ${profile.totalClaims} approved claim${profile.totalClaims !== 1 ? 's' : ''}`);
    }
    if (profile.streakCount >= 2) {
      parts.push(`${profile.streakCount}-claim streak`);
    }
    if (profile.cooldownHoursLeft > 0) {
      parts.push(`Cooldown: ${profile.cooldownHoursLeft}h left`);
    } else if (profile.lastClaimStatus) {
      parts.push('Cooldown clear — ready to submit');
    }
    if (profile.lastClaimStatus === 'rejected') {
      parts.push('\nYour last claim was rejected — want me to help fix it?');
    }
    parts.push('\nWhat can I help with?');
    return parts.join(' · ').replace(' · \n', '\n');
  }

  return DEFAULT_WELCOME;
}

// ---------------------------------------------------------------------------
// Tool result card renderers
// ---------------------------------------------------------------------------

interface GateRow {
  passed: boolean;
  label: string;
  fix?: string | null;
}

function TweetValidationCard({ result }: { result: Record<string, unknown> }) {
  if (result.error) {
    return (
      <div className="chat-card chat-card--error">
        <span className="chat-card-icon">⚠</span>
        <p>{result.error as string}</p>
      </div>
    );
  }
  if (!result.found) {
    return (
      <div className="chat-card chat-card--error">
        <span className="chat-card-icon">✕</span>
        <p>Tweet not found — check that your account is public and the tweet still exists.</p>
      </div>
    );
  }

  const gates = result.gates as Record<string, GateRow> | undefined;
  if (!gates) return null;

  return (
    <div className="chat-card chat-card--tweet">
      <div className="chat-card-header">Tweet Check</div>
      {Object.values(gates).map((g, i) => (
        <div key={i} className={`chat-card-gate chat-card-gate--${g.passed ? 'pass' : 'fail'}`}>
          <span className="chat-card-gate-icon">{g.passed ? '✓' : '✕'}</span>
          <div>
            <span className="chat-card-gate-label">{g.label}</span>
            {!g.passed && g.fix && <p className="chat-card-gate-fix">{g.fix}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CooldownCard({ result }: { result: Record<string, unknown> }) {
  if (result.error) {
    return (
      <div className="chat-card chat-card--info">
        <p>{result.error as string}</p>
      </div>
    );
  }
  const canSubmit = result.canSubmitNow as boolean;
  return (
    <div className={`chat-card chat-card--cooldown chat-card--${canSubmit ? 'pass' : 'wait'}`}>
      <div className="chat-card-header">Cooldown Status</div>
      <div className="chat-card-cooldown-status">
        <span className="chat-card-icon">{canSubmit ? '✓' : '⏳'}</span>
        <span>{result.message as string}</span>
      </div>
      {!canSubmit && (
        <p className="chat-card-sub">
          Tier: {result.tier as string} · {result.cooldownDays as number}d window
        </p>
      )}
    </div>
  );
}

function ClaimStatusCard({ result }: { result: Record<string, unknown> }) {
  if (result.error || result.noClaims) {
    return (
      <div className="chat-card chat-card--info">
        <p>{(result.error || 'No claims found for this wallet.') as string}</p>
      </div>
    );
  }
  const failedGates = (result.failedGates as Array<{ name: string; reason: string }>) || [];
  return (
    <div className="chat-card chat-card--claim">
      <div className="chat-card-header">
        Claim Status
        <span className={`chat-card-status-badge chat-card-status-badge--${(result.status as string).replace(/[_\s]/g, '-')}`}>
          {result.status as string}
        </span>
      </div>
      <p className="chat-card-sub">Submitted: {result.submittedAt as string}</p>
      {failedGates.length > 0 && (
        <div className="chat-card-failed-gates">
          {failedGates.map((g, i) => (
            <div key={i} className="chat-card-gate chat-card-gate--fail">
              <span className="chat-card-gate-icon">✕</span>
              <div>
                <span className="chat-card-gate-label">{g.name}</span>
                <p className="chat-card-gate-fix">{g.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {failedGates.length === 0 && Boolean(result.allPassed) && (
        <p className="chat-card-all-pass">All gates passed ✓</p>
      )}
    </div>
  );
}

function TierCard({ result }: { result: Record<string, unknown> }) {
  if (result.error) {
    return <div className="chat-card chat-card--info"><p>{result.error as string}</p></div>;
  }
  return (
    <div className="chat-card chat-card--tier">
      <div className="chat-card-header">Token Tier</div>
      <div className="chat-card-tier-row">
        <span className="chat-card-tier-name">{result.tier as string}</span>
        <span className="chat-card-tier-balance">{Number(result.balance).toLocaleString()} $GASCOIN</span>
      </div>
      {Boolean(result.meetsMinimum) && (
        <p className="chat-card-sub">
          {result.submissionsPerWeek as number}× per week · {result.cooldownDays as number}d cooldown
        </p>
      )}
      {!result.meetsMinimum && (
        <p className="chat-card-gate-fix">Buy at least 1 $GASCOIN on Jupiter (jup.ag) to participate.</p>
      )}
      {Boolean(result.nextTierName) && (
        <p className="chat-card-sub">
          Next tier: {result.nextTierName as string} — need {Number(result.tokensToNextTier).toLocaleString()} more tokens
        </p>
      )}
    </div>
  );
}

function ToolResultCard({ toolName, result }: { toolName: string; result: unknown }) {
  const r = result as Record<string, unknown>;
  switch (toolName) {
    case 'validateTweet':   return <TweetValidationCard result={r} />;
    case 'checkCooldown':   return <CooldownCard result={r} />;
    case 'getClaimStatus':  return <ClaimStatusCard result={r} />;
    case 'checkTokenTier':  return <TierCard result={r} />;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Escalation detection
// ---------------------------------------------------------------------------

const FRUSTRATION_PATTERNS = [
  /not.{0,5}work|doesn.{0,5}t work|broken|still fail|same.{0,5}problem/i,
  /already.{0,10}tried|tried.{0,10}everything|give.{0,5}up/i,
  /human|real.{0,5}person|someone.{0,5}real|support|help.{0,5}me.{0,5}please/i,
  /this is (wrong|incorrect|not right)|you.{0,5}re wrong/i,
  /useless|terrible|awful|hate/i,
];

function detectFrustration(text: string): boolean {
  return FRUSTRATION_PATTERNS.some(p => p.test(text));
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatAgent({
  autoOpen = false,
  align = 'right',
  wallet,
  pageHint,
  claimContext,
  userProfile,
}: {
  autoOpen?: boolean;
  align?: 'left' | 'right';
  wallet?: string;
  pageHint?: ChatPageHint;
  claimContext?: ChatClaimContext;
  userProfile?: ChatUserProfile | null;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [showEscalation, setShowEscalation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const openingMessage = buildOpeningMessage(pageHint, claimContext, userProfile);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      body: wallet ? { wallet } : {},
    }),
    messages: [
      { id: 'welcome', role: 'assistant', parts: [{ type: 'text', text: openingMessage }] },
    ],
    onError: (err) => {
      console.error('[chat] client error', err);
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    },
  });

  const busy = status === 'streaming' || status === 'submitted';

  // Clear error when user sends a new message
  useEffect(() => {
    if (busy) setErrorMsg(null);
  }, [busy]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  // Escalation detection — check last user message
  useEffect(() => {
    const userMessages = messages.filter(m => (m.role as string) === 'user');
    if (userMessages.length < 2) return;
    const lastText = userMessages[userMessages.length - 1].parts
      ?.filter((p: { type: string }) => p.type === 'text')
      .map((p: { type: string; text?: string }) => p.text ?? '')
      .join('') ?? '';
    if (detectFrustration(lastText)) {
      setShowEscalation(true);
    }
  }, [messages]);

  // File attachment handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setAttachedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
  };

  const clearFile = () => {
    setAttachedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim() || (attachedFile ? 'Please check my receipt photo.' : '');
    if (!text || busy) return;

    const msgOptions: Parameters<typeof sendMessage>[0] = { text };
    if (attachedFile) {
      (msgOptions as Record<string, unknown>).experimental_attachments = [
        { name: attachedFile.name, contentType: attachedFile.type, url: filePreviewUrl! },
      ];
    }

    sendMessage(msgOptions);
    setInput('');
    clearFile();
  };

  // Build escalation DM URL
  const escalationUrl = (() => {
    const base = 'https://x.com/messages/compose?recipient_id=GasCoinApp';
    const ctx = wallet ? `\nWallet: ${wallet.slice(0, 4)}...${wallet.slice(-4)}` : '';
    const text = encodeURIComponent(`Hi, I need support with my GASCOIN claim.${ctx}`);
    return `${base}&text=${text}`;
  })();

  return (
    <>
      <button
        className={`chat-agent-fab chat-agent-fab--${align}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Gas Attendant"
      >
        {open ? '✕' : '?'}
      </button>

      {open && (
        <div className={`chat-agent-panel chat-agent-panel--${align}`}>
          <div className="chat-agent-header">
            <span className="chat-agent-title">GAS ATTENDANT</span>
            <button className="chat-agent-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-agent-messages">
            {messages.map((m) => {
              // Render each part separately (text + tool invocations)
              const parts = (m.parts ?? []) as Array<Record<string, unknown>>;

              return (
                <div key={m.id}>
                  {parts.map((part, idx) => {
                    if (part.type === 'text') {
                      const text = (part.text as string) || '';
                      if (!text) return null;
                      return (
                        <div key={idx} className={`chat-msg chat-msg--${m.role}`}>
                          {text}
                        </div>
                      );
                    }

                    // AI SDK v6: tool parts are 'dynamic-tool' type; use isToolUIPart + getToolName
                    if (isToolUIPart(part as Parameters<typeof isToolUIPart>[0])) {
                      const toolPart = part as Record<string, unknown>;
                      const name = getToolName(part as Parameters<typeof getToolName>[0]);
                      const state = toolPart.state as string;

                      if (state !== 'output-available') {
                        return (
                          <div key={idx} className="chat-tool-loading">
                            <span className="chat-tool-spinner" />
                            {name === 'validateTweet'  && 'Checking tweet…'}
                            {name === 'checkCooldown'  && 'Checking cooldown…'}
                            {name === 'getClaimStatus' && 'Loading claim status…'}
                            {name === 'checkTokenTier' && 'Fetching token balance…'}
                            {!['validateTweet','checkCooldown','getClaimStatus','checkTokenTier'].includes(name) && 'Looking that up…'}
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="chat-tool-result">
                          <ToolResultCard toolName={name} result={toolPart.output} />
                        </div>
                      );
                    }
                    // Surface error parts so the user sees something instead of blank
                    if (part.type === 'error') {
                      return (
                        <div key={idx} className="chat-msg chat-msg--error">
                          {(part.errorText as string) || 'Something went wrong. Please try again.'}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            })}

            {busy && (
              <div className="chat-msg chat-msg--assistant chat-msg--loading">…</div>
            )}

            {errorMsg && !busy && (
              <div className="chat-msg chat-msg--error">{errorMsg}</div>
            )}

            {showEscalation && !busy && (
              <div className="chat-escalate">
                <p className="chat-escalate-text">Need to reach a human?</p>
                <a
                  href={escalationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chat-escalate-btn"
                  onClick={() => setShowEscalation(false)}
                >
                  DM @GasCoinApp on X →
                </a>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* File preview strip */}
          {filePreviewUrl && (
            <div className="chat-file-preview">
              <img src={filePreviewUrl} alt="Receipt preview" className="chat-file-thumb" />
              <span className="chat-file-name">{attachedFile?.name}</span>
              <button className="chat-file-remove" onClick={clearFile} aria-label="Remove">✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="chat-agent-form">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
            {/* Attach button */}
            <button
              type="button"
              className="chat-agent-attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              aria-label="Attach receipt photo"
              title="Attach receipt photo for review"
            >
              📎
            </button>

            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={attachedFile ? 'Add a note or just hit send…' : "Ask anything or paste your tweet URL"}
              className="chat-agent-input"
              disabled={busy}
            />
            <button type="submit" disabled={busy || (!input.trim() && !attachedFile)} className="chat-agent-send">
              →
            </button>
          </form>
        </div>
      )}
    </>
  );
}
