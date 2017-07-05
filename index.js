var _ = require('lodash').mixin({
	isStream: require('isstream'),
});

var async = require('async-chainable');
var entities = require('entities');
var events = require('events');
var fs = require('fs');
var moment = require('moment');
var sax = require('sax');
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
	{rlId: 'conferenceProceedings', enText: 'Conference Proceedings', enId: 10},
	{rlId: 'dataset', enText: 'Dataset', enId: 59},
	{rlId: 'dictionary', enText: 'Dictionary', enId: 52},
	{rlId: 'editedBook', enText: 'Edited Book', enId: 28},
	{rlId: 'electronicArticle', enText: 'Electronic Article', enId: 43},
	{rlId: 'electronicBook', enText: 'Electronic Book', enId: 44},
	{rlId: 'electronicBookSection', enText: 'Electronic Book Section', enId: 60},
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
	{rlId: 'personalCommunication', enText: 'Personal Communication', enId: 26},
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


/**
* Default string -> XML encoder
* @param string str The input string to encode
*/
function _escape(str) {
	return ('' + str)
		.replace(/&/g, '&amp;')
		.replace(/\r/g, '&#13;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

function parse(input) {
	var emitter = new events.EventEmitter();

	// Setup parser {{{
	var parser;
	if (_.isStream(input)) {
		parser = sax.createStream(true, {});
	} else if (_.isString(input) || _.isBuffer(input)) {
		parser = sax.parser(true);
		parser.on = function(event, cb) { // Quick binder to simulate on() behaviour
			parser['on' + event] = cb;
			return parser;
		};
	} else {
		throw new Error('Unknown input type for parse(): ' + (typeof input));
	}
	// }}}
	// Setup record parser {{{
	var recParser = new xml2js.Parser({
		async: false, // We will handle our own async
		normalizeKeywords: true,
		normalize: true,
	});
	// }}}
	// Setup events {{{
	var ref;
	var inRef = false;
	var hasErr = false;
	parser
		.on('error', function (e) {
			if (hasErr) {
				parser.end();
				return; // Already errored
			}

			hasErr = true;
			parser.end();
			emitter.emit('error', e);
		})
		.on('opentag', function(node) {
			// Fire `progress` emitter if we know enough to update that {{{
			if (parser._parser && parser._parser.position) {
				emitter.emit('progress', parser._parser.position, parser._parser.length || undefined);
			} else if (parser.position && input.length) {
				emitter.emit('progress', parser.position, input.length);
			}
			// }}}

			if (node.name == 'record') {
				ref = '<?xml version="1.0" encoding="UTF-8"?><xml><records>';
				inRef = true;
			}

			ref += '<' + node.name

			if (node.name != 'style') // Dont bother saving these attribs
				_.forEach(node.attributes, function(v, k) {
					ref += ' ' + k + '="' + entities.encodeXML(v) + '"';
				});

			ref += '>';
		})
		.on('closetag', function(tag) {
			if (inRef && tag == 'record') {
				ref += '</' + tag + '></records></xml>';
				recParser.parseString(ref, function(err, json) {
					var parsedRef = _parseRef(json);
					emitter.emit('ref', parsedRef);
				});
				ref = null;
				inRef = false;
			} else if (inRef) {
				ref += '</' + tag + '>';
			}
		})
		.on('text', function(text) {
			if (inRef) ref += entities.encodeXML(text);
		})
		.on('cdata', function(data) {
			if (inRef) ref += '<![CDATA[' + data + ']]>';
		})
		.on('end', function() {
			if (!hasErr) emitter.emit('end');
		});
	// }}}
	// Feed into parser {{{
	// NOTE: We have to do this in an async thread otherwise we can't return the emitter as a function return
	async()
		// Try to populate the parser stream length from the file name stats if the stream looks like an accessible file {{{
		.then(function(next) {
			if (_.isStream(input) && input.path) {
				fs.stat(input.path, function(err, stat) {
					if (err) return next(err);
					parser._parser.length = stat.size;
					next();
				});
			} else {
				next();
			}
		})
		// }}}
		// Invoke the parser {{{
		.then(function(next) {
			if (_.isStream(input)) {
				input.pipe(parser);
			} else if (_.isString(input) || _.isBuffer(input)) {
				parser.write(input).close();
			}
			next();
		})
		// }}}
		// End - Very basic error handling for this early in the loader order {{{
		.end(function(err) {
			if (err) emitter.emit('error', err);
			// Everything else handled by the SAX emitters
		});
		// }}}
	// }}}

	return emitter;
};

function _parseRef(json) {
	var ref = {};

	var rawRef = json.xml.records[0].record[0];

	// Complex extractions {{{
	ref.recNumber = _.get(rawRef, 'rec-number.0');
	if (_.has(rawRef, 'titles.0.title.0')) ref.title = _.get(rawRef, 'titles.0.title.0.style.0') || _.get(rawRef, 'titles.0.title.0');
	if (_.has(rawRef, 'titles.0.secondary-title.0')) ref.journal = _.get(rawRef, 'titles.0.secondary-title.0.style.0') || _.get(rawRef, 'titles.0.secondary-title.0');;
	if (_.has(rawRef, 'auth-address.0')) ref.address = _.get(rawRef, 'auth-address.0.style.0') || _.get(rawRef, 'auth-address.0');;
	if (_.has(rawRef, 'research-notes.0')) ref.researchNotes = _.get(rawRef, 'research-notes.0.style.0') || _.get(rawRef, 'research-notes.0');;
	// }}}
	// Type {{{
	if (_.has(rawRef, 'ref-type.0.$.name')) {
		var rawType = _.get(rawRef, 'ref-type.0.$.name');
		var rlType = getTypeELtoRL(rawType);
		if (!rlType) throw new Error('Unknown EndNote type: ' + rawType);
		ref.type = rlType;
	}
	// }}}
	// Authors {{{
	if (_.has(rawRef, 'contributors.0.authors.0.author.0')) {
		ref.authors = _.get(rawRef, 'contributors.0.authors.0.author').map(function(rawAuthor) {
			if (_.isString(rawAuthor)) return rawAuthor;
			return rawAuthor['style'][0];
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
	}, function(rlKey, enKey) {
		var checkPath = enKey + '.0';
		if (_.has(rawRef, checkPath)) ref[rlKey] = _.get(rawRef, enKey + '.0.style.0') || _.get(rawRef, enKey + '.0');
	});
	// }}}
	// Dates {{{
	if (_.has(rawRef, 'dates.0.year.0')) ref.year = _.get(rawRef, 'dates.0.year.0.style.0') || _.get(rawRef, 'dates.0.year.0');
	if (_.has(rawRef, 'dates.0.pub-dates.0.date.0')) ref.date = _.get(rawRef, 'dates.0.pub-dates.0.date.0.style.0') || _.get(rawRef, 'dates.0.pub-dates.0.date.0');
	// }}}
	// Keywords {{{
	if (_.has(rawRef, 'keywords.0.keyword')) {
		ref.keywords = rawRef.keywords[0].keyword
			.map(function(rawKeyword) {
				if (_.isString(rawKeyword)) return rawKeyword;
				if (_.has(rawKeyword, 'style.0')) return rawKeyword['style'][0];
				return false;
			})
			.filter(function(keyword) {
				return !! keyword;
			})
	}
	// }}}
	// URLs {{{
	['related-urls', 'text-urls'].forEach(function(key) {
		if (_.has(rawRef, 'urls.0.' + key + '.0.url')) {
			if (!ref.urls) ref.urls = [];
			rawRef['urls'][0][key][0]['url'].forEach(function(rawURL) {
				if (_.isString(rawURL)) {
					ref.urls.push(rawURL);
				} else if (_.has(rawURL, 'style.0')) {
					ref.urls.push(rawURL['style'][0]);
				}
			});
		}
	});
	// }}}

	return ref;
}


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
				'<foreign-keys><key app="EN" db-id="s55prpsswfsepue0xz25pxai2p909xtzszzv">' + settings.escape(ref.recordOffset) + '</key></foreign-keys>';

			var foundType = getTypeRLtoEL(ref.type || settings.defaultType);
			if (!foundType) return next('Unknown or unsuppoted reference type: ' + ref.type);
			output += '<ref-type name="' + foundType.enText + '">' + settings.escape(foundType.enId) + '</ref-type>';

			output += '<contributors><authors>' +
				(ref.authors ? ref.authors.map(function(author) {
					return '<author><style face="normal" font="default" size="100%">' + settings.escape(author) + '</style></author>';
				}) : '') +
				'</authors></contributors>';


			output += '<titles>' +
				(ref.title ? '<title><style face="normal" font="default" size="100%">' + settings.escape(ref.title) + '</style></title>' : '') +
				(ref.journal ? '<secondary-title><style face="normal" font="default" size="100%">' + settings.escape(ref.journal) + '</style></secondary-title>' : '') +
				(ref.titleShort ? '<short-title><style face="normal" font="default" size="100%">' + settings.escape(ref.titleShort) + '</style></short-title>' : '') +
				(ref.journalAlt ? '<alt-title><style face="normal" font="default" size="100%">' + settings.escape(ref.journalAlt) + '</style></alt-title>' : '') +
				'</titles>';

			if (ref.periodical)
				output += '<periodical><full-title><style face="normal" font="default" size="100%">' + settings.escape(ref.periodical) + '</style></full-title></periodical>';

			_.forEach({
				'abstract': 'abstract',
				'accessDate': 'access-date',
				'accession': 'accession-num',
				'address': 'auth-address',
				'caption': 'caption',
				'databaseProvider': 'remote-database-provider',
				'database': 'remote-database-name',
				'doi': 'electronic-resource-num',
				'isbn': 'isbn',
				'label': 'label',
				'language': 'language',
				'notes': 'notes',
				'number': 'number',
				'pages': 'pages',
				'researchNotes': 'research-notes',
				'section': 'section',
				'volume': 'volume',
				'workType': 'work-type',
				'custom1': 'custom1',
				'custom2': 'custom2',
				'custom3': 'custom3',
				'custom4': 'custom4',
				'custom5': 'custom5',
				'custom6': 'custom6',
				'custom7': 'custom7',
			}, function(enKey, rlKey) {
				if (ref[rlKey])
					output += '<' + enKey + '><style face="normal" font="default" size="100%">' + settings.escape(ref[rlKey]) + '</style></' + enKey + '>';
			});

			if (ref.date && ref.year && _.isDate(ref.date)) {
				output += '<dates><year><style face="normal" font="default" size="100%">' + ref.year + '</style></year>';
				output += '<pub-dates><date><style face="normal" font="default" size="100%">' + moment(ref.date).format('YYYY-MM-DD') + '</style></date></pub-dates></dates>';
			} else if (ref.date && ref.year) {
				output += '<dates><year><style face="normal" font="default" size="100%">' + ref.year + '</style></year>';
				output += '<pub-dates><date><style face="normal" font="default" size="100%">' + ref.date + '</style></date></pub-dates></dates>';
			} else if (ref.date) {
				output += '<dates><pub-dates><date><style face="normal" font="default" size="100%">' + settings.escape(ref.date) + '</style></date></pub-dates></dates>';
			} else if (ref.year) {
				output += '<dates><year><style face="normal" font="default" size="100%">' + ref.year + '</style></year></dates>';
			}

			if (ref.urls)
				output += '<urls><related-urls>' +
					ref.urls.map(function(url) { return '<url><style face="normal" font="default" size="100%">' + settings.escape(url) + '</style></url>' }) +
					'</related-urls></urls>';

			if (ref.keywords)
				output += '<keywords>' +
					ref.keywords.map(function(keyword) { return '<keyword><style face="normal" font="default" size="100%">' + settings.escape(keyword) + '</style></keyword>' }) +
					'</keywords>';

			return '<record>' + output + '</record>';
		},
		escape: this._escape,
		recordOffset: 0,
		content: [],
	});

	async()
		// Sanity checks {{{
		.then(function(next) {
			if (!settings.stream) return next('A writable \'stream\' option must be specified');
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
			if (_.isFunction(settings.content)) { // Callback
				var batchNo = 0;
				var fetcher = function() {
					settings.content(function(err, data, isLast) {
						if (err) return emitter.error(err);
						if (_.isArray(data) && data.length > 0) { // Callback provided array
							data.forEach(function(ref) {
								settings.stream.write(settings.encode(ref));
							});
							setTimeout(fetcher);
						} else if(!_.isArray(data) && _.isObject(data)) { // Callback provided single ref
							settings.stream.write(settings.encode(data));
							setTimeout(fetcher);
						} else { // End of stream
							next();
						}
					}, batchNo++);
				};
				fetcher();
			} else if (_.isArray(settings.content)) { // Array of refs
				settings.content.forEach(function(ref) {
					settings.stream.write(settings.encode(ref));
				});
				next();
			} else if (_.isObject(settings.content)) { // Single ref
				settings.stream.write(settings.encode(settings.content));
				next();
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
	_escape: _escape,
};
