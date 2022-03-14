const MongoClient = require('mongodb').MongoClient;

const client = new MongoClient('mongodb+srv://admin:duoc@cluster0.o074a.mongodb.net/oog?retryWrites=true&w=majority', { useNewUrlParser: true });

const mongo = {
    getDB: async () => { 
        await client.connect();
        const database = client.db('oog');
        return database;
    },
    getCollection: async (collectionName) => { 
        const database = await mongo.getDB();
        const collection = database.collection(collectionName);
        return collection;
    },
}

module.exports = mongo;