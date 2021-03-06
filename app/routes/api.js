var bodyParser = require('body-parser');
var Users = require('../models/users');
var Efforts = require('../models/efforts');
var Segments = require('../models/segments');
var Challenges = require('../models/challenges');
var strava = require('../strava');
var util = require('./../util');

module.exports = function(app, express) {
  var apiRouter = express.Router();

  // Gets all users
  apiRouter.route('/users')
  .get(function(req, res) {
    strava.getAllUsers(function (err, users) {
      if (err) {
        console.error('Error retrieving all users:', err);
      } else {
        res.json(users);
      }
    });
  });

  // Gets specific user
  apiRouter.route('/users/:user_id')
  .get(function(req, res) {
    strava.getUser(req.params.user_id, function (err, user) {
      if (err) {
        console.error('Error retrieving user:', err);
      } else {
        res.json(user);
      }
    });
  });

  // Gets friends for a user
  apiRouter.route('/friends/:user_id')
  .get(function (req, res) {
    var userId = req.params.user_id;
    strava.getFriendsFromDb(userId, function (err, friends) {
      if (err) {
        console.error('Error retrieving friends;', err);
      } else {
        res.json(friends);
      }
    });
  });

  // Gets all challenges
  apiRouter.route('/challenges')
  .get(function(req, res) {
    strava.getAllChallenges(function (err, challenges) {
      if (err) {
        console.error('Error retrieving all challenges:', err);
      } else {
        res.json(challenges);
      }
    });
  });

  // Gets specific challenge
  apiRouter.route('/challenges/:challenge_id')
  .get(function(req, res) {
    strava.getChallenge(req.params.challenge_id, function (err, challenge) {
      if (err) {
        console.error('Error retrieving challenge:', err);
      } else {
        res.json(challenge);
      }
    });
  });

  // Gets active challenges for a user
  apiRouter.route('/challenges/active/:user_id')
  .get(function(req, res) {
    Challenges.getChallenges(req.params.user_id, 'active',
      function (err, challenges) {
        if (err) {
          console.error('Error retrieving challenges:', err);
        } else {
          res.json(challenges);
        }
    });
  });

  // Gets pending challenges for a user
  apiRouter.route('/challenges/pending/:user_id')
  .get(function(req, res) {
    Challenges.getChallenges(req.params.user_id, 'pending',
      function (err, challenges) {
        if (err) {
          console.error('Error retrieving challenges:', err);
        } else {
          res.json(challenges);
        }
    });
  });

  // Gets completed challenges for a user
  apiRouter.route('/challenges/completed/:user_id')
  .get(function(req, res) {
    Challenges.getChallenges(req.params.user_id, 'complete',
      function (err, challenges) {
        if (err) {
          console.error('Error retrieving challenges:', err);
        } else {
          res.json(challenges);
        }
    });
  });

  // Creates a new challenge
  apiRouter.route('/challenges/create')
  .post(function (req, res) {
    var challenge = req.body;
    Challenges.create(challenge);
    res.end('Challenge created:', req.body);
  });

  // Accepts a pending challenge
  apiRouter.route('/challenges/accept')
  .post(function (req, res) {
    var challenge = req.body;
    Challenges.accept(req.body, function (err, raw) {
      if (err) {
        console.error('Error accepting challenge:', err);
      } else {
        res.end(JSON.stringify(raw));
      }
    });
  });

  // Declines a pending challenge
  apiRouter.route('/challenges/decline')
  .post(function (req, res) {
    var challenge = req.body;
    Challenges.decline(challenge, function (err, raw) {
      if (err) {
        console.error('Error accepting challenge:', err);
      } else {
        res.end(raw);
      }
    });
  });

  // Completes a challenge for the user
  apiRouter.route('/challenges/complete')
  .post(function (req, res) {
    var challenge = req.body;
    strava.getSegmentEffort(challenge, function (err, effort) {
      if (err) {
        console.error('Error retrieving segment effort:', err);
        res.end('Challenge not updated.');
      } else {
        res.end(effort);
      }
    });
  });

  // Gets athlete from strava
  apiRouter.route('/athletes/:athlete_id')
  .get(function(req, res) {
    strava.getAthlete(req.params.athlete_id,
      function(err,payload) {
        if(!err) {
          res.json(payload);
        } else {
          console.log(err);
        }
      });
  });

  // Gets all segments
  apiRouter.route('/segments')
  .get(function(req, res) {
    strava.getAllSegments(function (err, segments) {
      if (err) {
        console.error('Error retrieving all segments:', err);
      } else {
        res.json(segments);
      }
    });
  });

  // Gets a specific segment
  apiRouter.route('/segments/:segment_id')
  .get(function(req, res) {
    strava.getSegment(req.params.segment_id,
      function(err,payload) {
        if(!err) {
          res.json(payload);
        } else {
          console.log(err);
        }
      });
  });

  // Gets all efforts
  apiRouter.route('/efforts')
  .get(function(req, res) {
    res.json({ message: 'this returns all efforts!' });   
  });

  // Gets a specific effort
  apiRouter.route('/efforts/:effort_id')
  .get(function(req, res) {
    var effort_id = parseInt(req.params.effort_id);
    strava.getEffort(effort_id,
      function(err,payload) {
        if(!err) {
          res.json(payload);
        } else {
          console.log(err);
        }
      });
  });

  return apiRouter;
};