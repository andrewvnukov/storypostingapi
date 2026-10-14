import path from 'node:path';
import express from 'express';
import session from 'express-session';
import { config } from './config.js';
import { router } from './routes.js';
import { storyRouter } from './story_routes.js';
import { startScheduler } from './scheduler.js';

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(config.root, 'src/views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(config.root, 'public')));
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

app.use(storyRouter);
app.use(router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).render('message', { title: 'Something went wrong', body: err.message });
});

app.listen(config.port, () => {
  console.log(`StoryPostingApi on http://localhost:${config.port}`);
  startScheduler();
});
