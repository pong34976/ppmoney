const UI = {
    formatCurrency(amount) {
        return '฿' + parseFloat(amount).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDate(dateString) {
        if (!dateString) return '-';
        const d = new Date(dateString);
        return d.toLocaleDateString('th-TH');
    },

    getTodayISO() {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 10);
        console.log('UI.getTodayISO returning:', localISOTime);
        return localISOTime;
    },

    renderTable(tableId, data, columns, actions) {
        const table = document.getElementById(tableId);
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${columns.length + (actions ? 1 : 0)}" style="text-align:center; color:#6B7280; padding:30px;">ไม่มีข้อมูล</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');

            columns.forEach(col => {
                const td = document.createElement('td');
                if (typeof col.render === 'function') {
                    td.innerHTML = col.render(item[col.key], item);
                } else if (col.type === 'currency') {
                    td.textContent = this.formatCurrency(item[col.key]);
                } else if (col.type === 'date') {
                    td.textContent = this.formatDate(item[col.key]);
                } else if (col.type === 'boolean') {
                    td.innerHTML = item[col.key]
                        ? `<span class="badge badge-success">ใช่</span>`
                        : `<span class="badge" style="background:#E5E7EB; color:#4B5563;">ไม่</span>`;
                } else {
                    td.textContent = item[col.key] || '-';
                }
                tr.appendChild(td);
            });

            if (actions) {
                const td = document.createElement('td');
                td.className = 'actions-cell';

                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-small btn-edit';
                editBtn.textContent = 'แก้ไข';
                editBtn.onclick = () => actions.onEdit(item);

                const delBtn = document.createElement('button');
                delBtn.className = 'btn btn-small btn-danger';
                delBtn.textContent = 'ลบ';
                delBtn.onclick = () => {
                    UI.showConfirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้? (ข้อมูลที่เชื่อมโยงจะถูกลบไปด้วย)', () => {
                        actions.onDelete(item.id);
                    });
                };

                td.appendChild(editBtn);
                td.appendChild(delBtn);
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        });
    },

    populateSelect(selectId, data, valueKey, labelKey) {
        const select = document.getElementById(selectId);
        if (!select) return;

        // Keep the first placeholder option
        const firstOpt = select.options.length > 0 ? select.options[0].cloneNode(true) : null;
        select.innerHTML = '';
        if (firstOpt) select.appendChild(firstOpt);

        data.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valueKey];
            opt.textContent = item[labelKey];
            select.appendChild(opt);
        });
    },

    showConfirm(message, onConfirm, onCancel) {
        const modal = document.getElementById('custom-confirm-modal');
        const msgEl = document.getElementById('custom-confirm-message');
        const btnOk = document.getElementById('custom-confirm-ok');
        const btnCancel = document.getElementById('custom-confirm-cancel');

        if (!modal) return;

        msgEl.textContent = message;
        modal.style.display = 'flex';

        // Remove old listeners by cloning and replacing
        const newBtnOk = btnOk.cloneNode(true);
        const newBtnCancel = btnCancel.cloneNode(true);
        btnOk.parentNode.replaceChild(newBtnOk, btnOk);
        btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

        newBtnOk.addEventListener('click', () => {
            modal.style.display = 'none';
            if (typeof onConfirm === 'function') onConfirm();
        });

        newBtnCancel.addEventListener('click', () => {
            modal.style.display = 'none';
            if (typeof onCancel === 'function') onCancel();
        });
    }
};
