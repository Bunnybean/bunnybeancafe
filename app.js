//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
//facebook
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const auth = require("./auth"); //change
const app = express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//session
app.use(session({
    secret:"Our Little Seceret.",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

//mongoose
mongoose.connect("mongodb://localhost:27017/cafeUserDB",{useNewUrlParser:true, useUnifiedTopology:true});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    review: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err, user);
    });
});

//google
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/review",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    function(accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

//facebook
passport.use(new FacebookStrategy({
        clientID: process.env.CLIENT_ID_FB,
        clientSecret: process.env.CLIENT_SECRET_FB,
        callbackURL: "http://localhost:3000/auth/facebook/review",
        profileFields: ["id", "emails", "name"]
    },
    function(accessToken, refreshToken, profile, done) {
        console.log(profile);
        User.findOrCreate({ facebookId: profile.id }, function(err, user) {
            if (err) {
                return done(err);
            } else {
                done(null, user);
            }
        });
    }

));

//get
app.get("/", function(req, res){
    res.render("main");
});

// Google login
app.get("/auth/google", passport.authenticate("google", {scope:['profile']}));
app.get("/auth/google/review",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {
        res.redirect("/review");
});

// Facebook login
app.get('/auth/facebook', passport.authenticate('facebook',{scope:'email'}));
app.get('/auth/facebook/review',
    passport.authenticate('facebook', { successRedirect: '/review',
        failureRedirect: '/login' }));

app.get("/menu", function(req, res){
    res.render("menu");
});

app.get("/drinks",function(req, res){
    res.render("drinks");
});

app.get("/iceCream", function(req, res){
   res.render("iceCream");
});

app.get("/bakery", function(req, res){
    res.render("bakery");
});

app.get("/login", function(req, res){
   const status = auth.statusUI(req, res);
   res.render("login");
});

app.get("/checklogin", function(req, res){

    if (req.isAuthenticated()){
        res.redirect("/review");
    } else {
        res.redirect("/login");
    }

});

app.get("/review", function(req, res){

    User.find({"review": {$ne: null}}, function(err, foundUsers){
        if (err){
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("review", {userReviews: foundUsers});
            }
        }
    });
});

app.get("/submit", function(req, res){
    if(req.isAuthenticated()){
        res.render("submit");
    } else {
        res.redirect("login");
    }
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

//post

app.post("/submit", function(req, res){
    const submittedReview = req.body.review;
    User.findById(req.user.id, function(err, foundUser){
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.review = submittedReview;
                foundUser.save(function(){
                    res.redirect("/review");
                });
            }
        }
    });
});

app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            //res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/review");
            });
        }
    });
});

app.post("/login", function(req, res){

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/review");
            });
        }
    });

});

let port = process.env.PORT;
if (port == null || port == "") {
    port = 3000;
}
app.listen(port, function(){
    console.log("Server is running on port 3000");
});


/*
app.listen(3000,function(){
    console.log("Server up 3000")
});
 */