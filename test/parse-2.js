var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - test #2', function() {
	var resErr;
	var data = {};

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.createReadStream(__dirname + '/data/endnote2.xml'))
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('ref', function(ref) {
				data[ref.isbn] = ref;
			})
			.on('end', next);
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('end count should be accurate', function() {
		expect(Object.keys(data).length).to.equal(5);
	});
});
