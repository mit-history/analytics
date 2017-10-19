/*jshint esversion: 6 */
const app = require('./app.json');
const query = require('./query.json');

(function() {
    [app, query].forEach(file => {
        Object.keys(file).forEach(lang => {
            const languages = Object.keys(file).filter(language => lang !== language);
            Object.keys(file[lang]).filter(key => {
                const missing = languages.filter(language => !file[language][key]);
                if (missing && missing.length > 0) {
                    console.log(`Key ${key} not found for ${missing.join(', ')}`);
                }
            });
        });
    });
}());