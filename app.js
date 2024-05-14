"use strict";
const http = require('http');
const express = require("express");
const mysqlConnection = require("./helper/mysql");
const bodyParser = require("body-parser");
const redis = require("redis");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


// Redis connection settings
/*const redisConfig = {
    host: 'localhost',
    port: 6380
};

// Create Redis client
const redisClient = redis.createClient(redisConfig);*/


const redisClient = redis.createClient({
    url: 'redis://localhost:6380'
});
/*
const redisClient = redis.createClient({
    host: 'redis',
    port: 6379,
});
*/

redisClient.connect();
// Check Redis connection

redisClient.on('connect', function () {
    console.log('Redis connected');
});

redisClient.on('error', function (err) {
    console.error('Redis error:', err);
});
/*app.get('/', async (req, res) => {
    try {
        const data = await redisClient.get("Edanur");
        console.log(data);
        res.send('Hello world!');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});*/

app.get("/", (req, res) => {
    res.send("Hello World");
});


//check db connection
mysqlConnection.getConnection((err, connection) => {
    if (err) {
        console.log("Database connection error: ", err);
    } else {
        console.log("Database connected");
    }

});

mysqlConnection.query('SELECT * FROM users', (err, results) => {
    if (err) {
        console.error('MySQL sorgusu hatası:', err);
        return;
    }
});

app.post('/register', (req, res) => {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    console.log("USERNAME : ", username);
    // Gerekli alanların kontrolü
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    // E-posta adresinin veritabanında kontrolü
    const checkEmailQuery = `SELECT COUNT(*) AS count FROM users WHERE email = ?`;
    mysqlConnection.query(checkEmailQuery, [email], (checkEmailErr, checkEmailResult) => {
        if (checkEmailErr) {
            console.error('Error checking email:', checkEmailErr);
            return res.status(500).json({ message: 'An error occurred while checking email.' });
        }

        const existingUserCount = checkEmailResult[0].count;
        if (existingUserCount > 0) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Kullanıcıyı MySQL'e ekleme
        const insertUserQuery = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
        mysqlConnection.query(insertUserQuery, [username, email, password], (insertErr, insertResult) => {
            if (insertErr) {
                console.error('Error inserting user into MySQL:', insertErr);
                return res.status(500).json({ message: 'User could not be registered, please try again.' });
            }

            // Kullanıcı bilgilerini Redis'e kaydetme
            const redisKey = `user:${email}`;
            const userData = JSON.stringify({ id: insertResult.insertId, username, email, password });
            redisClient.set(redisKey, userData, (err) => {
                if (err) {
                    console.error('Error storing user data in Redis:', err);
                    // Hata durumunda Redis'e kayıt yapılamadı mesajı döndürülebilir.
                }
                console.log(`User data stored in Redis with key: ${redisKey}`);
            });


            return res.status(201).json({ message: 'User registered successfully.' });
        });
    });
});

app.post('/authenticate', async (req, res) => {

    const inputEmail = req.body.email;
    const inputPassword = req.body.password;
    const userRedisKey = `user:${inputEmail}`;

    const userData = await redisClient.get(userRedisKey);

    if (!userData) {
        console.log('User data not found.');
        return res.status(404).send({ message: 'User data not found.' });
    }

    const user = JSON.parse(userData);

    if (user.password !== inputPassword) {
        //res.send('Incorrect password.');
        return res.status(401).send({ message: 'Incorrect password.' });
    }

    console.log('Authentication successful.');
    return res.status(200).send({ message: 'Authentication successful.' });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});


