export const showAllUsers = "select * from Users";

export const insertUsersQuery = `INSERT INTO Users (username) VALUES(?)`;

export const userExistsQuery = `SELECT * FROM Users WHERE user_id = ?`;

export const usernameExistsQuery = `SELECT * FROM Users WHERE username = ?`;

export const insertExcercisesQuery = `INSERT INTO Exercises (user_id, description, duration, date) VALUES(?,?,?,?)`;

export const createUsersTable = `CREATE TABLE IF NOT EXISTS Users (
	user_id INTEGER PRIMARY KEY ASC,
	username VARCHAR(40)
);`;

export const createExercisesTable = `CREATE TABLE IF NOT EXISTS Exercises (
    excercise_id INTEGER PRIMARY KEY ASC,
    description VARCHAR(50),
    duration INTEGER,
    date DATE,
    user_id INTEGER,
    FOREIGN KEY (user_id) REFERENCES Users(user_id));`;

export let userLogQuery = `
SELECT
    Exercises.excercise_id AS "Excercise_ID",
    Exercises.description AS "Description",
    Exercises.duration AS "Duration",
    Exercises.date AS "Date"
FROM
    Users	RIGHT JOIN Exercises ON
(Users.user_id = Exercises.user_id)
WHERE  Users.user_id = ?`;
