const express = require("express");
const fs = require('fs');
const mysqlConnection = require("./helper/mysql");
const bodyParser = require("body-parser");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mysqlConnection.getConnection((err, connection) => {
    if (err) {
        console.log("Database connection error: ", err);
    } else {
        console.log("Database connected");
    }

});

mysqlConnection.getConnection((err, connection) => {
    if (err) {
        console.log("Database connection error: ", err);
    } else {
        console.log("Database connected");

        mysqlConnection.query('SELECT * FROM products', (err, results) => {
            if (err) {
                console.error('MySQL sorgusu hatası:', err);
                return;
            }
            const products = JSON.parse(fs.readFileSync('products.json', 'utf8'));

            // Her bir ürünü MySQL tablosuna ekleyin
            products.forEach(product => {
                const { name, color, price } = product;
                const query = `INSERT INTO products (name, color, price) VALUES (?, ?, ?)`;
                connection.query(query, [name, color, price], (err, result) => {
                    if (err) throw err;
                    console.log(`Ürün "${name}" başarıyla eklendi.`);
                });
            });
        });
    }
});