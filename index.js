var _ = require('lodash');
var async = require('async-chainable');
var events = require('events');
var jp = require('json-pointer');
var moment = require('moment');
var xml2js = require('xml2js');

var types = [
	{rlId: 'aggregatedDatabase', enText: 'Aggregated Database', enId: 55},
	{rlId: 'ancientText', enText: 'Ancient Text', enId: 51},
	{rlId: 'artwork', enText: 'Artwork', enId: 2},
	{rlId: 'audiovisualMaterial', enText: 'Audiovisual Material', enId: 3},
	{rlId: 'bill', enText: 'Bill', enId: 4},
	{rlId: 'blog', enText: 'Blog', enId: 56},
	{rlId: 'book', enText: 'Book', enId: 6},
	{rlId: 'bookSection', enText: 'Book Section', enId: 5},
	{rlId: 'case', enText: 'Case', enId: 7},
	{rlId: 'catalog', enText: 'Catalog', enId: 8},
	{rlId: 'chartOrTable', enText: 'Chart or Table', enId: 38},
	{rlId: 'classicalWork', enText: 'Classical Work', enId: 49},
	{rlId: 'computerProgram', enText: 'Computer Program', enId: 9},
	{rlId: 'conferencePaper', enText: 'Conference Paper', enId: 47},
	{rlId: 'conferenceProceedings', enText:', Conference Proceedings', enId: 10},
	{rlId: 'dataset', enText: 'Dataset.', enId: 59},
	{rlId: 'dictionary', enText: 'Dictionary', enId: 52},
	{rlId: 'editedBook', enText: 'Edited Book', enId: 28},
	{rlId: 'electronicArticle', enText: 'Electronic Article', enId: 43},
	{rlId: 'electronicBookSection', enText:', Electronic Book Section', enId: 60},
	{rlId: 'encyclopedia', enText: 'Encyclopedia', enId: 53},
	{rlId: 'equation', enText: 'Equation', enId: 39},
	{rlId: 'figure', enText: 'Figure', enId: 37},
	{rlId: 'filmOrBroadcast', enText: 'Film or Broadcast', enId: 21},
	{rlId: 'generic', enText: 'Generic', enId: 13},
	{rlId: 'governmentDocument', enText: 'Government Document', enId: 46},
	{rlId: 'grant', enText: 'Grant', enId: 54},
	{rlId: 'hearing', enText: 'Hearing', enId: 14},
	{rlId: 'journalArticle', enText: 'Journal Article', enId: 17},
	{rlId: 'legalRuleOrRegulation', enText:', Legal Rule or Regulation', enId: 50},
	{rlId: 'magazineArticle', enText: 'Magazine Article', enId: 19},
	{rlId: 'manuscript', enText: 'Manuscript', enId: 36},
	{rlId: 'map', enText: 'Map', enId: 20},
	{rlId: 'music', enText: 'Music', enId: 61},
	{rlId: 'newspaperArticle', enText: 'Newspaper Article', enId: 23},
	{rlId: 'onlineDatabase', enText: 'Online Database', enId: 45},
	{rlId: 'onlineMultimedia', enText: 'Online Multimedia', enId: 48},
	{rlId: 'pamphlet', enText: 'Pamphlet', enId: 24},
	{rlId: 'patent', enText: 'Patent', enId: 25},
	{rlId: 'personalCommunication', enText:', Personal Communication', enId: 26},
	{rlId: 'report', enText: 'Report', enId: 27},
	{rlId: 'serial', enText: 'Serial', enId: 57},
	{rlId: 'standard', enText: 'Standard', enId: 58},
	{rlId: 'statute', enText: 'Statute', enId: 31},
	{rlId: 'thesis', enText: 'Thesis', enId: 32},
	{rlId: 'unpublished', enText: 'Unpublished Work', enId: 34},
	{rlId: 'web', enText: 'Web Page', enId: 12},
];

/**
* Translate an EndNote type to a RefLib type
* This function uses memorize caching
* @param string enType The EndNote type to translate
* @return string the RefLib type
*/
var getTypeELtoRL = _.memoize(function(enType) {
	var found = _.find(types, {enText: enType});
	return found ? found.rlId : false;
});

/**
* Get the type record from the RefLib ID
* @param string rlId The RefLib type ID
* @return object The object in the types collection
*/
var getTypeRLtoEL = _.memoize(function(rlId) {
	var found = _.find(types, {rlId: rlId});
	return found;
});

function parse(xml) {
	var emitter = new events.EventEmitter();
	var library = [];
	var hasErr = false;
	var ended  = false;

	var parser = new xml2js.Parser({
		async: true,
		normalizeTags: true,
		normalize: true,
	});

	parser.addListener('error', function(err) {
		hasErr = true;
		emitter.emit('error', err);
	});

	parser.addListener('end', function(json) {
		if (hasErr) return;
		if (ended) return; // For some reason the 'end' event can be called multiple times
		ended = true;
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
			if (jp.has(rawRef, '/titles/0/title/0/style/0/_')) ref.title = jp.get(rawRef, '/titles/0/title/0/style/0/_');
			if (jp.has(rawRef, '/titles/0/secondary-title/0/style/0/_')) ref.titleSecondary = jp.get(rawRef, '/titles/0/secondary-title/0/style/0/_');
			// }}}
			// Type {{{
			if (jp.has(rawRef, '/ref-type/0/$/name')) {
				var rawType = jp.get(rawRef, '/ref-type/0/$/name');
				var rlType = getTypeELtoRL(rawType);
				if (!rlType) throw new Error('Unknown EndNote type: ' + rawType);
				ref.type = rlType;
			}
			// }}}
			// Authors {{{
			if (jp.has('/contributors/0/authors/0/author/0')) {
				ref.authors = jp.get('/contributors/0/authors/0/author/0').forEach(function(rawAuthor) {
					return rawAuthor['style'][0]['_'];
				});
			}
			// }}}
			// Key to key extractions {{{
			_.forEach({
				pages: 'pages',
				volume: 'volume',
				number: 'number',
				isbn: 'isbn',
				abstract: 'abstract',
				label: 'label',
				caption: 'caption',
				notes: 'notes',
				address: 'auth-address',
				researchNotes: 'research-notes',
			}, function(rlKey, enKey) {
				var path = '/' + enKey + '/0/style/0/_';
				if (jp.has(rawRef, path)) ref[rlKey] = jp.get(rawRef, path);
			});
			// }}}
			// Dates {{{
			var hasYear = jp.has(rawRef, '/dates/0/year/style/0/_');
			var hasDate = jp.has(rawRef, '/dates/0/pub-dates/0/data/0/style/0/_');
			if (hasYear && hasDate) { // Full date
				jp.date = moment(jp.get(rawRef, '/dates/0/pub-dates/0/data/0/style/0/_') + ' ' + jp.get(rawRef, '/dates/0/year/style/0/_')).toDate();
			} else if (hasYear) {
				jp.date = jp.get(rawRef, '/dates/0/year/style/0/_');
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

		parser = null;
		emitter.emit('end', json.length);
	});

	setTimeout(function() { // Perform parser in async so the function will return the emitter otherwise an error could be thrown before the emitter is ready
		parser.parseString(xml);
	});

	return emitter;
};

function output(options) {
	var settings = _.defaults(options, {
		stream: null,
		xmlOptions: {
			file: 'EndNote.enl',
		},
		defaultType: 'report', // Assume this reference type if we are not provided with one
		encode: function(ref) {
			settings.recordOffset++;

			var output =
				'<database name="' + settings.xmlOptions.file + '" path="c:\\' + settings.xmlOptions.file + '">' + settings.escape(settings.xmlOptions.file) + '</database>' +
				'<source-app name="EndNote" version="16.0">EndNote</source-app>' +
				'<rec-number>' + (ref.recNumber || settings.recordOffset) + '</rec-number>' +
				'<foreign-keys><key app="EN" db-id="s55prpsswfsepue0xz25pxai2p909xtzszzv">' + ref.recordOffset + '</key></foreign-keys>';

			var foundType = getTypeRLtoEL(ref.type || settings.defaultType);
			if (!foundType) return next('Unknown or unsuppoted reference type: ' + ref.type);
			output += '<ref-type name="' + foundType.enId + '">' + settings.escape(foundType.enText) + '</ref-type>';

			output += '<contributors><authors>' +
				ref.authors.map(function(author) {
					return '<author><style face="normal" font="default" size="100%">' + settings.escape(author) + '</style></author>';
				}) + 
				'</authors></contributors>';


			output += '<titles>' +
				(ref.title ? '<title><style face="normal" font="default" size="100%">' + settings.escape(ref.title) + '</style></title>' : '') +
				(ref.titleSecondary ? '<secondary-title><style face="normal" font="default" size="100%">' + settings.escape(ref.titleSecondary) + '</style></secondary-title>' : '') +
				(ref.titleShort ? '<short-title><style face="normal" font="default" size="100%">' + settings.escape(ref.titleShort) + '</style></short-title>' : '') +
				(ref.journalAlt ? '<alt-title><style face="normal" font="default" size="100%">' + settings.escape(ref.journalAlt) + '</style></alt-title>' : '') +
				'</titles>';

			if (ref.periodical)
				output += '<periodical><full-title><style face="normal" font="default" size="100%">' + settings.escape(ref.periodical) + '</style></full-title></periodical>';

			_.forEach({
				'accessDate': 'access-date',
				'accession': 'accession-num',
				'address': 'auth-address',
				'doi': 'electronic-resource-num',
				'pages': 'pages',
				'volume': 'volume',
				'number': 'number',
				'section': 'section',
				'abstract': 'abstract',
				'isbn': 'isbn',
				'label': 'label',
				'caption': 'caption',
				'language': 'language',
				'notes': 'notes',
				'researchNotes': 'research-notes',
				'databaseProvider': 'remote-database-provider',
				'database': 'remote-database-name',
				'workType': 'work-type',
				'custom1': 'custom1',
				'custom2': 'custom2',
				'custom3': 'custom3',
				'custom4': 'custom4',
				'custom5': 'custom5',
				'custom6': 'custom6',
				'custom7': 'custom7',
			}, function(rlKey, enKey) {
				if (ref[rlKey])
					output += '<' + enKey + '><style face="normal" font="default" size="100%">' + settings.escape(ref[rlKey]) + '</style></' + enKey + '>';
			});

			output += '<dates>';
			if (_.isDate(ref.date)) {
				output += 
					'<year><style face="normal" font="default" size="100%">' + ref.date.getYear() + '</style></year>' +
					'<pub-dates><date><style face="normal" font="default" size="100%">' + moment(ref.date).format('YYYY-MM-DD') + '</style></date></pub-dates>';
			} else {
				output += '<pub-dates><date><style face="normal" font="default" size="100%">' + ref.date + '</style></date></pub-dates>';
			}
			output += '</dates>';

			if (ref.urls)
				output += '<urls><related-urls>' +
					ref.urls.map(function(url) { return '<url><style face="normal" font="default" size="100%">' + url + '</style></url>' }) +
					'</related-urls></urls>';

			if (ref.keywords) 
				output += '<keywords>' +
					ref.keywords.map(function(keyword) { return '<keyword><style face="normal" font="default" size="100%">' + keyword + '</style></keyword>' }) +
					'</keywords>';

			return '<record>' + output + '</record>';
		},
		escape: function(str) {
			return ('' + str)
				.replace("\r", '&#13;')
				.replace('&', '&amp;')
				.replace('<', '&lt;')
				.replace('>', '&gt;');
		},
		recordOffset: 0,
		content: [],
	});

	async()
		// Sanity checks {{{
		.then(function(next) {
			if (!settings.stream) return('A writable \'stream\' option must be specified');
			next();
		})
		// }}}

		// Header {{{
		.then(function(next) {
			settings.stream.write('<?xml version="1.0" encoding="UTF-8"?><xml><records>');
			next();
		})
		// }}}

		// References {{{
		.then(function(next) {
			if (_.isArray(settings.content)) { // Array of refs
				settings.content.forEach(function(ref) {
					settings.stream.write(settings.encode(ref));
				});
				next();
			} else if (_.isObject(settings.content)) { // Single ref
				settings.stream.write(settings.encode(settings.content));
				next();
			} else if (_.isFunction(settings.context)) { // Callback
				var fetcher = function() {
					var batch = settings.fetch();
					if (_.isArray(batch)) { // Callback provided array
						batch.forEach(function(ref) {
							settings.stream.write(settings.encode(ref));
						});
						setTimeout(fetcher);
					} else if(_.isObject(batch)) { // Callback provided single ref
						settings.stream.write(settings.encode(batch));
						setTimeout(fetcher);
					} else { // End of stream
						next();
					}
				};
			}
		})
		// }}}

		// Footer {{{
		.then(function(next) {
			settings.stream.write('</records></xml>');
			next();
		})
		// }}}

		.end(function(err) {
			settings.stream.end();
			if (err) throw new Error(err);
		});

	return settings.stream;
}

module.exports = {
	output: output,
	parse: parse,
};
