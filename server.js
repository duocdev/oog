const port = process.env.port || 3000;


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
    store: MongoStore.create({ mongoUrl: 'mongodb+srv://admin:duoc@cluster0.o074a.mongodb.net/oog?retryWrites=true&w=majority' })
}));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use('/static', express.static('public'));


app.use('/', require('./routes/admin'));
app.use('/', require('./routes/default'));

app.listen(port , () => console.log('Server started on port 3000'));