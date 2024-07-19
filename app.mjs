import express from 'express';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import User from './models/user.mjs'
import bcrypt from 'bcryptjs';
import { v2 as cloudinary } from 'cloudinary';

import indexRoute from './routes/index.mjs';
import articlesRoute from './routes/articles.mjs';
import usersRoute from './routes/users.mjs';
import commentsRoute from './routes/comments.mjs';

dotenv.config();

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mongoDB = process.env.MONGODB_URI;

const main = async () => {
    try {
        await mongoose.connect(mongoDB, { dbName: 'db_blog_api' });
        console.log('MongoDB connected');
    } catch {
        console.log('Error connecting to MongoDB')
    }
}

main();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET,
}, async (jwtPayload, done) => {
    try {
        const user = await User.findById(jwtPayload.userId).select('-password');

        if (!user) {
            return done(null, false);
        }

        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    async (username, password, done) => {
      try {
          const user = await User.findOne({ email: username });
          if (!user) {
              return done(null, false, { message: 'Incorrect email or password.' });
          }
  
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
              return done(null, false, { message: 'Incorrect email or password.' });
          }
          return done(null, user);
      } catch (error) {
          return done(error);
      }
    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/api/users/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
                user.googleId = profile.id;
                await user.save();
            } else {
                user = new User({
                    googleId: profile.id,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    email: profile.emails[0].value,
                });
                await user.save();
            }
        }

        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
  }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, false);
    }
});

app.use('/', indexRoute);
app.use('/api/articles', articlesRoute);
app.use('/api/users', usersRoute);
app.use('/api/comments', commentsRoute);

export default app;