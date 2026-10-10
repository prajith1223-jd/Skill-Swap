(async function init() {
  await renderLayout('buy-coins');
})();

let selectedAmount = 0;
let selectedPrice = 0;
let selectedPackName = "";

async function startPayment(coins, price, packName) {
  selectedAmount = coins;
  selectedPrice = price;
  selectedPackName = packName;
  
  // Show loading toast
  showToast('Initializing secure checkout...', 'success');

  try {
    // 0. Fetch config for Cashfree
    const config = await api('/users/me/coins/config', { method: 'GET' });

    // 1. Create order on backend
    const order = await api('/users/me/coins/order', {
      method: 'POST',
      body: { amount: selectedAmount, price: selectedPrice }
    });

    if (!config.key_id || config.key_id.includes('dummy')) {
      return simulateCashfreeUI(order);
    }

    // 2. Open real Cashfree Checkout
    const cashfree = Cashfree({ mode: "sandbox" });
    
    let checkoutOptions = {
        paymentSessionId: order.payment_session_id,
        redirectTarget: "_modal",
    };
    
    cashfree.checkout(checkoutOptions).then(async (result) => {
        if (result.error) {
            showToast('Payment failed: ' + result.error.message, 'error');
        } else if (result.paymentDetails) {
            showToast('Payment successful, verifying...', 'success');
            try {
              await api('/users/me/coins/verify', {
                method: 'POST',
                body: {
                  amount: selectedAmount,
                  order_id: order.order_id
                }
              });
              handlePaymentSuccess();
            } catch (err) {
              showToast('Payment verification failed: ' + err.message, 'error');
            }
        }
    });

  } catch (err) {
    showToast('Failed to initialize payment: ' + err.message, 'error');
  }
}

window.simulateCashfreeUI = function(order) {
  const modal = document.getElementById('payment-modal');
  const content = document.getElementById('payment-content');
  
  content.innerHTML = `
    <div style="background:#5e35b1; color:white; padding:16px; border-radius:12px 12px 0 0; display:flex; justify-content:space-between; align-items:center; margin: -24px -24px 24px -24px;">
      <div style="font-weight:bold; font-size: 18px; display:flex; align-items:center; gap:8px;">
        <span style="font-weight:900; letter-spacing:1px;">CASHFREE</span> 
        <span style="font-size:10px; font-weight:bold; color:#000; background:#f5a623; padding:2px 6px; border-radius:4px;">SANDBOX</span>
      </div>
      <span style="cursor:pointer; font-size:24px; line-height:1;" onclick="closePayment()">&times;</span>
    </div>
    
    <div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 16px;">
        <div style="font-weight:bold; font-size: 16px;">SkillSwap - ${selectedPackName}</div>
        <div style="font-weight:bold; font-size: 18px;">₹${selectedPrice}</div>
      </div>

      <div id="cf-methods">
        <h4 style="margin-bottom: 12px; color: var(--text-muted); font-size: 12px; letter-spacing: 1px; text-transform:uppercase;">PAYMENT METHODS</h4>
        
        <div onclick="showCfForm('upi')" style="padding:16px; border:1px solid var(--border); border-radius:8px; margin-bottom:12px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:0.2s;">
          <div style="background:#f1f5f9; padding:8px; border-radius:4px; font-size:20px;">📱</div>
          <div style="font-weight:600; font-size:16px;">UPI</div>
          <div style="margin-left:auto; color:var(--text-muted);">›</div>
        </div>

        <div onclick="showCfForm('card')" style="padding:16px; border:1px solid var(--border); border-radius:8px; margin-bottom:12px; cursor:pointer; display:flex; align-items:center; gap:12px; transition:0.2s;">
          <div style="background:#f1f5f9; padding:8px; border-radius:4px; font-size:20px;">💳</div>
          <div style="font-weight:600; font-size:16px;">Debit / Credit Card</div>
          <div style="margin-left:auto; color:var(--text-muted);">›</div>
        </div>
      </div>

      <div id="cf-form-container" style="display:none;">
        <div style="cursor:pointer; color:var(--accent); font-weight:600; margin-bottom:16px; display:inline-block;" onclick="resetCfMethods()">← Back to options</div>
        
        <div id="cf-upi" style="display:none;">
          <label style="display:block; font-size:14px; margin-bottom:8px; font-weight:600; color:var(--text-muted);">UPI ID / VPA</label>
          <input type="text" id="cf-upi-id" placeholder="e.g. yourname@ybl" style="width:100%; padding:14px; border:1px solid var(--border); border-radius:8px; margin-bottom:24px; font-size:16px;">
          <button class="btn btn-block" style="background:#5e35b1; color:white; border-radius:8px; padding:16px; font-size:16px;" onclick="processMockCf('${order.order_id}')">Pay ₹${selectedPrice}</button>
        </div>

        <div id="cf-card" style="display:none;">
          <label style="display:block; font-size:14px; margin-bottom:8px; font-weight:600; color:var(--text-muted);">Card Number</label>
          <input type="text" placeholder="4111 1111 1111 1111" style="width:100%; padding:14px; border:1px solid var(--border); border-radius:8px; margin-bottom:16px; font-size:16px;" value="4111 1111 1111 1111">
          
          <div style="display:flex; gap:16px; margin-bottom:24px;">
            <div style="flex:1;">
              <label style="display:block; font-size:14px; margin-bottom:8px; font-weight:600; color:var(--text-muted);">Expiry</label>
              <input type="text" placeholder="MM/YY" style="width:100%; padding:14px; border:1px solid var(--border); border-radius:8px; font-size:16px;" value="12/26">
            </div>
            <div style="flex:1;">
              <label style="display:block; font-size:14px; margin-bottom:8px; font-weight:600; color:var(--text-muted);">CVV</label>
              <input type="text" placeholder="123" style="width:100%; padding:14px; border:1px solid var(--border); border-radius:8px; font-size:16px;" value="123">
            </div>
          </div>
          
          <button class="btn btn-block" style="background:#5e35b1; color:white; border-radius:8px; padding:16px; font-size:16px;" onclick="processMockCf('${order.order_id}')">Pay ₹${selectedPrice}</button>
        </div>
      </div>
    </div>
  `;
  modal.classList.add('open');
};

window.showCfForm = function(type) {
  document.getElementById('cf-methods').style.display = 'none';
  document.getElementById('cf-form-container').style.display = 'block';
  
  if (type === 'upi') {
    document.getElementById('cf-upi').style.display = 'block';
    document.getElementById('cf-card').style.display = 'none';
  } else {
    document.getElementById('cf-upi').style.display = 'none';
    document.getElementById('cf-card').style.display = 'block';
  }
};

window.resetCfMethods = function() {
  document.getElementById('cf-methods').style.display = 'block';
  document.getElementById('cf-form-container').style.display = 'none';
};

window.processMockCf = function(orderId) {
  const content = document.getElementById('payment-content');
  content.innerHTML = `
    <div style="padding: 64px 24px; text-align:center;">
      <div class="processing-spinner" style="border-color:#5e35b1; border-bottom-color:transparent; width:48px; height:48px; border-width:4px; margin: 0 auto;"></div>
      <h3 style="margin-top:24px;">Authenticating...</h3>
      <p class="text-muted" style="margin-top: 8px;">Please do not refresh the page.</p>
    </div>
  `;

  setTimeout(async () => {
    try {
      await api('/users/me/coins/verify', {
        method: 'POST',
        body: {
          amount: selectedAmount,
          order_id: orderId
        }
      });
      closePayment();
      handlePaymentSuccess();
    } catch(err) {
      showToast(err.message, 'error');
      closePayment();
    }
  }, 2500);
}

function closePayment() {
  document.getElementById('payment-modal').classList.remove('open');
}

function handlePaymentSuccess() {
  showToast(`Awesome! ${selectedAmount} Coins added to your wallet! 🎉`, 'success');
  const user = getCurrentUser();
  user.coins = (user.coins || 0) + selectedAmount;
  sessionStorage.setItem('skillswap_user', JSON.stringify(user));
  renderLayout('buy-coins');
}


