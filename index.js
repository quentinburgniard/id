import axios from "axios";
import cookieParser from "cookie-parser";
import express from "express";
import fr from "./fr.js";
import morgan from "morgan";
import pt from "./pt.js";
import helmet from "helmet";

const app = express();
const port = process.env.PORT ?? 80;
const DOMAIN = process.env.DOMAIN;
const BASE_URL = process.env.BASE_URL;

app.disable("x-powered-by");
app.set("view cache", false);
app.set("view engine", "pug");
app.set("trust proxy", 1);
app.use(cookieParser());
//app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(
  express.static("public", { index: false, lastModified: false, maxAge: "7d" }),
);
app.use(morgan(":method :url :status"));

app.use((req, res, next) => {
  res.locals.redirect = req.query.r !== undefined;
  res.locals.token = req.cookies.t ?? undefined;
  res.locals.messages = req.cookies.m ? JSON.parse(req.cookies.m) : [];
  res.clearCookie("m", { domain: DOMAIN, path: "/" });
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
      .get(`${BASE_URL}/users/me?populate=role`, {
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
        res.clearCookie("t", { domain: DOMAIN, path: "/" });
        res.render("sign-in");
      });
  }
});

app.post("/:language", (req, res) => {
  axios
    .post(
      `${BASE_URL}/auth/local?populate=role`,
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
      res.cookie("t", res.locals.token, {
        domain: DOMAIN,
        maxAge: 604200000,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
      if (res.locals.redirect) {
        res.redirect(`/${res.locals.language}?r`);
      } else {
        let messages = [res.locals.__("Login Successful")];
        res.cookie("m", JSON.stringify(messages), {
          domain: DOMAIN,
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });
        res.redirect(`/${res.locals.language}`);
      }
    })
    .catch(() => {
      let messages = [res.locals.__("Login Failed")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
      res.clearCookie("t", { domain: DOMAIN, path: "/" });
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
      `${BASE_URL}/auth/change-password`,
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
      let messages = [res.locals.__("Password Changed")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
      res.cookie("t", res.locals.token, {
        domain: DOMAIN,
        maxAge: 604200000,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      let messages = [res.locals.__("Password Change Failed")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
      res.redirect(`/${res.locals.language}/change-password`);
    });
});

app.get("/:language/files", (_, res) => {
  if (!res.locals.token) {
    res.redirect(`/${res.locals.language}`);
  } else {
    axios
      .get(`${BASE_URL}/files`, {
        headers: {
          authorization: `Bearer ${res.locals.token}`,
        },
      })
      .then((response) => {
        console.log(response.data.data);
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
      .post(`${BASE_URL}/files`, req, {
        headers: {
          authorization: `Bearer ${res.locals.token}`,
          "content-type": req.headers["content-type"],
          "content-length": req.headers["content-length"],
        },
      })
      .then(() => {
        let messages = [res.locals.__("File uploaded")];
        res.cookie("m", JSON.stringify(messages), {
          domain: DOMAIN,
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });
        res.redirect(`/${res.locals.language}/files`);
      })
      .catch((err) => {
        console.log(err);
        let messages = [res.locals.__("File upload failed")];
        res.cookie("m", JSON.stringify(messages), {
          domain: DOMAIN,
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });
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
      `${BASE_URL}/auth/forgot-password`,
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
      let messages = [res.locals.__("Reset Password Email Sent")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        sameSite: true,
        secure: true,
      });
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      let messages = [res.locals.__("Reset Password Email Failed")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        sameSite: true,
        secure: true,
      });
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
      `${BASE_URL}/auth/reset-password`,
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
      let messages = [res.locals.__("Your password has been reset")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        sameSite: true,
        secure: true,
      });
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      let messages = [res.locals.__("Password reset failed")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        sameSite: true,
        secure: true,
      });
      res.redirect(
        `/${res.locals.language}/reset-password?t=${req.body.token}`,
      );
    });
});

app.get("/:language/sign-out", (_, res) => {
  let messages = [res.locals.__("Sign Out successful")];
  res.cookie("m", JSON.stringify(messages), {
    domain: DOMAIN,
    path: "/",
    sameSite: true,
    secure: true,
  });
  res.clearCookie("t", { domain: DOMAIN, path: "/" });
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
      `${BASE_URL}/auth/local/register`,
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
      let messages = [res.locals.__("Please validate your email")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
      res.clearCookie("t", { domain: DOMAIN, path: "/" });
      res.redirect(`/${res.locals.language}`);
    })
    .catch(() => {
      let messages = [res.locals.__("Registration Failed")];
      res.cookie("m", JSON.stringify(messages), {
        domain: DOMAIN,
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: true,
      });
      res.clearCookie("t", { domain: DOMAIN, path: "/" });
      res.redirect(`/${res.locals.language}/sign-up`);
    });
});

app.use((_, res) => {
  res.status(404);
  res.send();
});

app.use((_, __, res, ___) => {
  console.log(_, __, ___);
  res.status(500);
  res.send();
});

app.listen(port);
