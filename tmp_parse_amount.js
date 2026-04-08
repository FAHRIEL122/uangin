const parseAmountInput = (value) => {
  if (!value) return NaN;
  let cleaned = String(value).trim();
  cleaned = cleaned.replace(/[^\d.,-]/g, '');

  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if ((cleaned.match(/\./g) || []).length > 1 && !cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '');
  } else if (!cleaned.includes(',') && (cleaned.match(/\./g) || []).length === 1) {
    const [intPart, fracPart] = cleaned.split('.');
    if (fracPart && fracPart.length === 3) {
      cleaned = intPart + fracPart;
    }
  } else if ((cleaned.match(/,/g) || []).length > 1 && !cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',') && !cleaned.includes('.')) {
    cleaned = cleaned.replace(',', '.');
  }

  return parseFloat(cleaned);
};

console.log('10.000 ->', parseAmountInput('10.000'));
console.log('9999.99 ->', parseAmountInput('9999.99'));
console.log('1.234.567 ->', parseAmountInput('1.234.567'));
console.log('1,234.56 ->', parseAmountInput('1,234.56'));
console.log('12,34 ->', parseAmountInput('12,34'));
