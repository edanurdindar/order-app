"use strict";
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const mysqlConnection = require("./helper/mysql");
const mongoose = require('mongoose');

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
app.post('/add-comment', (req, res) => {

    // İstemciden gelen bilgileri al
    const { email, product_id, user_comments, user_rating } = req.body;

    // MySQL'e eklemek için sorguyu hazırla
    const insertQuery = `INSERT INTO user_review (customer_email, product_id, review, rating, created_at) VALUES (?, ?, ?, ?, ?)`;
    const values = [email, product_id, user_comments, user_rating, new Date()];
    res.status(200).json({ message: values });
    // MySQL bağlantısına ekleme yap
    mysqlConnection.query(insertQuery, values, (err, result) => {
        if (err) {
            // Hata durumunda istemciye hata iletilir
            console.error('Error inserting comment into MySQL:', err);
            res.status(500).json({ error: 'Yorum eklenirken bir hata oluştu.' });
        } else {
            // Başarı durumunda istemciye başarılı olduğuna dair mesaj gönderilir
            console.log('Yorum MySQL\'ye başarıyla eklendi:', result);
            res.status(200).json({ message: 'Yorum başarıyla MySQL\'ye eklendi.' });
        }
    });
});
// MongoDB bağlantısı
mongoose.connect('mongodb://localhost:27017/yorum_puanlama');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB bağlantı hatası:'));
db.once('open', () => {
    console.log('MongoDB bağlantısı başarıyla kuruldu.');

    // MySQL'den verileri MongoDB'ye aktarma
    mysqlConnection.query(`SELECT * FROM user_review`, (err, results) => {
        if (err) {
            console.error('Error retrieving comments from MySQL:', err);
        } else {
            // Her bir yorumu MongoDB'ye ekleyin
            results.forEach(comment => {
                const newComment = new Comment({
                    customer_email: comment.customer_email,
                    product_id: comment.product_id,
                    review: comment.review,
                    rating: comment.rating,
                    created_at: comment.created_at
                });
                newComment.save().then(() => {
                    console.log('Yorum MongoDB\'ye başarıyla eklendi:', newComment);
                }).catch(err => {
                    console.error('Error saving comment to MongoDB:', err);
                });
            });
        }
    });
});

// Yorum şeması
const commentSchema = new mongoose.Schema({
    customer_email: String,
    product_id: Number,
    review: String,
    rating: Number,
    created_at: { type: Date, default: Date.now }
});

// Yorum modeli
const Comment = mongoose.model('Comment', commentSchema);

// Sunucuyu başlat
const port = 3000;
app.listen(port, () => {
    console.log(`Sunucu ${port} portunda çalışıyor.`);
});
