const mongoose = require('mongoose'),
    Schema = mongoose.Schema;


const phonebookScheme = new Schema({
    _id: String,
    company: String,
    fio: String,
    extension: String,
    create: { type: Date, default: Date.now }
}, { versionKey: false });

const Phonebook = mongoose.model("phonebooks", phonebookScheme);

module.exports = Phonebook;