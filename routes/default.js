const mongo = require('../database')
const { ObjectId } = require('mongodb');

const express = require('express');
const defaultRouter = express.Router();

defaultRouter.get('/', async (req, res) => {
    return res.redirect('/admin');
});

defaultRouter.get('/verify', async (req, res) => {
    return res.render('pages/error');
});

defaultRouter.get('/verify/:id', async (req, res) => {

    const id = req.params.id;
    if (id.length != 24) { return res.render('pages/error'); }

    const Users = await mongo.getCollection('users');
    const Products = await mongo.getCollection('products');
    const QRCODEs = await mongo.getCollection('qrcodes');

    let qrcode = await QRCODEs.findOne({ _id: ObjectId(id) });
    if (qrcode) {
        if (qrcode.firstCheck == null) {
            qrcode.firstCheck = new Date();
            await QRCODEs.updateOne({ _id: ObjectId(id) }, { $set: { firstCheck: qrcode.firstCheck } });
        }
        qrcode.lastCheck = new Date();
        qrcode.numberCheck++;
        await QRCODEs.updateOne({ _id: ObjectId(id) }, { $set: { lastCheck: qrcode.lastCheck, numberCheck: qrcode.numberCheck } });

        let product = await Products.findOne({ productID: qrcode.productID });
        let user = await Users.findOne({ _id: ObjectId(qrcode.businessID) });
        qrcode.dateCreate = new Date(new ObjectId(qrcode._id).getTimestamp()).toLocaleDateString('vi-VN');
        qrcode.firstCheck = new Date(qrcode.firstCheck).toLocaleDateString('vi-VN');
        qrcode.lastCheck = new Date(qrcode.lastCheck).toLocaleDateString('vi-VN');
        return res.render('pages/verify', { qrcode, product, user });
    }

    return res.render('pages/error');

});


module.exports = defaultRouter;