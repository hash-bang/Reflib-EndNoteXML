var events = require('events');
var jp = require('json-pointer');
var moment = require('moment');
var xml2js = require('xml2js');

function parse(xml) {
	var emitter = new events.EventEmitter();
	var library = [];

	var parser = new xml2js.Parser({
		async: true,
		normalizeTags: true,
		normalize: true,
	});

	parser.parseString(xml);

	parser.addListener('error', function(err) {
		emitter.emit('error', err);
	});

	parser.addListener('end', function(json) {
		// Sanity checks {{{
		if (!json.xml) return emitter.emit('error', 'No root "xml" node');
		if (!json.xml.records || !json.xml.records[0]) return emitter.emit('error', 'No "xml.records" array');
		if (!json.xml.records[0].record) return emitter.emit('error', 'No "xml.records.record" array');
		if (!json.xml.records[0].record.length) return emitter.emit('error', 'No "xml.records.record" contents');
		json = json.xml.records[0].record; // Focus on this branch, discarding the others
		// }}}

		json.forEach(function(rawRef) {
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
			emitter.emit('ref', ref);
		});

		emitter.emit('end', json.length);
		parser.reset();
	});

	return emitter;
};

module.exports = {
	parse: parse,
};
