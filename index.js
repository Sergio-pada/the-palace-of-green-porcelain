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
  console.log('Heroku setup');
} else {
  // Local setup
  client = new Client({
    user: "postgres",
    host: "localhost",
    database: "archive",
    password: "Passw0rd!",
    port: 5433,
  });
  console.log('Local setup');
}
client.connect();

app.get('/', async (req, res) => {
  let userId = req.cookies.userId;
  
  if (!userId) {
    userId = uuidv4();
    
    try {
      await client.query('INSERT INTO archive.users (user_id) VALUES ($1)', [userId]);
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
      await client.query('INSERT INTO archive.users (user_id) VALUES ($1)', [userId]);
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
        SET interests = array_prepend($1, array_remove(interests, $1)) 
        WHERE user_id = $2
      `, [tag, userId]);
    }
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


async function fetchData() {
  try {
    // Query the 'exhibits' table
    const exhibitsRes = await client.query('SELECT * FROM archive.exhibits');
    let exhibitsData = exhibitsRes.rows;



    // Standardize the format of tags so theyre all lowercase
    exhibitsData.forEach(exhibit => {
      if (exhibit.tags) {
        exhibit.tags = exhibit.tags.map(tag => tag.toLowerCase());
      }
    });

    // Query the 'users' table
    const usersRes = await client.query('SELECT * FROM archive.users');
    const usersData = usersRes.rows;

    // Write the cleaned data to a JSON file
    fs.writeFileSync('cleaned_data.json', JSON.stringify({ exhibitsData, usersData }));
  } catch (err) {
    console.error(err);
  }
}
// For pie chart of user interests. Counts how many of each interest show up in the users interests columns
async function calculateInterestCounts() {
  // Query the 'users' table
  const usersRes = await client.query('SELECT * FROM archive.users');
  const usersData = usersRes.rows;

  let interestsCount = {};
  usersData.forEach(user => {
    if (user.interests) {
      user.interests.forEach(interest => {
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

  console.log(chartData);
  return chartData;
}

app.get('/dashboard', async (req, res) => {
  const chartData = await calculateInterestCounts();
  res.render('dashboard', { chartData });
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});