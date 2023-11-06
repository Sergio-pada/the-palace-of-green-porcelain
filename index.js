import pg from "pg";
import express from "express";
import path from "path"; // Import the 'path' module
const app = express();

import { dirname } from "path"; // No need to install path or url as they are native to node
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/public/index.html");
});

const port = 3000;

app.use(express.static("public")); // This allows us to access static files from the "public" directory


app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});

const client = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "archive",
    password: "Guitarra90s!",
    port: 5433,
});

client.connect();

client.query('select * from users', (err, res) => {
    if (!err) {
        console.log(res.rows);
    } else {
        console.log(err.message);
    }
    client.end();
});

// REMINDER: Start again with command: npm run devStart