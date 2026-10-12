const DEFAULT_PRODUCTS = [
  { name: "YUMMY SWEET SAUCE", defaultRate: 45 },
  { name: "YUMMY CHILLY SAUCE", defaultRate: 45 },
  { name: "CLASSICAL SWEET SAUCE", defaultRate: 60 },
  { name: "CLASSICAL CHILLY SAUCE", defaultRate: 60 },
  { name: "YUMMY SOYA SAUCE", defaultRate: 40 },
  { name: "VINEGAR", defaultRate: 35 }
];

let prefilledProducts = [];
let currentItems = [];
let currentInvNo = 1;
let currentDate = "";
let isEditing = false;
let currentPaymentsHistory = [];
let bills = [];
let editingItemIndex = -1;

window.addEventListener("DOMContentLoaded", function () {
  loadProductsCatalog();
  loadAllData();
  if (!isEditing && !loadDraft()) {
    initNewBill();
  }
  
  const today = new Date().toISOString().split("T")[0];
  const quickDateElem = document.getElementById("quickRecDate");
  if (quickDateElem) quickDateElem.value = today;

  refreshAllViews();
  checkAppLock();
});

function loadProductsCatalog() {
  try {
    const saved = localStorage.getItem("rs_home_products");
    if(saved) {
      prefilledProducts = JSON.parse(saved);
      DEFAULT_PRODUCTS.forEach(dp => {
        if(!prefilledProducts.some(p => p.name === dp.name)) {
          prefilledProducts.push(dp);
        }
      });
    } else {
      prefilledProducts = [...DEFAULT_PRODUCTS];
      localStorage.setItem("rs_home_products", JSON.stringify(prefilledProducts));
    }
  } catch(e) {
    prefilledProducts = [...DEFAULT_PRODUCTS];
  }
}

function saveProductsCatalog() {
  localStorage.setItem("rs_home_products", JSON.stringify(prefilledProducts));
  initProductDropdown();
  renderProductsTable();
}

function initProductDropdown() {
  const selectElem = document.getElementById("inItemNameSelect");
  const nameInput = document.getElementById("inItemName");
  const quickContainer = document.getElementById("quickProductsContainer");

  if(!selectElem || !nameInput || !quickContainer) return;

  selectElem.innerHTML = "";
  quickContainer.innerHTML = "";

  prefilledProducts.forEach(p => {
    // Populate Dropdown
    const opt = document.createElement("option");
    opt.value = p.name;
    opt.innerText = p.name;
    selectElem.appendChild(opt);

    // Populate Quick Chips
    const chip = document.createElement("button");
    chip.type = "button";
    chip.innerText = p.name;
    chip.style.cssText = "background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: #cbd5e1; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.2s;";
    chip.onmouseover = () => chip.style.background = "rgba(99, 102, 241, 0.3)";
    chip.onmouseout = () => chip.style.background = "rgba(99, 102, 241, 0.15)";
    
    chip.onclick = function() {
      selectElem.value = p.name;
      nameInput.value = p.name;
      document.getElementById("inItemPrice").value = p.defaultRate;
      showToast(`Selected: ${p.name}`);
    };
    quickContainer.appendChild(chip);
  });

  selectElem.onchange = function(e) {
    const found = prefilledProducts.find(p => p.name === e.target.value);
    if(found) {
      nameInput.value = found.name;
      document.getElementById("inItemPrice").value = found.defaultRate;
    }
  };

  if(prefilledProducts.length > 0) {
    selectElem.value = prefilledProducts[0].name;
    nameInput.value = prefilledProducts[0].name;
    document.getElementById("inItemPrice").value = prefilledProducts[0].defaultRate;
  }
}

function addNewProductToCatalog() {
  const nameInput = document.getElementById("newProdName");
  const rateInput = document.getElementById("newProdRate");
  
  const name = nameInput ? nameInput.value.trim().toUpperCase() : "";
  const rate = parseFloat(rateInput ? rateInput.value : 0);

  if(!name || isNaN(rate) || rate < 0) {
    showToast("Kripya sahi product name aur default rate dalein!", true);
    return;
  }

  if(prefilledProducts.some(p => p.name === name)) {
    showToast("Ye product pehle se list me hai!", true);
    return;
  }

  prefilledProducts.push({ name, defaultRate: rate });
  saveProductsCatalog();

  nameInput.value = "";
  rateInput.value = "";
  showToast(`Product "${name}" successfully add ho gaya! ✅`);
}

function deleteProductFromCatalog(index) {
  if(prefilledProducts.length <= 1) {
    showToast("Kam se kam 1 product hona zaroori hai!", true);
    return;
  }
  prefilledProducts.splice(index, 1);
  saveProductsCatalog();
  showToast("Product delete ho gaya!");
}

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if(!tbody) return;
  tbody.innerHTML = "";

  prefilledProducts.forEach((p, idx) => {
    tbody.innerHTML += `
      <tr>
        <td style="font-weight:600;">${p.name}</td>
        <td class="mono">₹${p.defaultRate.toFixed(2)}</td>
        <td style="text-align:center;">
          <button style="background:#dc2626; color:white; border:none; padding:4px 10px; border-radius:6px; cursor:pointer;" onclick="deleteProductFromCatalog(${idx})">🗑️ Delete</button>
        </td>
      </tr>
    `;
  });
}

function showToast(message, isError = false) {
  const toast = document.getElementById("appToast");
  if (!toast) return;
  toast.innerText = message;
  toast.style.background = isError ? "#ef4444" : "#10b981";
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 2500);
}

function showAppModal(title, contentHtml, confirmText, onConfirm) {
  const overlay = document.getElementById("appModalOverlay");
  if (!overlay) return;
  document.getElementById("modalTitle").innerText = title;
  document.getElementById("modalBody").innerHTML = contentHtml;
  document.getElementById("modalBtnConfirm").innerText = confirmText;
  document.getElementById("modalBtnConfirm").onclick = function () {
    if (onConfirm()) closeAppModal();
  };
  overlay.style.display = "flex";
}

function closeAppModal() {
  const overlay = document.getElementById("appModalOverlay");
  if (overlay) overlay.style.display = "none";
}

// DOUBLE-CLICK TO EDIT ITEM MODAL LOGIC
function openEditItemModal(index) {
  editingItemIndex = index;
  const it = currentItems[index];
  if(!it) return;

  document.getElementById("editItemDate").value = it.date || currentDate;
  document.getElementById("editItemName").value = it.name;
  document.getElementById("editItemQty").value = it.qty;
  document.getElementById("editItemRate").value = it.price;

  document.getElementById("editItemModalOverlay").style.display = "flex";
}

function closeEditItemModal() {
  document.getElementById("editItemModalOverlay").style.display = "none";
  editingItemIndex = -1;
}

function saveEditedItem() {
  if(editingItemIndex < 0 || !currentItems[editingItemIndex]) return;

  const name = document.getElementById("editItemName").value.trim();
  const qty = parseFloat(document.getElementById("editItemQty").value) || 1;
  const price = parseFloat(document.getElementById("editItemRate").value) || 0;
  const itemDate = document.getElementById("editItemDate").value.trim();

  if(!name) {
    showToast("Item description khali nahi ho sakta!", true);
    return;
  }
  if(price <= 0) {
    showToast("Valid rate enter karein!", true);
    return;
  }

  currentItems[editingItemIndex] = {
    ...currentItems[editingItemIndex],
    name,
    qty,
    price,
    amount: qty * price,
    date: itemDate || currentItems[editingItemIndex].date
  };

  if(!isEditing) saveDraft();
  renderBill();
  closeEditItemModal();
  showToast("Item details update ho gayi! ✅");
}

function loadAllData() {
  try {
    const data = localStorage.getItem("rs_home_bills");
    if(data) {
        bills = JSON.parse(data);
    } else {
        bills = [];
    }
  } catch (err) {
    bills = [];
  }
}

function saveAllData() {
  localStorage.setItem("rs_home_bills", JSON.stringify(bills));
}

function saveDraft() {
  if (isEditing) return;
  const custNameElem = document.getElementById("inCustName");
  const custAddrElem = document.getElementById("inCustAddress");
  
  const draftData = {
    currentInvNo,
    customerName: custNameElem ? custNameElem.value : "",
    customerAddress: custAddrElem ? custAddrElem.value : "",
    items: currentItems,
    paymentsHistory: currentPaymentsHistory
  };
  
  if (currentItems.length > 0 || (custNameElem && custNameElem.value.trim() !== "")) {
    localStorage.setItem("rs_home_draft", JSON.stringify(draftData));
  }
}

function loadDraft() {
  try {
    const saved = localStorage.getItem("rs_home_draft");
    if (!saved) return false;
    const d = JSON.parse(saved);
    if (d && d.items && d.items.length > 0) {
      currentItems = d.items;
      currentPaymentsHistory = d.paymentsHistory || [];
      const custNameElem = document.getElementById("inCustName");
      const custAddrElem = document.getElementById("inCustAddress");
      if(custNameElem) custNameElem.value = d.customerName || "";
      if(custAddrElem) custAddrElem.value = d.customerAddress || "";
      updateLiveMeta();
      renderBill();
      
      const draftBanner = document.getElementById("draftBanner");
      const draftInfo = document.getElementById("draftBannerInfo");
      if (draftBanner && draftInfo) {
        draftBanner.style.display = "flex";
        draftInfo.innerText = `Customer: ${d.customerName || 'Cash'} | Items: ${d.items.length}`;
      }
      return true;
    }
  } catch(e) {}
  return false;
}

function clearDraft() {
  localStorage.removeItem("rs_home_draft");
  const banner = document.getElementById("draftBanner");
  if(banner) banner.style.display = "none";
}

function restoreDraftWorkspace() {
  const banner = document.getElementById("draftBanner");
  if(banner) banner.style.display = "none";
  showToast("Draft restored!");
}

function discardDraftWorkspace() {
  clearDraft();
  initNewBill();
  showToast("Draft discarded.");
}

function showTab(tabName) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));
  
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) targetTab.classList.add("active");
  
  if (tabName === 'billing') {
      const btn = document.getElementById("tabBtnBilling");
      if(btn) btn.classList.add("active");
  }
  if (tabName === 'history') { 
      const btn = document.getElementById("tabBtnHistory");
      if(btn) btn.classList.add("active"); 
      renderHistoryTable(); 
  }
  if (tabName === 'products') {
      const btn = document.getElementById("tabBtnProducts");
      if(btn) btn.classList.add("active");
      renderProductsTable();
  }
  if (tabName === 'statement') { 
      const btn = document.getElementById("tabBtnStatement");
      if(btn) btn.classList.add("active"); 
      populatePartyDropdown(); 
      generateStatement(); 
  }
}

function initNewBill() {
  isEditing = false;
  const badge = document.getElementById("editBadge");
  if(badge) badge.style.display = "none";
  currentItems = [];
  currentPaymentsHistory = [];

  if (bills.length > 0) {
    let max = 0;
    bills.forEach(b => { if(parseInt(b.invoiceNo) > max) max = parseInt(b.invoiceNo); });
    currentInvNo = max + 1;
  } else {
    currentInvNo = 1;
  }

  const today = new Date().toISOString().split("T")[0];
  const parts = today.split("-");
  currentDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

  const inBillDate = document.getElementById("inBillDate");
  const dispInvNo = document.getElementById("dispInvNo");
  const dispDate = document.getElementById("dispDate");
  const inCustName = document.getElementById("inCustName");
  const inCustAddress = document.getElementById("inCustAddress");
  const inPaidAmount = document.getElementById("inPaidAmount");
  const inCustGst = document.getElementById("inCustGst");

  if(inBillDate) inBillDate.value = today;
  if(dispInvNo) dispInvNo.innerText = currentInvNo;
  if(dispDate) dispDate.innerText = currentDate;
  if(inCustName) inCustName.value = "";
  if(inCustAddress) inCustAddress.value = "";
  if(inPaidAmount) inPaidAmount.value = "";
  if(inCustGst) inCustGst.value = "";

  initProductDropdown();

  clearDraft();
  updateLiveMeta();
  renderBill();
}

function updateLiveMeta() {
  const custNameElem = document.getElementById("inCustName");
  const custAddrElem = document.getElementById("inCustAddress");
  const bDateElem = document.getElementById("inBillDate");
  const gstElem = document.getElementById("inCustGst");
  const stateCodeElem = document.getElementById("inStateCode");
  const stateElem = document.getElementById("inState");

  const name = custNameElem ? custNameElem.value.trim() : "";
  const addr = custAddrElem ? custAddrElem.value.trim() : "";
  const bDate = bDateElem ? bDateElem.value : "";

  if (bDate) {
    const p = bDate.split("-");
    currentDate = `${p[2]}/${p[1]}/${p[0]}`;
    const dispDate = document.getElementById("dispDate");
    if(dispDate) dispDate.innerText = currentDate;
  }

  const dispCustName = document.getElementById("dispCustName");
  const dispCustAddress = document.getElementById("dispCustAddress");
  const dispGst = document.getElementById("dispGst");
  const dispStateCode = document.getElementById("dispStateCode");
  const dispState = document.getElementById("dispState");

  if(dispCustName) dispCustName.innerText = name || "--";
  if(dispCustAddress) dispCustAddress.innerText = addr || "--";
  if(dispGst) dispGst.innerText = (gstElem && gstElem.value) ? gstElem.value : "--";
  if(dispStateCode) dispStateCode.innerText = (stateCodeElem && stateCodeElem.value) ? stateCodeElem.value : "20";
  if(dispState) dispState.innerText = (stateElem && stateElem.value) ? stateElem.value : "Jharkhand";
  
  if (!isEditing) saveDraft();
}

function addItem() {
  const nameElem = document.getElementById("inItemName");
  const qtyElem = document.getElementById("inItemQty");
  const priceElem = document.getElementById("inItemPrice");

  if(!nameElem || !qtyElem || !priceElem) return;

  const name = nameElem.value.trim();
  const qty = parseFloat(qtyElem.value) || 1;
  const price = parseFloat(priceElem.value) || 0;

  if (!name) {
    showToast("Kripya product description dalein!", true);
    return;
  }
  if (price <= 0) {
    showToast("Kripya valid rate dalein!", true);
    return;
  }

  currentItems.push({
    name, qty, price, amount: qty * price, date: currentDate
  });

  nameElem.value = "";
  priceElem.value = "";
  if (!isEditing) saveDraft();
  renderBill();
  showToast("Item added!");
}

function deleteItem(index) {
  currentItems.splice(index, 1);
  if (!isEditing) saveDraft();
  renderBill();
}

function renderBill() {
  const tbody = document.getElementById("billBody");
  if(!tbody) return;
  tbody.innerHTML = "";

  currentItems.forEach((it, idx) => {
    const parts = it.amount.toFixed(2).split(".");
    tbody.innerHTML += `
      <tr title="Double click to edit" ondblclick="openEditItemModal(${idx})" style="cursor: pointer;">
        <td style="text-align:center;">${idx + 1}</td>
        <td>${it.name}</td>
        <td style="text-align:center;">${it.qty}</td>
        <td style="text-align:center;">${it.price.toFixed(2)}</td>
        <td style="text-align:right;">${parts[0]}</td>
        <td style="text-align:center;">${parts[1] || '00'}</td>
        <td class="no-print" style="text-align:center;"><button title="Delete Item" style="background:none;border:none;color:red;cursor:pointer;font-weight:bold;" onclick="event.stopPropagation(); deleteItem(${idx})">✕</button></td>
      </tr>
    `;
  });

  let totalRows = Math.max(5, currentItems.length);
  for(let i = currentItems.length; i < totalRows; i++) {
    tbody.innerHTML += `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td>&nbsp;</td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="no-print"></td>
      </tr>
    `;
  }

  calculate();
}

function calculate() {
  let subTotal = currentItems.reduce((s, it) => s + it.amount, 0);
  
  const inPaidAmount = document.getElementById("inPaidAmount");
  let totalPaid = 0;
  if(inPaidAmount) {
      totalPaid = parseFloat(inPaidAmount.value) || 0;
  }
  
  let due = subTotal - totalPaid;
  if(due < 0) due = 0;

  const parts = subTotal.toFixed(2).split(".");
  
  const dispTotalRs = document.getElementById("dispTotalRs");
  const dispTotalP = document.getElementById("dispTotalP");
  const dispTotalPaid = document.getElementById("dispTotalPaid");
  const dispDueAmount = document.getElementById("dispDueAmount");
  const inDueAmount = document.getElementById("inDueAmount");
  const lblWords = document.getElementById("lblWords");

  if(dispTotalRs) dispTotalRs.innerText = parts[0];
  if(dispTotalP) dispTotalP.innerText = parts[1] || '00';
  
  if(dispTotalPaid) dispTotalPaid.innerText = totalPaid.toFixed(2);
  if(dispDueAmount) dispDueAmount.innerText = due.toFixed(2);
  if(inDueAmount) inDueAmount.value = `₹${due.toFixed(2)}`;
  if(lblWords) lblWords.innerText = numberToWords(subTotal) + " Only";

  return { subTotal, totalPaid, due };
}

function saveCurrentBill() {
  const custNameElem = document.getElementById("inCustName");
  if (!custNameElem) return;

  const custName = custNameElem.value.trim();
  if(!custName || currentItems.length === 0) {
    showToast("Kripya Customer ka naam aur kam se kam 1 item dalein!", true);
    return;
  }

  const totals = calculate();
  
  const custAddrElem = document.getElementById("inCustAddress");
  const address = custAddrElem ? custAddrElem.value.trim() : "--";
  
  const payModeElem = document.getElementById("inPayMode");
  const payMode = payModeElem ? payModeElem.value : "Cash";

  const billData = {
    invoiceNo: currentInvNo,
    date: currentDate,
    customerName: custName,
    customerAddress: address || "--",
    items: [...currentItems],
    paymentsHistory: totals.totalPaid > 0 ? [{ date: currentDate, amount: totals.totalPaid, mode: payMode }] : [],
    totals: { grandTotal: totals.subTotal, totalPaid: totals.totalPaid, due: totals.due }
  };

  const idx = bills.findIndex(b => parseInt(b.invoiceNo) === parseInt(currentInvNo));
  if(idx >= 0) {
      bills[idx] = billData;
  } else {
      bills.unshift(billData);
  }

  saveAllData();
  clearDraft();
  refreshAllViews();
  showToast(`Bill #${currentInvNo} successfully save ho gaya! ✅`);
  
  setTimeout(() => initNewBill(), 300);
}

function printCurrentBill() {
  if (currentItems.length === 0) {
    showToast("Print karne ke liye items add karein!", true);
    return;
  }
  window.print();
}

function resetForNextBill() {
  clearDraft();
  initNewBill();
  showToast("Naya bill ready hai!");
}

function renderHistoryTable(filtered = null) {
  const list = filtered || bills;
  const tbody = document.getElementById("historyTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8;">No bills found.</td></tr>`;
    return;
  }

  list.forEach(b => {
    tbody.innerHTML += `
      <tr>
        <td style="font-weight:700; color:#818cf8;">#${b.invoiceNo}</td>
        <td>${b.date}</td>
        <td style="font-weight:600;">${b.customerName}</td>
        <td style="color:#94a3b8;">${b.customerAddress}</td>
        <td class="mono">₹${b.totals.grandTotal.toFixed(2)}</td>
        <td class="mono cr-text">₹${b.totals.totalPaid.toFixed(2)}</td>
        <td class="mono dr-text">₹${b.totals.due.toFixed(2)}</td>
        <td style="text-align:center;">
          <button style="background:#0284c7; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" onclick="loadBillForEditing(${b.invoiceNo})">👁️ View/Edit</button>
          <button style="background:#dc2626; color:white; border:none; padding:5px 10px; border-radius:6px; cursor:pointer;" onclick="deleteBill(${b.invoiceNo})">🗑️</button>
        </td>
      </tr>
    `;
  });
}

function deleteBill(invNo) {
  showAppModal("Delete Bill?", `Kya aap Bill <strong>#${invNo}</strong> ko delete karna chahte hain?`, "Delete", function() {
    bills = bills.filter(b => parseInt(b.invoiceNo) !== parseInt(invNo));
    saveAllData();
    refreshAllViews();
    showToast("Bill delete ho gaya!");
    return true;
  });
}

function loadBillForEditing(invNo) {
  const b = bills.find(x => parseInt(x.invoiceNo) === parseInt(invNo));
  if (!b) return;

  isEditing = true;
  const badge = document.getElementById("editBadge");
  if(badge) badge.style.display = "inline";
  
  currentInvNo = b.invoiceNo;
  currentDate = b.date;
  currentItems = [...b.items];

  const dispInvNo = document.getElementById("dispInvNo");
  const dispDate = document.getElementById("dispDate");
  const inCustName = document.getElementById("inCustName");
  const inCustAddress = document.getElementById("inCustAddress");
  const inPaidAmount = document.getElementById("inPaidAmount");

  if(dispInvNo) dispInvNo.innerText = b.invoiceNo;
  if(dispDate) dispDate.innerText = b.date;
  if(inCustName) inCustName.value = b.customerName;
  if(inCustAddress) inCustAddress.value = b.customerAddress;
  if(inPaidAmount) inPaidAmount.value = b.totals.totalPaid;

  updateLiveMeta();
  renderBill();
  showTab('billing');
  showToast(`Bill #${invNo} load ho gaya editing ke liye.`);
}

function handleGlobalSearch(input) {
  const q = input.value.toLowerCase();
  showTab('history');
  const searchHistory = document.getElementById("searchHistory");
  if(searchHistory) {
      searchHistory.value = q;
      filterHistory();
  }
}

function filterHistory() {
  const searchHistory = document.getElementById("searchHistory");
  if(!searchHistory) return;
  const q = searchHistory.value.toLowerCase();
  const res = bills.filter(b => b.invoiceNo.toString().includes(q) || (b.customerName && b.customerName.toLowerCase().includes(q)));
  renderHistoryTable(res);
}

function refreshAllViews() {
  const countElem = document.getElementById("historyCount");
  if(countElem) countElem.innerText = bills.length;
  renderHistoryTable();
  populatePartyDropdown();
}

function populatePartyDropdown() {
  const sel = document.getElementById("selectPartyLedger");
  if (!sel) return;
  sel.innerHTML = "";
  const names = new Set();
  bills.forEach(b => { if(b.customerName && b.customerName !== "Cash Sale") names.add(b.customerName); });
  if(names.size === 0) {
    sel.add(new Option("-- No Customers --", ""));
    return;
  }
  names.forEach(n => sel.add(new Option(n, n)));
}

function parseDateToTs(dStr) {
  if (!dStr) return 0;
  const parts = dStr.split("/");
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
  }
  return new Date(dStr).getTime() || 0;
}

function generateStatement() {
  const partySelect = document.getElementById("selectPartyLedger");
  if(!partySelect) return;
  
  const partyName = partySelect.value;
  const tbody = document.getElementById("statementBody");
  if(!tbody) return;
  
  const stLedgerName = document.getElementById("stLedgerName");
  const stGeneratedDate = document.getElementById("stGeneratedDate");
  const fromDateVal = document.getElementById("filterFromDate").value;
  const toDateVal = document.getElementById("filterToDate").value;
  
  if(stLedgerName) stLedgerName.innerText = partyName || "--";
  if(stGeneratedDate) stGeneratedDate.innerText = new Date().toLocaleDateString("en-IN");
  
  tbody.innerHTML = "";

  if(!partyName) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">No customer selected.</td></tr>`;
    return;
  }

  const partyBills = bills.filter(b => b.customerName.toLowerCase() === partyName.toLowerCase());
  let ledgerTransactions = [];

  partyBills.forEach(b => {
    ledgerTransactions.push({
      date: b.date,
      timestamp: parseDateToTs(b.date),
      particulars: `Invoice Sale (#${b.invoiceNo})`,
      vchType: "Sales",
      vchNo: b.invoiceNo,
      debit: b.totals.grandTotal,
      credit: 0,
      isPaymentRow: false
    });

    if (b.paymentsHistory && b.paymentsHistory.length > 0) {
      b.paymentsHistory.forEach((p, pIndex) => {
        ledgerTransactions.push({
          date: p.date,
          timestamp: parseDateToTs(p.date),
          particulars: `Received in ${p.mode}`,
          vchType: "Receipt",
          vchNo: b.invoiceNo,
          debit: 0,
          credit: p.amount,
          isPaymentRow: true,
          payIndex: pIndex
        });
      });
    }
  });

  ledgerTransactions.sort((a, b) => a.timestamp - b.timestamp);

  let filteredTransactions = ledgerTransactions;
  if (fromDateVal) {
    const fromTs = new Date(fromDateVal).getTime();
    filteredTransactions = filteredTransactions.filter(tx => tx.timestamp >= fromTs);
  }
  if (toDateVal) {
    const toTs = new Date(toDateVal).getTime();
    const endOfDayTs = toTs + (24 * 60 * 60 * 1000) - 1;
    filteredTransactions = filteredTransactions.filter(tx => tx.timestamp <= endOfDayTs);
  }

  let totalDebit = 0;
  let totalCredit = 0;
  let runningBalance = 0;

  if (filteredTransactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">No transactions found in this date range.</td></tr>`;
    return;
  }

  filteredTransactions.forEach(tx => {
    totalDebit += tx.debit;
    totalCredit += tx.credit;
    runningBalance += (tx.debit - tx.credit);

    tbody.innerHTML += `
      <tr>
        <td>${tx.date}</td>
        <td style="font-weight:600;">${tx.particulars}</td>
        <td style="color:${tx.vchType === 'Receipt' ? '#16a34a' : '#4f46e5'}; font-weight:700;">${tx.vchType}</td>
        <td>${tx.vchNo}</td>
        <td style="text-align:right;" class="dr-text">${tx.debit > 0 ? '₹' + tx.debit.toFixed(2) : '-'}</td>
        <td style="text-align:right;" class="cr-text">${tx.credit > 0 ? '₹' + tx.credit.toFixed(2) : '-'}</td>
        <td style="text-align:right;" class="mono dr-text">₹${runningBalance.toFixed(2)}</td>
        <td class="no-print" style="text-align:center;">
          ${tx.isPaymentRow ? `
            <button title="Delete Payment" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;" onclick="deletePaymentEntry(${tx.vchNo},${tx.payIndex})">🗑️</button>
          ` : `
            <button title="Edit Bill" style="background:#0284c7; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;" onclick="showTab('billing'); loadBillForEditing(${tx.vchNo})">✏️</button>
          `}
        </td>
      </tr>
    `;
  });

  const netDue = totalDebit - totalCredit;
  tbody.innerHTML += `
    <tr style="background:#f1f5f9; font-weight:800;">
      <td colspan="4" style="text-align:right;">FILTERED SUMMARY:</td>
      <td style="text-align:right;" class="dr-text">₹${totalDebit.toFixed(2)}</td>
      <td style="text-align:right;" class="cr-text">₹${totalCredit.toFixed(2)}</td>
      <td style="text-align:right;" class="mono dr-text">₹${netDue.toFixed(2)} Due</td>
      <td class="no-print"></td>
    </tr>
  `;
}

function quickReceivePayment() {
  const partyName = document.getElementById("selectPartyLedger").value;
  const amount = parseFloat(document.getElementById("quickRecAmount").value) || 0;
  const mode = document.getElementById("quickRecMode").value;
  const rawDate = document.getElementById("quickRecDate").value;

  if (!partyName) {
    showToast("Pehle koi customer select karein!", true);
    return;
  }
  if (amount <= 0) {
    showToast("Sahi payment amount dalein!", true);
    return;
  }

  let payDate = new Date().toLocaleDateString("en-IN");
  if (rawDate) {
    const parts = rawDate.split("-");
    payDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  const partyBills = bills.filter(b => b.customerName.toLowerCase() === partyName.toLowerCase() && b.totals.due > 0);

  if (partyBills.length === 0) {
    showToast(`${partyName} ka koi baki pending nahi hai!`, true);
    return;
  }

  let remaining = amount;
  for (let i = partyBills.length - 1; i >= 0 && remaining > 0; i--) {
    const b = partyBills[i];
    const canPay = Math.min(b.totals.due, remaining);

    if (!b.paymentsHistory) b.paymentsHistory = [];
    b.paymentsHistory.push({
      date: payDate,
      amount: canPay,
      mode: mode
    });

    const totalPaid = b.paymentsHistory.reduce((s, p) => s + p.amount, 0);
    b.totals.totalPaid = totalPaid;
    b.totals.due = b.totals.grandTotal - totalPaid;
    remaining -= canPay;
  }

  saveAllData();
  refreshAllViews();
  generateStatement();
  
  document.getElementById("quickRecAmount").value = "";
  showToast(`₹${amount} jama ho gaya! Ledger updated. ✅`);
}

function deletePaymentEntry(invNo, payIndex) {
  const targetBill = bills.find(b => parseInt(b.invoiceNo) === parseInt(invNo));
  if (!targetBill || !targetBill.paymentsHistory || !targetBill.paymentsHistory[payIndex]) return;

  showAppModal("Payment Delete?", `Kya aap is payment entry ko delete karna chahte hain?`, "Delete", function() {
    targetBill.paymentsHistory.splice(payIndex, 1);
    const totalPaid = targetBill.paymentsHistory.reduce((s, p) => s + p.amount, 0);
    targetBill.totals.totalPaid = totalPaid;
    targetBill.totals.due = targetBill.totals.grandTotal - totalPaid;

    saveAllData();
    refreshAllViews();
    generateStatement();
    showToast("Payment delete ho gayi! 🗑️");
    return true;
  });
}

const APP_PIN = "1234";
function checkAppLock() {
  const screen = document.getElementById("pinLockScreen");
  if(screen) {
      screen.style.display = "flex";
      const pinInput = document.getElementById("appPinInput");
      if(pinInput) pinInput.focus();
  }
}

function handlePinInput(input) {
  const val = input.value;
  for (let i = 0; i < 4; i++) {
    const dot = document.getElementById(`dot-${i}`);
    if (dot) {
      if (i < val.length) dot.classList.add("filled");
      else dot.classList.remove("filled");
    }
  }
  if (val.length === 4) {
    if (val === APP_PIN) {
      document.getElementById("pinLockScreen").style.display = "none";
      showToast("Access Granted!");
    } else {
      document.getElementById("funnyPopup").style.display = "block";
      input.value = "";
      for (let i = 0; i < 4; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if(dot) dot.classList.remove("filled");
      }
    }
  }
}

function closeFunnyPopup() {
  document.getElementById("funnyPopup").style.display = "none";
  const pinInput = document.getElementById("appPinInput");
  if(pinInput) pinInput.focus();
}

function exportDataBackup() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ bills }, null, 2));
  const a = document.createElement("a");
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `RS_HOME_BACKUP_${new Date().toISOString().split("T")[0]}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
  showToast("Backup downloaded! 💾");
}

function triggerRestore() {
  const resInput = document.getElementById("restoreFileInput");
  if(resInput) resInput.click();
}

function handleFileRestore(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const d = JSON.parse(evt.target.result);
      if (d.bills) {
        bills = d.bills;
        saveAllData();
        refreshAllViews();
        showToast("Data restored successfully! 📥");
      }
    } catch(err) {
      showToast("Invalid backup file!", true);
    }
  };
  reader.readAsText(file);
}

function numberToWords(amount) {
  if (amount === 0) return "Zero Rupees";
  
  const words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function getWord(n) {
    if (n < 20) return words[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + words[n % 10] : "");
  }

  let num = Math.floor(amount);
  let res = "";

  if (Math.floor(num / 10000000) > 0) {
    res += getWord(Math.floor(num / 10000000)) + " Crore ";
    num %= 10000000;
  }
  if (Math.floor(num / 100000) > 0) {
    res += getWord(Math.floor(num / 100000)) + " Lakh ";
    num %= 100000;
  }
  if (Math.floor(num / 1000) > 0) {
    res += getWord(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }
  if (Math.floor(num / 100) > 0) {
    res += getWord(Math.floor(num / 100)) + " Hundred ";
    num %= 100;
  }
  if (num > 0) {
    res += getWord(num);
  }

  return res.trim() + " Rupees";
}