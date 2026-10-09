/* Minimal JavaScript. Structure is in index.html, styling in style.css. */
const $ = s => document.querySelector(s);
const fmt = v => '₹' + v.toLocaleString('en-IN');
const cart = {};
let next = '';

/* ========================================================
   PLACEHOLDERS: connect these later (login and UPI payment)
   They are empty on purpose. Nothing happens until we fill them.
   ======================================================== */
function signUp(data)  { /* TODO: create the account (Firebase Authentication) */ }
function logIn(data)   { /* TODO: sign the user in */ }
function logOut()      { /* TODO: sign the user out */ }
function startUpiPayment(order) { /* TODO: show UPI QR / pay button inside #upi-slot */ }
/* Call setLoggedIn(true) after a successful login: it swaps the Login button for Account. */
function setLoggedIn(isIn) { document.body.classList.toggle('in', isIn); }

const form = e => { e.preventDefault(); return Object.fromEntries(new FormData(e.target)); };
$('#loginform').onsubmit  = e => logIn(form(e));
$('#signupform').onsubmit = e => signUp(form(e));
$('#logout').onclick      = () => logOut();

/* ---- 18+ check for alcohol and smoking ---- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-adult]');
  if (a && !document.body.classList.contains('ok')) {
    e.preventDefault();
    next = a.getAttribute('href');
    $('#age').showModal();
  }
});
$('#yes').onclick = () => {
  document.body.classList.add('ok');
  $('#age').close();
  if (next) location.hash = next;
};
$('#no').onclick = () => { $('#age').close(); location.hash = '#home'; };

/* ---- cart ---- */
function draw() {
  let total = 0, count = 0, rows = '', sum = '';
  for (const name in cart) {
    const { p, k } = cart[name];
    total += p * k; count += k;
    rows += `<li><span>${name}<small>${fmt(p)}</small></span><span class="qty"><button data-n="${name}" data-d="-1">−</button>${k}<button data-n="${name}" data-d="1">+</button></span></li>`;
    sum += `<li><span>${name} × ${k}</span><b>${fmt(p * k)}</b></li>`;
  }
  const fee = total && total < 999 ? 49 : 0;
  if (total) sum += `<li><span>Delivery</span><b>${fee ? fmt(fee) : 'Free'}</b></li>`;
  $('#items').innerHTML = rows || '<li class="empty">Your cart is empty.</li>';
  $('#paysum').innerHTML = sum || '<li class="mute">Your cart is empty.</li>';
  $('#cnt').textContent = count;
  $('#sub').textContent = fmt(total);
  $('#fee').textContent = fee ? fmt(fee) : 'Free';
  $('#tot').textContent = fmt(total + fee);
  $('#paytotal').textContent = fmt(total + fee);
  return count ? total + fee : 0;
}

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  const isAdd = b.classList.contains('add'), isBuy = b.classList.contains('buy');
  if (isAdd || isBuy) {
    const card = b.closest('.card');
    const name = card.querySelector('h1, h3').textContent;
    (cart[name] ??= { p: +card.dataset.price, k: 0 }).k++;
    draw();
    if (isBuy) location.hash = '#pay';
    else if (b.closest('.dinfo')) $('#cart').classList.add('open');
  } else if (b.dataset.d) {
    const item = cart[b.dataset.n];
    item.k += +b.dataset.d;
    if (item.k < 1) delete cart[b.dataset.n];
    draw();
  }
});

$('#opencart').onclick = () => $('#cart').classList.add('open');
$('#closecart').onclick = () => $('#cart').classList.remove('open');
$('#order').onclick = () => {
  if (!draw()) return;
  $('#cart').classList.remove('open');
  location.hash = '#pay';
};

/* ---- checkout form (demo: no payment is taken) ---- */
$('#payform').onsubmit = e => {
  const details = form(e);
  const total = draw();
  if (!total) return;
  startUpiPayment({ total, details });   /* later: real UPI payment goes here */
  $('#total').textContent = fmt(total);
  for (const k in cart) delete cart[k];
  draw();
  $('#done').showModal();
};

/* ---- search ---- */
$('#q').oninput = e => {
  const s = e.target.value.trim().toLowerCase();
  if (s && !$('#shop').matches(':target, :has(:target)')) location.hash = '#shop';
  let any = false;
  document.querySelectorAll('#shop .card').forEach(c => {
    c.hidden = !c.querySelector('h3').textContent.toLowerCase().includes(s);
    if (!c.hidden && (!c.closest('.adult') || document.body.classList.contains('ok'))) any = true;
  });
  $('#none').hidden = any || !s;
};

draw();
