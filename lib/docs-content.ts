export interface DocSection {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  description: string;
  content: string;
  order: number;
  navHidden?: boolean;
}

export interface DocCategory {
  slug: string;
  label: string;
  sections: DocSection[];
}

export const DOC_CATEGORIES: DocCategory[] = [
  {
    slug: "overview",
    label: "Overview",
    sections: [
      {
        slug: "what-is-gascoin",
        title: "What Is GASCOIN",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<div style="border:1px solid rgba(255,255,255,0.15);padding:16px 20px;margin-bottom:24px;background:rgba(255,255,255,0.03)">
<p><strong>Document status</strong></p>
<p>This doc set describes intended platform behavior. If docs and production differ, production behavior is authoritative.</p>
<p>Last updated: April 2026 · Platform version: 1.0</p>
</div>
<div style="border:1px solid rgba(110,168,254,0.35);padding:14px 18px;margin-bottom:24px;background:rgba(28,47,79,0.32)">
<p><strong>Choose your path</strong></p>
<p><a href="/docs/core-concept-in-plain-english">New to GASCOIN → Plain-English flow</a></p>
<p><a href="/docs/end-to-end-architecture-map">Technical reader → End-to-end architecture map</a></p>
</div>
<p>GASCOIN is a Solana protocol that refunds verified real-world fuel purchases in SOL.</p>
<p>Submission eligibility is determined by a 10-gate verification pipeline plus policy checks. Payout amount follows the user tier policy at review time.</p>
<h3>Participation baseline</h3>
<ul>
<li>Public X account (minimum follower policy applies)</li>
<li>Physical gas receipt within policy window</li>
<li>Solana wallet connected at submission</li>
<li>Receipt annotated with wallet characters as required</li>
</ul>
<p>There is no fixed USD refund schedule in docs because SOL market price changes continuously.</p>`,
        order: 1,
      },
      {
        slug: "core-concept-in-plain-english",
        title: "Core Concept in Plain English",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<ul>
<li>You fill up your gas tank at any gas station.</li>
<li>Before or after filling up, you write the last 4 characters of your Solana wallet address on the receipt in pen.</li>
<li>You post a tweet on X (formerly Twitter) containing the hashtag #gascoin.</li>
<li>You visit gascoin.com and click Submit.</li>
<li>You connect your Solana wallet, paste your tweet URL, and upload a photo of your receipt.</li>
<li>The system automatically runs 10 verification checks on your submission.</li>
<li>If all 10 checks pass, SOL is sent directly to your wallet within 24-48 hours.</li>
</ul>`,
        order: 2,
      },
      {
        slug: "what-you-receive",
        title: "What You Receive",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<h3>Understanding refund value</h3>
<p>Refunds are paid in SOL, and SOL market price moves daily. GASCOIN therefore does not publish fixed USD equivalents in docs.</p>
<table><thead><tr><th>Tier</th><th>GASCOIN Required</th><th>Refund Policy</th><th>Submission Frequency</th></tr></thead>
<tbody><tr><td>Standard</td><td>1</td><td>Tier-based cap set at review time</td><td>1 / week</td></tr>
<tr><td>Commuter</td><td>100,000</td><td>Higher cap than Standard</td><td>1 / week</td></tr>
<tr><td>Road Warrior</td><td>5,000,000</td><td>Higher cap than Commuter</td><td>2 / week</td></tr>
<tr><td>Fleet</td><td>10,000,000</td><td>Highest cap</td><td>4 / week</td></tr></tbody></table>
<p>The admin sets the final refund amount at approval time within your tier limits. Your tier is snapshotted when you submit.</p>`,
        order: 3,
      },
      {
        slug: "what-you-need-before-starting",
        title: "What You Need Before Starting",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<ul>
<li><strong>Required: </strong>A Solana wallet — Phantom, Solflare, or Backpack (all free to install)</li>
<li><strong>Required: </strong>An X (Twitter) account set to public with at least 100 followers, a profile bio, and posting history</li>
<li><strong>Required: </strong>A physical gas receipt from a real gas station purchase within the last 7 days</li>
<li><strong>Required: </strong>A pen to write the last 4 characters of your wallet on the receipt</li>
<li><strong>Required: </strong>The receipt must be photographed clearly — well-lit, unblurred, full receipt visible</li>
<li><strong>Optional: </strong>GASCOIN tokens — only needed to access Commuter, Road Warrior, or Fleet tiers</li>
</ul>`,
        order: 4,
      },
    ],
  },
  {
    slug: "submitting",
    label: "Submitting",
    sections: [
      {
        slug: "the-submission-process-complete-step-by-step-guide",
        title: "Submission Process",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>Every claim moves through the same 5-step workflow. Treat this page as the operational checklist.</p>
<ol>
<li><strong>Connect wallet</strong> — establish payout destination and tier context.</li>
<li><strong>Verify tweet</strong> — confirm social proof and timing.</li>
<li><strong>Upload receipt</strong> — provide a legible physical receipt with required annotations.</li>
<li><strong>Review and submit</strong> — confirm data before finalizing.</li>
<li><strong>Monitor gate progress</strong> — track pass/fail outcomes and queue state.</li>
</ol>
<p>Primary rule: each attempt requires a fresh, valid receipt and compliant tweet context.</p>
<p>Open the flow at <a href="/submit">/submit</a>.</p>`,
        order: 5,
      },
      {
        slug: "step-1-connect-your-wallet",
        title: "Step 1 — Connect Your Wallet",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>The first step is connecting your Solana wallet. This tells the system which wallet address to send your SOL refund to and which address to check for GASCOIN token balance.</p>
<h3><strong>How to connect your wallet</strong></h3>
<ul>
<li>Click the Connect Wallet button on Step 1.</li>
<li>A wallet selection modal appears showing three options: Phantom, Solflare, and Backpack.</li>
<li>Click the wallet you have installed. Your browser will open a popup from that wallet extension.</li>
<li>Approve the connection in the wallet popup. You are not authorizing any transaction — just a read-only connection.</li>
<li>Once connected, your wallet address appears in truncated form (e.g., GAs...xK92) and Step 1 is marked complete.</li>
<li>The system automatically checks your GASCOIN token balance and displays your tier (Standard, Commuter, Road Warrior, or Fleet).</li>
</ul>
<h3><strong>What happens if your wallet is not installed</strong></h3>
<p>If you click Phantom but do not have Phantom installed, your browser will redirect to the Phantom website where you can install it as a browser extension. After installing, return to the GASCOIN submit page and connect. The same applies to Solflare and Backpack.</p>
<h3><strong>Important notes about wallet connection</strong></h3>
<ul>
<li>You cannot proceed past Step 1 without connecting a wallet.</li>
<li>Only one wallet can be connected at a time.</li>
<li>The wallet you connect is the wallet that receives your SOL refund. Make sure it is the correct wallet.</li>
<li>Submission frequency depends on your tier: Standard and Commuter can submit once per week, Road Warrior twice per week, and Fleet four times per week. If you have an active or recently approved submission, you must wait until the cooldown expires.</li>
<li>The system checks for a pending submission from your wallet. If one already exists, you will see a message indicating this and cannot submit a duplicate.</li>
</ul>`,
        order: 6,
      },
      {
        slug: "step-2-verify-your-tweet",
        title: "Step 2 — Verify Your Tweet",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>Step 2 requires you to post a tweet on X (Twitter) containing the hashtag #gascoin and paste the URL of that tweet into the submission portal. The system automatically checks the tweet against 4 verification criteria.</p>
<h3><strong>How to post your tweet</strong></h3>
<ul>
<li>Open X (Twitter) in a new tab.</li>
<li>Make sure your account is set to public. Private accounts cannot be verified.</li>
<li>Compose a new tweet. The tweet must contain the text #gascoin anywhere in the body. Any other content is acceptable.</li>
<li>Post the tweet.</li>
<li>Click the Share button on your tweet and copy the tweet URL. The URL format is: https://x.com/yourhandle/status/1234567890123456789</li>
<li>Return to the GASCOIN submit page and paste this URL into the tweet URL input field.</li>
</ul>
<h3><strong>What the system checks automatically</strong></h3>
<p>After you paste the tweet URL and wait approximately 2-8 seconds, the system runs 4 checks automatically:</p>
<h3><strong>What you see after verification</strong></h3>
<p>If all 4 tweet checks pass, a preview card appears below the input showing your handle, how long ago the tweet was posted, and confirmation that #gascoin was detected. Step 2 advances automatically.</p>
<p>If any check fails, a specific error message appears telling you exactly which check failed and why. You must fix the issue and paste the URL again. You do not need to start over from Step 1.</p>`,
        order: 7,
      },
      {
        slug: "step-3-upload-your-receipt",
        title: "Step 3 — Upload Your Receipt",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>Step 3 requires you to upload a photo of your gas receipt. This is the physical paper receipt from a real gas station. The receipt must have the last 4 characters of your Solana wallet address written on it in pen.</p>
<p>IMPORTANT: You must write the last 4 characters of your wallet address on the physical receipt BEFORE photographing it. They must be clearly legible in the photo. This is a required element — submissions without readable wallet characters on the receipt will fail Gate 5 and be rejected.</p>
<h3><strong>How to prepare your receipt</strong></h3>
<ul>
<li>Obtain the paper receipt from the gas station at the time of purchase, or retrieve a saved receipt from within the last 7 days.</li>
<li>Using a black pen, write the last 4 characters of your Solana wallet address clearly on the receipt. Write them large enough to be readable in a photograph. You can find your last 4 in your wallet app or on the GASCOIN submit page.</li>
<li>Place the receipt flat on a bright surface. Do not crumple, fold, or obscure any part of the receipt.</li>
<li>Photograph the receipt using your phone camera in good lighting. The entire receipt must be visible. The total amount, date, and your written wallet characters must all be clearly readable.</li>
<li>Transfer the photo to the device you are using to submit (if you took the photo on your phone and are submitting on desktop, AirDrop or email the photo to yourself).</li>
</ul>
<h3><strong>How to upload the receipt</strong></h3>
<ul>
<li>On Step 3, click the upload area or drag and drop your receipt photo onto it.</li>
<li>Accepted file formats: JPG, PNG, HEIC, PDF. Maximum file size: 10MB.</li>
<li>After uploading, a thumbnail preview of your receipt appears. Verify it is the correct file.</li>
<li>Below the upload area are 3 checkboxes you must manually check before proceeding. These are self-certification statements.</li>
</ul>
<h3><strong>The 3 required checkboxes</strong></h3>
<ul>
<li>My receipt shows the total amount clearly</li>
<li>The receipt date is visible</li>
<li>The last 4 characters of my wallet are written on the receipt</li>
</ul>
<p>All 3 checkboxes must be checked. The Next button remains disabled until all 3 are checked. This is by design — you are certifying that your upload meets the requirements before submitting.</p><h3>Physical receipts only</h3>
<p>GASCOIN requires a photograph of a physical paper receipt from the gas station. Digital receipts — including email receipts, in-app receipts, SMS receipts, and PDF receipts — cannot be accepted because the verification system requires you to write the last 4 characters of your wallet directly on the receipt in pen before photographing it.</p>
<p>If your gas station does not offer paper receipts, ask the attendant for a printed copy at the time of purchase.</p>
<h3>Receipt photography — do's and don'ts</h3>
<p>Gate 5 (Wallet on Receipt) is the most commonly failed gate. Follow these rules exactly:</p>
<p><strong>DO:</strong></p>
<ul>
<li>Write the last 4 characters on the BACK of the receipt if the front is too small</li>
<li>Use a black ballpoint pen — felt tip and pencil both fail OCR</li>
<li>Write each character at least 3-4mm tall</li>
<li>Lay the receipt flat on a white or light-coloured surface</li>
<li>Photograph from directly overhead — not at an angle</li>
<li>Use good overhead lighting — natural daylight works best</li>
<li>Zoom into your photo before uploading to verify every character is readable</li>
</ul>
<p><strong>DON'T:</strong></p>
<ul>
<li>Write in pencil, gel pen, or light-coloured ink</li>
<li>Photograph on a dark surface — poor contrast</li>
<li>Crumple, fold, or tear the receipt before photographing</li>
<li>Take the photo at an angle — keystoning distorts text</li>
<li>Use flash directly — causes glare on thermal receipt paper</li>
<li>Submit if ANY character is unclear — retake the photo</li>
</ul>
<h3>Your receipt image privacy</h3>
<p>Receipt photos are stored in the GASCOIN secure storage system. If your submission is approved, your receipt image may appear on the Community Feed with your gas station location (city and state/country only) and refund amount visible. The admin team reviews every approved receipt and redacts any sensitive information. You can prevent your receipt from appearing on the community feed by contacting the admin team after approval. Receipt images are never sold or shared with third parties.</p>
<p>→ See also: Gate 5 (Wallet on Receipt), Gate 6 (Receipt Legible)</p>`,
        order: 8,
      },
      {
        slug: "step-4-review-and-submit",
        title: "Step 4 — Review and Submit",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>Step 4 shows a complete summary of your submission before it is sent. Review every field carefully before clicking Submit. Once submitted, the information cannot be changed.</p>
<h3><strong>What the review screen shows</strong></h3>
<p>If any information appears incorrect at Step 4, use the Back button to return to the relevant step and correct it. Do not click Submit if anything is wrong.</p>
<h3><strong>Clicking Submit</strong></h3>
<p>Clicking Submit sends your submission to the GASCOIN system. The Submit button shows a loading animation for approximately 2 seconds while the submission is created. After this, you are automatically advanced to Step 5.</p>`,
        order: 9,
      },
      {
        slug: "step-5-gate-progress",
        title: "Step 5 — Gate Progress",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>Step 5 is the verification monitoring screen. It shows your submission progressing through all 10 verification gates in real time. This is the system automatically checking every aspect of your submission.</p>
<h3><strong>Reading the gate progress screen</strong></h3>
<p>Each of the 10 gates is listed vertically. Each gate shows a status icon:</p>
<h3><strong>How long verification takes</strong></h3>
<p>Most gates complete in under 10 seconds. Gate 5 (Wallet on Receipt) involves OCR image processing and can take up to 45 seconds. The entire verification process typically completes within 2-5 minutes for a passing submission.</p>
<h3><strong>If all 10 gates pass</strong></h3>
<p>The screen displays SUBMISSION APPROVED. Your SOL refund will be dispatched to your wallet within 24-48 hours. You can track your submission status at any time using the Wallet Tracker page at /wallet.</p>
<h3><strong>If a gate fails</strong></h3>
<p>The screen displays SUBMISSION INCOMPLETE. The failed gate is highlighted and a specific failure reason is shown explaining exactly what went wrong. Gates that come after the failed gate show the dash icon — they were not run because a previous gate blocked progress.</p>
<p>After a failure, you can resubmit. Different gates have different resubmission requirements — see the Gates section of this document for details on each gate and how to fix failures.</p>
<h3><strong>Gate 10 — Special Case (Non-Blocking)</strong></h3>
<p>Gate 10 (Treasury Solvent) is the only non-blocking gate. If Gate 10 fails, your submission is not rejected. Instead, it is placed in a priority queue and automatically retried every 6 hours until the treasury has enough SOL to cover your refund. You do not need to resubmit if Gate 10 fails.</p>`,
        order: 10,
      },
    ],
  },
  {
    slug: "verification",
    label: "Verification Gates",
    sections: [
      {
        slug: "the-10-verification-gates-complete-reference",
        title: "10 Verification Gates Reference",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<p>All claims pass through 10 sequential gates.</p>
<ul>
<li><strong>Gates 1-9:</strong> blocking controls (any fail stops progression).</li>
<li><strong>Gate 10:</strong> treasury solvency control (non-blocking queue path).</li>
</ul>
<p>Gate decisions are policy-driven and auditable. Administrative overrides are exceptional and logged.</p>
<h3>How to use this reference</h3>
<ol>
<li>Identify the first failed gate.</li>
<li>Apply the remediation guidance for that gate only.</li>
<li>Resubmit with fresh compliant inputs where required.</li>
</ol>`,
        order: 11,
      },
      {
        slug: "gate-1-tweet-detected",
        title: "Gate 1 — Tweet Detected",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 1 verifies that the URL you submitted points to a real, accessible tweet on X. The system fetches the tweet directly using the X API v2 and confirms that the tweet ID exists and the account is not suspended.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>The tweet URL was pasted incorrectly — characters missing from the end</li>
<li>The tweet was deleted after submission was initiated</li>
<li>The X account was suspended after the tweet was posted</li>
<li>The URL is from a different platform (not x.com or twitter.com)</li>
</ul>
<h3><strong>How to ensure Gate 1 passes</strong></h3>
<p>Use the X share button to copy the tweet URL — never type it manually. Verify the tweet is still live before submitting. Do not delete your tweet during the submission process.</p>`,
        order: 12,
      },
      {
        slug: "gate-2-tweet-public",
        title: "Gate 2 — Tweet Public",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 2 verifies that the X account that posted the tweet is set to fully public visibility at the time of verification. Private accounts cannot be read by the system regardless of the tweet content.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Account was switched to private after posting the tweet</li>
<li>Account is in a temporary read-only state</li>
<li>Account visibility was set to followers-only</li>
</ul>
<h3><strong>How to ensure Gate 2 passes</strong></h3>
<p>Set your X account to public before posting and keep it public until your refund is confirmed. Do not change privacy settings during the submission and verification period.</p>`,
        order: 13,
      },
      {
        slug: "gate-3-gascoin-hashtag",
        title: "Gate 3 — #gascoin Hashtag",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 3 verifies that the tweet body contains the exact hashtag #gascoin. The check is case-insensitive, so #GASCOIN and #Gascoin also pass. The hashtag must be a standalone word in the tweet — not embedded in a URL or concatenated with another word.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Hashtag misspelled: #gas_coin, #gasCoin (with capital C), #gasc0in</li>
<li>#gascoin appears only in a reply to the tweet, not in the original tweet body</li>
<li>The hashtag is embedded inside a URL</li>
</ul>
<h3><strong>How to ensure Gate 3 passes</strong></h3>
<p>Type #gascoin as a standalone word in your tweet before posting. Any capitalization variation is accepted. Do not use underscores or spaces within the hashtag.</p>`,
        order: 14,
      },
      {
        slug: "gate-4-tweet-age",
        title: "Gate 4 — Tweet Age",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 4 verifies that the tweet was posted within 48 hours before your submission time. The system compares the tweet's timestamp from the X API against the submission timestamp. The difference must be less than 172,800 seconds (48 hours).</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Tweet was posted more than 48 hours before submission</li>
<li>Reusing a tweet from a previous submission attempt</li>
<li>Time zone confusion — the system uses UTC for all timestamps</li>
</ul>
<h3><strong>How to ensure Gate 4 passes</strong></h3>
<p>Post your #gascoin tweet and submit your receipt in the same session. Do not save tweet URLs for later use. The moment you post, the 48-hour window begins.</p>`,
        order: 15,
      },
      {
        slug: "gate-5-wallet-on-receipt",
        title: "Gate 5 — Wallet on Receipt",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 5 uses optical character recognition (OCR) to scan your receipt photo for the last 4 characters of your Solana wallet address. The system extracts handwritten characters and compares them against the last 4 characters of the wallet you connected in Step 1. They must match.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Characters written too small to be read by OCR</li>
<li>Characters written in pencil or light ink — low contrast against receipt paper</li>
<li>Photo taken at an angle that distorts the handwritten text</li>
<li>Characters written on a separate piece of paper held next to the receipt — must be written directly on the receipt</li>
<li>Wrong characters written — do not match the last 4 of the wallet connected in Step 1</li>
<li>Characters partially obscured by a fold or crease in the receipt</li>
</ul>
<h3><strong>How to ensure Gate 5 passes</strong></h3>
<p>Write the last 4 characters of your wallet address in black pen directly on the receipt. Use clear, printed characters. Write large — at least 3-4mm tall. Double-check before photographing. Take the photo from directly above, not at an angle.</p>
<p>IMPORTANT: This is the most commonly failed gate. Before submitting, zoom in on your receipt photo on your phone and verify the characters are fully readable. If you cannot read them clearly, retake the photo.</p>`,
        order: 16,
      },
      {
        slug: "gate-6-receipt-legible",
        title: "Gate 6 — Receipt Legible",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 6 verifies that the overall receipt image is clear enough for automated reading. The system checks image resolution, blur level, and whether key receipt fields (total amount, date) are detectable. A corrupted or damaged image file also fails this gate.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Photo taken in low light — dark, grainy image</li>
<li>Camera too far from the receipt — text is too small to read</li>
<li>Receipt crumpled or folded, obscuring key fields</li>
<li>HEIC file from iPhone not processed correctly — try converting to JPG</li>
<li>File is corrupted or partially uploaded</li>
</ul>
<h3><strong>How to ensure Gate 6 passes</strong></h3>
<p>Photograph the receipt flat on a bright surface with good overhead lighting. Fill the frame with the receipt. Ensure the total amount and date are clearly visible before uploading. Check the preview in Step 3 — if it looks blurry to you, it will fail the gate.</p>`,
        order: 17,
      },
      {
        slug: "gate-7-receipt-date-valid",
        title: "Gate 7 — Receipt Date Valid",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 7 uses OCR to extract the purchase date from the receipt and compares it against the submission date. The gas purchase must have occurred within 7 days before submission. Future-dated receipts automatically fail. Receipts with no readable date also fail.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Receipt is older than 7 days</li>
<li>Receipt date field is missing, torn off, or illegible</li>
<li>Date format is ambiguous and cannot be parsed (e.g., partially faded thermal print)</li>
<li>Reusing a receipt from a previous failed submission</li>
</ul>
<h3><strong>How to ensure Gate 7 passes</strong></h3>
<p>Use a receipt from a gas purchase within the last 7 days. Ensure the date is clearly printed and fully visible. Do not fold or tear the portion of the receipt showing the date.</p>`,
        order: 18,
      },
      {
        slug: "gate-8-no-duplicate-wallet",
        title: "Gate 8 — Submission Cooldown",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 8 checks that your X account has not submitted a claim within the cooldown period for your tier. Standard and Commuter tiers have a 7-day cooldown, Road Warrior 3.5 days, and Fleet 1.75 days. The cooldown is tied to your X account, not your wallet.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Submitting again before 7 days have passed since your last submission</li>
<li>Having a pending or in-review submission still active</li>
</ul>
<h3><strong>How to ensure Gate 8 passes</strong></h3>
<p>Wait for your tier-specific cooldown to expire before submitting again. Use the Wallet Tracker at /wallet to check your cooldown status.</p>
<p><strong>Example:</strong> You submit on Monday. Your next eligible submission is the following Monday.</p>`,
        order: 19,
      },
      {
        slug: "gate-9-no-duplicate-receipt",
        title: "Gate 9 — No Duplicate Receipt",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 9 generates a perceptual image hash of your uploaded receipt photo and compares it against all previously submitted receipts in the system. If the hash similarity score exceeds a threshold, the receipt is considered a duplicate and the submission fails. This applies regardless of the wallet address — the same physical receipt cannot be submitted twice even from different wallets.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Submitting the same receipt a second time after a previous failed submission</li>
<li>Two different users submitting photos of the same physical receipt</li>
<li>Submitting a photo of a photo of a receipt (the hash will still match)</li>
</ul>
<h3><strong>How to ensure Gate 9 passes</strong></h3>
<p>Each submission requires a unique, original gas receipt that has never been submitted to GASCOIN before. Never resubmit a receipt — even if your previous submission failed on a different gate. Get a new receipt from a new gas purchase.</p>`,
        order: 20,
      },
      {
        slug: "gate-10-treasury-solvent",
        title: "Gate 10 — Treasury Solvent",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<h3><strong>What this gate checks</strong></h3>
<p>Gate 10 queries the GASCOIN treasury wallet on the Solana blockchain via RPC and verifies that the current SOL balance is sufficient to cover your refund amount plus estimated transaction fees. This check happens immediately before the SOL is dispatched.</p>
<h3><strong>What happens if Gate 10 fails</strong></h3>
<p>Unlike Gates 1-9, Gate 10 failure does NOT reject your submission. Instead, your submission enters a priority queue. The system automatically retries Gate 10 every 6 hours. When the treasury is replenished and has sufficient balance, your submission automatically moves to approved and SOL is dispatched to your wallet. You do not need to resubmit or take any action.</p>
<h3><strong>How long does a Gate 10 queue take</strong></h3>
<p>This depends entirely on when the treasury is next replenished. The treasury admin monitors the treasury balance and adds SOL as needed. Most Gate 10 queue situations resolve within 48-72 hours.</p><h3>What to expect while in Gate 10 queue</h3>
<p>When your submission enters the Gate 10 queue, three things happen automatically:</p>
<ul>
<li>Your submission status in the Wallet Tracker changes from "processing" to "pending queue"</li>
<li>The system retries Gate 10 every 6 hours automatically — you do not need to do anything</li>
<li>When the treasury is replenished and your retry passes, your status changes to "approved" and SOL dispatch is initiated</li>
</ul>
<p>Typical Gate 10 queue resolution time: 24-72 hours. The treasury balance is publicly visible on the Treasury page at /dashboard so you can monitor it yourself.</p>`,
        order: 21,
      },
    ],
  },
  {
    slug: "technology",
    label: "Technology",
    sections: [
      {
        slug: "technology-overview",
        title: "Technology Overview",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>GASCOIN uses an AI-assisted, policy-enforced verification stack to make fraud economically unattractive.</p>
<ul>
<li>Signal ingestion from wallet, receipt, and X context</li>
<li>Receipt intelligence (OCR + integrity + duplicate checks)</li>
<li>Sequential gate policy engine</li>
<li>Queue/retry orchestration for treasury constraints</li>
<li>Immutable audit trail for operator actions</li>
</ul>
<p>Start here for architecture orientation, then continue to the dedicated flow diagrams.</p>`,
        order: 22,
      },
      {
        slug: "end-to-end-architecture-map",
        title: "End-to-End Architecture Map",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>This map is the complete technical path from user action to treasury payout. Use this as the single reference for engineering reviews, incident analysis, and onboarding technical stakeholders.</p>
<p><img src="/docs/diagrams/end-to-end-architecture-map.svg" alt="GASCOIN end-to-end architecture map" style="width:100%;max-width:1080px;border:1px solid rgba(255,255,255,0.12);border-radius:10px" /></p>
<h3>Read this map in 4 passes</h3>
<ol>
<li>Input/identity validation</li>
<li>Receipt intelligence and fraud scoring</li>
<li>Gate-state transitions and policy outputs</li>
<li>Payout dispatch, retries, and audit logs</li>
</ol>`,
        order: 23,
      },
      {
        slug: "ai-system-overview",
        title: "AI System Overview (Flow Paths)",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>This page gives two views of GASCOIN AI operations: a plain-English path for newcomers, and a systems path for technical operators.</p>
<h3>Newcomer Path (Simple)</h3>
<ul>
<li>Submit wallet + tweet + receipt</li>
<li>AI checks social proof and receipt authenticity</li>
<li>Gate engine evaluates pass/fail sequence</li>
<li>If approved, payout worker dispatches SOL</li>
<li>If treasury is short, claim enters automatic retry queue</li>
</ul>
<h3>Technical Path (Detailed)</h3>
<ul>
<li>Ingestion: form payload normalization + idempotency</li>
<li>Signal extraction: X API validation + OCR + metadata extraction</li>
<li>Scoring: AI probability, tamper score, duplicate fingerprints, account quality</li>
<li>Policy: sequential gates and state transitions</li>
<li>Execution: approval, payout queueing, retries, audit logging</li>
</ul>
<p><img src="/docs/diagrams/ai-system-overview.svg" alt="GASCOIN AI system overview flow diagram" style="width:100%;max-width:980px;border:1px solid rgba(255,255,255,0.12);border-radius:10px" /></p>`,
        order: 26,
      },
      {
        slug: "receipt-intelligence-pipeline",
        title: "Receipt Intelligence Pipeline",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>The receipt pipeline combines deterministic parsing and model-assisted scoring. This gives explainability plus adaptive fraud resistance.</p>
<ol>
<li>Upload intake and file-type checks</li>
<li>OCR extraction (date, amount, station, wallet chars)</li>
<li>Image integrity analysis (tamper/AI likelihood)</li>
<li>Perceptual hash generation for duplicate detection</li>
<li>Gate outputs into policy decision engine</li>
</ol>
<p><img src="/docs/diagrams/receipt-intelligence-pipeline.svg" alt="Receipt intelligence processing pipeline diagram" style="width:100%;max-width:980px;border:1px solid rgba(255,255,255,0.12);border-radius:10px" /></p>`,
        order: 27,
      },
      {
        slug: "gate-decision-and-retry-paths",
        title: "Gate Decision and Retry Paths",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>This flow shows exactly how a submission moves through gate checks, rejection paths, and the non-blocking Gate 10 treasury queue.</p>
<ul>
<li>Gates 1-9 are blocking</li>
<li>Gate 10 is non-blocking and queue-based</li>
<li>Retries are automated and logged</li>
<li>Admin review remains auditable</li>
</ul>
<p><img src="/docs/diagrams/gate-decision-retry-paths.svg" alt="Gate decision and retry paths diagram" style="width:100%;max-width:980px;border:1px solid rgba(255,255,255,0.12);border-radius:10px" /></p>`,
        order: 28,
      },
      {
        slug: "grok-ai-engine",
        title: "Grok AI Engine",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>Grok — built by xAI — is the reasoning engine behind GASCOIN's fraud detection and quality scoring. It powers four critical systems:</p>
<h3>Receipt Analysis</h3>
<p>Every uploaded receipt passes through Grok-powered OCR that extracts structured data: total amount, date, station name, and handwritten wallet characters. Unlike traditional OCR, Grok understands context — it can distinguish a gas station receipt from a restaurant bill, detect inconsistencies between printed and handwritten text, and flag anomalies that suggest digital manipulation.</p>
<h3>AI Image Detection</h3>
<p>Grok evaluates every receipt image for signs of AI generation or digital manipulation. The system produces an AI probability score (0-1 scale). Submissions scoring above 0.65 are automatically rejected. This catches AI-generated receipts, Photoshopped images, and digitally altered documents.</p>
<h3>Tamper Scoring</h3>
<p>A separate tamper analysis examines EXIF metadata, image dimensions, compression artifacts, and pixel-level inconsistencies. The tamper score (0-1 scale) catches receipts that have been cropped, spliced, or edited after the original photo was taken. Threshold: 0.55.</p>
<h3>Adaptive Learning</h3>
<p>Unlike static rule-based fraud systems, Grok continuously processes submission patterns across the entire platform. New fraud vectors are identified and countered without manual rule updates. The system gets smarter with every submission — legitimate or fraudulent.</p>`,
        order: 29,
      },
      {
        slug: "x-api-v2-integration",
        title: "X API v2 Integration",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>GASCOIN connects directly to the X (Twitter) platform via the official X API v2. Every submission triggers real-time verification of the submitter's social identity and tweet authenticity.</p>
<h3>What We Verify</h3>
<ul>
<li><strong>Tweet existence</strong> — The submitted URL points to a real, accessible tweet</li>
<li><strong>Public visibility</strong> — The author's account is set to public (not protected)</li>
<li><strong>Hashtag presence</strong> — The tweet body contains #gascoin</li>
<li><strong>Tweet age</strong> — Posted within 48 hours of submission</li>
<li><strong>Author identity</strong> — The tweet author matches the connected X account</li>
<li><strong>Follower count</strong> — Minimum 100 followers (filters bot accounts)</li>
<li><strong>Account quality</strong> — Age, activity history, profile completeness, and engagement patterns</li>
</ul>
<h3>Why X Integration Matters</h3>
<p>X is the only social platform with both a verified identity layer and a public API powerful enough for real-time fraud detection. By requiring every submission to include a live tweet, GASCOIN creates a public, timestamped proof-of-intent that is extremely difficult to fake at scale. Bot networks fail the follower and account quality checks. Fake accounts fail the activity history check. Private accounts are rejected outright.</p>`,
        order: 30,
      },
      {
        slug: "xai-powered-scoring",
        title: "xAI-Powered Scoring",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>The engagement and quality scoring system uses xAI intelligence to evaluate every participant across four parallel AI modules:</p>
<h3>1. Tweet Quality Scorer</h3>
<p>Analyzes tweet content, engagement metrics (impressions, likes, retweets, quotes, replies), and audience quality. High-quality tweets that drive genuine engagement earn more points. Low-effort or spam-like tweets are scored accordingly.</p>
<h3>2. Referral Ring Detector</h3>
<p>Graph analysis that maps referral relationships and identifies circular referral patterns, mutual-referral schemes, and coordinated sign-up networks. Detected rings are flagged and excluded from referral rewards.</p>
<h3>3. Wallet Trust Calculator</h3>
<p>Reputation scoring based on submission history, approval rate, tier consistency, and on-chain behavior. Wallets with a strong track record earn higher trust scores, which influence queue priority and review speed.</p>
<h3>4. Pre-Award Verification Gate</h3>
<p>Before any points are awarded, a multi-layer verification gate runs: trust multiplier check, source-specific validation, velocity analysis, and AI verification for flagged or high-value awards. This prevents point farming and manipulation.</p>`,
        order: 31,
      },
      {
        slug: "4-layer-fraud-detection",
        title: "4-Layer Fraud Detection",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>GASCOIN's anti-fraud system operates in four independent layers. Each layer catches a different class of attack. All four must pass for a submission to be approved.</p>
<h3>Layer 1 — Gate-Based Sequential Verification</h3>
<p>10 automated gates run in sequence. Each gate checks a specific requirement: tweet validity, receipt authenticity, wallet matching, cooldown compliance, and more. Any single gate failure blocks the entire submission. There is no partial pass.</p>
<h3>Layer 2 — AI Image Analysis (Grok)</h3>
<p>Grok-powered analysis evaluates every receipt image for AI generation, digital manipulation, and tampering. Two independent scores (AI probability and tamper score) must both fall below their thresholds. This layer catches sophisticated image forgeries that pass visual inspection.</p>
<h3>Layer 3 — Perceptual Hashing</h3>
<p>Every receipt image is converted to a perceptual hash — a digital fingerprint that is resistant to cropping, rotation, brightness changes, and minor edits. This hash is compared against every previously submitted receipt in the system. Even heavily modified versions of the same receipt are detected and rejected.</p>
<h3>Layer 4 — Social Signal Analysis</h3>
<p>The submitter's X account is evaluated for authenticity signals: follower count, account age, posting history, engagement patterns, and network quality. xAI-powered scoring identifies bot accounts, purchased followers, and coordinated networks. This layer makes it economically infeasible to create fake accounts at scale.</p>`,
        order: 32,
      },
      {
        slug: "on-chain-verification",
        title: "On-Chain Verification",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>Every financial operation in GASCOIN happens on the Solana blockchain — fully transparent and publicly auditable.</p>
<h3>Treasury Transparency</h3>
<p>The GASCOIN treasury wallet is a standard Solana wallet. Its balance is queried via RPC before every payout. If the treasury cannot cover a refund, the submission is queued (not rejected) until funds are available. The treasury balance is publicly visible on the Dashboard page.</p>
<h3>Token Holdings Verification</h3>
<p>Your GASCOIN token balance is checked twice: once at submission time (to determine your tier and cooldown) and again immediately before SOL is dispatched (to ensure you still hold tokens). If you sell your GASCOIN between submission and payout, the payout is blocked.</p>
<h3>Immutable Audit Trail</h3>
<p>Every admin action — approvals, rejections, gate overrides, payout dispatches — is permanently recorded in the audit log. No admin action can be taken silently. The audit trail cannot be modified or deleted.</p>
<h3>Solana Transaction Receipts</h3>
<p>Every SOL payout generates a Solana transaction hash that can be independently verified on any Solana block explorer. The transaction proves exactly when the payment was made, how much was sent, and to which wallet.</p>`,
        order: 33,
      },
      {
        slug: "why-it-cant-be-gamed",
        title: "Why It Can't Be Gamed",
        categorySlug: "technology",
        category: "Technology",
        description: "",
        content: `<p>GASCOIN is designed so that the cost of fabricating a valid submission always exceeds the value of the refund. Here's why:</p>
<ul>
<li><strong>Physical receipt required</strong> — You need a real paper receipt from a real gas station. Digital, email, and app receipts are rejected. AI-generated receipt images are caught by Grok's image analysis.</li>
<li><strong>Handwritten wallet ID</strong> — The last 4 characters of your wallet must be physically written on the receipt in pen. This ties the receipt to a specific wallet at a specific moment in time.</li>
<li><strong>Live tweet verification</strong> — Your tweet must exist, be public, contain #gascoin, and be posted within 48 hours. Deleting the tweet after submission fails re-verification at payout time.</li>
<li><strong>AI image analysis</strong> — Grok scores every receipt for AI generation probability and digital tampering. Two independent scores must both pass.</li>
<li><strong>Perceptual hashing</strong> — Every receipt is fingerprinted and compared against all previous submissions. The same receipt cannot be submitted twice, even if edited.</li>
<li><strong>Social graph scoring</strong> — Your X account must have 100+ real followers, posting history, and pass account quality checks. Bot accounts and purchased followers are detected.</li>
<li><strong>Referral ring detection</strong> — AI graph analysis identifies and blocks circular referral schemes.</li>
<li><strong>Tier-based cooldowns</strong> — Submission frequency is capped by tier. Even Fleet (the highest tier) is limited to 4 per week.</li>
<li><strong>Dual token check</strong> — Token balance is verified at submission AND before payout. Dumping tokens after submission blocks the refund.</li>
<li><strong>Pre-payout re-verification</strong> — Before every SOL dispatch, the system re-checks: tweet still live, follower count still valid, account quality still passing, token balance still held.</li>
<li><strong>Admin review layer</strong> — Every submission is reviewed by a human admin before funds are released. The admin has full visibility into all gate results, AI scores, and fraud signals.</li>
<li><strong>Immutable audit log</strong> — Every action on the platform is permanently recorded. Nothing can be done silently.</li>
</ul>
<p>To successfully game GASCOIN, an attacker would need to: physically obtain a gas receipt, write a wallet ID on it by hand, photograph it convincingly enough to fool Grok's AI analysis, maintain a legitimate X account with real followers and activity, post a public tweet, hold GASCOIN tokens, and pass admin review. The cost of doing this at scale makes it economically irrational.</p>`,
        order: 34,
      },
    ],
  },
  {
    slug: "platform",
    label: "Platform Pages",
    sections: [
      {
        slug: "platform-pages-complete-reference",
        title: "Platform Pages Reference",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The GASCOIN platform has 10 public-facing pages accessible from the navigation bar. This section documents every page, what it shows, and how to use it.</p>`,
        order: 22,
        navHidden: true,
      },
      {
        slug: "homepage",
        title: "Homepage",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The homepage is the primary entry point for new visitors. It introduces the GASCOIN concept and directs users to submit their first receipt.</p>
<h3><strong>What the homepage shows</strong></h3>
<ul>
<li>Navigation bar with links to all platform pages and a CONNECT WALLET button</li>
<li>Hero section with the GASCOIN value proposition: POST. SUBMIT. GET PAID BACK.</li>
<li>AI technology pipeline showing full integration with X + Grok across verification flows</li>
<li>Live statistics strip: Treasury SOL balance, Market Cap, 24h Volume, Verification Gates count</li>
<li>How It Works section: 3-step visual summary of the submission process</li>
<li>Live treasury teaser section with real-time SOL balance</li>
<li>Community receipt feed teaser showing the 4 most recent approved receipts</li>
<li>Gate transparency teaser showing all 10 gate names with live pass rates</li>
<li>Wallet Tracker teaser with a static gate progress illustration</li>
<li>Referral engine teaser with platform-wide conversion statistics</li>
</ul>
<h3><strong>The treasury statistics strip</strong></h3>
<p>The four stat cards in the statistics strip show:</p>
<p>If Treasury Balance shows '--', it means the RPC call has not yet returned or has failed. This is not a permanent state — wait a moment and the balance will populate. It does not mean the treasury is empty.</p>`,
        order: 23,
      },
      {
        slug: "submit-page-submit",
        title: "Submit Page",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The submit page hosts the 5-step submission portal described in full in Section 2 of this document. See Section 2 for complete details on each step.</p>
<p>Key rules for the submit page:</p>
<ul>
<li>You must connect a Solana wallet to proceed past Step 1</li>
<li>You must have an active X (Twitter) account to proceed past Step 2</li>
<li>You must have a qualifying gas receipt to proceed past Step 3</li>
<li>Each submission requires a unique receipt and a new tweet — you cannot reuse either</li>
<li>Only one active submission per wallet is allowed at a time</li>
</ul>`,
        order: 24,
      },
      {
        slug: "community-feed-community",
        title: "Community Feed",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Community page is the public proof-of-payout wall. Every approved gas receipt submission that passes all 10 gates appears as a card on this page. It exists to demonstrate that the platform works and real people receive real refunds.</p>
<h3><strong>What each receipt card shows</strong></h3>
<ul>
<li>Location: the city and state where the gas was purchased (e.g., Austin, TX)</li>
<li>SOL Refund Amount: the exact SOL sent to the submitter</li>
<li>Receipt Total: the USD amount of the gas purchase</li>
<li>Submission Date: when the submission was made</li>
<li>Wallet: the submitter's wallet address in truncated format</li>
<li>Gates: 10/10 indicating all verification gates passed</li>
<li>Receipt Image: a photo of the actual gas receipt (may be redacted if sensitive info detected)</li>
</ul>
<h3><strong>Filters and sorting</strong></h3>
<h3><strong>Receipt detail modal</strong></h3>
<p>Clicking any receipt card opens a full detail view showing the complete receipt image, all submission details (wallet, SOL amount, receipt total, gas station location, receipt date, gates passed, submission ID), and a copy button for the wallet address.</p>
<h3><strong>Live updates</strong></h3>
<p>The community feed updates in real time. When a new submission is approved, a notification bar appears at the top of the feed: '↑ X new receipts — click to load.' Clicking this bar adds the new receipts to the top of the grid without requiring a page refresh.</p>
<h3><strong>Privacy</strong></h3>
<p>Sensitive personal information is never displayed. Gas station names are shown as city and state only — never a specific address. Wallet addresses are truncated. Receipt images are reviewed by the admin team and redacted if credit card numbers, phone numbers, or full names are visible.</p>`,
        order: 25,
      },
      {
        slug: "leaderboard-leaderboard",
        title: "Leaderboard",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The leaderboard ranks all wallets that have earned SOL through GASCOIN by a composite score. It is public and visible to anyone — no wallet connection required to view it.</p>
<h3><strong>The scoring formula</strong></h3>
<p>Each wallet's leaderboard score is calculated from 4 factors:</p>
<h3><strong>The leaderboard table</strong></h3>
<p>The main table shows all wallets ordered by composite score. Each row shows: rank, wallet address (truncated), number of referrals, engagement score, GASCOIN holdings, points earned, composite score, and a View link.</p>
<p>Clicking View on any row opens the full submission history for that wallet in the Wallet Tracker.</p>
<h3><strong>Top 3 Podium</strong></h3>
<p>When 3 or more wallets have submissions, the top 3 are displayed in a visual podium above the table. The rank 1 wallet appears in the center and is slightly taller. If your connected wallet is in the top 3, a YOU badge appears on your podium card.</p>
<h3><strong>Live updates</strong></h3>
<p>The leaderboard updates in real time via Supabase Realtime. When any submission status changes in the database, the leaderboard data refreshes automatically. The LIVE indicator in the page header shows the time since last update.</p><h3>How scores are calculated</h3>
<p>Each wallet's leaderboard position is determined by a proprietary composite score based on three factors: referral activity, platform engagement, and GASCOIN holdings. The weights are dynamic and may be adjusted. SOL earned from receipt refunds is not a factor — the leaderboard rewards ecosystem contribution, not receipt size.</p>
<p>→ See also: Points System documentation for details on how points are earned</p>`,
        order: 26,
      },
      {
        slug: "wallet-tracker-wallet",
        title: "Wallet Tracker",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Wallet Tracker is your personal submission status dashboard. It shows your complete submission history, current gate progress for any active submission, cooldown countdown, and total earnings. It can also be used to look up any public wallet address.</p>
<h3><strong>Two modes</strong></h3>
<h3><strong>Cooldown countdown</strong></h3>
<p>In Connected Mode, if your account is within the cooldown period following a submission, a countdown timer shows how much time remains before you can submit again. Cooldown duration depends on your tier.</p>
<p>When the countdown reaches zero, the cooldown block automatically transitions to show Submit Receipt with a link to the submission portal.</p>
<h3><strong>Gate progress tracker</strong></h3>
<p>If you have a pending submission (one that has been submitted but not yet approved or rejected), the gate progress tracker appears. It shows all 10 gates with their current status updating live as each gate is processed. This is the same display as Step 5 of the submission portal but accessible at any time from /wallet.</p>
<h3><strong>URL deep linking</strong></h3>
<p>The Wallet Tracker supports URL parameters. Visiting /wallet?address=SOLANA_ADDRESS_HERE automatically loads that address in Lookup Mode without requiring the user to paste the address. This link format is used by the leaderboard View buttons.</p>`,
        order: 27,
      },
      {
        slug: "referral-engine-referral",
        title: "Referral Engine",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Referral Engine allows approved GASCOIN submitters to earn points by referring new users to the platform. When someone uses your referral link to submit and gets approved, you earn 500 points that boost your leaderboard rank and status.</p>
<h3><strong>Who can use the referral system</strong></h3>
<p>You must have at least one approved submission to generate a referral link and earn rewards. Users without any approved submission can see the referral page but the link generation is locked until they complete a successful submission.</p>
<h3><strong>Your referral link</strong></h3>
<p>Your referral link is unique to your wallet address and is deterministically generated — it never changes. The format is: https://gascoin.com/submit?ref=XXXXXXXX where XXXXXXXX is your 8-character referral code.</p>
<p>Share this link anywhere: X, Telegram, Discord, text message, or any other platform where people might be interested in getting their gas money back.</p>
<h3><strong>How a referral conversion works</strong></h3>
<ul>
<li>Someone clicks your referral link.</li>
<li>Their browser stores your referral code for 7 days (the attribution window).</li>
<li>They submit a gas receipt using the platform.</li>
<li>Their submission passes all 10 verification gates and is approved.</li>
<li>The system detects your referral code on their submission and checks eligibility.</li>
<li>If eligible, 500 points are awarded to your wallet through the AI verification gate.</li>
<li>Points are credited automatically. No admin action needed for referral points.</li>
</ul>
<h3><strong>Referral rules and limits</strong></h3>
<h3><strong>Referral dashboard metrics</strong></h3>
<p>The referral page dashboard shows: Total Clicks (how many times your link has been clicked), Unique Visitors (unique devices), Conversions (approved submissions through your link), Conversion Rate (unique clicks that resulted in an approved submission), and Points Earned (total referral points to date).</p>
<h3><strong>Referral leaderboard</strong></h3>
<p>The bottom of the referral page shows the top 10 referrers across the entire platform ranked by total conversions. This leaderboard is public — no wallet connection required to view it.</p><h3>When referral rewards are skipped</h3>
<p>A conversion is marked "skipped" rather than "pending" when eligibility rules prevent a reward:</p>
<table><thead><tr><th>Skip Reason</th><th>What It Means</th><th>Reversible?</th></tr></thead>
<tbody><tr><td>Self-referral</td><td>You submitted using your own referral link</td><td>No — permanent</td></tr>
<tr><td>Referrer not approved</td><td>You had no approved submissions when the conversion occurred</td><td>No — permanent</td></tr>
<tr><td>Monthly cap reached</td><td>You hit 20 conversions in the rolling 30-day window</td><td>Resets after 30 days</td></tr>
<tr><td>Monthly points cap reached</td><td>You hit 10,000 points in referral rewards this window</td><td>Resets after 30 days</td></tr></tbody></table>
<p>→ See also: Gates page — all 10 gates must pass for a conversion to count</p>`,
        order: 28,
      },
      {
        slug: "token-perks-perks",
        title: "Token Perks",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Perks page explains the GASCOIN token tier system. Holding GASCOIN tokens in your connected wallet unlocks higher refund caps, priority queue processing, and exclusive badges visible across the platform.</p>
<h3><strong>The four tiers</strong></h3>
<h3><strong>How tier is determined</strong></h3>
<p>The system checks your connected wallet's GASCOIN token balance live on the Solana blockchain when you connect. The balance is also cached and refreshed every 5 minutes. If you buy more GASCOIN and want to see your updated tier immediately, click the Refresh Balance button on the Perks page.</p>
<h3><strong>When tier is applied</strong></h3>
<p>Your tier is snapshotted at the time of submission. The refund cap associated with that tier applies to that submission — even if your holdings later change before dispatch. If you upgrade after submitting, the original tier at submission time still applies.</p>
<h3><strong>Queue priority</strong></h3>
<p>Higher tier submissions are processed before lower tier submissions. If multiple submissions are pending in the admin queue, a Fleet tier submission will appear above a Standard tier submission. This does not affect the automated gate processing — it affects the order in which the admin reviews and approves refund amounts.</p>
<h3><strong>Where tier badges appear</strong></h3>
<p>Once you have an approved submission, your tier badge appears on your leaderboard row, on your receipt cards in the community feed, and in the wallet tracker.</p><h3>How to acquire GASCOIN tokens</h3>
<p>GASCOIN tokens are available on Solana decentralised exchanges:</p>
<ul>
<li><strong>Raydium</strong> — <a href="https://raydium.io/swap" target="_blank">raydium.io/swap</a></li>
<li><strong>Jupiter</strong> — <a href="https://jup.ag" target="_blank">jup.ag</a></li>
</ul>
<p>To buy GASCOIN: ensure your wallet has SOL for the purchase and transaction fees, visit the DEX, connect your wallet, swap SOL for GASCOIN, then return to the Perks page and click Refresh Balance to see your updated tier.</p>
<p>Your tier is checked live at submission time. Tier upgrades take effect immediately — no re-connecting required.</p>
<p>→ See also: Token Tiers for the full tier comparison</p>`,
        order: 29,
      },
      {
        slug: "treasury-dashboard-dashboard",
        title: "Treasury / Dashboard",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Treasury/Dashboard page shows the financial health of the GASCOIN platform. It is publicly viewable and designed to provide full transparency about the treasury's ability to pay refunds.</p>
<h3><strong>What the dashboard shows</strong></h3>
<h3><strong>How to interpret the treasury balance</strong></h3>
<p>The treasury balance is the amount of SOL currently available to pay refunds. A healthy treasury will comfortably exceed the sum of all pending refund amounts. If the treasury balance drops below 1 SOL, the admin dashboard displays a LOW TREASURY warning and new approvals may be paused.</p>`,
        order: 30,
      },
      {
        slug: "gates-page-gates",
        title: "Gates Page",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Gates page is the full public documentation of GASCOIN's 10 verification gates. It is the reference page for understanding exactly what the system checks before approving a submission.</p>
<h3><strong>Sections on the Gates page</strong></h3>
<ul>
<li>Live system statistics: total submissions processed, overall pass rate, average processing time, most frequently failed gate</li>
<li>Category filters: view gates by category (ALL, TWEET, RECEIPT, WALLET, TREASURY)</li>
<li>Pre-submission checklist: 10 interactive checkboxes you can complete before submitting to verify you meet all requirements</li>
<li>Gate cards: all 10 gates with live pass rate statistics, descriptions, and expandable detail panels</li>
<li>FAQ section: 6 common questions with detailed answers</li>
</ul>
<h3><strong>The pre-flight checklist</strong></h3>
<p>The pre-flight checklist is the most important self-service tool on the platform. Before submitting, visit /gates and check all 10 boxes. The checklist saves your progress in your browser — if you navigate away and return, your checked boxes are preserved. When all 10 are checked, a Submit Receipt button appears that takes you directly to the submission portal.</p>
<p>The 10 pre-flight checks correspond directly to the 10 verification gates. Completing the checklist means you have self-verified that your tweet, receipt, and wallet meet all requirements before the automated system checks them.</p>
<h3><strong>Gate detail panels</strong></h3>
<p>Clicking VIEW FULL DETAILS on any gate card opens an expanded panel showing three columns: What We Check (the exact system logic), Common Failures (real occurrence data from the database), and How To Pass (step-by-step guidance). Only one gate detail panel can be open at a time.</p>`,
        order: 31,
      },
    ],
  },
  {
    slug: "security",
    label: "Security & Admin",
    sections: [
      {
        slug: "admin-dashboard-admin",
        title: "Admin Dashboard",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Admin Dashboard is the internal operations interface for platform operators. It is secured behind wallet-based authentication and is accessible only to wallet addresses in the admin allowlist.</p>
<p>The admin dashboard is NOT accessible to regular users. Attempting to visit /admin redirects to the admin login page. Connecting a non-admin wallet on the login page returns an Access Denied message.</p>`,
        order: 32,
      },
      {
        slug: "admin-authentication",
        title: "Admin Authentication",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Admin access uses a 3-layer security system:</p>
<ul>
<li>Wallet allowlist: only specific wallet addresses are permitted. The list is configured in the server environment — not in the database.</li>
<li>Signed challenge: after connecting an allowed wallet, the admin must sign a cryptographic challenge message with their wallet's private key. This proves ownership of the wallet without revealing any private key.</li>
<li>Server session: after signing, a session cookie is issued valid for 8 hours. Every admin page and every admin action verifies the session server-side before executing.</li>
</ul>
<p>Admin sessions expire after 8 hours. After expiry, the admin must re-authenticate. A live countdown in the admin sidebar shows remaining session time.</p>
<p>Every admin action — approvals, rejections, gate overrides, reward dispatches — is permanently recorded in the audit log with the admin wallet address, timestamp, action type, and a before/after snapshot of the changed data.</p>`,
        order: 33,
      },
      {
        slug: "submissions-management",
        title: "Submissions Management",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Submissions page is the primary daily operations page. It shows all submissions across all statuses with filtering, searching, and action controls.</p>
<h3><strong>Submission actions</strong></h3>
<h3><strong>SOL amount entry</strong></h3>
<p>When approving a submission, the admin enters the exact SOL amount to refund. The maximum is capped by the submitter's tier policy, and the system prevents entering a value above that cap.</p>`,
        order: 34,
      },
      {
        slug: "referral-rewards-management",
        title: "Referral Rewards Management",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Referral Rewards page shows all referral conversions and their point awards. Referral points are awarded automatically through the AI verification gate — no manual SOL dispatch is needed for referrals. The admin page is for monitoring and auditing referral activity.</p>
<h3><strong>How referral points work</strong></h3>
<ul>
<li>Open /admin/referrals to see all referral conversions.</li>
<li>Verified conversions show 500 points awarded to the referrer.</li>
<li>Skipped conversions show the skip reason (self-referral, cap reached, etc.).</li>
<li>The AI ring detector flags suspicious referral patterns (circular refs, chain farming).</li>
<li>Points are awarded automatically by the verify-referrals worker (every 15 minutes).</li>
</ul>`,
        order: 35,
      },
      {
        slug: "receipt-review-moderation",
        title: "Receipt Review (Moderation)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Receipt Review page shows all approved receipt images in a moderation grid. The NEEDS REVIEW filter shows all approved receipts that have not yet been manually checked for sensitive information. Admins should review new approved submissions here and flag any images that contain credit card numbers, phone numbers, full names, or other personal identifying information.</p>`,
        order: 36,
      },
      {
        slug: "gate-overrides",
        title: "Gate Overrides",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Gate Overrides allows an admin to manually pass or fail any individual gate on any submission. This is an emergency tool used when a gate fails due to a system error rather than a user error — for example, if the X API was temporarily down and Gate 1 failed on a legitimate submission.</p>
<p>IMPORTANT: Gate overrides are irreversible and permanently logged in the audit log with the admin wallet address. Every override will be visible in perpetuity. Use only when clearly necessary.</p>`,
        order: 37,
      },
      {
        slug: "audit-log",
        title: "Audit Log",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Audit Log records every admin action ever taken on the platform. It cannot be modified or deleted. Each log entry shows: timestamp, admin wallet address, action type, target (submission ID, conversion ID, etc.), and a JSON diff showing the before and after state of the changed data.</p>
<p>The audit log can be filtered by date range, admin wallet, and action type. It can be exported as a CSV file for offline review.</p>`,
        order: 38,
      },
      {
        slug: "security-and-anti-fraud-measures",
        title: "Security and Anti-Fraud Measures",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Security is multi-layered by design. No single signal is trusted in isolation.</p>
<h3>Control families</h3>
<ul>
<li><strong>Identity controls:</strong> public-account and submission ownership checks.</li>
<li><strong>Artifact controls:</strong> receipt OCR integrity and duplicate fingerprinting.</li>
<li><strong>Rate controls:</strong> tier-based cooldown and replay prevention.</li>
<li><strong>Execution controls:</strong> treasury solvency gate and controlled payout workers.</li>
<li><strong>Governance controls:</strong> auditable admin actions and override logging.</li>
</ul>
<p>Result: attacks must satisfy multiple independent constraints simultaneously, increasing attacker cost and reducing exploit scalability.</p>`,
        order: 48,
      },
      {
        slug: "gate-based-verification",
        title: "Gate-based verification",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The 10-gate sequential system is the primary fraud prevention mechanism. No submission can receive a refund without passing all 10 automated checks. Gates 1-9 are fully automated with no human input. Gate 10 is a final treasury solvency check. No gate can be individually disabled by a user.</p>`,
        order: 49,
        navHidden: true,
      },
      {
        slug: "perceptual-hashing-gate-9",
        title: "Perceptual hashing (Gate 9)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Every receipt image submitted is converted to a perceptual hash — a digital fingerprint of the image content. This hash is compared against all previously submitted receipt hashes. Even minor image edits (cropping, rotating, adjusting brightness) do not meaningfully change the hash. The same physical receipt photographed twice will produce matching hashes and fail Gate 9.</p>`,
        order: 50,
      },
      {
        slug: "-day-wallet-cooldown-gate-8",
        title: "Tier-based submission cooldown (Gate 8)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Submission cooldown is per X account (not per wallet) and varies by tier: Standard and Commuter have a 7-day cooldown (1/week), Road Warrior has a 3.5-day cooldown (2/week), and Fleet has a 1.75-day cooldown (4/week). Linking a different wallet does not reset the timer.</p>`,
        order: 51,
        navHidden: true,
      },
      {
        slug: "receipt-date-validation-gate-7",
        title: "Receipt date validation (Gate 7)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Receipts older than 7 days are rejected. This prevents the use of stockpiled receipts and ensures refunds correspond to recent, real-world gas purchases.</p>`,
        order: 52,
        navHidden: true,
      },
      {
        slug: "wallet-address-on-receipt-gate-5",
        title: "Wallet address on receipt (Gate 5)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Requiring the last 4 characters of a Solana wallet address to be physically written on the paper receipt and visible in the photograph is a low-friction anti-fraud measure. It ties the receipt to a specific wallet that was known at the time of the gas purchase while keeping the process simple for users.</p>`,
        order: 53,
        navHidden: true,
      },
      {
        slug: "admin-audit-trail",
        title: "Admin audit trail",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Every admin action is permanently recorded and cannot be deleted. Gate overrides, approvals, rejections, and reward dispatches all create immutable audit log entries. This ensures no admin action can be taken silently and all platform decisions are accountable.</p>`,
        order: 54,
        navHidden: true,
      },
      {
        slug: "referral-fraud-prevention",
        title: "Referral fraud prevention",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The referral system blocks self-referrals at the database level via a SQL constraint. Referral rewards are capped at 20 conversions and 10,000 points per 30 days per referrer to prevent farming. The referrer must themselves have an approved submission before their referral code is valid. Referral conversion only occurs when the referred user's submission passes all 10 gates.</p>`,
        order: 55,
      },
    ],
  },
  {
    slug: "help",
    label: "Help",
    sections: [
      {
        slug: "start-here-common-issues",
        title: "Start Here — Common Issues & Fast Fixes",
        categorySlug: "help",
        category: "Help",
        description: "Quick triage guide for wallet, tweet, receipt, cooldown, and payout issues.",
        content: `<h3>Fast triage</h3>
<p>Use this checklist before opening support:</p>
<ol>
<li><strong>Wallet:</strong> extension installed, connected, and unlocked.</li>
<li><strong>Tweet:</strong> account public, hashtag present, tweet still live.</li>
<li><strong>Receipt:</strong> physical, legible, dated within policy window, required wallet marks visible.</li>
<li><strong>Cooldown:</strong> verify timer in <a href="/wallet">/wallet</a>.</li>
<li><strong>Treasury queue:</strong> if Gate 10 queued, retries are automatic.</li>
</ol>
<p>Best self-service pages: <a href="/wallet">/wallet</a>, <a href="/gates">/gates</a>, and <a href="/how-it-works">/how-it-works</a>.</p>`,
        order: 38,
      },
      {
        slug: "my-wallet-wont-connect",
        title: "My wallet won't connect",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<ul>
<li>Ensure you have Phantom, Solflare, or Backpack installed as a browser extension</li>
<li>If you see 'Install Phantom', the extension is not detected — install it from the official website and reload the page</li>
<li>Try refreshing the page and connecting again</li>
<li>Ensure your browser allows extensions to run on this site</li>
<li>Try a different browser if the issue persists</li>
</ul>`,
        order: 39,
      },
      {
        slug: "my-tweet-failed-gate-2-not-public",
        title: "My tweet failed Gate 2 (not public)",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<ul>
<li>Go to your X account settings and verify your account is set to public</li>
<li>Note: it can take a few minutes for X to propagate privacy setting changes</li>
<li>Do not switch to private account at any point during the submission process</li>
</ul>`,
        order: 40,
        navHidden: true,
      },
      {
        slug: "my-receipt-failed-gate-5-wallet-not-found-on-recei",
        title: "My receipt failed Gate 5 (wallet not found on receipt)",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<ul>
<li>This is the most common failure — the last 4 characters of your wallet were not readable by OCR</li>
<li>You need a new receipt — the old one has now been logged and cannot be reused</li>
<li>On the new receipt, write the last 4 characters of your wallet larger, in darker ink, in clear printed characters</li>
<li>Take the photo from directly above (not at an angle), in bright light</li>
<li>Before submitting, zoom in on the photo on your phone and verify the characters are readable</li>
</ul>`,
        order: 41,
      },
      {
        slug: "my-receipt-failed-gate-7-date-not-valid",
        title: "My receipt failed Gate 7 (date not valid)",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<ul>
<li>Your gas purchase must be within 7 days of submission</li>
<li>Get a new receipt from a recent purchase and submit with that</li>
<li>Ensure the date on your receipt is clearly printed and not faded</li>
</ul>`,
        order: 42,
        navHidden: true,
      },
      {
        slug: "gate-8-says-im-in-cooldown",
        title: "Gate 8 says I'm in cooldown",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<ul>
<li>Check the Wallet Tracker at /wallet to see your exact cooldown expiry date and time</li>
<li>You must wait until the cooldown timer reaches zero before submitting again</li>
<li>The cooldown runs from your last submission date — duration depends on your tier</li>
</ul>`,
        order: 43,
        navHidden: true,
      },
      {
        slug: "my-submission-is-stuck-on-gate-5-for-a-long-time",
        title: "My submission is stuck on Gate 5 for a long time",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Gate 5 OCR processing can take up to 45 seconds under normal conditions. If more than 2 minutes have elapsed with Gate 5 still showing the spinning icon, this may indicate a processing backlog. Wait 5 minutes and check the Wallet Tracker — if the status has not updated, contact the admin team.</p>`,
        order: 44,
        navHidden: true,
      },
      {
        slug: "gate-10-failed-where-is-my-sol",
        title: "Gate 10 failed — where is my SOL",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Gate 10 failure means the treasury had insufficient SOL at the exact moment your refund was being dispatched. Your submission is in the queue and will be automatically retried. Check the Wallet Tracker — your submission will show status 'pending queue'. No action is required from you. SOL will be dispatched when the treasury is replenished.</p>`,
        order: 45,
      },
      {
        slug: "the-community-feed-shows-no-receipts",
        title: "The community feed shows no receipts",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>The community feed is live data from the database. If no receipts appear, it means no submissions have been approved yet for the current filter. Try switching the filter from MINE to ALL. If ALL shows no receipts, the platform is newly launched and no submissions have been approved yet.</p>`,
        order: 46,
        navHidden: true,
      },
      {
        slug: "the-treasury-balance-shows",
        title: "The treasury balance shows '--'",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>The '--' indicator means the live Solana RPC call has not yet returned data. This typically resolves within 5-10 seconds of page load. If it persists for more than 30 seconds, the RPC endpoint may be temporarily unavailable. Refresh the page to retry.</p>`,
        order: 47,
        navHidden: true,
      },
      {
        slug: "do-i-need-gascoin-tokens-to-participate",
        title: "Do I need GASCOIN tokens to participate?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>The Standard tier requires just 1 GASCOIN token — a minimal buy-in to participate. Higher tiers (Commuter at 100K, Road Warrior at 5M, Fleet at 10M) unlock larger refunds and more submissions per week.</p>`,
        order: 56,
        navHidden: true,
      },
      {
        slug: "how-much-money-will-i-get-back",
        title: "How much money will I get back?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>The exact refund amount is determined by an admin at approval time within your current tier policy. Because SOL price changes daily, GASCOIN does not publish fixed USD-equivalent refund numbers in docs.</p>`,
        order: 57,
        navHidden: true,
      },
      {
        slug: "can-i-submit-more-than-once",
        title: "Can I submit more than once?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Yes — submission frequency depends on your tier. Standard and Commuter can submit once per week, Road Warrior twice per week, and Fleet four times per week. Each submission requires a unique gas receipt from within the last 7 days and a new tweet posted within 48 hours. You cannot reuse a receipt or tweet from a previous submission.</p>`,
        order: 58,
      },
      {
        slug: "do-i-have-to-use-a-specific-gas-station",
        title: "Do I have to use a specific gas station?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>No. Any gas station that provides a paper receipt is accepted. The receipt must show the total amount and the date clearly. The station name and address are recorded for community feed display purposes but do not affect verification.</p>`,
        order: 59,
        navHidden: true,
      },
      {
        slug: "what-if-i-do-not-have-a-twitterx-account",
        title: "What if I do not have a Twitter/X account?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>An active X (Twitter) account is currently required for submission. Gate 3 and Gate 4 both depend on tweet verification via the X API. There is no alternative verification path for users without X accounts at this time.</p>`,
        order: 60,
        navHidden: true,
      },
      {
        slug: "what-is-a-solana-wallet-and-how-do-i-get-one",
        title: "What is a Solana wallet and how do I get one?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>A Solana wallet is a free browser extension that manages your cryptocurrency. The three supported wallets are Phantom (phantom.app), Solflare (solflare.com), and Backpack (backpack.app). All three are free and take approximately 5 minutes to set up. During setup you will be given a seed phrase — write this down and keep it safe. Never share your seed phrase with anyone, including GASCOIN.</p>`,
        order: 61,
      },
      {
        slug: "is-gascoin-real-money",
        title: "Is GASCOIN real money?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>SOL is a real cryptocurrency traded on major exchanges. The SOL you receive in a refund is real and can be converted to USD through any cryptocurrency exchange (Coinbase, Kraken, Binance, etc.). GASCOIN tokens are also real tradeable tokens on the Solana blockchain. Their value fluctuates based on market conditions.</p>`,
        order: 62,
        navHidden: true,
      },
      {
        slug: "where-do-i-write-my-wallet-address-on-the-receipt",
        title: "Where do I write my wallet characters on the receipt?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Write the last 4 characters of your wallet address anywhere on the receipt that is clearly visible in a photograph. Common choices: on the back of the receipt, below the total amount, or in any blank margin space. Use a black pen. Write in clear printed characters. Write large enough that they are legible in a photo from 20-30cm away. It's only 4 characters — quick and easy.</p>`,
        order: 63,
      },
      {
        slug: "what-happens-to-my-receipt-photo-after-submission",
        title: "What happens to my receipt photo after submission?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Your receipt photo is stored in the GASCOIN secure storage system. If your submission is approved, the receipt image may appear on the Community Feed page (with sensitive information redacted by the admin team if necessary). You can view all your own submitted receipt images in the Wallet Tracker. The platform does not sell, share, or use receipt images for any purpose other than verification and community display.</p>`,
        order: 64,
      },
      {
        slug: "can-i-use-gascoin-on-mobile",
        title: "Can I use GASCOIN on mobile?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Yes. The platform is fully responsive and works on mobile browsers. Submitting from mobile has an advantage for the receipt upload step — you can take the photo directly with your phone camera without needing to transfer the file to a desktop. Ensure you have a mobile Solana wallet installed (Phantom and Solflare both have mobile apps).</p>`,
        order: 65,
      },
      {
        slug: "how-do-i-know-my-refund-was-sent",
        title: "How do I know my refund was sent?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>When your submission is approved and the SOL is dispatched, the Wallet Tracker updates your submission status to 'approved' and shows the transaction signature. You can click the transaction signature link to view the transfer on Solscan (the Solana blockchain explorer) where you can verify the exact amount and confirm it arrived in your wallet.</p>`,
        order: 66,
      },
      {
        slug: "what-if-i-made-a-mistake-in-my-submission",
        title: "What if I made a mistake in my submission?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>You cannot edit a submission after it is submitted at Step 4. If you realize there is an error (wrong tweet URL, wrong wallet connected), you can wait for the submission to fail verification and then submit again with the correct information. If the submission has not been processed yet and you need to make an urgent correction, contact the admin team.</p>`,
        order: 67,
      },
      {
        slug: "how-long-does-the-entire-process-take-from-gas-sta",
        title: "How long does the entire process take from gas station to SOL in wallet?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>From completing a gas purchase to having SOL in your wallet typically takes 2-6 hours if everything goes smoothly: about 5-10 minutes to photograph the receipt and post the tweet, 5 minutes for the submission portal, 2-5 minutes for automated verification, and up to 48 hours for the admin to approve and dispatch the SOL refund. In practice, most submissions are processed and dispatched within a few hours.</p>`,
        order: 68,
      },
      {
        slug: "support-and-contact",
        title: "Support and Contact",
        categorySlug: "help",
        category: "Help",
        description: "Getting help with submissions and contacting the team.",
        content: `<h3>Support workflow</h3>
<p>Before contacting support, collect:</p>
<ul>
<li>Submission ID (from Wallet Tracker)</li>
<li>Connected wallet (truncated is fine)</li>
<li>Failed gate or status message</li>
</ul>
<p>Primary diagnostics:</p>
<ul>
<li><strong>/wallet</strong> for claim status, cooldown, and transaction data</li>
<li><strong>/gates</strong> for pass/fail criteria and remediations</li>
<li><strong>Help section</strong> for known issue playbooks</li>
</ul>
<p>Contact channel: <strong>TODO — set official Discord/Telegram/Email endpoint</strong>.</p>`,
        order: 69,
      },
      {
        slug: "points-system-overview",
        title: "Points System — Overview",
        categorySlug: "help",
        category: "Help",
        description: "How the GASCOIN points system works — earning, leaderboard, and rewards.",
        content: `<h3>SOL vs Points — The Core Distinction</h3>
<p><strong>SOL payouts are for gas receipts only.</strong> When you submit a verified gas receipt and it passes all 10 gates, you receive SOL directly to your wallet. The amount depends on your GASCOIN token tier policy at submission time.</p>
<p><strong>Everything else earns points.</strong> Referrals, tweet engagement, submission streaks, and GASCOIN holdings all earn points. Points drive your leaderboard rank, status badges, and platform recognition. Points do not convert to SOL.</p>

<h3>Why Points Matter</h3>
<p>Your leaderboard position is determined entirely by points. The higher your point total, the higher your rank. High-ranking users get visibility on the platform — featured on the leaderboard, recognized in the community feed, and positioned as top contributors. Points are the measure of how much you contribute to the GASCOIN ecosystem beyond just submitting receipts.</p>

<h3>The Five Point Sources</h3>
<table>
<thead><tr><th>Source</th><th>Points</th><th>When Awarded</th></tr></thead>
<tbody>
<tr><td><strong>Tweet Engagement</strong></td><td>Varies by metric</td><td>Every 6 hours via X API</td></tr>
<tr><td><strong>Referral Conversions</strong></td><td>500 per conversion</td><td>When referred user gets approved</td></tr>
<tr><td><strong>Approved Submissions</strong></td><td>1,000 per receipt</td><td>Immediately on admin approval</td></tr>
<tr><td><strong>Streak Bonus</strong></td><td>500 per consecutive window</td><td>Daily at 6am UTC</td></tr>
<tr><td><strong>Holdings Bonus</strong></td><td>25–750 per day by tier</td><td>Daily at 6am UTC</td></tr>
</tbody>
</table>`,
        order: 70,
      },
      {
        slug: "points-tweet-engagement",
        title: "Points — Tweet Engagement",
        categorySlug: "help",
        category: "Help",
        description: "How tweet metrics convert to points.",
        content: `<h3>Tweet Engagement Points</h3>
<p>Every #gascoin tweet linked to a submission is tracked via the X API. Every 6 hours, the system fetches your tweet's real engagement metrics and awards points.</p>

<h3>What Earns Points</h3>
<p>Six engagement metrics are tracked:</p>
<ul>
<li><strong>Impressions</strong> — 1 point each. How many people saw your tweet.</li>
<li><strong>Likes</strong> — 50 points each. Basic engagement signal.</li>
<li><strong>Replies</strong> — 100 points each. Conversations are valued.</li>
<li><strong>Bookmarks</strong> — 150 points each. Saves indicate high-value content.</li>
<li><strong>Retweets</strong> — 250 points each. Amplification is heavily rewarded.</li>
<li><strong>Quote Tweets</strong> — 500 points each. The highest-value engagement.</li>
</ul>

<h3>How Scoring Works</h3>
<p>Points are awarded incrementally. Each 6-hour cycle calculates the delta since the last check. You earn points for new engagement only — not retroactively. Only tweets linked to GASCOIN submissions are scored.</p>`,
        order: 71,
      },
      {
        slug: "points-referrals",
        title: "Points — Referrals",
        categorySlug: "help",
        category: "Help",
        description: "How referral conversions earn points.",
        content: `<h3>Referral Points</h3>
<p>When someone uses your referral link to submit a gas receipt and that receipt gets approved through all 10 gates, you earn <strong>500 points</strong>.</p>

<h3>Eligibility Rules</h3>
<ul>
<li>You must have at least one approved submission yourself to generate a referral link</li>
<li>Self-referrals are blocked — you cannot use your own link</li>
<li>Maximum 20 conversions per 30-day rolling window</li>
<li>Maximum 10,000 points per 30-day rolling window from referrals</li>
</ul>

<h3>When Referral Points Are Skipped</h3>
<table>
<thead><tr><th>Reason</th><th>What It Means</th></tr></thead>
<tbody>
<tr><td>Self-referral</td><td>You submitted using your own referral link</td></tr>
<tr><td>Referrer not approved</td><td>You had no approved submissions when the conversion occurred</td></tr>
<tr><td>Monthly cap reached</td><td>You hit 20 conversions in the rolling 30-day window</td></tr>
<tr><td>Monthly points cap</td><td>You hit 10,000 referral points in the rolling 30-day window</td></tr>
</tbody>
</table>

<p>Referral conversions are checked automatically every 15 minutes by the verification worker.</p>`,
        order: 72,
      },
      {
        slug: "points-submissions-streaks",
        title: "Points — Submissions & Streaks",
        categorySlug: "help",
        category: "Help",
        description: "Submission points and streak bonuses.",
        content: `<h3>Submission Points</h3>
<p>Every time a gas receipt submission is approved by the admin, you earn <strong>1,000 points</strong> immediately. These points are awarded the moment the admin clicks "Approve" — you do not need to wait for the SOL refund to arrive.</p>

<h3>Streak Bonus</h3>
<p>If you submit and get approved in consecutive 30-day windows, you earn a streak bonus. The streak rewards consistency — regular participants earn more than one-off submitters.</p>

<table>
<thead><tr><th>Consecutive Windows</th><th>Streak Bonus</th><th>Total with Submission</th></tr></thead>
<tbody>
<tr><td>1 window (no streak)</td><td>0 points</td><td>1,000 points</td></tr>
<tr><td>2 consecutive</td><td>1,000 points</td><td>2,000 points</td></tr>
<tr><td>3 consecutive</td><td>1,500 points</td><td>2,500 points</td></tr>
<tr><td>4 consecutive</td><td>2,000 points</td><td>3,000 points</td></tr>
<tr><td>5 consecutive (max)</td><td>2,500 points</td><td>3,500 points</td></tr>
</tbody>
</table>

<p>A "window" is a 30-day period. If you miss a window (no approved submission in 30 days), your streak resets to zero. The streak bonus is calculated and awarded daily at 6am UTC.</p>`,
        order: 73,
      },
      {
        slug: "points-holdings",
        title: "Points — GASCOIN Holdings",
        categorySlug: "help",
        category: "Help",
        description: "How holding GASCOIN tokens earns daily points.",
        content: `<h3>Holdings Bonus</h3>
<p>Every day, GASCOIN token holders earn points based on their tier. The more GASCOIN you hold, the more daily points you accumulate. This rewards long-term holders and creates an incentive to acquire and hold GASCOIN beyond just the receipt refund tier benefits.</p>

<table>
<thead><tr><th>Tier</th><th>GASCOIN Required</th><th>Points Per Day</th><th>Points Per Month (30d)</th></tr></thead>
<tbody>
<tr><td>Standard</td><td>1</td><td>25</td><td>750</td></tr>
<tr><td>Commuter</td><td>100,000</td><td>100</td><td>3,000</td></tr>
<tr><td>Road Warrior</td><td>5,000,000</td><td>300</td><td>9,000</td></tr>
<tr><td>Fleet</td><td>10,000,000</td><td>750</td><td>22,500</td></tr>
</tbody>
</table>

<h3>How It Works</h3>
<p>Your GASCOIN balance is checked on-chain and cached. Every day at 6am UTC, the daily points worker reads your cached tier and awards the corresponding points. If your tier changes (you buy or sell GASCOIN), the next day's award reflects the new tier.</p>
<p>Holdings points compound over time. A Fleet holder who participates for 6 months accumulates 135,000 points from holdings alone — before any tweets, referrals, or submissions.</p>`,
        order: 74,
      },
      {
        slug: "points-leaderboard-formula",
        title: "Points — Leaderboard Formula",
        categorySlug: "help",
        category: "Help",
        description: "How the leaderboard composite score is calculated.",
        content: `<h3>How Your Rank Is Determined</h3>
<p>Your leaderboard position is calculated from a proprietary composite score that weighs three factors:</p>
<ul>
<li><strong>Referral activity</strong> — bringing new verified users into the ecosystem is heavily rewarded</li>
<li><strong>Platform engagement</strong> — tweet performance, submission consistency, and streak maintenance all contribute</li>
<li><strong>GASCOIN holdings</strong> — long-term holders who have skin in the game are recognized</li>
</ul>
<p>The exact weights are dynamic and may be adjusted to maintain healthy platform growth. All three factors matter — focusing on only one will not maximize your rank.</p>

<h3>What the Leaderboard Does NOT Factor</h3>
<p>SOL earned from receipt refunds is <strong>not</strong> a factor in the leaderboard. A user who received one large refund does not outrank a user who consistently refers new members and posts engaging tweets. The leaderboard rewards contribution to the ecosystem, not receipt size.</p>

<h3>Integrity</h3>
<p>An automated AI audit runs daily across the points system. It monitors for anomalies, duplicate entries, and suspicious patterns. Any flagged issues are reviewed and corrected to maintain fair rankings.</p>`,
        order: 75,
      },
      {
        slug: "quick-reference-card",
        title: "Quick Reference Card",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>GASCOIN Protocol Documentation — Version 1.0</p>
<p>gascoin.com  |  Solana Mainnet  |  All rights reserved</p>`,
        order: 69,
        navHidden: true,
      },
    ],
  },
];

export function getAllSections(): DocSection[] {
  return DOC_CATEGORIES.flatMap((c) => c.sections).sort((a, b) => a.order - b.order);
}

export function getSectionBySlug(slug: string): DocSection | undefined {
  return getAllSections().find((s) => s.slug === slug);
}

export function getAdjacentSections(slug: string): { prev: DocSection | null; next: DocSection | null } {
  const all = getAllSections();
  const idx = all.findIndex((s) => s.slug === slug);
  return { prev: idx > 0 ? all[idx - 1] : null, next: idx < all.length - 1 ? all[idx + 1] : null };
}
