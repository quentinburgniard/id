import axios from 'axios';
import cookieParser from 'cookie-parser';
//import crypto from 'crypto';
import express from 'express';
import fr from './fr.js';
import morgan from 'morgan';
import pt from './pt.js';
//import qs from 'qs';

const app = express();
const port = 80;

app.disable('x-powered-by');
//app.set('env', 'development');
app.set('view cache', false);
app.set('view engine', 'pug');
app.use(cookieParser());
//app.use(express.json());
//app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', { index: false, lastModified: false, maxAge: '7d' }));
app.use(morgan(':method :url :status'));

app.use((req, res, next) => {
  res.locals.token = req.cookies.t || null;
  res.locals.redirect = req.query.r || null;
  next();
});

app.use('/:language', (req, res, next) => {
  res.locals.language = req.params.language;
  if (['en', 'fr', 'pt'].includes(res.locals.language)) {
    res.locals.path = req.path != '/' ? req.path : '';
    res.locals.__ = (key) => {
      switch (res.locals.language) {
        case 'fr':
          return fr[key] || key;
        case 'pt':
          return pt[key] || key;
        default:
          return key;
      }
    }
    next();
  } else {
    res.status(404);
    res.send();
  }
});

app.get('/:language', (req, res) => {
  if (!res.locals.token) {
    res.render('login');
  } else {
    axios.get('https://api.digitalleman.com/v2/users/me', {
      headers: {
        'authorization': `Bearer ${res.locals.token}`
      }
    })
    .then((response) => {
      if (res.locals.redirect) {
        let redirect = `https://${res.locals.redirect}`;
        if (!redirect.includes('digitalleman.com')) redirect += `?t=${res.locals.token}`;
        res.redirect(redirect);
      } else {
        res.locals.email = response.data.email;
        res.render('account');
      }
    })
    .catch((error) => {
      console.log(error);
      res.set('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; secure')
      //res.set('set-cookie', 't=; domain=digitalleman.com; path=/; samesite=strict; secure');
      res.render('login');
    });
  }
});

app.post('/:language', (req, res) => {
  axios.post('https://api.digitalleman.com/v2/auth/local', {
    identifier: req.body.email,
    password: req.body.password
  },
  {
    headers: {
      'content-type': 'application/json'
    }
  })
  .then((response) => {
    res.locals.email = response.data.user.email;
    res.locals.token = response.data.jwt;
    res.append('set-cookie', `t=${res.locals.token}; domain=digitalleman.com; max-age=604740; path=/; secure`);
    if (res.locals.redirect) {
      let redirect = `https://${res.locals.redirect}`;
      if (!redirect.includes('digitalleman.com')) redirect += `?t=${res.locals.token}`;
      res.redirect(redirect);
    } else {
      let messages = [];
      res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
      res.redirect(`/${res.locals.language}`);
    }
  })
  .catch((error) => {
    console.log(error);
    let messages = [];
    res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.append('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; secure');
    res.redirect(`/${res.locals.language}`);
  });
});

app.get('/:language/change-password', (req, res, next) => {
  if (res.locals.token) {
    res.render('change-password');
  } else {
    next();
  }
});

app.post('/:language/change-password', (req, res) => {
  axios.post('https://api.digitalleman.com/v2/auth/change-password', {
    currentPassword: req.body.currentPassword,
    password: req.body.password,
    passwordConfirmation: req.body.passwordConfirmation
  },
  {
    headers: {
      'authorization': `Bearer ${res.locals.token}`,
      'content-type': 'application/json'
    }
  })
  .then((response) => {
    res.locals.token = response.data.jwt;
    let messages = [];
    res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.append('set-cookie', `t=${res.locals.token}; domain=digitalleman.com; path=/; secure`);
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect(`/${res.locals.language}/change-password`);
  });
});

app.get('/:language/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/:language/forgot-password', (req, res) => {
  axios.post('https://api.digitalleman.com/v2/auth/forgot-password', {
    email: req.body.email
  },
  {
    headers: {
      'content-type': 'application/json'
    }
  })
  .then((response) => {
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    console.log(error);
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect(`/${res.locals.language}/forgot-password`);
  });
});

app.get('/:language/reset-password', (req, res, next) => {
  if(req.query.t) {
    res.locals.token = req.query.t;
    res.render('reset-password');
  } else {
    next();
  }
});

app.post('/:language/reset-password', (req, res) => {
  axios.post('https://api.digitalleman.com/v2/auth/reset-password', {
    code: req.body.token,
    password: req.body.password,
    passwordConfirmation: req.body.passwordConfirmation
  },
  {
    headers: {
      'content-type': 'application/json'
    }
  })
  .then((response) => {
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect(`/${res.locals.language}/reset-password?t=${req.body.token}`);
  });
});

app.get('/:language/sign-out', (req, res) => {
  let messages = [];
  res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
  res.append('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; secure');
  res.redirect(`/${res.locals.language}`);
});

app.use((req, res) => {
  res.status(404);
  res.send();
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(500);
  res.send();
});

app.listen(port);