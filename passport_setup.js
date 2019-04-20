
let LocalStrategy = require('passport-local').Strategy;

var TwitterStrategy = require('passport-twitter').Strategy;
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

let bcrypt = require('bcrypt');
let models = require('./models');


const { sanitizeName } = require('./helpers/generic');
const {generate_unique_username, generate_unique_from_username} = require('./helpers/genusername');
// Create new user, using autogenerated unique. username
const create_new_twitter_user = function(token, profile) {
    let names = profile.displayName.split(/(\s+)/);
    let firstname = names[0];
    let lastname = names[2] ? names[2] : " ";

    return generate_unique_from_username(sanitizeName(profile.username)).then(username => {
        const newUser = models.User.build({
            firstname: firstname,
            lastname: lastname,
            email: profile.emails[0].value,
            //password: generateHash(req.body.password),
            password: null,
            username: username,
            twitterToken: token,
            twitterId: profile.id,
            twitterDisplayName: profile.displayName,
            twitterUsername: profile.username,
            email_is_confirmed: true,
        });
        return newUser.save();

    });
}

const update_twitter_user = function(token, profile, user) {
    return models.User.update({
        twitterToken: token,
        twitterId: profile.id,
        twitterDisplayName: profile.displayName,
        twitterUsername: profile.username,
        email_is_confirmed: true,
    }, { where: { id: user.id }});
}

// Create new user, using autogenerated unique. username
const create_new_facebook_user = function(accessToken, refreshToken, profile) {

    // FIXME: Is this thenable?
    let names = profile.displayName.split(/(\s+)/);
    let firstname = names[0];
    let lastname = names[2] ? names[2] : " ";

    return generate_unique_username(firstname.toLowerCase(), lastname.toLowerCase()).then(username => {
        const newUser = models.User.build({
            firstname: firstname,
            lastname: lastname,
            email: profile.emails[0].value,
            //password: generateHash(req.body.password),
            password: null,
            username: username,
            facebookAccessToken: accessToken,
            facebookRefreshToken: refreshToken,
            facebookId: profile.id,
            facebookDisplayName: profile.displayName,
            facebookUsername: profile.username,
            email_is_confirmed: true,
        });
        return newUser.save();
    });
}

const update_facebook_user = function(accessToken, refreshToken, profile, user) {
    return models.User.update({
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleId: profile.id,
        googleDisplayName: profile.displayName,
        googleUsername: profile.username,
        email_is_confirmed: true,
    }, { where: { id: user.id }});
}

// Create new user, using autogenerated unique. username
const create_new_google_user = function(accessToken, refreshToken, profile) {

    // FIXME: Is this thenable?
    let names = profile.displayName.split(/(\s+)/);
    let firstname = names[0];
    let lastname = names[2] ? names[2] : " ";

    return generate_unique_username(firstname.toLowerCase(), lastname.toLowerCase()).then(username => {
        const newUser = models.User.build({
            firstname: firstname,
            lastname: lastname,
            email: profile.emails[0].value,
            //password: generateHash(req.body.password),
            password: null,
            username: username,
            googleAccessToken: accessToken,
            googleRefreshToken: refreshToken,
            googleId: profile.id,
            googleDisplayName: profile.displayName,
            googleUsername: profile.username,
            email_is_confirmed: true,
        });
        return newUser.save();
    });
}

const update_google_user = function(accessToken, refreshToken, profile, user) {
    return models.User.update({
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleId: profile.id,
        googleDisplayName: profile.displayName,
        googleUsername: profile.username,
        email_is_confirmed: true,
    }, { where: { id: user.id }});
}

const validPassword = function(user, password) {
	return bcrypt.compareSync(password, user.password);
}
module.exports = function(passport) {
	passport.serializeUser(function(user, done) {
		done(null, user.id)
	});
	passport.deserializeUser(function(id, done) {
		models.User.findOne({
			where: {
				'id' : id
			}
		}).then(user => {
			if (user == null) {
				done(new Error('Wrong user id.'))
			}
			done(null, user);
		})
	});
	passport.use(new LocalStrategy({
		usernameField: 'email', 
		passwordField: 'password',
		passReqToCallback: true
	},
	function(req, email, password, done) {
		return models.User.findOne({
			where: {
				'email' : email
			},
		}).then(user => {
			if (user == null) {
				req.flash('message', 'Incorrect credentials.')
				return done(null, false)
			} else if (user.password == null || user.password == undefined) {
				req.flash('message', 'You must reset your password')
				return done(null, false)
			} else if(!validPassword(user, password)) {
				req.flash('message', 'Incorrect credentials')
				return done(null, false)
			}
			return done(null, user);
		}).catch(err => {
			done(err, false);
		})
	}))


    passport.use(new TwitterStrategy({
        consumerKey: twitter.consumerKey,
        consumerSecret: twitter.consumerSecret,
        callbackURL: twitter.callbackURL,
        passReqToCallback: true,
        includeEmail: true,
    },
    //function(req, accessToken, refreshToken, profile, done) {
    function(req, token, tokenSecret, profile, done) {
        if(req.user) {
            if(req.user.email == profile.emails[0].value) {
                return update_twitter_user(token, profile, req.user).then(res => {
                    return done(null, req.user);
                }); 
            } else {
                req.flash('social-account-connection-failed', 
                    'Looks like you are trying to connect a social account with a different email. Retry the account with the same email.'
                );
                return done(null, req.user);
            }
        }
        process.nextTick(function() {
            return models.User.findOne({
                where: {
                    'email' : profile.emails[0].value
                },
            }).then(user => {
                if (user) {
                    return update_twitter_user(token, profile, user).then(res => {
                        done(null, user);
                    })
                } else {
                    return create_new_twitter_user(token, profile).then(newuser => {
                        done(null, newuser)
                    });
                }
            });
        });
    }));

    passport.use(new GoogleStrategy({
        clientID: google.clientID,
        clientSecret: google.clientSecret,
        callbackURL: google.callbackURL,
        passReqToCallback: true,
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function(req, accessToken, refreshToken, profile, done) {
        if(req.user) {
            if(req.user.email == profile.emails[0].value) {
                return update_google_user(accessToken, refreshToken, profile, req.user).then(res => {
                    return done(null, req.user);
                }); 
            } else {
                req.flash('social-account-connection-failed', 
                    'Looks like you are trying to connect a social account with a different email. Retry the account with the same email.'
                );
                return done(null, req.user);
            }
        }
        process.nextTick(function() { 
            return models.User.findOne({
                where: {
                    'email' : profile.emails[0].value
                },
            }).then(user => {
                if (user) {
                    return update_google_user(accessToken, refreshToken, profile, user).then(res => {
                        return done(null, user);
                    });
                } else {
                    return create_new_google_user(accessToken, refreshToken, profile).then(newuser => {
                        return done(null, newuser)
                    });
                }
            });
        });
    }));

    passport.use(new FacebookStrategy({
        clientID: facebook.appId,
        clientSecret: facebook.appSecret,
        callbackURL: facebook.callbackURL,
        profileFields: ['id', 'displayName', 'emails'],
        passReqToCallback: true,
    },
    function(req, accessToken, refreshToken, profile, done) {
        console.log("Facebook data:", profile)
        if(req.user) {
            if(req.user.email == profile.emails[0].value) {
                return update_facebook_user(accessToken, refreshToken, profile, req.user).then(res => {
                    return done(null, req.user);
                }); 
            } else {
                req.flash('social-account-connection-failed', 
                    'Looks like you are trying to connect a social account with a different email. Retry the account with the same email.'
                );
                return done(null, req.user);
            }
        }
        process.nextTick(function() {         
            return models.User.findOne({
                where: {
                    'email' : profile.emails[0].value
                },
            }).then(user => {
                if (user) {
                    return update_facebook_user(accessToken, refreshToken, profile, user).then(res => {
                        done(null, user);
                    });
                } else {
                    return create_new_facebook_user(accessToken, refreshToken, profile).then(newuser => {
                        done(null, newuser)
                    });
                }
            });
        });
    }));
}