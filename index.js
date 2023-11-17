import pg from "pg";
import express from "express";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from 'uuid'; // for generating unique IDs

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.set('view engine', 'ejs'); // Set your view engine (EJS)
app.set('views', path.join(__dirname, 'views')); // Set the directory for your view templates

// Initialize the PostgreSQL client
const client = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "archive",
  password: "Guitarra90s!",
  port: 5433,
});
// Serving static files from the "public" directory
app.use(express.static("public"));
client.connect();




// // Define the route for the exhibit pages
// app.get('/exhibit/:id', (req, res) => {
//   const exhibitId = req.params.id;
  
//   // Generate a unique ID for the new user
//   const userId = uuidv4();
//   console.log(userId);
//   // Insert the new user into the database
//   client.query('INSERT INTO users (user_id) VALUES ($1)', [userId], (err, dbRes) => {
//     if (err) {
//       console.error(err);
//     } else {
//       console.log('New user created with ID: ' + userId);
//     }
//   });

//   // Query the database to retrieve exhibit data based on exhibitId
//   client.query('SELECT * FROM exhibits WHERE exhibit_id = $1', [exhibitId], (err, dbRes) => {
//     if (err) {
//       console.error(err);
//       res.status(500).send('Error retrieving exhibit data');
//     } else {
//       // Render the exhibit page with the retrieved data
//       const exhibitData = dbRes.rows[0]; // Assuming a single exhibit with the given ID
//       res.render('exhibit-page', { exhibit: exhibitData });
//     }
//     console.log(req.params.image)
//   });
// });


import cookieParser from 'cookie-parser';


app.use(cookieParser());

app.get('/exhibit/:id', async (req, res) => {
  const exhibitId = req.params.id;

  let userId = req.cookies.userId;

  if (!userId) {
    // Generate a unique ID for the new user
    userId = uuidv4();
    console.log(userId);

    // Insert the new user into the database
    try {
      const dbRes = await client.query('INSERT INTO users (user_id) VALUES ($1)', [userId]);
      console.log('New user created with ID: ' + userId);

      // Set a cookie to remember the user
      res.cookie('userId', userId, { maxAge: 900000, httpOnly: true });
    } catch (err) {
      console.error(err);
    }
  }

  // Query the database to retrieve exhibit data based on exhibitId
  try {
    const dbRes = await client.query('SELECT * FROM exhibits WHERE exhibit_id = $1', [exhibitId]);

    // Render the exhibit page with the retrieved data
    const exhibitData = dbRes.rows[0]; // Assuming a single exhibit with the given ID
    res.render('exhibit-page', { exhibit: exhibitData });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving exhibit data');
  }
});




const port = 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
