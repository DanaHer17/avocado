(function () {
    const CONFIG = window.AVOCADO_CONFIG || {};
    const STORAGE_KEY = CONFIG.storageKey || 'avocado-treatment-report-v1';
    const ROLE_SPEECH = (CONFIG.roles && CONFIG.roles.speech) || 'speech';
    const ROLE_OT = (CONFIG.roles && CONFIG.roles.ot) || 'ot';
    const ROLE_EMOTIONAL = (CONFIG.roles && CONFIG.roles.emotional) || 'emotional';
    const SESSION_TYPE_COLORS = (CONFIG.ui && CONFIG.ui.sessionTypeColors) || [
        { bg: '#ecfeff', border: '#67e8f9' },
        { bg: '#ecfdf5', border: '#6ee7b7' },
        { bg: '#fff7ed', border: '#fdba74' },
        { bg: '#fef2f2', border: '#fca5a5' },
        { bg: '#f5f3ff', border: '#c4b5fd' },
        { bg: '#fffbeb', border: '#fcd34d' }
    ];
    const DEFAULTS = CONFIG.defaults || {};
    const DEFAULT_THERAPIST_PAYMENT = DEFAULTS.therapistPaymentDetails || {
        fullName: 'דנה גרץ',
        bankName: 'לאומי',
        branchNumber: '705',
        accountNumber: '9800164'
    };
    const PARENT_MEETING_DEFAULTS = DEFAULTS.parentMeetings || {};
    const PARENT_MEETING_HALF_MINUTES = PARENT_MEETING_DEFAULTS.halfHourMinutes || 30;
    const PARENT_MEETING_FULL_MINUTES = PARENT_MEETING_DEFAULTS.fullMinutes || 45;
    const PARENT_MEETING_HALF_PRICE = PARENT_MEETING_DEFAULTS.halfHourPrice || 150;
    /** מספר תאי תאריך בהתחלה לשורה חדשה (מוסיפים עוד עם «+ תאריך») */
    const INITIAL_DATE_SLOTS = (CONFIG.ui && CONFIG.ui.initialDateSlots) || 1;
    const MAX_DATE_SLOTS = (CONFIG.ui && CONFIG.ui.maxDateSlots) || 31;
    const tbody = document.querySelector('#patientTable tbody');
    const patientTableWrap = document.getElementById('patientTableWrap');
    const saveHint = document.getElementById('saveHint');
    const periodInput = document.getElementById('period');
    const baseSalaryInput = document.getElementById('baseSalary');
    const clientRateInput = document.getElementById('clientRate');
    const meetingBonusInput = document.getElementById('meetingBonus');
    /** זמן המתנה לפני כתיבת localStorage אחרי הקלדה — מפחית עומס וחריגות מכסה בכרום */
    const PERSIST_DEBOUNCE_MS = 400;
    const therapistRoleInput = document.getElementById('therapistRole');
    const roleSessionTypesCard = document.getElementById('roleSessionTypesCard');
    const sessionTypesBody = document.getElementById('sessionTypesBody');
    const addSessionTypeBtn = document.getElementById('addSessionTypeBtn');
    const therapistPayFullNameInput = document.getElementById('therapistPayFullName');
    const therapistPayBankNameInput = document.getElementById('therapistPayBankName');
    const therapistPayBranchInput = document.getElementById('therapistPayBranch');
    const therapistPayAccountInput = document.getElementById('therapistPayAccount');
    const groupEnabledInput = document.getElementById('groupEnabled');
    const groupFields = document.getElementById('groupFields');
    const groupsListEl = document.getElementById('groupsList');
    const addGroupBtn = document.getElementById('addGroupBtn');
    const bulkDateDialog = document.getElementById('bulkDateDialog');
    const bulkDateTitle = document.getElementById('bulkDateTitle');
    const bulkDateGrid = document.getElementById('bulkDateGrid');
    const bulkClearBtn = document.getElementById('bulkClearBtn');
    const bulkCancelBtn = document.getElementById('bulkCancelBtn');
    const bulkSaveBtn = document.getElementById('bulkSaveBtn');
    const paymentMsgDialog = document.getElementById('paymentMsgDialog');
    const paymentMsgTitle = document.getElementById('paymentMsgTitle');
    const paymentMsgText = document.getElementById('paymentMsgText');
    const paymentMsgCloseBtn = document.getElementById('paymentMsgCloseBtn');
    const paymentMsgCopyBtn = document.getElementById('paymentMsgCopyBtn');
    const parentMeetingsEnabledInput = document.getElementById('parentMeetingsEnabled');
    const parentMeetingsFields = document.getElementById('parentMeetingsFields');
    const parentMeetingsBody = document.getElementById('parentMeetingsBody');
    const languageEvaluationsEnabledInput = document.getElementById('languageEvaluationsEnabled');
    const languageEvaluationsFields = document.getElementById('languageEvaluationsFields');
    const languageEvalBody = document.getElementById('languageEvalBody');
    const diagnosticsEnabledInput = document.getElementById('diagnosticsEnabled');
    const diagnosticsFields = document.getElementById('diagnosticsFields');
    const diagnosticsBody = document.getElementById('diagnosticsBody');
    const groupAssessmentsEnabledInput = document.getElementById('groupAssessmentsEnabled');
    const groupAssessmentsFields = document.getElementById('groupAssessmentsFields');
    const groupAssessmentsBody = document.getElementById('groupAssessmentsBody');
    const courseExpensesEnabledInput = document.getElementById('courseExpensesEnabled');
    const courseExpensesFields = document.getElementById('courseExpensesFields');
    const courseExpensesBody = document.getElementById('courseExpensesBody');
    const extraRoleEnabledInput = document.getElementById('extraRoleEnabled');
    const extraRoleFields = document.getElementById('extraRoleFields');
    const extraRolesBody = document.getElementById('extraRolesBody');
    const additionalExpensesEnabledInput = document.getElementById('additionalExpensesEnabled');
    const additionalExpensesFields = document.getElementById('additionalExpensesFields');
    const additionalExpensesBody = document.getElementById('additionalExpensesBody');
    const centerOwesTherapistEnabledInput = document.getElementById('centerOwesTherapistEnabled');
    const centerOwesTherapistFields = document.getElementById('centerOwesTherapistFields');
    const centerOwesTherapistBody = document.getElementById('centerOwesTherapistBody');
    const addParentMeetingBtn = document.getElementById('addParentMeeting');
    const addLanguageEvalBtn = document.getElementById('addLanguageEval');
    const addDiagnosticBtn = document.getElementById('addDiagnostic');
    const addGroupAssessmentBtn = document.getElementById('addGroupAssessment');
    const addCourseExpenseBtn = document.getElementById('addCourseExpense');
    const addExtraRoleBtn = document.getElementById('addExtraRole');
    const addAdditionalExpenseBtn = document.getElementById('addAdditionalExpense');
    const addCenterOwesTherapistBtn = document.getElementById('addCenterOwesTherapist');
    const extraCalcsToggleBtn = document.getElementById('extraCalcsToggle');
    const extraCalcsPanel = document.getElementById('extraCalcsPanel');
    let currentPeriod = '';
    let patientRowOrderSeq = 0;
    let saveTimer = null;
    let persistDebounceTimer = null;
    let bulkDateTargetRow = null;

    const summaryEls = {
        effectiveRate: document.getElementById('effectiveRate'),
        totalBillable: document.getElementById('totalBillable'),
        totalUnpaidCancels: document.getElementById('totalUnpaidCancels'),
        individualTotal: document.getElementById('individualTotal'),
        groupTotal: document.getElementById('groupTotal'),
        parentMeetingsTotal: document.getElementById('parentMeetingsTotal'),
        languageEvalTherapistTotal: document.getElementById('languageEvalTherapistTotal'),
        languageEvalCenterTotal: document.getElementById('languageEvalCenterTotal'),
        diagnosticsTotal: document.getElementById('diagnosticsTotal'),
        groupAssessmentsTotal: document.getElementById('groupAssessmentsTotal'),
        extraRolesTotal: document.getElementById('extraRolesTotal'),
        additionalExpensesTotal: document.getElementById('additionalExpensesTotal'),
        centerOwesTherapistTotal: document.getElementById('centerOwesTherapistTotal'),
        courseExpensesTotal: document.getElementById('courseExpensesTotal'),
        grossIndividualTotal: document.getElementById('grossIndividualTotal'),
        centerTotal: document.getElementById('centerTotal'),
        grandTotal: document.getElementById('grandTotal'),
        paidToCenterTotal: document.getElementById('paidToCenterTotal'),
        paidToCenterTreatmentCount: document.getElementById('paidToCenterTreatmentCount'),
        paidToTherapistTotal: document.getElementById('paidToTherapistTotal'),
        paidToTherapistTreatmentCount: document.getElementById('paidToTherapistTreatmentCount'),
        remainingToCenter: document.getElementById('remainingToCenter'),
        remainingToTherapist: document.getElementById('remainingToTherapist'),
        netSettlementText: document.getElementById('netSettlementText'),
        extraRolesDetail: document.getElementById('extraRolesDetail'),
        additionalExpensesDetail: document.getElementById('additionalExpensesDetail'),
        centerOwesTherapistDetail: document.getElementById('centerOwesTherapistDetail')
    };

    function effectiveRate() {
        const base = parseFloat(baseSalaryInput?.value) || 0;
        const bonus = meetingBonusInput?.checked ? 5 : 0;
        return base + bonus;
    }

    function activeRole() {
        return therapistRoleInput?.value || ROLE_SPEECH;
    }

    function roleUsesSessionTypes() {
        return activeRole() !== ROLE_SPEECH;
    }

    function makeSessionTypeId() {
        return `st-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function defaultSessionTypes() {
        const defs = Array.isArray(DEFAULTS.sessionTypes) && DEFAULTS.sessionTypes.length
            ? DEFAULTS.sessionTypes
            : [{ name: 'מפגש רגיל', fullPrice: 370, therapistPrice: 215 }];
        return defs.map((x) => ({
            id: makeSessionTypeId(),
            name: x.name || 'מפגש רגיל',
            fullPrice: Math.max(0, parseFloat(x.fullPrice) || 0),
            therapistPrice: Math.max(0, parseFloat(x.therapistPrice) || 0)
        }));
    }

    function collectTherapistPaymentDetails() {
        return {
            fullName: therapistPayFullNameInput?.value.trim() || '',
            bankName: therapistPayBankNameInput?.value.trim() || '',
            branchNumber: therapistPayBranchInput?.value.trim() || '',
            accountNumber: therapistPayAccountInput?.value.trim() || ''
        };
    }

    function applyTherapistPaymentDetails(details) {
        const d = details || {};
        if (therapistPayFullNameInput) therapistPayFullNameInput.value = d.fullName != null ? String(d.fullName) : String(DEFAULT_THERAPIST_PAYMENT.fullName || '');
        if (therapistPayBankNameInput) therapistPayBankNameInput.value = d.bankName != null ? String(d.bankName) : String(DEFAULT_THERAPIST_PAYMENT.bankName || '');
        if (therapistPayBranchInput) therapistPayBranchInput.value = d.branchNumber != null ? String(d.branchNumber) : String(DEFAULT_THERAPIST_PAYMENT.branchNumber || '');
        if (therapistPayAccountInput) therapistPayAccountInput.value = d.accountNumber != null ? String(d.accountNumber) : String(DEFAULT_THERAPIST_PAYMENT.accountNumber || '');
    }

    function collectSessionTypes() {
        return Array.from(sessionTypesBody.querySelectorAll('tr')).map((tr) => ({
            id: tr.dataset.typeId || makeSessionTypeId(),
            name: tr.querySelector('.st-name')?.value.trim() || '',
            fullPrice: Math.max(0, parseFloat(tr.querySelector('.st-full')?.value) || 0),
            therapistPrice: Math.max(0, parseFloat(tr.querySelector('.st-ther')?.value) || 0)
        }));
    }

    function sessionTypeOptionsHtml(selectedId) {
        return collectSessionTypes()
            .map((st) => `<option value="${escapeAttr(st.id)}" ${st.id === selectedId ? 'selected' : ''}>${escapeHtml(st.name || 'ללא שם')}</option>`)
            .join('');
    }

    function addSessionTypeRow(data) {
        const d = Object.assign({ id: makeSessionTypeId(), name: '', fullPrice: 0, therapistPrice: 0 }, data || {});
        const tr = document.createElement('tr');
        tr.dataset.typeId = d.id;
        tr.innerHTML = `
            <td><input type="text" class="st-name" value="${escapeAttr(d.name)}" placeholder="למשל הערכה" /></td>
            <td><input type="number" class="st-full" min="0" step="1" value="${escapeAttr(d.fullPrice)}" /></td>
            <td><input type="number" class="st-ther" min="0" step="1" value="${escapeAttr(d.therapistPrice)}" /></td>
            <td><button type="button" class="btn btn-danger st-del">מחק</button></td>
        `;
        tr.querySelectorAll('input').forEach((inp) => {
            inp.addEventListener('input', schedulePersist);
            inp.addEventListener('change', schedulePersist);
        });
        tr.querySelector('.st-del')?.addEventListener('click', () => {
            tr.remove();
            schedulePersist();
        });
        sessionTypesBody.appendChild(tr);
    }

    function applySessionTypes(list) {
        const arr = Array.isArray(list) && list.length ? list : defaultSessionTypes();
        sessionTypesBody.innerHTML = '';
        arr.forEach(addSessionTypeRow);
    }

    function isIsoDate(s) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(s).trim());
    }

    function sessionDateSlotsInList(list) {
        if (!list) return [];
        return Array.from(list.querySelectorAll(':scope > .date-slot'));
    }

    function countFilledDates(tr) {
        const list = tr.querySelector('.date-row-list');
        return sessionDateSlotsInList(list)
            .map((slot) => slot.querySelector('.sess-date, .sess-date-legacy')?.value.trim() || '')
            .filter(Boolean).length;
    }

    function syncSessionsFromDates(tr) {
        const inp = tr.querySelector('.sessions');
        if (!inp) return;
        const filled = countFilledDates(tr);
        inp.value = String(filled);
        inp.readOnly = filled > 0;
        inp.title = filled > 0
            ? 'מתעדכן אוטומטית לפי תאריכים'
            : 'הזיני מספר מפגשים אם אין תאריכים';
    }

    function formatRowTotalLabel(gross, meetings, paidCancelCount) {
        if (!gross) return '—';
        const parts = [];
        if (meetings > 0) parts.push(`${meetings} מפגשים`);
        if (paidCancelCount > 0) parts.push(`${paidCancelCount} ביטול בתשלום`);
        const detail = parts.length ? ` (${parts.join(' + ')})` : '';
        return gross.toLocaleString('he-IL') + ' ₪' + detail;
    }

    function buildDateSlotHtml(entry) {
        const raw = (entry && typeof entry === 'object') ? entry : { date: entry };
        const v = String(raw.date == null ? '' : raw.date).trim();
        const typeId = String(raw.sessionTypeId == null ? '' : raw.sessionTypeId).trim();
        const iso = isIsoDate(v);
        const inputHtml = iso || v === ''
            ? `<input type="date" class="sess-date" value="${escapeAttr(iso ? v : '')}" />`
            : `<input type="text" class="sess-date sess-date-legacy" placeholder="למשל 4.2.26" value="${escapeAttr(v)}" inputmode="numeric" />`;
        const typeSelect = roleUsesSessionTypes()
            ? `<select class="sess-type-select" title="סוג מפגש">${sessionTypeOptionsHtml(typeId)}</select>`
            : '';
        return `<span class="date-slot">${inputHtml}${typeSelect}<button type="button" class="date-remove" title="הסר תאריך">×</button></span>`;
    }

    function buildCancelPaidSlotHtml(item) {
        const raw = item && typeof item === 'object' ? item : {};
        const date = String(raw.date == null ? '' : raw.date).trim();
        const mode = raw.mode === 'custom' ? 'custom' : 'full';
        const amount = mode === 'custom' ? (parseFloat(raw.amount) || 0) : '';
        return `<div class="cancel-slot">
            <input type="date" class="cancel-paid-date" value="${escapeAttr(date)}" />
            <select class="cancel-paid-mode" aria-label="סוג תשלום ביטול">
                <option value="full" ${mode === 'full' ? 'selected' : ''}>מלא</option>
                <option value="custom" ${mode === 'custom' ? 'selected' : ''}>אחר</option>
            </select>
            <input type="number" class="cancel-amount" min="0" step="1" value="${escapeAttr(amount)}" placeholder="סכום" ${mode === 'custom' ? '' : 'disabled'} />
            <button type="button" class="date-remove cancel-remove" title="הסר ביטול">×</button>
        </div>`;
    }

    function buildCancelUnpaidSlotHtml(dateVal) {
        const date = String(dateVal == null ? '' : dateVal).trim();
        return `<div class="cancel-slot">
            <input type="date" class="cancel-unpaid-date" value="${escapeAttr(date)}" />
            <button type="button" class="date-remove cancel-remove" title="הסר ביטול">×</button>
        </div>`;
    }

    function periodYearMonth() {
        const p = periodInput.value || defaultPeriodValue();
        const [y, m] = String(p).split('-').map((x) => parseInt(x, 10));
        if (!y || !m) return { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
        return { year: y, month: m };
    }

    function openBulkDatePickerForRow(tr) {
        bulkDateTargetRow = tr;
        const { year, month } = periodYearMonth();
        const daysInMonth = new Date(year, month, 0).getDate();
        const selected = new Set(
            Array.from(tr.querySelectorAll('.date-slot input.sess-date'))
                .map((i) => i.value)
                .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v.startsWith(`${year}-${String(month).padStart(2, '0')}-`))
                .map((v) => Number(v.slice(-2)))
        );
        const name = tr.querySelector('.col-name input')?.value.trim() || 'מטופל/ת';
        bulkDateTitle.textContent = `בחירת תאריכי מפגשים - ${name} (${String(month).padStart(2, '0')}/${year})`;
        bulkDateGrid.innerHTML = '';
        for (let d = 1; d <= daysInMonth; d += 1) {
            const checked = selected.has(d);
            const label = document.createElement('label');
            label.className = `bulk-day${checked ? ' active' : ''}`;
            label.innerHTML = `<input type="checkbox" value="${d}" ${checked ? 'checked' : ''} /><span>${d}</span>`;
            const cb = label.querySelector('input');
            cb.addEventListener('change', () => {
                label.classList.toggle('active', cb.checked);
            });
            bulkDateGrid.appendChild(label);
        }
        bulkDateDialog.showModal();
    }

    function defaultGroupEntry() {
        return { rate: 0, children: 1, sessions: 0, dates: [''] };
    }

    function normalizeOneGroupEntry(raw) {
        const g = raw && typeof raw === 'object' ? raw : {};
        const dates = Array.isArray(g.dates) && g.dates.length ? g.dates.map((d) => String(d == null ? '' : d).trim()) : [''];
        const filled = dates.filter(Boolean).length;
        const sessions = Math.max(0, Math.floor(Number(g.sessions)) || 0) || filled;
        return {
            rate: Math.max(0, parseFloat(g.rate) || 0),
            children: Math.max(1, Math.floor(parseFloat(g.children) || 1)),
            sessions,
            dates
        };
    }

    /** תאימות לאחור: group יחיד או groups[] */
    function normalizeGroupsPayload(raw) {
        const base = raw && typeof raw === 'object' ? raw : {};
        if (Array.isArray(base.groups) && base.groups.length) {
            return {
                enabled: base.enabled != null ? !!base.enabled : true,
                groups: base.groups.map(normalizeOneGroupEntry)
            };
        }
        const legacy = normalizeOneGroupEntry(base);
        const hasLegacyData = !!base.enabled || legacy.rate > 0 || legacy.dates.some(Boolean);
        return {
            enabled: !!base.enabled || hasLegacyData,
            groups: [legacy]
        };
    }

    function countFilledGroupDatesInList(listEl) {
        return Array.from(listEl.querySelectorAll('input.group-date, input.group-date-legacy'))
            .filter((i) => i.value.trim() !== '').length;
    }

    function syncGroupSessionsInBlock(block) {
        const sessionsInput = block.querySelector('.group-sessions');
        const dateList = block.querySelector('.group-date-list');
        if (sessionsInput && dateList) {
            sessionsInput.value = String(countFilledGroupDatesInList(dateList));
        }
    }

    function buildGroupDateSlotsHtml(dates) {
        const normalized = Array.isArray(dates) ? dates : [''];
        const safeDates = normalized.length ? normalized : [''];
        return safeDates
            .map((d) => {
                const v = String(d == null ? '' : d).trim();
                const iso = isIsoDate(v);
                const input = iso || v === ''
                    ? `<input type="date" class="group-date" value="${escapeAttr(iso ? v : '')}" />`
                    : `<input type="text" class="group-date group-date-legacy" placeholder="למשל 4.2.26" value="${escapeAttr(v)}" inputmode="numeric" />`;
                return `<span class="date-slot">${input}<button type="button" class="date-remove" title="הסר תאריך">×</button></span>`;
            })
            .join('');
    }

    function createGroupBlockElement(data, index, canRemove) {
        const g = normalizeOneGroupEntry(data);
        const block = document.createElement('section');
        block.className = 'group-block';
        block.dataset.groupIndex = String(index);
        block.innerHTML = `
            <div class="group-block-head">
                <h3 class="group-block-title">קבוצה ${index + 1}</h3>
                <button type="button" class="btn-mini-alt group-remove-btn" title="הסר קבוצה זו"${canRemove ? '' : ' hidden'}>הסר קבוצה</button>
            </div>
            <div class="settings-grid">
                <div>
                    <label>שכר למפגש קבוצה</label>
                    <input type="number" class="group-rate" min="0" step="1" value="${escapeAttr(g.rate)}" />
                </div>
                <div>
                    <label>כמה ילדים בקבוצה</label>
                    <input type="number" class="group-children" min="1" step="1" value="${escapeAttr(g.children)}" />
                </div>
                <div>
                    <label>מספר מפגשי קבוצה (אוטומטי לפי תאריכים)</label>
                    <input type="number" class="group-sessions" min="0" step="1" value="${escapeAttr(g.sessions)}" readonly />
                </div>
            </div>
            <div class="group-dates-wrap">
                <label>תאריכי מפגשי קבוצה</label>
                <div class="date-row-list group-date-list" style="justify-content:flex-start;">${buildGroupDateSlotsHtml(g.dates)}</div>
                <button type="button" class="btn-mini add-group-date-btn">+ תאריך קבוצה</button>
            </div>
        `;
        syncGroupSessionsInBlock(block);
        return block;
    }

    function renumberGroupBlocks() {
        if (!groupsListEl) return;
        const blocks = groupsListEl.querySelectorAll('.group-block');
        blocks.forEach((block, i) => {
            const title = block.querySelector('.group-block-title');
            if (title) title.textContent = `קבוצה ${i + 1}`;
            block.dataset.groupIndex = String(i);
            const removeBtn = block.querySelector('.group-remove-btn');
            if (removeBtn) removeBtn.hidden = blocks.length <= 1;
        });
    }

    function renderGroups(groups) {
        if (!groupsListEl) return;
        const list = Array.isArray(groups) && groups.length ? groups.map(normalizeOneGroupEntry) : [defaultGroupEntry()];
        groupsListEl.innerHTML = '';
        list.forEach((g, i) => {
            groupsListEl.appendChild(createGroupBlockElement(g, i, list.length > 1));
        });
        renumberGroupBlocks();
    }

    function collectGroupState() {
        const blocks = groupsListEl ? Array.from(groupsListEl.querySelectorAll('.group-block')) : [];
        const groups = blocks.map((block) => {
            const dateList = block.querySelector('.group-date-list');
            const dates = dateList
                ? Array.from(dateList.querySelectorAll('input.group-date, input.group-date-legacy')).map((i) => i.value.trim())
                : [''];
            return normalizeOneGroupEntry({
                rate: block.querySelector('.group-rate')?.value,
                children: block.querySelector('.group-children')?.value,
                sessions: countFilledGroupDatesInList(dateList || document.createElement('div')),
                dates
            });
        });
        return {
            enabled: !!groupEnabledInput?.checked,
            groups: groups.length ? groups : [defaultGroupEntry()]
        };
    }

    function applyGroupState(raw) {
        const normalized = normalizeGroupsPayload(raw);
        if (groupEnabledInput) groupEnabledInput.checked = normalized.enabled;
        renderGroups(normalized.groups);
        toggleGroupVisibility();
    }

    function groupsForNewMonthFromCurrent() {
        const g = collectGroupState();
        if (!g.enabled) return { enabled: false, groups: [defaultGroupEntry()] };
        return {
            enabled: true,
            groups: g.groups.map((gr) => ({
                rate: gr.rate,
                children: gr.children,
                sessions: 0,
                dates: ['']
            }))
        };
    }

    function toggleGroupVisibility() {
        if (!groupFields) return;
        if (groupEnabledInput?.checked) {
            groupFields.classList.remove('is-hidden');
        } else {
            groupFields.classList.add('is-hidden');
        }
    }

    function wireGroupsListEvents() {
        if (!groupsListEl) return;
        groupsListEl.addEventListener('input', (e) => {
            if (e.target.matches('.group-rate, .group-children, .group-date, .group-date-legacy')) {
                const block = e.target.closest('.group-block');
                if (block) syncGroupSessionsInBlock(block);
                schedulePersist();
            }
        });
        groupsListEl.addEventListener('change', (e) => {
            if (e.target.matches('.group-rate, .group-children, .group-date, .group-date-legacy')) {
                const block = e.target.closest('.group-block');
                if (block) syncGroupSessionsInBlock(block);
                schedulePersist();
            }
        });
        groupsListEl.addEventListener('click', (e) => {
            const block = e.target.closest('.group-block');
            if (!block) return;
            if (e.target.closest('.add-group-date-btn')) {
                const dateList = block.querySelector('.group-date-list');
                if (!dateList || dateList.querySelectorAll('.date-slot').length >= MAX_DATE_SLOTS) return;
                const wrap = document.createElement('span');
                wrap.className = 'date-slot';
                wrap.innerHTML = '<input type="date" class="group-date" value="" /><button type="button" class="date-remove" title="הסר תאריך">×</button>';
                dateList.appendChild(wrap);
                syncGroupSessionsInBlock(block);
                schedulePersist();
                wrap.querySelector('input')?.focus();
                return;
            }
            const removeDateBtn = e.target.closest('.date-remove');
            if (removeDateBtn && block.contains(removeDateBtn)) {
                const slot = removeDateBtn.closest('.date-slot');
                const dateList = block.querySelector('.group-date-list');
                if (!slot || !dateList) return;
                const slots = dateList.querySelectorAll('.date-slot');
                if (slots.length <= 1) {
                    const inp = slot.querySelector('input');
                    if (inp) inp.value = '';
                } else {
                    slot.remove();
                }
                syncGroupSessionsInBlock(block);
                schedulePersist();
                return;
            }
            if (e.target.closest('.group-remove-btn')) {
                const blocks = groupsListEl.querySelectorAll('.group-block');
                if (blocks.length <= 1) return;
                block.remove();
                renumberGroupBlocks();
                schedulePersist();
            }
        });
    }

    function toggleExtraRoleVisibility() {
        if (extraRoleEnabledInput.checked) {
            extraRoleFields.classList.remove('is-hidden');
        } else {
            extraRoleFields.classList.add('is-hidden');
        }
    }

    function toggleAdditionalExpensesVisibility() {
        if (additionalExpensesEnabledInput.checked) {
            additionalExpensesFields.classList.remove('is-hidden');
        } else {
            additionalExpensesFields.classList.add('is-hidden');
        }
    }

    function toggleCenterOwesTherapistVisibility() {
        centerOwesTherapistFields.classList.toggle('is-hidden', !centerOwesTherapistEnabledInput.checked);
    }

    function toggleParentMeetingsVisibility() {
        parentMeetingsFields.classList.toggle('is-hidden', !parentMeetingsEnabledInput.checked);
    }

    function toggleLanguageEvaluationsVisibility() {
        languageEvaluationsFields.classList.toggle('is-hidden', !languageEvaluationsEnabledInput.checked);
    }

    function toggleDiagnosticsVisibility() {
        diagnosticsFields.classList.toggle('is-hidden', !diagnosticsEnabledInput.checked);
    }

    function toggleGroupAssessmentsVisibility() {
        groupAssessmentsFields.classList.toggle('is-hidden', !groupAssessmentsEnabledInput.checked);
    }

    function toggleCourseExpensesVisibility() {
        courseExpensesFields.classList.toggle('is-hidden', !courseExpensesEnabledInput.checked);
    }

    function toAmount(value, fallback) {
        const n = parseFloat(value);
        if (Number.isNaN(n)) return fallback || 0;
        return Math.max(0, n);
    }

    function normalizeParentMeetingDuration(value) {
        const n = Number(value);
        return n === PARENT_MEETING_HALF_MINUTES ? PARENT_MEETING_HALF_MINUTES : PARENT_MEETING_FULL_MINUTES;
    }

    function parentMeetingDurationLabel(duration) {
        return normalizeParentMeetingDuration(duration) === PARENT_MEETING_HALF_MINUTES
            ? `${PARENT_MEETING_HALF_MINUTES} דקות`
            : `${PARENT_MEETING_FULL_MINUTES} דקות`;
    }

    function parentMeetingTherapistAmount(meeting, rate) {
        return normalizeParentMeetingDuration(meeting && meeting.duration) === PARENT_MEETING_HALF_MINUTES
            ? PARENT_MEETING_HALF_PRICE
            : rate;
    }

    function wireMiniRowInputs(tr) {
        tr.querySelectorAll('input, select').forEach((inp) => {
            inp.addEventListener('input', schedulePersist);
            inp.addEventListener('change', schedulePersist);
        });
        const del = tr.querySelector('.mini-del');
        if (del) {
            del.addEventListener('click', () => {
                tr.remove();
                schedulePersist();
            });
        }
    }

    function addParentMeetingRow(data) {
        const d = data || {};
        const duration = normalizeParentMeetingDuration(d.duration);
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="pm-child" value="${escapeAttr(d.child)}" placeholder="שם ילד" /></td>
            <td><input type="date" class="pm-date" value="${escapeAttr(d.date)}" /></td>
            <td>
                <select class="pm-duration">
                    <option value="${PARENT_MEETING_FULL_MINUTES}" ${duration === PARENT_MEETING_FULL_MINUTES ? 'selected' : ''}>${PARENT_MEETING_FULL_MINUTES} דקות</option>
                    <option value="${PARENT_MEETING_HALF_MINUTES}" ${duration === PARENT_MEETING_HALF_MINUTES ? 'selected' : ''}>${PARENT_MEETING_HALF_MINUTES} דקות</option>
                </select>
            </td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        parentMeetingsBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addLanguageEvalRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="le-child" value="${escapeAttr(d.child)}" placeholder="שם ילד" /></td>
            <td><input type="date" class="le-date" value="${escapeAttr(d.date)}" /></td>
            <td><input type="number" min="0" step="1" class="le-total" value="${toAmount(d.total, 500)}" /></td>
            <td><input type="number" min="0" step="1" class="le-therapist" value="${toAmount(d.therapist, 305)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        languageEvalBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addDiagnosticRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="dg-child" value="${escapeAttr(d.child)}" placeholder="שם ילד" /></td>
            <td><input type="date" class="dg-date" value="${escapeAttr(d.date)}" /></td>
            <td><input type="number" min="0" step="1" class="dg-pay" value="${toAmount(d.therapist, 900)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        diagnosticsBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addGroupAssessmentRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="ga-child" value="${escapeAttr(d.child)}" placeholder="שם ילד" /></td>
            <td><input type="date" class="ga-date" value="${escapeAttr(d.date)}" /></td>
            <td><input type="number" min="0" step="1" class="ga-price" value="${toAmount(d.price, 150)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        groupAssessmentsBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addCourseExpenseRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="ce-name" value="${escapeAttr(d.course)}" placeholder="שם קורס" /></td>
            <td><input type="number" min="0" step="1" class="ce-cost" value="${toAmount(d.cost, 0)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        courseExpensesBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addExtraRoleRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="er-name" value="${escapeAttr(d.role)}" placeholder="שם תפקיד" /></td>
            <td><input type="number" min="0" step="1" class="er-amount" value="${toAmount(d.amount, 0)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        extraRolesBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addAdditionalExpenseRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="ae-name" value="${escapeAttr(d.name)}" placeholder="שם הוצאה" /></td>
            <td><input type="number" min="0" step="1" class="ae-amount" value="${toAmount(d.amount, 0)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        additionalExpensesBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function addCenterOwesTherapistRow(data) {
        const d = data || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><input type="text" class="co-name" value="${escapeAttr(d.name)}" placeholder="תיאור החוב" /></td>
            <td><input type="number" min="0" step="1" class="co-amount" value="${toAmount(d.amount, 0)}" /></td>
            <td><button type="button" class="btn btn-danger mini-del">מחק</button></td>`;
        centerOwesTherapistBody.appendChild(tr);
        wireMiniRowInputs(tr);
    }

    function collectExtrasState() {
        const parentMeetings = Array.from(parentMeetingsBody.querySelectorAll('tr')).map((tr) => ({
            child: tr.querySelector('.pm-child')?.value.trim() || '',
            date: tr.querySelector('.pm-date')?.value || '',
            duration: normalizeParentMeetingDuration(tr.querySelector('.pm-duration')?.value)
        }));
        const languageEvaluations = Array.from(languageEvalBody.querySelectorAll('tr')).map((tr) => ({
            child: tr.querySelector('.le-child')?.value.trim() || '',
            date: tr.querySelector('.le-date')?.value || '',
            total: toAmount(tr.querySelector('.le-total')?.value, 500),
            therapist: toAmount(tr.querySelector('.le-therapist')?.value, 305)
        }));
        const diagnostics = Array.from(diagnosticsBody.querySelectorAll('tr')).map((tr) => ({
            child: tr.querySelector('.dg-child')?.value.trim() || '',
            date: tr.querySelector('.dg-date')?.value || '',
            therapist: toAmount(tr.querySelector('.dg-pay')?.value, 900)
        }));
        const groupAssessments = Array.from(groupAssessmentsBody.querySelectorAll('tr')).map((tr) => ({
            child: tr.querySelector('.ga-child')?.value.trim() || '',
            date: tr.querySelector('.ga-date')?.value || '',
            price: toAmount(tr.querySelector('.ga-price')?.value, 150)
        }));
        const courseExpenses = Array.from(courseExpensesBody.querySelectorAll('tr')).map((tr) => ({
            course: tr.querySelector('.ce-name')?.value.trim() || '',
            cost: toAmount(tr.querySelector('.ce-cost')?.value, 0)
        }));
        const extraRoles = Array.from(extraRolesBody.querySelectorAll('tr')).map((tr) => ({
            role: tr.querySelector('.er-name')?.value.trim() || '',
            amount: toAmount(tr.querySelector('.er-amount')?.value, 0)
        }));
        const additionalExpenses = Array.from(additionalExpensesBody.querySelectorAll('tr')).map((tr) => ({
            name: tr.querySelector('.ae-name')?.value.trim() || '',
            amount: toAmount(tr.querySelector('.ae-amount')?.value, 0)
        }));
        const centerOwesTherapist = Array.from(centerOwesTherapistBody.querySelectorAll('tr')).map((tr) => ({
            name: tr.querySelector('.co-name')?.value.trim() || '',
            amount: toAmount(tr.querySelector('.co-amount')?.value, 0)
        }));
        return {
            parentMeetings,
            languageEvaluations,
            diagnostics,
            groupAssessments,
            courseExpenses,
            parentMeetingsEnabled: !!parentMeetingsEnabledInput.checked,
            languageEvaluationsEnabled: !!languageEvaluationsEnabledInput.checked,
            diagnosticsEnabled: !!diagnosticsEnabledInput.checked,
            groupAssessmentsEnabled: !!groupAssessmentsEnabledInput.checked,
            courseExpensesEnabled: !!courseExpensesEnabledInput.checked,
            extraRoleEnabled: !!extraRoleEnabledInput.checked,
            extraRoles,
            additionalExpensesEnabled: !!additionalExpensesEnabledInput.checked,
            additionalExpenses,
            centerOwesTherapistEnabled: !!centerOwesTherapistEnabledInput.checked,
            centerOwesTherapist
        };
    }

    function applyExtrasState(extras) {
        const e = extras || {};
        parentMeetingsBody.innerHTML = '';
        languageEvalBody.innerHTML = '';
        diagnosticsBody.innerHTML = '';
        groupAssessmentsBody.innerHTML = '';
        courseExpensesBody.innerHTML = '';
        extraRolesBody.innerHTML = '';
        additionalExpensesBody.innerHTML = '';
        centerOwesTherapistBody.innerHTML = '';

        const p = Array.isArray(e.parentMeetings) ? e.parentMeetings : [];
        const l = Array.isArray(e.languageEvaluations) ? e.languageEvaluations : [];
        const d = Array.isArray(e.diagnostics) ? e.diagnostics : [];
        const g = Array.isArray(e.groupAssessments) ? e.groupAssessments : [];
        const c = Array.isArray(e.courseExpenses) ? e.courseExpenses : [];
        const er = Array.isArray(e.extraRoles) ? e.extraRoles : [];
        const ae = Array.isArray(e.additionalExpenses) ? e.additionalExpenses : [];
        const co = Array.isArray(e.centerOwesTherapist) ? e.centerOwesTherapist : [];
        parentMeetingsEnabledInput.checked = e.parentMeetingsEnabled != null ? !!e.parentMeetingsEnabled : p.length > 0;
        languageEvaluationsEnabledInput.checked = e.languageEvaluationsEnabled != null ? !!e.languageEvaluationsEnabled : l.length > 0;
        diagnosticsEnabledInput.checked = e.diagnosticsEnabled != null ? !!e.diagnosticsEnabled : d.length > 0;
        groupAssessmentsEnabledInput.checked = e.groupAssessmentsEnabled != null ? !!e.groupAssessmentsEnabled : g.length > 0;
        courseExpensesEnabledInput.checked = e.courseExpensesEnabled != null ? !!e.courseExpensesEnabled : c.length > 0;
        extraRoleEnabledInput.checked = e.extraRoleEnabled != null ? !!e.extraRoleEnabled : er.length > 0;
        additionalExpensesEnabledInput.checked = e.additionalExpensesEnabled != null ? !!e.additionalExpensesEnabled : ae.length > 0;
        centerOwesTherapistEnabledInput.checked = e.centerOwesTherapistEnabled != null ? !!e.centerOwesTherapistEnabled : co.length > 0;
        toggleParentMeetingsVisibility();
        toggleLanguageEvaluationsVisibility();
        toggleDiagnosticsVisibility();
        toggleGroupAssessmentsVisibility();
        toggleCourseExpensesVisibility();
        toggleExtraRoleVisibility();
        toggleAdditionalExpensesVisibility();
        toggleCenterOwesTherapistVisibility();

        p.forEach(addParentMeetingRow);
        l.forEach(addLanguageEvalRow);
        d.forEach(addDiagnosticRow);
        g.forEach(addGroupAssessmentRow);
        c.forEach(addCourseExpenseRow);
        er.forEach(addExtraRoleRow);
        ae.forEach(addAdditionalExpenseRow);
        co.forEach(addCenterOwesTherapistRow);
    }

    function wireDateRow(tr) {
        if (tr.dataset.dateWired === '1') return;
        tr.dataset.dateWired = '1';

        const list = tr.querySelector('.date-row-list');
        const addBtn = tr.querySelector('.add-date-btn');
        const bulkBtn = tr.querySelector('.bulk-date-btn');

        list.addEventListener('input', (e) => {
            if (!e.target.matches('.sess-date, .sess-date-legacy, .sess-type-select')) return;
            syncSessionsFromDates(tr);
            if (e.target.matches('.sess-type-select')) updateSessionSlotColorsInRow(tr);
            schedulePersist();
        });
        list.addEventListener('change', (e) => {
            if (!e.target.matches('.sess-date, .sess-date-legacy, .sess-type-select')) return;
            syncSessionsFromDates(tr);
            if (e.target.matches('.sess-type-select')) updateSessionSlotColorsInRow(tr);
            schedulePersist();
        });

        list.addEventListener('click', (e) => {
            const btn = e.target.closest('.date-remove');
            if (!btn || !list.contains(btn)) return;
            const slot = btn.closest('.date-slot');
            if (!slot) return;
            const slots = sessionDateSlotsInList(list);
            if (slots.length <= 1) {
                const inp = slot.querySelector('input');
                if (inp) inp.value = '';
            } else {
                slot.remove();
            }
            syncSessionsFromDates(tr);
            schedulePersist();
        });

        addBtn.addEventListener('click', () => {
            if (sessionDateSlotsInList(list).length >= MAX_DATE_SLOTS) return;
            list.insertAdjacentHTML('beforeend', buildDateSlotHtml({ date: '', sessionTypeId: '' }));
            const wrap = list.lastElementChild;
            syncSessionsFromDates(tr);
            updateSessionSlotColorsInRow(tr);
            schedulePersist();
            wrap?.querySelector('input')?.focus();
        });

        bulkBtn.addEventListener('click', () => {
            openBulkDatePickerForRow(tr);
        });

        tr.querySelector('.sessions')?.addEventListener('input', schedulePersist);
        tr.querySelector('.sessions')?.addEventListener('change', schedulePersist);
    }

    function rowDataFromTr(tr) {
        const sessionEntries = readSessionEntriesFromRow(tr).filter((x) => String(x.date || '').trim());
        const dates = sessionEntries.map((x) => x.date);
        const cancelPaidEntries = Array.from(tr.querySelectorAll('.cancel-paid-list .cancel-slot')).map((slot) => {
            const mode = slot.querySelector('.cancel-paid-mode')?.value === 'custom' ? 'custom' : 'full';
            return {
                date: slot.querySelector('.cancel-paid-date')?.value.trim() || '',
                mode,
                amount: mode === 'custom' ? Math.max(0, parseFloat(slot.querySelector('.cancel-amount')?.value) || 0) : 0
            };
        });
        const cancelUnpaidDates = Array.from(tr.querySelectorAll('.cancel-unpaid-list .cancel-unpaid-date'))
            .map((i) => i.value.trim());
        return {
            name: tr.querySelector('.col-name input')?.value.trim() ?? '',
            dates,
            sessionEntries,
            sessions: sessionEntries.length || parseFloat(tr.querySelector('.sessions')?.value) || 0,
            cancelPaidEntries,
            cancelUnpaidDates,
            cancelPaid: cancelPaidEntries.length,
            cancelUnpaid: cancelUnpaidDates.length,
            paidReceived: !!tr.querySelector('.paid-mark')?.checked,
            paidToCenter: !!tr.querySelector('.paid-center')?.checked,
            paidToTherapist: !!tr.querySelector('.paid-therapist')?.checked,
            note: tr.querySelector('.col-note .note-input')?.value.trim() ?? ''
        };
    }

    function sessionTypeMapFrom(list) {
        const map = {};
        (Array.isArray(list) ? list : []).forEach((st) => {
            if (!st || !st.id) return;
            map[st.id] = {
                fullPrice: Math.max(0, parseFloat(st.fullPrice) || 0),
                therapistPrice: Math.max(0, parseFloat(st.therapistPrice) || 0)
            };
        });
        return map;
    }

    function sessionBreakdownFromRow(rd, opts) {
        const options = opts || {};
        const role = options.role || activeRole();
        const clientRate = Math.max(0, parseFloat(options.clientRate) || parseFloat(clientRateInput?.value) || 0);
        const therapistRate = Math.max(0, parseFloat(options.therapistRate) || effectiveRate());
        const stMap = options.sessionTypeMap || sessionTypeMapFrom(collectSessionTypes());
        const entries = normalizeSessionEntries(rd.sessionEntries, rd.dates, rd.sessions);
        let meetings = 0;
        let gross = 0;
        let therapist = 0;
        entries.forEach((entry) => {
            const date = String((entry && entry.date) == null ? '' : entry.date).trim();
            if (!date) return;
            meetings += 1;
            if (role !== ROLE_SPEECH) {
                const st = stMap[String(entry.sessionTypeId || '')];
                gross += st ? st.fullPrice : clientRate;
                therapist += st ? st.therapistPrice : therapistRate;
            } else {
                gross += clientRate;
                therapist += therapistRate;
            }
        });
        if (meetings === 0) {
            const manual = Math.max(0, Math.floor(parseFloat(rd.sessions) || 0));
            if (manual > 0) {
                meetings = manual;
                if (role !== ROLE_SPEECH) {
                    const firstType = Object.values(stMap)[0];
                    const fp = firstType ? firstType.fullPrice : clientRate;
                    const tp = firstType ? firstType.therapistPrice : therapistRate;
                    gross = manual * fp;
                    therapist = manual * tp;
                } else {
                    gross = manual * clientRate;
                    therapist = manual * therapistRate;
                }
            }
        }
        return { meetings, gross, therapist };
    }

    function rowGrossFromRd(rd, clientRate, role, sessionTypeMap) {
        const sessionsPart = sessionBreakdownFromRow(rd, {
            clientRate,
            role,
            sessionTypeMap
        });
        const paidCancelTotal = (rd.cancelPaidEntries || []).reduce((acc, x) => {
            if (!x || !x.date) return acc;
            const amount = x.mode === 'custom' ? (parseFloat(x.amount) || 0) : (parseFloat(clientRate) || 0);
            return acc + Math.max(0, amount);
        }, 0);
        return sessionsPart.gross + paidCancelTotal;
    }

    function paymentDestinationLabel(paidReceived, toCenter, toTherapist) {
        if (!paidReceived) return '';
        const parts = [];
        if (toCenter) parts.push('מרכז');
        if (toTherapist) parts.push('מטפלת');
        if (!parts.length) return 'לא צוין יעד (סמני למרכז / למטפלת)';
        return parts.join(' + ');
    }

    function rowBillingParts(rd) {
        const clientRate = parseFloat(clientRateInput?.value) || 0;
        const role = activeRole();
        const stMap = sessionTypeMapFrom(collectSessionTypes());
        const sessionsPart = sessionBreakdownFromRow(rd, {
            clientRate,
            role,
            sessionTypeMap: stMap
        });
        const paidCancelCount = (rd.cancelPaidEntries || []).filter((x) => x && x.date).length;
        const billableMeetings = sessionsPart.meetings + paidCancelCount;
        const rowTotal = sessionsPart.gross + (rd.cancelPaidEntries || []).reduce((acc, x) => {
            if (!x || !x.date) return acc;
            const amount = x.mode === 'custom' ? (parseFloat(x.amount) || 0) : clientRate;
            return acc + Math.max(0, amount);
        }, 0);
        return { billableMeetings, rowTotal };
    }

    function buildTherapistWhatsappText(meetings, amount, therapistPaymentDetails) {
        const d = therapistPaymentDetails || collectTherapistPaymentDetails();
        return `היי!
החודש התקיימו ${meetings} מפגשים עליהם יש להעביר סכום של ${amount} ש"ח ל
${d.fullName || '—'}
בנק ${d.bankName || '—'}
סניף ${d.branchNumber || '—'}
מס חשבון ${d.accountNumber || '—'}
ניתן לשלם גם בביט/פייבוקס`;
    }

    function buildCenterWhatsappText(meetings, amount) {
        return `היי!
החודש התקיימו ${meetings} מפגשים
עליהם יש להעביר סכום של ${amount} ש"ח
ל - "אבוקדו - מרכז התפתחותי לילדים בע"מ"
בנק לאומי 10
סניף פרדס חנה 954
מספר חשבון 262083`;
    }

    function openPaymentMessageForRow(tr) {
        const rd = rowDataFromTr(tr);
        const paidToCenter = !!rd.paidToCenter;
        const paidToTherapist = !!rd.paidToTherapist;
        if (!paidToCenter && !paidToTherapist) {
            alert('כדי ליצור הודעה צריך לסמן "למרכז" או "למטפלת" בשורה הזו.');
            return;
        }
        const parts = rowBillingParts(rd);
        const meetings = parts.billableMeetings.toLocaleString('he-IL');
        const transferAmount = parts.rowTotal.toLocaleString('he-IL');
        const therapistPaymentDetails = collectTherapistPaymentDetails();
        const blocks = [];
        if (paidToTherapist) blocks.push(buildTherapistWhatsappText(meetings, transferAmount, therapistPaymentDetails));
        if (paidToCenter) blocks.push(buildCenterWhatsappText(meetings, transferAmount));
        const patientName = rd.name || 'ללא שם';
        paymentMsgTitle.textContent = `הודעה לוואטסאפ - ${patientName}`;
        paymentMsgText.value = blocks.join('\n\n--------------------\n\n');
        paymentMsgDialog.showModal();
    }

    function enforceExclusivePayTarget(tr, source) {
        const center = tr.querySelector('.paid-center');
        const therapist = tr.querySelector('.paid-therapist');
        if (!center || !therapist) return;
        if (source === 'center' && center.checked) therapist.checked = false;
        if (source === 'therapist' && therapist.checked) center.checked = false;
    }

    function updateRowPaidStyle(tr) {
        syncRowPayTargetData(tr);
        const mark = tr.querySelector('.paid-mark')?.checked;
        const c = tr.querySelector('.paid-center')?.checked;
        const t = tr.querySelector('.paid-therapist')?.checked;
        tr.classList.remove('row-pay-mark', 'row-pay-target-center', 'row-pay-target-therapist', 'row-pay-target-both', 'row-pay-target-none');
        if (!mark) return;
        tr.classList.add('row-pay-mark');
        if (c && t) tr.classList.add('row-pay-target-both');
        else if (c) tr.classList.add('row-pay-target-center');
        else if (t) tr.classList.add('row-pay-target-therapist');
        else tr.classList.add('row-pay-target-none');
    }

    function updateAllRowPaidStyles() {
        getAllPatientTableRows().forEach(updateRowPaidStyle);
    }

    function patientTableStashTbodyEl() {
        let table = document.getElementById('patientTableStash');
        if (!table) {
            table = document.createElement('table');
            table.id = 'patientTableStash';
            table.hidden = true;
            table.setAttribute('aria-hidden', 'true');
            table.style.display = 'none';
            table.appendChild(document.createElement('tbody'));
            document.body.appendChild(table);
        }
        return table.querySelector('tbody');
    }

    function assignPatientRowOrder(tr) {
        if (!tr.dataset.rowOrder) {
            patientRowOrderSeq += 1;
            tr.dataset.rowOrder = String(patientRowOrderSeq);
        }
    }

    function clearPatientTableRows() {
        if (tbody) tbody.replaceChildren();
        const stash = patientTableStashTbodyEl();
        if (stash) stash.replaceChildren();
        patientRowOrderSeq = 0;
    }

    function getAllPatientTableRows() {
        const rows = [];
        if (tbody) {
            rows.push(...Array.from(tbody.children).filter((el) => el.tagName === 'TR'));
        }
        const stash = patientTableStashTbodyEl();
        if (stash) {
            rows.push(...Array.from(stash.children).filter((el) => el.tagName === 'TR'));
        }
        return rows.sort((a, b) => (Number(a.dataset.rowOrder) || 0) - (Number(b.dataset.rowOrder) || 0));
    }

    /** יעד תשלום לסינון — רק «למרכז» / «למטפלת», לא «שולם» */
    function syncRowPayTargetData(tr) {
        const toCenter = !!tr.querySelector('.paid-center')?.checked;
        const toTherapist = !!tr.querySelector('.paid-therapist')?.checked;
        if (toCenter) tr.dataset.payTarget = 'center';
        else if (toTherapist) tr.dataset.payTarget = 'therapist';
        else tr.dataset.payTarget = 'none';
    }

    function getPatientPayFilterValue() {
        const filterEl = document.getElementById('patientPayFilter');
        return (filterEl?.value || 'all').trim();
    }

    function rowMatchesPayFilter(tr, filter) {
        if (filter === 'all') return true;
        syncRowPayTargetData(tr);
        return tr.dataset.payTarget === filter;
    }

    function applyPatientTableFilter(forcedFilter) {
        if (!tbody) return;
        const stashTbody = patientTableStashTbodyEl();
        if (!stashTbody) return;
        const filter = forcedFilter != null ? String(forcedFilter).trim() : getPatientPayFilterValue();
        const rows = getAllPatientTableRows();
        let visible = 0;
        rows.forEach((tr) => {
            assignPatientRowOrder(tr);
            syncRowPayTargetData(tr);
            const show = rowMatchesPayFilter(tr, filter);
            const target = show ? tbody : stashTbody;
            if (tr.parentElement !== target) target.appendChild(tr);
            if (show) visible += 1;
        });
        renumber();
        const countEl = document.getElementById('patientPayFilterCount');
        if (countEl) {
            countEl.textContent = filter === 'all' || !rows.length
                ? ''
                : `מוצגות ${visible} מתוך ${rows.length}`;
        }
    }
    window.applyPatientTableFilter = applyPatientTableFilter;

    function buildPaymentRoutingSummary(state, sum) {
        const clientRate = parseFloat(state.clientRate) || 0;
        const role = state.therapistRole || ROLE_SPEECH;
        const stMap = sessionTypeMapFrom(state.sessionTypes || []);
        const rows = (state.rows || []).map((rd, i) => {
            const gross = rowGrossFromRd(rd, clientRate, role, stMap);
            const pr = !!rd.paidReceived;
            const toC = !!rd.paidToCenter;
            const toT = !!rd.paidToTherapist;
            return {
                row: i + 1,
                name: rd.name || '',
                rowTotal: gross,
                paidChecked: pr,
                paidToCenter: toC,
                paidToTherapist: toT,
                whoReceivesPayment_he: paymentDestinationLabel(pr, toC, toT),
                countedForCenterKizuz: pr && toC ? gross : 0,
                countedForTherapistKizuz: pr && toT ? gross : 0
            };
        });
        return {
            note_he: 'מי משלם לאן: החישוב נקבע לפי סימון «למרכז» / «למטפלת».',
            rows,
            totalsMatchScreen: {
                paidToCenterTotal: sum.paidToCenterTotal,
                paidToTherapistTotal: sum.paidToTherapistTotal,
                paidToCenterApplied: sum.paidToCenterApplied,
                paidToTherapistApplied: sum.paidToTherapistApplied,
                paidToCenterTreatmentCount: sum.paidToCenterTreatmentCount,
                paidToTherapistTreatmentCount: sum.paidToTherapistTreatmentCount
            }
        };
    }

    function updatePatientTableLayoutMode() {
        if (!patientTableWrap) return;
        const hasCancelRows = getAllPatientTableRows().some((tr) => tr.querySelector('.cancel-slot'));
        patientTableWrap.classList.toggle('expanded-table', hasCancelRows);
        patientTableWrap.classList.toggle('compact-table', !hasCancelRows);
    }

    function refreshSessionTypeSelectsInRows() {
        const options = sessionTypeOptionsHtml('');
        getAllPatientTableRows().forEach((tr) => {
            tr.querySelectorAll('.date-slot .sess-type-select').forEach((sel) => {
                const prev = sel.value;
                sel.innerHTML = options;
                if (prev && Array.from(sel.options).some((o) => o.value === prev)) sel.value = prev;
            });
        });
        updateAllSessionSlotColors();
    }

    function refreshDateSlotsForRoleChange() {
        getAllPatientTableRows().forEach((tr) => {
            const entries = readSessionEntriesFromRow(tr).filter((x) => String(x.date || '').trim());
            const list = tr.querySelector('.date-row-list');
            if (!list) return;
            const toRender = entries.length ? entries : [{ date: '', sessionTypeId: '' }];
            list.innerHTML = toRender.map((e) => buildDateSlotHtml(e)).join('');
            syncSessionsFromDates(tr);
            updateSessionSlotColorsInRow(tr);
        });
    }

    function updateSessionSlotColorsInRow(tr) {
        const useTypes = roleUsesSessionTypes();
        const types = collectSessionTypes();
        const idToIndex = {};
        types.forEach((st, idx) => { idToIndex[st.id] = idx; });
        tr.querySelectorAll('.date-row-list .date-slot').forEach((slot) => {
            const sel = slot.querySelector('.sess-type-select');
            if (!useTypes || !sel) {
                slot.classList.remove('with-type-color');
                slot.style.backgroundColor = '';
                slot.style.borderColor = '';
                return;
            }
            const idx = idToIndex[sel.value];
            if (idx == null) {
                slot.classList.remove('with-type-color');
                slot.style.backgroundColor = '';
                slot.style.borderColor = '';
                return;
            }
            const color = SESSION_TYPE_COLORS[idx % SESSION_TYPE_COLORS.length];
            slot.classList.add('with-type-color');
            slot.style.backgroundColor = color.bg;
            slot.style.borderColor = color.border;
        });
    }

    function updateAllSessionSlotColors() {
        getAllPatientTableRows().forEach(updateSessionSlotColorsInRow);
    }

    function collectState() {
        const rows = getAllPatientTableRows().map(rowDataFromTr);
        return {
            period: periodInput.value,
            baseSalary: baseSalaryInput?.value,
            clientRate: clientRateInput?.value,
            therapistRole: activeRole(),
            sessionTypes: collectSessionTypes(),
            therapistPaymentDetails: collectTherapistPaymentDetails(),
            meetingBonus: meetingBonusInput?.checked,
            group: collectGroupState(),
            extras: collectExtrasState(),
            rows
        };
    }

    function applyState(s) {
        if (!s || typeof s !== 'object') return;
        if (s.period != null) periodInput.value = s.period;
        if (s.baseSalary != null) baseSalaryInput.value = String(s.baseSalary);
        if (s.clientRate != null) clientRateInput.value = String(s.clientRate);
        therapistRoleInput.value = s.therapistRole || ROLE_SPEECH;
        applySessionTypes(s.sessionTypes);
        roleSessionTypesCard.classList.toggle('is-visible', roleUsesSessionTypes());
        applyTherapistPaymentDetails(s.therapistPaymentDetails);
        meetingBonusInput.checked = !!s.meetingBonus;
        applyGroupState(s.group);
        applyExtrasState(s.extras);
        clearPatientTableRows();
        const rows = Array.isArray(s.rows) && s.rows.length ? s.rows : [{}];
        rows.forEach(r => addRow(r));
        calculate();
    }

    function defaultPeriodValue() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    function extractTemplateNames(rows) {
        const names = [];
        const seen = new Set();
        (Array.isArray(rows) ? rows : []).forEach((row) => {
            const name = (row && row.name ? String(row.name) : '').trim();
            if (!name) return;
            if (seen.has(name)) return;
            seen.add(name);
            names.push(name);
        });
        return names;
    }

    function rowsFromTemplate(names) {
        const list = (Array.isArray(names) ? names : [])
            .map((n) => (n == null ? '' : String(n)).trim())
            .filter(Boolean);
        if (!list.length) return [{}];
        return list.map((name) => ({
            name,
            dates: [''],
            sessions: 0,
            cancelPaidEntries: [],
            cancelUnpaidDates: []
        }));
    }

    function emptyExtrasState() {
        return {
            parentMeetings: [],
            languageEvaluations: [],
            diagnostics: [],
            groupAssessments: [],
            parentMeetingsEnabled: false,
            languageEvaluationsEnabled: false,
            diagnosticsEnabled: false,
            groupAssessmentsEnabled: false,
            courseExpensesEnabled: false,
            extraRoleEnabled: false,
            extraRoles: [],
            additionalExpensesEnabled: false,
            additionalExpenses: [],
            centerOwesTherapistEnabled: false,
            centerOwesTherapist: [],
            courseExpenses: []
        };
    }

    function defaultUiState() {
        return {
            extraCalcsCollapsed: false,
            componentPanels: {}
        };
    }

    function collectUiState() {
        const componentPanels = {};
        document.querySelectorAll('.summary-component-toggle').forEach((btn) => {
            const panelId = btn.getAttribute('data-panel');
            const panel = panelId ? document.getElementById(panelId) : null;
            if (panelId && panel) componentPanels[panelId] = panel.classList.contains('is-collapsed');
        });
        return {
            extraCalcsCollapsed: extraCalcsPanel?.classList.contains('is-collapsed') ?? false,
            componentPanels
        };
    }

    function applyUiState(ui) {
        const u = ui && typeof ui === 'object' ? ui : defaultUiState();
        if (extraCalcsPanel && extraCalcsToggleBtn) {
            const collapsed = !!u.extraCalcsCollapsed;
            extraCalcsPanel.classList.toggle('is-collapsed', collapsed);
            extraCalcsToggleBtn.setAttribute('aria-expanded', String(!collapsed));
            const chev = extraCalcsToggleBtn.querySelector('.summary-extra-chevron');
            if (chev) chev.textContent = collapsed ? '▸' : '▾';
        }
        const panels = u.componentPanels && typeof u.componentPanels === 'object' ? u.componentPanels : {};
        document.querySelectorAll('.summary-component-toggle').forEach((btn) => {
            const panelId = btn.getAttribute('data-panel');
            const panel = panelId ? document.getElementById(panelId) : null;
            if (!panel) return;
            const collapsed = Object.prototype.hasOwnProperty.call(panels, panelId)
                ? !!panels[panelId]
                : panel.classList.contains('is-collapsed');
            panel.classList.toggle('is-collapsed', collapsed);
            btn.setAttribute('aria-expanded', String(!collapsed));
            const chev = btn.querySelector('.summary-extra-chevron');
            if (chev) chev.textContent = collapsed ? '▸' : '▾';
        });
    }

    function normalizeStoreShape(parsed) {
        const base = parsed && typeof parsed === 'object' ? parsed : {};
        return {
            version: 2,
            reportsByPeriod: base.reportsByPeriod && typeof base.reportsByPeriod === 'object' ? base.reportsByPeriod : {},
            patientTemplate: Array.isArray(base.patientTemplate) ? base.patientTemplate : [],
            activePeriod: typeof base.activePeriod === 'string' ? base.activePeriod : '',
            ui: base.ui && typeof base.ui === 'object' ? base.ui : defaultUiState()
        };
    }

    function buildStoreSnapshot() {
        const state = collectState();
        const period = state.period || defaultPeriodValue();
        state.period = period;
        const store = normalizeStoreShape(readStore());
        store.reportsByPeriod[period] = state;
        store.patientTemplate = extractTemplateNames(state.rows);
        store.activePeriod = period;
        store.ui = collectUiState();
        return store;
    }

    function readStore() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return normalizeStoreShape(null);
        const parsed = JSON.parse(raw);

        // Migration from old single-report format.
        if (parsed && Array.isArray(parsed.rows)) {
            const period = parsed.period || defaultPeriodValue();
            return normalizeStoreShape({
                reportsByPeriod: { [period]: parsed },
                patientTemplate: extractTemplateNames(parsed.rows),
                activePeriod: period
            });
        }

        if (parsed && typeof parsed === 'object') {
            return normalizeStoreShape(parsed);
        }
        return normalizeStoreShape(null);
    }

    function writeStore(store) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    }

    function stampFilename() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
    }

    function formatPeriodLabel(periodValue) {
        if (!periodValue) return '';
        const parts = String(periodValue).split('-');
        if (parts.length >= 2) return `${parts[1]}/${parts[0]}`;
        return periodValue;
    }

    function getSummary() {
        const rate = effectiveRate();
        const clientRate = parseFloat(clientRateInput?.value) || 0;
        const role = activeRole();
        const stMap = sessionTypeMapFrom(collectSessionTypes());
        let totalBillable = 0;
        let totalSessions = 0;
        let totalUnpaid = 0;
        let totalCancellationPaidAmount = 0;
        let grossIndividualTotal = 0;
        let individualTotal = 0;
        let paidToCenterTotal = 0;
        let paidToTherapistTotal = 0;
        let paidToCenterApplied = 0;
        let paidToTherapistApplied = 0;
        let paidToCenterTreatmentCount = 0;
        let paidToTherapistTreatmentCount = 0;
        getAllPatientTableRows().forEach(tr => {
            const rd = rowDataFromTr(tr);
            const sessionsPart = sessionBreakdownFromRow(rd, {
                role,
                clientRate,
                therapistRate: rate,
                sessionTypeMap: stMap
            });
            const paidCancelSlots = Array.from(tr.querySelectorAll('.cancel-paid-list .cancel-slot'));
            const paidCancelEntries = paidCancelSlots
                .map((slot) => {
                    const mode = slot.querySelector('.cancel-paid-mode')?.value === 'custom' ? 'custom' : 'full';
                    const date = slot.querySelector('.cancel-paid-date')?.value.trim() || '';
                    const amount = mode === 'custom'
                        ? Math.max(0, parseFloat(slot.querySelector('.cancel-amount')?.value) || 0)
                        : clientRate;
                    return { date, amount };
                })
                .filter((x) => x.date);
            const unpaidCancelDates = Array.from(tr.querySelectorAll('.cancel-unpaid-list .cancel-unpaid-date'))
                .map((i) => i.value.trim())
                .filter(Boolean);
            const cancelPaidCount = paidCancelEntries.length;
            const cancelPaidAmount = paidCancelEntries.reduce((sum, x) => sum + x.amount, 0);
            const cancelUnpaid = unpaidCancelDates.length;
            const paidToCenter = !!tr.querySelector('.paid-center')?.checked;
            const paidToTherapist = !!tr.querySelector('.paid-therapist')?.checked;
            const billable = sessionsPart.meetings + cancelPaidCount;
            const therapistShare = sessionsPart.therapist + (cancelPaidCount * rate);
            const grossRow = sessionsPart.gross + cancelPaidAmount;
            const centerShare = Math.max(0, grossRow - therapistShare);
            totalSessions += sessionsPart.meetings;
            totalBillable += billable;
            totalUnpaid += cancelUnpaid;
            totalCancellationPaidAmount += cancelPaidAmount;
            individualTotal += therapistShare;
            grossIndividualTotal += grossRow;
            if (paidToCenter) {
                paidToCenterTotal += grossRow;
                paidToCenterApplied += centerShare;
                paidToCenterTreatmentCount += billable;
            }
            if (paidToTherapist) {
                paidToTherapistTotal += grossRow;
                paidToTherapistApplied += therapistShare;
                paidToTherapistTreatmentCount += billable;
            }
        });
        const g = collectGroupState();
        const extras = collectExtrasState();
        const groupTotal = g.enabled
            ? g.groups.reduce((sum, gr) => sum + gr.rate * gr.sessions, 0)
            : 0;
        const parentMeetingsTotal = extras.parentMeetingsEnabled
            ? extras.parentMeetings
                .filter((x) => x.child || x.date)
                .reduce((sum, x) => sum + parentMeetingTherapistAmount(x, rate), 0)
            : 0;
        const languageEvalTherapistTotal = extras.languageEvaluationsEnabled
            ? extras.languageEvaluations.reduce((sum, x) => sum + toAmount(x.therapist, 305), 0)
            : 0;
        const languageEvalCenterTotal = extras.languageEvaluationsEnabled
            ? extras.languageEvaluations.reduce((sum, x) => sum + Math.max(0, toAmount(x.total, 500) - toAmount(x.therapist, 305)), 0)
            : 0;
        const diagnosticsTotal = extras.diagnosticsEnabled
            ? extras.diagnostics.reduce((sum, x) => sum + toAmount(x.therapist, 900), 0)
            : 0;
        const groupAssessmentsTotal = extras.groupAssessmentsEnabled
            ? extras.groupAssessments.reduce((sum, x) => sum + toAmount(x.price, 150), 0)
            : 0;
        const extraRolesTotal = extras.extraRoleEnabled
            ? extras.extraRoles.reduce((sum, x) => sum + toAmount(x.amount, 0), 0)
            : 0;
        const additionalExpensesTotal = extras.additionalExpensesEnabled
            ? extras.additionalExpenses.reduce((sum, x) => sum + toAmount(x.amount, 0), 0)
            : 0;
        const centerOwesTherapistTotal = extras.centerOwesTherapistEnabled
            ? extras.centerOwesTherapist.reduce((sum, x) => sum + toAmount(x.amount, 0), 0)
            : 0;
        const courseExpensesGrossTotal = extras.courseExpensesEnabled
            ? extras.courseExpenses.reduce((sum, x) => sum + toAmount(x.cost, 0), 0)
            : 0;
        const courseExpensesTotal = courseExpensesGrossTotal * 0.75;
        // חובות "מטפלת חייבת למרכז" צריכים להשפיע רק על צד המרכז (יתרה למרכז),
        // ולא להפחית את סה״כ למטפלת — אחרת הם נספרים פעמיים בנטו.
        const centerTotal = Math.max(0, grossIndividualTotal - individualTotal)
            + languageEvalCenterTotal
            + courseExpensesTotal
            + additionalExpensesTotal;
        const grandTotal = individualTotal
            + groupTotal
            + parentMeetingsTotal
            + languageEvalTherapistTotal
            + diagnosticsTotal
            + groupAssessmentsTotal
            + extraRolesTotal
            + centerOwesTherapistTotal;
        const remainingToCenter = Math.max(0, centerTotal - paidToCenterApplied);
        const remainingToTherapist = Math.max(0, grandTotal - paidToTherapistApplied);
        const netSettlement = remainingToTherapist - remainingToCenter;
        return {
            rate,
            clientRate,
            totalBillable,
            totalUnpaid,
            individualTotal,
            groupTotal,
            parentMeetingsTotal,
            languageEvalTherapistTotal,
            languageEvalCenterTotal,
            diagnosticsTotal,
            groupAssessmentsTotal,
            extraRolesTotal,
            additionalExpensesTotal,
            centerOwesTherapistTotal,
            courseExpensesGrossTotal,
            courseExpensesTotal,
            grossIndividualTotal,
            centerTotal,
            grandTotal,
            paidToCenterTotal,
            paidToTherapistTotal,
            paidToCenterApplied,
            paidToTherapistApplied,
            paidToCenterTreatmentCount,
            paidToTherapistTreatmentCount,
            remainingToCenter,
            remainingToTherapist,
            netSettlement,
            group: g,
            extras
        };
    }

    function downloadBlob(filename, blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    function escapeHtml(s) {
        if (s == null || s === '') return '';
        const str = String(s);
        if (str === 'undefined' || str === 'null') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function renderSummaryItemList(container, items, labelFn, amountFn, ui) {
        if (!container) return;
        const block = ui && ui.block;
        const panel = ui && ui.panel;
        const toggle = ui && ui.toggle;
        const rows = (Array.isArray(items) ? items : [])
            .map((item) => ({
                label: String(labelFn(item) || '').trim() || 'ללא שם',
                amount: Math.max(0, toAmount(amountFn(item), 0))
            }))
            .filter((row) => row.label !== 'ללא שם' || row.amount > 0);
        if (!rows.length) {
            container.innerHTML = '';
            if (block) block.classList.add('is-hidden');
            if (panel) panel.classList.add('is-collapsed');
            if (toggle) {
                toggle.setAttribute('aria-expanded', 'false');
                const chev = toggle.querySelector('.summary-extra-chevron');
                if (chev) chev.textContent = '▸';
            }
            return;
        }
        if (block) block.classList.remove('is-hidden');
        container.innerHTML = rows
            .map((row) =>
                `<li><span class="summary-item-name">${escapeHtml(row.label)}</span>` +
                `<span class="summary-item-amount">${row.amount.toLocaleString('he-IL')} ₪</span></li>`
            )
            .join('');
    }

    function wireSummaryComponentToggles() {
        document.querySelectorAll('.summary-component-toggle').forEach((btn) => {
            if (btn.dataset.wired === '1') return;
            btn.dataset.wired = '1';
            btn.addEventListener('click', () => {
                const panelId = btn.getAttribute('data-panel');
                const panel = panelId ? document.getElementById(panelId) : null;
                if (!panel) return;
                const collapsed = panel.classList.toggle('is-collapsed');
                btn.setAttribute('aria-expanded', String(!collapsed));
                const chev = btn.querySelector('.summary-extra-chevron');
                if (chev) chev.textContent = collapsed ? '▸' : '▾';
                schedulePersist();
            });
        });
    }

    function exportExcel() {
        calculate();
        const s = collectState();
        const sum = getSummary();
        const period = formatPeriodLabel(s.period);
        const aoa = [];
        aoa.push(['דוח סיכום טיפולים']);
        aoa.push(['חודש / תקופה', period]);
        aoa.push(['שכר בסיס למטפלת', s.baseSalary, 'מחיר לטיפול פרטני', s.clientRate, 'ישיבה חודשית (+5)', s.meetingBonus ? 'כן' : 'לא']);
        aoa.push([]);
        aoa.push(['#', 'שם מטופל', 'תאריכי מפגשים', 'מפגשים', 'ביטול בתשלום (תאריכים)', 'ביטול ללא תשלום (תאריכים)', 'שולם', 'יעד תשלום', 'למרכז', 'למטפלת', 'סה״כ שורה (₪)', 'תעריף למפגש (₪)']);
        getAllPatientTableRows().forEach((tr, i) => {
            const rd = rowDataFromTr(tr);
            const rowTotal = rowGrossFromRd(rd, sum.clientRate, activeRole(), sessionTypeMapFrom(collectSessionTypes()));
            const dest = paymentDestinationLabel(!!rd.paidReceived, !!rd.paidToCenter, !!rd.paidToTherapist);
            aoa.push([
                i + 1,
                rd.name,
                (rd.dates || []).filter(Boolean).join(', '),
                rd.sessions,
                (rd.cancelPaidEntries || [])
                    .filter((x) => x && x.date)
                    .map((x) => `${x.date}${x.mode === 'custom' ? ` (${Math.max(0, parseFloat(x.amount) || 0)}₪)` : ' (מלא)'}`)
                    .join(', '),
                (rd.cancelUnpaidDates || []).filter(Boolean).join(', '),
                rd.paidReceived ? 'כן' : '',
                dest,
                rd.paidToCenter ? 'כן' : '',
                rd.paidToTherapist ? 'כן' : '',
                rowTotal || '',
                sum.clientRate
            ]);
        });
        aoa.push([]);
        aoa.push(['מי משלם לאן — לפי סימון יעד']);
        aoa.push(['#', 'שם', 'סה״כ שורה (₪)', 'שולם', 'יעד', 'נספר בקיזוז למרכז (₪)', 'נספר בקיזוז למטפלת (₪)']);
        getAllPatientTableRows().forEach((tr, i) => {
            const rd = rowDataFromTr(tr);
            const rowTotal = rowGrossFromRd(rd, sum.clientRate);
            const pr = !!rd.paidReceived;
            const toC = !!rd.paidToCenter;
            const toT = !!rd.paidToTherapist;
            aoa.push([
                i + 1,
                rd.name || '',
                rowTotal || '',
                pr ? 'כן' : '',
                paymentDestinationLabel(pr, toC, toT),
                pr && toC ? rowTotal : '',
                pr && toT ? rowTotal : ''
            ]);
        });
        aoa.push([]);
        aoa.push(['סה״כ מפגשים לחישוב', sum.totalBillable]);
        aoa.push(['סה״כ ביטולים ללא תשלום', sum.totalUnpaid]);
        aoa.push(['סה״כ פרטני (₪)', sum.individualTotal]);
        aoa.push(['סה״כ הכנסה פרטנית (₪)', sum.grossIndividualTotal]);
        aoa.push(['חלק המרכז (₪)', sum.centerTotal]);
        aoa.push(['למרכז (₪)', sum.paidToCenterTotal, 'לפי סימון יעד (₪)', sum.paidToCenterApplied]);
        aoa.push(['מפגשי טיפול לתשלום למרכז (סימון יעד)', sum.paidToCenterTreatmentCount]);
        aoa.push(['למטפלת (₪)', sum.paidToTherapistTotal, 'לפי סימון יעד (₪)', sum.paidToTherapistApplied]);
        aoa.push(['מפגשי טיפול לתשלום למטפלת (סימון יעד)', sum.paidToTherapistTreatmentCount]);
        aoa.push(['יתרה למרכז (כמה אני חייבת למרכז) (₪)', sum.remainingToCenter]);
        aoa.push(['יתרה למטפלת (כמה המרכז חייב לי) (₪)', sum.remainingToTherapist]);
        aoa.push(['נטו אחרי קיזוז', sum.netSettlement > 0 ? `המרכז חייב למטפלת ${sum.netSettlement} ₪` : (sum.netSettlement < 0 ? `המטפלת חייבת למרכז ${Math.abs(sum.netSettlement)} ₪` : 'אין יתרה')]);
        aoa.push(['פגישות הורים למטפלת (₪)', sum.parentMeetingsTotal]);
        aoa.push(['הערכות שפה למטפלת (₪)', sum.languageEvalTherapistTotal]);
        aoa.push(['הערכות שפה למרכז (₪)', sum.languageEvalCenterTotal]);
        aoa.push(['אבחונים למטפלת (₪)', sum.diagnosticsTotal]);
        aoa.push(['מפגשי הערכה לילדי קבוצה (₪)', sum.groupAssessmentsTotal]);
        aoa.push(['תפקידים נוספים למטפלת (₪)', sum.extraRolesTotal]);
        aoa.push(['חייבת למרכז (₪)', sum.additionalExpensesTotal]);
        aoa.push(['המרכז חייב למטפלת (₪)', sum.centerOwesTherapistTotal]);
        aoa.push(['הוצאות קורסים - מחיר מלא (₪)', sum.courseExpensesGrossTotal]);
        aoa.push(['הוצאות קורסים - מחושב 75% (₪)', sum.courseExpensesTotal]);
        aoa.push(['מדריכת קבוצה?', sum.group.enabled ? 'כן' : 'לא']);
        aoa.push(['נוסחת קבוצה', 'תעריף × מפגשים (ללא כפל ילדים) — לכל קבוצה בנפרד']);
        if (sum.group.enabled && Array.isArray(sum.group.groups)) {
            sum.group.groups.forEach((gr, i) => {
                aoa.push([]);
                aoa.push([`קבוצה ${i + 1}`]);
                aoa.push(['תעריף', gr.rate, 'ילדים (לתיעוד)', gr.children, 'מפגשים', gr.sessions]);
                aoa.push(['תאריכים', (gr.dates || []).filter(Boolean).join(', ')]);
                aoa.push(['סכום קבוצה (₪)', gr.rate * gr.sessions]);
            });
        }
        aoa.push(['סה״כ כל הקבוצות (₪)', sum.groupTotal]);
        aoa.push(['סה״כ למטפלת (₪)', sum.grandTotal]);

        if (sum.extras.parentMeetingsEnabled && sum.extras.parentMeetings.length) {
            aoa.push([]);
            aoa.push(['פגישות הורים']);
            aoa.push(['שם ילד', 'תאריך', 'משך', 'שכר למטפלת']);
            sum.extras.parentMeetings.forEach((x) => {
                if (!x.child && !x.date) return;
                aoa.push([
                    x.child,
                    x.date,
                    parentMeetingDurationLabel(x.duration),
                    parentMeetingTherapistAmount(x, sum.rate)
                ]);
            });
        }
        if (sum.extras.languageEvaluationsEnabled && sum.extras.languageEvaluations.length) {
            aoa.push([]);
            aoa.push(['הערכות שפה']);
            aoa.push(['שם ילד', 'תאריך', 'מחיר הערכה', 'למטפלת', 'למרכז']);
            sum.extras.languageEvaluations.forEach((x) => {
                aoa.push([x.child, x.date, x.total, x.therapist, Math.max(0, x.total - x.therapist)]);
            });
        }
        if (sum.extras.diagnosticsEnabled && sum.extras.diagnostics.length) {
            aoa.push([]);
            aoa.push(['אבחונים']);
            aoa.push(['שם ילד', 'תאריך', 'למטפלת']);
            sum.extras.diagnostics.forEach((x) => {
                aoa.push([x.child, x.date, x.therapist]);
            });
        }
        if (sum.extras.groupAssessmentsEnabled && sum.extras.groupAssessments.length) {
            aoa.push([]);
            aoa.push(['מפגשי הערכה לילדי קבוצה']);
            aoa.push(['שם ילד', 'תאריך', 'מחיר']);
            sum.extras.groupAssessments.forEach((x) => {
                aoa.push([x.child, x.date, x.price]);
            });
        }
        if (sum.extras.courseExpensesEnabled && sum.extras.courseExpenses.length) {
            aoa.push([]);
            aoa.push(['הוצאות קורסים']);
            aoa.push(['שם קורס', 'מחיר מלא', 'מחושב 75%']);
            sum.extras.courseExpenses.forEach((x) => {
                const full = toAmount(x.cost, 0);
                aoa.push([x.course, full, full * 0.75]);
            });
        }
        if (sum.extras.extraRoleEnabled && sum.extras.extraRoles.length) {
            aoa.push([]);
            aoa.push(['תפקידים נוספים']);
            aoa.push(['שם תפקיד', 'סכום']);
            sum.extras.extraRoles.forEach((x) => {
                aoa.push([x.role, x.amount]);
            });
        }
        if (sum.extras.additionalExpensesEnabled && sum.extras.additionalExpenses.length) {
            aoa.push([]);
            aoa.push(['חייבת למרכז']);
            aoa.push(['תיאור', 'סכום']);
            sum.extras.additionalExpenses.forEach((x) => {
                aoa.push([x.name, x.amount]);
            });
        }
        if (sum.extras.centerOwesTherapistEnabled && sum.extras.centerOwesTherapist.length) {
            aoa.push([]);
            aoa.push(['המרכז חייב למטפלת']);
            aoa.push(['תיאור', 'סכום']);
            sum.extras.centerOwesTherapist.forEach((x) => {
                aoa.push([x.name, x.amount]);
            });
        }

        if (typeof XLSX === 'undefined') {
            alert('טעינת Excel נכשלה (בדקי חיבור לאינטרנט ורענני את הדף).');
            return;
        }
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'דוח');
        XLSX.writeFile(wb, `treatment-report-${stampFilename()}.xlsx`);
    }

    function exportWord() {
        calculate();
        const s = collectState();
        const sum = getSummary();
        const period = formatPeriodLabel(s.period);
        let tableRows =
            '<tr><th>#</th><th>שם מטופל</th><th>תאריכי מפגשים</th><th>מפגשים</th><th>ביטול בתשלום</th><th>ביטול ללא תשלום</th><th>שולם</th><th>למרכז</th><th>למטפלת</th><th>סה״כ שורה</th></tr>';
        let routingLines = '';
        getAllPatientTableRows().forEach((tr, i) => {
            const rd = rowDataFromTr(tr);
            const rowTotal = rowGrossFromRd(rd, sum.clientRate, activeRole(), sessionTypeMapFrom(collectSessionTypes()));
            const datesStr = (rd.dates || []).filter(Boolean).join(', ');
            const cancelPaidStr = (rd.cancelPaidEntries || [])
                .filter((x) => x && x.date)
                .map((x) => `${x.date}${x.mode === 'custom' ? ` (${Math.max(0, parseFloat(x.amount) || 0)}₪)` : ' (מלא)'}`)
                .join(', ');
            const cancelUnpaidStr = (rd.cancelUnpaidDates || []).filter(Boolean).join(', ');
            const dest = paymentDestinationLabel(!!rd.paidReceived, !!rd.paidToCenter, !!rd.paidToTherapist);
            tableRows += `<tr><td>${i + 1}</td><td>${escapeHtml(rd.name)}</td><td>${escapeHtml(datesStr)}</td><td>${rd.sessions}</td><td>${escapeHtml(cancelPaidStr)}</td><td>${escapeHtml(cancelUnpaidStr)}</td><td>${rd.paidReceived ? 'כן' : ''}</td><td>${rd.paidToCenter ? 'כן' : ''}</td><td>${rd.paidToTherapist ? 'כן' : ''}</td><td>${rowTotal ? escapeHtml(String(rowTotal)) + ' ₪' : ''}</td></tr>`;
            if (rd.paidReceived) {
                const kc = rd.paidToCenter ? `${rowTotal} ₪` : '—';
                const kt = rd.paidToTherapist ? `${rowTotal} ₪` : '—';
                routingLines += `<li><strong>${escapeHtml(rd.name || 'ללא שם')}</strong> — יעד: ${escapeHtml(dest)} — קיזוז למרכז: ${escapeHtml(kc)} — קיזוז למטפלת: ${escapeHtml(kt)}</li>`;
            }
        });
        const routingBlock = routingLines
            ? `<h2 style="font-size:14pt;margin-top:18pt">מי משלם לאן (שורות מסומנות «שולם»)</h2><ul style="margin:6pt 0 0;padding-inline-start:20px">${routingLines}</ul>`
            : '';
        const html =
            '<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>דוח סיכום טיפולים</title></head><body dir="rtl" style="font-family:Arial,sans-serif;font-size:12pt">' +
            '<h1 style="font-size:16pt">דוח סיכום טיפולים</h1>' +
            `<p>חודש / תקופה: ${escapeHtml(period)} &nbsp;|&nbsp; שכר בסיס: ${escapeHtml(s.baseSalary)} &nbsp;|&nbsp; מחיר לטיפול פרטני: ${escapeHtml(s.clientRate)} &nbsp;|&nbsp; ישיבה חודשית: ${s.meetingBonus ? 'כן' : 'לא'}</p>` +
            `<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;width:100%">${tableRows}</table>` +
            routingBlock +
            `<p><strong>תעריף למפגש:</strong> ${sum.rate} ₪<br>` +
            `<strong>סה״כ מפגשים לחישוב:</strong> ${sum.totalBillable}<br>` +
            `<strong>סה״כ ביטולים ללא תשלום:</strong> ${sum.totalUnpaid}<br>` +
            `<strong>סה״כ פרטני:</strong> ${sum.individualTotal} ₪<br>` +
            `<strong>סה״כ הכנסה פרטנית:</strong> ${sum.grossIndividualTotal} ₪<br>` +
            `<strong>חלק המרכז (פרטני):</strong> ${sum.centerTotal} ₪<br>` +
            `<strong>למרכז:</strong> ${sum.paidToCenterTotal} ₪ (לפי סימון יעד: ${sum.paidToCenterApplied} ₪) &nbsp;|&nbsp; <strong>מפגשי טיפול לתשלום למרכז:</strong> ${sum.paidToCenterTreatmentCount}<br>` +
            `<strong>למטפלת:</strong> ${sum.paidToTherapistTotal} ₪ (לפי סימון יעד: ${sum.paidToTherapistApplied} ₪) &nbsp;|&nbsp; <strong>מפגשי טיפול לתשלום למטפלת:</strong> ${sum.paidToTherapistTreatmentCount}<br>` +
            `<strong>יתרה למרכז (כמה אני חייבת למרכז):</strong> ${sum.remainingToCenter} ₪ &nbsp;|&nbsp; <strong>יתרה למטפלת (כמה המרכז חייב לי):</strong> ${sum.remainingToTherapist} ₪<br>` +
            `<strong>נטו אחרי קיזוז:</strong> ${sum.netSettlement > 0 ? `המרכז חייב למטפלת ${sum.netSettlement} ₪` : (sum.netSettlement < 0 ? `המטפלת חייבת למרכז ${Math.abs(sum.netSettlement)} ₪` : 'אין יתרה')}<br>` +
            `<strong>פגישות הורים למטפלת:</strong> ${sum.parentMeetingsTotal} ₪<br>` +
            `<strong>הערכות שפה למטפלת:</strong> ${sum.languageEvalTherapistTotal} ₪ &nbsp;|&nbsp; <strong>למרכז:</strong> ${sum.languageEvalCenterTotal} ₪<br>` +
            `<strong>אבחונים למטפלת:</strong> ${sum.diagnosticsTotal} ₪<br>` +
            `<strong>מפגשי הערכה לילדי קבוצה:</strong> ${sum.groupAssessmentsTotal} ₪<br>` +
            `<strong>תפקידים נוספים למטפלת:</strong> ${sum.extraRolesTotal} ₪<br>` +
            `<strong>חייבת למרכז (במלוא הסכום):</strong> ${sum.additionalExpensesTotal} ₪<br>` +
            `<strong>המרכז חייב למטפלת (במלוא הסכום):</strong> ${sum.centerOwesTherapistTotal} ₪<br>` +
            `<strong>הוצאות קורסים (מחיר מלא):</strong> ${sum.courseExpensesGrossTotal} ₪ &nbsp;|&nbsp; <strong>מחושב 75%:</strong> ${sum.courseExpensesTotal} ₪<br>` +
            `<strong>קבוצה:</strong> ${sum.group.enabled ? 'כן' : 'לא'}<br>` +
            `${sum.group.enabled && Array.isArray(sum.group.groups)
                ? sum.group.groups.map((gr, i) =>
                    `<strong>קבוצה ${i + 1}:</strong> תעריף ${gr.rate} ₪ &nbsp;|&nbsp; ילדים ${gr.children} &nbsp;|&nbsp; מפגשים ${gr.sessions}<br>` +
                    `<strong>תאריכים:</strong> ${escapeHtml((gr.dates || []).filter(Boolean).join(', '))} &nbsp;|&nbsp; <strong>סכום:</strong> ${gr.rate * gr.sessions} ₪<br>`
                ).join('') +
                `<strong>סה״כ כל הקבוצות:</strong> ${sum.groupTotal} ₪<br>`
                : ''}` +
            `<strong>סה״כ למטפלת:</strong> ${sum.grandTotal} ₪</p>` +
            '</body></html>';
        const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
        downloadBlob(`treatment-report-${stampFilename()}.doc`, blob);
    }
    function exportJsonBackup() {
        calculate();
        const store = buildStoreSnapshot();
        const activePeriod = store.activePeriod || periodInput.value || defaultPeriodValue();
        const activeState = store.reportsByPeriod[activePeriod] || collectState();
        const sum = getSummary();
        const payload = {
            version: 2,
            exportedAt: new Date().toISOString(),
            activePeriod,
            patientTemplate: store.patientTemplate,
            reportsByPeriod: store.reportsByPeriod,
            ui: store.ui,
            summary: sum,
            paymentRoutingSummary: buildPaymentRoutingSummary(activeState, sum)
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        downloadBlob(`treatment-backup-${stampFilename()}.json`, blob);
    }

    function importFromJsonObject(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('קובץ JSON לא תקין');
        }

        if (data.reportsByPeriod && typeof data.reportsByPeriod === 'object') {
            const store = normalizeStoreShape(data);
            if (!Object.keys(store.reportsByPeriod).length) {
                throw new Error('לא נמצאו דוחות חודשיים בקובץ');
            }
            writeStore(store);
            const period = store.activePeriod
                || Object.keys(store.reportsByPeriod).sort().pop()
                || defaultPeriodValue();
            periodInput.value = period;
            currentPeriod = '';
            load();
            return;
        }

        const core = data.rows ? data : null;
        if (!core || !Array.isArray(core.rows)) {
            throw new Error('הקובץ חייב להכיל reportsByPeriod או מערך rows כמו בגיבוי האפליקציה');
        }
        applyState({
            period: core.period,
            baseSalary: core.baseSalary,
            clientRate: core.clientRate,
            therapistRole: core.therapistRole,
            sessionTypes: core.sessionTypes,
            therapistPaymentDetails: core.therapistPaymentDetails,
            meetingBonus: core.meetingBonus,
            group: core.group,
            extras: core.extras,
            rows: core.rows
        });
        if (data.ui) applyUiState(data.ui);
        persist();
    }

    function createNextMonthReportFromTemplate() {
        const current = periodInput.value || defaultPeriodValue();
        const [y, m] = current.split('-').map(Number);
        if (!y || !m) {
            alert('ערך חודש לא תקין');
            return;
        }
        const d = new Date(y, m - 1, 1);
        d.setMonth(d.getMonth() + 1);
        const nextPeriod = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        const store = readStore();
        const sourcePeriod = currentPeriod || current;
        const currentSnapshot = collectState();
        currentSnapshot.period = sourcePeriod;
        store.reportsByPeriod[sourcePeriod] = currentSnapshot;
        store.patientTemplate = extractTemplateNames(currentSnapshot.rows);

        const currentFormNames = extractTemplateNames(currentSnapshot.rows);
        const templateNames = Array.isArray(store.patientTemplate) ? store.patientTemplate : [];
        const names = currentFormNames.length ? currentFormNames : templateNames;
        if (!names.length) {
            alert('לא נמצאו שמות מטופלים לשכפול לחודש החדש.');
            return;
        }

        const baseSalary = baseSalaryInput?.value;
        const clientRate = clientRateInput?.value;
        const meetingBonus = meetingBonusInput?.checked;
        const monthGroups = groupsForNewMonthFromCurrent();
        const existingReport = store.reportsByPeriod[nextPeriod];
        const newReport = existingReport
            ? Object.assign({}, existingReport, {
                period: nextPeriod,
                rows: rowsFromTemplate(names)
            })
            : {
                period: nextPeriod,
                baseSalary,
                clientRate,
                therapistRole: activeRole(),
                sessionTypes: collectSessionTypes(),
                therapistPaymentDetails: collectTherapistPaymentDetails(),
                meetingBonus,
                group: monthGroups,
                extras: emptyExtrasState(),
                rows: rowsFromTemplate(names)
            };
        store.reportsByPeriod[nextPeriod] = newReport;
        store.patientTemplate = extractTemplateNames(newReport.rows);
        writeStore(store);

        periodInput.value = nextPeriod;
        applyState(newReport);
        currentPeriod = nextPeriod;
        saveHint.textContent = existingReport
            ? `עודכנו ${names.length} שמות בדוח של החודש הבא`
            : `נוצר דוח חדש לחודש הבא עם ${names.length} שמות`;
        saveHint.classList.add('saved');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveHint.textContent = '';
            saveHint.classList.remove('saved');
        }, 2500);
    }

    function extractRowsFromAnyJsonPayload(data) {
        if (data && Array.isArray(data.rows)) return data.rows;
        if (data && data.reportsByPeriod && typeof data.reportsByPeriod === 'object') {
            const keys = Object.keys(data.reportsByPeriod).sort();
            for (let i = keys.length - 1; i >= 0; i -= 1) {
                const rep = data.reportsByPeriod[keys[i]];
                if (rep && Array.isArray(rep.rows)) return rep.rows;
            }
        }
        return [];
    }

    function importPatientNamesFromJsonObject(data) {
        const rows = extractRowsFromAnyJsonPayload(data);
        const names = extractTemplateNames(rows);
        if (!names.length) throw new Error('לא נמצאו שמות מטופלים בקובץ');

        const keepCurrent = confirm('ליצור את הדוח לחודש הנוכחי עם השמות שיובאו? (אישור = כן, ביטול = רק שמירת תבנית)');
        const store = readStore();
        store.patientTemplate = names;

        if (keepCurrent) {
            const currentState = collectState();
            const rebuilt = {
                period: periodInput.value || defaultPeriodValue(),
                baseSalary: currentState.baseSalary,
                clientRate: currentState.clientRate,
                therapistRole: currentState.therapistRole,
                sessionTypes: currentState.sessionTypes,
                therapistPaymentDetails: currentState.therapistPaymentDetails,
                meetingBonus: currentState.meetingBonus,
                group: { enabled: false, groups: [defaultGroupEntry()] },
                extras: emptyExtrasState(),
                rows: rowsFromTemplate(names)
            };
            store.reportsByPeriod[rebuilt.period] = rebuilt;
            writeStore(store);
            applyState(rebuilt);
            currentPeriod = rebuilt.period;
        } else {
            writeStore(store);
        }
    }

    function persist() {
        clearTimeout(persistDebounceTimer);
        persistDebounceTimer = null;
        try {
            const store = buildStoreSnapshot();
            const period = store.activePeriod || defaultPeriodValue();
            writeStore(store);
            currentPeriod = period;
            saveHint.textContent = 'נשמר בדפדפן';
            saveHint.classList.add('saved');
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                saveHint.textContent = '';
                saveHint.classList.remove('saved');
            }, 2000);
        } catch (e) {
            saveHint.textContent = 'שמירה נכשלה';
        }
    }

    function flushPersist() {
        if (persistDebounceTimer === null) return;
        clearTimeout(persistDebounceTimer);
        persistDebounceTimer = null;
        persist();
    }

    function schedulePersist() {
        calculate();
        clearTimeout(persistDebounceTimer);
        persistDebounceTimer = setTimeout(() => {
            persistDebounceTimer = null;
            persist();
        }, PERSIST_DEBOUNCE_MS);
    }

    function normalizeDatesArray(dates, fallbackSessions) {
        let arr = Array.isArray(dates)
            ? dates.map((x) => {
                if (x == null) return '';
                const t = String(x).trim();
                return t === 'undefined' || t === 'null' ? '' : t;
            })
            : [];
        const filled = arr.filter(Boolean);
        if (filled.length) return filled;

        while (arr.length > 1 && arr[arr.length - 1] === '') arr.pop();
        if (arr.length === 0) arr.push('');

        const sessionNeed = Math.ceil(Number(fallbackSessions) || 0);
        const target = Math.min(
            MAX_DATE_SLOTS,
            Math.max(INITIAL_DATE_SLOTS, arr.length, sessionNeed)
        );
        while (arr.length < target) arr.push('');
        return arr;
    }

    function readSessionEntriesFromRow(tr) {
        const list = tr.querySelector('.date-row-list');
        return sessionDateSlotsInList(list).map((slot) => ({
            date: slot.querySelector('.sess-date, .sess-date-legacy')?.value.trim() || '',
            sessionTypeId: slot.querySelector('.sess-type-select')?.value || ''
        }));
    }

    function normalizeSessionEntries(inputEntries, dates, fallbackSessions) {
        let entries = Array.isArray(inputEntries)
            ? inputEntries.map((x) => ({
                date: String((x && x.date) == null ? '' : x.date).trim(),
                sessionTypeId: String((x && x.sessionTypeId) == null ? '' : x.sessionTypeId).trim()
            }))
            : [];
        if (entries.length && !entries.some((e) => e.date)) {
            entries = [];
        }
        if (!entries.length) {
            const d = normalizeDatesArray(dates, fallbackSessions);
            entries = d.map((date) => ({ date, sessionTypeId: '' }));
        }
        const filled = entries.filter((e) => e.date);
        if (filled.length) return filled;
        if (!entries.length) entries = [{ date: '', sessionTypeId: '' }];
        return entries;
    }

    function normalizeCancelPaidArray(items, fallbackCount) {
        const fromItems = Array.isArray(items) ? items : [];
        let arr = fromItems.map((x) => {
            if (x && typeof x === 'object') {
                return {
                    date: String(x.date == null ? '' : x.date).trim(),
                    mode: x.mode === 'custom' ? 'custom' : 'full',
                    amount: Math.max(0, parseFloat(x.amount) || 0)
                };
            }
            return { date: '', mode: 'full', amount: 0 };
        });
        if (!arr.length) {
            const cnt = Math.max(0, Math.floor(Number(fallbackCount) || 0));
            for (let i = 0; i < cnt; i += 1) arr.push({ date: '', mode: 'full', amount: 0 });
        }
        return arr;
    }

    function normalizeCancelUnpaidArray(items, fallbackCount) {
        const fromItems = Array.isArray(items) ? items : [];
        let arr = fromItems.map((x) => {
            if (x && typeof x === 'object') return String(x.date == null ? '' : x.date).trim();
            return String(x == null ? '' : x).trim();
        });
        if (!arr.length) {
            const cnt = Math.max(0, Math.floor(Number(fallbackCount) || 0));
            for (let i = 0; i < cnt; i += 1) arr.push('');
        }
        return arr;
    }

    function renderRowNoteState(tr) {
        const cell = tr.querySelector('.col-note');
        if (!cell) return;
        const note = (cell.querySelector('.note-input')?.value || '').trim();
        const addBtn = cell.querySelector('.add-note-btn');
        const display = cell.querySelector('.note-display');
        const editBox = cell.querySelector('.note-edit');
        const textEl = cell.querySelector('.note-text');
        if (editBox) editBox.hidden = true;
        if (note) {
            if (textEl) textEl.textContent = note;
            if (display) display.hidden = false;
            if (addBtn) addBtn.hidden = true;
        } else {
            if (display) display.hidden = true;
            if (addBtn) addBtn.hidden = false;
        }
    }

    function setRowNoteEditing(tr, editing) {
        const cell = tr.querySelector('.col-note');
        if (!cell) return;
        if (!editing) {
            renderRowNoteState(tr);
            return;
        }
        const addBtn = cell.querySelector('.add-note-btn');
        const display = cell.querySelector('.note-display');
        const editBox = cell.querySelector('.note-edit');
        const input = cell.querySelector('.note-input');
        if (addBtn) addBtn.hidden = true;
        if (display) display.hidden = true;
        if (editBox) editBox.hidden = false;
        if (input) {
            input.dataset.prev = input.value;
            input.focus();
        }
    }

    function addRow(data) {
        const tr = document.createElement('tr');
        const defaults = {
            name: '',
            dates: [],
            sessionEntries: [],
            sessions: 0,
            cancelPaidEntries: [],
            cancelUnpaidDates: [],
            cancelPaid: 0,
            cancelUnpaid: 0,
            paidReceived: false,
            paidToCenter: false,
            paidToTherapist: false,
            note: ''
        };
        const d = Object.assign({}, defaults, data && typeof data === 'object' ? data : {});
        if (d.paidToCenter && d.paidToTherapist) d.paidToTherapist = false;
        if (typeof d.paidReceived !== 'boolean') {
            d.paidReceived = !!(d.paidToCenter || d.paidToTherapist);
        }
        const sessionEntries = normalizeSessionEntries(d.sessionEntries, d.dates, d.sessions);
        const paidCancels = normalizeCancelPaidArray(d.cancelPaidEntries, d.cancelPaid);
        const unpaidCancels = normalizeCancelUnpaidArray(d.cancelUnpaidDates, d.cancelUnpaid);
        const n = (x) => Math.max(0, Math.floor(Number(x)) || 0);
        const datesHtml = sessionEntries.map((item) => buildDateSlotHtml(item)).join('');
        const cancelPaidHtml = paidCancels.map((item) => buildCancelPaidSlotHtml(item)).join('');
        const cancelUnpaidHtml = unpaidCancels.map((item) => buildCancelUnpaidSlotHtml(item)).join('');
        tr.innerHTML = `
            <td class="row-idx"></td>
            <td class="col-name"><span class="name-input-shell"><input type="text" placeholder="שם" value="${escapeAttr(d.name)}" autocomplete="name" /></span></td>
            <td class="col-dates">
                <div class="date-row-list">${datesHtml}</div>
                <div style="display:flex; gap:0.35rem; justify-content:flex-end;">
                    <button type="button" class="btn-mini add-date-btn">+ תאריך</button>
                    <button type="button" class="btn-mini-alt bulk-date-btn">בחירה מרוכזת</button>
                </div>
            </td>
            <td class="col-num"><input type="number" class="sessions" min="0" step="1" value="${n(d.sessions)}" title="מתעדכן אוטומטית לפי תאריכים; אפשר לתקן ידנית" /></td>
            <td class="cancel-cell">
                <div class="cancel-row-list cancel-paid-list">${cancelPaidHtml}</div>
                <button type="button" class="btn-mini add-cancel-paid-btn">+ ביטול בתשלום</button>
                <div class="cancel-note">מלא = מחיר טיפול פרטני מלא, אחר = סכום ידני.</div>
            </td>
            <td class="cancel-cell">
                <div class="cancel-row-list cancel-unpaid-list">${cancelUnpaidHtml}</div>
                <button type="button" class="btn-mini add-cancel-unpaid-btn">+ ביטול ללא תשלום</button>
            </td>
            <td><input type="checkbox" class="paid-mark" title="שולם — הדגשת שורה; הקיזוז נספר רק כשזה מסומן יחד עם למרכז/למטפלת" ${d.paidReceived ? 'checked' : ''} /></td>
            <td class="col-pay-center"><input type="checkbox" class="paid-center" title="יעד תשלום — לא ניתן לסמן גם למטפלת" ${d.paidToCenter ? 'checked' : ''} /></td>
            <td class="col-pay-therapist"><input type="checkbox" class="paid-therapist" title="יעד תשלום — לא ניתן לסמן גם למרכז" ${d.paidToTherapist ? 'checked' : ''} /></td>
            <td class="row-total">0</td>
            <td class="col-note">
                <button type="button" class="btn-mini add-note-btn">+ הערה</button>
                <div class="note-display" hidden>
                    <span class="note-text"></span>
                    <button type="button" class="btn-mini-alt edit-note-btn" title="עריכת הערה">ערוך</button>
                </div>
                <div class="note-edit" hidden>
                    <textarea class="note-input" rows="2" placeholder="כתבי הערה...">${escapeHtml(d.note)}</textarea>
                    <div class="note-edit-actions">
                        <button type="button" class="btn-mini note-save-btn">שמור</button>
                        <button type="button" class="btn-mini-alt note-cancel-btn">בטל</button>
                    </div>
                </div>
            </td>
            <td class="no-print-col"><button type="button" class="btn btn-danger row-del">מחק</button></td>
        `;
        tr.querySelector('.row-idx')?.addEventListener('click', () => {
            openPaymentMessageForRow(tr);
        });
        tr.querySelector('.col-name input').addEventListener('input', schedulePersist);
        tr.querySelector('.col-name input').addEventListener('change', schedulePersist);
        tr.querySelector('.add-cancel-paid-btn')?.addEventListener('click', () => {
            const list = tr.querySelector('.cancel-paid-list');
            const wrap = document.createElement('div');
            wrap.innerHTML = buildCancelPaidSlotHtml({ date: '', mode: 'full', amount: 0 });
            list.appendChild(wrap.firstElementChild);
            updatePatientTableLayoutMode();
            schedulePersist();
        });
        tr.querySelector('.add-cancel-unpaid-btn')?.addEventListener('click', () => {
            const list = tr.querySelector('.cancel-unpaid-list');
            const wrap = document.createElement('div');
            wrap.innerHTML = buildCancelUnpaidSlotHtml('');
            list.appendChild(wrap.firstElementChild);
            updatePatientTableLayoutMode();
            schedulePersist();
        });
        tr.querySelectorAll('.cancel-paid-list, .cancel-unpaid-list').forEach((list) => {
            list.addEventListener('input', schedulePersist);
            list.addEventListener('change', (e) => {
                if (e.target.matches('.cancel-paid-mode')) {
                    const slot = e.target.closest('.cancel-slot');
                    const amountInput = slot?.querySelector('.cancel-amount');
                    if (amountInput) {
                        amountInput.disabled = e.target.value !== 'custom';
                        if (e.target.value !== 'custom') amountInput.value = '';
                    }
                }
                schedulePersist();
            });
            list.addEventListener('click', (e) => {
                const btn = e.target.closest('.cancel-remove');
                if (!btn) return;
                const slot = btn.closest('.cancel-slot');
                if (!slot) return;
                slot.remove();
                updatePatientTableLayoutMode();
                schedulePersist();
            });
        });
        const paidMarkEl = tr.querySelector('.paid-mark');
        paidMarkEl?.addEventListener('change', () => {
            updateRowPaidStyle(tr);
            schedulePersist();
        });
        tr.querySelector('.paid-center')?.addEventListener('change', () => {
            enforceExclusivePayTarget(tr, 'center');
            updateRowPaidStyle(tr);
            applyPatientTableFilter();
            schedulePersist();
        });
        tr.querySelector('.paid-therapist')?.addEventListener('change', () => {
            enforceExclusivePayTarget(tr, 'therapist');
            updateRowPaidStyle(tr);
            applyPatientTableFilter();
            schedulePersist();
        });
        wireDateRow(tr);
        const savedSessionCount = n(d.sessions);
        syncSessionsFromDates(tr);
        if (countFilledDates(tr) === 0 && savedSessionCount > 0) {
            tr.querySelector('.sessions').value = String(savedSessionCount);
        }
        tr.querySelector('.row-del').addEventListener('click', () => {
            tr.remove();
            renumber();
            applyPatientTableFilter();
            schedulePersist();
        });
        const noteCell = tr.querySelector('.col-note');
        function bindNoteActionBtn(btn, handler) {
            if (!btn) return;
            let fromMouse = false;
            // mousedown — ה-blur של textarea לא "בולע" את הלחיצה; click נשאר למקלדת בלבד
            btn.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                fromMouse = true;
                handler();
            });
            btn.addEventListener('click', (e) => {
                if (fromMouse) {
                    fromMouse = false;
                    e.preventDefault();
                    return;
                }
                handler();
            });
        }
        bindNoteActionBtn(noteCell?.querySelector('.add-note-btn'), () => setRowNoteEditing(tr, true));
        bindNoteActionBtn(noteCell?.querySelector('.edit-note-btn'), () => setRowNoteEditing(tr, true));
        bindNoteActionBtn(noteCell?.querySelector('.note-save-btn'), () => {
            setRowNoteEditing(tr, false);
            schedulePersist();
        });
        bindNoteActionBtn(noteCell?.querySelector('.note-cancel-btn'), () => {
            const input = noteCell.querySelector('.note-input');
            if (input) input.value = input.dataset.prev || '';
            setRowNoteEditing(tr, false);
        });
        renderRowNoteState(tr);
        assignPatientRowOrder(tr);
        tbody.appendChild(tr);
        applyPatientTableFilter();
        renumber();
        updateRowPaidStyle(tr);
        updateSessionSlotColorsInRow(tr);
        updatePatientTableLayoutMode();
        calculate();
    }

    function escapeAttr(s) {
        const str = s == null || s === '' ? '' : String(s);
        if (str === 'undefined' || str === 'null') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;');
    }

    function renumber() {
        if (!tbody) return;
        tbody.querySelectorAll(':scope > tr').forEach((tr, i) => {
            const c = tr.querySelector('.row-idx');
            if (c) c.textContent = String(i + 1);
        });
    }

    function calculate() {
        updateAllRowPaidStyles();
        updatePatientTableLayoutMode();
        const rate = effectiveRate();
        const clientRate = parseFloat(clientRateInput?.value) || 0;
        summaryEls.effectiveRate.textContent = rate.toLocaleString('he-IL');

        getAllPatientTableRows().forEach(tr => {
            syncSessionsFromDates(tr);
            const rd = rowDataFromTr(tr);
            const sessionsPart = sessionBreakdownFromRow(rd, {
                role: activeRole(),
                clientRate
            });
            const paidCancelEntries = Array.from(tr.querySelectorAll('.cancel-paid-list .cancel-slot'))
                .map((slot) => {
                    const date = slot.querySelector('.cancel-paid-date')?.value.trim() || '';
                    const mode = slot.querySelector('.cancel-paid-mode')?.value === 'custom' ? 'custom' : 'full';
                    const amount = mode === 'custom'
                        ? Math.max(0, parseFloat(slot.querySelector('.cancel-amount')?.value) || 0)
                        : clientRate;
                    return { date, amount };
                })
                .filter((x) => x.date);
            const paidCancelCount = paidCancelEntries.length;
            const rowTotal = sessionsPart.gross + paidCancelEntries.reduce((sum, x) => sum + x.amount, 0);
            tr.querySelector('.row-total').textContent =
                formatRowTotalLabel(rowTotal, sessionsPart.meetings, paidCancelCount);
        });

        const sum = getSummary();
        const els = summaryEls;
        els.totalBillable.textContent = sum.totalBillable.toLocaleString('he-IL');
        els.totalUnpaidCancels.textContent = sum.totalUnpaid.toLocaleString('he-IL');
        els.individualTotal.textContent = sum.individualTotal.toLocaleString('he-IL');
        els.groupTotal.textContent = sum.groupTotal.toLocaleString('he-IL');
        els.parentMeetingsTotal.textContent = sum.parentMeetingsTotal.toLocaleString('he-IL');
        els.languageEvalTherapistTotal.textContent = sum.languageEvalTherapistTotal.toLocaleString('he-IL');
        els.languageEvalCenterTotal.textContent = sum.languageEvalCenterTotal.toLocaleString('he-IL');
        els.diagnosticsTotal.textContent = sum.diagnosticsTotal.toLocaleString('he-IL');
        els.groupAssessmentsTotal.textContent = sum.groupAssessmentsTotal.toLocaleString('he-IL');
        els.extraRolesTotal.textContent = sum.extraRolesTotal.toLocaleString('he-IL');
        renderSummaryItemList(
            els.extraRolesDetail,
            sum.extras.extraRoleEnabled ? sum.extras.extraRoles : [],
            (x) => x.role,
            (x) => x.amount,
            {
                block: document.getElementById('extraRolesDetailBlock'),
                panel: document.getElementById('extraRolesDetailPanel'),
                toggle: document.getElementById('extraRolesDetailToggle')
            }
        );
        els.additionalExpensesTotal.textContent = sum.additionalExpensesTotal.toLocaleString('he-IL');
        renderSummaryItemList(
            els.additionalExpensesDetail,
            sum.extras.additionalExpensesEnabled ? sum.extras.additionalExpenses : [],
            (x) => x.name,
            (x) => x.amount,
            {
                block: document.getElementById('additionalExpensesDetailBlock'),
                panel: document.getElementById('additionalExpensesDetailPanel'),
                toggle: document.getElementById('additionalExpensesDetailToggle')
            }
        );
        els.centerOwesTherapistTotal.textContent = sum.centerOwesTherapistTotal.toLocaleString('he-IL');
        renderSummaryItemList(
            els.centerOwesTherapistDetail,
            sum.extras.centerOwesTherapistEnabled ? sum.extras.centerOwesTherapist : [],
            (x) => x.name,
            (x) => x.amount,
            {
                block: document.getElementById('centerOwesTherapistDetailBlock'),
                panel: document.getElementById('centerOwesTherapistDetailPanel'),
                toggle: document.getElementById('centerOwesTherapistDetailToggle')
            }
        );
        els.courseExpensesTotal.textContent = sum.courseExpensesTotal.toLocaleString('he-IL');
        els.grossIndividualTotal.textContent = sum.grossIndividualTotal.toLocaleString('he-IL');
        els.centerTotal.textContent = sum.centerTotal.toLocaleString('he-IL');
        els.grandTotal.textContent = sum.grandTotal.toLocaleString('he-IL');
        els.paidToCenterTotal.textContent = `${sum.paidToCenterTotal.toLocaleString('he-IL')} (לפי סימון יעד: ${sum.paidToCenterApplied.toLocaleString('he-IL')})`;
        els.paidToCenterTreatmentCount.textContent = sum.paidToCenterTreatmentCount.toLocaleString('he-IL');
        els.paidToTherapistTotal.textContent = `${sum.paidToTherapistTotal.toLocaleString('he-IL')} (לפי סימון יעד: ${sum.paidToTherapistApplied.toLocaleString('he-IL')})`;
        els.paidToTherapistTreatmentCount.textContent = sum.paidToTherapistTreatmentCount.toLocaleString('he-IL');
        els.remainingToCenter.textContent = sum.remainingToCenter.toLocaleString('he-IL');
        els.remainingToTherapist.textContent = sum.remainingToTherapist.toLocaleString('he-IL');
        const netEl = els.netSettlementText;
        if (sum.netSettlement > 0) {
            netEl.textContent = `המרכז חייב למטפלת ${sum.netSettlement.toLocaleString('he-IL')} ₪`;
        } else if (sum.netSettlement < 0) {
            netEl.textContent = `המטפלת חייבת למרכז ${Math.abs(sum.netSettlement).toLocaleString('he-IL')} ₪`;
        } else {
            netEl.textContent = 'אין יתרה בין הצדדים';
        }
        applyPatientTableFilter();
    }

    function touchActivePeriod(period) {
        const store = readStore();
        store.activePeriod = period;
        writeStore(store);
    }

    function load() {
        try {
            const store = readStore();
            const selectedPeriod = periodInput.value || store.activePeriod || defaultPeriodValue();
            periodInput.value = selectedPeriod;
            const existing = store.reportsByPeriod[selectedPeriod];
            if (existing) {
                applyState(existing);
                currentPeriod = selectedPeriod;
                applyUiState(store.ui);
                touchActivePeriod(selectedPeriod);
                return;
            }
            applyState({
                period: selectedPeriod,
                baseSalary: baseSalaryInput?.value,
                clientRate: clientRateInput?.value,
                therapistRole: activeRole(),
                sessionTypes: collectSessionTypes(),
                therapistPaymentDetails: collectTherapistPaymentDetails(),
                meetingBonus: meetingBonusInput?.checked,
                group: { enabled: false, groups: [defaultGroupEntry()] },
                extras: emptyExtrasState(),
                rows: rowsFromTemplate(store.patientTemplate)
            });
            currentPeriod = selectedPeriod;
            applyUiState(store.ui);
            persist();
        } catch (e) {
            console.error('load failed', e);
            alert('לא ניתן לטעון את הנתונים מהדפדפן. הנתונים עדיין אולי שמורים — נסי «ייבוא מקובץ JSON» מגיבוי, או בדקי Application → Local Storage בכלי המפתחים.');
            clearPatientTableRows();
            addRow();
        }
    }

    applySessionTypes(defaultSessionTypes());
    applyTherapistPaymentDetails();
    roleSessionTypesCard.classList.toggle('is-visible', roleUsesSessionTypes());
    renderGroups([defaultGroupEntry()]);
    toggleGroupVisibility();
    wireGroupsListEvents();
    toggleParentMeetingsVisibility();
    toggleLanguageEvaluationsVisibility();
    toggleDiagnosticsVisibility();
    toggleGroupAssessmentsVisibility();
    toggleCourseExpensesVisibility();
    toggleExtraRoleVisibility();
    toggleAdditionalExpensesVisibility();

    wireSummaryComponentToggles();
    load();
    applyPatientTableFilter();

    document.getElementById('addRow').addEventListener('click', () => {
        addRow();
        persist();
    });

    document.getElementById('patientPayFilter')?.addEventListener('change', (e) => {
        applyPatientTableFilter(e.target.value);
    });

    document.getElementById('clearAll').addEventListener('click', () => {
        if (!confirm('למחוק את כל השורות? הנתונים יימחקו מהטבלה (הגדרות יישארו).')) return;
        clearPatientTableRows();
        addRow();
        applyPatientTableFilter();
        persist();
    });

    if (extraCalcsToggleBtn && extraCalcsPanel) {
        extraCalcsToggleBtn.addEventListener('click', () => {
            const collapsed = extraCalcsPanel.classList.toggle('is-collapsed');
            extraCalcsToggleBtn.setAttribute('aria-expanded', String(!collapsed));
            const chev = extraCalcsToggleBtn.querySelector('.summary-extra-chevron');
            if (chev) chev.textContent = collapsed ? '▸' : '▾';
            schedulePersist();
        });
    }

    ['baseSalary', 'clientRate', 'meetingBonus'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', schedulePersist);
        el.addEventListener('change', schedulePersist);
    });
    [therapistPayFullNameInput, therapistPayBankNameInput, therapistPayBranchInput, therapistPayAccountInput].forEach((el) => {
        el?.addEventListener('input', schedulePersist);
        el?.addEventListener('change', schedulePersist);
    });
    therapistRoleInput.addEventListener('change', () => {
        roleSessionTypesCard.classList.toggle('is-visible', roleUsesSessionTypes());
        refreshDateSlotsForRoleChange();
        updateAllSessionSlotColors();
        schedulePersist();
    });
    addSessionTypeBtn.addEventListener('click', () => {
        addSessionTypeRow({});
        refreshSessionTypeSelectsInRows();
        schedulePersist();
    });
    sessionTypesBody.addEventListener('input', () => {
        refreshSessionTypeSelectsInRows();
    });
    sessionTypesBody.addEventListener('change', () => {
        refreshSessionTypeSelectsInRows();
        updateAllSessionSlotColors();
    });

    groupEnabledInput.addEventListener('change', () => {
        toggleGroupVisibility();
        schedulePersist();
    });
    addGroupBtn?.addEventListener('click', () => {
        if (!groupsListEl) return;
        const current = collectGroupState().groups;
        const last = current.length ? current[current.length - 1] : defaultGroupEntry();
        const next = {
            rate: last.rate,
            children: last.children,
            sessions: 0,
            dates: ['']
        };
        const index = groupsListEl.querySelectorAll('.group-block').length;
        groupsListEl.appendChild(createGroupBlockElement(next, index, true));
        renumberGroupBlocks();
        schedulePersist();
    });

    parentMeetingsEnabledInput.addEventListener('change', () => {
        toggleParentMeetingsVisibility();
        schedulePersist();
    });
    languageEvaluationsEnabledInput.addEventListener('change', () => {
        toggleLanguageEvaluationsVisibility();
        schedulePersist();
    });
    diagnosticsEnabledInput.addEventListener('change', () => {
        toggleDiagnosticsVisibility();
        schedulePersist();
    });
    groupAssessmentsEnabledInput.addEventListener('change', () => {
        toggleGroupAssessmentsVisibility();
        schedulePersist();
    });
    courseExpensesEnabledInput.addEventListener('change', () => {
        toggleCourseExpensesVisibility();
        schedulePersist();
    });

    addParentMeetingBtn.addEventListener('click', () => {
        if (!parentMeetingsEnabledInput.checked) {
            parentMeetingsEnabledInput.checked = true;
            toggleParentMeetingsVisibility();
        }
        addParentMeetingRow({});
        schedulePersist();
    });
    addLanguageEvalBtn.addEventListener('click', () => {
        if (!languageEvaluationsEnabledInput.checked) {
            languageEvaluationsEnabledInput.checked = true;
            toggleLanguageEvaluationsVisibility();
        }
        addLanguageEvalRow({ total: 500, therapist: 305 });
        schedulePersist();
    });
    addDiagnosticBtn.addEventListener('click', () => {
        if (!diagnosticsEnabledInput.checked) {
            diagnosticsEnabledInput.checked = true;
            toggleDiagnosticsVisibility();
        }
        addDiagnosticRow({ therapist: 900 });
        schedulePersist();
    });
    addGroupAssessmentBtn.addEventListener('click', () => {
        if (!groupAssessmentsEnabledInput.checked) {
            groupAssessmentsEnabledInput.checked = true;
            toggleGroupAssessmentsVisibility();
        }
        addGroupAssessmentRow({ price: 150 });
        schedulePersist();
    });
    extraRoleEnabledInput.addEventListener('change', () => {
        toggleExtraRoleVisibility();
        schedulePersist();
    });
    addExtraRoleBtn.addEventListener('click', () => {
        addExtraRoleRow({});
        if (!extraRoleEnabledInput.checked) {
            extraRoleEnabledInput.checked = true;
            toggleExtraRoleVisibility();
        }
        schedulePersist();
    });
    additionalExpensesEnabledInput.addEventListener('change', () => {
        toggleAdditionalExpensesVisibility();
        schedulePersist();
    });
    addAdditionalExpenseBtn.addEventListener('click', () => {
        addAdditionalExpenseRow({});
        if (!additionalExpensesEnabledInput.checked) {
            additionalExpensesEnabledInput.checked = true;
            toggleAdditionalExpensesVisibility();
        }
        schedulePersist();
    });
    centerOwesTherapistEnabledInput.addEventListener('change', () => {
        toggleCenterOwesTherapistVisibility();
        schedulePersist();
    });
    addCenterOwesTherapistBtn.addEventListener('click', () => {
        addCenterOwesTherapistRow({});
        if (!centerOwesTherapistEnabledInput.checked) {
            centerOwesTherapistEnabledInput.checked = true;
            toggleCenterOwesTherapistVisibility();
        }
        schedulePersist();
    });
    addCourseExpenseBtn.addEventListener('click', () => {
        if (!courseExpensesEnabledInput.checked) {
            courseExpensesEnabledInput.checked = true;
            toggleCourseExpensesVisibility();
        }
        addCourseExpenseRow({});
        schedulePersist();
    });

    bulkClearBtn.addEventListener('click', () => {
        bulkDateGrid.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.checked = false;
            cb.closest('.bulk-day')?.classList.remove('active');
        });
    });
    bulkCancelBtn.addEventListener('click', () => {
        bulkDateDialog.close();
        bulkDateTargetRow = null;
    });
    bulkDateDialog.addEventListener('close', () => {
        bulkDateTargetRow = null;
    });
    bulkSaveBtn.addEventListener('click', () => {
        if (!bulkDateTargetRow) {
            bulkDateDialog.close();
            return;
        }
        const { year, month } = periodYearMonth();
        const monthStr = String(month).padStart(2, '0');
        const selectedDays = Array.from(bulkDateGrid.querySelectorAll('input[type="checkbox"]:checked'))
            .map((cb) => parseInt(cb.value, 10))
            .filter((d) => d > 0)
            .sort((a, b) => a - b);
        const list = bulkDateTargetRow.querySelector('.date-row-list');
        list.innerHTML = '';
        if (!selectedDays.length) {
            list.innerHTML = buildDateSlotHtml('');
        } else {
            selectedDays.forEach((d) => {
                const dateIso = `${year}-${monthStr}-${String(d).padStart(2, '0')}`;
                list.innerHTML += buildDateSlotHtml(dateIso);
            });
        }
        syncSessionsFromDates(bulkDateTargetRow);
        updateSessionSlotColorsInRow(bulkDateTargetRow);
        schedulePersist();
        bulkDateDialog.close();
        bulkDateTargetRow = null;
    });

    paymentMsgCloseBtn.addEventListener('click', () => {
        paymentMsgDialog.close();
    });
    paymentMsgCopyBtn.addEventListener('click', async () => {
        const txt = paymentMsgText.value || '';
        if (!txt.trim()) return;
        try {
            await navigator.clipboard.writeText(txt);
            alert('ההודעה הועתקה ללוח.');
        } catch (e) {
            paymentMsgText.focus();
            paymentMsgText.select();
            const ok = document.execCommand('copy');
            if (ok) alert('ההודעה הועתקה ללוח.');
        }
    });

    document.getElementById('saveNow').addEventListener('click', () => {
        calculate();
        persist();
        saveHint.textContent = 'נשמר';
        saveHint.classList.add('saved');
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            saveHint.textContent = '';
            saveHint.classList.remove('saved');
        }, 2500);
    });

    document.getElementById('exportExcel')?.addEventListener('click', exportExcel);
    document.getElementById('exportWord')?.addEventListener('click', exportWord);
    document.getElementById('exportPdf').addEventListener('click', () => {
        calculate();
        window.print();
    });
    document.getElementById('exportJson').addEventListener('click', exportJsonBackup);
    document.getElementById('newMonthFromTemplateBtn').addEventListener('click', createNextMonthReportFromTemplate);

    const importInput = document.getElementById('importJsonFile');
    document.getElementById('importJsonBtn').addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => {
        const file = importInput.files && importInput.files[0];
        importInput.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result));
                importFromJsonObject(data);
                saveHint.textContent = 'ייבוא הושלם';
                saveHint.classList.add('saved');
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    saveHint.textContent = '';
                    saveHint.classList.remove('saved');
                }, 2500);
            } catch (err) {
                alert(err.message || 'לא ניתן לקרוא את הקובץ');
            }
        };
        reader.readAsText(file, 'UTF-8');
    });

    const importNamesInput = document.getElementById('importNamesJsonFile');
    document.getElementById('importNamesJsonBtn').addEventListener('click', () => importNamesInput.click());
    importNamesInput.addEventListener('change', () => {
        const file = importNamesInput.files && importNamesInput.files[0];
        importNamesInput.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(String(reader.result));
                importPatientNamesFromJsonObject(data);
                saveHint.textContent = 'שמות מטופלים יובאו בהצלחה';
                saveHint.classList.add('saved');
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => {
                    saveHint.textContent = '';
                    saveHint.classList.remove('saved');
                }, 2500);
            } catch (err) {
                alert(err.message || 'לא ניתן לקרוא את הקובץ');
            }
        };
        reader.readAsText(file, 'UTF-8');
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushPersist();
    });
    window.addEventListener('pagehide', flushPersist);

    periodInput.addEventListener('change', () => {
        const nextPeriod = periodInput.value;
        const previousPeriod = currentPeriod || readStore().activePeriod || '';
        if (previousPeriod && nextPeriod && previousPeriod !== nextPeriod) {
            const snapshot = collectState();
            snapshot.period = previousPeriod;
            const store = readStore();
            store.reportsByPeriod[previousPeriod] = snapshot;
            store.patientTemplate = extractTemplateNames(snapshot.rows);
            store.activePeriod = nextPeriod;
            store.ui = collectUiState();
            writeStore(store);
        } else {
            flushPersist();
        }
        load();
    });
})();