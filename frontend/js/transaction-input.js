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
    const response = await apiCall('/categories', { showLoading: false });
    
    if (!response || !response.data || !Array.isArray(response.data)) {
      console.error('Invalid categories response:', response);
      showAlert('Format data kategori tidak valid', 'danger');
      return;
    }
    
    categories = response.data.filter(c => c.type === transactionType);

    const datalist = document.getElementById('categories');
    if (!datalist) {
      console.error('Categories datalist element not found');
      return;
    }
    
    datalist.innerHTML = '';

    // Ensure categories are sorted A-Z for better UX
    categories.sort((a, b) => a.name.localeCompare(b.name));

    if (categories.length === 0) {
      console.warn(`No ${transactionType} categories loaded for this user`);
    }

    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.name;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading categories:', error);
    showAlert('Gagal memuat kategori: ' + (error.message || 'Unknown error'), 'danger');
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

  // DEBUG: Log form input values
  console.log('=== FORM SUBMISSION DEBUG ===');
  console.log('Raw amount input:', document.getElementById('amount').value);
  console.log('Parsed amount:', amount);
  console.log('Category name:', categoryName);
  console.log('Description:', description);
  console.log('Transaction date:', transactionDate);
  console.log('Transaction time:', transactionTime);
  console.log('Is recurring:', isRecurring);
  console.log('Transaction type:', transactionType);
  console.log('=============================');

  // Validation
  if (!amount || amount <= 0 || isNaN(amount)) {
    console.error('VALIDATION FAILED: Invalid amount', { amount, isNaN: isNaN(amount) });
    showAlert('Nominal harus diisi dan lebih dari 0', 'danger');
    return;
  }

  if (!categoryName) {
    console.error('VALIDATION FAILED: Category name is empty');
    showAlert('Kategori harus diisi', 'danger');
    return;
  }

  if (!transactionDate) {
    console.error('VALIDATION FAILED: Transaction date is empty');
    showAlert('Tanggal harus diisi', 'danger');
    return;
  }

  if (!transactionTime) {
    console.error('VALIDATION FAILED: Transaction time is empty');
    showAlert('Jam harus diisi', 'danger');
    return;
  }

  // Disable button early to prevent double submission
  disableButton('submitBtn');

  // Ensure category exists (create if new)
  let categoryId;
  const existingCategory = findCategoryByName(categoryName);
  if (existingCategory) {
    categoryId = existingCategory.id;
    console.log('Category found:', existingCategory);
  } else {
    console.log('Category not found in local, will try to create...');
    try {
      const createResponse = await apiCall('/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: categoryName,
          type: transactionType,
        }),
      });

      if (createResponse && createResponse.data && createResponse.data.id) {
        categoryId = createResponse.data.id;
        categories.push({ id: categoryId, name: categoryName, type: transactionType });
        console.log('Category created:', createResponse.data);

        // Add the new category to the suggestion list immediately
        const datalist = document.getElementById('categories');
        if (datalist) {
          const option = document.createElement('option');
          option.value = categoryName;
          datalist.appendChild(option);
        }
      }
    } catch (error) {
      // If creation failed with "already exists", try to find it in existing categories
      if (error.message && error.message.toLowerCase().includes('already exists')) {
        try {
          const allCategories = await apiCall('/categories', { showLoading: false });
          if (allCategories && allCategories.data) {
            const found = allCategories.data.find(c => c.name.toLowerCase() === categoryName.toLowerCase() && c.type === transactionType);
            if (found) {
              categoryId = found.id;
              // Update local categories if not there
              if (!categories.find(c => c.id === found.id)) {
                categories.push(found);
              }
              console.log('Category found after "already exists" error:', found);
            }
          }
        } catch (innerErr) {
          console.error('Failed to fetch categories:', innerErr);
        }
      } else {
        console.error('Failed to create/fetch category:', error);
      }
    }
  }

  if (!categoryId) {
    console.error('ERROR: categoryId is still null/undefined');
    showAlert('Kategori tidak dapat diproses. Silakan periksa kategori dan coba lagi.', 'danger');
    enableButton('submitBtn', '✓ Simpan & Lanjut');
    return;
  }

  console.log('Proceeding with transaction submission...');

  try {
    let attachmentPath = null;
    if (attachmentFile) {
      attachmentPath = await uploadAttachment(attachmentFile);
    }

    const payload = {
      amount,
      type: transactionType,
      category_id: categoryId,
      description: description || null,
      transaction_date: transactionDate,
      transaction_time: transactionTime,
      is_recurring: !!isRecurring,
      attachment_path: attachmentPath || null,
    };
    
    console.log('=== API PAYLOAD ===');
    console.log('POST /api/transactions');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('===================');

    const response = await apiCall('/transactions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    console.log('API Response:', response);
    showToast('Transaksi berhasil disimpan', 'success');

    // Redirect to dashboard (to the month/year of the transaction) after a short delay to let toast show
    const monthYear = getMonthYearFromDate(transactionDate) || getCurrentMonth();
    setTimeout(() => {
      window.location.href = `/dashboard?month=${monthYear.month}&year=${monthYear.year}`;
    }, 600);

  } catch (error) {
    console.error('=== TRANSACTION SUBMISSION ERROR ===');
    console.error('Error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===================================');
    showAlert(error.message || 'Terjadi kesalahan saat menyimpan transaksi', 'danger');
    enableButton('submitBtn', '✓ Simpan & Lanjut');
  }
};
