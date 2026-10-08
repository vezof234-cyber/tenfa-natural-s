/* Minimal JavaScript: age check, cart, search. Structure is in index.html, styling in style.css. */
const $ = s => document.querySelector(s);
const fmt = v => '₹' + v.toLocaleString('en-IN');
const cart = {};
let next = '';

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
  let total = 0, count = 0, html = '';
  for (const name in cart) {
    const { p, k } = cart[name];
    total += p * k; count += k;
    html += `<li><span>${name}<small>${fmt(p)}</small></span><span class="qty"><button data-n="${name}" data-d="-1">−</button>${k}<button data-n="${name}" data-d="1">+</button></span></li>`;
  }
  const fee = total && total < 999 ? 49 : 0;
  $('#items').innerHTML = html || '<li class="empty">Your cart is empty.</li>';
  $('#cnt').textContent = count;
  $('#sub').textContent = fmt(total);
  $('#fee').textContent = fee ? fmt(fee) : 'Free';
  $('#tot').textContent = fmt(total + fee);
  return count ? total + fee : 0;
}

document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.classList.contains('add')) {
    const card = b.closest('.card');
    const name = card.querySelector('h3').textContent;
    (cart[name] ??= { p: +card.dataset.price, k: 0 }).k++;
    draw();
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
  const total = draw();
  if (!total) return;
  $('#total').textContent = fmt(total);
  for (const k in cart) delete cart[k];
  draw();
  $('#cart').classList.remove('open');
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
