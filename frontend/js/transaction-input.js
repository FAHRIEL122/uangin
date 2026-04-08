// Transaction Input Module
let transactionType = 'expense';
let categories = [];

// Parse amount input that may include Indonesian formatting (e.g., "10.000" for ten thousand)
const parseAmountInput = (value) => {
  if (!value) return NaN;
  let cleaned = String(value).trim();
  // Remove anything that's not digit, dot, comma, or minus
  cleaned = cleaned.replace(/[^\d.,-]/g, '');

  // If both separators exist, assume dot is thousands and comma is decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // If multiple dots and no comma, treat dots as thousands separators
  else if ((cleaned.match(/\./g) || []).length > 1 && !cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '');
  }
  // If single dot and it looks like a thousand separator (e.g. 10.000)
  else if (!cleaned.includes(',') && (cleaned.match(/\./g) || []).length === 1) {
    const [intPart, fracPart] = cleaned.split('.');
    if (fracPart && fracPart.length === 3) {
      cleaned = intPart + fracPart;
    }
  }
  // If multiple commas and no dot, treat commas as thousands separators
  else if ((cleaned.match(/,/g) || []).length > 1 && !cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  }
  // If single comma, treat it as decimal separator (Indonesian style)
  else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  }

  return parseFloat(cleaned);
};

const findCategoryByName = (name) => {
  if (!name) return null;
  const normalized = name.trim().toLowerCase();
  return categories.find(c => c.name.toLowerCase() === normalized) || null;
};

// Initialize transaction form
const initTransactionForm = async (type) => {
  // Branding validation (non-blocking)
  validateBranding();
  if (!redirectIfNotAuthenticated()) return;
  
  transactionType = type;

  // Set current date and time
  const now = new Date();
  document.getElementById('date').valueAsDate = now;
  document.getElementById('time').value = now.toTimeString().substring(0, 5);

  // Load categories
  await loadCategories();

  // Form submission
  document.getElementById('transactionForm').addEventListener('submit', handleSubmit);

  // Format amount while typing and update preview
  const amountInput = document.getElementById('amount');
  if (amountInput) {
    amountInput.addEventListener('input', (e) => {
      formatAmountInputField(e.target);
      updateFormattedAmount();
    });
  }

  // Budget warning on amount and category change
  document.getElementById('amount').addEventListener('change', checkBudget);
  document.getElementById('category').addEventListener('change', checkBudget);
};

// Format amount input while typing (adds thousands separator)
const formatAmountInputField = (input) => {
  if (!input) return;

  const raw = input.value;

  // Keep only digits + dot/comma
  const normalized = raw.replace(/[^\d.,-]/g, '');

  let separator = '';
  let intPart = normalized;
  let fracPart = '';

  if (normalized.includes('.') && normalized.includes(',')) {
    // Both exist: assume comma is decimal separator
    separator = ',';
    const parts = normalized.split(',');
    intPart = parts[0].replace(/\./g, '');
    fracPart = parts[1] || '';
  } else if (normalized.includes('.') && !normalized.includes(',')) {
    const parts = normalized.split('.');
    intPart = parts[0].replace(/\./g, '');
    fracPart = parts[1] || '';

    // If dot is used as decimal (e.g. 9999.99), treat it as decimal separator
    if (fracPart.length <= 2) {
      separator = ',';
    } else {
      // Treat dot as thousand separator (e.g. 10.000)
      intPart = intPart + fracPart;
      fracPart = '';
    }
  } else if (normalized.includes(',') && !normalized.includes('.')) {
    const parts = normalized.split(',');
    intPart = parts[0].replace(/,/g, '');
    fracPart = parts[1] || '';
    separator = ',';
  }

  // Remove leading zeros
  intPart = intPart.replace(/^0+(?!$)/, '');

  // Add thousand separators
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  let formatted = formattedInt;
  if (separator && fracPart !== '') {
    formatted += separator + fracPart;
  }

  input.value = formatted;
  input.setSelectionRange(formatted.length, formatted.length);
};

// Update Rupiah formatted preview
const updateFormattedAmount = () => {
  const amount = parseAmountInput(document.getElementById('amount').value);
  const preview = document.getElementById('formattedAmount');
  if (!preview) return;

  if (!amount || isNaN(amount)) {
    preview.textContent = '';
    return;
  }

  preview.textContent = `Rupiah: ${formatCurrency(amount)}`;
};

// Load categories
const loadCategories = async () => {
  try {
    const response = await apiCall('/categories');
    categories = response.data.filter(c => c.type === transactionType);

    const datalist = document.getElementById('categories');
    datalist.innerHTML = '';

    // Ensure categories are sorted A-Z for better UX
    categories.sort((a, b) => a.name.localeCompare(b.name));

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      datalist.appendChild(option);
    });
  } catch (error) {
    showAlert('Gagal memuat kategori', 'danger');
  }
};

// Check budget warning
const checkBudget = async () => {
  const categoryName = document.getElementById('category').value;
  const amount = parseAmountInput(document.getElementById('amount').value);

  const warningDiv = document.getElementById('budgetWarning');

  // Skip budget warning when there's no valid category or amount
  const category = findCategoryByName(categoryName);
  if (!category || !amount || isNaN(amount)) {
    warningDiv.classList.remove('show');
    return;
  }

  try {
    const transactionDate = document.getElementById('date')?.value;
    const monthYear = getMonthYearFromDate(transactionDate) || getCurrentMonth();
    const response = await apiCall(
      `/budgets/check-warning?category_id=${category.id}&month=${monthYear.month}&year=${monthYear.year}&amount=${amount}`
    );

    const data = response.data;

    if (!data.has_budget) {
      warningDiv.classList.remove('show');
      return;
    }

    if (data.warning || data.exceeded) {
      warningDiv.classList.add('show');
      
      if (data.exceeded) {
        warningDiv.classList.add('danger');
        warningDiv.innerHTML = `
          ⚠️ <strong>Budget terlampaui!</strong> Budget tersisa hanya Rp ${formatCurrency(data.remaining)}.
          Anda akan melampaui budget sebesar Rp ${formatCurrency(Math.abs(data.remaining))}.
        `;
      } else {
        warningDiv.classList.remove('danger');
        warningDiv.innerHTML = `
          ⚠️ <strong>Peringatan budget!</strong> Budget tersisa Rp ${formatCurrency(data.remaining)} (${data.percentage_used}% terpakai).
        `;
      }
    } else {
      warningDiv.classList.remove('show');
    }
  } catch (error) {
    // Silent error, budget check is optional
  }
};

// Upload attachment and return server path
const uploadAttachment = async (file) => {
  if (!file) return null;

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || 'Gagal mengunggah lampiran');
  }

  return data.data?.path;
};

// Handle form submission
const handleSubmit = async (e) => {
  e.preventDefault();
  clearAlerts();

  const amount = parseAmountInput(document.getElementById('amount').value);
  const categoryName = document.getElementById('category').value.trim();
  const description = document.getElementById('description').value.trim();
  const transactionDate = document.getElementById('date').value;
  const transactionTime = document.getElementById('time').value;
  const isRecurring = document.getElementById('isRecurring')?.checked;
  const attachmentFile = document.getElementById('attachment')?.files?.[0];

  // Validation
  if (!amount || amount <= 0 || isNaN(amount)) {
    showAlert('Nominal harus diisi dan lebih dari 0', 'danger');
    return;
  }

  if (!categoryName) {
    showAlert('Kategori harus diisi', 'danger');
    return;
  }

  // Ensure category exists (create if new)
  let categoryId;
  const existingCategory = findCategoryByName(categoryName);
  if (existingCategory) {
    categoryId = existingCategory.id;
  } else {
    try {
      const response = await apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryName,
          type: transactionType,
        }),
      });

      categoryId = response.data.id;
      categories.push({ id: categoryId, name: categoryName, type: transactionType });

      // Add the new category to the suggestion list immediately
      const datalist = document.getElementById('categories');
      if (datalist) {
        const option = document.createElement('option');
        option.value = categoryName;
        datalist.appendChild(option);
      }
    } catch (error) {
      if (error.message && error.message.toLowerCase().includes('already exists')) {
        try {
          const existing = await apiCall('/categories', { showLoading: false });
          const found = existing.data.find(c => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === transactionType);
          if (found) {
            categoryId = found.id;
          }
        } catch (innerErr) {
          // ignore
        }
      }
    }
  }

  if (!categoryId) {
    showAlert('Kategori tidak dapat diproses, coba lagi.', 'danger');
    return;
  }

  disableButton('submitBtn');

  try {
    let attachmentPath = null;
    if (attachmentFile) {
      attachmentPath = await uploadAttachment(attachmentFile);
    }

    await apiCall('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        type: transactionType,
        category_id: categoryId,
        description: description || null,
        transaction_date: transactionDate,
        transaction_time: transactionTime,
        is_recurring: !!isRecurring,
        attachment_path: attachmentPath || null,
      }),
    });

    showToast('Transaksi berhasil disimpan', 'success');

    // Redirect to dashboard (to the month/year of the transaction) after a short delay to let toast show
    const monthYear = getMonthYearFromDate(transactionDate) || getCurrentMonth();
    setTimeout(() => {
      window.location.href = `/dashboard?month=${monthYear.month}&year=${monthYear.year}`;
    }, 600);

  } catch (error) {
    showAlert(error.message, 'danger');
    enableButton('submitBtn', '✓ Simpan & Lanjut');
  }
};
