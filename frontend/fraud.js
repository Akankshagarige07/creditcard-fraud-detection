/**
 * FraudShield India — Frontend JavaScript
 * Handles form submission, API call to Flask, and rendering results.
 *
 * HOW TO USE:
 *   In index.html, add this at the bottom of <body>:
 *   <script src="static/js/fraud.js"></script>
 */

const form       = document.getElementById('fraudForm');
const analyzeBtn = document.getElementById('analyzeBtn');
const spinner    = document.getElementById('spinner');
const btnText    = document.getElementById('btnText');

// ── Form Submit Handler ────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Show loading state
  analyzeBtn.disabled    = true;
  spinner.style.display  = 'block';
  btnText.textContent    = 'Analyzing...';

  // Collect all form values into a JSON object
  const payload = {
    transaction_amount:     parseFloat(document.getElementById('transaction_amount').value),
    avg_transaction_amount: parseFloat(document.getElementById('avg_amount').value),
    transaction_hour:       parseInt(document.getElementById('txn_hour').value),
    day_of_week:            parseInt(document.getElementById('day_of_week').value),
    merchant_category:      document.getElementById('merchant').value,
    city:                   document.getElementById('city').value,
    distance_from_home_km:  parseFloat(document.getElementById('distance').value),
    transactions_last_24h:  parseInt(document.getElementById('txn_24h').value),
    is_international:       document.getElementById('is_international').checked ? 1 : 0,
    is_online:              document.getElementById('is_online').checked ? 1 : 0,
    card_present:           document.getElementById('card_present').checked ? 1 : 0,
  };

  try {
    // ── Send POST request to Flask /predict API ──────────────────────────
    const response = await fetch('/predict', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    const result = await response.json();

    if (result.success) {
      showResult(result);
    } else {
      alert('Error from server: ' + result.error);
    }

  } catch (err) {
    alert('Could not connect to Flask server.\nMake sure you ran: python app.py');
    console.error(err);
  }

  // Reset button
  analyzeBtn.disabled   = false;
  spinner.style.display = 'none';
  btnText.textContent   = '🔍 Analyze Transaction';
});


// ── Render the Prediction Result ──────────────────────────────────────────────
function showResult(r) {
  // Hide placeholder, show result panel
  document.getElementById('resultPlaceholder').classList.add('hidden');
  document.getElementById('resultContent').classList.remove('hidden');

  const isFraud = r.is_fraud;

  // ── Verdict icon & title ─────────────────────────────────────────────────
  document.getElementById('verdictIcon').textContent  = isFraud ? '🚨' : '✅';
  document.getElementById('verdictTitle').textContent = isFraud
    ? 'FRAUD DETECTED!'
    : 'Transaction is Safe';
  document.getElementById('verdictTitle').className   = 'verdict-title ' + (isFraud ? 'fraud' : 'safe');
  document.getElementById('verdictSub').textContent   = isFraud
    ? 'This transaction has been flagged as potentially fraudulent. Please contact your bank immediately.'
    : 'This transaction appears normal based on your spending patterns.';

  // ── Risk badge (HIGH / MEDIUM / LOW) ─────────────────────────────────────
  const riskLevel = r.risk_level.split(' ')[0]; // "HIGH RISK" → "HIGH"
  document.getElementById('riskBadge').innerHTML =
    `<span class="risk-badge risk-${riskLevel}">● ${r.risk_level}</span>`;

  // ── Animated probability bar ──────────────────────────────────────────────
  const prob = r.fraud_probability;
  const bar  = document.getElementById('probBar');
  bar.className = 'prob-bar-fill ' + (isFraud ? 'fraud-fill' : 'safe-fill');
  bar.style.width = '0%';
  // Small delay so CSS transition plays
  setTimeout(() => { bar.style.width = prob + '%'; }, 100);
  document.getElementById('probValue').textContent = prob + '%';

  // ── Stats boxes ───────────────────────────────────────────────────────────
  document.getElementById('statFraud').textContent = r.fraud_probability + '%';
  document.getElementById('statSafe').textContent  = r.normal_probability + '%';
  document.getElementById('statRisk').textContent  = riskLevel;
  document.getElementById('statRisk').style.color  =
    riskLevel === 'HIGH'   ? 'var(--danger)'  :
    riskLevel === 'MEDIUM' ? 'var(--warning)' : 'var(--success)';

  // ── Detection reasons list ────────────────────────────────────────────────
  const reasonsList = document.getElementById('reasonsList');
  reasonsList.innerHTML = '';

  if (r.reasons && r.reasons.length > 0) {
    r.reasons.forEach(reason => {
      const div       = document.createElement('div');
      div.className   = 'reason-item ' + (isFraud ? 'fraud-reason' : 'safe-reason');
      div.textContent = reason;
      reasonsList.appendChild(div);
    });
  } else {
    const div       = document.createElement('div');
    div.className   = 'reason-item safe-reason';
    div.textContent = '✅ No suspicious patterns found in this transaction.';
    reasonsList.appendChild(div);
  }

  // ── Scroll to result panel on mobile ─────────────────────────────────────
  if (window.innerWidth < 800) {
    document.getElementById('resultCard')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}