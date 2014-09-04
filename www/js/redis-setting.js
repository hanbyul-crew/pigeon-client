var redis = require('redis');
var async = require('async');
var Message = require('./data/message')//, Pigeon = require('./data/pigeon');
var toObjectId = require('mongoose').Types.ObjectId;

function findMsgsFlying(callback) {
	Message.find({state:'flying'})
	.populate('from')
	.populate('to')
	.populate('carrier')
	.exec(function(err, msgs) {
		if (err) return callback(err);
		return callback(null, msgs);
		//else updateMsgs(msgs, callback);
	});
}
/*
function updateMsgs(msgs, callback) {
	var arrived = [], flying = [];
	msgs.forEach(function(m) {
		if(isArrived(m)) arrived.push(m);
		else flying.push(m);
	});
	updateArrivedMsgs(arrived, function(err, result) {
		if(err) callback(err);
		else callback(null, flying); // send flying msgs;
	});
}
*/

function isArrived(msg) {
	var current = new Date().getTime();
	return isOver(current, msg.created_at.getTime(), msg.duration_mills)  ;
}

function isOver(current, created, duration) {
	return (current - created) >= duration;
}

function getElapsedTime(current, created) {
	return current - created;
}

function updateArrivedMsgs(arrivedMsgsId, elapsedMills, callback) {
	Message.update({'_id':arrivedMsgsId}, {'$set':{'state': 'arrived', 'elapsed_mills': elapsedMills}}, {safe:true}, 
	function(err, result) {
		if (err) callback(err);
		else callback(null, result);
	});
}


function setRedisMsgs(msgs, client) {
	msgs.forEach(function(m) {
		setRedisMsg(m, client);
	});
	console.log('>> msgs entered to redis: ' + msgs.length );
}

function setRedisMsg(m, client) {
	var mid = m.id;
	var defaultCallback = function(err, result, callback) {
		if(err) callback(err);
		else callback(null, result);
	}
	async.parallel([
		function(callback) {
			client.sadd("mid", mid, function(err, result) { defaultCallback(err, result, callback);});	
		}, 
		function(callback) {
			client.hset(mid, "created_at", m.created_at.getTime(), function(err, result) { defaultCallback(err, result, callback);});
		},
		function(callback) {
			client.hset(mid, "state", m.state, function(err, result) { defaultCallback(err, result, callback);});		
		},
		function(callback) {
			client.hset(mid, "duration_mills", m.duration_mills, function(err, result) { defaultCallback(err, result, callback);});
		},
		function(callback) {
			client.hset(mid, "elapsed_mills", m.elapsed_mills, function(err, result) { defaultCallback(err, result, callback);});
		},
		function(callback) {
			client.hset(mid, "carrier", m.carrier.toString(), function(err, result) { defaultCallback(err, result, callback);});
		},
		function(callback) {
			client.hset(mid, "to", m.to.toString(), function(err, result) { defaultCallback(err, result, callback);});
		}
	], 
	function(err, result) {
		if (err) console.log(">>>failed to enter msg to redis");
	});
}

function updateRedisMessages(client) {
	var current = new Date().getTime();
	var defaultCallback = function(err, result) {
		if (err) console.log(">>>failed to update redis msg");
	}
	client.smembers("mid", function(err, mids) {
		if(err) console.log(err);

		async.each(mids, function(mid, callback) {
			async.parallel({
				created:function(callback) {
					client.hget(mid, "created_at", function(err, result) {
						if(err) callback(err);
						else callback(null, result);
					});
				},
				duration:function(callback) {
					client.hget(mid, "duration_mills", function(err, result) {
						if(err) callback(err);
						else callback(null, result);
					});
				}, 
				carrier:function(callback) {
					client.hget(mid, "carrier", function(err, result) {
						if(err) callback(err);
						else callback(null, result);
					});
				},
				to:function(callback){
					client.hget(mid, "to", function(err, result) {
						if(err) callback(err);
						else callback(null, result);
					});
				}
			}, function(err, result) {
				if (err) callback(err);
				var elapsedMills = getElapsedTime(current, result.created);
				client.hset(mid, "elapsed_mills", elapsedMills, defaultCallback);
				if(elapsedMills >= result.duration) {
					client.srem("mid", mid, defaultCallback);
					//client.hdel(mid, "created_at", "state", "duration_mills");
					client.del(mid, defaultCallback);
					var arrivedMsgsId = toObjectId(mid);
					updateArrivedMsgs(arrivedMsgsId, result.duration, function(err, updateResult){
						if (err) console.log("failed to update msgs : " + err);
						Pigeon.findOne({_id : toObjectId(result.carrier)}, function(err, pigeon) {
							if (err) console.log('>>change carrier state failed: ' + result.carrier);
							else {
								pigeon.changeOwnerAndState(toObjectId(result.to), 'ready', function(err, changeUpdateResult) {
									if(err) console.log('>>change carrier state failed: ' + err + ' ' + result.carrier);
								});
							}
						});
					});
				}
			}); // end of async 
		}, function(err) {
			if (err) console.log(err);
		}); // end of mids iter
	}); // end of mid smember
}

module.exports = {
	start: function() {
		var client = redis.createClient();
		client.select(5);
		findMsgsFlying(function(err, msgs) {
			if(err) throw err;
			setRedisMsgs(msgs, client);
			setInterval(function() {
				updateRedisMessages(client);
			}, 100);
		});
	},
	setRedisMsg : function(m, client) {
		setRedisMsg(m, client);
	}
}
	