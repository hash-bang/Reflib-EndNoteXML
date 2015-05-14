var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - bad XML', function() {
	var resErr;
	before(function(next) {
		rl.parse('blah blah blah')
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('end', function(count) {
				next();
			});
	});

	it('Should return an error', function() {
		expect(resErr).to.be.ok;
	});
});


describe('EndNote XML parser', function() {
	var resErr, resCount = 0, resCountCalled = 0;

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote.xml'))
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('ref', function(ref) {
				resCountCalled++;
			})
			.on('end', function(count) {
				resCount = count;
				next();
			});
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('end count should be accurate', function() {
		expect(resCount).to.not.equal(0);
		expect(resCountCalled).to.not.equal(0);
		expect(resCount).to.equal(resCountCalled);
	});
});
