// database.js
const mysql = require('mysql2/promise'); // SEM o /promise

const pool = mysql.createPool({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '',
    database: 'cmms'
});

module.exports = pool;