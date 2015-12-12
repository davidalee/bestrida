var mongoose = require('../db');

var challengeSchema = mongoose.Schema({ 
  segmentId: { type: Number, required: true },
  segmentName: { type: String, required: true },
  challengerId: { type: Number, required: true },
  challengeeId: { type: Number, required: true },
  challengerTime: Number,
  challengeeTime: Number,
  status: { type: String, default: 'pending' },
});

var Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;

module.exports.create = function (challenge) {
  var newChallenge = new Challenge({
    segmentId: challenge.segmentId,
    segmentName: challenge.segmentName,
    challengerId: challenge.challengerId,
    challengeeId: challenge.challengeeId
  });
  newChallenge.save(function (err, res) {
    if (err) {
      console.error('Error creating challenge:', err);
    } else {
      console.log('Challenge created:', res);
    }
  });
};

module.exports.accept = function () {
  // TODO: add challenge to Active Challenges tab
};

module.exports.decline = function () {
  // TODO: remove challenge from db
};

module.exports.complete = function () {
  // TODO: call strava api, get user's time for the correct segment
  // TODO: update challenge with the effort time (and other details, if necessary)
};

module.exports.getChallenges = function (user, status, callback) {
  Challenge.find()
    .and([
      { 
        $or: [
          { challengerId: user },
          { challengeeId: user }
        ],
        $and: [
          { status: status }
        ]
      }
    ])
    .exec(function (err, challenges) {
      if (err) {
        callback(err);
      } else {
        callback(null, challenges);
      }
    });
};

module.exports.getRecentChallengers = function (user, callback) {
  // Find all challenges for a certain user
  Challenge.find()
    .and([
      {
        $or: [
          { challengerId: user },
          { challengeeId: user }
        ]
      }
    ])
    .sort({ date: 'asc' })
    .limit(10)
    .exec(function (err, challenges) {
      if (err) {
        callback(err);
      } else {
        callback(null, challenges);
      }
    });
  // Sort them in descending order (most recent first)
  // Pull the userId's of the other user in the challenges (not our user)

};