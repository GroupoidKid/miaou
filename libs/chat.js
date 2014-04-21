var fs = require('fs'),
	fs = require('fs'),
	path = require('path'),
	auths = require('./auths.js'),
	server = require('./server.js'),
	clientSidePluginNames;

exports.configure = function(config){
	clientSidePluginNames = (config.plugins||[]).filter(function(n){
		return fs.existsSync(path.resolve(__dirname, '..', n, '..', 'client-scripts'))
	}).map(function(p) {
		return p.split('/').slice(-2,-1)[0]
	});
	return this;
}

exports.appGet = function(req, res, db){
	db.on([+req.params[0], req.user.id])
	.spread(db.fetchRoomAndUserAuth)
	.then(function(room){
		room.path = server.roomPath(room);
		req.session.room = room;
		if (room.private && !auths.checkAtLeast(room.auth, 'write')) {
			return this.getLastAccessRequest(room.id, req.user.id).then(function(ar){
				res.render('request.jade', { room:room, lastAccessRequest:ar });
			});
		}
		res.render(server.mobile(req) ? 'chat.mob.jade' : 'chat.jade', {
			user:JSON.stringify(req.user),
			room:JSON.stringify(room),
			pluginsToStart:JSON.stringify(clientSidePluginNames)
		});
	}).catch(db.NoRowError, function(){
		// not an error as it happens when there's no room id in url
		res.redirect(server.url('/rooms'));
	}).finally(db.off);
}