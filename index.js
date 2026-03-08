import axios from "axios";
import cookieParser from "cookie-parser";
import express from "express";
import fr from "./fr.js";
import morgan from "morgan";
import pt from "./pt.js";

const app = express();
const port = process.env.PORT ?? 80;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;
const API_BASE_URL = process.env.API_BASE_URL;

function setMessages(res, messages) {
  res.cookie("m", JSON.stringify(messages), {
    domain: COOKIE_DOMAIN,
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });
}

function clearToken(res) {
  res.clearCookie("t", { domain: COOKIE_DOMAIN, path: "/" });
}

function setToken(res) {
  res.cookie("t", res.locals.token, {
    domain: COOKIE_DOMAIN,
    maxAge: 604200000,
    path: "/",
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
}

app.disable("x-powered-by");
app.set("view cache", false);
app.set("view engine", "pug");
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static("public", { index: false, lastModified: false, maxAge: "7d" }),
);
app.use(morgan(":method :url :status"));

app.use((req, res, next) => {
  res.locals.redirect = req.query.r !== undefined;
  res.locals.token = req.cookies.t ?? undefined;
  res.locals.messages = req.cookies.m ? JSON.parse(req.cookies.m) : [];
  res.clearCookie("m", { domain: COOKIE_DOMAIN, path: "/" });
  next();
});

app.use("/:language", (req, res, next) => {
  res.locals.language = req.params.language;
  res.locals.path = req.path.replace(/\/$/, "");
  res.locals.__ = (key) => {
    switch (res.locals.language) {
      case "fr":
        return fr[key] || key;
      case "pt":
        return pt[key] || key;
      case "en":
        return key;
      default:
        res.status(404);
        res.send();
    }
  };
  next();
});

app.get(/^\/(?!en|fr|pt)/, (req, res) => {
  res.redirect(
    `/${
      req.acceptsLanguages("en", "fr", "pt") || "en"
    }${req.originalUrl.replace(/\/$/, "")}`,
  );
});

app.get("/:language", (req, res) => {
  if (!res.locals.token) {
    res.render("sign-in");
  } else {
    axios
      .get(`${API_BASE_URL}/users/me?populate=role`, {
        headers: {
          authorization: `Bearer ${res.locals.token}`,
        },
      })
      .then((response) => {
        if (res.locals.redirect && response.data.role.description) {
          const redirect = new URL(`https://${response.data.role.description}`);
          res.redirect(redirect.toString());
        } else {
          res.locals.email = response.data.email;
          res.render("account");
        }
      })
      .catch(() => {
        clearToken(res);
        res.render("sign-in");
      });
  }
});

app.post("/:language", (req, res) => {
  axios
    .post(
      `${API_BASE_URL}/auth/local?populate=role`,
      {
        identifier: req.body.email,
        password: req.body.password,
      },
      {
        headers: {
          "content-type": "application/json",
        },
      },
    )
    .then((response) => {
      res.locals.email = response.data.user.email;
      res.locals.token = response.data.jwt;
      setToken(res);
      if (res.locals.redirect) {
        res.redirect(`/${res.locals.language}?r`);
      } else {
        setMessages(res, [res.locals.__("Login Successful")]);
        res.redirect(`/${res.locals.language}`);
      }
    })
    .catch(() => {
      setMessages(res, [res.locals.__("Login Failed")]);
      clearToken(res);
      res.redirect(`/${res.locals.language}`);
    });
});

app.get("/:language/change-password", (req, res, next) => {
  if (res.locals.token) {
    res.render("change-password");
  } else {
    next();
  }
});

app.post("/:language/change-password", (req, res) => {
  axios
    .post(
      `${API_BASE_URL}/auth/change-password`,
      {
        currentPassword: req.body.currentPassword,
        password: req.body.password,
        passwordConfirmation: req.body.passwordConfirmation,
      },
      {
        headers: {
          authorization: `Bearer ${res.locals.token}`,
          "content-type": "application/json",
        },
      },
    )
    .then((response) => {
      res.locals.token = response.data.jwt;
      setMessages(res, [res.locals.__("Password Changed")]);
      setToken(res);
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      setMessages(res, [res.locals.__("Password Change Failed")]);
      res.redirect(`/${res.locals.language}/change-password`);
    });
});

app.get("/:language/files", (_, res) => {
  if (!res.locals.token) {
    res.redirect(`/${res.locals.language}`);
  } else {
    axios
      .get(`${API_BASE_URL}/private-files`, {
        headers: {
          authorization: `Bearer ${res.locals.token}`,
        },
      })
      .then((response) => {
        res.render("files", {
          files: response.data.data,
        });
      });
  }
});

app.post("/:language/files", (req, res) => {
  if (!res.locals.token) {
    res.redirect(`/${res.locals.language}`);
  } else {
    axios
      .post(`${API_BASE_URL}/private-files`, req, {
        headers: {
          authorization: `Bearer ${res.locals.token}`,
          "content-type": req.headers["content-type"],
          "content-length": req.headers["content-length"],
        },
      })
      .then(() => {
        setMessages(res, [res.locals.__("File uploaded")]);
        res.redirect(`/${res.locals.language}/files`);
      })
      .catch(() => {
        setMessages(res, [res.locals.__("File upload failed")]);
        res.redirect(`/${res.locals.language}/files`);
      });
  }
});

app.get("/:language/forgot-password", (_, res) => {
  res.render("forgot-password");
});

app.post("/:language/forgot-password", (req, res) => {
  axios
    .post(
      `${API_BASE_URL}/auth/forgot-password`,
      {
        email: req.body.email,
      },
      {
        headers: {
          "content-type": "application/json",
        },
      },
    )
    .then(() => {
      setMessages(res, [res.locals.__("Reset Password Email Sent")]);
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      setMessages(res, [res.locals.__("Reset Password Email Failed")]);
      res.redirect(`/${res.locals.language}/forgot-password`);
    });
});

app.get("/:language/reset-password", (req, res, next) => {
  if (req.query.t) {
    res.locals.token = req.query.t;
    res.render("reset-password");
  } else {
    next();
  }
});

app.post("/:language/reset-password", (req, res) => {
  axios
    .post(
      `${API_BASE_URL}/auth/reset-password`,
      {
        code: req.body.token,
        password: req.body.password,
        passwordConfirmation: req.body.passwordConfirmation,
      },
      {
        headers: {
          "content-type": "application/json",
        },
      },
    )
    .then(() => {
      setMessages(res, [res.locals.__("Your password has been reset")]);
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      setMessages(res, [res.locals.__("Password reset failed")]);
      res.redirect(
        `/${res.locals.language}/reset-password?t=${req.body.token}`,
      );
    });
});

app.get("/:language/sign-out", (_, res) => {
  setMessages(res, [res.locals.__("Sign Out successful")]);
  clearToken(res);
  res.redirect(`/${res.locals.language}`);
});

app.get("/:language/sign-up", (_, res) => {
  if (!res.locals.token) {
    res.render("sign-up");
  } else {
    res.redirect(`/${res.locals.language}`);
  }
});

app.post("/:language/sign-up", (req, res) => {
  axios
    .post(
      `${API_BASE_URL}/auth/local/register`,
      {
        email: req.body.email,
        password: req.body.password,
        username: req.body.email,
      },
      {
        headers: {
          "content-type": "application/json",
        },
      },
    )
    .then(() => {
      setMessages(res, [res.locals.__("Please validate your email")]);
      clearToken(res);
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      setMessages(res, [res.locals.__("Registration Failed")]);
      clearToken(res);
      res.redirect(`/${res.locals.language}/sign-up`);
    });
});

app.use((_, res) => {
  res.status(404);
  res.send();
});

app.use((_, __, res, ___) => {
  res.status(500);
  res.send();
});

app.listen(port);
