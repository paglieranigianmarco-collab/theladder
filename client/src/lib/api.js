const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Dashboard
  netWorth: () => request('/dashboard/networth'),
  deadlines: () => request('/dashboard/deadlines'),
  cashflow: (year) => request(`/dashboard/cashflow?year=${year}`),
  getCash: () => request('/dashboard/cash'),
  addCash: (data) => request('/dashboard/cash', { method: 'POST', body: data }),
  updateCash: (id, data) => request(`/dashboard/cash/${id}`, { method: 'PUT', body: data }),
  deleteCash: (id) => request(`/dashboard/cash/${id}`, { method: 'DELETE' }),
  getSettings: () => request('/dashboard/settings'),
  updateSettings: (data) => request('/dashboard/settings', { method: 'PUT', body: data }),

  // Income
  getIncome: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/income${q ? '?' + q : ''}`)
  },
  addIncome: (data) => request('/income', { method: 'POST', body: data }),
  updateIncome: (id, data) => request(`/income/${id}`, { method: 'PUT', body: data }),
  deleteIncome: (id) => request(`/income/${id}`, { method: 'DELETE' }),
  incomeSummary: (year) => request(`/income/summary?year=${year}`),

  // Taxes
  getTaxes: () => request('/taxes'),
  updateTax: (id, data) => request(`/taxes/${id}`, { method: 'PUT', body: data }),
  taxBuffer: (year) => request(`/taxes/buffer?year=${year}`),

  // Loans
  getLoans: () => request('/loans'),
  addLoan: (data) => request('/loans', { method: 'POST', body: data }),
  updateLoan: (id, data) => request(`/loans/${id}`, { method: 'PUT', body: data }),
  deleteLoan: (id) => request(`/loans/${id}`, { method: 'DELETE' }),
  loanProjection: (id, extra) => request(`/loans/${id}/projection`, { method: 'POST', body: { extra_payment: extra } }),
  logPayment: (id, data) => request(`/loans/${id}/payments`, { method: 'POST', body: data }),
  getPayments: (id) => request(`/loans/${id}/payments`),

  // Investments
  getInvestments: () => request('/investments'),
  addInvestment: (data) => request('/investments', { method: 'POST', body: data }),
  updateInvestment: (id, data) => request(`/investments/${id}`, { method: 'PUT', body: data }),
  deleteInvestment: (id) => request(`/investments/${id}`, { method: 'DELETE' }),
  investmentSummary: () => request('/investments/summary'),
}
