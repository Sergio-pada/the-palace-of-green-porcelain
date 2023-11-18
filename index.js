import pkg from "pg";
const { Client } = pkg;
import express from "express";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { generateRecommendations } from './recommendation.js';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));
app.use(cookieParser());


let client;

if (process.env.DATABASE_URL) {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  // Local setup
  client = new Client({
    user: "postgres",
    host: "localhost",
    database: "archive",
    password: "Passw0rd!",
    port: 5433,
  });
}
client.connect();

app.get('/', async (req, res) => {
  let userId = req.cookies.userId;
  
  if (!userId) {
    userId = uuidv4();
    
    try {
      await client.query('INSERT INTO users (user_id) VALUES ($1)', [userId]);
      console.log('New user created with ID: ' + userId);
      res.cookie('userId', userId, { maxAge: 900000, httpOnly: true });
    } catch (err) {
      console.error(err);
    }
  } else {
    console.log('Returning user');
    console.log(userId);
  }
  
  fetchData();
  res.render('index', { userId });
});

app.get('/exhibit/:id', async (req, res) => {
  const exhibitId = req.params.id;
  let userId = req.cookies.userId;
  
  if (!userId) {
    userId = uuidv4();

    try {
      await client.query('INSERT INTO users (user_id) VALUES ($1)', [userId]);
      console.log('New user created with ID: ' + userId);
      res.cookie('userId', userId, { maxAge: 900000, httpOnly: true });
    } catch (err) {
      console.error(err);
    }
  } else {
    console.log('Returning user');
    const { rows } = await client.query('SELECT tags FROM exhibits WHERE exhibit_id = $1', [exhibitId]);
    const tags = rows[0].tags;

    for (let tag of tags) {
      await client.query(`
        UPDATE users 
        SET interests = array_prepend($1, array_remove(interests, $1)) 
        WHERE user_id = $2
      `, [tag, userId]);
    }
  }

  let exhibitData;
  try {
    const dbRes = await client.query('SELECT * FROM exhibits WHERE exhibit_id = $1', [exhibitId]);
    exhibitData = dbRes.rows[0];
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error retrieving exhibit data');
  }

  res.render('exhibit-page', { exhibit: exhibitData });
});


async function fetchData() {
  try {
    const exhibitsRes = await client.query('SELECT * FROM exhibits');
    const exhibitsData = exhibitsRes.rows;

    const usersRes = await client.query('SELECT * FROM users');
    const usersData = usersRes.rows;

    fs.writeFileSync('data.json', JSON.stringify({ exhibitsData, usersData }));
  } catch (err) {
    console.error(err);
  } 
}

app.get('/recommendations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const recommendations = await generateRecommendations(userId);
    console.log(recommendations); 
    res.render('recommendations', { recommendations });
  } catch (err) {
    console.error(err);
    res.status(500).send('No recommendations found. Please explore some exhibits first. </br><a href="/">Go back to home page</a>');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});