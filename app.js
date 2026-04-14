let members = [];
let payments = [];
let editingIndex = -1;

// --- メンバー管理 ---
function addMember() {
  const input = document.getElementById('member-name');
  const name = input.value.trim();
  const errEl = document.getElementById('member-error');

  if (!name) {
    errEl.style.display = 'block';
    return;
  }
  if (members.includes(name)) {
    errEl.textContent = 'その名前はすでに登録されています';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  errEl.textContent = '名前を入力してください';

  members.push(name);
  input.value = '';
  renderMembers();
  updatePayerSelect();
  renderBeneficiaries();
}

function removeMember(name) {
  const related = payments.filter(p => p.payer === name || p.for.includes(name));

  if (related.length > 0) {
    const labels = related.map(p => `・${p.payer}「${p.memo || p.for.join('・')}」${p.amount.toLocaleString()}円`).join('\n');
    const ok = window.confirm(
      `「${name}」は以下の立替データに含まれています。\n\n${labels}\n\nメンバーと関連する立替をすべて削除しますか？`
    );
    if (!ok) return;
    payments = payments.filter(p => p.payer !== name && !p.for.includes(name));
    renderPayments();
    document.getElementById('result-area').innerHTML = '';
  }

  if (editingIndex >= 0) cancelEdit();

  members = members.filter(m => m !== name);
  renderMembers();
  updatePayerSelect();
  renderBeneficiaries();
}

function renderMembers() {
  const el = document.getElementById('member-chips');
  if (members.length === 0) {
    el.innerHTML = '<span class="empty-state" id="member-empty">まだメンバーがいません</span>';
    return;
  }
  el.innerHTML = members.map(m => `
    <div class="chip">
      ${escHtml(m)}
      <button onclick="removeMember('${escAttr(m)}')" title="削除">×</button>
    </div>
  `).join('');
}

function updatePayerSelect() {
  const sel = document.getElementById('payer');
  const current = sel.value;
  sel.innerHTML = '<option value="">選択してください</option>' +
    members.map(m => `<option value="${escAttr(m)}" ${m === current ? 'selected' : ''}>${escHtml(m)}</option>`).join('');
}

function renderBeneficiaries() {
  const el = document.getElementById('beneficiaries');
  if (members.length === 0) {
    el.innerHTML = '<span class="empty-state">先にメンバーを登録してください</span>';
    return;
  }
  el.innerHTML = `
    <label class="checkbox-label">
      <input type="checkbox" id="all-check" onchange="toggleAll(this)"> 全員
    </label>
    ${members.map(m => `
      <label class="checkbox-label">
        <input type="checkbox" class="ben-check" value="${escAttr(m)}" onchange="updateAllCheck()"> ${escHtml(m)}
      </label>
    `).join('')}
  `;
}

function toggleAll(allChk) {
  document.querySelectorAll('.ben-check').forEach(c => c.checked = allChk.checked);
}

function updateAllCheck() {
  const checks = document.querySelectorAll('.ben-check');
  const allChk = document.getElementById('all-check');
  if (allChk) allChk.checked = [...checks].every(c => c.checked);
}

// --- 立替追加・更新 ---
function addPayment() {
  const payer = document.getElementById('payer').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const memo = document.getElementById('memo').value.trim();
  const errEl = document.getElementById('payment-error');
  const selected = [...document.querySelectorAll('.ben-check:checked')].map(c => c.value);

  if (!payer) { showPaymentError('支払った人を選択してください'); return; }
  if (!amount || amount <= 0) { showPaymentError('金額を入力してください'); return; }
  if (selected.length === 0) { showPaymentError('誰の分かを選択してください'); return; }

  errEl.style.display = 'none';

  if (editingIndex >= 0) {
    payments[editingIndex] = { payer, amount, for: selected, memo };
    editingIndex = -1;
    document.getElementById('payment-submit-btn').textContent = '追加する';
    document.getElementById('payment-cancel-btn').style.display = 'none';
    document.querySelector('#payment-form-card h2').textContent = '立替を追加';
  } else {
    payments.push({ payer, amount, for: selected, memo });
  }

  document.getElementById('payer').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';
  document.querySelectorAll('.ben-check, #all-check').forEach(c => c.checked = false);

  renderPayments();
  document.getElementById('result-area').innerHTML = '';
}

function editPayment(idx) {
  const p = payments[idx];
  editingIndex = idx;

  document.getElementById('payer').value = p.payer;
  document.getElementById('amount').value = p.amount;
  document.getElementById('memo').value = p.memo || '';

  document.querySelectorAll('.ben-check').forEach(c => {
    c.checked = p.for.includes(c.value);
  });
  updateAllCheck();

  document.getElementById('payment-submit-btn').textContent = '更新する';
  document.getElementById('payment-cancel-btn').style.display = '';
  document.querySelector('#payment-form-card h2').textContent = '立替を編集';

  document.getElementById('payment-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cancelEdit() {
  editingIndex = -1;
  document.getElementById('payer').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';
  document.querySelectorAll('.ben-check, #all-check').forEach(c => c.checked = false);
  document.getElementById('payment-submit-btn').textContent = '追加する';
  document.getElementById('payment-cancel-btn').style.display = 'none';
  document.querySelector('#payment-form-card h2').textContent = '立替を追加';
  document.getElementById('payment-error').style.display = 'none';
}

function showPaymentError(msg) {
  const el = document.getElementById('payment-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function removePayment(idx) {
  payments.splice(idx, 1);
  renderPayments();
  document.getElementById('result-area').innerHTML = '';
}

function getSortedPayments() {
  const keys = ['sort1', 'sort2', 'sort3']
    .map(id => document.getElementById(id)?.value || 'none')
    .filter(v => v !== 'none');

  const indexed = payments.map((p, i) => ({ p, i }));

  indexed.sort((a, b) => {
    for (const key of keys) {
      const result = compareByKey(a, b, key);
      if (result !== 0) return result;
    }
    return 0;
  });

  return indexed;
}

function compareByKey(a, b, key) {
  switch (key) {
    case 'amount-desc': return b.p.amount - a.p.amount;
    case 'amount-asc':  return a.p.amount - b.p.amount;
    case 'payer':       return a.p.payer.localeCompare(b.p.payer, 'ja');
    case 'default':     return a.i - b.i;
    default:            return 0;
  }
}

function renderPayments() {
  const el = document.getElementById('payment-list');
  if (payments.length === 0) {
    el.innerHTML = '<span class="empty-state">まだ立替がありません</span>';
    return;
  }

  const indexed = getSortedPayments();

  el.innerHTML = indexed.map(({ p, i }) => `
    <div class="payment-item">
      <div class="payment-item-left">
        <div class="payer">${escHtml(p.payer)}${p.memo ? ` <span style="font-weight:400;color:#718096;">「${escHtml(p.memo)}」</span>` : ''}</div>
        <div class="for-info">${escHtml(p.for.join('・'))} の分</div>
      </div>
      <div class="payment-item-right">
        <div class="amount">${p.amount.toLocaleString()}円</div>
        <button class="btn btn-secondary" style="padding:4px 10px;font-size:0.75rem;" onclick="editPayment(${i})">編集</button>
        <button class="btn btn-danger" style="padding:4px 10px;font-size:0.75rem;" onclick="removePayment(${i})">削除</button>
      </div>
    </div>
  `).join('');
}

// --- 精算計算 ---
function calculate() {
  const resultArea = document.getElementById('result-area');

  if (members.length < 2) {
    resultArea.innerHTML = '<p style="color:#e53e3e;font-size:0.875rem;">メンバーを2人以上登録してください</p>';
    return;
  }
  if (payments.length === 0) {
    resultArea.innerHTML = '<p style="color:#e53e3e;font-size:0.875rem;">立替を1件以上追加してください</p>';
    return;
  }

  const balance = {};
  members.forEach(m => balance[m] = 0);

  payments.forEach(p => {
    const share = p.amount / p.for.length;
    balance[p.payer] += p.amount;
    p.for.forEach(m => balance[m] -= share);
  });

  const settlements = settleDebts(balance);

  let html = '<div class="result-section-title">収支サマリー</div>';
  html += '<table class="balance-table"><thead><tr><th>名前</th><th>立替合計</th><th>負担分合計</th><th>収支</th></tr></thead><tbody>';

  members.forEach(m => {
    const paid = payments.filter(p => p.payer === m).reduce((s, p) => s + p.amount, 0);
    const owed = payments.reduce((s, p) => {
      if (p.for.includes(m)) return s + p.amount / p.for.length;
      return s;
    }, 0);
    const bal = balance[m];
    const cls = bal > 0 ? 'positive' : bal < 0 ? 'negative' : 'zero';
    const sign = bal > 0 ? '+' : '';
    html += `<tr>
      <td>${escHtml(m)}</td>
      <td>${Math.round(paid).toLocaleString()}円</td>
      <td>${Math.round(owed).toLocaleString()}円</td>
      <td class="${cls}">${sign}${Math.round(bal).toLocaleString()}円</td>
    </tr>`;
  });
  html += '</tbody></table>';

  html += '<div class="result-section-title">精算方法</div>';
  if (settlements.length === 0) {
    html += '<div class="all-even">全員ちょうど割り勘です！精算不要</div>';
  } else {
    html += '<div class="settlement-list">';
    settlements.forEach(s => {
      html += `<div class="settlement-item">
        <span>${escHtml(s.from)}</span>
        <span class="arrow">→</span>
        <span>${escHtml(s.to)}</span>
        <span class="settle-amount">${s.amount.toLocaleString()}円</span>
      </div>`;
    });
    html += '</div>';
  }

  resultArea.innerHTML = html;
}

function settleDebts(balance) {
  const bal = {};
  Object.keys(balance).forEach(k => bal[k] = Math.round(balance[k]));

  const creditors = [];
  const debtors = [];

  Object.entries(bal).forEach(([name, b]) => {
    if (b > 0) creditors.push({ name, amount: b });
    else if (b < 0) debtors.push({ name, amount: -b });
  });

  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const result = [];

  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const cred = creditors[i];
    const debt = debtors[j];
    const transfer = Math.min(cred.amount, debt.amount);

    result.push({ from: debt.name, to: cred.name, amount: transfer });

    cred.amount -= transfer;
    debt.amount -= transfer;

    if (cred.amount === 0) i++;
    if (debt.amount === 0) j++;
  }

  return result;
}

// XSSを防ぐユーティリティ
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(str) {
  return String(str).replace(/'/g, "\\'");
}

// --- 保存・読み込み ---
function saveData() {
  if (members.length === 0 && payments.length === 0) {
    showToast('保存するデータがありません');
    return;
  }
  const data = { members, payments };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
  a.href = url;
  a.download = `warikan_${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('保存しました');
}

function loadData(event) {
  const files = [...event.target.files];
  if (files.length === 0) return;

  let completed = 0;
  let errorFiles = [];

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data.members) || !Array.isArray(data.payments)) {
          throw new Error('形式が不正');
        }
        data.members.forEach(m => {
          if (!members.includes(m)) members.push(m);
        });
        payments.push(...data.payments);
      } catch {
        errorFiles.push(file.name);
      }

      completed++;
      if (completed === files.length) {
        renderMembers();
        updatePayerSelect();
        renderBeneficiaries();
        renderPayments();
        document.getElementById('result-area').innerHTML = '';

        if (errorFiles.length === 0) {
          showToast(`${files.length}件のファイルを読み込みました`);
        } else if (errorFiles.length < files.length) {
          showToast(`読み込み失敗: ${errorFiles.join(', ')}`);
        } else {
          showToast('すべてのファイルの読み込みに失敗しました');
        }
      }
    };
    reader.readAsText(file);
  });

  event.target.value = '';
}

// --- ドキュメント出力 ---
function exportDocument() {
  if (members.length < 2 || payments.length === 0) {
    showToast('メンバーと立替を入力してから実行してください');
    return;
  }

  const balance = {};
  members.forEach(m => balance[m] = 0);
  payments.forEach(p => {
    const share = p.amount / p.for.length;
    balance[p.payer] += p.amount;
    p.for.forEach(m => balance[m] -= share);
  });
  const settlements = settleDebts(balance);

  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;

  const paymentRows = getSortedPayments().map(({ p }, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${escHtml(p.payer)}</td>
      <td>${escHtml(p.memo || '—')}</td>
      <td>${escHtml(p.for.join('・'))}</td>
      <td class="num">${p.amount.toLocaleString()}円</td>
    </tr>
  `).join('');

  const total = payments.reduce((s, p) => s + p.amount, 0);

  const balanceRows = members.map(m => {
    const paid = payments.filter(p => p.payer === m).reduce((s, p) => s + p.amount, 0);
    const owed = payments.reduce((s, p) => p.for.includes(m) ? s + p.amount / p.for.length : s, 0);
    const bal = balance[m];
    const sign = bal > 0 ? '+' : '';
    const cls = bal > 0 ? 'positive' : bal < 0 ? 'negative' : '';
    return `<tr>
      <td>${escHtml(m)}</td>
      <td class="num">${Math.round(paid).toLocaleString()}円</td>
      <td class="num">${Math.round(owed).toLocaleString()}円</td>
      <td class="num ${cls}">${sign}${Math.round(bal).toLocaleString()}円</td>
    </tr>`;
  }).join('');

  const settlementRows = settlements.length === 0
    ? '<p class="all-even">全員ちょうど割り勘です！精算不要</p>'
    : settlements.map(s => `
        <div class="settle-row">
          <span class="name">${escHtml(s.from)}</span>
          <span class="arrow">→</span>
          <span class="name">${escHtml(s.to)}</span>
          <span class="amount">${s.amount.toLocaleString()}円</span>
        </div>
      `).join('');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>割り勘精算書 ${dateStr}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a202c; padding: 40px; max-width: 720px; margin: 0 auto; }
    h1 { font-size: 1.4rem; margin-bottom: 4px; }
    .date { color: #718096; font-size: 0.875rem; margin-bottom: 32px; }
    h2 { font-size: 1rem; font-weight: 700; color: #4a5568; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { background: #f7fafc; padding: 8px 12px; text-align: left; color: #718096; font-weight: 600; border-bottom: 1px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f0f4f8; }
    .num { text-align: right; }
    .total-row td { font-weight: 700; background: #f7fafc; }
    .positive { color: #276749; font-weight: 600; }
    .negative { color: #c53030; font-weight: 600; }
    .settle-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; margin-bottom: 8px; }
    .settle-row .name { font-weight: 600; }
    .settle-row .arrow { color: #38a169; font-size: 1.1rem; }
    .settle-row .amount { font-weight: 700; color: #276749; margin-left: auto; }
    .all-even { padding: 14px; background: #f0fff4; border-radius: 8px; color: #276749; font-weight: 700; text-align: center; }
    @media print {
      body { padding: 20px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <h1>割り勘精算書</h1>
  <div class="date">${dateStr} 作成</div>

  <h2>立替一覧</h2>
  <table>
    <thead><tr><th>#</th><th>支払った人</th><th>メモ</th><th>対象</th><th class="num">金額</th></tr></thead>
    <tbody>
      ${paymentRows}
      <tr class="total-row">
        <td colspan="4">合計</td>
        <td class="num">${total.toLocaleString()}円</td>
      </tr>
    </tbody>
  </table>

  <h2>収支サマリー</h2>
  <table>
    <thead><tr><th>名前</th><th class="num">立替合計</th><th class="num">負担分合計</th><th class="num">収支</th></tr></thead>
    <tbody>${balanceRows}</tbody>
  </table>

  <h2>精算方法</h2>
  ${settlementRows}

  <div style="margin-top:32px;text-align:right;">
    <button onclick="window.print()" style="padding:8px 20px;background:#667eea;color:#fff;border:none;border-radius:6px;font-size:0.9rem;cursor:pointer;">
      印刷 / PDF保存
    </button>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// Enterキー対応
document.getElementById('member-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addMember();
});
