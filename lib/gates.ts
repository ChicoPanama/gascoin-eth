export interface GateDefinition {
  id: number;
  slug: string;
  name: string;
  category: 'tweet' | 'receipt' | 'wallet' | 'treasury';
  description: string;
  what_we_check: string;
  common_failures: string[];
  how_to_pass: string;
  estimated_time_seconds: number;
  is_blocking: boolean;
  checklist_label: string;
}

export const GATES: GateDefinition[] = [
  {
    id: 1, slug: 'tweet-detected', name: 'Tweet Detected', category: 'tweet',
    description: 'We verify that the submitted URL resolves to a real, accessible tweet on X.',
    what_we_check: 'The tweet URL format is valid, the tweet exists, and the account is not suspended.',
    common_failures: [
      'URL pasted incorrectly — missing characters at the end',
      'Tweet was deleted after submission',
      'Account was suspended after posting',
    ],
    how_to_pass: 'Copy the tweet URL directly from the X share button. Do not manually type the URL. Verify the tweet is still live before submitting.',
    estimated_time_seconds: 8, is_blocking: true,
    checklist_label: 'My tweet URL is valid and the tweet still exists',
  },
  {
    id: 2, slug: 'tweet-public', name: 'Tweet Public', category: 'tweet',
    description: 'The tweet and the account posting it must be fully public at time of verification.',
    what_we_check: 'Account privacy setting is public. Tweet is not limited in visibility. Account is not in read-only mode.',
    common_failures: [
      'Account set to private after posting',
      'Tweet visibility limited to followers only',
      'Account in temporary read-only state',
    ],
    how_to_pass: 'Ensure your X account is set to public before posting and remains public until your refund is issued.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'My X account is set to public',
  },
  {
    id: 3, slug: 'hashtag-verified', name: '#gascoin Hashtag', category: 'tweet',
    description: 'The tweet body must contain the exact hashtag #gascoin in any position.',
    what_we_check: 'Case-insensitive search for #gascoin in tweet text. Hashtag must be standalone — not embedded in a URL or another word.',
    common_failures: [
      'Hashtag spelled incorrectly — #gasCoin, #gas_coin',
      'Hashtag embedded in a URL',
      '#gascoin in a reply, not in the original post',
    ],
    how_to_pass: 'Type #gascoin exactly, with the # symbol, as a standalone word in your tweet. Any capitalization works.',
    estimated_time_seconds: 3, is_blocking: true,
    checklist_label: 'My tweet contains the exact hashtag #gascoin',
  },
  {
    id: 4, slug: 'tweet-age', name: 'Tweet Age', category: 'tweet',
    description: 'Tweet must have been posted within 48 hours before the time of submission.',
    what_we_check: 'Tweet timestamp from X API compared against submission timestamp. Difference must be less than 172,800 seconds.',
    common_failures: [
      'Tweet posted more than 48 hours before submission',
      'Reusing a tweet from a previous submission attempt',
      'Time zone confusion causing late submission',
    ],
    how_to_pass: 'Post your #gascoin tweet and submit your receipt within the same session. The clock starts when you post.',
    estimated_time_seconds: 3, is_blocking: true,
    checklist_label: 'My tweet was posted within the last 48 hours',
  },
  {
    id: 5, slug: 'wallet-on-receipt', name: 'Wallet on Receipt', category: 'receipt',
    description: 'The last 4 characters of your Solana wallet address must be written on the gas receipt in the photo.',
    what_we_check: 'OCR scan of receipt image searches for the last 4 characters of your connected wallet address. The extracted characters are compared against your wallet.',
    common_failures: [
      'Characters written too small to read clearly in photo',
      'Characters written in pencil or light ink — low contrast',
      'Photo taken at an angle that distorts the text',
      'Characters written on separate paper, not on the receipt',
      'Wrong characters — do not match connected wallet',
    ],
    how_to_pass: 'Write the last 4 characters of your wallet address clearly in black pen directly on the receipt. Write large enough to be readable.',
    estimated_time_seconds: 45, is_blocking: true,
    checklist_label: 'The last 4 characters of my wallet are written on the receipt',
  },
  {
    id: 6, slug: 'receipt-legible', name: 'Receipt Legible', category: 'receipt',
    description: 'The receipt image must be clear enough for automated reading of key fields.',
    what_we_check: 'Image resolution minimum 800x600px. Receipt text is not blurred. Key fields (total, date) are detectable. File is not corrupted.',
    common_failures: [
      'Photo taken in low light — dark, grainy image',
      'Receipt crumpled or folded obscuring key fields',
      'Camera too far from receipt — text not readable',
      'HEIC file from iPhone not converted properly',
    ],
    how_to_pass: 'Photograph the receipt flat on a bright surface in good lighting. Fill the frame with the receipt. Make sure total and date are clearly visible.',
    estimated_time_seconds: 30, is_blocking: true,
    checklist_label: 'My receipt photo is clear, well-lit, and unblurred',
  },
  {
    id: 7, slug: 'receipt-date', name: 'Receipt Date Valid', category: 'receipt',
    description: 'The gas purchase must have occurred within 7 days before the submission date.',
    what_we_check: 'OCR-extracted receipt date compared against submission timestamp. Delta must be 7 days or less. Future-dated receipts automatically fail.',
    common_failures: [
      'Receipt older than 7 days',
      'Receipt date field missing or illegible',
      'Date format unrecognized — ambiguous MM/DD vs DD/MM',
      'Receipt from a previous submission reused',
    ],
    how_to_pass: 'Use a receipt from a gas purchase made within the last 7 days. Ensure the date is clearly printed and unobscured.',
    estimated_time_seconds: 15, is_blocking: true,
    checklist_label: 'My gas purchase was made within the last 7 days',
  },
  {
    id: 8, slug: 'no-duplicate-wallet', name: 'No Duplicate Wallet', category: 'wallet',
    description: 'Each X account may only have one approved submission per 7-day rolling window.',
    what_we_check: 'X account is checked against all active claims in the last 7 days. One submission per week per X account, regardless of wallet.',
    common_failures: [
      'Submitting again before the 7-day cooldown expires',
      'Trying a different wallet with the same X account',
      'Submitting while a previous claim is still processing',
    ],
    how_to_pass: 'Wait 7 days after your last submission before submitting again. Check your cooldown status before submitting.',
    estimated_time_seconds: 5, is_blocking: true,
    checklist_label: 'I have not submitted a claim in the last 7 days',
  },
  {
    id: 9, slug: 'no-duplicate-receipt', name: 'No Duplicate Receipt', category: 'receipt',
    description: 'The same gas receipt may never be submitted twice regardless of wallet address.',
    what_we_check: 'Perceptual image hash of uploaded receipt compared against all previously submitted receipts. High similarity score triggers failure.',
    common_failures: [
      'Submitting the same receipt after a previous failure',
      'Two people submitting photos of the same receipt',
      'Photo of a photo of a receipt',
    ],
    how_to_pass: 'Each submission requires a unique, original gas receipt. Never resubmit a receipt that was previously used.',
    estimated_time_seconds: 20, is_blocking: true,
    checklist_label: 'This specific receipt has never been submitted before',
  },
  {
    id: 10, slug: 'treasury-solvent', name: 'Treasury Solvent', category: 'treasury',
    description: 'The GASCOIN treasury must hold sufficient SOL to cover the refund amount at time of payout.',
    what_we_check: 'Live on-chain balance of treasury wallet via Solana RPC. Compared against refund amount plus estimated transaction fee.',
    common_failures: [
      'Treasury balance temporarily low — submission queued until replenished',
      'Large batch of refunds being processed simultaneously',
    ],
    how_to_pass: 'This gate is outside your control. If it fails, your submission enters a priority queue and is retried automatically when treasury is replenished.',
    estimated_time_seconds: 10, is_blocking: false,
    checklist_label: 'I understand Gate 10 is treasury-dependent and outside my control',
  },
];

export const GATE_CATEGORIES = {
  tweet: { label: 'Tweet Verification', count: 4 },
  receipt: { label: 'Receipt Verification', count: 4 },
  wallet: { label: 'Wallet Verification', count: 1 },
  treasury: { label: 'Treasury Check', count: 1 },
} as const;
