var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');
var stream = require('stream');

describe('EndNote XML parser - encode / decode custom fields', ()=> {
	var ref;

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.createReadStream(__dirname + '/data/endnote-sm.xml'))
			.on('error', ()=> expect.fail())
			.on('ref', data => {
				if (data.title.startsWith('Autopsy ')) ref = data;
			})
			.on('end', next);
	});

	it('should have extracted custom fields', ()=> {
		expect(ref).to.be.an('object');
		expect(ref).to.have.property('title', 'Autopsy studies of the occurrence of cancerous, atypical and benign epithelial lesions in the female breast');
		expect(ref).to.have.property('custom1', 'C1');
		expect(ref).to.have.property('custom2', 'C2');
		expect(ref).to.have.property('custom3', 'C3');
		expect(ref).to.have.property('custom4', 'C4');
		expect(ref).to.have.property('custom5', 'C5');
		expect(ref).to.have.property('custom6', 'C6');
		expect(ref).to.have.property('custom7', 'C7');
	});

	it('should encode custom fields', done => {
		// Setup fake stream {{{
		var fakeStream = stream.Writable();
		fakeStream._write = function(chunk, enc, next) {
			output += chunk;
			next();
		};
		// }}}

		output = '';
		fakeStream
			.on('data', function(data) {
				output += data;
			})
			.on('finish', function() {
				expect(output).to.match(/<custom1><style.*?>C1<\/style><\/custom1>/);
				expect(output).to.match(/<custom2><style.*?>C2<\/style><\/custom2>/);
				expect(output).to.match(/<custom3><style.*?>C3<\/style><\/custom3>/);
				expect(output).to.match(/<custom4><style.*?>C4<\/style><\/custom4>/);
				expect(output).to.match(/<custom5><style.*?>C5<\/style><\/custom5>/);
				expect(output).to.match(/<custom6><style.*?>C6<\/style><\/custom6>/);
				expect(output).to.match(/<custom7><style.*?>C7<\/style><\/custom7>/);
				done();
			});

		rl.output({
			stream: fakeStream,
			content: [ref],
		});
	});

});
