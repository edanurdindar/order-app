const mysql = require("mysql2");

const connection = mysql.createPool({
    connectionLimit: 100,
    host: "localhost",
    user: "root",
    password: "password",
    database: "finalproject_db",

});

module.exports = connection;