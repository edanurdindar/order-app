const express = require("express");
const mysqlConnection = require("./helper/mysql");
const bodyParser = require("body-parser");
const fs = require('fs');


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

app.post('/orders', (req, res) => {
    const productId = req.body.product_id; // Formdan gelen ürün ID'si
    const amount = req.body.amount; // Formdan gelen ürün adeti

    // Ürün bilgilerini MySQL veritabanından al
    const getProductQuery = 'SELECT * FROM products WHERE id = ?';
    mysqlConnection.query(getProductQuery, [productId], (err, results) => {
        if (err) {
            console.error('Error getting product from database:', err);
            res.status(500).send('Error getting product from database');
            return;
        }

        if (results.length === 0) {
            console.error('Product not found');
            res.status(404).send('Product not found');
            return;
        }

        const product = results[0];

        //return res.status(200).send(product);
        const orderDetailsQuery = 'INSERT INTO order_details (product_id,product_name, color, price, amount) VALUES (?, ?,?, ?, ?)';
        mysqlConnection.query(orderDetailsQuery, [productId, product.name, product.color, product.price, amount], (err, result) => {
            if (err) {
                console.error('Error inserting order detail:', err);
                res.status(500).send('Error inserting order detail');
                return;
            }
            res.status(200).send('Order placed successfully');
        });


    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
