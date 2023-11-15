import pg from "pg";
import express from "express";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

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


// Define the route for the exhibit pages
app.get('/exhibit/:id', (req, res) => {
  const exhibitId = req.params.id;

  // Query the database to retrieve exhibit data based on exhibitId
  client.query('SELECT * FROM exhibits WHERE exhibit_id = $1', [exhibitId], (err, dbRes) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error retrieving exhibit data');
    } else {
      // Render the exhibit page with the retrieved data
      const exhibitData = dbRes.rows[0]; // Assuming a single exhibit with the given ID
      res.render('exhibit-page', { exhibit: exhibitData });
    }
    console.log(req.params.image)
  });
});



const port = 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
