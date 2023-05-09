interface User {
	id: number;
	username: string;
}

// send POST request with username and id to address api/users, returned response is a json obj
// send GET request to api/users to gen an array of all users, each of them with username and id
// 404 page if user not found 

interface CreatedExerciseResponse {
	userId: number;
	exerciseId: number;
	duration: number;
	description: string;
	date: string;
}

// send POST request with description*, duration*, date(opt) to api/users/:_id/excercises / if wrong id or
// data icorect response 400

interface Exercise {
	id: number;
	description: string;
	duration: number;
	date: string;
}

interface UserExerciseLog extends User {
	logs: Exercise[];
	count: number;
}

//send GET request to /api/users/:_id/logs to retrieve a full exercise log of any user, should include count property
// from and to query parameters as dates yyyy-mm-dd , limit as intiger