const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost/session-cache' })
}));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use('/static', express.static('public'));


app.use('/', require('./routes/admin'));
app.use('/', require('./routes/default'));

app.listen(3000, () => console.log('Server started on port 3000'));