import {
  createUsersTable,
  createExercisesTable,
  userLogQuery,
  insertUsersQuery,
  showAllUsers,
  userExistsQuery,
  usernameExistsQuery,
  insertExcercisesQuery,
} from "./db_handlers/sql_queries.js";
import {
  varExistAndIsNumber,
  varExist,
  varNotExist,
  varInputEmpty,
} from "./validators/validators.js";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import sqlite3 from "sqlite3";
import bodyParser from "body-parser";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "mydb.db");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ type: "application/*+json" }));

const myDB = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.error(err.message);
  console.log("DB Connection Successful");
});

myDB.run(createUsersTable);

myDB.run(createExercisesTable);

dotenv.config();

app.use(cors());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.status(200).sendFile(__dirname + "/views/index.html");
});

app.get("/api/users", cors(), (req, res, next) => {
  var params = [];
  myDB.all(showAllUsers, params, (err, rows) => {
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
  if (varInputEmpty(req.body.username)) {
    return res.status(400).send("No username input.");
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

app.post("/api/users/*/exercises", function (req, res) {
  const uid = req.params[0];
  if (isNaN(uid) || varNotExist(uid)) {
    return res.status(400).send("User Id is not a number or is missing.");
  }
  if (varInputEmpty(req.body.description)) {
    return res.status(400).send("Description is required.");
  }
  if (isNaN(req.body.duration) && varExist(req.body.duration)) {
    return res.status(400).send("Duration is required as number of digits.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/gm.test(req.body.date) && varExist(req.body.date)) {
    return res.status(400).send("Wrong date format.");
  }

  myDB.get(userExistsQuery, uid, function (err, row) {
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
        [uid, req.body.description, req.body.duration, date],
        function (err) {
          if (err) {
            res.status(400).send(`Something went wrong. ${err}`);
          }
          res.status(200).send({
            userId: uid,
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
  let userLog = userLogQuery;
  myDB.get(userExistsQuery, req.params.uid, function (err, userData) {
    if (!userData || err) {
      return res.status(400).send(`User does not exist.`);
    } else {
      let params = [req.params.uid];
      if (req.query.from && req.query.to) {
        if (
          [req.query.from, req.query.to].every((date) =>
            /^\d{4}-\d{2}-\d{2}$/gm.test(date)
          )
        ) {
          params.push(req.query.from, req.query.to);
          userLog += " AND Exercises.date BETWEEN ? AND ?";
        } else {
          res.status(400).send(`Wrong date(s) format. Try YYYY-MM-DD`);
          return;
        }
      }
      if (req.query.from && !req.query.to) {
        if (/^\d{4}-\d{2}-\d{2}$/gm.test(req.query.from)) {
          params.push(req.query.from);
          userLog += " AND Exercises.date >= ?";
        } else {
          res.status(400).send(`Wrong date(s) format. Try YYYY-MM-DD`);
          return;
        }
      }
      if (!req.query.from && req.query.to) {
        if (/^\d{4}-\d{2}-\d{2}$/gm.test(req.query.to)) {
          params.push(req.query.to);
          userLog += " AND Exercises.date <= ?";
        } else {
          res.status(400).send(`Wrong date(s) format. Try YYYY-MM-DD`);
          return;
        }
      }
      userLog += " ORDER BY Exercises.date ASC";
      let limit;
      if (varExistAndIsNumber(req.query.limit)) {
        limit = req.query.limit;
      }
      if (isNaN(req.query.limit) && varExist(req.query.limit)) {
        return res.status(400).send(`Limit is not a number`);
      }
      myDB.all(userLog, params, function (err, rows) {
        if (err) {
          return res.status(400).send(`Something went wrong.`);
        } else {
          res.status(200).json({
            User_ID: userData.user_id,
            Username: userData.username,
            logs: typeof limit === "string" ? rows.slice(0, limit) : rows,
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
