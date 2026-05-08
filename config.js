window.AVOCADO_CONFIG = {
    storageKey: 'avocado-treatment-report-v1',
    roles: {
        speech: 'speech',
        ot: 'ot',
        emotional: 'emotional'
    },
    ui: {
        initialDateSlots: 1,
        maxDateSlots: 31,
        sessionTypeColors: [
            { bg: '#ecfeff', border: '#67e8f9' },
            { bg: '#ecfdf5', border: '#6ee7b7' },
            { bg: '#fff7ed', border: '#fdba74' },
            { bg: '#fef2f2', border: '#fca5a5' },
            { bg: '#f5f3ff', border: '#c4b5fd' },
            { bg: '#fffbeb', border: '#fcd34d' }
        ]
    },
    defaults: {
        sessionTypes: [
            { name: 'מפגש רגיל', fullPrice: 370, therapistPrice: 215 }
        ],
        therapistPaymentDetails: {
            fullName: 'שם מלא',
            bankName: 'שם בנק',
            branchNumber: '000',
            accountNumber: '0000000'
        }
    }
};
