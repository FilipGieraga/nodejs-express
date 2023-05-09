const express = require("express");
const app = express();
const cors = require("cors");
var sqlite3 = require("sqlite3");
var path = require("path");

const DB_PATH = path.join(__dirname, "mydb.db");
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: "application/*+json" }));

const insertUsersQuery = `INSERT INTO Users (username) VALUES(?)`;
const userExistsQuery = `SELECT * FROM Users WHERE user_id = ?`;
const usernameExistsQuery = `SELECT * FROM Users WHERE username = ?`;
const insertExcercisesQuery = `INSERT INTO Exercises (user_id, description, duration, date) VALUES(?,?,?,?)`;


const myDB = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.error(err.message);
  console.log("DB Connection Successful");
});

myDB.run(`CREATE TABLE IF NOT EXISTS Users (
	user_id INTEGER PRIMARY KEY ASC,
	username VARCHAR(40)
);`);

myDB.run(`CREATE TABLE IF NOT EXISTS Exercises (
  excercise_id INTEGER PRIMARY KEY ASC,
  description VARCHAR(50),
  duration INTEGER,
  date DATE,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES Users(user_id));`);

require("dotenv").config();

app.use(cors());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.status(200).sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", cors(), (req, res, next) => {
  var sql = "select * from Users";
  var params = [];
  myDB.all(sql, params, (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
    }
    if (rows.length === 0) {
      res.status(404).send("No users.");
    } else {
      res.status(200).json({
        message: "users loaded",
        data: rows,
      });
    }
  });
});

app.post("/api/users", function (req, res) {
  if (!req.body.username.trim()) {
    res.status(400).send("No username input.");
    return;
  }
  myDB.get(usernameExistsQuery, req.body.username, function (err, userData) {
    if (userData) {
      res.status(400).send(`User already exists.`);
    } else {
      myDB.run(insertUsersQuery, req.body.username, function (err) {
        if (err) {
          res.status(400).json({ error: err.message });
        } else {
          console.log(`User inserted into DB, id:${this.lastID}`);
          res
            .status(200)
            .send({ username: req.body.username, id: this.lastID });
        }
      });
    }
  });
});

app.post("/api/users/:uid/exercises", function (req, res) {
  try {
    if (isNaN(req.params.uid) || !req.params.uid) {
      throw new Error("User Id is not a number.");
    }
    if (!req.body.description.trim()) {
      throw new Error("Description is required.");
    }
    if (isNaN(req.body.duration)) {
      throw new Error("Duration is required as number of digits.");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/gm.test(req.body.date) && req.body.date) {
      throw new Error("Wrong date format.");
    }
  } catch (error) {
    res.status(400).send(error.message);
  }

  myDB.get(userExistsQuery, req.params.uid, function (err, row) {
    if (!row || err) {
      res.status(400).send(`User does not exist.`);
    } else {
      let date;
      if (req.body.date) {
        date = req.body.date;
      } else {
        date = new Date().toISOString().split("T")[0];
      }
      myDB.run(
        insertExcercisesQuery,
        [req.params.uid, req.body.description, req.body.duration, date],
        function (err) {
          if (err) {
            res.status(400).send(`Something went wrong. ${err}`);
          }
          res.status(200).send({
            userId: req.params.uid,
            exerciseId: this.lastID,
            duration: req.body.duration,
            description: req.body.description,
            date: date,
          });
        }
      );
    }
  });
});

app.get("/api/users/:uid/logs", function (req, res) {
  let userLogQuery = `
		SELECT
			Exercises.excercise_id AS "Excercise_ID",
			Exercises.description AS "Description",
			Exercises.duration AS "Duration",
			Exercises.date AS "Date"
		FROM
			Users	RIGHT JOIN Exercises ON
      (Users.user_id = Exercises.user_id)
    WHERE  Users.user_id = ?`;
  myDB.get(userExistsQuery, req.params.uid, function (err, userData) {
    if (!userData || err) {
      res.status(400).send(`User does not exist.`);
      return;
    } else {
      let params = [req.params.uid];
      if (req.query.from && req.query.to) {
        if (
          [req.query.from, req.query.to].every((date) =>
            /^\d{4}-\d{2}-\d{2}$/gm.test(date)
          )
        ) {
          params.push(req.query.from, req.query.to);
          userLogQuery += " AND Exercises.date BETWEEN ? AND ?";
        } else {
          res.status(400).send(`Wrong date(s) format. Try YYYY-MM-DD`);
          return;
        }
      }
      if (req.query.from && !req.query.to) {
        if (/^\d{4}-\d{2}-\d{2}$/gm.test(req.query.from)) {
          params.push(req.query.from);
          userLogQuery += " AND Exercises.date >= ?";
        } else {
          res.status(400).send(`Wrong date(s) format. Try YYYY-MM-DD`);
          return;
        }
      }
      if (!req.query.from && req.query.to) {
        if (/^\d{4}-\d{2}-\d{2}$/gm.test(req.query.to)) {
          params.push(req.query.to);
          userLogQuery += " AND Exercises.date <= ?";
        } else {
          res.status(400).send(`Wrong date(s) format. Try YYYY-MM-DD`);
          return;
        }
      }
      if (req.query.limit && !isNaN(req.query.limit)) {
        params.push(req.query.limit);
        userLogQuery += " LIMIT ?";
      }
      if (req.query.limit && isNaN(req.query.limit)) {
        res.status(400).send(`Limit is not a number`);
        return;
      }
      myDB.all(userLogQuery, params, function (err, rows) {
        if (err) {
          res.status(400).send(`Something went wrong.`);
          return;
        } else {
          res.status(200).json({
            User_ID: userData.user_id,
            Username: userData.username,
            logs: rows,
            count: rows.length,
          });
        }
      });
    }
  });
});

app.get("*", function (req, res) {
  res.status(404).send("Page not found");
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
