const crypto = require('crypto');
const multer = require('multer');
const upload = multer();
const QRCODE = require('qrcode');


const { ObjectId } = require('mongodb');
const mongo = require('../database');
const express = require('express');
const console = require('console');
const adminRouter = express.Router();


// register
adminRouter.get('/register', (req, res) => {
    res.render('admin/register');
});

adminRouter.post('/register', async (req, res) => {

    const Users = await mongo.getCollection('users');

    const user = await Users.findOne({ email: req.body.email });
    if (user) {
        console.log('Email đã được đăng ký');
        return res.json({ status: 'error', message: 'Email đã được đăng ký' });
    }

    const password = req.body.password;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    const newUser = {
        businessName: req.body.name,
        address: req.body.address,
        hotline: req.body.hotline,
        website: req.body.website,
        email: req.body.email,
        password: hash,
        salt: salt
    };

    await Users.insertOne(newUser);

    return res.json({ status: 'success' });
});



// login
adminRouter.get('/login', (req, res) => {
    res.render('admin/login');
});

adminRouter.post('/login', async (req, res) => {

    const Users = await mongo.getCollection('users');

    const getUser = await Users.findOne({ email: req.body.email });
    if (!getUser) {
        console.log('Email chưa đăng ký trên hệ thống');
        return res.json({ status: 'error', message: 'Email chưa đăng ký trên hệ thống' });
    } else {
        const password = req.body.password;
        const hash = crypto.pbkdf2Sync(password, getUser.salt, 1000, 64, 'sha512').toString('hex');

        if (hash === getUser.password) {
            req.session.user = getUser;
            return res.json({ status: 'success' });
        } else {
            console.log('Mật khẩu không đúng');
            return res.json({ status: 'error', message: 'Mật khẩu không đúng' });
        }
    }

});

// logout
adminRouter.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// forgot password
adminRouter.get('/forgot-password', (req, res) => {
    res.render('admin/forgot-password');
});

adminRouter.post('/forgot-password', async (req, res) => {
    console.log('Forgot password request received', req.body);

    const Users = await mongo.getCollection('users');

    const user = await Users.findOne({ email: req.body.email, salt: req.body.secret });

    if (!user) {
        return res.json({ status: 'error', message: 'Wrong!' });
    }

    const password = crypto.randomBytes(10).toString('hex');
    const newHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
    const update = await Users.updateOne({ _id: user._id }, { $set: { password: newHash } });

    return res.json({
        status: 'success',
        message: 'Password reset',
        newPassword: password

    });

});

// Dashboard

adminRouter.get('/admin', (req, res) => {
    res.redirect('/admin/dashboard');
});

adminRouter.get('/admin/dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Admin dashboard requested');

    const Products = await mongo.getCollection('products');
    const QRCODEs = await mongo.getCollection('qrcodes');

    let countProduct = await Products.countDocuments();
    let countQRCODE = await QRCODEs.countDocuments();



    res.render('admin/dashboard', { user: req.session.user, countProduct, countQRCODE });
});

// Add Product

adminRouter.get('/admin/add-product', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Add product requested');
    const user = req.session.user;
    res.render('admin/add-product', { user: user });
});


adminRouter.post('/admin/add-product', upload.any(), async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Add product request received', req.body);

    const { maSanPham, tenSanPham, xuatXu, websiteGioiThieu, thongTinChiTiet }
        = req.body;

    const Products = await mongo.getCollection('products');

    const product = await Products.findOne({ productID: maSanPham.toUpperCase() });

    if (product) {
        console.log('Sản phẩm đã tồn tại');
        return res.json({ status: 'error', message: 'Sản phẩm đã tồn tại' });
    }

    const base64 = "data:" + req.files[0]?.mimetype + ";base64," + req.files[0]?.buffer.toString('base64');

    const newProduct = {
        businessID: req.session.user._id,
        image: base64,
        productID: maSanPham.toUpperCase(),
        productName: tenSanPham,
        productDescription: thongTinChiTiet,
        productOrigin: xuatXu,
        productWebsite: websiteGioiThieu
    };

    await Products.insertOne(newProduct);

    return res.json({ status: 'success' });
});

// list product
adminRouter.get('/admin/list-product', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('List product requested');

    const user = req.session.user;


    const Products = await mongo.getCollection('products');
    let products = await Products.find({ businessID: user._id }).toArray();


    products = products.map(product => {
        product.dateCreate = new Date(new ObjectId(product._id).getTimestamp()).toLocaleDateString('vi-VN');
        return product;
    });

    res.render('admin/list-product', {
        products, user
    });

});


// edit product
adminRouter.get('/admin/edit-product/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Edit product requested');

    const user = req.session.user;

    const Products = await mongo.getCollection('products');
    const product = await Products.findOne({ _id: new ObjectId(req.params.id) });

    res.render('admin/edit-product', {
        product, user
    });
});

adminRouter.post('/admin/edit-product', upload.any(), async (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Edit product request received', req.body);

    const { maSanPham, tenSanPham, xuatXu, websiteGioiThieu, thongTinChiTiet }
        = req.body;

    const Products = await mongo.getCollection('products');

    const product = await Products.findOne({ productID: maSanPham });
    if (!product) {
        console.log('Sản phẩm không tồn tại');
        return res.json({ status: 'error', message: 'Sản phẩm không tồn tại' });
    }
    if (req.files[0] == null) {
        await Products.updateOne({ _id: product._id }, {
            $set: {
                productName: tenSanPham,
                productDescription: thongTinChiTiet,
                productOrigin: xuatXu,
                productWebsite: websiteGioiThieu
            }
        });
        return res.json({ status: 'success' });
    }

    const base64 = "data:" + req.files[0]?.mimetype + ";base64," + req.files[0]?.buffer.toString('base64');
    await Products.updateOne({ _id: product._id }, {
        $set: {
            image: base64,
            productName: tenSanPham,
            productDescription: thongTinChiTiet,
            productOrigin: xuatXu,
            productWebsite: websiteGioiThieu
        }
    });

    return res.json({ status: 'success' });

});

// delete product
adminRouter.get('/admin/delete-product/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Delete product requested');

    const user = req.session.user;

    const Products = await mongo.getCollection('products');
    const product = await Products.findOne({ _id: new ObjectId(req.params.id) });


    res.render('admin/delete-product', { user, product });
});

adminRouter.post('/admin/delete-product', async (req, res) => {

    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Delete product request received', req.body);

    const { maSanPham } = req.body;

    const Products = await mongo.getCollection('products');
    await Products.deleteOne({ productID: maSanPham });
    const QRCODEs = await mongo.getCollection('qrcodes');
    await QRCODEs.deleteMany({ productID: maSanPham });

    return res.json({ status: 'success' });

});

// create qrcode
adminRouter.get('/admin/create-qrcode', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Create qrcode requested');
    const user = req.session.user;

    const Products = await mongo.getCollection('products');
    let products = await Products.find({ businessID: user._id }).toArray();

    res.render('admin/create-qrcode', {
        products, user
    });
});

adminRouter.post('/admin/create-qrcode', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Create qrcode request received', req.body);

    const { maSanPham, soLuong } = req.body;

    const QRCODEs = await mongo.getCollection('qrcodes');

    const list_sp = [];

    for (let i = 0; i < soLuong; i++) {

        let newQRCODE = {
            _id: new ObjectId(),
            businessID: req.session.user._id,
            productID: maSanPham,
            status: 'Đang lưu hành',
            firstCheck: null,
            lastCheck: null,
            numberCheck: 0
        }

        list_sp.push(newQRCODE);
    }

    const result = await QRCODEs.insertMany(list_sp);

    let list_qrcode = [];

    const Products = await mongo.getCollection('products');
    const product = await Products.findOne({ productID: maSanPham });

    for (let i = 0; i < result.insertedCount; i++) {
        let qrcode = await QRCODE.toDataURL("http://" + req.headers.host.toString() + "/verify/" + result.insertedIds[i]);
        list_qrcode.push({ image: qrcode, seri: result.insertedIds[i], productID: product.productID });
    }


    res.send(list_qrcode);

});


// list qrcode
adminRouter.get('/admin/list-qrcode', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('List qrcode requested');
    const user = req.session.user;

    const QRCODEs = await mongo.getCollection('qrcodes');
    let qrcodes = await QRCODEs.find({ businessID: user._id }).toArray();

    const Products = await mongo.getCollection('products');
    let products = await Products.find({ businessID: user._id }).toArray();


    qrcodes = qrcodes.map(qrcode => {
        qrcode.dateCreate = new Date(new ObjectId(qrcode._id).getTimestamp()).toLocaleDateString('vi-VN');
        qrcode.firstCheck = qrcode.firstCheck ? new Date(qrcode.firstCheck).toLocaleDateString('vi-VN') : null;
        qrcode.lastCheck = qrcode.lastCheck ? new Date(qrcode.lastCheck).toLocaleDateString('vi-VN') : null;
        qrcode.productName = products.find(product => product.productID == qrcode.productID)?.productName;
        return qrcode;
    });


    res.render('admin/list-qrcode', {
        qrcodes, user
    });

});

// change password
adminRouter.get('/admin/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Change password requested');
    const user = req.session.user;

    res.render('admin/change-password', { user });
});

adminRouter.post('/admin/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Change password request received', req.body);

    const { passwordOld, passwordNew } = req.body;

    const Users = await mongo.getCollection('users');
    const user = await Users.findOne({ _id: new ObjectId(req.session.user._id) });

    let hashOld = crypto.pbkdf2Sync(passwordOld, user.salt, 1000, 64, 'sha512').toString('hex');

    if (user.password !== hashOld) {
        return res.json({ status: 'fail', message: 'Mật khẩu cũ không đúng' });
    }

    let hashNew = crypto.pbkdf2Sync(passwordNew, user.salt, 1000, 64, 'sha512').toString('hex');
    await Users.updateOne({ _id: new ObjectId(user._id) }, {
        $set: {
            password: hashNew
        }
    });

    req.session.user = await Users.findOne({ _id: new ObjectId(req.session.user._id) });

    return res.json({ status: 'success' });

});

// info
adminRouter.get('/admin/info', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Info requested');
    const user = req.session.user;

    res.render('admin/info', { user });
});

adminRouter.post('/admin/info', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    console.log('Info request received', req.body);

    const { businessName, hotline, email, website, address } = req.body;

    const Users = await mongo.getCollection('users');
    await Users.updateOne({ _id: new ObjectId(req.session.user._id) }, {
        $set: {
            businessName, hotline, email, website, address
        }
    });

    req.session.user = await Users.findOne({ _id: new ObjectId(req.session.user._id) });

    return res.json({ status: 'success' });

});



module.exports = adminRouter;