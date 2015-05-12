var async = require('async-chainable');
var events = require('events');
var jp = require('json-pointer');
var moment = require('moment');
var xml2js = require('xml2js');

function parse(xml, finish) {
	var emitter = new events.EventEmitter();
	var library = [];

	async()
		.then('json', function(next) {
			xml2js.parseString(xml, {
				normalizeTags: true,
				normalize: true,
			}, next);
		})
		.then(function(next) { // Sanity checks
			if (!this.json.xml) return next('No root "xml" node');
			if (!this.json.xml.records || !this.json.xml.records[0]) return next('No "xml.records" array');
			if (!this.json.xml.records[0].record) return next('No "xml.records.record" array');
			if (!this.json.xml.records[0].record.length) return next('No "xml.records.record" contents');
			this.json = this.json.xml.records[0].record; // Focus on this branch, discarding the others
			next();
		})
		.forEach('json', function(next, rawRef) {
			var ref = {};

			// Complex extractions {{{
			ref.recNumber = jp.get(rawRef, '/rec-number/0');
			ref.type = jp.get(rawRef, '/ref-type/0/$/name');
			if (jp.has(rawRef, '/titles/0/title/0/style/0/_')) ref.title = jp.get(rawRef, '/titles/0/title/0/style/0/_');
			if (jp.has(rawRef, '/titles/0/secondary-title/0/style/0/_')) ref.titleSecondary = jp.get(rawRef, '/titles/0/secondary-title/0/style/0/_');
			// }}}
			// Authors {{{
			if (jp.has('/contributors/0/authors/0/author/0')) {
				ref.authors = jp.get('/contributors/0/authors/0/author/0').forEach(function(rawAuthor) {
					return rawAuthor['style'][0]['_'];
				});
			}
			// }}}
			// Key to key extractions {{{
			[
				['pages','pages'],
				['volume', 'volume'],
				['number', 'number'],
				['isbn', 'isbn'],
				['abstract', 'abstract'],
				['label', 'label'],
				['caption', 'caption'],
				['notes', 'notes'],
				['address', 'auth-address'],
				['researchNotes', 'research-notes'],
			].forEach(function(extract) {
				var path = '/' + extract[1] + '/0/style/0/_';
				if (jp.has(rawRef, path)) ref[extract[0]] = jp.get(rawRef, path);
			});
			// }}}
			// Dates {{{
			var hasYear = jp.has(rawRef, '/dates/0/year/style/0/_');
			var hasDate = jp.has(rawRef, '/dates/0/pub-dates/0/data/0/style/0/_');
			if (hasYear && hasDate) { // Full date
				jp.date = moment(jp.get(rawRef, '/dates/0/pub-dates/0/data/0/style/0/_') + ' ' + jp.get(rawRef, '/dates/0/year/style/0/_')).toDate();
			} else if (hasYear) {
				jp.date = moment(jp.get(rawRef, '/dates/0/year/style/0/_') + '-01-01').toDate();
			} else if (hasDate) {
				jp.date = jp.get(rawRef, '/dates/0/pub-dates/0/data/0/style/0/_');
			}
			// }}}
			// URLs {{{
			if (jp.has(rawRef, '/urls/0/related-urls/0/url')) {
				ref.urls = rawRef['urls'][0]['related-urls'][0]['url'].map(function(rawURL) { return rawURL['style'][0]['_'] });
			}
			// }}}
			console.log('EMIT', ref.recNumber, ref.title);
			emitter.emit('reference', ref);
			next();
		})
		.end(function(err) {
			if (err) return finish(err);
			finish(null, library);
		});

	return emitter;
};

module.exports = {
	parse: parse,
};
