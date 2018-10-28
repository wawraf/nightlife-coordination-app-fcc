const localStrategy = require('passport-local').Strategy
const githubStrategy = require('passport-github').Strategy

const bcrypt = require('bcrypt')
const saltRounds = 10

const User = require('../models/user')

module.exports = (passport) => {
  
  passport.serializeUser((user, done) => {
    done(null, user._id)
  })
  
  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
      done(null, user)
    })
  })
  


  const localLogin = new localStrategy(
    {
      usernameField: 'username',
      passwordField: 'password'
    },
    (username, password, done) => {
      User.findOne({ username })
      .then(user => {
        console.log('User found:')
        console.log(user)
        if (!user) done(null, false, {code: 'invalidUsername', message: 'Invalid username'})
        else if (!bcrypt.compareSync(password, user.password, err => { 
          return done(null, false, {code: 'dehashError', message: 'Password comparison error'})
        })) done(null, false, {code: 'invalidPassword', message: 'Invalid password'})
        else done(null, user)
      })
      .catch(err => done(err))
    }
  )
  passport.use('localLogin', localLogin)
  


  const localRegister = new localStrategy({ 
      usernameField: 'username',
      passwordField: 'password',
      passReqToCallback: true },(req, username, password, done) => {
    // If user is already logged
    console.log('Local Register')
    console.log('Request user:')
    console.log(req.user)
    if (req.user) return done(null, req.user, {code: 'logged', message: `You're already logged in.`})

    password = bcrypt.hash(myPlaintextPassword, saltRounds, err => {
      return done(null, false, {code: 'hashError', message: 'Password hashing error'}) 
    })
    
    const newUser = new User({ username, password })
    newUser.save()
      .then(user => {
      console.log('User:')
      console.log(user)
      done(null, user, {code: 'registered', message: 'Succesfully registered.'})
    })
    .catch(err => {
      console.log(err.name)
      if (err.name == 'ValidationError') done(null, false, {code: 'taken', message: 'Username taken'})
      else done(err)
    })
  });
  passport.use('localRegister', localRegister)
  


  passport.use(new githubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callback: process.env.GITHUB_CALLBACK_URL
    },
    (accessToken, refreshToken, profile, done) => {
      User.findOneAndUpdate({ 'github.id': profile.id }, 
                            { 'github.username': profile.displayName || 'Buddy',  'github.id': profile.id }, 
                            { upsert: true, new: true }, 
                            (err, user) => {
        if (err) return done(err, user)
        return done(null, user)
      })
    }
  ))
  
}