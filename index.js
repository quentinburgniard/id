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
  res.locals.messages = req.cookies.m ? JSON.parse(req.cookies.m) : [];
  res.clearCookie('m', { domain: 'digitalleman.com', path: '/' });
  res.locals.redirect = req.query.r || null;
  next();
});

app.use('/:language(en|fr|pt)', (req, res, next) => {
  res.locals.language = req.params.language;
  res.locals.path = req.path.replace(/\/$/, '');
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
});

app.get(/^\/(?!en|fr|pt)/, (req, res) => {
  res.redirect(`/${req.acceptsLanguages('en', 'fr', 'pt') || 'en'}${req.originalUrl.replace(/\/$/, '')}`);
});

app.get('/:language(en|fr|pt)', (req, res) => {
  if (!res.locals.token) {
    res.render('sign-in');
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
      res.clearCookie('t', { domain: 'digitalleman.com', path:'/' });
      //res.set('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; secure')
      //res.set('set-cookie', 't=; domain=digitalleman.com; path=/; samesite=strict; secure');
      res.render('sign-in');
    });
  }
});

app.post('/:language(en|fr|pt)', (req, res) => {
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
    res.cookie('t', res.locals.token, { domain: 'digitalleman.com', maxAge: 604740, path: '/', secure: true });
    if (res.locals.redirect) {
      let redirect = `https://${res.locals.redirect}`;
      if (!redirect.includes('digitalleman.com')) redirect += `?t=${res.locals.token}`;
      res.redirect(redirect);
    } else {
      let messages = [res.locals.__('Login Successful')];
      res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
      res.redirect(`/${res.locals.language}`);
    }
  })
  .catch((error) => {
    console.log(error);
    let messages = [res.locals.__('Login Failed')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.clearCookie('t', { domain: 'digitalleman.com', path:'/' });
    res.redirect(`/${res.locals.language}`);
  });
});

app.get('/:language(en|fr|pt)/sign-up', (req, res) => {
  if (!res.locals.token) {
    res.render('sign-up');
  } else {
    res.redirect(`/${res.locals.language}`);
  }
});

app.post('/:language(en|fr|pt)/sign-up', (req, res) => {
  axios.post('https://api.digitalleman.com/v2/auth/local/register', {
    email: req.body.email,
    password: req.body.password,
    username: req.body.email
  },
  {
    headers: {
      'content-type': 'application/json'
    }
  })
  .then((response) => {
    let messages = [res.locals.__('Please validate your email')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.clearCookie('t', { domain: 'digitalleman.com', path:'/' });
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    console.log(error.response);
    let messages = [res.locals.__('Registration Failed')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.clearCookie('t', { domain: 'digitalleman.com', path:'/' });
    res.redirect(`/${res.locals.language}/sign-up`);
  });
});

app.get('/:language(en|fr|pt)/change-password', (req, res, next) => {
  if (res.locals.token) {
    res.render('change-password');
  } else {
    next();
  }
});

app.post('/:language(en|fr|pt)/change-password', (req, res) => {
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
    let messages = [res.locals.__('Password Changed')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.cookie('t', res.locals.token, { domain: 'digitalleman.com', maxAge: 604740, path: '/', secure: true });
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    let messages = [res.locals.__('Password Change Failed')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.redirect(`/${res.locals.language}/change-password`);
  });
});

app.get('/:language(en|fr|pt)/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/:language(en|fr|pt)/forgot-password', (req, res) => {
  axios.post('https://api.digitalleman.com/v2/auth/forgot-password', {
    email: req.body.email
  },
  {
    headers: {
      'content-type': 'application/json'
    }
  })
  .then((response) => {
    let messages = [res.locals.__('Reset Password Email Sent')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    console.log(error);
    let messages = [res.locals.__('Reset Password Email Failed')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.redirect(`/${res.locals.language}/forgot-password`);
  });
});

app.get('/:language(en|fr|pt)/reset-password', (req, res, next) => {
  if(req.query.t) {
    res.locals.token = req.query.t;
    res.render('reset-password');
  } else {
    next();
  }
});

app.post('/:language(en|fr|pt)/reset-password', (req, res) => {
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
    let messages = [res.locals.__('Your password has been reset')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.redirect(`/${res.locals.language}`);
  })
  .catch((error) => {
    let messages = [res.locals.__('Password reset failed')];
    res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
    res.redirect(`/${res.locals.language}/reset-password?t=${req.body.token}`);
  });
});

app.get('/:language(en|fr|pt)/sign-out', (req, res) => {
  let messages = [res.locals.__('Sign Out successful')];
  res.cookie('m', JSON.stringify(messages), { domain: 'digitalleman.com', path: '/', sameSite: true, secure: true });
  res.clearCookie('t', { domain: 'digitalleman.com', path:'/' });
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