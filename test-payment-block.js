const mysql = require('mysql2/promise');

async function setFuturePaymentDate() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '12345678',
        database: 'lsa_spa_management'
    });

    try {
        console.log('🔧 Setting SPA ID 72 next payment date to future date...\n');

        // Set next_payment_date to 30 days from now
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 30);
        const futureDateStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format

        await connection.execute(
            'UPDATE spas SET next_payment_date = ? WHERE id = ?',
            [futureDateStr, 72]
        );

        console.log(`✅ Updated SPA 72 next_payment_date to ${futureDateStr}`);
        console.log('✅ This will block payments until that date');

        // Check the result
        const [spa] = await connection.execute(
            'SELECT id, next_payment_date FROM spas WHERE id = ?',
            [72]
        );

        if (spa.length > 0) {
            const nextDate = new Date(spa[0].next_payment_date);
            console.log(`📊 Next payment available on: ${nextDate.toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`);

            const daysRemaining = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
            console.log(`⏰ Days remaining: ${daysRemaining} day(s)`);
        }

        console.log('\n🧪 Now try making a payment to test the blocking message!');

    } catch (error) {
        console.error('❌ Database error:', error.message);
    } finally {
        await connection.end();
    }
}

setFuturePaymentDate();