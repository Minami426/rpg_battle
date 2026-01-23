
const mysql = require('mysql2/promise');

async function main() {
    const {
        DB_HOST = '127.0.0.1',
        DB_PORT = '3306',
        DB_USER = 'root',
        DB_PASSWORD = 'takayuki128080',
        DB_NAME = 'rpg_battle',
    } = process.env;

    const pool = mysql.createPool({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    });

    try {
        console.log('Altering master_conditions table to expand condition_type...');
        // Changing to VARCHAR(50) to support new types like 'silence', 'blind'
        await pool.execute('ALTER TABLE master_conditions MODIFY COLUMN condition_type VARCHAR(50) NOT NULL');
        console.log('Success!');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        await pool.end();
    }
}

main();
