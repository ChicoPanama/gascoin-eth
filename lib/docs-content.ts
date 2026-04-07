export interface DocSection {
  slug: string;
  title: string;
  category: string;
  categorySlug: string;
  description: string;
  content: string;
  order: number;
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
        title: "1. What Is GASCOIN",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<div style="border:1px solid rgba(255,255,255,0.15);padding:16px 20px;margin-bottom:24px;background:rgba(255,255,255,0.03)">
<p><strong>Document status — read before proceeding</strong></p>
<p>This documentation describes the GASCOIN platform as designed and intended. Some features may be in the process of being deployed. If you notice a difference between this document and the live platform, the live platform takes precedence. This document will be updated as the platform rolls out.</p>
<p>Last updated: April 2026 · Platform version: 1.0 · Document version: 1.1</p>
</div><p>GASCOIN is a community-driven protocol on the Solana blockchain that refunds participants for real-world gasoline purchases. The protocol operates a treasury wallet funded with SOL (Solana's native cryptocurrency). Users who meet all verification requirements receive a SOL refund sent directly to their Solana wallet.</p>
<p>The concept is straightforward: you pay for gas at a physical gas station, you prove it, and GASCOIN pays you back in SOL. The amount refunded in SOL is determined by the tier of GASCOIN tokens you hold in your wallet. The entire process is governed by 10 automated verification gates that run sequentially on every submission before any funds are released.</p><h3>Who Can Participate</h3>
<p>GASCOIN is open to anyone worldwide who can obtain a gas station receipt and has a public X account. There is no geographic restriction. Gas stations in the United States, Canada, UK, Europe, Latin America, and anywhere else that issues paper receipts all qualify.</p>
<p>The platform uses the term "gas station" but petrol stations, service stations, fuel depots, and any commercial fuel retailer that issues a paper receipt also qualify.</p>
<p>There is no minimum purchase amount. A \$5 fuel purchase qualifies the same as a \$200 fill-up. The refund amount is set by the admin based on your tier cap — it is not proportional to how much you spent on fuel.</p>`,
        order: 1,
      },
      {
        slug: "core-concept-in-plain-english",
        title: "1.1 Core Concept in Plain English",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<ul>
<li>You fill up your gas tank at any gas station.</li>
<li>Before or after filling up, you write your Solana wallet address on the receipt in pen.</li>
<li>You post a tweet on X (formerly Twitter) containing the hashtag #gascoin.</li>
<li>You visit platform-ebon-nine.vercel.app and click Submit.</li>
<li>You connect your Solana wallet, paste your tweet URL, and upload a photo of your receipt.</li>
<li>The system automatically runs 10 verification checks on your submission.</li>
<li>If all 10 checks pass, SOL is sent directly to your wallet within 24-48 hours.</li>
</ul>`,
        order: 2,
      },
      {
        slug: "what-you-receive",
        title: "1.2 What You Receive",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<h3>Understanding SOL value</h3>
<p>All refund amounts on GASCOIN are denominated in SOL, Solana's native cryptocurrency. SOL's price fluctuates with the market. As a rough guide:</p>
<table><thead><tr><th>Tier</th><th>GASCOIN Required</th><th>Max SOL Refund</th><th>Approx. USD at $180/SOL</th></tr></thead>
<tbody><tr><td>Standard</td><td>0</td><td>0.10 SOL</td><td>~$18 USD</td></tr>
<tr><td>Commuter</td><td>100,000</td><td>0.25 SOL</td><td>~$45 USD</td></tr>
<tr><td>Road Warrior</td><td>500,000</td><td>0.50 SOL</td><td>~$90 USD</td></tr>
<tr><td>Fleet</td><td>2,000,000</td><td>1.0 SOL</td><td>~$180 USD</td></tr></tbody></table>
<p>Check the current SOL price on any exchange (Coinbase, Kraken, Binance) or on the GASCOIN Treasury page before submitting. The USD values above are approximate and change daily. The SOL amounts you receive are fixed by tier.</p>\n<p>The amount of SOL you can receive per submission depends on your GASCOIN token tier. The four tiers are:</p>
<p>SOL values above are the maximum per submission. The admin sets the actual refund amount when approving your submission, up to the maximum for your tier. The Standard tier requires zero GASCOIN — anyone with a Solana wallet can participate immediately.</p>`,
        order: 3,
      },
      {
        slug: "what-you-need-before-starting",
        title: "1.3 What You Need Before Starting",
        categorySlug: "overview",
        category: "Overview",
        description: "",
        content: `<ul>
<li><strong>Required: </strong>A Solana wallet — Phantom, Solflare, or Backpack (all free to install)</li>
<li><strong>Required: </strong>An X (Twitter) account set to public</li>
<li><strong>Required: </strong>A physical gas receipt from a real gas station purchase within the last 7 days</li>
<li><strong>Required: </strong>A pen to write your wallet address on the receipt</li>
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
        title: "2. The Submission Process — Complete Step-by-Step Guide",
        categorySlug: "submitting",
        category: "Submitting",
        description: "",
        content: `<p>Every refund claim on GASCOIN is called a submission. A submission takes you through 5 steps. You must complete all 5 steps in order. You cannot skip a step. Your progress is saved within the session — if you navigate away and return, you will start from Step 1 again.</p>
<p>Access the submission portal by clicking Submit in the navigation bar or visiting /submit directly.</p>`,
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
<li>Each X account can submit once every 7 days. If you have an active or recently approved submission, you must wait until the 7-day cooldown expires.</li>
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
        content: `<p>Step 3 requires you to upload a photo of your gas receipt. This is the physical paper receipt from a real gas station. The receipt must have your Solana wallet address written on it in pen.</p>
<p>IMPORTANT: You must write your Solana wallet address on the physical receipt BEFORE photographing it. The address must be clearly legible in the photo. This is a required element — submissions without a readable wallet address on the receipt will fail Gate 5 and be rejected.</p>
<h3><strong>How to prepare your receipt</strong></h3>
<ul>
<li>Obtain the paper receipt from the gas station at the time of purchase, or retrieve a saved receipt from within the last 7 days.</li>
<li>Using a black pen, write your full Solana wallet address clearly on the receipt. Write it large enough to be readable in a photograph. Your wallet address is 44 characters long and consists of numbers and letters.</li>
<li>Place the receipt flat on a bright surface. Do not crumple, fold, or obscure any part of the receipt.</li>
<li>Photograph the receipt using your phone camera in good lighting. The entire receipt must be visible. The total amount, date, and your written wallet address must all be clearly readable.</li>
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
<li>My wallet address is written on the receipt</li>
</ul>
<p>All 3 checkboxes must be checked. The Next button remains disabled until all 3 are checked. This is by design — you are certifying that your upload meets the requirements before submitting.</p><h3>Physical receipts only</h3>
<p>GASCOIN requires a photograph of a physical paper receipt from the gas station. Digital receipts — including email receipts, in-app receipts, SMS receipts, and PDF receipts — cannot be accepted because the verification system requires you to write your Solana wallet address directly on the receipt in pen before photographing it.</p>
<p>If your gas station does not offer paper receipts, ask the attendant for a printed copy at the time of purchase.</p>
<h3>Receipt photography — do's and don'ts</h3>
<p>Gate 5 (Wallet on Receipt) is the most commonly failed gate. Follow these rules exactly:</p>
<p><strong>DO:</strong></p>
<ul>
<li>Write the wallet address on the BACK of the receipt if the front is too small</li>
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
<li>Submit if ANY character of the address is unclear — retake the photo</li>
</ul>
<p>Your wallet address is 44 characters long. On a narrow thermal receipt, you may need to write it across two lines. That is fine.</p>
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
        title: "3. The 10 Verification Gates — Complete Reference",
        categorySlug: "verification",
        category: "Verification Gates",
        description: "",
        content: `<p>Every GASCOIN submission must pass 10 sequential verification gates before SOL is released. Gates are checked in order from 1 to 10. If a gate fails, all subsequent gates are skipped and the submission is marked incomplete. Gate 10 is the only exception — it is non-blocking, meaning a failure queues the submission rather than rejecting it.</p>
<p>Gate logic is immutable and cannot be manually adjusted by users. Administrators can manually override individual gates in exceptional circumstances, but every override is permanently logged.</p>`,
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
<p>Gate 5 uses optical character recognition (OCR) to scan your receipt photo for a Solana wallet address. The system searches for a string matching Solana address format (32-44 base58 characters) and then compares the extracted address against the wallet you connected in Step 1. Both must match exactly.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Wallet address written too small to be read by OCR</li>
<li>Address written in pencil or light ink — low contrast against receipt paper</li>
<li>Photo taken at an angle that distorts the handwritten text</li>
<li>Wallet address written on a separate piece of paper held next to the receipt — must be written directly on the receipt</li>
<li>Wrong wallet address written — different from the wallet connected in Step 1</li>
<li>Address partially obscured by a fold or crease in the receipt</li>
</ul>
<h3><strong>How to ensure Gate 5 passes</strong></h3>
<p>Write your full wallet address in black pen directly on the receipt. Use clear, printed characters. Write large — at least 3-4mm tall. Double-check every character before photographing. Take the photo from directly above, not at an angle.</p>
<p>IMPORTANT: This is the most commonly failed gate. Before submitting, zoom in on your receipt photo on your phone and verify the wallet address is fully readable. If you cannot read it clearly, retake the photo.</p>`,
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
<p>Gate 8 checks that your X account has not submitted a claim in the last 7 days. The cooldown is tied to your X account, not your wallet — switching wallets does not reset the timer.</p>
<h3><strong>Common failure reasons</strong></h3>
<ul>
<li>Submitting again before 7 days have passed since your last submission</li>
<li>Having a pending or in-review submission still active</li>
</ul>
<h3><strong>How to ensure Gate 8 passes</strong></h3>
<p>Wait 7 days after your last submission before submitting again. Use the Wallet Tracker at /wallet to check your cooldown status.</p>
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
    slug: "platform",
    label: "Platform Pages",
    sections: [
      {
        slug: "platform-pages-complete-reference",
        title: "4. Platform Pages — Complete Reference",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The GASCOIN platform has 10 public-facing pages accessible from the navigation bar. This section documents every page, what it shows, and how to use it.</p>`,
        order: 22,
      },
      {
        slug: "homepage",
        title: "4.1 Homepage (/)",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The homepage is the primary entry point for new visitors. It introduces the GASCOIN concept and directs users to submit their first receipt.</p>
<h3><strong>What the homepage shows</strong></h3>
<ul>
<li>Navigation bar with links to all platform pages and a CONNECT WALLET button</li>
<li>Hero section with the GASCOIN value proposition: POST. SUBMIT. GET PAID BACK.</li>
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
        title: "4.2 Submit Page (/submit)",
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
        title: "4.3 Community Feed (/community)",
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
        title: "4.4 Leaderboard (/leaderboard)",
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
        title: "4.5 Wallet Tracker (/wallet)",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Wallet Tracker is your personal submission status dashboard. It shows your complete submission history, current gate progress for any active submission, cooldown countdown, and total earnings. It can also be used to look up any public wallet address.</p>
<h3><strong>Two modes</strong></h3>
<h3><strong>Cooldown countdown</strong></h3>
<p>In Connected Mode, if your account is within the 7-day cooldown period following a submission, a countdown timer shows how much time remains before you can submit again.</p>
<p>When the countdown reaches zero, the cooldown block automatically transitions to show Submit Receipt with a link to the submission portal.</p>
<h3><strong>Gate progress tracker</strong></h3>
<p>If you have a pending submission (one that has been submitted but not yet approved or rejected), the gate progress tracker appears. It shows all 10 gates with their current status updating live as each gate is processed. This is the same display as Step 5 of the submission portal but accessible at any time from /wallet.</p>
<h3><strong>URL deep linking</strong></h3>
<p>The Wallet Tracker supports URL parameters. Visiting /wallet?address=SOLANA_ADDRESS_HERE automatically loads that address in Lookup Mode without requiring the user to paste the address. This link format is used by the leaderboard View buttons.</p>`,
        order: 27,
      },
      {
        slug: "referral-engine-referral",
        title: "4.6 Referral Engine (/referral)",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Referral Engine allows approved GASCOIN submitters to earn points by referring new users to the platform. When someone uses your referral link to submit and gets approved, you earn 500 points that boost your leaderboard rank and status.</p>
<h3><strong>Who can use the referral system</strong></h3>
<p>You must have at least one approved submission to generate a referral link and earn rewards. Users without any approved submission can see the referral page but the link generation is locked until they complete a successful submission.</p>
<h3><strong>Your referral link</strong></h3>
<p>Your referral link is unique to your wallet address and is deterministically generated — it never changes. The format is: https://platform-ebon-nine.vercel.app/submit?ref=XXXXXXXX where XXXXXXXX is your 8-character referral code.</p>
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
        title: "4.7 Token Perks (/perks)",
        categorySlug: "platform",
        category: "Platform Pages",
        description: "",
        content: `<p>The Perks page explains the GASCOIN token tier system. Holding GASCOIN tokens in your connected wallet unlocks higher refund caps, priority queue processing, and exclusive badges visible across the platform.</p>
<h3><strong>The four tiers</strong></h3>
<h3><strong>How tier is determined</strong></h3>
<p>The system checks your connected wallet's GASCOIN token balance live on the Solana blockchain when you connect. The balance is also cached and refreshed every 5 minutes. If you buy more GASCOIN and want to see your updated tier immediately, click the Refresh Balance button on the Perks page.</p>
<h3><strong>When tier is applied</strong></h3>
<p>Your tier is snapshotted at the time of submission. If you are Commuter tier when you submit, the Commuter refund cap (0.25 SOL) applies to that submission — even if you later sell your GASCOIN before the refund is dispatched. Conversely, if you upgrade your tier after submitting but before approval, the original tier at submission time is what applies.</p>
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
        title: "4.8 Treasury / Dashboard (/dashboard)",
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
        title: "4.9 Gates Page (/gates)",
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
        title: "5. Admin Dashboard (/admin)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Admin Dashboard is the internal operations interface for platform operators. It is secured behind wallet-based authentication and is accessible only to wallet addresses in the admin allowlist.</p>
<p>The admin dashboard is NOT accessible to regular users. Attempting to visit /admin redirects to the admin login page. Connecting a non-admin wallet on the login page returns an Access Denied message.</p>`,
        order: 32,
      },
      {
        slug: "admin-authentication",
        title: "5.1 Admin Authentication",
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
        title: "5.2 Submissions Management",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Submissions page is the primary daily operations page. It shows all submissions across all statuses with filtering, searching, and action controls.</p>
<h3><strong>Submission actions</strong></h3>
<h3><strong>SOL amount entry</strong></h3>
<p>When approving a submission, the admin enters the exact SOL amount to refund. The maximum is capped at the submitter's tier cap (Standard: 0.10, Commuter: 0.25, Road Warrior: 0.50, Fleet: 1.0 SOL). The system prevents entering a value above the tier cap.</p>`,
        order: 34,
      },
      {
        slug: "referral-rewards-management",
        title: "5.3 Referral Rewards Management",
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
        title: "5.4 Receipt Review (Moderation)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Receipt Review page shows all approved receipt images in a moderation grid. The NEEDS REVIEW filter shows all approved receipts that have not yet been manually checked for sensitive information. Admins should review new approved submissions here and flag any images that contain credit card numbers, phone numbers, full names, or other personal identifying information.</p>`,
        order: 36,
      },
      {
        slug: "gate-overrides",
        title: "5.5 Gate Overrides",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Gate Overrides allows an admin to manually pass or fail any individual gate on any submission. This is an emergency tool used when a gate fails due to a system error rather than a user error — for example, if the X API was temporarily down and Gate 1 failed on a legitimate submission.</p>
<p>IMPORTANT: Gate overrides are irreversible and permanently logged in the audit log with the admin wallet address. Every override will be visible in perpetuity. Use only when clearly necessary.</p>`,
        order: 37,
      },
      {
        slug: "audit-log",
        title: "5.6 Audit Log",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The Audit Log records every admin action ever taken on the platform. It cannot be modified or deleted. Each log entry shows: timestamp, admin wallet address, action type, target (submission ID, conversion ID, etc.), and a JSON diff showing the before and after state of the changed data.</p>
<p>The audit log can be filtered by date range, admin wallet, and action type. It can be exported as a CSV file for offline review.</p>`,
        order: 38,
      },
      {
        slug: "security-and-anti-fraud-measures",
        title: "7. Security and Anti-Fraud Measures",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>GASCOIN uses multiple overlapping systems to prevent fraud, duplicate submissions, and gaming of the refund system.</p><h3>Using Multiple Wallets</h3>
<p>Each X account is limited to one submission per 7 days. Only one wallet can be linked to your X account at a time. Switching wallets does not reset the cooldown — it is tied to your X identity, not your wallet address. Each submission requires a unique receipt (Gate 9), a unique tweet, and a unique gas purchase.</p>`,
        order: 48,
      },
      {
        slug: "gate-based-verification",
        title: "7.1 Gate-based verification",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>The 10-gate sequential system is the primary fraud prevention mechanism. No submission can receive a refund without passing all 10 automated checks. Gates 1-9 are fully automated with no human input. Gate 10 is a final treasury solvency check. No gate can be individually disabled by a user.</p>`,
        order: 49,
      },
      {
        slug: "perceptual-hashing-gate-9",
        title: "7.2 Perceptual hashing (Gate 9)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Every receipt image submitted is converted to a perceptual hash — a digital fingerprint of the image content. This hash is compared against all previously submitted receipt hashes. Even minor image edits (cropping, rotating, adjusting brightness) do not meaningfully change the hash. The same physical receipt photographed twice will produce matching hashes and fail Gate 9.</p>`,
        order: 50,
      },
      {
        slug: "-day-wallet-cooldown-gate-8",
        title: "7.3 7-day submission cooldown (Gate 8)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Each X account can submit once every 7 days. The cooldown is per X account, not per wallet — linking a different wallet does not reset the timer. This aligns with real-world gas fill-up frequency and prevents abuse.</p>`,
        order: 51,
      },
      {
        slug: "receipt-date-validation-gate-7",
        title: "7.4 Receipt date validation (Gate 7)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Receipts older than 7 days are rejected. This prevents the use of stockpiled receipts and ensures refunds correspond to recent, real-world gas purchases.</p>`,
        order: 52,
      },
      {
        slug: "wallet-address-on-receipt-gate-5",
        title: "7.5 Wallet address on receipt (Gate 5)",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Requiring the Solana wallet address to be physically written on the paper receipt and visible in the photograph is a high-friction anti-fraud measure. It is difficult to fabricate a convincing receipt with a handwritten wallet address, and it ties the refund irrevocably to a specific wallet that was known at the time of the gas purchase.</p>`,
        order: 53,
      },
      {
        slug: "admin-audit-trail",
        title: "7.6 Admin audit trail",
        categorySlug: "security",
        category: "Security & Admin",
        description: "",
        content: `<p>Every admin action is permanently recorded and cannot be deleted. Gate overrides, approvals, rejections, and reward dispatches all create immutable audit log entries. This ensures no admin action can be taken silently and all platform decisions are accountable.</p>`,
        order: 54,
      },
      {
        slug: "referral-fraud-prevention",
        title: "7.7 Referral fraud prevention",
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
      },
      {
        slug: "my-receipt-failed-gate-5-wallet-not-found-on-recei",
        title: "My receipt failed Gate 5 (wallet not found on receipt)",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<ul>
<li>This is the most common failure — your wallet address was not readable by OCR</li>
<li>You need a new receipt — the old one has now been logged and cannot be reused</li>
<li>On the new receipt, write your wallet address larger, in darker ink, in clear printed characters</li>
<li>Take the photo from directly above (not at an angle), in bright light</li>
<li>Before submitting, zoom in on the photo on your phone and verify every character of the address is readable</li>
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
<li>The 7-day cooldown runs from your last submission date</li>
</ul>`,
        order: 43,
      },
      {
        slug: "my-submission-is-stuck-on-gate-5-for-a-long-time",
        title: "My submission is stuck on Gate 5 for a long time",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Gate 5 OCR processing can take up to 45 seconds under normal conditions. If more than 2 minutes have elapsed with Gate 5 still showing the spinning icon, this may indicate a processing backlog. Wait 5 minutes and check the Wallet Tracker — if the status has not updated, contact the admin team.</p>`,
        order: 44,
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
      },
      {
        slug: "the-treasury-balance-shows",
        title: "The treasury balance shows '--'",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>The '--' indicator means the live Solana RPC call has not yet returned data. This typically resolves within 5-10 seconds of page load. If it persists for more than 30 seconds, the RPC endpoint may be temporarily unavailable. Refresh the page to retry.</p>`,
        order: 47,
      },
      {
        slug: "do-i-need-gascoin-tokens-to-participate",
        title: "Do I need GASCOIN tokens to participate?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>No. The Standard tier requires zero GASCOIN tokens. Any person with a Solana wallet can submit a gas receipt and receive up to 0.10 SOL without holding any GASCOIN. Tokens are optional and only required to access higher tiers with larger refund caps.</p>`,
        order: 56,
      },
      {
        slug: "how-much-money-will-i-get-back",
        title: "How much money will I get back?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>The exact refund amount is determined by an admin when approving your submission, up to the maximum for your tier: Standard = 0.10 SOL, Commuter = 0.25 SOL, Road Warrior = 0.50 SOL, Fleet = 1.0 SOL. Convert these to USD using the current SOL price on any exchange. At $180 SOL, the Standard tier maximum is ~$18 per submission.</p>`,
        order: 57,
      },
      {
        slug: "can-i-submit-more-than-once",
        title: "Can I submit more than once?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Yes — once every 7 days per X account. Each submission requires a unique gas receipt from within the last 7 days and a new tweet posted within 48 hours of submission. You cannot reuse a receipt or tweet from a previous submission.</p>`,
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
      },
      {
        slug: "what-if-i-do-not-have-a-twitterx-account",
        title: "What if I do not have a Twitter/X account?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>An active X (Twitter) account is currently required for submission. Gate 3 and Gate 4 both depend on tweet verification via the X API. There is no alternative verification path for users without X accounts at this time.</p>`,
        order: 60,
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
      },
      {
        slug: "where-do-i-write-my-wallet-address-on-the-receipt",
        title: "Where do I write my wallet address on the receipt?",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>Anywhere on the receipt that is clearly visible in a photograph is acceptable. Common choices: on the back of the receipt, below the total amount, or in any blank margin space. Use a black pen. Write in clear printed characters. Write large enough that the address is legible in a photo from 20-30cm away. Your wallet address is 44 characters long — you may need to use the full back of the receipt.</p>`,
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
        title: "10. Support and Contact",
        categorySlug: "help",
        category: "Help",
        description: "Getting help with submissions and contacting the team.",
        content: `<h3>Getting help with a submission</h3>
<p>If you have a question about a specific submission, check these self-service resources first:</p>
<ul>
<li><strong>Wallet Tracker (/wallet)</strong> — shows your submission status, gate results, and failure reasons</li>
<li><strong>Gates page (/gates)</strong> — explains every verification gate and how to fix failures</li>
<li><strong>FAQ (this section)</strong> — covers the most common questions</li>
</ul>
<h3>Contacting the team</h3>
<p>TODO: Add your support channel here — Discord / Telegram / Email</p>
<p>When contacting support, include your:</p>
<ul>
<li>Submission ID (shown in Wallet Tracker as GC-YYYY-XXXXX)</li>
<li>Wallet address (truncated is fine)</li>
<li>Description of the issue</li>
</ul>
<h3>Urgent submissions</h3>
<p>If you submitted with an error (wrong tweet URL, wrong wallet) before gates have started processing, contact the team immediately with your submission ID. After verification begins, submissions cannot be modified.</p>`,
        order: 69,
      },
      {
        slug: "points-system-overview",
        title: "Points System — Overview",
        categorySlug: "help",
        category: "Help",
        description: "How the GASCOIN points system works — earning, leaderboard, and rewards.",
        content: `<h3>SOL vs Points — The Core Distinction</h3>
<p><strong>SOL payouts are for gas receipts only.</strong> When you submit a verified gas receipt and it passes all 10 gates, you receive SOL directly to your wallet. The amount depends on your GASCOIN token tier (Standard: 0.10 SOL, Commuter: 0.25 SOL, Road Warrior: 0.50 SOL, Fleet: 1.0 SOL).</p>
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
<p>Five engagement metrics are tracked, each weighted differently:</p>
<ul>
<li><strong>Impressions</strong> — how many people saw your tweet. High reach = more points.</li>
<li><strong>Likes</strong> — basic engagement signal.</li>
<li><strong>Replies</strong> — conversations are worth more than passive likes.</li>
<li><strong>Retweets</strong> — amplification is heavily rewarded. Shares spread the word to new audiences.</li>
<li><strong>Quote Tweets</strong> — the highest-value engagement. Original commentary plus amplification.</li>
</ul>
<p>The exact point values per metric are proprietary and may be adjusted to maintain fair scoring. In general: quality engagement (retweets, quotes, replies) is worth significantly more than passive metrics (impressions).</p>

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
<tr><td>Standard</td><td>0</td><td>25</td><td>750</td></tr>
<tr><td>Commuter</td><td>100,000</td><td>100</td><td>3,000</td></tr>
<tr><td>Road Warrior</td><td>500,000</td><td>300</td><td>9,000</td></tr>
<tr><td>Fleet</td><td>2,000,000</td><td>750</td><td>22,500</td></tr>
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
        title: "12. Quick Reference Card",
        categorySlug: "help",
        category: "Help",
        description: "",
        content: `<p>GASCOIN Protocol Documentation — Version 1.0</p>
<p>platform-ebon-nine.vercel.app  |  Solana Mainnet  |  All rights reserved</p>`,
        order: 69,
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