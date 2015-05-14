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

		emitter.emit('end', json.length);
		parser.reset();
	});

	return emitter;
};

module.exports = {
	parse: parse,
};
