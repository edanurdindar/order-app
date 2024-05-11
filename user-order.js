"use strict";
const http = require('http');
const express = require("express");
const mysqlConnection = require("./helper/mysql");
const bodyParser = require("body-parser");
const amqp = require('amqplib');

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

// API endpoint'i, sipariş detaylarını alır ve RabbitMQ'ya gönderir
app.post('/orders', async (req, res) => {
    const productId = req.body.product_id; // Formdan gelen ürün ID'si
    const amount = req.body.amount; // Formdan gelen ürün adeti

    // Ürün bilgilerini MySQL veritabanından al
    const getProductQuery = 'SELECT * FROM products WHERE id = ?';
    mysqlConnection.query(getProductQuery, [productId], async (err, results) => {
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

        try {
            // RabbitMQ'ya bağlan
            const connection = await amqp.connect('amqp://localhost:5672');
            const channel = await connection.createChannel();
            const queueName = 'order_queue';

            // Sipariş kuyruğuna gönderilecek mesajı oluştur
            const message = JSON.stringify({
                product_id: productId,
                product_name: product.name,
                color: product.color,
                price: product.price,
                amount: amount
            });

            // Sipariş bilgilerini RabbitMQ kuyruğuna gönder
            await channel.assertQueue(queueName, { durable: true });
            await channel.sendToQueue(queueName, Buffer.from(message));

            console.log('Order details sent to RabbitMQ:', message);

            // RabbitMQ bağlantısını ve kanalı kapat
            await channel.close();
            await connection.close();

            // Sipariş detayları başarıyla gönderildiğinde HTTP yanıtı gönder
            res.status(200).send('Order placed successfully');
        } catch (error) {
            console.error('Error:', error);
            res.status(500).send('Error sending order details to RabbitMQ');
        }
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});