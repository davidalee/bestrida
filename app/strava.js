var strava = require('strava-v3');
var util = require('./util');
var Users = require('./models/users');
var Challenges = require('./models/challenges');
var Segments = require('./models/segments');

function registerAthlete(stravaCode, callback) {
  // Exchange the temporary code for an access token.
  strava.oauth.getToken(stravaCode, function(err, payload) {
    if (err) {
      callback(err);
    } else {
      // Save athlete information to the database.
      var athlete = payload.athlete;
      athlete.token = payload.access_token;
      callback(null, payload);
      Users.registerAthlete(athlete, callback);
      setTimeout(function() {
        getSegmentsFromStrava(athlete.id, athlete.token);
        Users.getFriendsFromStrava(athlete.id, athlete.token);
      }, 2000);
    }
  });
}

function getOAuthRequestAccessUrl() {
  var accessUrl = strava.oauth.getRequestAccessURL({});
  return accessUrl;
}

function getAthlete(athleteId, callback) {
  strava.athletes.get( {id: athleteId}, function(err, athlete) {
    if (err) {
      console.log("Received error from athlete.get service:\n" + util.stringify(err));
      callback(err);
    } else {
      callback(null, athlete);
    }
  });
}

function getSegment(segmentId, callback) {
  Segments.find({ _id: segmentId }, function (err, segment) {
    if (err) {
      callback(err);
    }
    // if not found send API request
    if (!segment || !segment[0]) {
      strava.segments.get( {id: segmentId}, function(err, segment) {
        if (err) {
          console.log("Received error from segment.get service:\n" + util.stringify(err));
          callback(err);
        } else {
          Segments.saveSegment(segment, callback);
        }
      });
    // if found in DB
    } else if (segment[0]) {
      callback(null, segment[0]);
    }
  });
}

function getAllSegments(callback) {
  Segments.find({}, function (err, segments) {
    if (err) {
      callback(err);
    }
    if (segments.length) {
      callback(null, segments);
    }
  });
}

function getEffort(effortId, callback) {
  strava.segmentEfforts.get( {id: effortId}, function(err, effort) {
    if (err) {
      callback(err);
    } else {
      callback(null, effort);
    }
  });
}

function getAllUsers(callback) {
  Users.find({}, function (err, users) {
    if (err) {
      callback(err);
    }
    if (users.length) {
      callback(null, users);
    }
  });
}

function getUser(id, callback) {
  Users.find({ _id: id }, function (err, user) {
    if (err) {
      callback(err);
    }
    if (!user || !user[0]) {
      callback(null, 'User ' + id + ' not found!');
    } else if (user[0]) {
      callback(null, user[0]);
    }
  });
}

function getFriendsFromDb (id, callback) {
  Users.find({ _id: id }, function (err, users) {
    if (err) {
      callback(err);
    }
    if (!users) {
      callback(null, 'User ' + id + ' not found');
    } else if (users.length) {
      callback(null, users[0].friends);
    }
  });
}

function getUserSegmentsFromDb (id, callback) {
  Users.find({ _id: id }, function (err, users) {
    if (err) {
      callback(err);
    }
    if (!users.length) {
      callback(null, 'User ' + id + ' not found');
    } else if (users.length) {
      callback(null, users[0].segments);
    }
  });
}

function getStarredSegmentsFromStrava (userId, token) {
  strava.segments.listStarred({ access_token: token }, function(err, segments) {
    if (err) console.error('Error retrieving starred segments:', err);
    // Retrieve a user's current segments to see segments are already saved
    Users.find({ _id: userId }).select('segments')
    .then(function(currentSegments) {
      userSegments = {};
      // Save the id of each of the user's current segments into the object
      currentSegments[0].segments.forEach(function (seg) { 
        userSegments[seg._id] = true; 
      });

      // Iterate over segments retrieved from Strava
      segments.forEach(function(segment) {
        // Check to see if the segment is in database
        Segments.find({ _id: segment.id }, function (err, res) {
          if (err) console.error(err);
          if (!res.length) {
            getAndSaveSegmentInfo(segment.id, userId);
          } else if (res.length) {
            if (!userSegments[res[0].id]) {
              var userSegment = {
                _id: res[0].id,
                name: res[0].name,
                count: 1
              };
              Users.saveSegments(userId, userSegment);
            }
          }
        });
      });
    });
  });
  setTimeout(function() {
    sortSegments(userId);
  }, 2000);
}

function sortSegments (userId) {
  Users.find({ _id: userId }).select('segments')
  .then(function(segments) {
    segments = segments[0].segments;
    var sortedSegments = segments.sort(function(x, y) {
      return y.count - x.count;
    });
    Users.update({ _id: userId }, { segments: sortedSegments }, function (err, raw) {
      if (err) console.error(err);
      console.log(raw.nModified === 1 ? 'User segments were sorted' : 'No changes made to users\' segments ordering');
    });
  });
}

function getAndSaveSegmentInfo (segmentId, userId) {
  strava.segments.get({ id: segmentId }, function(err, segment) {
    if (err) {
      console.log("Received error from segment.get service:\n" + util.stringify(err));
    } else {
      var userSegment = {
        _id: segment.id,
        name: segment.name,
        count: 1
      };
      Segments.saveSegment(segment);
      setTimeout(function() {
        Users.saveSegments(userId, userSegment)
      }, 1000);
    }
  });
}

function getSegmentEffort (challenge, callback) {
  Challenges.find({ _id: challenge.id }, function (err, challenges) {
    if (err) {
      callback(err);
    } else if (!challenges.length) {
      callback('No challenge found');
    } else if (challenges.length) {
      challenge.segmentId = challenges[0].segmentId;
      challenge.start = new Date(challenges[0].created).toISOString();
      challenge.end = new Date(challenges[0].expires).toISOString();
      challenge.challengerId = challenges[0].challengerId;
      challenge.challengeeId = challenges[0].challengeeId;

      strava.segments.listEfforts({
        id: challenge.segmentId,
        athlete_id: challenge.userId,
        start_date_local: challenge.start,
        end_date_local: challenge.end
      }, function (err, efforts) {
        if (err) {
          console.error('Error getting segment efforts:', err);
        }
        if (!efforts) {
          callback(null, 'No effort found');
        } else {
          // Strava returns the best effort first if there are multiple efforts
          Challenges.complete(challenge, efforts[0], callback);
        }
      });
    }
  });
}

function getAllChallenges(callback) {
  Challenges.find({}, function (err, challenges) {
    if (err) {
      callback(err);
    }
    if (challenges.length) {
      callback(null, challenges);
    }
  });
}

function getChallenge(id, callback) {
  Challenges.find({ _id: id }, function (err, challenge) {
    if (err) {
      callback(err);
    }
    if (!challenge[0]) {
      callback(null, 'challenge ' + id + ' not found!');
    } else if (challenge[0]) {
      callback(null, challenge[0]);
    }
  });
}

module.exports = {
  registerAthlete: registerAthlete,
  getOAuthRequestAccessUrl: getOAuthRequestAccessUrl,
  getAthlete: getAthlete,
  getSegment: getSegment,
  getAllSegments: getAllSegments,
  getEffort: getEffort,
  getAllUsers: getAllUsers,
  getUser: getUser,
  getFriendsFromDb: getFriendsFromDb,
  getSegmentEffort: getSegmentEffort,
  getAllChallenges: getAllChallenges,
  getChallenge: getChallenge,
  getSegmentsFromStrava: getSegmentsFromStrava,
  getStarredSegmentsFromStrava: getStarredSegmentsFromStrava,
  getUserSegmentsFromDb: getUserSegmentsFromDb
};