import axios from 'axios';
import cookieParser from 'cookie-parser';
//import crypto from 'crypto';
import express from 'express';
import morgan from 'morgan';
//import qs from 'qs';

const app = express();
const port = 80;

app.disable('x-powered-by');
app.set('env', 'development');
app.set('view cache', false);
app.set('view engine', 'pug');
app.use(cookieParser());
//app.use(express.json());
//app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public', { index: false, lastModified: false, maxAge: '7d' }));
app.use(morgan('tiny'));

app.use((req, res, next) => {
  res.locals.token = req.cookies.t || null;
  res.locals.redirect = req.query.r || null;
  next();
});

app.get('/', (req, res) => {
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
      res.set('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; samesite=strict; secure')
      //res.set('set-cookie', 't=; domain=digitalleman.com; path=/; samesite=strict; secure');
      res.render('login');
    });
  }
});

app.post('/', (req, res) => {
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
    res.append('set-cookie', `t=${res.locals.token}; domain=digitalleman.com; max-age=604740; path=/; samesite=strict; secure`);
    if (res.locals.redirect) {
      let redirect = `https://${res.locals.redirect}`;
      if (!redirect.includes('digitalleman.com')) redirect += `?t=${res.locals.token}`;
      res.redirect(redirect);
    } else {
      let messages = [];
      res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
      res.redirect('/');
    }
  })
  .catch((error) => {
    console.log(error);
    let messages = [];
    res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.append('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; samesite=strict; secure');
    res.redirect('/');
  });
});

app.get('/change-password', (req, res, next) => {
  if (res.locals.token) {
    res.render('change-password');
  } else {
    next();
  }
});

app.post('/change-password', (req, res) => {
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
    res.append('set-cookie', `t=${res.locals.token}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect('/');
  })
  .catch((error) => {
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect('/change-password');
  });
});

app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

app.post('/forgot-password', (req, res) => {
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
    res.redirect('/');
  })
  .catch((error) => {
    console.log(error);
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect('/forgot-password');
  });
});

app.get('/reset-password', (req, res, next) => {
  if(req.query.t) {
    res.locals.token = req.query.t;
    res.render('reset-password');
  } else {
    next();
  }
});

app.post('/reset-password', (req, res) => {
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
    res.redirect('/');
  })
  .catch((error) => {
    let messages = [];
    res.set('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
    res.redirect(`/reset-password?t=${req.body.token}`);
  });
});

app.get('/sign-out', (req, res) => {
  let messages = [];
  res.append('set-cookie', `m=${JSON.stringify(messages)}; domain=digitalleman.com; path=/; samesite=strict; secure`);
  res.append('set-cookie', 't=; domain=digitalleman.com; max-age=0; path=/; samesite=strict; secure');
  res.redirect('/');
});

app.delete('/chataigniers/:id', (req, res) => {
  res.send();
});

app.get('/chataigniers', (req, res) => {
  let startDate = null;
  if (req.query.startDate) {
    startDate = new Date(req.query.startDate);
  } else {
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1, 1);
  }
  startDate.setHours(0, 0, 0, 0);

  let endDate = null;
  if (req.query.endDate) {
    endDate = new Date(req.query.endDate);
  } else {
    endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3, 0);
  }
  endDate.setHours(23, 59, 59, 999);

  const params = {
    filters: {
      startDate: {
        $gte: startDate.toISOString(),
      },
      endDate: {
        $lte: endDate.toISOString(),
      }
    },
    pagination: {
      limit: -1
    },
    sort: 'startDate'
  }

  axios.get('https://api.digitalleman.com/v2/events?' + qs.stringify(params), {
    headers: {
      'authorization': `Bearer ${req.token}`
    }
  })
  .then((response) => {
    let days = getDays(startDate, endDate);
    let events = response.data.data.map((event) => {
      event.attributes.endDate = new Date(event.attributes.endDate);
      event.attributes.startDate = new Date(event.attributes.startDate);
      return event;
    });
    let nextDay = startDate;
    if (events.length) {
      let found = days.find((day) => {
        let dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        return events.filter(event => event.attributes.startDate >= day && event.attributes.endDate <= dayEnd).length == 0;
      });
      if (found) {
        nextDay = new Date(found);
      } else {
        nextDay = new Date(events[events.length - 1].attributes.startDate);
        nextDay.setDate(nextDay.getDate() + 1);
      }
    } 

    res.render('chataigniers/events', {
      added: req.query.added || null,
      days: days,
      endDate: endDate,
      nextDay: nextDay,
      events: events
    });
  })
  .catch((error) => {
    if ([401, 403].includes(error.response.status)) {
      res.redirect('https://id.digitalleman.com?r=calendar.digitalleman.com%2Fchataigniers')
    }
    res.status(error.response.status);
    res.send();
  });
});

app.get('/chataigniers/new', (req, res) => {
  let startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  let endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3, 0);
  endDate.setHours(23, 59, 59, 999);

  const params = {
    filters: {
      startDate: {
        $gte: startDate.toISOString(),
      },
      endDate: {
        $lte: endDate.toISOString(),
      }
    },
    pagination: {
      limit: -1
    },
    sort: 'startDate'
  }

  axios.get('https://api.digitalleman.com/v2/events?' + qs.stringify(params), {
    headers: {
      'authorization': `Bearer ${req.token}`
    }
  })
  .then((response) => {
    let days = getDays(startDate, endDate);
    let events = response.data.data.map((event) => {
      event.attributes.endDate = new Date(event.attributes.endDate);
      event.attributes.startDate = new Date(event.attributes.startDate);
      return event;
    });
    let nextDay = startDate;
    if (events.length) {
      let found = days.find((day) => {
        let dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        return events.filter(event => event.attributes.startDate >= day && event.attributes.endDate <= dayEnd).length == 0;
      });
      if (found) {
        nextDay = new Date(found);
      } else {
        nextDay = new Date(events[events.length - 1].attributes.startDate);
        nextDay.setDate(nextDay.getDate() + 1);
      }
    } 

    res.render('chataigniers/new', {
      added: req.query.added || null,
      days: days,
      endDate: endDate,
      nextDay: nextDay,
      events: events
    });
  })
  .catch((error) => {
    console.log(error);
    if ([401, 403].includes(error.response.status)) {
      res.redirect('https://id.digitalleman.com?r=calendar.digitalleman.com%2Fchataigniers')
    }
    res.status(error.response.status);
    res.send();
  });
});

app.post('/chataigniers', (req, res) => {
  let endDate = new Date(req.body.date);
  let event = {
    title: 'Les Châtaigniers'
  }
  let startDate = new Date(req.body.date);

  switch (req.body.value) {
    case 'green-5':
      startDate.setHours(8, 0, 0, 0);
      endDate.setHours(19, 30, 0, 0);
      event.description = '5 Vert';
      break;
    case 'blue-7':
      startDate.setHours(10, 0, 0, 0);
      endDate.setHours(19, 30, 0, 0);
      event.description = '7 Bleu';
      break;
    case 'red-7':
      startDate.setHours(10, 30, 0, 0);
      endDate.setHours(19, 30, 0, 0);
      event.description = '7 Rouge';
      break;
    case 'red-f':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      event.description = 'Férié';
      event.title = `Férié (${event.title})`;
      break;
    case 'butterfly':
      startDate.setHours(6, 30, 0, 0);
      endDate.setHours(15, 0, 0, 0);
      event.description = 'Papillon';
      break;
    case 'rh':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      event.description = 'Congé';
      event.title = `Congé (${event.title})`;
      break;
  }
  event.endDate = endDate;
  event.startDate = startDate;
  
  axios.post('https://api.digitalleman.com/v2/events', { data: event }, {
    headers: {
      'authorization': `Bearer ${req.token}`
    }
  })
  .then((response) => {
    res.redirect(303, `/chataigniers/new`);
  })
  .catch((error) => {
    if ([401, 403].includes(error.response.status)) {
      res.redirect('https://id.digitalleman.com?r=calendar.digitalleman.com%2Fchataigniers')
    }
    res.status(error.response.status);
    res.send();
  });
});

app.put('/chataigniers/:id', (req, res) => {
  let endDate = new Date(req.body.date);
  let event = {
    title: 'Les Châtaigniers'
  }
  let startDate = new Date(req.body.date);

  switch (req.body.value) {
    case 'green-5':
      startDate.setHours(8, 0, 0, 0);
      endDate.setHours(19, 30, 0, 0);
      event.description = '5 Vert';
      break;
    case 'blue-7':
      startDate.setHours(10, 0, 0, 0);
      endDate.setHours(19, 30, 0, 0);
      event.description = '7 Bleu';
      break;
    case 'red-7':
      startDate.setHours(10, 30, 0, 0);
      endDate.setHours(19, 30, 0, 0);
      event.description = '7 Rouge';
      break;
    case 'red-f':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      event.description = 'Férié';
      event.title = `Férié (${event.title})`;
      break;
    case 'butterfly':
      startDate.setHours(6, 30, 0, 0);
      endDate.setHours(15, 0, 0, 0);
      event.description = 'Papillon';
      break;
    case 'rh':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      event.description = 'Congé';
      event.title = `Congé (${event.title})`;
      break;
  }
  event.endDate = endDate;
  event.startDate = startDate;
  
  axios.put(`https://api.digitalleman.com/v2/events/${req.params.id}`, { data: event }, {
    headers: {
      'authorization': `Bearer ${req.token}`
    }
  })
  .then((response) => {
    res.status(response.status);
    res.send();
  })
  .catch((error) => {
    res.status(error.response.status);
    res.send();
  });
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