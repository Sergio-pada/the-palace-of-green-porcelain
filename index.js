import pkg from "pg";
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
const port = process.env.PORT || 3000;
const { Client } = pkg;
let client;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));
app.use(cookieParser());

/*
  DATABASE CONNECTIVITY
*/

if (process.env.DATABASE_URL) {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('Heroku setup');
} else {
  // Local setup
  client = new Client({
    user: "postgres",
    host: "::1",
    database: "postgres",
    password: "Passw0rd!",
    port: 5432,
  });
  console.log('Local setup');
}

/*  
  FUNCTIONS
*/

async function calculateInterestCounts() {
  // Query the 'users' table
  const usersRes = await client.query('SELECT * FROM archive.users');
  const usersData = usersRes.rows;

  let interestsCount = {};
  usersData.forEach(user => {
    if (user.interests) {
      user.interests.forEach(interest => {
        interest = interest.trim().toLowerCase();
        if (!interestsCount[interest]) {
          interestsCount[interest] = 0;
        }
        interestsCount[interest]++;
      });
    }
  });

  // Prepare the data for the chart
  let chartData = Object.keys(interestsCount).map(interest => {
    return {
      label: interest,
      value: interestsCount[interest]
    };
  });
  return chartData;
}
async function fetchData() {
  try {
    const exhibitsRes = await client.query('SELECT * FROM archive.exhibits ');
    const exhibitsData = exhibitsRes.rows;

    const usersRes = await client.query('SELECT * FROM archive.users');
    const usersData = usersRes.rows;

    fs.writeFileSync('data.json', JSON.stringify({ exhibitsData, usersData }));
  } catch (err) {
    console.error(err);
  } 
}

// For exhibit visit count barchart
async function calculateExhibitVisits() {
  try {
    const exhibitsRes = await client.query('SELECT * FROM archive.exhibits');
    const exhibitsData = exhibitsRes.rows;

    let labels = exhibitsData.map(exhibit => exhibit.title || 'Unknown');
    let data = exhibitsData.map(exhibit => exhibit.visit_count || 0);

    return { labels, data };
  } catch (err) {
    console.error(err);
  }
}
// For user creation line chart
async function calculateUserCreations() {
  const result = await client.query('SELECT DATE(creation_date) as date, COUNT(*) as count FROM archive.users GROUP BY DATE(creation_date) ORDER BY DATE(creation_date)');
  return result.rows;
}

client.connect();

/*
  ROUTES
*/
app.get('/', async (req, res) => {
  let userId = req.cookies.userId;
  
  if (!userId) {
    userId = uuidv4();
    
    try {
      await client.query('INSERT INTO archive.users (user_id, creation_date) VALUES ($1, CURRENT_DATE)', [userId]);
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
      await client.query('INSERT INTO archive.users (user_id, creation_date) VALUES ($1, CURRENT_DATE)', [userId]);
      console.log('New user created with ID: ' + userId);
      res.cookie('userId', userId, { maxAge: 900000, httpOnly: true });
    } catch (err) {
      console.error(err);
    }
  } else {
    console.log('Returning user');
    const { rows } = await client.query('SELECT tags FROM archive.exhibits WHERE exhibit_id = $1', [exhibitId]);
    const tags = rows[0].tags;

    for (let tag of tags) {
      await client.query(`
        UPDATE archive.users 
        SET interests = array_prepend($1, interests) 
        WHERE user_id = $2
      `, [tag, userId]);
    }
  }

  try {
    await client.query('UPDATE archive.exhibits SET visit_count = visit_count + 1 WHERE exhibit_id = $1', [exhibitId]);
  } catch (err) {
    console.error(err);
  }

  let exhibitData;
  try {
    const dbRes = await client.query('SELECT * FROM archive.exhibits WHERE exhibit_id = $1', [exhibitId]);
    exhibitData = dbRes.rows[0];
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error retrieving exhibit data');
  }

  res.render('exhibit-page', { exhibit: exhibitData });
});

app.get('/dashboard', async (req, res) => {
  const chartData = await calculateInterestCounts();
  const exhibitData = await calculateExhibitVisits();
  const userCreationData = await calculateUserCreations();

  res.render('dashboard', { chartData, exhibitData, userCreationData });
});


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


app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});