/* Structure is in index.html, styling in style.css. This file: cart, search, 18+ check, login and orders (Firebase). */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey: "AIzaSyAeHA-tqPDG4jFqARhXkUvXwO4hscKC7Rg",
  authDomain: "tenfa-naturals.firebaseapp.com",
  projectId: "tenfa-naturals",
  storageBucket: "tenfa-naturals.firebasestorage.app",
  messagingSenderId: "381988353805",
  appId: "1:381988353805:web:f453fba4e1c51fe1492244"
});
const auth = getAuth(app), db = getFirestore(app);

const $ = s => document.querySelector(s);
const fmt = v => '₹' + v.toLocaleString('en-IN');
const cart = {};
let next = '';

/* ---------------- saved cart: browser copy + account copy ---------------- */
const KEY = 'tenfa-cart', PRICE = {};
let owner = 'guest';   // 'guest' or the logged-in user's id
document.querySelectorAll('#shop .card').forEach(c => { PRICE[c.querySelector('h3').textContent] = +c.dataset.price; });
const toArr = () => Object.entries(cart).map(([name, { p, k }]) => ({ name, p, k }));
function fromArr(arr) {   // rebuild the cart, always using today's prices from the page
  const o = {};
  (arr || []).forEach(i => { if (i.name in PRICE && i.k > 0) o[i.name] = { p: PRICE[i.name], k: i.k }; });
  return o;
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify({ owner, cart: toArr() })); } catch (e) {}
  const user = auth.currentUser;
  if (user && owner === user.uid) {
    clearTimeout(persist.t);
    persist.t = setTimeout(() => setDoc(doc(db, 'users', user.uid), { cart: toArr() }, { merge: true }).catch(() => {}), 400);
  }
}
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s) { owner = s.owner || 'guest'; Object.assign(cart, fromArr(s.cart)); }
} catch (e) {}
const msg = (sel, text) => { const el = $(sel); el.textContent = text || ''; el.hidden = !text; };
const form = e => { e.preventDefault(); return Object.fromEntries(new FormData(e.target)); };
const nice = err => ({
  'auth/email-already-in-use': 'This email is already registered. Try logging in.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email.',
  'auth/too-many-requests': 'Too many tries. Please wait a bit and try again.',
  'permission-denied': 'Not allowed. Please log in again.'
}[err.code] || 'Something went wrong. Please try again.');

/* ---------------- login, sign up, account ---------------- */
function setLoggedIn(isIn) { document.body.classList.toggle('in', isIn); }

async function signUp(d) {
  msg('#signupmsg', '');
  if (d.password !== d.confirm) return msg('#signupmsg', 'Passwords do not match.');
  try {
    const { user } = await createUserWithEmailAndPassword(auth, d.email, d.password);
    await updateProfile(user, { displayName: d.name });
    await setDoc(doc(db, 'users', user.uid), { name: d.name, email: d.email, phone: d.phone }, { merge: true });
    $('#signupform').reset();
    await fillAccount();
    location.hash = '#account';
  } catch (err) { msg('#signupmsg', nice(err)); }
}
async function logIn(d) {
  msg('#loginmsg', '');
  try {
    await signInWithEmailAndPassword(auth, d.email, d.password);
    $('#loginform').reset();
    location.hash = '#home';
  } catch (err) { msg('#loginmsg', nice(err)); }
}
async function logOut() { await signOut(auth); location.hash = '#home'; }

async function fillAccount() {
  const user = auth.currentUser;
  if (!user) return;
  let u = {};
  try { const s = await getDoc(doc(db, 'users', user.uid)); if (s.exists()) u = s.data(); } catch (e) {}
  $('#accname').textContent = u.name || user.displayName || '-';
  $('#accemail').textContent = user.email;
  $('#accphone').textContent = u.phone || '-';
  const n = $('#payform [name=name]'), p = $('#payform [name=phone]');
  if (!n.value) n.value = u.name || '';
  if (!p.value) p.value = u.phone || '';
  loadOrders();
}
async function loadOrders() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDocs(query(collection(db, 'orders'), where('uid', '==', user.uid)));
    const rows = snap.docs.map(d => d.data()).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $('#orders').innerHTML = rows.length
      ? rows.map(o => `<li><span>${o.items.length} item(s) · ${o.createdAt ? o.createdAt.toDate().toLocaleDateString('en-IN') : 'just now'}<small>Status: ${o.status}</small></span><b>${fmt(o.amount)}</b></li>`).join('')
      : '<li class="mute">No orders yet.</li>';
  } catch (e) {}
}
async function syncCart(user) {
  let remote = [];
  try { const s = await getDoc(doc(db, 'users', user.uid)); if (s.exists()) remote = s.data().cart || []; } catch (e) {}
  const merged = fromArr(remote);
  if (owner === 'guest') {   // items added before logging in are added to the saved cart
    for (const n in cart) merged[n] = { p: cart[n].p, k: (merged[n]?.k || 0) + cart[n].k };
  }
  for (const n in cart) delete cart[n];
  Object.assign(cart, merged);
  owner = user.uid;
  draw(); persist();
}
onAuthStateChanged(auth, async user => {
  setLoggedIn(!!user);
  if (user) { await syncCart(user); fillAccount(); }
  else {
    if (owner !== 'guest') { for (const n in cart) delete cart[n]; owner = 'guest'; }   // logged out: empty the cart on screen
    persist(); draw();
    $('#orders').innerHTML = '<li class="mute">No orders yet.</li>';
  }
});

$('#loginform').onsubmit  = e => logIn(form(e));
$('#signupform').onsubmit = e => signUp(form(e));
$('#logout').onclick      = () => logOut();

/* ---- payment: placeholder for later (UPI QR / pay button goes in #upi-slot) ---- */
function startUpiPayment(order) { /* TODO */ }

/* ---------------- 18+ check for alcohol and smoking ---------------- */
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

/* ---------------- cart ---------------- */
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
    draw(); persist();
    if (isBuy) location.hash = '#pay';
    else if (b.closest('.dinfo')) $('#cart').classList.add('open');
  } else if (b.dataset.d) {
    const item = cart[b.dataset.n];
    item.k += +b.dataset.d;
    if (item.k < 1) delete cart[b.dataset.n];
    draw(); persist();
  }
});

$('#opencart').onclick = () => $('#cart').classList.add('open');
$('#closecart').onclick = () => $('#cart').classList.remove('open');
$('#order').onclick = () => {
  if (!draw()) return;
  $('#cart').classList.remove('open');
  location.hash = '#pay';
};

/* ---------------- checkout: saves the order as "pending" ---------------- */
$('#payform').onsubmit = async e => {
  const address = form(e);
  msg('#paymsg', '');
  const total = draw();
  if (!total) return msg('#paymsg', 'Your cart is empty.');
  const user = auth.currentUser;
  if (!user) { msg('#loginmsg', 'Please log in to place your order.'); location.hash = '#login'; return; }
  const items = Object.entries(cart).map(([name, { p, k }]) => ({ name, price: p, qty: k }));
  try {
    await addDoc(collection(db, 'orders'), { uid: user.uid, items, amount: total, address, status: 'pending', createdAt: serverTimestamp() });
    startUpiPayment({ total, address });
    $('#total').textContent = fmt(total);
    for (const k in cart) delete cart[k];
    draw(); persist();
    $('#done').showModal();
    loadOrders();
  } catch (err) { msg('#paymsg', nice(err)); }
};

/* ---------------- search ---------------- */
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
