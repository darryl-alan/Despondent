const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const app = express();
const cors = require('cors');
const request = require('request');


let port = process.env.PORT;
if (port == null || port == "") {
	port = 3000;
}



const mongoUser = process.env.mongoUser || '';
const mongoPass = process.env.mongoPass || '';
const uri = `mongodb+srv://${mongoUser}:${mongoPass}@cluster0-xnh7k.mongodb.net/?retryWrites=true`;



const options = {
	url: 'https://app.respondent.io/v2/projects/search',
	method: 'POST',
	headers: {
		'Accept' : 'application/json, text/plain, */*',
		'Accept-Language' : 'en-US,en;q=0.9',
		'Cache-Control' : 'no-cache',
		'Connection' : 'keep-alive',
		'Content-Type' : 'application/json',
		'Host' : 'app.respondent.io',
		'Origin' : 'app.respondent.io',
		'Pragma' : 'no-cache',
		'Referer' : 'https://app.respondent.io/respondents/v2/projects/browse',
		'X-Requested-With': 'XMLHttpRequest'
	},
	body: JSON.stringify({"limit":1,"skip":0,"researchConductType":null,"query":"","compensation":{"min":5,"max":1000},"duration":{"min":5,"max":240}})
};

setInterval(getProjects, 1800000);

function getProjects() {
	request(options, (error, response, body) => {
		try {
			body = JSON.parse(body);

			const totalCount = Number(body.response.totalCount);


			const options2 = {
				url: 'https://app.respondent.io/v2/projects/search',
				method: 'POST',
				headers: {
					'Accept' : 'application/json, text/plain, */*',
					'Accept-Language' : 'en-US,en;q=0.9',
					'Cache-Control' : 'no-cache',
					'Connection' : 'keep-alive',
					'Content-Type' : 'application/json',
					'Host' : 'app.respondent.io',
					'Origin' : 'app.respondent.io',
					'Pragma' : 'no-cache',
					'Referer' : 'https://app.respondent.io/respondents/v2/projects/browse',
					'X-Requested-With': 'XMLHttpRequest'
				},
				body: JSON.stringify({"limit":totalCount,"skip":0,"researchConductType":null,"query":"","compensation":{"min":5,"max":1000},"duration":{"min":5,"max":240}})
			};

			console.log('setting limit to ' + totalCount);
			request(options2, (err, res, bod) => {
				try {
					bod = JSON.parse(bod);


					const client = new MongoClient(uri, { useNewUrlParser: true });
					client.connect(async err => {
						if(err) throw err;
						const coll = client.db("respondent").collection("projects");
						// console.log(bod.response.projects);

						const projects = bod.response.projects;
						for(project of projects){
							console.log('Upserting ' + project.slug);
							await coll.updateOne(
								{ "id" : project.id },
								{ $set: project },
								{ upsert: true }
							);
						}
						client.close();
					});
				}
				catch(e){}
			});

		}
		catch(e){}
	});

}

app.use(cors());
app.use(express.urlencoded({extended: true}));

function onlyUnique(value, index, self) {
	return self.indexOf(value) === index;
}


app.get('/', function(req, res) {
	res.sendFile(__dirname + '/index.html');
});

app.get('/projects', (req, res) => {
	if(req.query.apikey !== 'ZUym1NNpBZAwbTT38137HfDic5AApA'){
		res.status(403);
		res.send('Wrong key');
		return;
	}
	const filter = JSON.parse(req.query.filter);
	const countries = filter.countries;
	let query = {};


	if(countries.length){
		query.country = {"$in": countries};
	}

	const client = new MongoClient(uri, { useNewUrlParser: true });
	client.connect(async err => {
		if(err) throw err;
		const collection = client.db("respondent").collection("projects");
		let data = await collection.find(query).sort({updatedAt: -1, createdAt: -1}).toArray();
		res.set('Content-Type', 'application/json');
		res.send(JSON.stringify(data));
	});
});

app.get('/countries', (req, res) => {
	if(req.query.apikey !== 'ZUym1NNpBZAwbTT38137HfDic5AApA'){
		res.status(403);
		res.send('Wrong key');
		return;
	}

	const client = new MongoClient(uri, { useNewUrlParser: true });
	client.connect(async err => {
		if(err) throw err;
		const collection = client.db("respondent").collection("projects");
		let data = await collection.distinct('country');
		data = data.sort();
		res.set('Content-Type', 'application/json');
		res.send(JSON.stringify(data));
	});
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));