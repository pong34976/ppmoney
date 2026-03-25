const app = {
    // Calculator State
    calcState: {
        val1: null,
        val2: null,
        op: null,
        display: '0',
        history: '',
        newNum: true,
        targetInputId: null
    },
    uiState: {
        incomeView: 'today',
        expenseView: 'today'
    },

    init() {
        this.setupNavigation();
        this.setupForms();

        // Apply section accent classes for visual distinction
        const billsSection = document.getElementById('transaction-debt');
        if (billsSection) billsSection.classList.add('section-debt-bills');

        // Set default dates to today with a small delay to ensure DOM is ready
        setTimeout(() => {
            console.log('Calling initializeDefaultDates(true) from init');
            this.initializeDefaultDates(true);
        }, 100);

        // Initial render (will be updated after startup choice)
        this.refreshAll();

        // Check if there is any existing data
        const hasData = Object.values(Store.keys).some(key => {
            const data = Store.getAll(key);
            return data && data.length > 0;
        });

        // Show startup modal only if no data exists
        const startupModal = document.getElementById('startup-modal');
        if (startupModal) {
            startupModal.style.display = hasData ? 'none' : 'flex';
        }
    },

    initializeDefaultDates(force = false) {
        const today = UI.getTodayISO();
        console.log('initializeDefaultDates current today:', today);
        const dateInputs = ['dc-loan-date', 'ti-date', 'te-date', 'ms-date', 'mb-date'];
        dateInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                console.log(`Checking field ${id}, current value: "${el.value}", force: ${force}`);
                if (force || !el.value) {
                    el.value = today;
                    console.log(`Set ${id} to ${today}`);
                }
            } else {
                console.warn(`Field ${id} NOT FOUND in DOM`);
            }
        });
    },


    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-target]');
        const sections = document.querySelectorAll('.view-section');
        const sidebar  = document.getElementById('sidebar');
        const overlay  = document.getElementById('sidebar-overlay');
        const hamburger = document.getElementById('hamburger-btn');

        // --- Hamburger toggle ---
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                const isOpen = sidebar.classList.toggle('open');
                hamburger.classList.toggle('open', isOpen);
                overlay.classList.toggle('visible', isOpen);
            });
        }

        // --- Close sidebar via overlay tap ---
        if (overlay) {
            overlay.addEventListener('click', () => this.closeSidebar());
        }

        // --- Navigate to a section by id ---
        this.navigateTo = (targetId, pushHash = true) => {
            // Update URL hash
            if (pushHash && window.location.hash !== '#' + targetId) {
                history.pushState(null, '', '#' + targetId);
            }

            // Activate nav item
            navItems.forEach(nav => {
                nav.classList.toggle('active', nav.getAttribute('data-target') === targetId);
            });

            // Show target section
            sections.forEach(sec => sec.classList.remove('active'));
            const targetEl = document.getElementById(targetId);
            if (targetEl) targetEl.classList.add('active');

            // Refresh data and dates
            this.refreshAll();
            this.initializeDefaultDates();

            // Close sidebar on mobile after navigation
            this.closeSidebar();

            // Scroll to top
            window.scrollTo(0, 0);
        };

        // --- Close sidebar helper ---
        this.closeSidebar = () => {
            if (sidebar) sidebar.classList.remove('open');
            if (hamburger) hamburger.classList.remove('open');
            if (overlay) overlay.classList.remove('visible');
        };

        // --- Attach nav item click handlers ---
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.getAttribute('data-target');
                if (targetId) this.navigateTo(targetId);
            });
        });

        // --- Handle hash change (back/forward & direct URL) ---
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.replace('#', '');
            const valid = hash && document.getElementById(hash);
            this.navigateTo(valid ? hash : 'dashboard', false);
        });

        // --- Load from URL hash on init ---
        const initialHash = window.location.hash.replace('#', '');
        const initialTarget = (initialHash && document.getElementById(initialHash)) ? initialHash : 'dashboard';
        this.navigateTo(initialTarget, !initialHash);
    },

    resetForm(formId) {
        const form = document.getElementById(formId);
        if (form) form.reset();

        // Custom reset for hidden inputs
        const hiddenInputs = ['ic-id', 'ec-id', 'dc-id', 'ti-id', 'te-id', 'td-id'];
        hiddenInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        // Restore default dates
        this.initializeDefaultDates(true);

        // Reset visibility of amount container for expenses
        const ecAmountCont = document.getElementById('ec-amount-container');
        if (ecAmountCont) ecAmountCont.style.display = 'none';

        if (formId === 'form-meal-split') {
            const splitCont = document.getElementById('ms-person-count-container');
            if (splitCont) splitCont.style.display = 'none';
            const borrowerCont = document.getElementById('ms-borrower-container');
            if (borrowerCont) borrowerCont.style.display = 'flex';
        }
    },

    setupForms() {
        // --- Categories Forms --- //

        document.getElementById('form-income-category').addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('ic-id').value;
            const data = {
                name: document.getElementById('ic-name').value,
                monthly: document.getElementById('ic-monthly').checked
            };

            if (id) Store.update(Store.keys.INCOME_CAT, id, data);
            else Store.add(Store.keys.INCOME_CAT, data);

            this.resetForm('form-income-category');
            this.refreshAll();
        });

        document.getElementById('form-expense-category').addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('ec-id').value;
            const data = {
                name: document.getElementById('ec-name').value,
                monthly: document.getElementById('ec-monthly').checked,
                amount: parseFloat(document.getElementById('ec-amount').value) || 0
            };

            if (id) Store.update(Store.keys.EXPENSE_CAT, id, data);
            else Store.add(Store.keys.EXPENSE_CAT, data);

            this.resetForm('form-expense-category');
            this.refreshAll();
        });

        // Toggle amount field for expense category
        document.getElementById('ec-monthly').addEventListener('change', (e) => {
            document.getElementById('ec-amount-container').style.display = e.target.checked ? 'flex' : 'none';
        });

        document.getElementById('form-debt-category').addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('dc-id').value;
            const data = {
                name: document.getElementById('dc-name').value,
                totalAmount: parseFloat(document.getElementById('dc-total').value) || 0,
                termMonths: parseInt(document.getElementById('dc-term').value) || 1,
                dueDate: document.getElementById('dc-due').value ? parseInt(document.getElementById('dc-due').value) : '',
                loanDate: document.getElementById('dc-loan-date').value || '',
                monthly: document.getElementById('dc-monthly').checked
            };

            if (!id) {
                // Initial defaults for a new debt
                data.paymentType = 'fixed';
                data.fixedPaymentAmount = data.termMonths > 0 ? (data.totalAmount / data.termMonths) : data.totalAmount;
                data.customPayments = Array(data.termMonths).fill(0);
            }

            if (id) Store.update(Store.keys.DEBT_CAT, id, data);
            else Store.add(Store.keys.DEBT_CAT, data);

            this.resetForm('form-debt-category');
            this.refreshAll();
        });

        // Toggle fixed vs variable in modal
        document.getElementById('inst-is-fixed').addEventListener('change', (e) => {
            const isFixed = e.target.checked;
            document.getElementById('inst-fixed-section').style.display = isFixed ? 'flex' : 'none';
            document.getElementById('inst-variable-section').style.display = isFixed ? 'none' : 'block';
        });

        // --- Transaction Forms --- //

        document.getElementById('form-trans-income').addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('ti-id').value;
            const now = new Date();
            const autoTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const data = {
                date: document.getElementById('ti-date').value,
                time: document.getElementById('ti-time').value || autoTime,
                categoryId: document.getElementById('ti-category').value,
                amount: parseFloat(document.getElementById('ti-amount').value) || 0,
                note: document.getElementById('ti-note').value
            };

            if (!data.categoryId) return alert('กรุณาเลือกประเภทรายรับ');

            if (id) Store.update(Store.keys.INCOMES, id, data);
            else Store.add(Store.keys.INCOMES, data);

            this.resetForm('form-trans-income');
            this.refreshAll();
        });

        document.getElementById('form-trans-expense').addEventListener('submit', e => {
            e.preventDefault();
            const id = document.getElementById('te-id').value;
            const now = new Date();
            const autoTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
            const data = {
                date: document.getElementById('te-date').value,
                time: document.getElementById('te-time').value || autoTime,
                categoryId: document.getElementById('te-category').value,
                amount: parseFloat(document.getElementById('te-amount').value) || 0,
                note: document.getElementById('te-note').value
            };

            if (!data.categoryId) return alert('กรุณาเลือกประเภทรายจ่าย');

            if (id) Store.update(Store.keys.EXPENSES, id, data);
            else Store.add(Store.keys.EXPENSES, data);

            this.resetForm('form-trans-expense');
            this.refreshAll();
        });

        // Transaction form for debt payments has been removed/replaced by bills view

        // --- Meal Split Form ---
        document.getElementById('ms-split-check').addEventListener('change', (e) => {
            document.getElementById('ms-person-count-container').style.display = e.target.checked ? 'flex' : 'none';
            const borrowerContainer = document.getElementById('ms-borrower-container');
            if (borrowerContainer) borrowerContainer.style.display = e.target.checked ? 'none' : 'flex';
        });

        document.getElementById('form-meal-split').addEventListener('submit', e => {
            e.preventDefault();
            const totalAmount = parseFloat(document.getElementById('ms-total').value) || 0;
            const isSplit = document.getElementById('ms-split-check').checked;
            let personCount = isSplit ? (parseInt(document.getElementById('ms-person-count').value) || 2) : 1;
            const note = document.getElementById('ms-note').value;
            const date = document.getElementById('ms-date').value;
            const borrowerNameInput = document.getElementById('ms-borrower-name');
            const borrowerName = borrowerNameInput ? borrowerNameInput.value.trim() : '';

            if (totalAmount <= 0) return alert('กรุณากรอกราคารวม');
            if (isSplit && personCount < 2) {
                alert('จำนวนคนต้องอย่างน้อย 2 คน (รวม "เรา" ด้วย)');
                document.getElementById('ms-person-count').value = 2;
                return;
            }

            // Temporarily store data for bill modal
            this._pendingMealSplit = { date, totalAmount, note, isSplit, personCount, members: [] };

            if (isSplit) {
                this.openMealBillModal(totalAmount, personCount, note, date);
            } else {
                let members = [];
                if (borrowerName) {
                    // ออกให้คนอื่นเต็มจำนวน แต่ไม่ได้ติ๊กหารค่าข้าว ให้เก็บเป็นคนยืม
                    members = [
                        { name: 'เรา', amount: totalAmount, isPayer: true, givenTo: false, refunded: false },
                        { name: borrowerName, amount: totalAmount, isPayer: false, givenTo: false, refunded: false }
                    ];
                    personCount = 2;
                } else {
                    // Not splitting - "เรา" ออกเองคนเดียว ไม่มีคนอื่นต้องจ่าย
                    members = [{ name: 'เรา', amount: totalAmount, isPayer: true, givenTo: false, refunded: false }];
                }
                Store.add(Store.keys.MEAL_SPLITS, { date, totalAmount, note, isSplit: false, personCount, members });

                let expenseNote = note || 'ออกค่าข้าว';
                if (borrowerName) {
                    expenseNote += ` (ให้ ${borrowerName} ยืม)`;
                }

                this.recordMealExpense(date, totalAmount, 'หารค่าข้าว', expenseNote);
                this.resetForm('form-meal-split');
                this.refreshAll();
                alert('✅ บันทึกรายการออกค่าข้าวและรายจ่ายเรียบร้อยแล้ว');
            }
        });

        // --- Meal Borrow Form ---
        document.getElementById('form-meal-borrow').addEventListener('submit', e => {
            e.preventDefault();
            const totalAmount = parseFloat(document.getElementById('mb-total').value) || 0;
            const lenderName = document.getElementById('mb-lender-name').value.trim();
            const note = document.getElementById('mb-note').value;
            const date = document.getElementById('mb-date').value;

            if (totalAmount <= 0) return alert('กรุณากรอกยอดเงิน');
            if (!lenderName) return alert('กรุณาระบุชื่อคนให้ยืม');

            // Save the borrow item in MEAL_SPLITS list but flag it as a borrow
            const borrowItem = {
                date, totalAmount, note,
                isBorrow: true,
                lenderName: lenderName,
                isReturned: false
            };

            Store.add(Store.keys.MEAL_SPLITS, borrowItem);

            // Record as income
            const incomeNote = note ? `${note} (ยืม ${lenderName} มา)` : `ยืม ${lenderName} มา`;
            this.recordMealBorrowIncome(date, totalAmount, 'ยืม', incomeNote);

            this.resetForm('form-meal-borrow');
            this.refreshAll();
            alert('✅ บันทึกรายการขอยืมและรายรับเรียบร้อยแล้ว');
        });
    },

    generateCurrentMonthBills() {
        const count = Store.generateMonthlyBillsForCurrentMonth();
        this.refreshAll();

        if (count > 0) {
            alert(`อัพเดทสำเร็จ! สร้างบิลใหม่รอบเดือนนี้จำนวน ${count} รายการ`);
        } else {
            alert('ไม่มีรายการบิลใหม่ที่ต้องสร้าง (บิลรอบเดือนนี้มีอยู่แล้ว)');
        }
    },

    // ============ CALCULATOR FUNCTIONS ============
    toggleCalculator(targetInputId = null) {
        const modal = document.getElementById('calculator-modal');
        if (!modal) return;
        
        const isOpening = modal.style.display !== 'flex';
        if (isOpening) {
            modal.style.display = 'flex';
            this.calcState.targetInputId = targetInputId;
            
            // Show/hide use result button based on if we opened it from an input
            const useBtn = document.getElementById('calc-use-btn');
            if (useBtn) {
                useBtn.style.display = targetInputId ? 'block' : 'none';
            }

            // Reset and load value from input if it exists
            this.calcInput('AC'); // Clear first
            this.calcUpdateUI();

            if (targetInputId) {
                const targetEl = document.getElementById(targetInputId);
                if (targetEl && targetEl.value) {
                    const val = parseFloat(targetEl.value);
                    if (!isNaN(val)) {
                        this.calcState.display = val.toString();
                        this.calcState.newNum = false;
                        this.calcUpdateUI();
                    }
                }
            }
        } else {
            modal.style.display = 'none';
        }
    },

    calcInput(btn) {
        let s = this.calcState;
        
        if (btn === 'AC') {
            s.val1 = null; s.val2 = null; s.op = null;
            s.display = '0'; s.history = ''; s.newNum = true;
        } 
        else if (btn === 'DEL') {
            if (!s.newNum) {
                s.display = s.display.length > 1 ? s.display.slice(0, -1) : '0';
                if (s.display === '0') s.newNum = true;
            }
        }
        else if (['+', '-', '×', '÷'].includes(btn)) {
            if (s.op && !s.newNum) {
                this.calcCalculate(); // chain calc
            } else {
                s.val1 = parseFloat(s.display);
            }
            s.op = btn;
            s.newNum = true;
            s.history = `${s.val1} ${s.op}`;
        }
        else if (btn === '=') {
            if (s.op && !s.newNum) {
                this.calcCalculate();
                s.op = null;
                s.history = '';
                s.newNum = true;
            }
        }
        else if (btn === '.') {
            if (s.newNum) {
                s.display = '0.';
                s.newNum = false;
            } else if (!s.display.includes('.')) {
                s.display += '.';
            }
        }
        else { // Numbers
            if (s.newNum) {
                s.display = btn;
                s.newNum = false;
            } else {
                // Prevent multiple leading zeros unless it's a decimal
                if (s.display === '0') s.display = btn;
                else s.display += btn;
            }
            // limit length
            if (s.display.length > 15) s.display = s.display.slice(0, 15);
        }

        this.calcUpdateUI();
    },

    calcCalculate() {
        let s = this.calcState;
        s.val2 = parseFloat(s.display);
        if (isNaN(s.val1) || isNaN(s.val2)) return;

        let res = 0;
        // high precision workaround using decimals
        const factor = 1000000; 
        const v1 = Math.round(s.val1 * factor);
        const v2 = Math.round(s.val2 * factor);

        switch (s.op) {
            case '+': res = (v1 + v2) / factor; break;
            case '-': res = (v1 - v2) / factor; break;
            case '×': res = (v1 * v2) / (factor * factor); break;
            case '÷': res = v2 === 0 ? 'Error' : (v1 / v2); break;
        }

        if (res !== 'Error') {
            // format to avoid long floating point issues (e.g. 0.300000000004)
            res = parseFloat(res.toFixed(6)); 
            s.display = res.toString();
            s.val1 = res;
        } else {
            s.display = 'Error';
            s.val1 = null;
        }
        s.history = `${s.val1} ${s.op} ${s.val2} =`;
    },

    calcUpdateUI() {
        document.getElementById('calc-display').textContent = this.calcState.display;
        document.getElementById('calc-history').textContent = this.calcState.history;
    },

    calcUseResult() {
        if (this.calcState.targetInputId && this.calcState.display !== 'Error') {
            const el = document.getElementById(this.calcState.targetInputId);
            if (el) {
                el.value = this.calcState.display;
                // Dispatch event to trigger any watchers
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
            this.toggleCalculator();
        }
    },

    refreshAll() {
        this.renderDashboard();
        this.renderDailyReport();

        this.renderIncomeCategories();
        this.renderExpenseCategories();
        this.renderDebtCategories();

        this.renderIncomeTransactions();
        this.renderExpenseTransactions();
        this.renderDebtTransactions();
        this.renderMealSplits();
        this.renderMealBorrows();

        this.populateSelects();
    },

    renderDashboard() {
        const stats = Store.getDashboardStats();
        const elTotalInc = document.getElementById('dash-total-income');
        const elTotalExp = document.getElementById('dash-total-expense');
        const elBalance = document.getElementById('dash-balance');
        const elUnpaidDebt = document.getElementById('dash-unpaid-debt');
        const elDebtRemaining = document.getElementById('dash-total-debt');

        if (elTotalInc) elTotalInc.textContent = UI.formatCurrency(stats.totalIncome);
        if (elTotalExp) elTotalExp.textContent = UI.formatCurrency(stats.totalExpense);
        if (elBalance) elBalance.textContent = UI.formatCurrency(stats.balance);
        if (elUnpaidDebt) elUnpaidDebt.textContent = UI.formatCurrency(stats.unpaidDebtAmount);
        if (elDebtRemaining) elDebtRemaining.textContent = UI.formatCurrency(stats.debtRemaining);
    },

    renderDailyReport() {
        const today = UI.getTodayISO();
        
        // Fetch all expenses and their categories
        const expenses = Store.getAll(Store.keys.EXPENSES);
        const categories = Store.getAll(Store.keys.EXPENSE_CAT);
        
        // Filter to only today's expenses
        const todaysExpenses = expenses.filter(e => e.date === today);
        
        // Calculate total
        const todayTotal = todaysExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        
        // Update total UI
        const elTodayTotal = document.getElementById('dash-today-expense');
        if (elTodayTotal) elTodayTotal.textContent = UI.formatCurrency(todayTotal);
        
        // Render table
        const tbody = document.querySelector('#table-dash-daily tbody');
        const emptyState = document.getElementById('dash-daily-empty');
        const table = document.getElementById('table-dash-daily');
        
        if (!tbody || !emptyState || !table) return;
        
        tbody.innerHTML = '';
        
        if (todaysExpenses.length === 0) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            table.style.display = 'table';
            emptyState.style.display = 'none';
            
            todaysExpenses.forEach(item => {
                const cat = categories.find(c => c.id === item.categoryId);
                const catName = cat ? cat.name : '<span style="color:red">ไม่ระบุ</span>';
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${catName}</td>
                    <td>${item.note || '-'}</td>
                    <td style="text-align: right; font-weight: 500;">${UI.formatCurrency(item.amount)}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    },

    renderIncomeCategories() {
        const data = Store.getAll(Store.keys.INCOME_CAT);
        UI.renderTable('table-income-category', data, [
            { key: 'id' },
            { key: 'name' },
            { key: 'monthly', type: 'boolean' }
        ], {
            onEdit: (item) => {
                document.getElementById('ic-id').value = item.id;
                document.getElementById('ic-name').value = item.name;
                document.getElementById('ic-monthly').checked = item.monthly;

                document.querySelector('[data-target="income-category"]').click();
                window.scrollTo(0, 0);
            },
            onDelete: (id) => {
                Store.delete(Store.keys.INCOME_CAT, id);
                this.refreshAll();
            }
        });
    },

    renderExpenseCategories() {
        const data = Store.getAll(Store.keys.EXPENSE_CAT);
        UI.renderTable('table-expense-category', data, [
            { key: 'id' },
            { key: 'name' },
            {
                key: 'amount',
                render: (val, item) => item.monthly ? UI.formatCurrency(val) : '-'
            },
            { key: 'monthly', type: 'boolean' }
        ], {
            onEdit: (item) => {
                document.getElementById('ec-id').value = item.id;
                document.getElementById('ec-name').value = item.name;
                document.getElementById('ec-monthly').checked = item.monthly;
                document.getElementById('ec-amount').value = item.amount || 0;
                document.getElementById('ec-amount-container').style.display = item.monthly ? 'flex' : 'none';

                document.querySelector('[data-target="expense-category"]').click();
                window.scrollTo(0, 0);
            },
            onDelete: (id) => {
                Store.delete(Store.keys.EXPENSE_CAT, id);
                this.refreshAll();
            }
        });
    },

    renderDebtCategories() {
        const data = Store.getAll(Store.keys.DEBT_CAT);

        const thead = document.querySelector(`#table-debt-category thead`);
        const tbody = document.querySelector(`#table-debt-category tbody`);
        if (!tbody) return;

        tbody.innerHTML = '';
        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td>${UI.formatCurrency(item.totalAmount)}</td>
                <td>${item.dueDate || '-'}</td>
                <td>${item.termMonths || 1} งวด</td>
                <td>${item.loanDate || '-'}</td>
                <td>${item.monthly ? '✔' : '❌'}</td>
                <td style="min-width: 150px;">
                    <button class="btn btn-action btn-sm" onclick="app.openInstallmentModal('${item.id}')" title="จัดการค่างวด">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ค่างวด
                    </button>
                    <button class="btn btn-edit btn-sm" onclick="app.editDebtCategory('${item.id}')" title="แก้ไข">✏️ แก้ไข</button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteDebtCategory('${item.id}')" title="ลบหนี้สินนี้ทั้งหมด!">❌ ลบหนี้สิน</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openInstallmentModal(id) {
        const debt = Store.getById(Store.keys.DEBT_CAT, id);
        if (!debt) return;

        document.getElementById('inst-debt-id').value = id;
        document.getElementById('installment-debt-name').textContent = `หนี้สิน: ${debt.name} (ยอดตั้งต้น: ${UI.formatCurrency(debt.totalAmount)})`;

        const isFixed = debt.paymentType !== 'custom';
        document.getElementById('inst-is-fixed').checked = isFixed;

        document.getElementById('inst-fixed-section').style.display = isFixed ? 'flex' : 'none';
        document.getElementById('inst-variable-section').style.display = isFixed ? 'none' : 'block';

        const fixedAmountInput = document.getElementById('inst-fixed-amount');
        fixedAmountInput.value = debt.fixedPaymentAmount || (debt.totalAmount / (debt.termMonths || 1)).toFixed(2);

        const container = document.getElementById('inst-months-container');
        container.innerHTML = '';

        const terms = debt.termMonths || 1;
        const customArr = debt.customPayments || [];

        // Determine start date for labeling
        let startDate = null;
        if (debt.loanDate) {
            const parts = debt.loanDate.split('-');
            // Use year and month only, day=1 to avoid timezone issues
            startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
        }

        for (let i = 0; i < terms; i++) {
            const val = customArr[i] !== undefined ? customArr[i] : 0;

            let label;
            if (startDate) {
                const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
                label = d.toLocaleString('th-TH', { month: 'long', year: 'numeric' });
            } else {
                label = `งวดที่ ${i + 1}`;
            }

            const div = document.createElement('div');
            div.className = 'form-group row';
            div.style.marginBottom = '8px';
            div.innerHTML = `
                <div class="col" style="flex: 0 0 140px; padding-top: 8px;">
                    <label style="font-size:13px;">${label}</label>
                </div>
                <div class="col">
                    <input type="number" class="inst-month-val" data-index="${i}" value="${val}" min="0">
                </div>
            `;
            container.appendChild(div);
        }

        document.getElementById('installment-modal').style.display = 'flex';
    },

    saveInstallments() {
        const id = document.getElementById('inst-debt-id').value;
        const isFixed = document.getElementById('inst-is-fixed').checked;
        const fixedAmt = parseFloat(document.getElementById('inst-fixed-amount').value) || 0;

        const debt = Store.getById(Store.keys.DEBT_CAT, id);
        if (!debt) return;

        const updateData = {
            paymentType: isFixed ? 'fixed' : 'custom',
            fixedPaymentAmount: fixedAmt,
            customPayments: isFixed ? (debt.customPayments || []) : []
        };

        if (!isFixed) {
            const inputs = document.querySelectorAll('.inst-month-val');
            const arr = [];
            inputs.forEach(inp => {
                arr.push(parseFloat(inp.value) || 0);
            });
            updateData.customPayments = arr;
        }

        Store.update(Store.keys.DEBT_CAT, id, updateData);
        document.getElementById('installment-modal').style.display = 'none';
        alert('บันทึกการตั้งค่าค่างวดเรียบร้อยแล้ว!');
        this.refreshAll();
    },

    editDebtCategory(id) {
        const item = Store.getById(Store.keys.DEBT_CAT, id);
        if (!item) return;
        document.getElementById('dc-id').value = item.id;
        document.getElementById('dc-name').value = item.name;
        document.getElementById('dc-total').value = item.totalAmount;
        document.getElementById('dc-term').value = item.termMonths || 1;
        document.getElementById('dc-due').value = item.dueDate;
        document.getElementById('dc-loan-date').value = item.loanDate;
        document.getElementById('dc-monthly').checked = item.monthly === true;

        document.querySelector('[data-target="debt-category"]').click();
        window.scrollTo(0, 0);
    },

    deleteDebtCategory(id) {
        const debt = Store.getById(Store.keys.DEBT_CAT, id);
        const name = debt ? debt.name : id;
        UI.showConfirm(
            `⚠️ ลบรายการหนี้สิน: "${name}"\n\n► บิลรายเดือนทั้งหมดของหนี้นี้จะถูกลบด้วย!\n\nคุณแน่ใจหรือไม่?`,
            () => {
                Store.delete(Store.keys.DEBT_CAT, id);
                this.refreshAll();
            }
        );
    },

    setIncomeView(view) {
        this.uiState.incomeView = view;
        // update buttons active state visually
        document.getElementById('btn-income-today').className = view === 'today' ? 'btn btn-tab-active btn-sm' : 'btn btn-tab-default btn-sm';
        document.getElementById('btn-income-all').className = view === 'all' ? 'btn btn-tab-active btn-sm' : 'btn btn-tab-default btn-sm';
        this.renderIncomeTransactions();
    },

    setExpenseView(view) {
        this.uiState.expenseView = view;
        // update buttons active state visually
        document.getElementById('btn-expense-today').className = view === 'today' ? 'btn btn-tab-active btn-sm' : 'btn btn-tab-default btn-sm';
        document.getElementById('btn-expense-all').className = view === 'all' ? 'btn btn-tab-active btn-sm' : 'btn btn-tab-default btn-sm';
        this.renderExpenseTransactions();
    },

    renderIncomeTransactions() {
        let data = Store.getAll(Store.keys.INCOMES);
        const categories = Store.getAll(Store.keys.INCOME_CAT);
        
        data.sort((a, b) => {
            const timeA = a.time || '01:00';
            const timeB = b.time || '01:00';
            const dateA = new Date(`${a.date}T${timeA}`);
            const dateB = new Date(`${b.date}T${timeB}`);
            return dateB - dateA; // latest first
        });

        if (this.uiState.incomeView === 'today') {
            const today = UI.getTodayISO();
            data = data.filter(d => d.date === today);
        }

        const tbody = document.querySelector('#table-trans-income tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #6b7280;">ไม่มีข้อมูลรายรับสำหรับมุมมองนี้</td></tr>`;
            return;
        }

        let lastDateRendered = null;

        data.forEach(item => {
            if (this.uiState.incomeView === 'all' && item.date !== lastDateRendered) {
                const groupTr = document.createElement('tr');
                groupTr.innerHTML = `<td colspan="6" style="background-color: #f3f4f6; font-weight: bold; color: #374151;">📅 ${UI.formatDate(item.date)}</td>`;
                tbody.appendChild(groupTr);
                lastDateRendered = item.date;
            }

            const tr = document.createElement('tr');
            const cat = categories.find(c => c.id === item.categoryId);
            const catName = cat ? cat.name : '<span style="color:red">ไม่พบหมวดหมู่</span>';
            const displayTime = item.time || '01:00';
            const dateTimeDisplay = displayTime;

            tr.innerHTML = `
                <td>${dateTimeDisplay}</td>
                <td>${item.categoryId}</td>
                <td>${catName}</td>
                <td style="font-weight: 500;">${UI.formatCurrency(item.amount)}</td>
                <td>${item.note || '-'}</td>
                <td class="actions-cell">
                    <button class="btn btn-small btn-edit" onclick="app.editIncome('${item.id}')">แก้ไข</button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteIncome('${item.id}')">ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    editIncome(id) {
        const item = Store.getById(Store.keys.INCOMES, id);
        if(!item) return;
        document.getElementById('ti-id').value = item.id;
        document.getElementById('ti-date').value = item.date;
        document.getElementById('ti-time').value = item.time || '';
        document.getElementById('ti-category').value = item.categoryId;
        document.getElementById('ti-amount').value = item.amount;
        document.getElementById('ti-note').value = item.note || '';
        document.querySelector('[data-target="transaction-income"]').click();
        window.scrollTo(0, 0);
    },

    deleteIncome(id) {
        UI.showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายรับนี้?', () => {
             Store.delete(Store.keys.INCOMES, id);
             this.refreshAll();
        });
    },

    renderExpenseTransactions() {
        let data = Store.getAll(Store.keys.EXPENSES);
        const categories = Store.getAll(Store.keys.EXPENSE_CAT);
        
        data.sort((a, b) => {
            const timeA = a.time || '01:00';
            const timeB = b.time || '01:00';
            const dateA = new Date(`${a.date}T${timeA}`);
            const dateB = new Date(`${b.date}T${timeB}`);
            return dateB - dateA; // latest first
        });

        if (this.uiState.expenseView === 'today') {
            const today = UI.getTodayISO();
            data = data.filter(d => d.date === today);
        }

        const tbody = document.querySelector('#table-trans-expense tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: #6b7280;">ไม่มีข้อมูลรายจ่ายสำหรับมุมมองนี้</td></tr>`;
            return;
        }

        let lastDateRendered = null;

        data.forEach(item => {
            if (this.uiState.expenseView === 'all' && item.date !== lastDateRendered) {
                const groupTr = document.createElement('tr');
                groupTr.innerHTML = `<td colspan="6" style="background-color: #fee2e2; font-weight: bold; color: #991b1b;">📅 ${UI.formatDate(item.date)}</td>`;
                tbody.appendChild(groupTr);
                lastDateRendered = item.date;
            }

            const tr = document.createElement('tr');
            const cat = categories.find(c => c.id === item.categoryId);
            const catName = cat ? cat.name : '<span style="color:red">ไม่พบหมวดหมู่</span>';
            const displayTime = item.time || '01:00';
            const dateTimeDisplay = displayTime;

            tr.innerHTML = `
                <td>${dateTimeDisplay}</td>
                <td>${item.categoryId}</td>
                <td>${catName}</td>
                <td style="font-weight: 500;">${UI.formatCurrency(item.amount)}</td>
                <td>${item.note || '-'}</td>
                <td class="actions-cell">
                    <button class="btn btn-small btn-edit" onclick="app.editExpense('${item.id}')">แก้ไข</button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteExpense('${item.id}')">ลบ</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    editExpense(id) {
        const item = Store.getById(Store.keys.EXPENSES, id);
        if(!item) return;
        document.getElementById('te-id').value = item.id;
        document.getElementById('te-date').value = item.date;
        document.getElementById('te-time').value = item.time || '';
        document.getElementById('te-category').value = item.categoryId;
        document.getElementById('te-amount').value = item.amount;
        document.getElementById('te-note').value = item.note || '';
        document.querySelector('[data-target="transaction-expense"]').click();
        window.scrollTo(0, 0);
    },

    deleteExpense(id) {
        UI.showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายจ่ายนี้?', () => {
             Store.delete(Store.keys.EXPENSES, id);
             this.refreshAll();
        });
    },

    renderDebtTransactions() {
        const data = Store.getAll(Store.keys.DEBT_PAYMENTS).sort((a, b) => new Date(b.date) - new Date(a.date));
        const categories = Store.getAll(Store.keys.DEBT_CAT);

        // Custom render table for Debt Bills
        const table = document.getElementById('table-trans-debt');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6B7280; padding:30px;">ไม่มีบิลหนี้ค้างชำระ</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            let catName = 'ไม่พบข้อมูล';
            let displayId = '';

            if (item.debtId) {
                const cat = categories.find(c => c.id === item.debtId);
                catName = cat ? cat.name : 'ไม่พบหนี้สิน';
                displayId = item.debtId;
            } else if (item.categoryId) {
                const expenseCats = Store.getAll(Store.keys.EXPENSE_CAT);
                const cat = expenseCats.find(c => c.id === item.categoryId);
                catName = cat ? cat.name : 'ไม่พบหมวดหมู่';
                displayId = item.categoryId;
            }

            // Format month
            const d = new Date(item.date);
            const formattedDate = d.toLocaleString('th-TH', { month: 'short', year: 'numeric' });

            tr.innerHTML = `
                <td>${formattedDate}</td>
                <td>${displayId}</td>
                <td>${catName}</td>
                <td>${UI.formatCurrency(item.amount)}</td>
                <td>${item.isPaid ? '<span class="badge badge-success">จ่ายแล้ว</span>' : '<span class="badge badge-danger">ยังไม่จ่าย</span>'}</td>
            `;

            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell';

            const btnEdit = document.createElement('button');
            btnEdit.className = 'btn btn-small btn-edit';
            btnEdit.textContent = '✏️ แก้ไขยอด';
            btnEdit.onclick = () => this.editDebtBill(item.id, catName);

            const btnPay = document.createElement('button');
            if (item.isPaid) {
                btnPay.className = 'btn btn-small btn-secondary';
                btnPay.textContent = 'ยกเลิกจ่าย';
                btnPay.onclick = () => this.toggleBillPaid(item.id, false);
                btnEdit.style.display = 'none'; // Hide edit if paid
            } else {
                btnPay.className = 'btn btn-small btn-primary';
                btnPay.textContent = 'กดจ่าย';
                btnPay.onclick = () => this.toggleBillPaid(item.id, true);
            }

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-small btn-danger';
            btnDel.textContent = '🗑 ลบบิล';
            btnDel.onclick = () => {
                const billMonth = new Date(item.date).toLocaleString('th-TH', { month: 'long', year: 'numeric' });
                UI.showConfirm(`🧾 ลบบิล: "${catName}" เดือน ${billMonth}\n\n► ลบเฉพาะบิลนี้ ไม่กระทบรายการหนี้สินตั้งต้น\n\nคุณแน่ใจหรือไม่?`, () => {
                    Store.delete(Store.keys.DEBT_PAYMENTS, item.id);
                    this.refreshAll();
                });
            };

            tdActions.appendChild(btnPay);
            tdActions.appendChild(btnEdit);
            tdActions.appendChild(btnDel);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    },

    toggleBillPaid(billId, isPaid) {
        const bill = Store.getById(Store.keys.DEBT_PAYMENTS, billId);
        if (bill) {
            Store.update(Store.keys.DEBT_PAYMENTS, billId, { isPaid });
            this.refreshAll();
        }
    },

    editDebtBill(billId, catName) {
        const bill = Store.getById(Store.keys.DEBT_PAYMENTS, billId);
        if (!bill || bill.isPaid) return;

        const currentAmount = parseFloat(bill.amount) || 0;
        const newAmountStr = prompt(`แก้ไขยอดเรียกเก็บสำหรับ:\n${catName}\n\nกรอกยอดใหม่ (จากเดิม ${UI.formatCurrency(currentAmount)}):`, currentAmount);
        
        if (newAmountStr === null) return;
        
        const newAmount = parseFloat(newAmountStr);
        if (isNaN(newAmount) || newAmount < 0) {
            alert("ยอดไม่ถูกต้อง");
            return;
        }

        // Update the bill itself
        Store.update(Store.keys.DEBT_PAYMENTS, billId, { amount: newAmount });

        // If it's a debt bill (not an expense), sync back to DEBT_CAT customPayments
        if (bill.debtId) {
            const debt = Store.getById(Store.keys.DEBT_CAT, bill.debtId);
            if (debt) {
                // Find index of the month this bill belongs to
                const allDebtBills = Store.getAll(Store.keys.DEBT_PAYMENTS)
                    .filter(b => b.debtId === debt.id)
                    .sort((a, b) => new Date(a.date) - new Date(b.date)); // Oldest first
                
                const billIndex = allDebtBills.findIndex(b => b.id === billId);

                if (billIndex >= 0) {
                    // Change payment setting to 'custom' to save the specific month amount
                    let customPayments = debt.customPayments || [];
                    
                    // If switching from fixed, initialize custom payments with the fixed amount
                    if (debt.paymentType !== 'custom' || customPayments.length === 0) {
                        const terms = debt.termMonths || 1;
                        const fixedAmt = debt.fixedPaymentAmount || (debt.totalAmount / terms);
                        customPayments = Array(terms).fill(fixedAmt);
                    }
                    
                    // Update the specific month
                    customPayments[billIndex] = newAmount;
                    
                    Store.update(Store.keys.DEBT_CAT, debt.id, {
                        paymentType: 'custom',
                        customPayments: customPayments
                    });
                }
            }
        } else if (bill.categoryId) {
            // It's a regular monthly expense bill. Let's update the master category too.
            Store.update(Store.keys.EXPENSE_CAT, bill.categoryId, { amount: newAmount });
        }

        this.refreshAll();
        alert('อัปเดตยอดบิลและรายการตั้งต้นสำเร็จ!');
    },

    // ============ MEAL SPLIT/BORROW MAIN UI ============
    switchMealMainTab(tab) {
        const isLend = tab === 'lend';
        document.getElementById('meal-lend-section').style.display = isLend ? 'block' : 'none';
        document.getElementById('meal-borrow-section').style.display = isLend ? 'none' : 'block';
        document.getElementById('meal-main-tab-lend').className = isLend ? 'btn btn-tab-active' : 'btn btn-tab-default';
        document.getElementById('meal-main-tab-borrow').className = isLend ? 'btn btn-tab-default' : 'btn btn-tab-active';
    },

    // ============ MEAL SPLIT FUNCTIONS ============

    recordMealExpense(date, amount, catName, noteText) {
        let mealCat = Store.getAll(Store.keys.EXPENSE_CAT).find(c => c.name === catName);
        if (!mealCat) {
            mealCat = Store.add(Store.keys.EXPENSE_CAT, { name: catName, monthly: false });
        }
        Store.add(Store.keys.EXPENSES, {
            date: date,
            categoryId: mealCat.id,
            amount: amount,
            note: noteText
        });
    },

    recordMealBorrowIncome(date, amount, catName, noteText) {
        let mealCat = Store.getAll(Store.keys.INCOME_CAT).find(c => c.name === catName);
        if (!mealCat) {
            mealCat = Store.add(Store.keys.INCOME_CAT, { name: catName, monthly: false });
        }
        Store.add(Store.keys.INCOMES, {
            date: date,
            categoryId: mealCat.id,
            amount: amount,
            note: noteText
        });
    },

    openMealBillModal(totalAmount, personCount, note, date) {
        this._mealBillTab = 'equal';
        // personCount includes "เรา", so others = personCount - 1
        const perPerson = totalAmount / personCount;

        document.getElementById('meal-bill-summary').textContent =
            `📅 ${date}  |  📝 ${note || '-'}  |  💳 รวม ${UI.formatCurrency(totalAmount)}  |  ${personCount} คน`;
        document.getElementById('meal-bill-per-person').textContent = UI.formatCurrency(perPerson);

        // ====== Equal tab ======
        const equalList = document.getElementById('meal-bill-equal-list');
        equalList.innerHTML = '';

        // -- row 0: "เรา" (payer) แสดงสีแดง ล็อคชื่อ
        const usRow = document.createElement('div');
        usRow.style.cssText = 'display:flex; align-items:center; gap:10px; background:#fff1f2; padding:10px 14px; border-radius:8px; border:1px solid #fecdd3;';
        usRow.innerHTML = `
            <span style="font-size:18px;">😊</span>
            <div style="flex:1; font-weight:700; color:#be123c; font-size:14px;">เรา (คนออกค่าข้าว)</div>
            <span style="color:#be123c; font-weight:700; font-size:14px; white-space:nowrap;">${UI.formatCurrency(perPerson)}</span>
            <span style="background:#fce7f3; color:#9d174d; padding:3px 8px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap;">ออกก่อน</span>
        `;
        equalList.appendChild(usRow);

        // -- rows 1..n-1: คนอื่น กรอกชื่อ
        for (let i = 1; i < personCount; i++) {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; align-items:center; gap:10px; background:#f9fafb; padding:10px 14px; border-radius:8px; border:1px solid #E5E7EB;';
            div.innerHTML = `
                <span style="font-size:18px;">👤</span>
                <input type="text" class="meal-person-name" placeholder="ชื่อคนที่ ${i}"
                    style="flex:1; padding:8px 12px; border:1px solid #D1D5DB; border-radius:6px; font-size:14px;">
                <span style="color:#059669; font-weight:600; white-space:nowrap;">${UI.formatCurrency(perPerson)}</span>
            `;
            equalList.appendChild(div);
        }

        // ====== Custom tab ======
        const customList = document.getElementById('meal-bill-custom-list');
        customList.innerHTML = '';

        // -- row 0: "เรา" lock
        const usRowC = document.createElement('div');
        usRowC.style.cssText = 'display:flex; align-items:center; gap:10px; background:#fff1f2; padding:10px 14px; border-radius:8px; border:1px solid #fecdd3;';
        usRowC.innerHTML = `
            <span style="font-size:18px;">😊</span>
            <div style="flex:1; font-weight:700; color:#be123c; font-size:14px;">เรา (คนออกค่าข้าว)</div>
            <input type="number" class="meal-custom-amount" placeholder="0" min="0" value=""
                style="width:100px; padding:8px 12px; border:1px solid #fca5a5; border-radius:6px; font-size:14px; text-align:right; background:#fff7f7;">
            <span style="background:#fce7f3; color:#9d174d; padding:3px 8px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap;">ออกก่อน</span>
        `;
        customList.appendChild(usRowC);

        // -- rows 1..n-1: คนอื่น พร้อม checkbox "ออกให้"
        for (let i = 1; i < personCount; i++) {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; align-items:center; gap:8px; background:#f9fafb; padding:10px 14px; border-radius:8px; border:1px solid #E5E7EB; flex-wrap:wrap;';
            const uid = `meal-given-${i}`;
            div.innerHTML = `
                <span style="font-size:18px;">👤</span>
                <input type="text" class="meal-custom-name" placeholder="ชื่อคนที่ ${i}"
                    style="flex:1; min-width:100px; padding:8px 12px; border:1px solid #D1D5DB; border-radius:6px; font-size:14px;">
                <input type="number" class="meal-custom-amount" placeholder="0" min="0"
                    style="width:90px; padding:8px 10px; border:1px solid #D1D5DB; border-radius:6px; font-size:14px; text-align:right;">
                <label style="display:flex; align-items:center; gap:4px; cursor:pointer; font-size:13px; color:#6B7280; white-space:nowrap;">
                    <input type="checkbox" class="meal-given-check" id="${uid}" style="width:16px;height:16px; accent-color:#F59E0B;">
                    <span>ออกให้</span>
                </label>
            `;
            customList.appendChild(div);
        }

        // Reset tab buttons
        document.getElementById('meal-bill-tab-equal').className = 'btn btn-tab-active btn-small';
        document.getElementById('meal-bill-tab-custom').className = 'btn btn-tab-default btn-small';
        document.getElementById('meal-bill-equal-section').style.display = 'block';
        document.getElementById('meal-bill-custom-section').style.display = 'none';

        document.getElementById('meal-bill-modal').style.display = 'flex';
    },

    switchMealBillTab(tab) {
        this._mealBillTab = tab;
        const isEqual = tab === 'equal';
        document.getElementById('meal-bill-equal-section').style.display = isEqual ? 'block' : 'none';
        document.getElementById('meal-bill-custom-section').style.display = isEqual ? 'none' : 'block';
        document.getElementById('meal-bill-tab-equal').className = isEqual ? 'btn btn-tab-active btn-small' : 'btn btn-tab-default btn-small';
        document.getElementById('meal-bill-tab-custom').className = isEqual ? 'btn btn-tab-default btn-small' : 'btn btn-tab-active btn-small';
    },

    closeMealBillModal() {
        document.getElementById('meal-bill-modal').style.display = 'none';
        this._pendingMealSplit = null;
    },

    saveMealBill() {
        if (!this._pendingMealSplit) return;
        const { date, totalAmount, note, personCount } = this._pendingMealSplit;
        const isEqual = this._mealBillTab === 'equal';
        const members = [];

        if (isEqual) {
            // Row 0 = "เรา" (isPayer, no refund needed)
            const perPerson = parseFloat((totalAmount / personCount).toFixed(2));
            members.push({ name: 'เรา', amount: perPerson, isPayer: true, givenTo: false, refunded: false });

            // Rows 1..n-1  = คนอื่น
            const nameInputs = document.querySelectorAll('.meal-person-name');
            nameInputs.forEach((inp, i) => {
                members.push({
                    name: inp.value.trim() || `คนที่ ${i + 1}`,
                    amount: perPerson,
                    isPayer: false,
                    givenTo: false,
                    refunded: false
                });
            });
        } else {
            // Row 0 = "เรา" (isPayer)
            const usAmtInputs = document.querySelectorAll('.meal-custom-amount');
            members.push({
                name: 'เรา',
                amount: parseFloat(usAmtInputs[0].value) || 0,
                isPayer: true,
                givenTo: false,
                refunded: false
            });

            // Rows 1..n-1
            const nameInputs = document.querySelectorAll('.meal-custom-name');
            const givenChecks = document.querySelectorAll('.meal-given-check');
            nameInputs.forEach((inp, i) => {
                const givenTo = givenChecks[i] ? givenChecks[i].checked : false;
                members.push({
                    name: inp.value.trim() || `คนที่ ${i + 1}`,
                    amount: parseFloat(usAmtInputs[i + 1].value) || 0,
                    isPayer: false,
                    givenTo,   // ออกให้ = ไม่ต้องจ่าย
                    refunded: givenTo  // ถือว่า "คืน" แล้วถ้าออกให้
                });
            });
        }

        Store.add(Store.keys.MEAL_SPLITS, {
            date, totalAmount, note,
            isSplit: true, personCount,
            billType: isEqual ? 'equal' : 'custom',
            members
        });

        // ถ้าติ๊กหารค่าข้าว ให้ใช้ note ปกติ (ไม่มีชื่อคนต่อท้าย)
        const expenseNote = note || 'ออกค่าข้าว';
        this.recordMealExpense(date, totalAmount, 'หารค่าข้าว', expenseNote);

        document.getElementById('meal-bill-modal').style.display = 'none';
        this._pendingMealSplit = null;
        this.resetForm('form-meal-split');
        this.refreshAll();
        alert('✅ บันทึกบิลออกค่าข้าวและรายจ่ายเรียบร้อยแล้ว!');
    },


    openMealViewModal(id) {
        const item = Store.getById(Store.keys.MEAL_SPLITS, id);
        if (!item) return;

        document.getElementById('meal-view-summary').textContent =
            `📅 ${item.date}  |  📝 ${item.note || '-'}  |  💳 รวม ${UI.formatCurrency(item.totalAmount)}`;

        const listEl = document.getElementById('meal-view-list');
        listEl.innerHTML = '';

        if (!item.members || item.members.length === 0) {
            listEl.innerHTML = '<p style="color:#9CA3AF; text-align:center;">ไม่มีข้อมูลสมาชิก</p>';
        } else {
            item.members.forEach((member, idx) => {
                const card = document.createElement('div');

                // Payer (เรา) = rose background
                if (member.isPayer) {
                    card.style.cssText = 'display:flex; align-items:center; gap:12px; background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; padding:12px 16px;';
                    card.innerHTML = `
                        <span style="font-size:22px;">😊</span>
                        <div style="flex:1;">
                            <div style="font-weight:700; font-size:15px; color:#be123c;">${member.name}
                                <span style="background:#fce7f3; color:#9d174d; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; margin-left:6px;">คนออกค่าข้าว</span>
                            </div>
                            <div style="color:#be123c; font-weight:700; font-size:16px;">${UI.formatCurrency(member.amount)}</div>
                        </div>
                    `;
                } else if (member.givenTo) {
                    // ออกให้ = no refund needed
                    card.style.cssText = 'display:flex; align-items:center; gap:12px; background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px 16px;';
                    const btnDelete = `<button onclick="app.deleteMealMember('${id}', ${idx})"
                        style="padding:6px 14px; background:#EF4444; color:white; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; white-space:nowrap;">
                        🗑 ลบ
                    </button>`;
                    card.innerHTML = `
                        <span style="font-size:22px;">👤</span>
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px;">${member.name}
                                <span style="background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:600; margin-left:6px;">🎁 ออกให้</span>
                            </div>
                            <div style="color:#D97706; font-weight:700; font-size:16px;">${UI.formatCurrency(member.amount)}</div>
                        </div>
                        ${btnDelete}
                    `;
                } else {
                    // ปกติ — ยังไม่คืน / คืนแล้ว
                    card.style.cssText = 'display:flex; align-items:center; gap:12px; background:#f9fafb; border:1px solid #E5E7EB; border-radius:10px; padding:12px 16px;';

                    const refundedBadge = member.refunded
                        ? '<span style="background:#d1fae5; color:#065f46; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">✅ คืนแล้ว</span>'
                        : '';

                    const btnRefund = member.refunded ? '' :
                        `<button class="btn btn-primary btn-sm" onclick="app.refundMealMember('${id}', ${idx})" style="white-space:nowrap;">
                            💰 คืนเงิน
                        </button>`;

                    const btnDelete = `<button class="btn btn-danger btn-sm" onclick="app.deleteMealMember('${id}', ${idx})" style="white-space:nowrap;">
                        🗑 ลบ
                    </button>`;

                    card.innerHTML = `
                        <span style="font-size:22px;">👤</span>
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px;">${member.name} ${refundedBadge}</div>
                            <div style="color:#059669; font-weight:700; font-size:16px;">${UI.formatCurrency(member.amount)}</div>
                        </div>
                        ${btnRefund}
                        ${btnDelete}
                    `;
                }
                listEl.appendChild(card);
            });
        }

        document.getElementById('meal-view-modal').style.display = 'flex';
    },

    returnMealBorrow(borrowId) {
        const item = Store.getById(Store.keys.MEAL_SPLITS, borrowId);
        if (!item || item.isReturned) return;

        Store.update(Store.keys.MEAL_SPLITS, borrowId, { isReturned: true });

        // บันทึกรายจ่าย "คืนเงินที่ยืม"
        const expenseNote = item.note ? `${item.note} (คืนเงิน ${item.lenderName})` : `คืนเงิน ${item.lenderName}`;
        this.recordMealExpense(item.date, item.totalAmount, 'คืน', expenseNote);

        this.refreshAll();
        alert(`✅ บันทึกคืนเงิน "${expenseNote}" และรายจ่ายเรียบร้อยแล้ว!`);
    },

    refundMealMember(mealId, memberIdx) {
        const item = Store.getById(Store.keys.MEAL_SPLITS, mealId);
        if (!item || !item.members[memberIdx]) return;

        const member = item.members[memberIdx];
        if (member.refunded) return alert('คืนเงินไปแล้ว');

        const members = [...item.members];
        members[memberIdx] = { ...member, refunded: true };
        Store.update(Store.keys.MEAL_SPLITS, mealId, { members });

        // บันทึกรายรับ "คืนหารค่าข้าว"
        // หา income category หรือสร้างใหม่โดยใช้ชื่อ: "คืน"
        const baseNote = item.note || 'ค่าข้าว';
        const incomeNote = `${baseNote} (ได้คืนจาก ${member.name})`;

        this.recordMealBorrowIncome(item.date, member.amount, 'คืน', incomeNote);

        this.refreshAll();
        // Re-open modal to show updated state
        this.openMealViewModal(mealId);
        alert(`✅ บันทึกรายรับ "${incomeNote}" จำนวน ${UI.formatCurrency(member.amount)} แล้ว!`);
    },

    deleteMealMember(mealId, memberIdx) {
        const item = Store.getById(Store.keys.MEAL_SPLITS, mealId);
        if (!item || !item.members[memberIdx]) return;
        const members = item.members.filter((_, i) => i !== memberIdx);
        Store.update(Store.keys.MEAL_SPLITS, mealId, { members, personCount: members.length });
        this.refreshAll();
        this.openMealViewModal(mealId);
    },

    renderMealSplits() {
        const allData = Store.getAll(Store.keys.MEAL_SPLITS).sort((a, b) => new Date(b.date) - new Date(a.date));
        const data = allData.filter(d => !d.isBorrow);
        const table = document.getElementById('table-meal-split');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6B7280; padding:30px;">ยังไม่มีรายการให้ยืม / ออกค่าข้าว</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            let splitBadge = '';
            if (item.isSplit) {
                splitBadge = `<span style="background:#dbeafe; color:#1d4ed8; padding:3px 8px; border-radius:20px; font-size:12px; font-weight:600;">✅ หาร ${item.personCount} คน</span>`;
            } else if (item.members && item.members.length > 1) {
                const borrower = item.members[1];
                splitBadge = `<span style="background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:20px; font-size:12px; font-weight:600;">ออกให้ ${borrower.name}</span>`;
            } else {
                splitBadge = `<span style="background:#f3f4f6; color:#6B7280; padding:3px 8px; border-radius:20px; font-size:12px;">ไม่หาร</span>`;
            }

            tr.innerHTML = `
                <td>${UI.formatDate(item.date)}</td>
                <td>${item.note || '-'}</td>
                <td style="font-weight:600; color:#111827;">${UI.formatCurrency(item.totalAmount)}</td>
                <td>${splitBadge}</td>
                <td>${item.personCount || 1} คน</td>
            `;

            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell';

            if (item.isSplit || (item.members && item.members.length > 1)) {
                const btnView = document.createElement('button');
                btnView.className = 'btn btn-action btn-sm';
                btnView.textContent = '🧾 จัดการบิล';
                btnView.onclick = () => this.openMealViewModal(item.id);
                tdActions.appendChild(btnView);
            }

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-small btn-danger';
            btnDel.style.marginLeft = '6px';
            btnDel.textContent = '🗑 ลบ';
            btnDel.onclick = () => {
                UI.showConfirm(`ลบรายการออกค่าข้าว "${item.note || item.date}" หรือไม่?`, () => {
                    Store.delete(Store.keys.MEAL_SPLITS, item.id);
                    this.refreshAll();
                });
            };
            tdActions.appendChild(btnDel);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    },

    renderMealBorrows() {
        const allData = Store.getAll(Store.keys.MEAL_SPLITS).sort((a, b) => new Date(b.date) - new Date(a.date));
        const data = allData.filter(d => d.isBorrow);
        const table = document.getElementById('table-meal-borrow');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#6B7280; padding:30px;">ยังไม่มีรายการขอยืม</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            const statusBadge = item.isReturned
                ? `<span style="background:#d1fae5; color:#065f46; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">✅ คืนแล้ว</span>`
                : `<span style="background:#fee2e2; color:#991b1b; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600;">⏳ ค้างอยู่</span>`;

            tr.innerHTML = `
                <td>${UI.formatDate(item.date)}</td>
                <td style="font-weight:600; color:#b45309;">${item.lenderName || '-'}</td>
                <td>${item.note || '-'}</td>
                <td style="font-weight:600; color:#111827;">${UI.formatCurrency(item.totalAmount)}</td>
                <td>${statusBadge}</td>
            `;

            const tdActions = document.createElement('td');
            tdActions.className = 'actions-cell';

            if (!item.isReturned) {
                const btnReturn = document.createElement('button');
                btnReturn.className = 'btn btn-primary btn-sm';
                btnReturn.textContent = '💰 คืนเงินแล้ว';
                btnReturn.onclick = () => this.returnMealBorrow(item.id);
                tdActions.appendChild(btnReturn);
            }

            const btnDel = document.createElement('button');
            btnDel.className = 'btn btn-small btn-danger';
            btnDel.style.marginLeft = '6px';
            btnDel.textContent = '🗑 ลบ';
            btnDel.onclick = () => {
                UI.showConfirm(`ลบรายการขอยืมจาก ${item.lenderName || item.date} หรือไม่?`, () => {
                    Store.delete(Store.keys.MEAL_SPLITS, item.id);
                    this.refreshAll();
                });
            };
            tdActions.appendChild(btnDel);
            tr.appendChild(tdActions);
            tbody.appendChild(tr);
        });
    },

    populateSelects() {
        UI.populateSelect('ti-category', Store.getAll(Store.keys.INCOME_CAT), 'id', 'name');
        UI.populateSelect('te-category', Store.getAll(Store.keys.EXPENSE_CAT), 'id', 'name');
        UI.populateSelect('td-category', Store.getAll(Store.keys.DEBT_CAT), 'id', 'name');
    },

    // Data Management
    startFresh() {
        const startupModal = document.getElementById('startup-modal');
        if (startupModal) startupModal.style.display = 'none';

        // Auto-generate bills for the current month when starting fresh
        Store.generateMonthlyBillsForCurrentMonth();
        this.refreshAll();
    },

    openDataManagementModal() {
        document.getElementById('data-management-modal').style.display = 'flex';
    },

    closeDataManagementModal() {
        document.getElementById('data-management-modal').style.display = 'none';
    },

    exportData() {
        const json = Store.exportData();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;

        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    exportForAI() {
        const expenses = Store.getAll(Store.keys.EXPENSES);
        const categories = Store.getAll(Store.keys.EXPENSE_CAT);
        
        // Format the data into a clear structure for AI
        const formattedData = expenses.map(expense => {
            const cat = categories.find(c => c.id === expense.categoryId);
            return {
                Date: expense.date,
                Category: cat ? cat.name : 'Unknown',
                Amount: expense.amount,
                Note: expense.note || ''
            };
        });

        // Group by category for a quick summary in the prompt
        const summaryByCategory = {};
        formattedData.forEach(item => {
            if (!summaryByCategory[item.Category]) {
                summaryByCategory[item.Category] = 0;
            }
            summaryByCategory[item.Category] += item.Amount;
        });

        // Construct the final object
        const exportContent = {
            metadata: {
                description: "ไฟล์นี้บรรจุประวัติการใช้จ่ายของผู้ใช้ โปรดวิเคราะห์พฤติกรรมการใช้จ่ายและให้คำแนะนำทางการเงินเป็นภาษาไทย (Please analyze the spending habits and provide financial advice in Thai language).",
                generatedAt: new Date().toISOString()
            },
            summary: summaryByCategory,
            transactions: formattedData
        };

        const json = JSON.stringify(exportContent, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const now = new Date();
        const dateStr = now.getFullYear() + '-' + 
            String(now.getMonth() + 1).padStart(2, '0') + '-' + 
            String(now.getDate()).padStart(2, '0');

        a.href = url;
        a.download = `finance_ai_export_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    confirmClearData() {
        UI.showConfirm(
            '⚠️ ล้างข้อมูลทั้งหมด\n\nรายการรายรับ รายจ่าย หนี้สิน บิล และข้อมูลทั้งหมดจะถูกลบถาวร!\n\nคุณแน่ใจหรือไม่?',
            () => {
                Store.clearAll();
                this.refreshAll();
                this.navigateTo('dashboard');
                alert('✅ ล้างข้อมูลทั้งหมดเรียบร้อยแล้ว');
            }
        );
    },

    importData(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const success = Store.importData(e.target.result);
            if (success) {
                // Generate bills for the current month after import to ensure completeness
                Store.generateMonthlyBillsForCurrentMonth();

                // Clear the file input so it can be used again
                document.getElementById('import-file').value = '';

                // Refresh all UI components
                this.refreshAll();

                // Hide the startup modal if it's visible
                const startupModal = document.getElementById('startup-modal');
                if (startupModal) startupModal.style.display = 'none';

                alert('นำเข้าข้อมูลสำเร็จ!');
            } else {
                alert('เกิดข้อผิดพลาดในการนำเข้าข้อมูล กรุณาตรวจสอบไฟล์');
            }
        };
        reader.readAsText(file);
    }
};

// Initialize app when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
