const Store = {
    // Keys mapping
    keys: {
        INCOME_CAT: 'finance_income_categories',
        EXPENSE_CAT: 'finance_expense_categories',
        DEBT_CAT: 'finance_debt_categories',
        INCOMES: 'finance_incomes',
        EXPENSES: 'finance_expenses',
        DEBT_PAYMENTS: 'finance_debt_payments',
        MEAL_SPLITS: 'finance_meal_splits',
        INSTALLMENT_NAME_CAT: 'finance_installment_names'
    },

    // Initialize mock data if empty
    init() {
        Object.values(this.keys).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });
    },

    // Read
    getAll(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            console.error("Error reading from localStorage", e);
            return [];
        }
    },

    getById(key, id) {
        const items = this.getAll(key);
        return items.find(item => item.id === id);
    },

    // Write
    add(key, item) {
        const items = this.getAll(key);

        // Generate prefix based on key
        let prefix = 'OBJ';
        if (key === this.keys.INCOME_CAT) prefix = 'INC';
        if (key === this.keys.EXPENSE_CAT) prefix = 'EXP';
        if (key === this.keys.DEBT_CAT) prefix = 'DBT';
        if (key === this.keys.INCOMES) prefix = 'T-INC';
        if (key === this.keys.EXPENSES) prefix = 'T-EXP';
        if (key === this.keys.DEBT_PAYMENTS) prefix = 'T-DBT';
        if (key === this.keys.MEAL_SPLITS) prefix = 'MEAL';
        if (key === this.keys.INSTALLMENT_NAME_CAT) prefix = 'INST-CAT';

        // Simple random ID generation
        item.id = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        items.push(item);
        localStorage.setItem(key, JSON.stringify(items));
        return item;
    },

    update(key, id, updatedData) {
        const items = this.getAll(key);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updatedData, id }; // Keep original ID
            localStorage.setItem(key, JSON.stringify(items));
            return items[index];
        }
        return null;
    },

    delete(key, id) {
        const items = this.getAll(key);
        const filtered = items.filter(item => item.id !== id);
        localStorage.setItem(key, JSON.stringify(filtered));

        // Clean up related transactions if a category/debt is deleted
        if (key === this.keys.INCOME_CAT) {
            this._deleteRelatedTransactions(this.keys.INCOMES, 'categoryId', id);
        } else if (key === this.keys.EXPENSE_CAT) {
            this._deleteRelatedTransactions(this.keys.EXPENSES, 'categoryId', id);
        } else if (key === this.keys.DEBT_CAT) {
            this._deleteRelatedTransactions(this.keys.DEBT_PAYMENTS, 'debtId', id);
        }
    },

    _deleteRelatedTransactions(transKey, refField, refId) {
        const transactions = this.getAll(transKey);
        const filtered = transactions.filter(t => t[refField] !== refId);
        if (transactions.length !== filtered.length) {
            localStorage.setItem(transKey, JSON.stringify(filtered));
        }
    },

    // Auto-generate bills for monthly debts AND monthly expenses
    generateMonthlyBillsForCurrentMonth() {
        const debts = this.getAll(this.keys.DEBT_CAT).filter(d => d.monthly);
        const expenseCats = this.getAll(this.keys.EXPENSE_CAT).filter(c => c.monthly);
        const bills = this.getAll(this.keys.DEBT_PAYMENTS);

        const now = new Date();
        // Reset time to start of day for accurate day-only comparison
        now.setHours(0, 0, 0, 0);

        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let newBillsCount = 0;

        // Helper function to process generation for a specific target month
        const processForMonth = (tMonthOffset) => {
            const targetDate = new Date(currentYear, currentMonth + tMonthOffset, 1);
            const tYear = targetDate.getFullYear();
            const tMonth = targetDate.getMonth();

            // 1. Process Debts
            debts.forEach(debt => {
                const dueDateNum = parseInt(debt.dueDate) || 1;
                // Bill generation allows 10 days in advance
                const generationDate = new Date(tYear, tMonth, dueDateNum - 10);
                
                if (now < generationDate) return; // Too early to generate this bill

                const alreadyExists = bills.some(b => {
                    if (b.debtId !== debt.id) return false;
                    const [bYear, bMonth] = b.date.split('-');
                    return parseInt(bMonth, 10) - 1 === tMonth && parseInt(bYear, 10) === tYear;
                });

                let loanHasStarted = true;
                if (debt.loanDate) {
                    const loanDateObj = new Date(debt.loanDate);
                    const billDateObj = new Date(tYear, tMonth, dueDateNum);
                    
                    if (billDateObj <= loanDateObj) {
                        loanHasStarted = false;
                    }
                }

                if (!alreadyExists && loanHasStarted) {
                    const monthStr = String(tMonth + 1).padStart(2, '0');
                    const dayStr = String(dueDateNum).padStart(2, '0');
                    const billDateStr = `${tYear}-${monthStr}-${dayStr}`;
                    const existingDebtBills = bills.filter(b => b.debtId === debt.id);
                    const billIndex = existingDebtBills.length;

                    if (debt.termMonths && billIndex >= debt.termMonths) return;

                    let paymentAmount = 0;
                    if (debt.paymentType === 'custom' && debt.customPayments && debt.customPayments.length > billIndex) {
                        paymentAmount = debt.customPayments[billIndex];
                    } else {
                        paymentAmount = debt.fixedPaymentAmount || (debt.termMonths > 0 ? (debt.totalAmount / debt.termMonths) : debt.totalAmount);
                    }

                    this.add(this.keys.DEBT_PAYMENTS, {
                        date: billDateStr,
                        debtId: debt.id,
                        amount: paymentAmount,
                        isPaid: false
                    });
                    bills.push({ // Update local bills array for subsequent checks
                        date: billDateStr,
                        debtId: debt.id,
                        amount: paymentAmount,
                        isPaid: false
                    });
                    newBillsCount++;
                }
            });

            // 2. Process Monthly Expenses
            expenseCats.forEach(cat => {
                // For expenses without a due date, generate at the start of the month (or 10 days before the 1st = ~21st of prev month)
                const generationDate = new Date(tYear, tMonth, 1 - 10);
                if (now < generationDate) return;

                const alreadyExists = bills.some(b => {
                    if (b.categoryId !== cat.id) return false;
                    const [bYear, bMonth] = b.date.split('-');
                    return parseInt(bMonth, 10) - 1 === tMonth && parseInt(bYear, 10) === tYear;
                });

                if (!alreadyExists) {
                    const monthStr = String(tMonth + 1).padStart(2, '0');
                    const billDateStr = `${tYear}-${monthStr}-01`;

                    this.add(this.keys.DEBT_PAYMENTS, {
                        date: billDateStr,
                        categoryId: cat.id,
                        amount: parseFloat(cat.amount) || 0,
                        isPaid: false
                    });
                    bills.push({ // Update local bills array
                        date: billDateStr,
                        categoryId: cat.id,
                        amount: parseFloat(cat.amount) || 0,
                        isPaid: false
                    });
                    newBillsCount++;
                }
            });
        };

        // Check for current month and next month (in case we are 10 days near the end of the month)
        processForMonth(0);
        processForMonth(1);

        return newBillsCount;
    },

    getDashboardStats() {
        const incomes = this.getAll(this.keys.INCOMES);
        const expenses = this.getAll(this.keys.EXPENSES);
        const debts = this.getAll(this.keys.DEBT_CAT);
        const debtPayments = this.getAll(this.keys.DEBT_PAYMENTS);

        const paidBills = debtPayments.filter(dp => dp.isPaid === true);
        const unpaidBills = debtPayments.filter(dp => dp.isPaid === false);

        const totalIncome = incomes.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const baseExpenseAmount = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        let legacyPaidBillsAmount = 0;

        paidBills.forEach(b => {
            const hasExpenseRow = expenses.some(e => e.id === b.expenseTxId || e.fromBillId === b.id);
            if (!hasExpenseRow) {
                legacyPaidBillsAmount += parseFloat(b.amount || 0);
            }
        });

        // totalExpense includes base expenses (which now naturally contain new paid bills) + legacy missing paid bills
        const totalExpense = baseExpenseAmount + legacyPaidBillsAmount;

        // Unpaid current bills
        const unpaidDebtAmount = unpaidBills.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        // Paid debt bills (for debt remaining logic)
        const totalPaidDebtAmount = paidBills
            .filter(b => b.debtId)
            .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

        const totalDebtAmount = debts.reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0);
        const debtRemaining = Math.max(0, totalDebtAmount - totalPaidDebtAmount);

        // Account balance
        const balance = totalIncome - totalExpense;

        return {
            totalIncome,
            totalExpense,
            balance,
            debtRemaining,
            unpaidDebtAmount
        };
    },

    // Export all data to a JSON string
    exportData() {
        const data = {};
        Object.keys(this.keys).forEach(keyName => {
            const storageKey = this.keys[keyName];
            data[storageKey] = this.getAll(storageKey);
        });
        return JSON.stringify(data, null, 2);
    },

    // Import data from a JSON string
    importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data || typeof data !== 'object') throw new Error("Invalid format");

            this.clearAll();

            // Set data from JSON
            Object.keys(data).forEach(storageKey => {
                localStorage.setItem(storageKey, JSON.stringify(data[storageKey]));
            });

            // Ensure all required keys exist (init will fill missing ones with [])
            this.init();

            console.log("Data imported successfully:", Object.keys(data));
            return true;
        } catch (e) {
            console.error("Error importing data:", e);
            return false;
        }
    },

    // Clear all financial data
    clearAll() {
        Object.values(this.keys).forEach(storageKey => {
            localStorage.setItem(storageKey, JSON.stringify([]));
        });
    }
};

Store.init();
